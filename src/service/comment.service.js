const { Comment, User, CommentLike, Post, sequelize} = require('@/models');
const { Op, Sequelize } = require('sequelize');
const notificationService = require('../service/notification.service');

const MAX_DEPTH = 1;

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
    // Lấy thêm dữ liệu like cho comment vừa tạo
    if (!comment) return null;
    const likesCount = await CommentLike.count({ where: { commentId: comment.id } });
    comment.dataValues.likesCount = likesCount;
    if (currentUserId) {
      const userLike = await CommentLike.findOne({ where: { commentId: comment.id, userId: currentUserId } });
      comment.dataValues.isLiked = !!userLike;
    } else {
      comment.dataValues.isLiked = false;
    }
    return comment;
  },

  // Lấy tất cả comment theo postId (bao gồm replies và nested replies)
  async getByPost(postId, currentUserId) {
    // 1. Lấy tất cả comment của bài viết trong một danh sách phẳng
    const allComments = await Comment.findAll({
      where: { postId },
      include: [{ model: User, as: 'author', attributes: ['id', 'username', 'avatar', 'bio'] }],
      attributes: {
        include: [
          [Sequelize.literal(`(SELECT COUNT(*) FROM CommentLikes WHERE CommentLikes.commentId = Comment.id)`), 'likesCount'],
          currentUserId ? [
            Sequelize.literal(`(EXISTS(SELECT 1 FROM CommentLikes WHERE CommentLikes.commentId = Comment.id AND CommentLikes.userId = ${currentUserId}))`),
            'isLiked'
          ] : [Sequelize.literal('false'), 'isLiked']
        ]
      },
      order: [['createdAt', 'ASC']], // Sắp xếp từ cũ đến mới để xây dựng cây
    });

    // 2. Xây dựng cây comment từ danh sách phẳng
    const commentMap = {};
    const rootComments = [];

    // Đưa tất cả comment vào một map để truy cập nhanh
    allComments.forEach(comment => {
      comment.dataValues.replies = []; // Khởi tạo mảng replies
      commentMap[comment.id] = comment;
    });

    // Hàm đệ quy để tìm comment cha ở độ sâu mong muốn
    const findParentAtDepth = (commentId, targetDepth) => {
      let current = commentMap[commentId];
      let depth = 0;
      let path = [current];
      while (current && current.parentId) {
        current = commentMap[current.parentId];
        path.unshift(current);
        depth++;
      }
      // Nếu độ sâu thực tế lớn hơn độ sâu mục tiêu, trả về comment cha ở đúng độ sâu đó
      if (depth >= targetDepth && path[targetDepth]) {
        return path[targetDepth];
      }
      // Ngược lại, trả về cha trực tiếp
      return commentMap[commentId];
    };

    allComments.forEach(comment => {
      if (comment.parentId) {
        // Tìm comment cha phù hợp để gắn vào
        const parent = findParentAtDepth(comment.parentId, MAX_DEPTH - 1);
        if (parent) {
          parent.dataValues.replies.push(comment);
        } else {
          // Trường hợp comment cha bị xóa hoặc không tìm thấy
          rootComments.push(comment);
        }
      } else {
        rootComments.push(comment);
      }
    });

    return rootComments.sort((a, b) => b.createdAt - a.createdAt); // Sắp xếp lại comment gốc từ mới đến cũ
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

  /**
   * Tạo một comment trả lời (reply)
   * @param {object} replyData - Dữ liệu của reply
   * @param {string} replyData.parentId - ID của comment cha
   * @param {string} replyData.authorId - ID của người trả lời
   * @param {string} replyData.content - Nội dung trả lời
   * @returns {Promise<Document>} Comment trả lời vừa được tạo
   */
  async replyToComment({ parentId, authorId, content }, io, onlineUsers) {
    // 1. Tìm comment cha để lấy postId
    const parentComment = await Comment.findByPk(parentId, {
      attributes: ['postId']
    });
    if (!parentComment) {
      throw new Error('Parent comment not found');
    }
 
    // 2. Gọi hàm create chính để xử lý logic tạo, bao gồm cả kiểm tra độ sâu
    return this.create({
      postId: parentComment.postId, // Lấy postId từ comment cha
      authorId: authorId,
      content: content,
      parentId: parentId, // Gán ID của comment cha
    }, io, onlineUsers);
  },
};

module.exports = commentService;
