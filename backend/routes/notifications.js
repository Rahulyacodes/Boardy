const express = require('express')
const router = express.Router()
const Notification = require('../models/Notification')
const authenticate = require('../middleware/authenticate')

// GET /api/notifications - Get all notifications for current logged in user
router.get('/', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id

    const notifications = await Notification.find({ recipientId: userId })
      .populate('senderId', 'username email')
      .sort({ createdAt: -1 })
      .limit(30)

    const unreadCount = await Notification.countDocuments({ recipientId: userId, read: false })

    res.json({ notifications, unreadCount })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/notifications/:id/read - Mark single notification as read
router.patch('/:id/read', authenticate, async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientId: req.user.id },
      { read: true },
      { new: true }
    )

    if (!notification) {
      const err = new Error('Notification not found')
      err.status = 404
      return next(err)
    }

    res.json(notification)
  } catch (err) {
    next(err)
  }
})

// PATCH /api/notifications/read-all - Mark all notifications as read for current user
router.patch('/read-all', authenticate, async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipientId: req.user.id, read: false },
      { read: true }
    )

    res.json({ message: 'All notifications marked as read' })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/notifications/:id - Delete a notification
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, recipientId: req.user.id })
    res.json({ message: 'Notification deleted' })
  } catch (err) {
    next(err)
  }
})

module.exports = router
