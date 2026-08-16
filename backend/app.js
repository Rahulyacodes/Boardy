require('dotenv').config() 
const express = require('express')
const morgan = require('morgan')
// const { authorizeBoard } = require('./middleware/authorize')
const cors = require('cors')


const app = express()

// global middlewares
app.use(morgan('dev')) // logs every req to the terminal
app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())   // parses incoming request body as JSON, puts it on req.body
app.use(express.static('public')) // serves your HTML/CSS/JS frontend

app.use('/api/auth',   require('./routes/auth'))
app.use('/api/boards', require('./routes/boards'))
app.use('/api/boards',  require('./routes/lists'))
app.use('/api/lists',  require('./routes/cards'))
app.use('/api/cards',  require('./routes/cards'))
app.use('/api/search', require('./routes/search'))

console.log('routes are being registered')

//test auth middleware
const authenticate = require('./middleware/authenticate')
app.get('/api/test-auth', authenticate, (req, res) => {
    res.json({message : `hello ${req.user.username}, your id is ${req.user.id}`})
})


// --- global error handler (always last) ---
app.use(require('./middleware/errorHandler'))

module.exports = app
