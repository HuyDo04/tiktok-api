'use strict';

const chatService = require('../services/chat.service');
const { Op } = require('sequelize');

module.exports = (io, socket, onlineUsers) => {
  // --- Join tất cả phòng chat của user khi connect ---
  (async () => {
    try {
      const chats = await chatService.getChats(socket.user.id);
      chats.forEach((chat) => {
        socket.join(chat.id.toString());
      });
    } catch (error) {
      console.error('Error joining chat rooms:', error);
    }
  })();

  // =====================================================
  // 1️ Gửi tin nhắn mới
  // =====================================================
  socket.on('send_message', async (data, callback) => {
    try {
      const { chatId, content } = data;

      // Lưu DB và set unread = true cho người nhận
      const newMessage = await chatService.sendMessage(chatId, socket.user.id, { content });

      // Emit tin nhắn tới tất cả thành viên trong phòng
      io.to(chatId.toString()).emit('receive_message', newMessage);

      //  Cập nhật realtime số tin chưa đọc cho người nhận
      const members = await chatService.getChatMembers(chatId);
      members
        .filter((m) => m.id !== socket.user.id)
        .forEach(async (receiver) => {
          const unreadCount = await chatService.countUnreadMessages(receiver.id, chatId);
          const receiverSocketId = onlineUsers.get(receiver.id.toString());
          if (receiverSocketId) {
            io.to(receiverSocketId).emit('unread_count_update', {
              chatId,
              unreadCount,
            });
          }
        });

      if (callback) callback({ status: 'ok', message: newMessage });
    } catch (error) {
      console.error('Error sending message:', error);
      if (callback) callback({ status: 'error', message: error.message });
    }
  });

  // Set để theo dõi các chat đang được xử lý "đã đọc"
  const processingRead = new Set();

  // =====================================================
  // 2️⃣ Đánh dấu đã đọc (read receipts)
  // =====================================================
  socket.on('read_message', async (data, callback) => {
    try {
      const { chatId } = data;

      // Kiểm tra xem có đang xử lý chatId này không
      if (processingRead.has(chatId)) {
        return;
      }

      // 1. Đánh dấu tất cả tin nhắn là đã đọc và lấy về danh sách các tin nhắn đã được cập nhật
      const updatedMessages = await chatService.markAllMessagesAsRead(chatId, socket.user.id);

      // 2. Emit sự kiện cho tất cả thành viên trong phòng, gửi kèm danh sách tin nhắn đã cập nhật
      // Frontend sẽ dùng danh sách này để cập nhật state một cách chính xác.
      io.to(chatId.toString()).emit('message_read', {
        chatId,
        readerId: socket.user.id,
        readAt: new Date(),
        updatedMessages: updatedMessages, // Gửi kèm danh sách tin nhắn đã được cập nhật
      });

      // 3. Cập nhật realtime số tin nhắn chưa đọc cho TẤT CẢ thành viên trong chat
      const members = await chatService.getChatMembers(chatId);

      // Sử dụng for...of để đảm bảo await hoạt động tuần tự
      for (const member of members) {
        // Tính toán số tin nhắn chưa đọc cho từng thành viên
        const unreadCount = await chatService.countUnreadMessages(member.id, chatId);
        const memberSocketId = onlineUsers.get(member.id.toString());
  
        // Nếu thành viên đang online, gửi sự kiện cập nhật
        if (memberSocketId) {
          io.to(memberSocketId).emit('unread_count_update', {
            chatId,
            unreadCount,
          });
        } else {
          console.log(`[Socket DEBUG] Member ${member.id} is OFFLINE. No event emitted.`);
        }
      }

      if (callback) {
        callback({ status: 'ok' });
      }
    } catch (error) {
      console.error('[Socket ERROR] Error in read_message handler:', error);
      if (callback) {
        callback({ status: 'error', message: error.message });
      }
    } finally {
      if (data.chatId) {
        processingRead.delete(data.chatId); // Mở khóa sau khi xử lý xong
      }
    }
  });

  // =====================================================
  //  Typing Indicators
  // =====================================================
  socket.on('typing', ({ chatId }) => {
    socket.to(chatId.toString()).emit('user_typing', {
      chatId,
      user: socket.user,
    });
  });

  socket.on('stop_typing', ({ chatId }
    
  ) => {
    socket.to(chatId.toString()).emit('user_stopped_typing', {
      chatId,
      user: socket.user,
    });
  });
};
