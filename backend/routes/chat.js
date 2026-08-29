const express = require('express')
const router = express.Router()
const ChatMessage = require('../models/ChatMessage')
const User = require('../models/User')
const authenticate = require('../middleware/authenticate')
const { authorizeBoard } = require('../middleware/authorize')
const { createNotification } = require('../utils/notify')

// GET /api/boards/:boardId/chat/messages - Fetch history for board chat
router.get('/:boardId/chat/messages', authenticate, authorizeBoard, async (req, res, next) => {
  try {
    const { boardId } = req.params
    const limit = parseInt(req.query.limit) || 100

    const messages = await ChatMessage.find({ boardId })
      .sort({ createdAt: 1 })
      .limit(limit)
      .populate('senderId', 'name username email avatar')
      .populate('mentions', 'name username email avatar')

    res.json(messages)
  } catch (err) {
    next(err)
  }
})

// POST /api/boards/:boardId/chat/messages - Send a chat message
router.post('/:boardId/chat/messages', authenticate, authorizeBoard, async (req, res, next) => {
  try {
    const { boardId } = req.params
    const { text, mentionUsernames = [] } = req.body
    const senderId = req.user.id

    if (!text || !text.trim()) {
      const err = new Error('Message text cannot be empty')
      err.status = 400
      return next(err)
    }

    // Resolve tagged usernames to user ObjectIds
    let mentionUserIds = []
    if (mentionUsernames && mentionUsernames.length > 0) {
      const taggedUsers = await User.find({ username: { $in: mentionUsernames } }).select('_id username')
      mentionUserIds = taggedUsers.map((u) => u._id)
    }

    const newMessage = await ChatMessage.create({
      boardId,
      senderId,
      text: text.trim(),
      mentions: mentionUserIds
    })

    // Populate sender & mentions info before returning and broadcasting
    const populatedMessage = await ChatMessage.findById(newMessage._id)
      .populate('senderId', 'name username email avatar')
      .populate('mentions', 'name username email avatar')

    // Broadcast real-time message via Socket.io to the board room
    const io = req.app.get('io')
    if (io) {
      io.to(`board:${boardId}`).emit('receive_message', populatedMessage)
    }

    // Trigger Notification for tagged/mentioned users
    const senderName = req.user.username || req.user.name || 'A team member'
    for (const taggedUserId of mentionUserIds) {
      await createNotification({
        recipientId: taggedUserId,
        senderId,
        type: 'GENERAL',
        title: 'Mentioned in Chat',
        message: `${senderName} tagged you in "${req.board?.title || 'board'}" chat: "${text.slice(0, 50)}..."`,
        link: `/board/${boardId}`
      })
    }

    res.status(201).json(populatedMessage)
  } catch (err) {
    next(err)
  }
})

// 1 Hour Time Limit constant in ms (60 * 60 * 1000 = 3,600,000 ms)
const EDIT_TIME_LIMIT_MS = 60 * 60 * 1000

// PUT /api/boards/:boardId/chat/messages/:messageId - Edit a message (within 1 hour)
router.put('/:boardId/chat/messages/:messageId', authenticate, authorizeBoard, async (req, res, next) => {
  try {
    const { boardId, messageId } = req.params
    const { text, mentionUsernames = [] } = req.body
    const userId = req.user.id

    if (!text || !text.trim()) {
      const err = new Error('Message text cannot be empty')
      err.status = 400
      return next(err)
    }

    const message = await ChatMessage.findById(messageId)
    if (!message || message.boardId.toString() !== boardId) {
      const err = new Error('Message not found')
      err.status = 404
      return next(err)
    }

    if (message.senderId.toString() !== userId) {
      const err = new Error('You can only edit your own messages')
      err.status = 403
      return next(err)
    }

    const elapsedMs = Date.now() - new Date(message.createdAt).getTime()
    if (elapsedMs > EDIT_TIME_LIMIT_MS) {
      const err = new Error('Messages can only be edited within 1 hour of sending')
      err.status = 400
      return next(err)
    }

    let mentionUserIds = []
    if (mentionUsernames && mentionUsernames.length > 0) {
      const taggedUsers = await User.find({ username: { $in: mentionUsernames } }).select('_id username')
      mentionUserIds = taggedUsers.map((u) => u._id)
    }

    message.text = text.trim()
    message.mentions = mentionUserIds
    message.isEdited = true
    message.editedAt = new Date()
    await message.save()

    const populatedMessage = await ChatMessage.findById(message._id)
      .populate('senderId', 'name username email avatar')
      .populate('mentions', 'name username email avatar')

    const io = req.app.get('io')
    if (io) {
      io.to(`board:${boardId}`).emit('chat_message_edited', populatedMessage)
    }

    res.json(populatedMessage)
  } catch (err) {
    next(err)
  }
})

// DELETE /api/boards/:boardId/chat/messages/:messageId - Delete a message (within 1 hour)
router.delete('/:boardId/chat/messages/:messageId', authenticate, authorizeBoard, async (req, res, next) => {
  try {
    const { boardId, messageId } = req.params
    const userId = req.user.id

    const message = await ChatMessage.findById(messageId)
    if (!message || message.boardId.toString() !== boardId) {
      const err = new Error('Message not found')
      err.status = 404
      return next(err)
    }

    if (message.senderId.toString() !== userId) {
      const err = new Error('You can only delete your own messages')
      err.status = 403
      return next(err)
    }

    const elapsedMs = Date.now() - new Date(message.createdAt).getTime()
    if (elapsedMs > EDIT_TIME_LIMIT_MS) {
      const err = new Error('Messages can only be deleted within 1 hour of sending')
      err.status = 400
      return next(err)
    }

    await ChatMessage.findByIdAndDelete(messageId)

    const io = req.app.get('io')
    if (io) {
      io.to(`board:${boardId}`).emit('chat_message_deleted', { messageId, boardId })
    }

    res.json({ message: 'Message deleted successfully', messageId })
  } catch (err) {
    next(err)
  }
})

module.exports = router
