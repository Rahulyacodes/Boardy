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

    if (!title || !title.trim()) {
      const err = new Error('Title is required')
      err.status = 400
      return next(err)
    }

    const cleanTitle = title.trim()

    // Enforce card title uniqueness within the board (across all lists in this board)
    const boardLists = await List.find({ boardId: req.board._id })
    const boardListIds = boardLists.map(l => l._id)

    const existingCard = await Card.findOne({
      listId: { $in: boardListIds },
      title: { $regex: new RegExp(`^${cleanTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    })

    if (existingCard) {
      const err = new Error(`A card named "${cleanTitle}" already exists in this board.`)
      err.status = 400
      return next(err)
    }

    // figure out position
    const listCards    = await Card.find({ listId })
    const lastPosition = listCards.length > 0
      ? Math.max(...listCards.map(c => c.position))
      : 0

    const card = await Card.create({
      title: cleanTitle,
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
    const { title, description, completed, labels, dueDate, checklist, checklists, assignedMembers, attachments } = req.body

    const updates = {}
    if (title !== undefined && title.trim() !== '') {
      const cleanTitle = title.trim()
      if (cleanTitle !== req.card.title) {
        const boardLists = await List.find({ boardId: req.board._id })
        const boardListIds = boardLists.map(l => l._id)

        const existingCard = await Card.findOne({
          _id: { $ne: req.card._id },
          listId: { $in: boardListIds },
          title: { $regex: new RegExp(`^${cleanTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
        })

        if (existingCard) {
          const err = new Error(`A card named "${cleanTitle}" already exists in this board.`)
          err.status = 400
          return next(err)
        }
        updates.title = cleanTitle
      }
    }
    if (description !== undefined)     updates.description     = description
    if (completed !== undefined)       updates.completed       = completed
    if (labels !== undefined)          updates.labels          = labels
    if (dueDate !== undefined)         updates.dueDate         = dueDate
    if (checklist !== undefined)       updates.checklist       = checklist
    if (checklists !== undefined)      updates.checklists      = checklists
    if (assignedMembers !== undefined) updates.assignedMembers = assignedMembers
    if (attachments !== undefined)     updates.attachments     = attachments

    const updated = await Card.findByIdAndUpdate(
      req.card._id,
      updates,
      { new: true }
    ).populate('assignedMembers', 'name username email avatar')

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
    const { newListId, position } = req.body

    const targetListId = newListId || req.card.listId
    const destinationList = await List.findById(targetListId)
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

    const previousListId = req.card.listId
    const isSameList = previousListId.toString() === targetListId.toString()

    if (position !== undefined && !isNaN(Number(position))) {
      const targetPos = Math.max(1, Number(position))
      req.card.listId = targetListId
      req.card.position = targetPos
      await req.card.save()

      // Re-normalize positions of cards in destination list
      const targetCards = await Card.find({ listId: targetListId }).sort({ position: 1, updatedAt: -1 })
      let posCounter = 1
      for (const c of targetCards) {
        if (c._id.toString() === req.card._id.toString()) continue
        if (posCounter === targetPos) posCounter++
        if (c.position !== posCounter) {
          c.position = posCounter
          await c.save()
        }
        posCounter++
      }

      // If moved across lists, also re-normalize source list
      if (!isSameList) {
        const sourceCards = await Card.find({ listId: previousListId }).sort({ position: 1, updatedAt: -1 })
        for (let i = 0; i < sourceCards.length; i++) {
          if (sourceCards[i].position !== i + 1) {
            sourceCards[i].position = i + 1
            await sourceCards[i].save()
          }
        }
      }
    } else {
      // Fallback: append to bottom of destination list
      const destinationCards = await Card.find({ listId: targetListId })
      const lastPosition = destinationCards.length > 0 ? Math.max(...destinationCards.map(c => c.position)) : 0
      req.card.listId = targetListId
      req.card.position = lastPosition + 1
      await req.card.save()
    }

    const updated = await Card.findById(req.card._id).populate('assignedMembers', 'name username email avatar')
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
