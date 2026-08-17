import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { searchAll, getNotifications, markNotificationRead, markAllNotificationsRead } from '../../api'

function Navbar({ onSearch }) {
  const { user, logoutUser } = useAuth()
  const navigate = useNavigate()

  const [profileOpen, setProfileOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [announceOpen, setAnnounceOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)

  // Notifications state
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchNotifications = async () => {
    try {
      const res = await getNotifications()
      setNotifications(res.data.notifications || [])
      setUnreadCount(res.data.unreadCount || 0)
    } catch (err) {
      console.error('Error fetching notifications:', err)
    }
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 10000)
    return () => clearInterval(interval)
  }, [])

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead()
      fetchNotifications()
    } catch (err) {
      console.error(err)
    }
  }

  const handleNotificationClick = async (n) => {
    try {
      if (!n.read) {
        await markNotificationRead(n._id)
        fetchNotifications()
      }
      if (n.link) {
        navigate(n.link)
      }
      setNotifOpen(false)
    } catch (err) {
      console.error(err)
    }
  }

  // Global Search states
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState({ boards: [], cards: [] })
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  const profileRef = useRef(null)
  const helpRef = useRef(null)
  const announceRef = useRef(null)
  const notifRef = useRef(null)
  const searchRef = useRef(null)

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

  // Debounced API search effect
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ boards: [], cards: [] })
      setSearchOpen(false)
      return
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const res = await searchAll(searchQuery.trim())
        setSearchResults(res.data)
        setSearchOpen(true)
      } catch (err) {
        console.error('Search error:', err)
      } finally {
        setSearchLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

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
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false)
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
    if (!searchQuery.trim()) return
    setSearchOpen(true)
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

      {/* MIDDLE: Search Field & Dropdown Overlay */}
      <form onSubmit={handleSearchSubmit} className="flex items-center gap-1.5 max-w-sm w-full mx-4">
        <div className="relative flex-1" ref={searchRef}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery.trim() && setSearchOpen(true)}
            placeholder="Search boards or cards..."
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

          {/* Search Overlay Dropdown */}
          {searchOpen && (
            <div className="absolute top-full left-0 mt-2 w-full min-w-[320px] max-h-96 overflow-y-auto bg-[#1C1C24] border border-[#2A2A35] rounded-xl p-3 shadow-2xl z-50 text-xs text-gray-200">
              {searchLoading ? (
                <div className="py-4 text-center text-gray-400">Searching...</div>
              ) : searchResults.boards.length === 0 && searchResults.cards.length === 0 ? (
                <div className="py-4 text-center text-gray-400">No results found for "{searchQuery}"</div>
              ) : (
                <div className="space-y-3">
                  {/* Boards Section */}
                  {searchResults.boards.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                        Boards ({searchResults.boards.length})
                      </div>
                      <div className="space-y-1">
                        {searchResults.boards.map((b) => (
                          <div
                            key={b._id}
                            onClick={() => {
                              navigate(`/board/${b._id}`)
                              setSearchOpen(false)
                              setSearchQuery('')
                            }}
                            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/10 cursor-pointer transition-colors"
                          >
                            <div
                              className="w-5 h-5 rounded border border-white/20"
                              style={{ background: b.background || '#4A00E0' }}
                            />
                            <span className="font-semibold text-white">{b.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cards Section */}
                  {searchResults.cards.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                        Cards ({searchResults.cards.length})
                      </div>
                      <div className="space-y-1">
                        {searchResults.cards.map((c) => (
                          <div
                            key={c._id}
                            onClick={() => {
                              const bId = c.boardId?._id || c.boardId
                              if (bId) navigate(`/board/${bId}`)
                              setSearchOpen(false)
                              setSearchQuery('')
                            }}
                            className="flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-white/10 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-purple-400">📋</span>
                              <div>
                                <p className="font-medium text-white">{c.title}</p>
                                {c.description && (
                                  <p className="text-[10px] text-gray-400 truncate max-w-[180px]">{c.description}</p>
                                )}
                              </div>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-gray-300">
                              {c.boardTitle || c.boardId?.title || 'Board'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
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
            onClick={() => {
              setNotifOpen(!notifOpen)
              fetchNotifications()
            }}
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors relative"
            title="Notifications"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-red-500 text-white rounded-full text-[10px] font-bold shadow-md animate-pulse">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-[#1C1C24] border border-[#2A2A35] rounded-xl p-3 shadow-2xl z-50 text-xs text-gray-200">
              <div className="flex items-center justify-between border-b border-[#2A2A35] pb-2 mb-2">
                <span className="font-bold text-white text-xs uppercase tracking-wider">
                  Notifications {unreadCount > 0 && `(${unreadCount})`}
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-purple-400 hover:underline font-semibold"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div className="py-6 text-center text-gray-400 text-xs">
                  No notifications yet 🔔
                </div>
              ) : (
                <div className="space-y-1.5">
                  {notifications.map((n) => {
                    const iconMap = {
                      BOARD_INVITE: '👥',
                      CARD_ASSIGNMENT: '📋',
                      ROLE_CHANGE: '⚙️',
                      MEMBER_REMOVED: '🚪',
                      GENERAL: '🔔'
                    }
                    const icon = iconMap[n.type] || '🔔'

                    return (
                      <div
                        key={n._id}
                        onClick={() => handleNotificationClick(n)}
                        className={`p-2.5 rounded-lg border transition-colors cursor-pointer flex items-start gap-2.5 ${
                          !n.read
                            ? 'bg-purple-900/20 border-purple-500/40 hover:bg-purple-900/30'
                            : 'bg-white/5 border-transparent hover:bg-white/10 opacity-75'
                        }`}
                      >
                        <span className="text-sm mt-0.5">{icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h5 className="font-semibold text-white truncate text-xs">{n.title}</h5>
                            {!n.read && (
                              <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-gray-300 mt-0.5 leading-snug">{n.message}</p>
                          <span className="text-[9px] text-gray-400 mt-1 block">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
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