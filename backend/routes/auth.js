const express = require('express')
const bcrypt  = require('bcryptjs')
const jwt     = require('jsonwebtoken')
const User    = require('../models/User')

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET

//-------------------------------------------------Registration of a new user --------------------------------------------------------
router.post('/register', async(req, res, next) => {
    try{
        
        const {username, email, password} = req.body

        // basic validation
        if(!username || !email || !password){
            const err = new Error('All fields are required')
            err.status = 400
            return next(err)
        }

        // check if email already exists
        const existingEmail = await User.findOne({email})
        if(existingEmail){
            const err = new Error('Email already in use')
            err.status = 400
            return next(err)
        }

        // check username
        const existingUsername = await User.findOne({username})
        if(existingUsername){
            const err = new Error('Username already exists')
            err.status = 400
            return next(err)
        }

        // hash the passwords
        const passwordHash = await bcrypt.hash(password, 10)

        // creating the user object
        const user = await User.create({username, email, passwordHash})

        // response (never send passwordHash back)
        res.status(201).json({
            id: user._id.toString(),
            username: user.username,
            email: user.email
        })

    } catch(err){
        next(err)
    }
})

// --------------------------------------------- login -----------------------------------------------------

router.post('/login', async (req, res, next) => {
    try{

        const {identifier, password} = req.body

        // find user by email or username
        const user = await User.findOne({
            $or: [{email: identifier}, {username: identifier}]
        })
        if(!user){
            const err = new Error('Invalid Credentials')
            err.status = 401
            return next(err)
        }

        // comparig password with stored hash
        const isMatch = await bcrypt.compare(password, user.passwordHash)
        if(!isMatch){
            const err = new Error('Invalid Credentials')
            err.status = 401
            return next(err)
        }

        // Generate JWT
        const token = jwt.sign(
            {id: user.id.toString(), username: user.username},
            JWT_SECRET,
            {expiresIn: '7d'}
        )

        //sending token back
        res.json({token, user: {id: user.id.toString(), username: user.username}})

    } catch(err){
        next(err)
    }
})

module.exports = router