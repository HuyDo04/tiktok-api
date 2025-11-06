'use strict';

module.exports = (sequelize, DataTypes) => {
  const CommentLike = sequelize.define('CommentLike', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    commentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  }, {
    tableName: 'CommentLikes',
    timestamps: true
  });

  CommentLike.associate = function(models) {
    CommentLike.belongsTo(models.User, { foreignKey: 'userId' });
    CommentLike.belongsTo(models.Comment, { foreignKey: 'commentId' });
  };

  return CommentLike;
};
