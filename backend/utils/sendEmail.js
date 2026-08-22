const nodemailer = require('nodemailer')

/**
 * Utility to send emails via Nodemailer
 * Supports Gmail App Passwords, custom SMTP, or fallback Ethereal test accounts.
 */
const sendEmail = async ({ to, subject, html, text }) => {
  let transporter

  // Check if real SMTP credentials exist in environment variables
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    })
  } else {
    // Development fallback: Use Nodemailer Ethereal auto-generated test SMTP account
    const testAccount = await nodemailer.createTestAccount()
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    })
  }

  const mailOptions = {
    from: `"PrimeTeam Security" <${process.env.EMAIL_USER || 'security@primeteam.com'}>`,
    to,
    subject,
    text: text || '',
    html: html || ''
  }

  const info = await transporter.sendMail(mailOptions)

  // If using test account, log preview URL for easy local testing
  if (!process.env.EMAIL_USER) {
    console.log('----------------------------------------------------')
    console.log('📧 [DEV EMAIL] Sent via Ethereal Test Account!')
    console.log(`🔗 Preview URL: ${nodemailer.getTestMessageUrl(info)}`)
    console.log('----------------------------------------------------')
  }

  return info
}

module.exports = sendEmail
