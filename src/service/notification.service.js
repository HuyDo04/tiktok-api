const { Notification } = require('@/models');

exports.createNotification = async (notificationData, io, onlineUsers) => {
  // Avoid notifying a user about their own actions
  if (notificationData.recipientId === notificationData.senderId) {
    return;
  }

  try {
    console.log('📨 Notification data:', notificationData); // 👈 thêm dòng này
    const newNotification = await Notification.create(notificationData);

    // Gửi sự kiện real-time nếu có io và onlineUsers được cung cấp
    if (io && onlineUsers && newNotification) {
      const recipientSocketId = onlineUsers.get(notificationData.recipientId.toString());
      if (recipientSocketId) {
        // Lấy thông tin đầy đủ của thông báo để gửi đi
        const fullNotification = await this.getNotificationById(newNotification.id);
        io.to(recipientSocketId).emit('notification:new', fullNotification);
      }
    }
  
    return newNotification;
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    throw error;
  }

  
};

exports.getNotificationsForUser = async (userId) => {
  return await Notification.findAll({
    where: { recipientId: userId },
    order: [['createdAt', 'DESC']],
    include: [{ model: require('@/models').User, as: 'Sender', attributes: ['id', 'username', 'avatar'] }]
  });
};

exports.getNotificationById = async (id) => {
  return await Notification.findByPk(id, {
    include: [{ model: require('@/models').User, as: 'Sender', attributes: ['id', 'username', 'avatar'] }]
  });
};


exports.markNotificationAsRead = async (notificationId, userId) => {
  const notification = await Notification.findOne({
    where: { id: notificationId, recipientId: userId }
  });

  if (!notification) {
    return null;
  }

  notification.read = true;
  await notification.save();
  return notification;
};

exports.markAllAsRead = async (userId) => {
  const [affectedRows] = await Notification.update(
    { read: true },
    {
      where: {
        recipientId: userId,
        read: false
      }
    }
  );
  return { affectedRows };
};
