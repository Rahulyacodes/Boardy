const mongoose = require('mongoose')

const boardSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,  
    ref: 'User',                           
    required: true
  },
  members: [         
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      role: {
        type: String,
        enum: ['owner', 'member'],  
        default: 'member'
      }
    }
  ],
  background: {
    type: String,
    default: 'linear-gradient(135deg, #1E1E24, #2A2A38)'
  },
  isStarred: {
    type: Boolean,
    default: false
  }
}, { timestamps: true })

module.exports = mongoose.model('Board', boardSchema)