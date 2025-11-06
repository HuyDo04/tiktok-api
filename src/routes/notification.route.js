const express = require("express");
const router = express.Router();
const notificationController = require("@/controllers/notification.controller");
const checkAuth = require("@/middleware/checkAuth");

// Get all notifications for the current user
router.get("/", checkAuth, notificationController.getNotifications);

// Mark a notification as read
router.patch("/:id/read", checkAuth, notificationController.markAsRead);

module.exports = router;
