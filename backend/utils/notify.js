const Notification = require('../models/Notification')

/**
 * Modular helper to create notifications easily anywhere in the backend.
 * @param {Object} options
 * @param {string} options.recipientId - Target User ID receiving notification
 * @param {string} [options.senderId] - Triggering User ID
 * @param {string} [options.type] - Notification type category
 * @param {string} options.title - Short title header
 * @param {string} options.message - Detailed message body
 * @param {string} [options.link] - Frontend route path to navigate on click
 */
async function createNotification({ recipientId, senderId, type = 'GENERAL', title, message, link = '' }) {
  try {
    // Don't notify oneself
    if (senderId && recipientId.toString() === senderId.toString()) {
      return null
    }

    const notification = await Notification.create({
      recipientId,
      senderId,
      type,
      title,
      message,
      link,
      read: false
    })

    return notification
  } catch (err) {
    console.error('Error creating notification:', err)
    return null
  }
}

module.exports = { createNotification }
