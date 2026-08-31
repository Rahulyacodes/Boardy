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
        enum: ['owner', 'member', 'viewer'],  
        default: 'member'
      },
      status: {
        type: String,
        enum: ['pending', 'accepted', 'declined'],
        default: 'accepted'
      }
    }
  ],
  background: {
    type: String,
    default: 'url("/Backgrounds_PrimeTeam/City/jahanzeb-ahsan-UZGKXvsmuJA-unsplash.jpg")'
  },
  isStarred: {
    type: Boolean,
    default: false
  },
  inviteToken: {
    type: String,
    unique: true,
    sparse: true
  }
}, { timestamps: true })

module.exports = mongoose.model('Board', boardSchema)