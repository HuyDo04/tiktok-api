'use strict';

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING,
      unique:true,
      allowNull: false
    },
    password: {
      type: DataTypes.STRING,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
    verified_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    verify_token: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    verify_token_expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    reset_password_otp: {
      type: DataTypes.STRING,
      allowNull: true
    },
    reset_password_otp_expires_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    avatar: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    provider: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'email',
    },
    providerId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    bio: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  }, {
    tableName: 'users',
    timestamps: true
  });

    User.associate = function(models) {
      // Existing associations
      User.hasMany(models.RefreshToken, { foreignKey: 'user_id', as: 'refreshTokens' });
      User.hasMany(models.Post, { foreignKey: 'authorId', as: 'posts' });

      // Association for Post Mentions
      User.hasMany(models.PostMention, { foreignKey: 'userId', as: 'postMentions' });
      User.belongsToMany(models.Post, { through: models.PostMention, as: 'mentionedInPosts', foreignKey: 'userId', otherKey: 'postId' });

      // New associations for Likes
      User.hasMany(models.PostLike, { foreignKey: 'userId', as: 'postLikes' });
      User.hasMany(models.CommentLike, { foreignKey: 'userId', as: 'commentLikes' });

      // Association for Comment Mentions
      User.hasMany(models.CommentMention, { foreignKey: 'userId', as: 'commentMentions' });
      User.belongsToMany(models.Comment, { through: models.CommentMention, as: 'mentionedInComments', foreignKey: 'userId', otherKey: 'commentId' });

      // New associations for Follows (Many-to-Many)
      User.belongsToMany(models.User, { 
        as: 'Followers', 
        through: models.Follow, 
        foreignKey: 'followingId', 
        otherKey: 'followerId' 
      });
      User.belongsToMany(models.User, { 
        as: 'Following', 
        through: models.Follow, 
        foreignKey: 'followerId', 
        otherKey: 'followingId' 
      });

      // Associations for counting followers and followings
      User.hasMany(models.Follow, { as: 'FollowersCount', foreignKey: 'followingId' });
      User.hasMany(models.Follow, { as: 'FollowingCount', foreignKey: 'followerId' });

      // New associations for Blocked Users (Many-to-Many)
      User.belongsToMany(models.User, { 
        as: 'BlockedUsers', 
        through: models.BlockedUser, 
        foreignKey: 'blockerId', 
        otherKey: 'blockedId' 
      });
      User.belongsToMany(models.User, { 
        as: 'BlockedBy', 
        through: models.BlockedUser, 
        foreignKey: 'blockedId', 
        otherKey: 'blockerId' 
      });

      // New associations for Notifications
      User.hasMany(models.Notification, { as: 'Notifications', foreignKey: 'recipientId' });
      User.hasMany(models.Notification, { as: 'SentNotifications', foreignKey: 'senderId' });

      // Associations for Chat
      User.belongsToMany(models.Chat, {
        through: models.ChatMember,
        foreignKey: 'user_id',
        as: 'chats',
      });
      User.hasMany(models.Message, {
        foreignKey: 'sender_id',
        as: 'sentMessages',
      });

      // Association for Search History
      User.hasMany(models.SearchHistory, {
        foreignKey: 'userId',
        as: 'searchHistories',
      });
    };
  return User;
};
