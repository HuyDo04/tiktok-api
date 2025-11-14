const express = require("express");
const router = express.Router();
const commentController = require("@/controllers/comment.controller");
const checkAuth = require("@/middleware/checkAuth");
const checkAuthOptional = require("@/middleware/checkAuthOptional");

// Tạo comment mới (yêu cầu đăng nhập)
router.post("/", checkAuth, commentController.createComment);

// Lấy tất cả comment của một bài viết (công khai)
router.get("/post/:postId", checkAuthOptional, commentController.getCommentsByPost);

// Cập nhật comment (yêu cầu đăng nhập và là chủ sở hữu)
router.put("/:id", checkAuth, commentController.updateComment);

// Xóa comment (yêu cầu đăng nhập và là chủ sở hữu)
router.delete("/:id", checkAuth, commentController.deleteComment);

// Like a comment
router.post("/:id/like", checkAuth, commentController.likeComment);

// Unlike a comment
router.delete("/:id/like", checkAuth, commentController.unlikeComment);

// Reply to a comment
router.post("/:id/reply", checkAuth, commentController.replyToComment);

module.exports = router;
