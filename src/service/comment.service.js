const { Comment, User, CommentLike, Post} = require('@/models');
const { Op } = require('sequelize');
const notificationService = require('../service/notification.service');

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

// Helper function to extract mentions from text
const extractMentions = (text) => {
  if (!text) return [];
  const regex = /@(\w+)/g;
  const matches = text.match(regex);
  // Trả về mảng các username không có ký tự '@' và loại bỏ trùng lặp
  return matches ? [...new Set(matches.map(m => m.substring(1)))] : [];
};

// Helper function to process mentions in a comment
const processCommentMentions = async (comment, text, io, onlineUsers) => {
  const mentionedUsernames = extractMentions(text);
  if (!mentionedUsernames.length) return;

  const mentionedUsers = await User.findAll({ where: { username: { [Op.in]: mentionedUsernames } } });
  await comment.setMentionedUsers(mentionedUsers);

  for (const user of mentionedUsers) {
    await notificationService.createNotification({ recipientId: user.id, senderId: comment.authorId, type: "mention_comment", entityId: comment.id }, io, onlineUsers);
  }
};
const commentService = {
  // Tạo comment mới (có xử lý giới hạn 3 cấp reply)
  async create(data, io, onlineUsers) {
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

    // --- LOGIC THÔNG BÁO MỚI ---
    // Lấy thông tin bài viết để biết ai là chủ nhân
    const post = await Post.findByPk(data.postId, { attributes: ['authorId'] });
    if (post && post.authorId !== data.authorId) { // Chỉ thông báo nếu người bình luận không phải chủ bài viết
      await notificationService.createNotification({
        recipientId: post.authorId,
        senderId: data.authorId,
        type: 'new_comment',
        entityId: comment.id // Có thể dùng comment.id hoặc post.id tùy vào việc bạn muốn link đến đâu
      }, io, onlineUsers);
    }
    // --- KẾT THÚC LOGIC THÔNG BÁO ---
    
    // --- LOGIC XỬ LÝ MENTION TRONG COMMENT ---
    await processCommentMentions(comment, data.content, io, onlineUsers);

    return this.getById(comment.id, data.authorId); // Trả về kèm author và trạng thái like
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

  async likeComment(commentId, userId, io, onlineUsers) {
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
    if (comment.authorId !== userId) await notificationService.createNotification({
      recipientId: comment.authorId,
      senderId: userId,
      type: 'like_comment',
      entityId: comment.id
    }, io, onlineUsers);

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
