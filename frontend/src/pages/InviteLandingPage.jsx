import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getInviteInfo, joinByLink } from '../api'
import { getDiceBearAvatar } from '../utils/avatars'
import { StatusBarsLogo } from '../components/common/StatusBarsLogo'

export default function InviteLandingPage() {
  const { inviteToken } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [boardInfo, setBoardInfo] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchInfo() {
      try {
        setLoading(true)
        setError('')
        const res = await getInviteInfo(inviteToken)
        setBoardInfo(res.data)
      } catch (err) {
        setError(err.response?.data?.message || 'Invalid or expired invitation link.')
      } finally {
        setLoading(false)
      }
    }
    if (inviteToken) {
      fetchInfo()
    }
  }, [inviteToken])

  const handleJoin = async () => {
    if (!user) {
      // Save invite token to session storage so user returns post-login
      sessionStorage.setItem('pendingInviteToken', inviteToken)
      navigate('/login')
      return
    }

    try {
      setJoining(true)
      setError('')
      const res = await joinByLink(inviteToken)
      sessionStorage.removeItem('pendingInviteToken')
      navigate(`/board/${res.data.boardId}`)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to join board. Please try again.')
      setJoining(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0C0C12] text-gray-100 flex flex-col justify-between p-6 relative overflow-hidden select-none">
      {/* Ambient background glow accents */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* TOP BAR: PrimeTeam Logo & Branding */}
      <header className="w-full max-w-7xl mx-auto flex items-center justify-between z-20">
        <Link
          to="/"
          className="flex items-center gap-2.5 group transition-transform duration-200 active:scale-95 cursor-pointer"
        >
          <StatusBarsLogo size={36} />
          <span className="font-extrabold text-xl tracking-tight text-white group-hover:text-purple-300 transition-colors">
            PrimeTeam
          </span>
        </Link>

        {user ? (
          <Link
            to="/"
            className="text-xs text-gray-400 hover:text-white font-medium transition-colors bg-[#171724] border border-[#2B2B3C] px-3.5 py-1.5 rounded-full"
          >
            Signed in as <span className="text-purple-400 font-semibold">@{user.username}</span>
          </Link>
        ) : (
          <Link
            to="/login"
            className="text-xs text-purple-400 hover:text-purple-300 font-semibold transition-colors bg-purple-500/10 border border-purple-500/20 px-4 py-1.5 rounded-full"
          >
            Sign In
          </Link>
        )}
      </header>

      {/* CENTER: Main Invitation Card */}
      <main className="flex-1 flex items-center justify-center py-8 z-10">
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
            <p className="text-sm font-medium text-gray-400">Loading invitation details...</p>
          </div>
        ) : error || !boardInfo ? (
          <div className="max-w-md w-full bg-[#161622] border border-[#2A2A3A] rounded-2xl p-8 text-center space-y-5 shadow-2xl backdrop-blur-xl">
            <div className="w-14 h-14 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mx-auto text-red-400">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-1.5">Invalid Invitation Link</h3>
              <p className="text-xs text-gray-400 leading-relaxed">{error || 'This invitation link is invalid or has expired.'}</p>
            </div>
            <Link
              to="/"
              className="inline-block px-6 py-2.5 bg-[#222230] hover:bg-[#2B2B3D] text-white text-xs font-semibold rounded-xl transition-colors border border-[#3A3A4E]"
            >
              Go to Workspace
            </Link>
          </div>
        ) : (
          <div className="max-w-md w-full bg-[#161622] border border-[#2C2C3E] rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl transition-all duration-300">
            {/* Top Board Background Banner */}
            <div
              className="h-28 w-full p-4 flex items-start justify-between relative"
              style={{ background: boardInfo.background || 'linear-gradient(135deg, #1E1E24, #2A2A38)' }}
            >
              <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]"></div>
              <div className="relative z-10">
                <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-black/50 text-white backdrop-blur-md border border-white/20 uppercase tracking-widest">
                  Board Invitation
                </span>
              </div>
            </div>

            {/* Body Content Area - Avatar & Text 100% Inside Dark Container */}
            <div className="px-6 pb-6 pt-0 space-y-5 relative">
              {/* Overlapping Owner Avatar */}
              <div className="-mt-10 mb-2 relative z-20">
                <div className="w-18 h-18 rounded-full bg-[#161622] p-1 shadow-2xl inline-block">
                  <div className="w-full h-full rounded-full bg-[#1C1C2A] border-2 border-purple-500/80 overflow-hidden flex items-center justify-center">
                    <img
                      src={getDiceBearAvatar(boardInfo.owner?.avatar || boardInfo.owner?.name || boardInfo.owner?.username || 'Owner')}
                      alt="Owner Avatar"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              </div>

              {/* Board Title & Owner Info - 100% on dark background for crisp readability */}
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-white tracking-tight leading-snug break-words">
                  {boardInfo.title}
                </h2>
                <p className="text-xs text-gray-400">
                  Invited by <span className="text-purple-400 font-semibold">@{boardInfo.owner?.username || 'owner'}</span>
                </p>
              </div>

              {/* Stats Card Box */}
              <div className="bg-[#101018] border border-[#242436] rounded-xl p-4 flex items-center justify-around text-center">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-1">
                    Active Members
                  </span>
                  <div className="flex items-center gap-2 text-white font-extrabold text-lg">
                    <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span>{boardInfo.memberCount}</span>
                  </div>
                </div>

                <div className="h-8 w-px bg-[#26263A]" />

                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-1">
                    Access Level
                  </span>
                  <div className="flex items-center gap-1 text-emerald-400 font-extrabold text-xs mt-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Full Member</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              {user ? (
                <button
                  onClick={handleJoin}
                  disabled={joining}
                  className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-purple-600/25 active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
                >
                  {joining ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Joining Board...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      <span>Join Board</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={handleJoin}
                    className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-purple-600/25 active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    <span>Log in to Join Board</span>
                  </button>
                  <p className="text-center text-xs text-gray-400">
                    Don't have an account?{' '}
                    <button
                      onClick={() => {
                        sessionStorage.setItem('pendingInviteToken', inviteToken)
                        navigate('/register')
                      }}
                      className="text-purple-400 hover:underline font-semibold cursor-pointer"
                    >
                      Sign Up
                    </button>
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="w-full max-w-7xl mx-auto text-center z-20">
        <p className="text-[11px] text-gray-400">
          © 2026 PrimeTeam Inc. All rights reserved.
        </p>
      </footer>
    </div>
  )
}
