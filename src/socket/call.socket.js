'use strict';

const { v4: uuidV4 } = require('uuid');

// In-memory storage for call rooms. Map<roomId, Set<userId>>
const callRooms = new Map();

module.exports = (io, socket, onlineUsers) => {
  const userId = socket.user.id;

  // --- Signaling Events ---

  // User wants to initiate a call
  socket.on('start-call', (data) => {
    const { receiverId, isGroupCall } = data;
    const roomId = data.roomId || uuidV4(); // Use existing chat ID or create a new ID for the call

    console.log(`User ${userId} is starting a call with ${receiverId}. Room ID: ${roomId}`);

    const receiverSocketId = onlineUsers.get(receiverId.toString());
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('incoming-call', {
        callerId: userId,
        callerInfo: socket.user, // Send caller's info (username, avatar)
        roomId: roomId,
        isGroupCall: isGroupCall,
      });
    } else {
      // Handle case where the receiver is not online
      // Maybe send a push notification in the future
      console.log(`User ${receiverId} is not online.`);
      // Optionally, emit back to the caller that the user is offline
      socket.emit('call-failed', { message: 'User is not online.' });
    }
  });

  // User accepts the call and joins the room
  socket.on('join-call-room', ({ roomId }) => {
    socket.join(roomId);

    if (!callRooms.has(roomId)) {
      callRooms.set(roomId, new Set());
    }
    callRooms.get(roomId).add(userId);

    console.log(`User ${userId} joined call room: ${roomId}`);

    // Notify others in the room that a new user has joined
    socket.to(roomId).emit('user-joined-call', {
      userId: userId,
      userInfo: socket.user,
    });
  });

  // --- WebRTC Signaling ---

  // Forward WebRTC offer
  socket.on('webrtc-offer', ({ to, offer }) => {
    const receiverSocketId = onlineUsers.get(to.toString());
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('webrtc-offer', {
        from: userId,
        offer: offer,
      });
    }
  });

  // Forward WebRTC answer
  socket.on('webrtc-answer', ({ to, answer }) => {
    const receiverSocketId = onlineUsers.get(to.toString());
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('webrtc-answer', {
        from: userId,
        answer: answer,
      });
    }
  });

  // Forward ICE candidates
  socket.on('webrtc-ice-candidate', ({ to, candidate }) => {
    const receiverSocketId = onlineUsers.get(to.toString());
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('webrtc-ice-candidate', {
        from: userId,
        candidate: candidate,
      });
    }
  });

  // --- Leaving/Ending Call ---

  socket.on('leave-call-room', ({ roomId }) => {
    socket.leave(roomId);

    if (callRooms.has(roomId)) {
      const room = callRooms.get(roomId);
      room.delete(userId);

      if (room.size === 0) {
        callRooms.delete(roomId);
      }
    }

    console.log(`User ${userId} left call room: ${roomId}`);

    // Notify others in the room that a user has left
    socket.to(roomId).emit('user-left-call', {
      userId: userId,
    });
  });
};
