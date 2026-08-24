const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    passwordHash: {
        type: String,
        required: function() {
            // Password is only required if this is not a Google OAuth account
            return !this.googleId
        }
    },
    name: {
        type: String,
        trim: true
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true
    },
    avatar: {
        type: String
    },
    resetOtp: {
        type: String,
        default: null
    },
    resetOtpExpires: {
        type: Date,
        default: null
    },
    loginOtp: {
        type: String,
        default: null
    },
    loginOtpExpires: {
        type: Date,
        default: null
    },
    pendingNewEmail: {
        type: String,
        default: null
    },
    emailChangeOtp: {
        type: String,
        default: null
    },
    emailChangeOtpExpires: {
        type: Date,
        default: null
    }
}, {timestamps: true})

module.exports = mongoose.model('User', userSchema)