const { Post, User, Topic, PostLike, Sequelize } = require("@/models");
const { Op } = require("sequelize");
const fs = require("fs");
const path = require("path");
const notificationService = require('./notification.service');

exports.getAllPostsWithAuthorAndTopic = async () => {
  return await Post.findAll({
    include: [
      {
        model: User,
        as: "author",
        attributes: ["id", "username", "avatar", "bio"],
      },
      {
        model: Topic,
        as: "topic",
        attributes: ["id", "name", "slug", "icon"]
      }
    ],
    order: [["publishedAt", "DESC"]]
  });
};

exports.getPostByIdWithAuthorAndTopic = async (id, currentUserId) => {
  const post = await Post.findByPk(id, {
    include: [
      {
        model: User,
        as: "author",
        attributes: ["id", "username", "avatar", "bio"]
      },
      {
        model: Topic,
        as: "topic",
        attributes: ["id", "name", "slug", "icon"],
      },
    ],
    attributes: {
      include: [
        [
          Sequelize.literal(`(SELECT COUNT(*) FROM PostLikes WHERE PostLikes.postId = Post.id)`),
          'likesCount',
        ],
      ],
    },
  });

  if (post && currentUserId) {
    const userLike = await PostLike.findOne({ where: { postId: post.id, userId: currentUserId } });
    post.dataValues.isLiked = !!userLike;
  } else if (post) {
    post.dataValues.isLiked = false;
  }

  return post;
};

exports.getPostBySlug = async (slug, currentUserId) => {
  const post = await Post.findOne({
    where: { slug },
    include: [
      {
        model: User,
        as: "author",
        attributes: ["id", "username", "avatar", "bio"]
      },
      {
        model: Topic,
        as: "topic",
        attributes: ["id", "name", "slug", "icon"],
      },
    ],
    attributes: {
      include: [
        [
          Sequelize.literal(`(SELECT COUNT(*) FROM PostLikes WHERE PostLikes.postId = Post.id)`),
          'likesCount',
        ],
      ],
    },
  });

  if (post && currentUserId) {
    const userLike = await PostLike.findOne({ where: { postId: post.id, userId: currentUserId } });
    post.dataValues.isLiked = !!userLike;
  } else if (post) {
    post.dataValues.isLiked = false;
  }

  return post;
};

exports.likePost = async (postId, userId) => {
  const post = await Post.findByPk(postId);
  if (!post) {
    throw new Error('Post not found');
  }

  const existingLike = await PostLike.findOne({ where: { postId, userId } });
  if (existingLike) {
    return existingLike; // Or throw an error, depending on desired behavior
  }

  const like = await PostLike.create({ postId, userId });

  // Create notification
  await notificationService.createNotification({
    recipientId: post.authorId,
    senderId: userId,
    type: 'like_post',
    entityId: post.id
  });

  return like;
};

exports.unlikePost = async (postId, userId) => {
  const like = await PostLike.findOne({ where: { postId, userId } });
  if (!like) {
    throw new Error('You have not liked this post');
  }

  await like.destroy();
  return { message: 'Post unliked successfully' };
};

exports.deletePostMedia = async (postId, mediaIndex) => {
  const post = await Post.findByPk(postId);
  if (!post) return false;

  let media = post.media || [];
  if (mediaIndex < 0 || mediaIndex >= media.length) return false;

  const mediaPath = media[mediaIndex];
  const fullPath = path.join(__dirname, '..', '..', 'public', mediaPath);

  try {
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
    media.splice(mediaIndex, 1);
    await post.update({ media });
    return true;
  } catch (error) {
    console.error("Error deleting media file:", error);
    return false;
  }
};

exports.getPostsByTopicAndExcludePost = async (topicId, excludePostId, limit = 3) => {
  return await Post.findAll({
    where: {
      topicId,
      id: {
        [Op.ne]: excludePostId
      }
    },
    include: [
      {
        model: User,
        as: "author",
        attributes: ["id", "username", "avatar", "bio"],
      },
      {
        model: Topic,
        as: "topic",
        attributes: ["id", "name", "slug", "icon"]
      }
    ],
    limit: parseInt(limit, 10),
    order: [["publishedAt", "DESC"]]
  });
};