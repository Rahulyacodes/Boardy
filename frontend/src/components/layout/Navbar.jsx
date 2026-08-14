// src/components/layout/Navbar.jsx
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

function Navbar({ onSearch }) {
  const { user, logoutUser } = useAuth()
  const navigate = useNavigate()

  const [profileOpen, setProfileOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [announceOpen, setAnnounceOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const profileRef = useRef(null)
  const helpRef = useRef(null)
  const announceRef = useRef(null)
  const notifRef = useRef(null)

  // Derive 1 or 2 letter initials from username
  const getInitials = (name) => {
    if (!name) return 'U'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  const initials = getInitials(user?.username || 'User')
  const userEmail = user?.email || `${(user?.username || 'user').toLowerCase().replace(/\s+/g, '')}@gmail.com`

  // Close menus on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false)
      }
      if (helpRef.current && !helpRef.current.contains(e.target)) {
        setHelpOpen(false)
      }
      if (announceRef.current && !announceRef.current.contains(e.target)) {
        setAnnounceOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    logoutUser()
    navigate('/login')
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (onSearch) onSearch(searchQuery)
  }

  return (
    <nav className="w-full bg-[#17171F] border-b border-[#2A2A35] px-4 py-2 flex items-center justify-between z-50 sticky top-0 text-white shadow-md select-none">
      {/* LEFT: Logo & App Name */}
      <div
        onClick={() => navigate('/')}
        className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity"
      >
        <div className="w-7 h-7 bg-purple-600 rounded-md flex items-center justify-center p-1 shadow-sm">
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <rect x="4" y="4" width="6" height="16" rx="1.5" />
            <rect x="14" y="4" width="6" height="10" rx="1.5" />
          </svg>
        </div>
        <span className="font-bold text-base tracking-tight text-white">Trello</span>
      </div>

      {/* MIDDLE: Search Field & Button */}
      <form onSubmit={handleSearchSubmit} className="flex items-center gap-1.5 max-w-xs w-full mx-4">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full bg-[#0F0F14] border border-[#2A2A38] focus:border-purple-500 rounded-lg px-3 py-1.5 pl-8 text-xs text-white placeholder-gray-400 focus:outline-none transition-all"
          />
          <svg
            className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <button
          type="submit"
          className="px-2.5 py-1.5 bg-[#252532] hover:bg-purple-600 rounded-lg text-xs font-medium text-gray-300 hover:text-white transition-colors"
        >
          Search
        </button>
      </form>

      {/* RIGHT: Icons & Profile Avatar */}
      <div className="flex items-center gap-2">
        {/* Announcement Icon */}
        <div className="relative" ref={announceRef}>
          <button
            onClick={() => setAnnounceOpen(!announceOpen)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors relative"
            title="Announcements"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.684A1.761 1.761 0 014 12c0-.972.784-1.761 1.76-1.761h2.825l3.417-6.15A1.76 1.76 0 0115 5.882v12.236a1.76 1.76 0 01-2.998 1.284l-3.417-6.15H5.436z" />
            </svg>
            <span className="w-2 h-2 bg-purple-500 rounded-full absolute top-1 right-1" />
          </button>

          {announceOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-[#1C1C24] border border-[#2A2A35] rounded-xl p-3 shadow-2xl z-50 text-xs text-gray-200">
              <h4 className="font-bold text-sm mb-1 text-white">Announcements 📢</h4>
              <p className="text-gray-400">New features and dashboard enhancements are live!</p>
            </div>
          )}
        </div>

        {/* Notifications Icon */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors relative"
            title="Notifications"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-[#1C1C24] border border-[#2A2A35] rounded-xl p-3 shadow-2xl z-50 text-xs text-gray-200">
              <h4 className="font-bold text-sm mb-1 text-white">Notifications 🔔</h4>
              <p className="text-gray-400">No unread notifications.</p>
            </div>
          )}
        </div>

        {/* Help (?) Icon */}
        <div className="relative" ref={helpRef}>
          <button
            onClick={() => setHelpOpen(!helpOpen)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
            title="Help"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          {helpOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-[#1C1C24] border border-[#2A2A35] rounded-xl p-3 shadow-2xl z-50 text-xs text-gray-200">
              <h4 className="font-bold text-sm mb-1 text-white">Help & Support ❓</h4>
              <p className="text-gray-400 mb-2">Find guides, shortcuts, and contact assistance.</p>
              <span className="text-[10px] text-purple-400 font-semibold">Content coming soon</span>
            </div>
          )}
        </div>

        {/* Profile Avatar & Dropdown Menu */}
        <div className="relative ml-1" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 border border-white/30 flex items-center justify-center font-bold text-xs text-white shadow hover:scale-105 transition-transform"
          >
            {initials}
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-[#1C1C24] border border-[#2A2A35] rounded-2xl shadow-2xl py-3 z-50 text-xs text-gray-200">
              {/* User info header */}
              <div className="px-4 pb-3 border-b border-[#2A2A35] flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center font-bold text-sm text-white shadow">
                  {initials}
                </div>
                <div className="overflow-hidden">
                  <h4 className="font-bold text-sm text-white truncate">{user?.username || 'User'}</h4>
                  <p className="text-[11px] text-gray-400 truncate">{userEmail}</p>
                </div>
              </div>

              {/* ACCOUNT section */}
              <div className="pt-2">
                <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Account
                </div>
                <button className="w-full text-left px-4 py-2 hover:bg-white/10 transition-colors text-gray-200">
                  Switch accounts
                </button>
                <button className="w-full text-left px-4 py-2 hover:bg-white/10 transition-colors text-gray-200 flex items-center justify-between">
                  <span>Manage account</span>
                  <span className="text-[10px] text-gray-400">↗</span>
                </button>
              </div>

              <div className="border-t border-[#2A2A35] my-2" />

              {/* APP / TRELLO section */}
              <div>
                <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Trello
                </div>
                <button className="w-full text-left px-4 py-2 hover:bg-white/10 transition-colors text-gray-200">
                  Profile and visibility
                </button>
                <button className="w-full text-left px-4 py-2 hover:bg-white/10 transition-colors text-gray-200">
                  Activity
                </button>
                <button className="w-full text-left px-4 py-2 hover:bg-white/10 transition-colors text-gray-200">
                  Cards
                </button>
                <button className="w-full text-left px-4 py-2 hover:bg-white/10 transition-colors text-gray-200">
                  Settings
                </button>
                <button className="w-full text-left px-4 py-2 hover:bg-white/10 transition-colors text-gray-200">
                  Help
                </button>
                <button className="w-full text-left px-4 py-2 hover:bg-white/10 transition-colors text-gray-200">
                  Shortcuts
                </button>
              </div>

              <div className="border-t border-[#2A2A35] my-2" />

              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 hover:bg-red-500/20 text-red-400 font-semibold transition-colors flex items-center justify-between"
              >
                <span>Log out</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar