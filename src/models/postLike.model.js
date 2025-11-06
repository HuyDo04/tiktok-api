'use strict';

module.exports = (sequelize, DataTypes) => {
  const PostLike = sequelize.define('PostLike', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    postId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  }, {
    tableName: 'PostLikes',
    timestamps: true
  });

  PostLike.associate = function(models) {
    // Associations can be defined here
    PostLike.belongsTo(models.User, { foreignKey: 'userId' });
    PostLike.belongsTo(models.Post, { foreignKey: 'postId' });
  };

  return PostLike;
};
