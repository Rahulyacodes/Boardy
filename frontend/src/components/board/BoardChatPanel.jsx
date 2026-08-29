import { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import { getBoardMessages, sendBoardMessage } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { getDiceBearAvatar } from '../../utils/avatars'

// Backend Socket URL (defaults to http://localhost:5000 in dev)
const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'

function BoardChatPanel({ board, onClose, onNewMessageReceived }) {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)

  // @mention state
  const [mentionQuery, setMentionQuery] = useState(null)
  const [mentionIndex, setMentionIndex] = useState(0)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const socketRef = useRef(null)
  const chatPanelRef = useRef(null)

  // Click/Tap outside listener to close chat panel
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (chatPanelRef.current && !chatPanelRef.current.contains(event.target)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [onClose])

  // 1. Fetch Chat History & Setup Socket Connection
  useEffect(() => {
    if (!board?._id) return

    // Fetch initial chat history
    const fetchHistory = async () => {
      try {
        setLoading(true)
        const res = await getBoardMessages(board._id)
        setMessages(res.data || [])
      } catch (err) {
        console.error('Error fetching chat history:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()

    // Initialize Socket.io connection
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    })
    socketRef.current = socket

    socket.on('connect', () => {
      // Join board room for real-time updates
      socket.emit('join_board', board._id)
    })

    // Listen for real-time broadcast messages
    socket.on('receive_message', (newMsg) => {
      setMessages((prev) => {
        // Prevent duplicate messages if already present
        if (prev.some((m) => m._id === newMsg._id)) return prev
        return [...prev, newMsg]
      })

      if (onNewMessageReceived) {
        onNewMessageReceived(newMsg)
      }
    })

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave_board', board._id)
        socketRef.current.disconnect()
      }
    }
  }, [board?._id])

  // 2. Auto-scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 3. Handle Input Change & @mention detection
  const handleInputChange = (e) => {
    const value = e.target.value
    setInputText(value)

    const cursorPosition = e.target.selectionStart
    const textBeforeCursor = value.slice(0, cursorPosition)
    const lastAtSymbolIndex = textBeforeCursor.lastIndexOf('@')

    if (lastAtSymbolIndex !== -1) {
      const query = textBeforeCursor.slice(lastAtSymbolIndex + 1)
      // Ensure no space between @ and cursor to trigger autocomplete
      if (!query.includes(' ')) {
        setMentionQuery(query.toLowerCase())
        setMentionIndex(0)
        return
      }
    }
    setMentionQuery(null)
  }

  // Filter board members for @mention dropdown cleanly (excluding current logged-in user)
  const currentUserId = (user?._id || user?.id)?.toString()
  const rawMembers = board?.members || []
  const members = rawMembers
    .map((m) => {
      const u = m.userId && typeof m.userId === 'object' ? m.userId : m
      return {
        _id: (u._id || u.id || m._id)?.toString(),
        name: u.name || u.username || 'User',
        username: u.username || u.name || 'User',
        avatar: u.avatar || null
      }
    })
    .filter((m) => m._id !== currentUserId)

  const filteredMembers = mentionQuery !== null
    ? members.filter((m) => {
        const nameMatch = m.name.toLowerCase().includes(mentionQuery)
        const usernameMatch = m.username.toLowerCase().includes(mentionQuery)
        return nameMatch || usernameMatch
      })
    : []

  // Insert selected @mention into text input
  const insertMention = (member) => {
    const cursorPosition = inputRef.current?.selectionStart || inputText.length
    const textBeforeCursor = inputText.slice(0, cursorPosition)
    const textAfterCursor = inputText.slice(cursorPosition)

    const lastAtSymbolIndex = textBeforeCursor.lastIndexOf('@')
    const mentionTag = `@${member.username || member.name} `

    const newText =
      textBeforeCursor.slice(0, lastAtSymbolIndex) + mentionTag + textAfterCursor

    setInputText(newText)
    setMentionQuery(null)

    // Focus input after selecting
    setTimeout(() => {
      inputRef.current?.focus()
    }, 50)
  }

  // 4. Send Message Form Handler
  const handleSend = async (e) => {
    e.preventDefault()
    if (!inputText.trim() || sending) return

    try {
      setSending(true)

      // Parse mentioned member IDs from input text
      const mentionIds = []
      members.forEach((m) => {
        const handle = `@${m.username || m.name}`
        if (inputText.includes(handle)) {
          mentionIds.push(m._id)
        }
      })

      const res = await sendBoardMessage(board._id, {
        text: inputText,
        mentions: mentionIds
      })

      // Add newly created message locally
      if (res.data) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === res.data._id)) return prev
          return [...prev, res.data]
        })
      }

      setInputText('')
      setMentionQuery(null)
    } catch (err) {
      console.error('Error sending board message:', err)
    } finally {
      setSending(false)
    }
  }

  // 5. Rich Text Formatter: Parses URLs and @Mentions
  const renderFormattedText = (text, mentions = []) => {
    if (!text) return null

    // Regex matching URLs or @mentions
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const mentionRegex = /(@[\w.-]+)/g

    // Split text into tokens by whitespace
    const words = text.split(' ')

    return words.map((word, idx) => {
      // 1. Check if word is a URL
      if (word.match(urlRegex)) {
        return (
          <a
            key={idx}
            href={word}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 hover:text-purple-300 underline font-medium break-all transition-colors inline-flex items-center gap-1 mx-0.5"
          >
            <span>{word}</span>
            <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )
      }

      // 2. Check if word is a @mention
      if (word.match(mentionRegex)) {
        const cleanHandle = word.replace('@', '').toLowerCase()
        const isUserMentioned = mentions.some(
          (m) => (m.username || m.name || '').toLowerCase() === cleanHandle
        ) || members.some((m) => (m.username || m.name || '').toLowerCase() === cleanHandle)

        return (
          <span
            key={idx}
            className={`inline-block px-1.5 py-0.5 rounded-md font-semibold text-[11px] mx-0.5 ${
              isUserMentioned
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40 shadow-sm'
                : 'text-purple-400 font-medium'
            }`}
          >
            {word}
          </span>
        )
      }

      // 3. Regular text token
      return <span key={idx}> {word}</span>
    })
  }

  return (
    <div
      ref={chatPanelRef}
      className="w-full md:w-[380px] lg:w-[410px] xl:w-[22%] shrink-0 h-[calc(100vh-108px)] bg-[#14141D]/95 backdrop-blur-xl border-l border-[#262636] flex flex-col relative z-20 transition-all duration-300 select-text shadow-2xl"
    >
      {/* Chat Header */}
      <div className="px-4 py-3 border-b border-[#262636] flex items-center justify-between bg-[#191924]/90 select-none">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xs font-bold text-white leading-none">Board Chat</h3>
            <span className="text-[10px] text-gray-400 mt-1 block">
              {board?.title || 'Workspace'} • {board?.members?.length || 1} members
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer text-xs font-bold"
          title="Close Chat Panel"
        >
          ✕
        </button>
      </div>

      {/* Message Feed Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 select-text">
        {loading ? (
          <div className="h-full flex items-center justify-center text-gray-400 text-xs gap-2">
            <svg className="w-4 h-4 animate-spin text-purple-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400 select-none">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-xs font-semibold text-gray-300">No messages yet</p>
            <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
              Start the conversation with your team! Type <span className="text-purple-400 font-mono">@username</span> to mention members.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const sender = msg.senderId || {}
            const senderName = sender.name || sender.username || 'Member'
            const avatarUrl = getDiceBearAvatar(sender.avatar || sender.username || senderName)

            const currentUserId = (user?._id || user?.id)?.toString()
            const senderId = (typeof sender === 'object' ? (sender._id || sender.id) : sender)?.toString()
            const isMe = Boolean(senderId && currentUserId && senderId === currentUserId)

            return (
              <div
                key={msg._id}
                className={`flex items-start gap-2.5 ${isMe ? 'flex-row-reverse text-right' : 'text-left'}`}
              >
                <img
                  src={avatarUrl}
                  alt={senderName}
                  className="w-7 h-7 rounded-full object-cover border border-purple-500/40 shrink-0 bg-[#1E1E2A] shadow select-none"
                />

                <div className={`max-w-[80%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className={`flex items-center gap-1.5 mb-1 px-0.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <span className={`text-[11px] font-bold truncate ${isMe ? 'text-purple-300' : 'text-gray-300'}`}>
                      {isMe ? 'You' : senderName}
                    </span>
                    <span className="text-[9px] text-gray-500 font-mono">
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>

                  <div
                    className={`p-2.5 rounded-2xl text-xs leading-relaxed break-words shadow-lg select-text ${
                      isMe
                        ? 'bg-[#1E132B]/95 border border-purple-500/80 rounded-tr-none text-white shadow-purple-950/40'
                        : 'bg-[#1D1D2B] border border-[#2B2B3D] rounded-tl-none text-gray-200'
                    }`}
                  >
                    {renderFormattedText(msg.text, msg.mentions)}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* @Mention Autocomplete Dropdown Popover */}
      {mentionQuery !== null && filteredMembers.length > 0 && (
        <div className="absolute bottom-16 left-3 right-3 bg-[#1A1A28] border border-purple-500/40 rounded-xl shadow-2xl overflow-hidden z-30 max-h-44 overflow-y-auto divide-y divide-white/5 animate-fadeIn">
          <div className="px-3 py-1.5 bg-purple-950/40 text-[10px] font-bold text-purple-300 uppercase tracking-wider">
            Mention Member
          </div>
          {filteredMembers.map((member) => {
            const mName = member.name || member.username || 'Member'
            const mAvatar = getDiceBearAvatar(member.avatar || member.username || mName)
            return (
              <button
                key={member._id}
                type="button"
                onClick={() => insertMention(member)}
                className="w-full px-3 py-2 text-left hover:bg-purple-600/20 flex items-center gap-2.5 transition-colors cursor-pointer text-xs"
              >
                <img
                  src={mAvatar}
                  alt={mName}
                  className="w-5 h-5 rounded-full object-cover shrink-0 bg-[#1E1E2A]"
                />
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-white truncate block text-xs">
                    {mName}
                  </span>
                  <span className="text-[10px] text-gray-400 block truncate">
                    @{member.username || mName}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Message Input Box */}
      <form onSubmit={handleSend} className="p-3 border-t border-[#262636] bg-[#191924]/90 relative">
        <div className="flex items-center gap-2 bg-[#0F0F16] border border-[#2B2B3A] focus-within:border-purple-500/60 rounded-xl px-3 py-2 transition-colors">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={handleInputChange}
            placeholder="Type a message or @mention..."
            className="flex-1 bg-transparent text-xs text-white placeholder-gray-500 outline-none"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || sending}
            className="p-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white transition-all shadow-md cursor-pointer shrink-0"
          >
            {sending ? (
              <svg className="w-3.5 h-3.5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default BoardChatPanel
