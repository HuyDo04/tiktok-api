'use strict';

const notificationService = require('@/service/notification.service');

module.exports = (io, socket) => {
  // =====================================================
  // 1. Đánh dấu một thông báo là đã đọc
  // =====================================================
  socket.on('notification:mark_as_read', async (data, callback) => {
    try {
      const { notificationId } = data;
      const updatedNotification = await notificationService.markNotificationAsRead(notificationId, socket.user.id);
      if (callback) callback({ status: 'ok', data: updatedNotification });
    } catch (error) {
      console.error('[Socket ERROR] Error in notification:mark_as_read:', error);
      if (callback) callback({ status: 'error', message: error.message });
    }
  });

  // Có thể thêm các sự kiện khác ở đây trong tương lai,
  // ví dụ: 'notification:mark_all_as_read'
};