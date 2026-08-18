const mongoose = require('mongoose')

const notificationSchema = new mongoose.Schema({
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    enum: ['BOARD_INVITE', 'CARD_ASSIGNMENT', 'CARD_COMMENT', 'ROLE_CHANGE', 'MEMBER_REMOVED', 'GENERAL'],
    default: 'GENERAL'
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  link: {
    type: String,
    default: ''
  },
  read: {
    type: Boolean,
    default: false,
    index: true
  }
}, { timestamps: true })

module.exports = mongoose.model('Notification', notificationSchema)
