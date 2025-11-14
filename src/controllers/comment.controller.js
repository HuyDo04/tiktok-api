const commentService = require("../service/comment.service");

const commentController = {
  // Tạo comment mới
  async createComment(req, res, next) {
    try {
      const { postId, parentId, content } = req.body;
      const authorId = req.user.id; // Lấy từ middleware xác thực

      if (!content) {
        return res.status(400).json({ message: "Content is required" });
      }

      const newComment = await commentService.create({
        postId,
        authorId,
        parentId,
        content,
      });

      res.status(201).json(newComment);
    } catch (error) {
      next(error);
    }
  },

  // Lấy tất cả comment của một bài viết
  async getCommentsByPost(req, res, next) {
    try {
      const { postId } = req.params;
      const currentUserId = req.user ? req.user.id : null;
      const comments = await commentService.getByPost(postId, currentUserId);
      res.status(200).json(comments);
    } catch (error) {
      next(error);
    }
  },

  async likeComment(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const like = await commentService.likeComment(id, userId);
      res.status(201).json({ message: "Comment liked successfully", like });
    } catch (error) {
      if (error.message === 'Comment not found') {
        return res.status(404).json({ message: error.message });
      }
      next(error);
    }
  },

  async unlikeComment(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const result = await commentService.unlikeComment(id, userId);
      res.status(200).json(result);
    } catch (error) {
      if (error.message === 'Comment not found' || error.message === 'You have not liked this comment') {
        return res.status(404).json({ message: error.message });
      }
      next(error);
    }
  },

  // Cập nhật comment
  async updateComment(req, res, next) {
    try {
      const { id } = req.params;
      const { content } = req.body;
      const userId = req.user.id;

      if (!content) {
        return res.status(400).json({ message: "Content is required" });
      }

      const updatedComment = await commentService.update(id, userId, content);
      res.status(200).json(updatedComment);
    } catch (error) {
      if (error.message === 'Comment not found') {
        return res.status(404).json({ message: error.message });
      }
      if (error.message === 'Unauthorized') {
        return res.status(403).json({ message: error.message });
      }
      next(error);
    }
  },

  // Xóa comment
  async deleteComment(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const result = await commentService.delete(id, userId);
      res.status(200).json(result);
    } catch (error) {
      if (error.message === 'Comment not found') {
        return res.status(404).json({ message: error.message });
      }
      if (error.message === 'Unauthorized') {
        return res.status(403).json({ message: error.message });
      }
      next(error);
    }
  },

  // Reply to a comment
  async replyToComment(req, res, next) {
    try {
      const parentId = req.params.id;
      const { content } = req.body;
      const authorId = req.user.id; // Lấy từ middleware xác thực

      if (!content) {
        return res.status(400).json({ message: "Content is required" });
      }

      const newReply = await commentService.replyToComment({
        parentId,
        authorId,
        content,
      });

      res.status(201).json(newReply);
    } catch (error) {
      next(error);
    }
  },
};

module.exports = commentController;
