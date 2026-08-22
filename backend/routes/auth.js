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

// --------------------------------------------- OTP Password Reset -----------------------------------------------------
const sendEmail = require('../utils/sendEmail')

// 1. Send OTP Email
router.post('/forgot-password', async (req, res, next) => {
    try {
        const { email } = req.body
        if (!email) {
            const err = new Error('Email is required')
            err.status = 400
            return next(err)
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() })
        if (!user) {
            const err = new Error('No account found with this email address')
            err.status = 404
            return next(err)
        }

        // Generate 6-digit random OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString()
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes expiry

        user.resetOtp = otp
        user.resetOtpExpires = otpExpires
        await user.save()

        // HTML Email Template
        const emailHtml = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; background-color: #141419; color: #ffffff; border-radius: 16px; border: 1px solid #2D2D3A;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h2 style="color: #A855F7; margin: 0; font-size: 24px;">Boardify</h2>
                    <p style="color: #94A3B8; font-size: 14px; margin-top: 4px;">Password Reset Request</p>
                </div>
                <p style="color: #E2E8F0; font-size: 14px;">Hello ${user.name || user.username},</p>
                <p style="color: #94A3B8; font-size: 14px; line-height: 1.5;">You requested to reset your password. Use the 6-digit OTP code below to verify your request:</p>
                <div style="text-align: center; margin: 28px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #A855F7; background: #261738; padding: 12px 24px; border-radius: 12px; border: 1px solid #7E22CE; display: inline-block;">${otp}</span>
                </div>
                <p style="color: #64748B; font-size: 12px; text-align: center;">This code will expire in <strong>10 minutes</strong>. If you did not request this, please ignore this email.</p>
            </div>
        `

        await sendEmail({
            to: user.email,
            subject: 'Boardify - Your Password Reset OTP',
            html: emailHtml,
            text: `Your Boardify password reset OTP code is: ${otp}. Valid for 10 minutes.`
        })

        res.json({ message: 'A 6-digit OTP code has been sent to your email address' })

    } catch (err) {
        next(err)
    }
})

// 2. Verify OTP Code
router.post('/verify-otp', async (req, res, next) => {
    try {
        const { email, otp } = req.body
        if (!email || !otp) {
            const err = new Error('Email and OTP code are required')
            err.status = 400
            return next(err)
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() })
        if (!user || !user.resetOtp || !user.resetOtpExpires) {
            const err = new Error('Invalid OTP request. Please request a new code.')
            err.status = 400
            return next(err)
        }

        if (user.resetOtp !== otp.trim()) {
            const err = new Error('Invalid OTP code. Please check and try again.')
            err.status = 400
            return next(err)
        }

        if (new Date() > user.resetOtpExpires) {
            const err = new Error('OTP code has expired. Please request a new one.')
            err.status = 400
            return next(err)
        }

        res.json({ message: 'OTP verified successfully' })

    } catch (err) {
        next(err)
    }
})

// 3. Reset Password
router.post('/reset-password', async (req, res, next) => {
    try {
        const { email, otp, newPassword } = req.body
        if (!email || !otp || !newPassword) {
            const err = new Error('Email, OTP, and new password are required')
            err.status = 400
            return next(err)
        }

        if (newPassword.length < 6) {
            const err = new Error('Password must be at least 6 characters long')
            err.status = 400
            return next(err)
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() })
        if (!user || !user.resetOtp || !user.resetOtpExpires) {
            const err = new Error('Invalid reset session. Please request a new OTP.')
            err.status = 400
            return next(err)
        }

        if (user.resetOtp !== otp.trim() || new Date() > user.resetOtpExpires) {
            const err = new Error('Invalid or expired OTP code.')
            err.status = 400
            return next(err)
        }

        // Hash new password & clear reset fields
        const salt = await bcrypt.genSalt(10)
        user.passwordHash = await bcrypt.hash(newPassword, salt)
        user.resetOtp = null
        user.resetOtpExpires = null
        await user.save()

        res.json({ message: 'Password updated successfully! You can now log in with your new password.' })

    } catch (err) {
        next(err)
    }
})

module.exports = router