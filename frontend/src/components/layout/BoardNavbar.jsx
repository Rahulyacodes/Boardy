import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { updateBoard, deleteBoard, inviteMember, removeMember, updateMemberRole, getBoard, leaveBoard } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { getDiceBearAvatar } from '../../utils/avatars'
import BackgroundPickerModal from '../board/BackgroundPickerModal'

export const GRADIENT_PRESETS = [
  { name: 'City Sunset', value: 'linear-gradient(135deg, #8B3A1C 0%, #E66820 40%, #1D1D2B 100%)' },
  { name: 'Purple Teal', value: 'linear-gradient(135deg, #7C6FF7 0%, #4ECDC4 100%)' },
  { name: 'Coral Violet', value: 'linear-gradient(135deg, #FF6B6B 0%, #7C6FF7 100%)' },
  { name: 'Dark Obsidian', value: 'linear-gradient(135deg, #181820 0%, #2A2A38 100%)' },
  { name: 'Emerald Glow', value: 'linear-gradient(135deg, #11998E 0%, #38EF7D 100%)' },
  { name: 'Deep Indigo', value: 'linear-gradient(135deg, #4A00E0 0%, #8E2DE2 100%)' },
  { name: 'Golden Hour', value: 'linear-gradient(135deg, #F12711 0%, #F5AF19 100%)' },
]

function BoardNavbar({ board, onBoardUpdate, filterMemberId, setFilterMemberId, filterText, setFilterText }) {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleText, setTitleText] = useState(board?.title || '')
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [shareTab, setShareTab] = useState('members')
  const [filterOpen, setFilterOpen] = useState(false)

  // Share form states
  const [inviteUsername, setInviteUsername] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [shareMsg, setShareMsg] = useState({ text: '', type: '' })
  const [copiedLink, setCopiedLink] = useState(false)

  // Leave board states
  const [leaveModalOpen, setLeaveModalOpen] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [leaveError, setLeaveError] = useState('')

  const dropdownRef = useRef(null)
  const filterRef = useRef(null)
  const leaveModalRef = useRef(null)

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
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setFilterOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close leave modal when clicking anywhere outside modal content
  useEffect(() => {
    if (!leaveModalOpen) return
    function handleOutsideClick(e) {
      if (leaveModalRef.current && !leaveModalRef.current.contains(e.target)) {
        setLeaveModalOpen(false)
      }
    }
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleOutsideClick)
      document.addEventListener('touchstart', handleOutsideClick)
    }, 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('touchstart', handleOutsideClick)
    }
  }, [leaveModalOpen])

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
      alert(err.response?.data?.message || err.response?.data?.error || 'Failed to rename board')
      setTitleText(board.title)
      setIsEditingTitle(false)
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

  const handleConfirmLeaveBoard = async () => {
    setLeaving(true)
    setLeaveError('')
    try {
      await leaveBoard(board._id)
      setLeaveModalOpen(false)
      navigate('/')
    } catch (err) {
      setLeaveError(err.response?.data?.error || err.response?.data?.message || 'Failed to leave board')
    } finally {
      setLeaving(false)
    }
  }

  const handleInviteUser = async (e) => {
    e.preventDefault()
    if (!inviteUsername.trim()) return
    setInviteLoading(true)
    setShareMsg({ text: '', type: '' })
    try {
      const res = await inviteMember(board._id, { username: inviteUsername.trim(), role: inviteRole })
      setShareMsg({ text: res.data.message || 'User invited!', type: 'success' })
      setInviteUsername('')
      setShareTab('invites')
      if (res.data.board && onBoardUpdate) {
        onBoardUpdate(res.data.board)
      } else if (onBoardUpdate) {
        const freshBoard = await getBoard(board._id)
        onBoardUpdate(freshBoard.data)
      }
    } catch (err) {
      setShareMsg({
        text: err.response?.data?.error || err.response?.data?.message || 'Failed to invite user',
        type: 'error'
      })
    } finally {
      setInviteLoading(false)
    }
  }

  const handleRemoveMember = async (memberUserId) => {
    if (!window.confirm('Remove member / cancel invitation?')) return
    try {
      const res = await removeMember(board._id, memberUserId)
      setShareMsg({ text: 'Removed successfully', type: 'success' })
      if (res.data.board && onBoardUpdate) {
        onBoardUpdate(res.data.board)
      } else if (onBoardUpdate) {
        const freshBoard = await getBoard(board._id)
        onBoardUpdate(freshBoard.data)
      }
    } catch (err) {
      setShareMsg({ text: 'Failed to remove member', type: 'error' })
    }
  }

  const handleRoleChange = async (memberUserId, newRole) => {
    if (newRole === 'remove') {
      handleRemoveMember(memberUserId)
      return
    }
    try {
      const res = await updateMemberRole(board._id, memberUserId, newRole)
      setShareMsg({ text: 'Member role updated!', type: 'success' })
      if (res.data.board && onBoardUpdate) {
        onBoardUpdate(res.data.board)
      } else if (onBoardUpdate) {
        const freshBoard = await getBoard(board._id)
        onBoardUpdate(freshBoard.data)
      }
    } catch (err) {
      setShareMsg({ text: 'Failed to update role', type: 'error' })
    }
  }

  const handleCopyBoardLink = async () => {
    let token = board?.inviteToken
    if (!token && board?._id) {
      try {
        const freshBoard = await getBoard(board._id)
        token = freshBoard.data?.inviteToken
        if (token && onBoardUpdate) {
          onBoardUpdate(freshBoard.data)
        }
      } catch (err) {
        console.error('Failed to fetch board token:', err)
      }
    }

    if (!token) {
      alert('Unable to copy invite link. Please refresh the page.')
      return
    }

    const inviteLink = `${window.location.origin}/invite/${token}`
    navigator.clipboard.writeText(inviteLink)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2500)
  }

  const getInitials = (name) => {
    if (!name) return 'U'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }

  // Members list from board (sorted owner first)
  const rawMembers = board?.members || []
  const sortedMembers = [...rawMembers].sort((a, b) => {
    if (a.role === 'owner') return -1
    if (b.role === 'owner') return 1
    return 0
  })

  const currentUserId = user?.id || user?._id
  const ownerUserId = typeof board?.ownerId === 'object' ? (board?.ownerId?._id || board?.ownerId?.id) : board?.ownerId
  const isOwner = Boolean(
    (ownerUserId && currentUserId && ownerUserId.toString() === currentUserId.toString()) ||
    rawMembers.some(m => {
      const mId = typeof m.userId === 'object' ? (m.userId?._id || m.userId?.id) : m.userId
      return mId?.toString() === currentUserId?.toString() && m.role === 'owner'
    })
  )

  const acceptedMembers = sortedMembers.filter(m => m.status === 'accepted' || !m.status)
  const pendingMembers = sortedMembers.filter(m => m.status === 'pending')

  return (
    <header className="w-full px-4 py-3 flex items-center justify-between backdrop-blur-md bg-black/25 border-b border-white/10 text-white z-40 sticky top-0 select-none">
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

            <div className="relative">
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

              {/* Flyout Side Popover for Background Picker */}
              {showColorPicker && (
                <div className="absolute left-full top-0 ml-2 z-[100] drop-shadow-2xl">
                  <BackgroundPickerModal
                    currentBackground={board?.background}
                    onSelectBackground={(bg) => {
                      handleChangeBackground(bg)
                      setShowColorPicker(false)
                    }}
                    onClose={() => setShowColorPicker(false)}
                  />
                </div>
              )}
            </div>

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

      {/* Right side: Star, Member Avatar Bubbles, Share Button, Dashboard Shortcut */}
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

        {/* Member Avatar Bubbles (accepted members only) */}
        <div className="flex items-center -space-x-2 overflow-hidden">
          {acceptedMembers.map((m, idx) => {
            const memberObj = m.userId || {}
            const username = memberObj.username || 'User'
            const avatarUri = getDiceBearAvatar(memberObj.avatar || username)
            return (
              <div
                key={m._id || idx}
                title={`${username} (${m.role})`}
                className="w-8 h-8 rounded-full bg-[#13131A] border-2 border-[#181820] flex items-center justify-center p-0.5 overflow-hidden shadow"
              >
                <img src={avatarUri} alt={username} className="w-full h-full object-contain rounded-full" />
              </div>
            )
          })}
        </div>

        {/* Filter Button & Popover */}
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              filterMemberId || filterText
                ? 'bg-purple-600 border-purple-500 text-white shadow-md'
                : 'bg-white/10 hover:bg-white/20 border-white/10 text-white/90'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.707 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span>Filter</span>
            {(filterMemberId || filterText) && (
              <span className="w-2 h-2 rounded-full bg-teal-400 inline-block ml-0.5" />
            )}
          </button>

          {/* Filter Menu Popover */}
          {filterOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-[#1C1C24] border border-[#2A2A35] rounded-xl p-3 shadow-2xl z-50 text-xs text-gray-200">
              <div className="flex items-center justify-between border-b border-[#2A2A35] pb-2 mb-3">
                <span className="font-bold text-white text-xs uppercase tracking-wider">Filter Board</span>
                {(filterMemberId || filterText) && (
                  <button
                    onClick={() => {
                      if (setFilterMemberId) setFilterMemberId(null)
                      if (setFilterText) setFilterText('')
                    }}
                    className="text-[11px] text-purple-400 hover:underline font-semibold"
                  >
                    Clear filters
                  </button>
                )}
              </div>

              {/* Keyword Filter */}
              <div className="mb-3">
                <label className="block text-[11px] font-semibold text-gray-400 mb-1">Search Keywords</label>
                <input
                  type="text"
                  placeholder="Filter cards by title..."
                  value={filterText || ''}
                  onChange={(e) => setFilterText && setFilterText(e.target.value)}
                  className="w-full bg-[#0F0F14] border border-[#2A2A38] focus:border-purple-500 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none"
                />
              </div>

              {/* Member Filter */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-1.5">Filter by Assignee</label>
                <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                  <button
                    onClick={() => setFilterMemberId && setFilterMemberId(null)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                      !filterMemberId ? 'bg-purple-600/30 text-purple-300 font-semibold' : 'hover:bg-white/10 text-gray-300'
                    }`}
                  >
                    <span>All Cards</span>
                    {!filterMemberId && <span>✓</span>}
                  </button>
                  {sortedMembers.map((m) => {
                    const uObj = m.userId || {}
                    const uId = uObj._id || uObj
                    const uName = uObj.username || 'User'
                    const isSelected = filterMemberId === uId

                    return (
                      <button
                        key={uId}
                        onClick={() => setFilterMemberId && setFilterMemberId(isSelected ? null : uId)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                          isSelected ? 'bg-purple-600/30 text-purple-300 font-semibold' : 'hover:bg-white/10 text-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-[10px] font-bold text-white">
                            {uName.slice(0, 2).toUpperCase()}
                          </div>
                          <span>{uName}</span>
                        </div>
                        {isSelected && <span>✓</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Share Button */}
        <button
          onClick={() => {
            setShareModalOpen(true)
            setShareMsg({ text: '', type: '' })
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 transition-all text-xs font-semibold text-white shadow-md cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          <span>Share</span>
        </button>

        {/* Leave Board Red Button (Placed in middle of Share and Home button) */}
        <button
          onClick={() => {
            setLeaveError('')
            setLeaveModalOpen(true)
          }}
          title="Leave Board"
          className="p-2 rounded-lg bg-red-500/15 hover:bg-red-600 border border-red-500/30 hover:border-red-500 transition-all text-red-400 hover:text-white shadow-sm flex items-center justify-center cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
        </button>

        {/* Back to Dashboard shortcut icon */}
        <button
          onClick={() => navigate('/')}
          title="Back to Dashboard"
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all text-white/80 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 00-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </button>
      </div>

      {/* Share Board Modal - Positioned below BoardNavbar at top-[110px] */}
      {shareModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-center items-start pt-[108px] bg-black/50 backdrop-blur-sm" onClick={() => setShareModalOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#22232B] border border-[#323342] rounded-2xl p-6 w-full max-w-lg shadow-2xl text-white my-auto max-h-[calc(100vh-130px)] overflow-y-auto"
          >
            {/* Header: Title with icon + Close button in top-right */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <h3 className="font-bold text-lg text-white tracking-tight">Share board</h3>
              </div>
              <button
                onClick={() => setShareModalOpen(false)}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-xs font-semibold text-gray-200 transition-colors"
              >
                Close
              </button>
            </div>

            {/* Invite Form Row: Input + Role Dropdown + Share Button */}
            <form onSubmit={handleInviteUser} className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Email address or username"
                value={inviteUsername}
                onChange={(e) => setInviteUsername(e.target.value)}
                className="flex-1 bg-[#181824] border border-[#323342] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="bg-[#181824] border border-[#323342] text-white rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
              </select>
              <button
                type="submit"
                disabled={inviteLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs font-semibold text-white transition-colors"
              >
                {inviteLoading ? 'Sharing...' : 'Share'}
              </button>
            </form>

            {/* Share link row */}
            <div className="flex items-center justify-between bg-[#181824] border border-[#323342] rounded-xl px-3 py-2.5 mb-5 text-xs">
              <div className="flex items-center gap-2 text-gray-300">
                <svg className="w-4 h-4 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <span>Share this board with a link</span>
              </div>
              <button
                type="button"
                onClick={handleCopyBoardLink}
                className="text-blue-400 hover:text-blue-300 font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1"
              >
                {copiedLink ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Copied link!</span>
                  </span>
                ) : (
                  <span>Copy link</span>
                )}
              </button>
            </div>

            {/* Status Message */}
            {shareMsg.text && (
              <p
                className={`text-xs mb-4 p-2.5 rounded-xl border ${
                  shareMsg.type === 'error'
                    ? 'bg-red-500/10 border-red-500/30 text-red-300'
                    : 'bg-green-500/10 border-green-500/30 text-green-300'
                }`}
              >
                {shareMsg.text}
              </p>
            )}

            {/* Tabs Header */}
            <div className="flex items-center gap-4 border-b border-[#323342] pb-2 mb-3">
              <button
                type="button"
                onClick={() => setShareTab('members')}
                className={`text-xs font-bold pb-1.5 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  shareTab === 'members' ? 'text-blue-400 border-b-2 border-blue-500' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <span>Board members</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  shareTab === 'members'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    : 'bg-white/10 text-gray-400'
                }`}>
                  {acceptedMembers.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setShareTab('invites')}
                className={`text-xs font-medium pb-1.5 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  shareTab === 'invites' ? 'text-blue-400 border-b-2 border-blue-500' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <span>Sent Requests</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  pendingMembers.length > 0
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : shareTab === 'invites'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    : 'bg-white/10 text-gray-400'
                }`}>
                  {pendingMembers.length}
                </span>
              </button>
            </div>

            {/* Tab 1: Board Members List */}
            {shareTab === 'members' && (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {acceptedMembers.length === 0 ? (
                  <div className="py-4 text-center text-gray-400 text-xs">No active members found</div>
                ) : (
                  acceptedMembers.map((m, idx) => {
                    const memberObj = m.userId || {}
                    const displayName = memberObj.name || memberObj.username || 'User'
                    const handleUsername = memberObj.username || 'username'
                    const uEmail = memberObj.email || ''
                    const uId = memberObj._id || memberObj
                    const avatarUri = getDiceBearAvatar(memberObj.avatar || handleUsername)
                    const isCurrentUser = (uId === user?.id || uId === user?._id)

                    return (
                      <div
                        key={m._id || idx}
                        className="flex items-center justify-between bg-[#181824] border border-[#323342] rounded-xl px-3 py-2.5"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                          <div className="w-8 h-8 rounded-full bg-[#13131A] border border-purple-500/40 p-0.5 flex items-center justify-center overflow-hidden shrink-0">
                            <img src={avatarUri} alt={displayName} className="w-full h-full object-contain rounded-full" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-white flex items-center gap-1 truncate">
                              <span>{displayName}</span>
                              {isCurrentUser && <span className="text-gray-400 font-normal">(you)</span>}
                            </p>
                            <p className="text-[11px] text-gray-400 truncate">
                              @{handleUsername} {uEmail ? `• ${uEmail}` : ''}
                            </p>
                          </div>
                        </div>

                        {/* Member Role Dropdown / Badge */}
                        <div className="flex items-center gap-2 shrink-0">
                          {m.role === 'owner' ? (
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 flex items-center gap-1">
                              <span>Owner</span>
                            </span>
                          ) : isOwner ? (
                            <select
                              value={m.role}
                              onChange={(e) => handleRoleChange(uId, e.target.value)}
                              className="bg-[#242533] border border-[#404258] hover:border-purple-500/60 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer font-medium shadow-sm transition-all"
                            >
                              <option value="member" className="bg-[#1C1C28] text-white">Member</option>
                              <option value="viewer" className="bg-[#1C1C28] text-white">Viewer</option>
                              <option value="remove" className="bg-[#1C1C28] text-red-400">Remove from board</option>
                            </select>
                          ) : (
                            <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-white/10 text-gray-300 capitalize flex items-center gap-1">
                              <span>{m.role}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}

            {/* Tab 2: Sent Requests / Pending Invites List */}
            {shareTab === 'invites' && (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {pendingMembers.length === 0 ? (
                  <div className="py-6 text-center text-gray-400 text-xs">No pending requests sent</div>
                ) : (
                  pendingMembers.map((m, idx) => {
                    const memberObj = m.userId || {}
                    const displayName = memberObj.name || memberObj.username || 'User'
                    const handleUsername = memberObj.username || 'username'
                    const uEmail = memberObj.email || ''
                    const uId = memberObj._id || memberObj
                    const avatarUri = getDiceBearAvatar(memberObj.avatar || handleUsername)

                    return (
                      <div
                        key={m._id || idx}
                        className="flex items-center justify-between bg-[#181824] border border-[#323342] rounded-xl px-3 py-2.5"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                          <div className="w-8 h-8 rounded-full bg-[#13131A] border border-amber-500/40 p-0.5 flex items-center justify-center overflow-hidden shrink-0">
                            <img src={avatarUri} alt={displayName} className="w-full h-full object-contain rounded-full" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-white truncate">{displayName}</p>
                            <p className="text-[11px] text-gray-400 truncate">
                              @{handleUsername} {uEmail ? `• ${uEmail}` : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 animate-pulse">
                            Pending ({m.role})
                          </span>
                          {isOwner && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(uId)}
                              className="px-2 py-1 bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                              title="Cancel / Revoke Invitation"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Leave Board Confirmation Modal */}
      {leaveModalOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setLeaveModalOpen(false)}
        >
          <div
            ref={leaveModalRef}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#22232B] border border-[#323342] rounded-2xl p-6 w-full max-w-md shadow-2xl text-white my-auto"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0 shadow-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-white">Leave Board</h3>
            </div>

            {leaveError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 leading-relaxed">
                {leaveError}
              </div>
            )}

            <p className="text-xs text-gray-300 mb-4 leading-relaxed">
              Are you sure you want to leave <span className="font-semibold text-white">"{board?.title}"</span>? You will lose access to this workspace board.
            </p>

            <div className="mb-6 flex items-start gap-2.5 bg-[#161620] border border-[#2B2B3A] p-3 rounded-xl">
              <svg className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-[11px] text-gray-300 leading-relaxed">
                All your created cards, comments, and activity history will be kept intact.
              </span>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setLeaveModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={leaving}
                onClick={handleConfirmLeaveBoard}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-all shadow-lg shadow-red-600/25 flex items-center gap-2 cursor-pointer"
              >
                {leaving ? (
                  <span>Leaving...</span>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                    </svg>
                    <span>Leave Board</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

export default BoardNavbar


