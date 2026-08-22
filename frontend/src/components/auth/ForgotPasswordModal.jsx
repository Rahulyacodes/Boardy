import { useState, useEffect } from 'react'
import { forgotPassword, verifyOtp, resetPassword } from '../../api'

function ForgotPasswordModal({ isOpen, onClose }) {
  const [step, setStep] = useState(1) // 1: Email, 2: OTP, 3: New Password, 4: Success
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [timeLeft, setTimeLeft] = useState(300) // 5 minutes in seconds
  const [resendCooldown, setResendCooldown] = useState(120) // 2 minutes cooldown (120 seconds)

  // Live 5-Minute Countdown Timer for OTP Expiry
  useEffect(() => {
    let timerId
    if (isOpen && step === 2 && timeLeft > 0) {
      timerId = setInterval(() => {
        setTimeLeft(prev => prev - 1)
      }, 1000)
    }
    return () => clearInterval(timerId)
  }, [isOpen, step, timeLeft])

  // Live 2-Minute Countdown Timer for Resend Button Cooldown
  useEffect(() => {
    let timerId
    if (isOpen && step === 2 && resendCooldown > 0) {
      timerId = setInterval(() => {
        setResendCooldown(prev => prev - 1)
      }, 1000)
    }
    return () => clearInterval(timerId)
  }, [isOpen, step, resendCooldown])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (!isOpen) return null

  // Step 1: Send OTP
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault()
    if (!email.trim()) return
    setError('')
    setMessage('')
    setLoading(true)

    try {
      const res = await forgotPassword({ email: email.trim() })
      setMessage(res.data.message || 'OTP sent successfully!')
      setTimeLeft(300) // Reset 5-minute expiry
      setResendCooldown(120) // Reset 2-minute resend cooldown
      setStep(2)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP email. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    if (!otp.trim() || otp.trim().length !== 6) {
      setError('Please enter a valid 6-digit OTP code')
      return
    }
    setError('')
    setMessage('')
    setLoading(true)

    try {
      await verifyOtp({ email: email.trim(), otp: otp.trim() })
      setMessage('OTP verified! Enter your new password below.')
      setStep(3)
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired OTP code.')
    } finally {
      setLoading(false)
    }
  }

  // Step 3: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (newPassword.length < 6) {
      setError('Password must be at least 8 characters long')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setError('')
    setMessage('')
    setLoading(true)

    try {
      const res = await resetPassword({
        email: email.trim(),
        otp: otp.trim(),
        newPassword
      })
      setMessage(res.data.message || 'Password reset successfully!')
      setStep(4)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setStep(1)
    setEmail('')
    setOtp('')
    setNewPassword('')
    setConfirmPassword('')
    setError('')
    setMessage('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md p-6 rounded-2xl bg-bg-surface border border-bg-border shadow-2xl shadow-black/80 relative text-text-primary">
        
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-text-muted hover:text-white hover:bg-bg-border/40 transition-colors cursor-pointer"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-accent-purple/20 border border-accent-purple/40 flex items-center justify-center text-accent-purple mx-auto mb-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white">
            {step === 1 && 'Forgot Password'}
            {step === 2 && 'Enter 6-Digit OTP'}
            {step === 3 && 'Set New Password'}
            {step === 4 && 'Password Reset Complete!'}
          </h2>
          <p className="text-xs text-text-muted mt-1">
            {step === 1 && 'Enter your account email address to receive an OTP'}
            {step === 2 && `We sent a 6-digit code to ${email}`}
            {step === 3 && 'Choose a new password for your account'}
            {step === 4}
          </p>
        </div>

        {/* Feedback Banner */}
        {error && (
          <div className="mb-4 p-3 rounded-xl text-xs font-medium bg-danger/10 border border-danger/30 text-danger flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>{error}</span>
          </div>
        )}

        {message && step !== 4 && (
          <div className="mb-4 p-3 rounded-xl text-xs font-medium bg-accent-purple/10 border border-accent-purple/30 text-accent-purple flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>{message}</span>
          </div>
        )}

        {/* STEP 1: Enter Email */}
        {step === 1 && (
          <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="w-full px-4 py-3 rounded-xl bg-bg-primary border border-bg-border text-text-primary text-sm placeholder:text-text-muted/40 focus:outline-none focus:border-accent-purple focus:ring-1 focus:ring-accent-purple"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white bg-accent-purple hover:bg-accent-purple-hover active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-accent-purple/20"
            >
              {loading ? (
                <span>Sending OTP...</span>
              ) : (
                'Send 6-Digit OTP'
              )}
            </button>
          </form>
        )}

        {/* STEP 2: Enter OTP */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  6-Digit Security OTP
                </label>
                {/* Live Countdown Badge */}
                <div className={`text-xs font-medium px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
                  timeLeft > 0 
                    ? 'bg-accent-purple/10 border-accent-purple/30 text-accent-purple' 
                    : 'bg-danger/10 border-danger/30 text-danger'
                }`}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  <span>{timeLeft > 0 ? `OTP expires in ${formatTime(timeLeft)}` : 'OTP Expired'}</span>
                </div>
              </div>

              <input
                type="text"
                maxLength="6"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="123456"
                disabled={timeLeft === 0}
                required
                className="w-full px-4 py-3 text-center text-2xl font-bold tracking-[0.5em] rounded-xl bg-bg-primary border border-bg-border text-accent-purple placeholder:text-text-muted/20 focus:outline-none focus:border-accent-purple focus:ring-1 focus:ring-accent-purple disabled:opacity-50 disabled:cursor-not-allowed"
              />

              {timeLeft === 0 ? (
                <div className="text-center p-2 rounded-xl bg-danger/10 border border-danger/20">
                  <p className="text-xs text-danger font-medium mb-1.5">
                    This OTP code has expired.
                  </p>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={loading}
                    className="text-xs font-semibold text-accent-purple hover:underline cursor-pointer"
                  >
                    {loading ? 'Resending...' : 'Resend New OTP Code'}
                  </button>
                </div>
              ) : (
                <p className="text-[11px] text-text-muted text-center mt-0.5 leading-relaxed">
                  Didn't receive the email? Check spam folder or{' '}
                  {resendCooldown > 0 ? (
                    <span className="text-text-muted font-medium">
                      Resend in <strong className="text-accent-purple font-mono">{formatTime(resendCooldown)}</strong>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={loading}
                      className="text-accent-purple hover:underline font-medium cursor-pointer"
                    >
                      {loading ? 'Resending...' : 'Resend Code'}
                    </button>
                  )}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 py-3 px-3 rounded-xl text-xs font-semibold text-text-muted bg-bg-primary border border-bg-border hover:bg-bg-border/30 transition-all cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading || otp.length !== 6 || timeLeft === 0}
                className="w-2/3 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-accent-purple hover:bg-accent-purple-hover active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-accent-purple/20"
              >
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Set New Password */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                className="w-full px-4 py-3 rounded-xl bg-bg-primary border border-bg-border text-text-primary text-sm placeholder:text-text-muted/40 focus:outline-none focus:border-accent-purple focus:ring-1 focus:ring-accent-purple"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
                className="w-full px-4 py-3 rounded-xl bg-bg-primary border border-bg-border text-text-primary text-sm placeholder:text-text-muted/40 focus:outline-none focus:border-accent-purple focus:ring-1 focus:ring-accent-purple"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white bg-accent-purple hover:bg-accent-purple-hover active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-accent-purple/20"
            >
              {loading ? 'Updating Password...' : 'Reset Password'}
            </button>
          </form>
        )}

        {/* STEP 4: Success */}
        {step === 4 && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-accent-teal/20 border border-accent-teal/40 flex items-center justify-center text-accent-teal my-2">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <p className="text-sm text-text-muted">
              Your password has been changed successfully. You can now sign in with your new credentials.
            </p>
            <button
              onClick={handleClose}
              className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white bg-accent-purple hover:bg-accent-purple-hover transition-all shadow-lg shadow-accent-purple/20 cursor-pointer"
            >
              Back to Sign In
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

export default ForgotPasswordModal
