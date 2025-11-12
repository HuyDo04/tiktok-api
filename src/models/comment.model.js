module.exports = (sequelize, DataTypes) => {
    const Comment = sequelize.define("Comment", {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      postId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      authorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      parentId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      isEdited: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    }, {
      tableName: "comments",
      timestamps: true,
    });
  
    Comment.associate = (models) => {
      Comment.belongsTo(models.User, { foreignKey: "authorId", as: "author" });
      Comment.belongsTo(models.Post, { foreignKey: "postId" });
      Comment.belongsTo(models.Comment, { foreignKey: "parentId", as: "parent" });
      Comment.hasMany(models.Comment, { foreignKey: "parentId", as: "replies" });
      Comment.hasMany(models.CommentLike, { foreignKey: 'commentId', as: 'likes' });

      // Association for Comment Mentions
      Comment.hasMany(models.CommentMention, { foreignKey: 'commentId', as: 'mentions' });
      Comment.belongsToMany(models.User, { through: "CommentMentions", as: 'mentionedUsers', foreignKey: 'commentId', otherKey: 'userId' });
    };
  
    return Comment;
  };
