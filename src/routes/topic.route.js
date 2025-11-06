const express = require("express");
const router = express.Router();
const topicController = require("@/controllers/topic.controller");

// Get all topics
router.get("/", topicController.getAllTopics);

// Get topic by slug (đặt trước /:id)
router.get("/by-slug/:slug", topicController.getTopicBySlug);

// Get topic by ID
router.get("/:id", topicController.getTopicById);

// Create new topic
router.post("/", topicController.createTopic);

// Update topic
router.put("/:id", topicController.updateTopic);

// Delete topic
router.delete("/:id", topicController.deleteTopic);

module.exports = router;
