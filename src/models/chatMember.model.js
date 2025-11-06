'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ChatMember extends Model {
    static associate(models) {
      ChatMember.belongsTo(models.Chat, { 
        as: 'chat',
        foreignKey: 'chat_id' 
      });
    }
  }
  ChatMember.init(
    {
      id: {
        allowNull: false,
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      chat_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Chat',
          key: 'id',
        },
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'User',
          key: 'id',
        },
      },
    },
    {
      sequelize,
      modelName: 'ChatMember',
      tableName: 'chat_members',
    },
  );
  return ChatMember;
};
