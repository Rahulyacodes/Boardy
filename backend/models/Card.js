const mongoose = require('mongoose')

const cardSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''       
  },
  completed: {
    type: Boolean,
    default: false
  },
  position: {
    type: Number,
    required: true
  },
  listId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'List',     
    required: true
  },
  labels: [
    {
      name: { type: String, default: '' },
      color: { type: String, required: true }
    }
  ],
  dueDate: {
    type: String,
    default: ''
  },
  checklist: [
    {
      title: { type: String, required: true },
      completed: { type: Boolean, default: false }
    }
  ],
  checklists: [
    {
      title: { type: String, default: 'Checklist' },
      items: [
        {
          title: { type: String, required: true },
          completed: { type: Boolean, default: false }
        }
      ]
    }
  ],
  assignedMembers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  ],
  attachments: [
    {
      title: { type: String, default: '' },
      url: { type: String, required: true },
      createdAt: { type: Date, default: Date.now }
    }
  ]
}, { timestamps: true })

module.exports = mongoose.model('Card', cardSchema)