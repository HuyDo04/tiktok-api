const notificationService = require('@/service/notification.service');

exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const notifications = await notificationService.getNotificationsForUser(userId);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Error getting notifications', error: error.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.id;
    const notification = await notificationService.markNotificationAsRead(notificationId, userId);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found or you do not have permission to read it' });
    }
    res.json({ message: 'Notification marked as read', notification });
  } catch (error) {
    res.status(500).json({ message: 'Error marking notification as read', error: error.message });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await notificationService.markAllAsRead(userId);
    res.json({ message: `Successfully marked ${result.affectedRows} notifications as read.` });
  } catch (error) {
    res.status(500).json({ message: 'Error marking all notifications as read', error: error.message });
  }
};
