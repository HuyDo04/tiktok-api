'use strict';

const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const chatValidator = require('../validators/chat.validator');
const validate = require('../middleware/validate');
const checkAuth = require('../middleware/checkAuth');

// ===============================
// 🔹 Tạo chat mới (1-1 hoặc nhóm)
// ===============================
router.post(
  '/',
  checkAuth,
  validate(chatValidator.createChat),
  chatController.createChat
);

// ===============================
// 🔹 Lấy danh sách chat của user
// ===============================
router.get('/', checkAuth, chatController.getChats);

// ===============================
// 🔹 Lấy danh sách yêu cầu chat (chờ chấp nhận)
// ===============================
router.get('/requests', checkAuth, chatController.getPendingChats);

// ===============================
// 🔹 Chấp nhận hoặc từ chối yêu cầu chat
// ===============================
router.patch('/requests/:chatId/accept', checkAuth, chatController.acceptChatRequest);
router.delete('/requests/:chatId/decline', checkAuth, chatController.declineChatRequest);

// ===============================
// 🔹 Lấy thông tin chi tiết chat
// ===============================
router.get(
  '/:chatId',
  checkAuth,
  validate(chatValidator.getChatById),
  chatController.getChatById
);

// ===============================
// 🔹 Cập nhật thông tin chat (tên, avatar,...)
// ===============================
router.put(
  '/:chatId',
  checkAuth,
  validate(chatValidator.updateChat),
  chatController.updateChat
);

// ===============================
// 🔹 Xóa chat (nếu là chủ sở hữu)
// ===============================
router.delete(
  '/:chatId',
  checkAuth,
  validate(chatValidator.deleteChat),
  chatController.deleteChat
);

// ===============================
// 🔹 Lấy danh sách tin nhắn trong chat
// (vẫn cần API để load lịch sử cũ, realtime thì qua socket)
// ===============================
router.get(
  '/:chatId/messages',
  checkAuth,
  validate(chatValidator.getMessages),
  chatController.getMessages
);

// ===============================
// 🔹 Thành viên trong chat
// ===============================
router.get(
  '/:chatId/members',
  checkAuth,
  validate(chatValidator.getChatMembers),
  chatController.getChatMembers
);

router.post(
  '/:chatId/members',
  checkAuth,
  validate(chatValidator.addMember),
  chatController.addMember
);

router.delete(
  '/:chatId/members/:userId',
  checkAuth,
  validate(chatValidator.removeMember),
  chatController.removeMember
);

// ===============================
// 🔹 Rời khỏi chat
// ===============================
router.patch(
  '/:chatId/leave',
  checkAuth,
  validate(chatValidator.leaveChat),
  chatController.leaveChat
);

// ===============================
// 🔹 Tìm chat theo danh sách memberIds
// ===============================
router.get(
  '/find/by-members',
  checkAuth,
  validate(chatValidator.getChatByMemberIds),
  chatController.getChatByMemberIds
);

module.exports = router;
