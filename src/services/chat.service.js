'use strict';

const { Chat, ChatMember, User, Message, sequelize } = require('../models');
const { Op } = require('sequelize');

class ChatService {
  // CREATE chat
  async createChat(createChatBody, creatorId) {
    const { receiverId, name, memberIds } = createChatBody;

    // Case 1: Private 1-on-1 Chat
    if (receiverId) {
      if (String(creatorId) === String(receiverId)) {
        throw new Error('Cannot create a chat with yourself.');
      }

      // Step 1: Find chat_ids that have both users as members.
      const memberEntries = await ChatMember.findAll({
        attributes: ['chat_id'],
        where: {
          user_id: {
            [Op.in]: [creatorId, receiverId],
          },
        },
        group: ['chat_id'],
        having: sequelize.literal(`COUNT(chat_id) = 2`),
      });

      const chatIds = memberEntries.map((entry) => entry.chat_id);

      if (chatIds.length > 0) {
        // Step 2: Among these chats, find the one that is 'private' and has exactly 2 members.
        const existingChat = await Chat.findOne({
          where: {
            id: { [Op.in]: chatIds },
            type: 'private',
          },
          include: [
            {
              model: ChatMember,
              as: 'chatMembers',
              attributes: [],
            },
          ],
          group: ['Chat.id'],
          having: sequelize.literal(`COUNT(Chat.id) = 1`),
        });

        if (existingChat) {
          return this.getChatById(existingChat.id, creatorId);
        }
      }

      // If not, create a new private chat
      const t = await sequelize.transaction();
      try {
        const chat = await Chat.create(
          {
            type: 'private',
            created_by: creatorId,
          },
          { transaction: t },
        );

        const chatMembers = [
          { chat_id: chat.id, user_id: creatorId },
          { chat_id: chat.id, user_id: receiverId },
        ];

        await ChatMember.bulkCreate(chatMembers, { transaction: t });

        await t.commit();

        return this.getChatById(chat.id, creatorId);
      } catch (error) {
        await t.rollback();
        console.error('Error creating private chat:', error);
        throw new Error('Could not create private chat.');
      }
    }

    // Case 2: Group Chat
    if (name && memberIds) {
      const allMemberIds = [...new Set([...memberIds, creatorId])];

      const users = await User.findAll({ where: { id: allMemberIds } });
      if (users.length !== allMemberIds.length) {
        throw new Error('One or more users in memberIds not found.');
      }

      const t = await sequelize.transaction();
      try {
        const chat = await Chat.create(
          {
            type: 'group',
            name,
            created_by: creatorId,
          },
          { transaction: t },
        );

        const chatMemberRecords = allMemberIds.map((userId) => ({
          chat_id: chat.id,
          user_id: userId,
        }));

        await ChatMember.bulkCreate(chatMemberRecords, { transaction: t });

        await t.commit();

        return this.getChatById(chat.id, creatorId);
      } catch (error) {
        await t.rollback();
        console.error('Error creating group chat:', error);
        throw new Error('Could not create group chat.');
      }
    }

    throw new Error('Invalid request body for creating chat.');
  }

  // GET message
  async getMessages(chatId, userId, options = {}) {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    const isMember = await ChatMember.findOne({
      where: { chat_id: chatId, user_id: userId },
    });

    if (!isMember) {
      throw new Error('You are not a member of this chat.');
    }

    const messages = await Message.findAndCountAll({
      where: { chat_id: chatId },
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'username', 'avatar'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    return messages;
  }
  async sendMessage(chatId, userId, messageBody) {
    const { content } = messageBody;

    const t = await sequelize.transaction();
    try {
      const isMember = await ChatMember.findOne({
        where: { chat_id: chatId, user_id: userId },
        transaction: t,
      });

      if (!isMember) {
        throw new Error('You are not a member of this chat.');
      }

      const message = await Message.create(
        {
          chat_id: chatId,
          sender_id: userId,
          content,
        },
        { transaction: t },
      );

      // Touch the chat to update its updatedAt timestamp
      await Chat.update({ updatedAt: new Date() }, { where: { id: chatId }, transaction: t });

      await t.commit();

      const fullMessage = await Message.findByPk(message.id, {
        include: [
          {
            model: User,
            as: 'sender',
            attributes: ['id', 'username', 'avatar'],
          },
        ],
      });

      return fullMessage;
    } catch (error) {
      console.error(error);
      await t.rollback();
      throw error;
    }
  }
  async markMessageAsRead(chatId, messageId, userId) {
    const isMember = await ChatMember.findOne({
      where: { chat_id: chatId, user_id: userId },
    });

    if (!isMember) {
      throw new Error('You are not a member of this chat.');
    }

    const message = await Message.findByPk(messageId);
    if (!message) {
      throw new Error('Message not found.');
    }

    let readBy = message.read_by || [];
    if (!readBy.includes(userId)) {
      readBy.push(userId);
      await message.update({ read_by: readBy });
    }

    return message;
  }
  async getChats(userId) {
    const chats = await Chat.findAll({
      include: [
        {
          model: ChatMember,
          as: 'chatMembers',
          where: { user_id: userId },
          attributes: [],
        },
        {
          model: User,
          as: 'members',
          attributes: ['id', 'username', 'avatar'],
          through: { attributes: [] },
        },
        {
          model: Message,
          as: 'lastMessage',
          order: [['createdAt', 'DESC']],
          limit: 1,
          include: [
            {
              model: User,
              as: 'sender',
              attributes: ['id', 'username', 'avatar'],
            },
          ],
        },
      ],
      order: [['updatedAt', 'DESC']],
    });

    return chats;
  }

  async getChatById(chatId, userId) {
    const chat = await Chat.findByPk(chatId, {
      include: [
        {
          model: User,
          as: 'members',
          attributes: ['id', 'username', 'avatar'],
          through: { attributes: [] },
        },
      ],
    });

    if (!chat) {
      throw new Error('Chat not found.');
    }

    const isMember = chat.members.some((member) => String(member.id) === String(userId));
    if (!isMember) {
      throw new Error('You are not a member of this chat.');
    }

    return chat;
  }

  async addMember(chatId, userId, currentUserId) {
    const chat = await this.getChatById(chatId, currentUserId);

    if (chat.type !== 'group') {
      throw new Error('Cannot add members to a private chat.');
    }

    const isAlreadyMember = chat.members.some((member) => member.id === userId);
    if (isAlreadyMember) {
      throw new Error('User is already a member of this chat.');
    }

    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User to be added not found.');
    }

    await ChatMember.create({ chat_id: chatId, user_id: userId });

    return this.getChatById(chatId, currentUserId);
  }

  async removeMember(chatId, userId, currentUserId) {
    const chat = await this.getChatById(chatId, currentUserId);

    if (chat.type !== 'group') {
      throw new Error('Cannot remove members from a private chat.');
    }

    if (chat.created_by !== currentUserId) {
      throw new Error('Only the chat creator can remove members.');
    }

    if (userId === currentUserId) {
      throw new Error('You cannot remove yourself from the chat.');
    }

    const isMember = chat.members.some((member) => member.id === userId);
    if (!isMember) {
      throw new Error('User is not a member of this chat.');
    }

    await ChatMember.destroy({ where: { chat_id: chatId, user_id: userId } });

    return this.getChatById(chatId, currentUserId);
  }
}

module.exports = new ChatService();
