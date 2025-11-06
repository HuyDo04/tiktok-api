'use strict';

const chatService = require('../services/chat.service');

module.exports = (io, socket) => {
  // --- Join Chat Rooms on connection ---
  (async () => {
    try {
      const chats = await chatService.getChats(socket.user.id);
      chats.forEach((chat) => {
        socket.join(chat.id.toString()); // Ensure room ID is a string
        console.log(`User ${socket.user.username} joined chat room ${chat.id}`);
      });
    } catch (error) {
      console.error('Error joining chat rooms:', error);
    }
  })();

  // --- Handle Messages ---
  socket.on('send_message', async (data, callback) => {
    try {
      const { chatId, content } = data;
      const newMessage = await chatService.sendMessage(chatId, socket.user.id, { content });
      io.to(chatId.toString()).emit('receive_message', newMessage);
      if (callback) callback({ status: 'ok', message: newMessage });
    } catch (error) {
      console.error('Error sending message:', error);
      if (callback) callback({ status: 'error', message: error.message });
    }
  });

  // --- Handle Read Receipts ---
  socket.on('read_message', async (data, callback) => {
    try {
      const { chatId, messageId } = data;
      await chatService.markMessageAsRead(chatId, messageId, socket.user.id);

      const readReceipt = {
        chatId,
        messageId,
        userId: socket.user.id,
        readAt: new Date(),
      };

      io.to(chatId.toString()).emit('message_read', readReceipt);
      if (callback) callback({ status: 'ok' });
    } catch (error) {
      console.error('Error marking message as read:', error);
      if (callback) callback({ status: 'error', message: error.message });
    }
  });

  // --- Handle Typing Indicators ---
  socket.on('typing', ({ chatId }) => {
    socket.to(chatId.toString()).emit('user_typing', {
      chatId,
      user: socket.user,
    });
  });

  socket.on('stop_typing', ({ chatId }) => {
    socket.to(chatId.toString()).emit('user_stopped_typing', {
      chatId,
      user: socket.user,
    });
  });
};