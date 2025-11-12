'use strict'

const chatService = require('@/services/chat.service')
const { io } = require('@/socket') // Giả sử bạn đã khởi tạo socket.io trong file socket.js

class ChatController {
  // [POST] /chats
  createChat = async (req, res, next) => {
    try {
      const creatorId = req.user.id
      const chat = await chatService.createChat(req.body, creatorId)

      // thông báo realtime cho tất cả thành viên được thêm
      chat.members?.forEach(member => {
        if (member.id !== creatorId) {
          io.to(`user_${member.id}`).emit('chat:new', chat)
        }
      })

      res.status(201).json(chat)
    } catch (error) {
      next(error)
    }
  }

  // [GET] /chats
  getChats = async (req, res, next) => {
    try {
      const userId = req.user.id
      const chats = await chatService.getChats(userId)
      res.status(200).json(chats)
    } catch (error) {
      next(error)
    }
  }

  // [GET] /chats/:chatId
  getChatById = async (req, res, next) => {
    try {
      const { chatId } = req.params
      const userId = req.user.id
      const chat = await chatService.getChatById(chatId, userId)
      res.status(200).json(chat)
    } catch (error) {
      next(error)
    }
  }

  // [GET] /chats/:chatId/messages
  getMessages = async (req, res, next) => {
    try {
      const { chatId } = req.params
      const { page, limit } = req.query
      const userId = req.user.id
      const messages = await chatService.getMessages(chatId, userId, { page, limit })
      res.status(200).json(messages)
    } catch (error) {
      next(error)
    }
  }

  // [POST] /chats/:chatId/messages
  sendMessage = async (req, res, next) => {
    try {
      const { chatId } = req.params
      const userId = req.user.id
      const message = await chatService.sendMessage(chatId, userId, req.body)

      // emit tới tất cả user trong phòng chat (trừ người gửi)
      io.to(`chat_${chatId}`).emit('message:new', {
        chatId,
        message,
      })

      res.status(201).json(message)
    } catch (error) {
      next(error)
    }
  }

  // [PATCH] /chats/:chatId/messages/:messageId/read
  markMessageAsRead = async (req, res, next) => {
    try {
      const { chatId, messageId } = req.params
      const userId = req.user.id
      const message = await chatService.markMessageAsRead(chatId, messageId, userId)

      // broadcast tới những người khác rằng user này đã đọc
      io.to(`chat_${chatId}`).emit('message:read', {
        chatId,
        messageId,
        userId,
      })

      res.status(200).json(message)
    } catch (error) {
      next(error)
    }
  }

  // [POST] /chats/:chatId/members
  addMember = async (req, res, next) => {
    try {
      const { chatId } = req.params
      const { userId } = req.body
      const currentUserId = req.user.id
      const chat = await chatService.addMember(chatId, userId, currentUserId)

      io.to(`chat_${chatId}`).emit('chat:member_added', {
        chatId,
        userId,
      })

      res.status(200).json(chat)
    } catch (error) {
      next(error)
    }
  }

  // [DELETE] /chats/:chatId/members/:userId
  removeMember = async (req, res, next) => {
    try {
      const { chatId, userId } = req.params
      const currentUserId = req.user.id
      const chat = await chatService.removeMember(chatId, userId, currentUserId)

      io.to(`chat_${chatId}`).emit('chat:member_removed', {
        chatId,
        userId,
      })

      res.status(200).json(chat)
    } catch (error) {
      next(error)
    }
  }

  // [PATCH] /chats/:chatId/accept
  acceptChatRequest = async (req, res, next) => {
    try {
      const { chatId } = req.params
      const userId = req.user.id
      const chat = await chatService.acceptChat(chatId, userId)

      io.to(`chat_${chatId}`).emit('chat:accepted', { chatId, userId })

      res.status(200).json({ message: 'Chat accepted successfully.', chat })
    } catch (error) {
      next(error)
    }
  }

  // [DELETE] /chats/:chatId/decline
  declineChatRequest = async (req, res, next) => {
    try {
      const { chatId } = req.params
      const userId = req.user.id
      const result = await chatService.declineChat(chatId, userId)

      io.to(`chat_${chatId}`).emit('chat:declined', { chatId, userId })
      res.status(200).json(result)
    } catch (error) {
      next(error)
    }
  }

  // [GET] /chats/pending
  getPendingChats = async (req, res, next) => {
    try {
      const userId = req.user.id
      const pendingChats = await chatService.getPendingChats(userId)
      res.status(200).json(pendingChats)
    } catch (error) {
      next(error)
    }
  }

  // [GET] /chats/:chatId/members
  getChatMembers = async (req, res, next) => {
    try {
      const { chatId } = req.params
      const userId = req.user.id
      const members = await chatService.getChatMembers(chatId, userId)
      res.status(200).json(members)
    } catch (error) {
      next(error)
    }
  }

  // [PATCH] /chats/:chatId/leave
  leaveChat = async (req, res, next) => {
    try {
      const { chatId } = req.params
      const userId = req.user.id
      const result = await chatService.leaveChat(chatId, userId)

      io.to(`chat_${chatId}`).emit('chat:left', { chatId, userId })

      res.status(200).json(result)
    } catch (error) {
      next(error)
    }
  }

  // [PATCH] /chats/:chatId
  updateChat = async (req, res, next) => {
    try {
      const { chatId } = req.params
      const userId = req.user.id
      const chat = await chatService.updateChat(chatId, userId, req.body)

      io.to(`chat_${chatId}`).emit('chat:updated', chat)

      res.status(200).json(chat)
    } catch (error) {
      next(error)
    }
  }

  // [DELETE] /chats/:chatId
  deleteChat = async (req, res, next) => {
    try {
      const { chatId } = req.params
      const userId = req.user.id
      const result = await chatService.deleteChat(chatId, userId)

      io.to(`chat_${chatId}`).emit('chat:deleted', { chatId })

      res.status(200).json(result)
    } catch (error) {
      next(error)
    }
  }

  // [GET] /chats/by-members?memberIds=1,2,3
  getChatByMemberIds = async (req, res, next) => {
    try {
      let { memberIds } = req.query
      if (typeof memberIds === 'string') {
        memberIds = memberIds.split(',').map(id => id.trim())
      }
      const chat = await chatService.getChatByMemberIds(memberIds)
      res.status(200).json(chat || { message: 'No chat found for these members.' })
    } catch (error) {
      next(error)
    }
  }
}

module.exports = new ChatController()
