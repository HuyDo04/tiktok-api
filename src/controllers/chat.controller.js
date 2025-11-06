'use strict';

const chatService = require('@/services/chat.service');

class ChatController {
  createChat = async (req, res, next) => {
    try {
      const creatorId = req.user.id;
      const chat = await chatService.createChat(req.body, creatorId);
      res.status(201).send(chat);
    } catch (error) {
      next(error);
    }
  };

  getChats = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const chats = await chatService.getChats(userId);
      res.send(chats);
    } catch (error) {
      next(error);
    }
  };

  getChatById = async (req, res, next) => {
    try {
      const { chatId } = req.params;
      const userId = req.user.id;
      const chat = await chatService.getChatById(chatId, userId);
      res.send(chat);
    } catch (error) {
      next(error);
    }
  };

  getMessages = async (req, res, next) => {
    try {
      const { chatId } = req.params;
      const { page, limit } = req.query;
      const userId = req.user.id;

      const messages = await chatService.getMessages(chatId, userId, { page, limit });
      res.send(messages);
    } catch (error) {
      next(error);
    }
  };
  sendMessage = async (req, res, next) => {
    try {
      const { chatId } = req.params;
      const userId = req.user.id;

      const message = await chatService.sendMessage(chatId, userId, req.body);
      res.status(201).send(message);
    } catch (error) {
      next(error);
    }
  };

  addMember = async (req, res, next) => {
    try {
      const { chatId } = req.params;
      const { userId } = req.body;
      const currentUserId = req.user.id;
      const chat = await chatService.addMember(chatId, userId, currentUserId);
      res.send(chat);
    } catch (error) {
      next(error);
    }
  };

  removeMember = async (req, res, next) => {
    try {
      const { chatId, userId } = req.params;
      const currentUserId = req.user.id;
      const chat = await chatService.removeMember(chatId, userId, currentUserId);
      res.send(chat);
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new ChatController();
