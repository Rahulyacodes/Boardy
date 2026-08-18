const express = require('express')
const router = express.Router({ mergeParams: true })
const Comment = require('../models/Comment')
const Card = require('../models/Card')
const List = require('../models/List')
const Board = require('../models/Board')
const authenticate = require('../middleware/authenticate')
const authorizeBoardRole = require('../middleware/checkBoardRole')
const { createNotification } = require('../utils/notify')

// GET /api/cards/:cardId/comments - Get all comments for a card
router.get('/:cardId/comments', authenticate, async (req, res, next) => {
  try {
    const { cardId } = req.params

    const comments = await Comment.find({ cardId })
      .populate('authorId', 'username email')
      .sort({ createdAt: 1 })

    res.json(comments)
  } catch (err) {
    next(err)
  }
})

// POST /api/cards/:cardId/comments - Add a new comment to a card
router.post('/:cardId/comments', authenticate, authorizeBoardRole(['owner', 'member']), async (req, res, next) => {
  try {
    const { cardId } = req.params
    const { text } = req.body

    if (!text || !text.trim()) {
      const err = new Error('Comment text is required')
      err.status = 400
      return next(err)
    }

    const card = await Card.findById(cardId)
    if (!card) {
      const err = new Error('Card not found')
      err.status = 404
      return next(err)
    }

    const comment = await Comment.create({
      cardId,
      authorId: req.user.id,
      text: text.trim()
    })

    const populatedComment = await Comment.findById(comment._id).populate('authorId', 'username email')

    // Find list and board for notification link & board owner
    const list = await List.findById(card.listId)
    const board = list ? await Board.findById(list.boardId) : null
    const boardId = board ? board._id : null

    // Collect all recipients: board owner + assigned members (except commenter)
    const recipientSet = new Set()

    if (board && board.ownerId) {
      recipientSet.add(board.ownerId.toString())
    }

    if (card.assignedMembers && card.assignedMembers.length > 0) {
      for (const m of card.assignedMembers) {
        recipientSet.add(m.toString())
      }
    }

    // Exclude commenter
    recipientSet.delete(req.user.id.toString())

    // Trigger Notifications
    for (const recipientId of recipientSet) {
      await createNotification({
        recipientId,
        senderId: req.user.id,
        type: 'CARD_COMMENT',
        title: 'New Card Comment',
        message: `${req.user.username || 'A team member'} commented on "${card.title}": "${text.trim().slice(0, 40)}..."`,
        link: boardId ? `/board/${boardId}` : ''
      })
    }

    res.status(201).json(populatedComment)
  } catch (err) {
    next(err)
  }
})

// DELETE /api/comments/:commentId - Delete a comment
router.delete('/comments/:commentId', authenticate, authorizeBoardRole(['owner', 'member']), async (req, res, next) => {
  try {
    const { commentId } = req.params

    const comment = await Comment.findById(commentId)
    if (!comment) {
      const err = new Error('Comment not found')
      err.status = 404
      return next(err)
    }

    // Only comment author can delete comment
    if (comment.authorId.toString() !== req.user.id.toString()) {
      const err = new Error('Not authorized to delete this comment')
      err.status = 403
      return next(err)
    }

    await Comment.findByIdAndDelete(commentId)
    res.json({ message: 'Comment deleted successfully' })
  } catch (err) {
    next(err)
  }
})

module.exports = router
