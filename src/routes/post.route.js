const express = require("express");
const router = express.Router();
const postController = require("@/controllers/post.controller");
const checkAuth = require("@/middleware/checkAuth");
const checkAuthOptional = require("@/middleware/checkAuthOptional");
const uploadPostFields = require("@/middleware/uploadPost");

// --- Public & Optional Auth Routes ---
router.get('/search/hashtag/:tagName', checkAuthOptional, postController.getPostsByHashtag);
router.get('/mentions/:username', checkAuthOptional, postController.getPostsByMentionedUser);
router.get("/by-slug/:slug", checkAuthOptional, postController.getPostBySlug);
router.post("/feed", checkAuthOptional, postController.getAllPosts);
router.get("/:id", checkAuthOptional, postController.getPostById);

// --- Protected Routes ---
router.post(
  "/",
  checkAuth,
  uploadPostFields(),
  postController.createPost
);

router.post("/:id/view", postController.incrementViewCount);

router.put(
  "/:id",
  checkAuth,
  uploadPostFields(),
  postController.updatePost
);

router.delete("/:id", checkAuth, postController.deletePost);
router.delete("/:id/media/:mediaIndex", checkAuth, postController.deletePostMedia);
router.post("/:id/like", checkAuth, postController.likePost);
router.delete("/:id/unlike", checkAuth, postController.unlikePost);

module.exports = router;
