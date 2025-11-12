'use strict';

const { Chat, ChatMember, User, Message, sequelize } = require('../models');
const { Op } = require('sequelize');

class ChatService {
  async createChat(createChatBody, creatorId) {
    const { receiverId, name, memberIds } = createChatBody;

    // --- Case 1: Private 1-on-1 Chat ---
    if (receiverId) {
      if (String(creatorId) === String(receiverId)) {
        throw new Error('Cannot create a chat with yourself.');
      }

      // Kiểm tra xem chat giữa 2 người đã tồn tại chưa
      const existingChat = await Chat.findOne({
        where: { type: 'private' },
        include: [
          {
            model: ChatMember,
            as: 'chatMembers',
            where: { user_id: { [Op.in]: [creatorId, receiverId] } },
            attributes: [],
          },
        ],
        group: ['Chat.id'],
        having: sequelize.literal('COUNT(DISTINCT chatMembers.user_id) = 2'),
      });

      if (existingChat) {
        return this.getChatById(existingChat.id, creatorId);
      }

      const t = await sequelize.transaction();
      try {
        const chat = await Chat.create(
          { type: 'private', created_by: creatorId, status: 'pending' },
          { transaction: t }
        );

        await ChatMember.bulkCreate(
          [
            { chat_id: chat.id, user_id: creatorId },
            { chat_id: chat.id, user_id: receiverId },
          ],
          { transaction: t }
        );

        await t.commit();
        return this.getChatById(chat.id, creatorId);
      } catch (error) {
        await t.rollback();
        throw new Error('Could not create private chat.');
      }
    }

    // --- Case 2: Group Chat ---
    if (name && memberIds) {
      const allMemberIds = [...new Set([...memberIds, creatorId])];
      const users = await User.findAll({ where: { id: allMemberIds } });
      if (users.length !== allMemberIds.length) {
        throw new Error('One or more users in memberIds not found.');
      }

      const t = await sequelize.transaction();
      try {
        const chat = await Chat.create(
          { type: 'group', name, created_by: creatorId },
          { transaction: t }
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

    const chat = await Chat.findByPk(chatId);
    if (!chat) {
      throw new Error('Chat not found.');
    }

    if (chat.status === 'pending') {
      throw new Error('Cannot retrieve messages from a pending chat.');
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

    // Mark all retrieved messages as read by the user
    for (const message of messages.rows) {
      let readBy = message.read_by;
    
      // Chuyển sang mảng an toàn
      if (typeof readBy === 'string') {
        try {
          readBy = JSON.parse(readBy);
        } catch {
          readBy = [];
        }
      }
    
      if (!Array.isArray(readBy)) {
        readBy = [];
      }
    
      // Thêm userId nếu chưa có
      if (!readBy.includes(userId)) {
        readBy.push(userId);
        await message.update({ read_by: readBy });
      }
    }

    return messages;
  }

  // sendMessage
  async sendMessage(chatId, userId, messageBody) {
    const { content } = messageBody;

    const t = await sequelize.transaction();
    try {
      const isMember = await ChatMember.findOne({
        where: { chat_id: chatId, user_id: userId },
        transaction: t,
      });
      if (!isMember) throw new Error('You are not a member of this chat.');

      const chat = await Chat.findByPk(chatId, { transaction: t });
      if (!chat) throw new Error('Chat not found.');
      if (chat.status === 'pending') throw new Error('Chat not active yet.');

      const message = await Message.create(
        {
          chat_id: chatId,
          sender_id: userId,
          content,
          read_by: JSON.stringify([userId]), // sender has read
        },
        { transaction: t }
      );

      await Chat.update({ updatedAt: new Date() }, { where: { id: chatId }, transaction: t });
      await t.commit();

      const fullMessage = await Message.findByPk(message.id, {
        include: [{ model: User, as: 'sender', attributes: ['id', 'username', 'avatar'] }],
      });

      return fullMessage;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  //meakMessageAsRead
  async markMessageAsRead(chatId, messageId, userId) {
    const isMember = await ChatMember.findOne({
      where: { chat_id: chatId, user_id: userId },
    });
    if (!isMember) throw new Error('You are not a member of this chat.');

    const message = await Message.findByPk(messageId);
    if (!message) throw new Error('Message not found.');

    let readBy = message.read_by;
    if (typeof readBy === 'string') readBy = JSON.parse(readBy);
    readBy = Array.isArray(readBy) ? readBy : [];
    if (!readBy.includes(userId)) {
      readBy.push(userId);
      await message.update({ read_by: JSON.stringify(readBy) });
    }
    return message;
  }

  // d:/Tiktok/Tiktok-api/src/services/chat.service.js (Gợi ý)

  async markAllMessagesAsRead(chatId, userId) {
    const isMember = await ChatMember.findOne({
      where: { chat_id: chatId, user_id: userId },
    });
    if (!isMember) {
      throw new Error('You are not a member of this chat.');
    }
  
    // Tìm các tin nhắn cần cập nhật để trả về cho client
    const messagesToReturn = await Message.findAll({
      where: {
        chat_id: chatId,
        sender_id: { [Op.ne]: userId },
        [Op.or]: [
          { read_by: null },
          sequelize.literal(`NOT JSON_CONTAINS(read_by, '"${userId}"')`),
        ],
      },
      raw: true, // Lấy dữ liệu thô để tránh các vấn đề về instance
    });
  
    if (messagesToReturn.length === 0) {
      return [];
    }
  
  
    // Thực hiện một câu lệnh UPDATE duy nhất
    const [affectedRows] = await Message.update(
      {
        // Xử lý trường hợp read_by là NULL:
        // IFNULL(read_by, '[]') -> Nếu read_by là NULL, coi nó là mảng rỗng '[]'
        // JSON_ARRAY_APPEND(...) -> Thêm userId vào mảng
        read_by: sequelize.fn('JSON_ARRAY_APPEND', sequelize.fn('IFNULL', sequelize.col('read_by'), '[]'), '$', userId.toString())
      },
      {
        where: { id: { [Op.in]: messagesToReturn.map(m => m.id) } },
      }
    );

    // Trả về danh sách các tin nhắn đã được cập nhật (dữ liệu trước khi update)
    // Client sẽ dùng danh sách này để biết tin nhắn nào cần cập nhật trạng thái
    return messagesToReturn;
  }


  async countUnreadMessages(userId, chatId) {
    const count = await Message.count({
      where: {
        chat_id: chatId,
        sender_id: { [Op.ne]: userId },
        [Op.or]: [
          { read_by: null },
          sequelize.literal(`NOT JSON_CONTAINS(read_by, '"${userId.toString()}"')`),
        ],
      },
    });
    return count;
  }

  // getChats
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
          as: 'messages',
          order: [['createdAt', 'DESC']],
          limit: 1,
          include: [
            { model: User, as: 'sender', attributes: ['id', 'username', 'avatar'] },
          ],
        },
      ],
      order: [['updatedAt', 'DESC']],
    });

    for (const chat of chats) {
      chat.dataValues.unreadCount = await this.countUnreadMessages(userId, chat.id);
    }

    return chats;
  }

// getChatMember
async getChatMembers(chatId) {
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
  if (!chat) throw new Error('Chat not found.');
  return chat.members;
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

  async acceptChat(chatId, userId) {
    const chat = await Chat.findByPk(chatId);

    if (!chat) {
      throw new Error('Chat not found.');
    }

    const isMember = await ChatMember.findOne({
      where: { chat_id: chatId, user_id: userId },
    });

    if (!isMember) {
      throw new Error('You are not a member of this chat.');
    }

    if (chat.status === 'active') {
      throw new Error('Chat is already active.');
    }

    await chat.update({ status: 'active' });

    return chat;
  }

  async getPendingChats(userId) {
    const pendingChats = await Chat.findAll({
      where: { status: 'pending' },
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
      ],
    });

    return pendingChats;
  }

  async declineChat(chatId, userId) {
    const chat = await Chat.findByPk(chatId);

    if (!chat) {
      throw new Error('Chat not found.');
    }

    const isMember = await ChatMember.findOne({
      where: { chat_id: chatId, user_id: userId },
    });

    if (!isMember) {
      throw new Error('You are not a member of this chat.');
    }

    if (chat.status === 'active') {
      throw new Error('Cannot decline an active chat.');
    }

    const t = await sequelize.transaction();
    try {
      await ChatMember.destroy({ where: { chat_id: chatId }, transaction: t });
      await chat.destroy({ transaction: t });
      await t.commit();
    } catch (error) {
      await t.rollback();
      console.error('Error declining chat:', error);
      throw new Error('Could not decline chat.');
    }

    return { message: 'Chat declined and deleted successfully.' };
  }

  async leaveChat(chatId, userId) {
    const chat = await Chat.findByPk(chatId);

    if (!chat) {
      throw new Error('Chat not found.');
    }

    const isMember = await ChatMember.findOne({
      where: { chat_id: chatId, user_id: userId },
    });

    if (!isMember) {
      throw new Error('You are not a member of this chat.');
    }

    if (chat.created_by === userId) {
      throw new Error('The creator of the chat cannot leave the chat.');
    }

    await ChatMember.destroy({ where: { chat_id: chatId, user_id: userId } });

    return { message: 'Successfully left the chat.' };
  }

  async updateChat(chatId, userId, updateBody) {
    const { name } = updateBody;

    const chat = await Chat.findByPk(chatId);

    if (!chat) {
      throw new Error('Chat not found.');
    }

    const isMember = await ChatMember.findOne({
      where: { chat_id: chatId, user_id: userId },
    });

    if (!isMember) {
      throw new Error('You are not a member of this chat.');
    }

    if (chat.created_by !== userId) {
      throw new Error('Only the chat creator can update the chat.');
    }

    await chat.update({ name });

    return chat;
  }

  async deleteChat(chatId, userId) {
    const chat = await Chat.findByPk(chatId);

    if (!chat) {
      throw new Error('Chat not found.');
    }

    if (chat.created_by !== userId) {
      throw new Error('Only the chat creator can delete the chat.');
    }

    const t = await sequelize.transaction();
    try {
      await ChatMember.destroy({ where: { chat_id: chatId }, transaction: t });
      await Message.destroy({ where: { chat_id: chatId }, transaction: t });
      await chat.destroy({ transaction: t });
      await t.commit();
    } catch (error) {
      await t.rollback();
      console.error('Error deleting chat:', error);
      throw new Error('Could not delete chat.');
    }

    return { message: 'Chat deleted successfully.' };
  }

  async getChatByMembers(memberIds) {
    const chat = await Chat.findOne({
      include: [
        {
          model: ChatMember,
          as: 'chatMembers',
          where: { user_id: { [Op.in]: memberIds } },
          attributes: [],
        },
      ],
      group: ['Chat.id'],
      having: sequelize.literal(`COUNT(DISTINCT chatMembers.user_id) = ${memberIds.length}`),
    });

    return chat;
  }

  async getChatByMemberIds(memberIds) {
    const chat = await Chat.findOne({
      include: [
        {
          model: ChatMember,
          as: 'chatMembers',
          where: { user_id: { [Op.in]: memberIds } },
          attributes: [],
        },
      ],
      group: ['Chat.id'],
      having: sequelize.literal(`COUNT(DISTINCT chatMembers.user_id) = ${memberIds.length}`),
    });

    return chat;
  }
}

module.exports = new ChatService();