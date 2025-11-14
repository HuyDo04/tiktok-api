const express = require("express");
const router = express.Router();
const userController = require("@/controllers/user.controller");
const uploadAvatar = require("@/middleware/uploadAvatar");
const checkAuth = require("@/middleware/checkAuth");
const checkSameAvatar = require("@/middleware/checkSameAvatar");
const checkBlock = require("@/middleware/checkBlock");
const checkAuthOptional = require("@/middleware/checkAuthOptional");

// --- User Relationship Routes ---
// Follow a user
router.post("/:id/follow", checkAuth, userController.follow);

// Unfollow a user
router.delete("/:id/follow", checkAuth, userController.unfollow);

// Get a user's followers (áp dụng checkBlock)
router.get("/:id/followers", checkAuthOptional, checkBlock, userController.getFollowers);

// Get a user's following list (áp dụng checkBlock)
router.get("/:id/following", checkAuthOptional, checkBlock, userController.getFollowing);

// Block a user
router.post("/:id/block", checkAuth, userController.block);

// Unblock a user
router.delete("/:id/block", checkAuth, userController.unblock);

// Get the current user's blocked list
router.get("/blocked/me", checkAuth, userController.getBlockedUsers);

// Get the current user's friend list
router.get("/friends/me", checkAuth, userController.getFriends);

// Get follow status with another user
router.get("/:id/follow-status", checkAuthOptional, userController.getFollowStatus);


// --- General User Routes ---
// Get/Search all users (có lọc block nếu đã đăng nhập)
router.get("/", checkAuthOptional, userController.searchUsers);

// Check username (đặt trước /:id)
router.get("/check-username", userController.checkUsername);

// Get all posts by user ID
router.get("/:id/posts", checkAuthOptional, checkBlock, userController.getUserPosts);

// Get all reposts by user ID
router.get("/:id/reposts", checkAuthOptional, checkBlock, userController.getUserReposts);

// Get all videos by username (public access)
router.get("/:username/videos", checkAuthOptional, userController.getUserVideosByUsername);

// Get user by ID
router.get("/:id", checkAuthOptional, checkBlock, userController.getUserById);

// Update user
router.put("/:id", checkAuth, userController.updateUser);

// Delete user
router.delete("/:id", userController.deleteUser);

// Update avatar (current user)
router.patch(
  "/me/avatar",
  checkAuth,
  uploadAvatar.single("avatar"),
  checkSameAvatar,
  userController.updateAvatar
);

module.exports = router;
