// src/components/layout/BoardNavbar.jsx
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { updateBoard, deleteBoard } from '../../api'
import { useAuth } from '../../context/AuthContext'

export const GRADIENT_PRESETS = [
  { name: 'City Sunset', value: 'linear-gradient(135deg, #8B3A1C 0%, #E66820 40%, #1D1D2B 100%)' },
  { name: 'Purple Teal', value: 'linear-gradient(135deg, #7C6FF7 0%, #4ECDC4 100%)' },
  { name: 'Coral Violet', value: 'linear-gradient(135deg, #FF6B6B 0%, #7C6FF7 100%)' },
  { name: 'Dark Obsidian', value: 'linear-gradient(135deg, #181820 0%, #2A2A38 100%)' },
  { name: 'Emerald Glow', value: 'linear-gradient(135deg, #11998E 0%, #38EF7D 100%)' },
  { name: 'Deep Indigo', value: 'linear-gradient(135deg, #4A00E0 0%, #8E2DE2 100%)' },
  { name: 'Golden Hour', value: 'linear-gradient(135deg, #F12711 0%, #F5AF19 100%)' },
]

function BoardNavbar({ board, onBoardUpdate }) {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleText, setTitleText] = useState(board?.title || '')
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [shareModalOpen, setShareModalOpen] = useState(false)

  const dropdownRef = useRef(null)

  useEffect(() => {
    setTitleText(board?.title || '')
  }, [board?.title])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
        setShowColorPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSaveTitle = async () => {
    if (!titleText.trim() || titleText === board.title) {
      setIsEditingTitle(false)
      return
    }
    try {
      const res = await updateBoard(board._id, { title: titleText })
      onBoardUpdate(res.data)
      setIsEditingTitle(false)
    } catch (err) {
      console.error('Error renaming board:', err)
    }
  }

  const handleToggleStar = async () => {
    try {
      const res = await updateBoard(board._id, { isStarred: !board.isStarred })
      onBoardUpdate(res.data)
    } catch (err) {
      console.error('Error toggling star:', err)
    }
  }

  const handleChangeBackground = async (bgValue) => {
    try {
      const res = await updateBoard(board._id, { background: bgValue })
      onBoardUpdate(res.data)
      setShowColorPicker(false)
      setDropdownOpen(false)
    } catch (err) {
      console.error('Error updating background:', err)
    }
  }

  const handleDeleteBoard = async () => {
    if (!window.confirm(`Are you sure you want to delete board "${board.title}"?`)) return
    try {
      await deleteBoard(board._id)
      navigate('/')
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting board')
    }
  }

  const userInitial = user?.username ? user.username.slice(0, 2).toUpperCase() : 'ME'

  return (
    <header className="w-full px-4 py-3 flex items-center justify-between backdrop-blur-md bg-black/25 border-b border-white/10 text-white z-40 sticky top-0">
      {/* Left side: Board title & dropdown menu */}
      <div className="flex items-center gap-3 relative" ref={dropdownRef}>
        {isEditingTitle ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSaveTitle()
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              autoFocus
              value={titleText}
              onChange={(e) => setTitleText(e.target.value)}
              onBlur={handleSaveTitle}
              className="bg-black/40 border border-purple-500/50 rounded px-2 py-1 text-base font-semibold text-white focus:outline-none"
            />
          </form>
        ) : (
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors font-bold text-lg text-white"
          >
            <span>{board?.title || 'Board'}</span>
            <svg className="w-4 h-4 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}

        {/* Dropdown Menu */}
        {dropdownOpen && (
          <div className="absolute top-full left-0 mt-2 w-64 bg-[#1C1C24] border border-[#2A2A35] rounded-xl shadow-2xl py-2 z-50 text-sm text-gray-200">
            <div className="px-3 py-2 border-b border-[#2A2A35] text-xs font-semibold uppercase tracking-wider text-gray-400">
              Board Actions
            </div>

            <button
              onClick={() => {
                setIsEditingTitle(true)
                setDropdownOpen(false)
              }}
              className="w-full text-left px-4 py-2 hover:bg-white/10 flex items-center gap-2.5 transition-colors"
            >
              <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Rename Board</span>
            </button>

            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="w-full text-left px-4 py-2 hover:bg-white/10 flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-23" />
                </svg>
                <span>Change Background</span>
              </div>
              <span className="text-xs opacity-60">▶</span>
            </button>

            {/* Gradient background options list */}
            {showColorPicker && (
              <div className="px-3 py-2 bg-[#121218] my-1 mx-2 rounded-lg grid grid-cols-1 gap-1.5 border border-[#2A2A35]">
                {GRADIENT_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => handleChangeBackground(preset.value)}
                    className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-white/10 text-xs text-left transition-all"
                  >
                    <div
                      className="w-4 h-4 rounded-full border border-white/20"
                      style={{ background: preset.value }}
                    />
                    <span>{preset.name}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="border-t border-[#2A2A35] my-1" />

            <button
              onClick={handleDeleteBoard}
              className="w-full text-left px-4 py-2 hover:bg-red-500/20 text-red-400 flex items-center gap-2.5 transition-colors"
            >
              <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Delete Board</span>
            </button>
          </div>
        )}
      </div>

      {/* Right side: Star, Share, Avatars, Actions */}
      <div className="flex items-center gap-3">
        {/* Star Button */}
        <button
          onClick={handleToggleStar}
          title={board?.isStarred ? 'Unstar board' : 'Star board'}
          className={`p-2 rounded-lg transition-all ${
            board?.isStarred ? 'bg-amber-500/30 text-amber-300' : 'bg-white/10 hover:bg-white/20 text-white/80'
          }`}
        >
          <svg className="w-4 h-4" fill={board?.isStarred ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </button>

        {/* Avatar Badge */}
        <div className="w-8 h-8 rounded-full bg-purple-600 border border-white/30 flex items-center justify-center font-bold text-xs shadow text-white">
          {userInitial}
        </div>

        {/* Share Button */}
        <button
          onClick={() => setShareModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition-all text-xs font-semibold text-white shadow-sm"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          <span>Share</span>
        </button>

        {/* Back to Dashboard shortcut icon */}
        <button
          onClick={() => navigate('/')}
          title="Back to Dashboard"
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all text-white/80"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 00-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </button>
      </div>

      {/* Share Modal Placeholder */}
      {shareModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#1C1C24] border border-[#2A2A35] rounded-2xl p-6 w-full max-w-md shadow-2xl text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Share Board</h3>
              <button
                onClick={() => setShareModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              Invite members to collaborate on <strong>{board?.title}</strong>
            </p>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Enter username..."
                className="flex-1 bg-[#0F0F13] border border-[#2A2A35] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
              />
              <button
                onClick={() => {
                  alert('Share invitation feature coming soon!')
                  setShareModalOpen(false)
                }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-xs font-semibold transition-colors"
              >
                Invite
              </button>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShareModalOpen(false)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

export default BoardNavbar
