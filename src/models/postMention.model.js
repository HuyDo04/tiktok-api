'use strict';

module.exports = (sequelize, DataTypes) => {
  const PostMention = sequelize.define('PostMention', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    postId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  }, {
    tableName: 'PostMentions',
    timestamps: true
  });

  PostMention.associate = function(models) {
    PostMention.belongsTo(models.User, { foreignKey: 'userId' });
    PostMention.belongsTo(models.Post, { foreignKey: 'postId' });
  };

  return PostMention;
};

