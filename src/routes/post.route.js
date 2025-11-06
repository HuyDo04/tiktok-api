const express = require("express");
const router = express.Router();
const postController = require("@/controllers/post.controller");
const uploadPost = require("@/middleware/uploadPost");
const checkAuth = require("@/middleware/checkAuth");

// Get all posts
router.get("/", postController.getAllPosts);

// Get related posts
router.get("/related", postController.getRelatedPosts);

// Get post by slug (đặt trước /:id để tránh nuốt)
router.get("/by-slug/:slug", postController.getPostBySlug);

// Get post by ID
router.get("/:id", postController.getPostById);

// Create post
router.post(
  "/",
  checkAuth, // Protect this route
  uploadPost.fields([
    { name: "featuredImage", maxCount: 1 },
    { name: "media", maxCount: 10 }
  ]),
  postController.createPost
);

// Update post
router.put(
  "/:id",
  checkAuth, // Protect this route
  uploadPost.fields([
    { name: "featuredImage", maxCount: 1 },
    { name: "media", maxCount: 10 }
  ]),
  postController.updatePost
);

// Delete post
router.delete("/:id", checkAuth, postController.deletePost); // Protect this route

// Delete specific media in a post
router.delete("/:id/media/:mediaIndex", checkAuth, postController.deletePostMedia); // Protect this route

// Like a post
router.post("/:id/like", checkAuth, postController.likePost);

// Unlike a post
router.delete("/:id/like", checkAuth, postController.unlikePost);

module.exports = router;
