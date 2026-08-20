import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { login, googleLogin } from '../api'
import { useAuth } from '../context/AuthContext'

function LoginPage() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword]     = useState('')
  const [error, setError]           = useState('')
  const [loading, setLoading]       = useState(false)

  // Google OAuth states
  const [pendingGoogleCredential, setPendingGoogleCredential] = useState(null)
  const [newGoogleUser, setNewGoogleUser]                     = useState(null)
  const [customUsername, setCustomUsername]                   = useState('')
  const [usernameError, setUsernameError]                     = useState('')
  const [usernameLoading, setUsernameLoading]                 = useState(false)

  const { loginUser } = useAuth()
  const navigate      = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await login({ identifier, password })
      loginUser(res.data.user, res.data.token)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials or server error')
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
        // Store temp auth so they can skip if they want
        loginUser(res.data.user, res.data.token)
      } else {
        loginUser(res.data.user, res.data.token)
        navigate('/')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Google Authentication failed')
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
      {/* Background glow accents */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-accent-purple/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-accent-teal/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main card */}
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
          <p className="text-sm text-text-muted">Welcome back! Sign in to your workspace</p>
        </div>

        {/* Error notification */}
        {error && (
          <div className="p-3.5 rounded-xl text-sm font-medium bg-danger/10 border border-danger/30 text-danger flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Email or Username
            </label>
            <input
              type="text"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              placeholder="name@example.com or username"
              required
              className="w-full px-4 py-3 rounded-xl bg-bg-primary border border-bg-border text-text-primary text-sm placeholder:text-text-muted/40 focus:outline-none focus:border-accent-purple focus:ring-1 focus:ring-accent-purple transition-all duration-200"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Password
              </label>
            </div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-3 rounded-xl bg-bg-primary border border-bg-border text-text-primary text-sm placeholder:text-text-muted/40 focus:outline-none focus:border-accent-purple focus:ring-1 focus:ring-accent-purple transition-all duration-200"
            />
          </div>

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
                <span>Signing in...</span>
              </>
            ) : (
              'Sign in'
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
            onError={() => setError('Google Sign-In failed or was closed')}
            useOneTap
            theme="filled_black"
            shape="pill"
            text="continue_with"
          />
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-text-muted mt-1">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-accent-purple hover:underline hover:text-accent-purple-hover transition-colors">
            Sign up
          </Link>
        </p>

      </div>
    </div>
  )
}

export default LoginPage
