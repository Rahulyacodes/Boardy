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
  position: {
    type: Number,
    required: true
  },
  listId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'List',     
    required: true
  }
}, { timestamps: true })

module.exports = mongoose.model('Card', cardSchema)