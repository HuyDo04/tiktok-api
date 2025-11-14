'use strict';

module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define('Notification', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    recipientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    senderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('like_post', 'like_comment', 'new_follower', 'new_friend', 'mention_post', 'new_comment', 'mention_comment', 'repost'),
      allowNull: false
    },
    entityId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    read: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
  }, {
    tableName: 'Notifications',
    timestamps: true
  });

  Notification.associate = function(models) {
    Notification.belongsTo(models.User, { as: 'Recipient', foreignKey: 'recipientId' });
    Notification.belongsTo(models.User, { as: 'Sender', foreignKey: 'senderId' });
  };

  return Notification;
};
