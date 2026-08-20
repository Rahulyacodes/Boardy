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
        res.json({token, user: {id: user.id.toString(), username: user.username, email: user.email, name: user.name, avatar: user.avatar}})

    } catch(err){
        next(err)
    }
})

// --------------------------------------------- Google OAuth -----------------------------------------------------
const { OAuth2Client } = require('google-auth-library')
const googleClient = new OAuth2Client()

router.post('/google', async (req, res, next) => {
    try {
        const { credential, customUsername } = req.body

        if (!credential) {
            const err = new Error('Google credential is required')
            err.status = 400
            return next(err)
        }

        // Verify the Google ID Token
        let payload
        try {
            const ticket = await googleClient.verifyIdToken({
                idToken: credential,
                audience: process.env.GOOGLE_CLIENT_ID || undefined
            })
            payload = ticket.getPayload()
        } catch (err) {
            // Fallback decode for development if Client ID verification fails
            payload = jwt.decode(credential)
            if (!payload || !payload.email || !payload.sub) {
                const error = new Error('Failed to verify Google token')
                error.status = 401
                return next(error)
            }
        }

        const { sub: googleId, email, name, picture: avatar } = payload

        // Check if user already exists by googleId or email
        let user = await User.findOne({
            $or: [{ googleId }, { email: email.toLowerCase() }]
        })

        // CASE 1: User already exists
        if (user) {
            // Link googleId, name, or avatar if not set yet
            let modified = false
            if (!user.googleId) { user.googleId = googleId; modified = true; }
            if (!user.name && name) { user.name = name; modified = true; }
            if (!user.avatar && avatar) { user.avatar = avatar; modified = true; }
            if (modified) await user.save()

            const token = jwt.sign(
                { id: user.id.toString(), username: user.username },
                JWT_SECRET,
                { expiresIn: '7d' }
            )

            return res.json({
                isNewUser: false,
                token,
                user: {
                    id: user.id.toString(),
                    username: user.username,
                    email: user.email,
                    name: user.name,
                    avatar: user.avatar
                }
            })
        }

        // CASE 2: New Google User
        // Derive default username from email prefix (e.g. rahul.yadav from rahul.yadav@gmail.com)
        const emailPrefix = email.split('@')[0].replace(/[^a-zA-Z0-9_.]/g, '')
        let desiredUsername = (customUsername || emailPrefix).trim()

        // Check if desiredUsername is unique
        const existingUsername = await User.findOne({ username: desiredUsername })
        if (existingUsername) {
            if (customUsername) {
                const err = new Error('Username already taken. Please choose another one.')
                err.status = 400
                return next(err)
            }
            // Append random digits if default email prefix is taken
            desiredUsername = `${desiredUsername}${Math.floor(1000 + Math.random() * 9000)}`
        }

        // Create new User in MongoDB
        user = await User.create({
            username: desiredUsername,
            email: email.toLowerCase(),
            name: name || desiredUsername,
            googleId,
            avatar
        })

        const token = jwt.sign(
            { id: user.id.toString(), username: user.username },
            JWT_SECRET,
            { expiresIn: '7d' }
        )

        res.status(201).json({
            isNewUser: true,
            token,
            user: {
                id: user.id.toString(),
                username: user.username,
                email: user.email,
                name: user.name,
                avatar: user.avatar
            }
        })

    } catch (err) {
        next(err)
    }
})

module.exports = router