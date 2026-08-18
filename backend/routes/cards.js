// routes/cards.js
const express      = require('express')
const Card         = require('../models/Card')
const List         = require('../models/List')
const authenticate = require('../middleware/authenticate')
const { authorizeList, authorizeCard } = require('../middleware/authorize')
const authorizeBoardRole = require('../middleware/checkBoardRole')

const router = express.Router()

// ---------------------------------------- create card ----------------------------------------
// POST /api/lists/:listId/cards
router.post('/:listId/cards', authenticate, authorizeList, authorizeBoardRole(['owner', 'member']), async (req, res, next) => {
  try {
    const { title, description } = req.body
    const listId = req.params.listId

    if (!title) {
      const err = new Error('Title is required')
      err.status = 400
      return next(err)
    }

    // figure out position
    const listCards    = await Card.find({ listId })
    const lastPosition = listCards.length > 0
      ? Math.max(...listCards.map(c => c.position))
      : 0

    const card = await Card.create({
      title,
      description: description || '',
      position: lastPosition + 1,
      listId
    })

    res.status(201).json(card)

  } catch (err) {
    next(err)
  }
})

// ---------------------------------------- edit card ----------------------------------------
// PATCH /api/cards/:cardId
router.patch('/:cardId', authenticate, authorizeCard, authorizeBoardRole(['owner', 'member']), async (req, res, next) => {
  try {
    const { title, description, labels, dueDate, checklist, assignedMembers } = req.body

    const updates = {}
    if (title !== undefined)           updates.title           = title
    if (description !== undefined)     updates.description     = description
    if (labels !== undefined)          updates.labels          = labels
    if (dueDate !== undefined)         updates.dueDate         = dueDate
    if (checklist !== undefined)       updates.checklist       = checklist
    if (assignedMembers !== undefined) updates.assignedMembers = assignedMembers

    const updated = await Card.findByIdAndUpdate(
      req.card._id,
      updates,
      { new: true }
    ).populate('assignedMembers', 'username email')

    // Trigger Notification for newly assigned members
    if (assignedMembers !== undefined && Array.isArray(assignedMembers)) {
      const { createNotification } = require('../utils/notify')
      const existingMemberIds = (req.card.assignedMembers || []).map(m => m.toString())

      for (const memberId of assignedMembers) {
        if (!existingMemberIds.includes(memberId.toString())) {
          await createNotification({
            recipientId: memberId,
            senderId: req.user.id,
            type: 'CARD_ASSIGNMENT',
            title: 'Task Assigned',
            message: `${req.user.username || 'A team member'} assigned you to card "${updated.title}"`,
            link: `/board/${req.board._id}`
          })
        }
      }
    }

    res.json(updated)

  } catch (err) {
    next(err)
  }
})

// ---------------------------------------- move card ----------------------------------------
// PATCH /api/cards/:cardId/move
router.patch('/:cardId/move', authenticate, authorizeCard, authorizeBoardRole(['owner', 'member']), async (req, res, next) => {
  try {
    const { newListId } = req.body

    if (!newListId) {
      const err = new Error('newListId is required')
      err.status = 400
      return next(err)
    }

    // check destination list exists
    const destinationList = await List.findById(newListId)
    if (!destinationList) {
      const err = new Error('Destination list not found')
      err.status = 404
      return next(err)
    }

    // check destination list is on the same board
    if (destinationList.boardId.toString() !== req.board._id.toString()) {
      const err = new Error('Cannot move card to a different board')
      err.status = 400
      return next(err)
    }

    // figure out position in destination list
    const destinationCards = await Card.find({ listId: newListId })
    const lastPosition     = destinationCards.length > 0
      ? Math.max(...destinationCards.map(c => c.position))
      : 0

    // update card with new listId and position
    const updated = await Card.findByIdAndUpdate(
      req.card._id,
      { listId: newListId, position: lastPosition + 1 },
      { new: true }
    )

    res.json(updated)

  } catch (err) {
    next(err)
  }
})

// ---------------------------------------- delete card ----------------------------------------
// DELETE /api/cards/:cardId
router.delete('/:cardId', authenticate, authorizeCard, authorizeBoardRole(['owner', 'member']), async (req, res, next) => {
  try {
    await Card.findByIdAndDelete(req.card._id)
    res.json({ message: 'Card deleted' })
  } catch (err) {
    next(err)
  }
})

module.exports = router
