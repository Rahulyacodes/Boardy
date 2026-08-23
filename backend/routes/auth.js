const express = require('express')
const bcrypt  = require('bcryptjs')
const jwt     = require('jsonwebtoken')
const User    = require('../models/User')
const authenticate = require('../middleware/authenticate')

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
        const otpExpires = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes expiry

        user.resetOtp = otp
        user.resetOtpExpires = otpExpires
        await user.save()

        // HTML Email Template for PrimeTeam
        const emailHtml = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; background-color: #0D0D12; padding: 40px 24px; color: #FFFFFF; border-radius: 20px;">
                <!-- Header / Brand -->
                <div style="text-align: center; margin-bottom: 32px;">
                    <div style="display: inline-block; width: 52px; height: 52px; background: linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%); border-radius: 14px; line-height: 52px; color: #ffffff; font-weight: 800; font-size: 24px; margin-bottom: 12px; box-shadow: 0 8px 20px rgba(139, 92, 246, 0.35);">
                        P
                    </div>
                    <h1 style="color: #FFFFFF; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">PrimeTeam</h1>
                    <p style="color: #94A3B8; font-size: 13px; margin-top: 4px; font-weight: 500; letter-spacing: 0.5px; text-transform: uppercase;">Account Security Notification</p>
                </div>

                <!-- Main Content Card -->
                <div style="background-color: #161622; border: 1px solid #28283A; border-radius: 16px; padding: 32px 28px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                    <p style="color: #F1F5F9; font-size: 16px; font-weight: 600; margin-top: 0; margin-bottom: 12px;">Hello ${user.name || user.username},</p>
                    <p style="color: #94A3B8; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
                        We received a request to reset the password for your <strong>PrimeTeam</strong> account (<code>${user.email}</code>). Use your 6-digit verification security code below to complete this process:
                    </p>

                    <!-- OTP Code Badge (Mobile Responsive & Centered) -->
                    <div style="text-align: center; margin: 28px 0; width: 100%;">
                        <div style="display: inline-block; background: #201833; border: 1.5px solid #8B5CF6; border-radius: 14px; padding: 14px 20px; max-width: 100%; box-sizing: border-box;">
                            <span style="font-family: 'Courier New', Courier, monospace; font-size: 28px; font-weight: 800; letter-spacing: 6px; color: #A78BFA; display: inline-block; margin-right: -6px;">${otp}</span>
                        </div>
                        <p style="color: #94A3B8; font-size: 13px; margin-top: 14px; font-weight: 500;">
                            ⏱️ This code will expire in <strong style="color: #F3F4F6;">5 minutes</strong>
                        </p>
                    </div>

                    <!-- Security Warning Callout -->
                    <div style="background-color: #1E1B2E; border-left: 4px solid #8B5CF6; border-radius: 8px; padding: 14px 16px; margin-top: 24px;">
                        <p style="color: #E2E8F0; font-size: 13px; margin: 0; line-height: 1.5;">
                            🔒 <strong>Security Warning:</strong> PrimeTeam will never ask you for this code. Do not share this 6-digit code with anyone.
                        </p>
                    </div>

                    <p style="color: #64748B; font-size: 13px; line-height: 1.5; margin-top: 24px; margin-bottom: 0;">
                        If you did not request a password reset, please ignore this email or contact <a href="mailto:primeteam.security@gmail.com" style="color: #A78BFA; text-decoration: none; font-weight: 500;">PrimeTeam Security</a> immediately.
                    </p>
                </div>

                <!-- Footer -->
                <div style="text-align: center; margin-top: 32px; border-top: 1px solid #1E1E2E; padding-top: 20px;">
                    <p style="color: #64748B; font-size: 12px; margin: 0;">© 2026 PrimeTeam Technologies Inc. All rights reserved.</p>
                    <p style="color: #475569; font-size: 11px; margin-top: 6px;">Automated security transmission — Please do not reply directly to this message.</p>
                </div>
            </div>
        `

        await sendEmail({
            to: user.email,
            subject: 'PrimeTeam - Password Reset Verification Code',
            html: emailHtml,
            text: `Your PrimeTeam password reset OTP code is: ${otp}. Valid for 5 minutes. Do not share this code with anyone.`
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

        if (newPassword.length < 8) {
            const err = new Error('Password must be at least 8 characters long')
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

//------------------------------------------------- Update User Profile --------------------------------------------------------
// PUT /api/auth/profile
router.put('/profile', authenticate, async (req, res, next) => {
    try {
        const { name, username, avatar } = req.body
        const user = await User.findById(req.user.id)

        if (!user) {
            const err = new Error('User not found')
            err.status = 404
            return next(err)
        }

        // If username is changing, verify availability
        if (username && username.trim() !== user.username) {
            const existingUsername = await User.findOne({ username: username.trim() })
            if (existingUsername) {
                const err = new Error('Username is already taken')
                err.status = 400
                return next(err)
            }
            user.username = username.trim()
        }

        if (name !== undefined) user.name = name.trim()
        if (avatar !== undefined) user.avatar = avatar.trim()

        await user.save()

        res.json({
            message: 'Profile updated successfully!',
            user: {
                id: user._id,
                _id: user._id,
                name: user.name,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                googleId: user.googleId,
                hasPassword: !!user.passwordHash,
                createdAt: user.createdAt
            }
        })
    } catch (err) {
        next(err)
    }
})

//------------------------------------------------- Change Password (Logged-In) --------------------------------------------------------
// PUT /api/auth/change-password
router.put('/change-password', authenticate, async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body
        const user = await User.findById(req.user.id)

        if (!user) {
            const err = new Error('User not found')
            err.status = 404
            return next(err)
        }

        if (!newPassword || newPassword.length < 6) {
            const err = new Error('New password must be at least 6 characters long')
            err.status = 400
            return next(err)
        }

        // If user already has a password, verify current password
        if (user.passwordHash) {
            if (!currentPassword) {
                const err = new Error('Current password is required')
                err.status = 400
                return next(err)
            }
            const isMatch = await bcrypt.compare(currentPassword, user.passwordHash)
            if (!isMatch) {
                const err = new Error('Current password is incorrect')
                err.status = 400
                return next(err)
            }
        }

        // Hash & save new password
        const salt = await bcrypt.genSalt(10)
        user.passwordHash = await bcrypt.hash(newPassword, salt)
        await user.save()

        res.json({ message: 'Password updated successfully!' })
    } catch (err) {
        next(err)
    }
})

module.exports = router