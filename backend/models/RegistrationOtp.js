const mongoose = require('mongoose')

const registrationOtpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  username: {
    type: String,
    required: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  otp: {
    type: String,
    required: true
  },
  otpExpires: {
    type: Date,
    required: true
  }
}, { timestamps: true })

module.exports = mongoose.model('RegistrationOtp', registrationOtpSchema)

