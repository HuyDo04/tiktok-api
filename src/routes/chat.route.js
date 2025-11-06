'use strict';

const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const chatValidator = require('../validators/chat.validator');
const validate = require('../middleware/validate');
const checkAuth = require('../middleware/checkAuth');

router.post(
  '/',
  checkAuth,
  validate(chatValidator.createChat),
  chatController.createChat,
);

router.get('/', checkAuth, chatController.getChats);

router.get(
  '/:chatId/messages',
  checkAuth,
  validate(chatValidator.getMessages),
  chatController.getMessages,
);

router.post(
  '/:chatId/messages',
  checkAuth,
  validate(chatValidator.sendMessage),
  chatController.sendMessage,
);

router.get(
  '/:chatId',
  checkAuth,
  validate(chatValidator.getChatById),
  chatController.getChatById,
);

router.post(
  '/:chatId/members',
  checkAuth,
  validate(chatValidator.addMember),
  chatController.addMember,
);

router.delete(
  '/:chatId/members/:userId',
  checkAuth,
  validate(chatValidator.removeMember),
  chatController.removeMember,
);

module.exports = router;
