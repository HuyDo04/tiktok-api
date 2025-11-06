const { Notification } = require('@/models');

exports.createNotification = async (notificationData) => {
  // Avoid notifying a user about their own actions
  if (notificationData.recipientId === notificationData.senderId) {
    return;
  }
  return await Notification.create(notificationData);
};

exports.getNotificationsForUser = async (userId) => {
  return await Notification.findAll({
    where: { recipientId: userId },
    order: [['createdAt', 'DESC']],
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
