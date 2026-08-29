// server.js
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })
const http = require('http')
const { Server } = require('socket.io')
const mongoose = require('mongoose')
const app = require('./app')

const PORT = process.env.PORT || 5000

const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
})

// Store io instance on app for route access
app.set('io', io)

io.on('connection', (socket) => {
  // Join a board room
  socket.on('join_board', (boardId) => {
    if (boardId) {
      socket.join(`board:${boardId}`)
    }
  })

  // Leave a board room
  socket.on('leave_board', (boardId) => {
    if (boardId) {
      socket.leave(`board:${boardId}`)
    }
  })
})

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

if (process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection failed:', err))
}