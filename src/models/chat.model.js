'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Chat extends Model {
    static associate(models) {
      Chat.belongsToMany(models.User, {
        through: models.ChatMember,
        foreignKey: 'chat_id',
        as: 'members',
      });
      
      Chat.hasMany(models.Message, {
        foreignKey: 'chat_id',
        as: 'messages',
      });
      Chat.hasMany(models.ChatMember, {
        foreignKey: 'chat_id',
        as: 'chatMembers',
      });
      Chat.belongsTo(models.User, {
        foreignKey: 'created_by',
        as: 'creator',
      });
    }
  }
  Chat.init(
    {
      id: {
        allowNull: false,
        primaryKey: true,
        type: DataTypes.INTEGER,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      type: {
        type: DataTypes.ENUM('private', 'group'),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('pending', 'active'),
        allowNull: false,
        defaultValue: 'active',
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Chat',
      tableName: 'chats',
    },
  );
  return Chat;
};
