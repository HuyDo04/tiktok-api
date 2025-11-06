const express = require("express");

const authRouter = require("./auth.route");
const userRoute = require("./user.route");
const topicRoute = require("./topic.route");
const postRoute = require("./post.route");
const commentRoute = require("./comment.route");
const notificationRouter = require("./notification.route");
const chatRoute = require("./chat.route");
const streamRoute = require("./stream.route");

const router = express.Router();

router.use("/auth", authRouter);
router.use("/users", userRoute);
router.use("/topics", topicRoute);
router.use("/posts", postRoute);
router.use("/comments", commentRoute);
router.use("/notifications", notificationRouter);
router.use("/chats", chatRoute);
router.use("/streams", streamRoute);

module.exports = router