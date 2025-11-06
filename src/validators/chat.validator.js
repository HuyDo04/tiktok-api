'use strict';

const Joi = require('joi');

const createChat = {
  body: Joi.object()
    .keys({
      // For group chats
      name: Joi.string().min(1).max(100),
      memberIds: Joi.array().items(Joi.number().integer().required()).min(1), // integer

      // For private chats
      receiverId: Joi.number().integer(), // integer
    })
    .xor('receiverId', 'name') // Can't have both receiverId and name/memberIds for a group
    .and('name', 'memberIds') // If name exists, memberIds must also exist
    .messages({
      'object.xor': 'Provide either receiverId (for a private chat) or name/memberIds (for a group chat).',
      'object.and': 'Group chats must have both a name and memberIds.',
    }),
};

const getMessages = {
  params: Joi.object().keys({
    chatId: Joi.number().integer().required(), // integer
  }),
  query: Joi.object().keys({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};

const sendMessage = {
  params: Joi.object().keys({
    chatId: Joi.number().integer().required(), // integer
  }),
  body: Joi.object().keys({
    content: Joi.string().required().min(1),
  }),
};

const getChatById = {
  params: Joi.object().keys({
    chatId: Joi.number().integer().required(), // integer
  }),
};

const addMember = {
  params: Joi.object().keys({
    chatId: Joi.number().integer().required(), // integer
  }),
  body: Joi.object().keys({
    userId: Joi.number().integer().required(), // integer
  }),
};

const removeMember = {
  params: Joi.object().keys({
    chatId: Joi.number().integer().required(), // integer
    userId: Joi.number().integer().required(), // integer
  }),
};

module.exports = {
  createChat,
  getMessages,
  sendMessage,
  getChatById,
  addMember,
  removeMember,
};
