const { Comment, User, CommentLike, Sequelize } = require('@/models');
const notificationService = require('./notification.service');

const MAX_DEPTH = 3;

// Helper function to add like counts and isLiked status to comments
const addLikeData = async (comment, currentUserId) => {
  if (!comment) return null;

  const likesCount = await CommentLike.count({ where: { commentId: comment.id } });
  comment.dataValues.likesCount = likesCount;

  if (currentUserId) {
    const userLike = await CommentLike.findOne({ where: { commentId: comment.id, userId: currentUserId } });
    comment.dataValues.isLiked = !!userLike;
  } else {
    comment.dataValues.isLiked = false;
  }

  if (comment.replies) {
    for (const reply of comment.replies) {
      await addLikeData(reply, currentUserId);
    }
  }

  return comment;
};

const commentService = {
  // Tạo comment mới (có xử lý giới hạn 3 cấp reply)
  async create(data) {
    if (data.parentId) {
      const parentComment = await Comment.findByPk(data.parentId);
      if (!parentComment) {
        throw new Error('Parent comment not found');
      }

      const depth = await this.getCommentDepth(parentComment);
      if (depth >= MAX_DEPTH) {
        // Nếu comment cha đã ở độ sâu tối đa,
        // thì comment mới sẽ trở thành "anh em" với nó,
        // bằng cách lấy parentId của comment cha làm parentId cho mình.
        data.parentId = parentComment.parentId;
      }
    }
    const comment = await Comment.create(data);
    return this.getById(comment.id); // Trả về kèm author
  },

  // Hàm đệ quy để tính độ sâu của comment
  async getCommentDepth(comment, currentDepth = 1) {
    if (!comment.parentId) return currentDepth;
    const parent = await Comment.findByPk(comment.parentId);
    if (!parent) return currentDepth;
    return this.getCommentDepth(parent, currentDepth + 1);
  },

  // Lấy 1 comment theo id (bao gồm thông tin author)
  async getById(id, currentUserId) {
    const comment = await Comment.findByPk(id, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'avatar', 'bio'],
        },
      ]
    });
    return addLikeData(comment, currentUserId);
  },

  // Lấy tất cả comment theo postId (bao gồm replies và nested replies)
  async getByPost(postId, currentUserId) {
    const comments = await Comment.findAll({
      where: { postId, parentId: null },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'avatar', 'bio'],
        },
        {
          model: Comment,
          as: 'replies',
          include: [
            {
              model: User,
              as: 'author',
              attributes: ['id', 'username', 'avatar', 'bio'],
            },
            {
              model: Comment,
              as: 'replies',
              include: [
                {
                  model: User,
                  as: 'author',
                  attributes: ['id', 'username', 'avatar', 'bio'],
                }
              ]
            }
          ]
        }
      ]
    });

    for (const comment of comments) {
      await addLikeData(comment, currentUserId);
    }

    return comments;
  },

  // Cập nhật nội dung comment
  async update(id, userId, newContent) {
    const comment = await Comment.findByPk(id);
    if (!comment) throw new Error('Comment not found');
    if (comment.authorId !== userId) throw new Error('Unauthorized');

    comment.content = newContent;
    comment.isEdited = true;
    await comment.save();
    return comment;
  },

  // Xóa comment (và replies con cháu)
  async delete(id, userId) {
    const comment = await Comment.findByPk(id);
    if (!comment) throw new Error('Comment not found');
    if (comment.authorId !== userId) throw new Error('Unauthorized');

    await this.deleteRepliesRecursively(id);
    await comment.destroy();
    return { message: 'Deleted successfully' };
  },

  // Xóa tất cả replies (đệ quy)
  async deleteRepliesRecursively(parentId) {
    const replies = await Comment.findAll({ where: { parentId } });
    for (const reply of replies) {
      await this.deleteRepliesRecursively(reply.id);
      await reply.destroy();
    }
  },

  async likeComment(commentId, userId) {
    const comment = await Comment.findByPk(commentId);
    if (!comment) {
      throw new Error('Comment not found');
    }

    const existingLike = await CommentLike.findOne({ where: { commentId, userId } });
    if (existingLike) {
      return existingLike;
    }

    const like = await CommentLike.create({ commentId, userId });

    // Create notification
    await notificationService.createNotification({
      recipientId: comment.authorId,
      senderId: userId,
      type: 'like_comment',
      entityId: comment.id
    });

    return like;
  },

  async unlikeComment(commentId, userId) {
    const like = await CommentLike.findOne({ where: { commentId, userId } });
    if (!like) {
      throw new Error('You have not liked this comment');
    }

    await like.destroy();
    return { message: 'Comment unliked successfully' };
  },
};

module.exports = commentService;
