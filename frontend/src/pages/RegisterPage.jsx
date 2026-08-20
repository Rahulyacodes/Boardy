// src/pages/RegisterPage.jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { register, login, googleLogin } from '../api'
import { useAuth } from '../context/AuthContext'

function RegisterPage() {
  const [form, setForm]       = useState({ username: '', email: '', password: '' })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  // Google OAuth states
  const [pendingGoogleCredential, setPendingGoogleCredential] = useState(null)
  const [newGoogleUser, setNewGoogleUser]                     = useState(null)
  const [customUsername, setCustomUsername]                   = useState('')
  const [usernameError, setUsernameError]                     = useState('')
  const [usernameLoading, setUsernameLoading]                 = useState(false)

  const { loginUser } = useAuth()
  const navigate      = useNavigate()

  // Single handler for all input fields
  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // 1. Register user
      await register(form)

      // 2. Auto-login immediately so user doesn't have to sign in manually
      const res = await login({ identifier: form.email, password: form.password })
      loginUser(res.data.user, res.data.token)
      navigate('/')

    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create account. Try again.')
    } finally {
      setLoading(false)
    }
  }

  // Handle Google Auth Response
  const handleGoogleSuccess = async (credentialResponse) => {
    setError('')
    setLoading(true)

    try {
      const res = await googleLogin({ credential: credentialResponse.credential })
      
      // If user is new, open username customization modal
      if (res.data.isNewUser) {
        setPendingGoogleCredential(credentialResponse.credential)
        setNewGoogleUser(res.data.user)
        setCustomUsername(res.data.user.username)
        loginUser(res.data.user, res.data.token)
      } else {
        loginUser(res.data.user, res.data.token)
        navigate('/')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Google Sign-Up failed')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmCustomUsername = async (e) => {
    e.preventDefault()
    if (!customUsername.trim()) return
    setUsernameError('')
    setUsernameLoading(true)

    try {
      const res = await googleLogin({
        credential: pendingGoogleCredential,
        customUsername: customUsername.trim()
      })
      loginUser(res.data.user, res.data.token)
      setNewGoogleUser(null)
      navigate('/')
    } catch (err) {
      setUsernameError(err.response?.data?.error || 'Failed to update username')
    } finally {
      setUsernameLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-bg-primary relative overflow-hidden">
      {/* Background glow accents matching LoginPage */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-accent-purple/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-accent-teal/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Card */}
      <div className="w-full max-w-md p-8 rounded-2xl bg-bg-surface border border-bg-border shadow-2xl shadow-black/50 backdrop-blur-xl relative z-10 flex flex-col gap-6">
        
        {/* Header / Logo */}
        <div className="text-center flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent-purple/20 border border-accent-purple/40 flex items-center justify-center text-accent-purple mb-1">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <rect x="7" y="7" width="3" height="9" rx="1"/>
              <rect x="14" y="7" width="3" height="5" rx="1"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Boardify</h1>
          <p className="text-sm text-text-muted">Create your workspace to get started</p>
        </div>

        {/* Error notification */}
        {error && (
          <div className="p-3.5 rounded-xl text-sm font-medium bg-danger/10 border border-danger/30 text-danger flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12"/>
              <line x1="12" y1="16" x2="12.01"/>
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          {/* Username Field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Username
            </label>
            <input
              type="text"
              name="username"
              value={form.username}
              onChange={handleChange}
              placeholder="alice"
              required
              className="w-full px-4 py-3 rounded-xl bg-bg-primary border border-bg-border text-text-primary text-sm placeholder:text-text-muted/40 focus:outline-none focus:border-accent-purple focus:ring-1 focus:ring-accent-purple transition-all duration-200"
            />
          </div>

          {/* Email Field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="alice@gmail.com"
              required
              className="w-full px-4 py-3 rounded-xl bg-bg-primary border border-bg-border text-text-primary text-sm placeholder:text-text-muted/40 focus:outline-none focus:border-accent-purple focus:ring-1 focus:ring-accent-purple transition-all duration-200"
            />
          </div>

          {/* Password Field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              className="w-full px-4 py-3 rounded-xl bg-bg-primary border border-bg-border text-text-primary text-sm placeholder:text-text-muted/40 focus:outline-none focus:border-accent-purple focus:ring-1 focus:ring-accent-purple transition-all duration-200"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-accent-purple hover:bg-accent-purple-hover active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-accent-purple/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Creating account...</span>
              </>
            ) : (
              'Create account'
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-1">
          <div className="flex-1 h-px bg-bg-border" />
          <span className="text-xs text-text-muted uppercase tracking-wider font-medium">or</span>
          <div className="flex-1 h-px bg-bg-border" />
        </div>

        {/* Official Google OAuth Component */}
        <div className="w-full flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Google Sign-Up failed or was closed')}
            useOneTap
            theme="filled_black"
            shape="pill"
            text="signup_with"
          />
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-text-muted mt-1">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-accent-purple hover:underline hover:text-accent-purple-hover transition-colors">
            Sign in
          </Link>
        </p>

      </div>

      {/* Customize Username Modal for New Google Users */}
      {newGoogleUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#1C1C24] border border-[#2A2A35] rounded-2xl w-full max-w-sm p-6 shadow-2xl text-white flex flex-col gap-4">
            <div className="flex items-center gap-3">
              {newGoogleUser.avatar ? (
                <img src={newGoogleUser.avatar} alt="Avatar" className="w-12 h-12 rounded-full border border-purple-500/50" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-purple-600/30 border border-purple-500 flex items-center justify-center text-lg font-bold text-purple-300">
                  {newGoogleUser.name?.[0] || 'U'}
                </div>
              )}
              <div>
                <h3 className="font-bold text-base text-white">Welcome, {newGoogleUser.name || 'Friend'}! 👋</h3>
                <p className="text-xs text-gray-400">Choose your handle to finish setting up your workspace.</p>
              </div>
            </div>

            {usernameError && (
              <div className="p-2.5 rounded-lg text-xs bg-red-500/10 border border-red-500/30 text-red-400 font-medium">
                {usernameError}
              </div>
            )}

            <form onSubmit={handleConfirmCustomUsername} className="flex flex-col gap-4">
              <div>
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
                  Username Handle
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-purple-400 font-bold text-sm">@</span>
                  <input
                    type="text"
                    value={customUsername}
                    onChange={(e) => setCustomUsername(e.target.value)}
                    className="w-full bg-[#0F0F14] border border-[#2A2A38] focus:border-purple-500 rounded-xl pl-8 pr-3 py-2.5 text-sm text-white outline-none"
                    placeholder="username"
                    required
                  />
                </div>
                <p className="text-[11px] text-gray-500 mt-1">This is how teammates will mention you on boards.</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-medium text-xs transition-all"
                >
                  Keep @{newGoogleUser.username}
                </button>
                <button
                  type="submit"
                  disabled={usernameLoading}
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 font-semibold text-xs text-white transition-all shadow-lg shadow-purple-600/30"
                >
                  {usernameLoading ? 'Saving...' : 'Save & Continue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default RegisterPage