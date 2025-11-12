'use strict';

module.exports = (sequelize, DataTypes) => {
  const Repost = sequelize.define('Repost', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    postId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'posts',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
  }, {
    tableName: 'Reposts',
    timestamps: true,
    updatedAt: false, // Chỉ cần biết thời điểm tạo
  });

  Repost.associate = function(models) {
    Repost.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    Repost.belongsTo(models.Post, { foreignKey: 'postId', as: 'post' });
  };

  return Repost;
};