'use strict';

const jwt = require('jsonwebtoken');
const { User } = require('../models');
const userService = require('../service/user.service');
const chatSocketHandler = require('./chat.socket');
const callSocketHandler = require('./call.socket');
const livestreamSocketHandler = require('./livestream.js');

const onlineUsers = new Map(); // { userId: socketId }

function initializeSocket(io) {
  // JWT Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error: Token not provided.'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.id, {
        attributes: ['id', 'username', 'avatar'],
      });

      if (!user) {
        return next(new Error('Authentication error: User not found.'));
      }

      socket.user = user;
      next();
    } catch (error) {
      return next(new Error('Authentication error: Invalid token.'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user.id.toString();
    console.log(`User connected: ${socket.user.username} (Socket ID: ${socket.id})`);

    // --- Presence Management ---
    onlineUsers.set(userId, socket.id);

    // Broadcast online status to followers
    try {
      const followerIds = await userService.getFollowerIds(userId);
      followerIds.forEach((followerId) => {
        const followerSocketId = onlineUsers.get(followerId.toString());
        if (followerSocketId) {
          io.to(followerSocketId).emit('user_online', { userId: userId });
        }
      });

      // Notify current user about online followed users
      const followingIds = await userService.getFollowingIds(userId);
      followingIds.forEach((followingId) => {
        if (onlineUsers.has(followingId.toString())) {
          socket.emit('user_online', { userId: followingId });
        }
      });
    } catch (error) {
      console.error('Error handling presence updates:', error);
    }

    // --- Register Handlers ---
    chatSocketHandler(io, socket, onlineUsers);
    callSocketHandler(io, socket, onlineUsers);
    livestreamSocketHandler(io, socket);

    // --- Disconnect ---
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.user.username}`);
      onlineUsers.delete(userId);

      // Broadcast offline status to followers
      try {
        const followerIds = await userService.getFollowerIds(userId);
        followerIds.forEach((followerId) => {
          const followerSocketId = onlineUsers.get(followerId.toString());
          if (followerSocketId) {
            io.to(followerSocketId).emit('user_offline', { userId: userId });
          }
        });
      } catch (error) {
        console.error('Error broadcasting offline status:', error);
      }
    });
  });
}

module.exports = initializeSocket;