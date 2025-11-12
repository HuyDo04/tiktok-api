'use strict';

module.exports = (sequelize, DataTypes) => {
  const CommentMention = sequelize.define('CommentMention', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    commentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  }, {
    tableName: 'CommentMentions',
    timestamps: true
  });

  CommentMention.associate = function(models) {
    CommentMention.belongsTo(models.User, { foreignKey: 'userId' });
    CommentMention.belongsTo(models.Comment, { foreignKey: 'commentId' });
  };

  return CommentMention;
};