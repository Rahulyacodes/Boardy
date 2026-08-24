// src/components/board/PlannerView.jsx
import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getBoards, getBoard, updateCard } from '../../api'
import { useAuth } from '../../context/AuthContext'

// Helper for local date string YYYY-MM-DD (avoids ISO/UTC timezone off-by-one shifts)
const getLocalDateString = (d) => {
  if (!d) return ''
  const date = new Date(d)
  if (isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Helper to check if a list title represents a Done/Finished list
const isDoneList = (listTitle) => {
  if (!listTitle) return false
  const title = listTitle.toLowerCase()
  return (
    title.includes('done') ||
    title.includes('finish') ||
    title.includes('completed') ||
    title.includes('complete')
  )
}

function PlannerView({ onOpenBoard }) {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [boards, setBoards] = useState([])
  const [allCards, setAllCards] = useState([])
  const [loading, setLoading] = useState(true)

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState('schedule') // 'schedule' | 'board'
  const [filterAssignee, setFilterAssignee] = useState('all') // 'all' | 'me'
  const [filterStatus, setFilterStatus] = useState('all') // 'all' | 'pending' | 'completed'

  // 4th Column Dropdown Selector mode: 'later' | 'completed'
  const [fourthColumnMode, setFourthColumnMode] = useState('later')
  const [showFourthColDropdown, setShowFourthColDropdown] = useState(false)

  // Popover / Modal states
  const [showFilterPopover, setShowFilterPopover] = useState(false)
  const [showMetricsPopover, setShowMetricsPopover] = useState(false)
  const [selectedCardModal, setSelectedCardModal] = useState(null)

  // Popover & Section Refs
  const filterPopoverRef = useRef(null)
  const metricsPopoverRef = useRef(null)
  const fourthColDropdownRef = useRef(null)
  const calendarSectionRef = useRef(null)
  const scheduleSectionRef = useRef(null)

  // Undo Toasts State & Active Timers
  // Map of cardId -> { countdown, timerId, intervalId, originalStatus, pendingStatus }
  const [undoToasts, setUndoToasts] = useState({})
  const activeTimersRef = useRef({})

  // Calendar month state
  const [currentDate, setCurrentDate] = useState(new Date())

  // Click-Outside Listener to Close Popovers
  useEffect(() => {
    function handleClickOutside(event) {
      if (filterPopoverRef.current && !filterPopoverRef.current.contains(event.target)) {
        setShowFilterPopover(false)
      }
      if (metricsPopoverRef.current && !metricsPopoverRef.current.contains(event.target)) {
        setShowMetricsPopover(false)
      }
      if (fourthColDropdownRef.current && !fourthColDropdownRef.current.contains(event.target)) {
        setShowFourthColDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const fetchPlannerData = async () => {
    setLoading(true)
    try {
      const res = await getBoards()
      const rawBoards = res.data || []
      setBoards(rawBoards)

      const fullBoards = await Promise.all(
        rawBoards.map((b) => getBoard(b._id).then((r) => r.data).catch(() => null))
      )

      const cardsList = []
      fullBoards.forEach((board) => {
        if (board && board.lists) {
          board.lists.forEach((list) => {
            if (list.cards) {
              list.cards.forEach((card) => {
                cardsList.push({
                  ...card,
                  boardId: board._id,
                  boardTitle: board.title,
                  listTitle: list.title
                })
              })
            }
          })
        }
      })

      setAllCards(cardsList)
    } catch (err) {
      console.error('Error loading planner view:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPlannerData()
  }, [])

  // Clean up all active timers on unmount
  useEffect(() => {
    return () => {
      Object.values(activeTimersRef.current).forEach((t) => {
        if (t.timerId) clearTimeout(t.timerId)
        if (t.intervalId) clearInterval(t.intervalId)
      })
    }
  }, [])

  // Open Board navigation handler
  const handleOpenBoard = (targetBoardId) => {
    if (!targetBoardId) return
    setSelectedCardModal(null)
    if (onOpenBoard) {
      onOpenBoard(targetBoardId)
    } else {
      navigate(`/board/${targetBoardId}`)
    }
  }

  // Filtered Cards Logic
  const filteredCards = useMemo(() => {
    return allCards.filter((card) => {
      // 1. Search Query Filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchTitle = card.title?.toLowerCase().includes(query)
        const matchBoard = card.boardTitle?.toLowerCase().includes(query)
        const matchDesc = card.description?.toLowerCase().includes(query)
        if (!matchTitle && !matchBoard && !matchDesc) return false
      }

      // 2. Assignee Filter
      if (filterAssignee === 'me' && user) {
        const isAssigned = card.members?.some(
          (m) => (m._id || m) === (user.id || user._id) || m.username === user.username
        )
        if (!isAssigned) return false
      }

      // 3. Status Filter
      const isDone = card.completed || isDoneList(card.listTitle)
      if (filterStatus === 'pending' && isDone) return false
      if (filterStatus === 'completed' && !isDone) return false

      return true
    })
  }, [allCards, searchQuery, filterAssignee, filterStatus, user])

  // Date Categories calculation
  const categorizedCards = useMemo(() => {
    const todayStr = getLocalDateString(new Date())

    const overdue = []
    const dueToday = []
    const upcomingThisWeek = []
    const unscheduledOrLater = []
    const completed = []

    const todayDate = new Date()
    todayDate.setHours(0, 0, 0, 0)
    const endOfWeek = new Date(todayDate)
    endOfWeek.setDate(todayDate.getDate() + 7)
    const endOfWeekStr = getLocalDateString(endOfWeek)

    filteredCards.forEach((card) => {
      const isDoneListCard = isDoneList(card.listTitle)
      const isDone = card.completed || isDoneListCard
      const pendingUndo = undoToasts[card._id]

      // 1. Handle Active 3s Undo Countdown state
      if (pendingUndo) {
        if (pendingUndo.originalStatus === true) {
          // Task was completed, now pending reopen => STAY in completed column until countdown finishes
          completed.push(card)
          return
        }
        // Task was open, now pending completed => STAY in its original open category until countdown finishes
      } else if (isDone) {
        // Card is finished or in a Done list => place in completed
        completed.push(card)
        return
      }

      // 2. Unscheduled or Scheduled Open tasks
      if (!card.dueDate) {
        unscheduledOrLater.push(card)
        return
      }

      const cardDateStr = getLocalDateString(card.dueDate)
      if (!cardDateStr) {
        unscheduledOrLater.push(card)
        return
      }

      if (cardDateStr < todayStr) {
        overdue.push(card)
      } else if (cardDateStr === todayStr) {
        dueToday.push(card)
      } else if (cardDateStr > todayStr && cardDateStr <= endOfWeekStr) {
        upcomingThisWeek.push(card)
      } else {
        unscheduledOrLater.push(card)
      }
    })

    return { overdue, dueToday, upcomingThisWeek, unscheduledOrLater, completed }
  }, [filteredCards, undoToasts])

  // Stats Metrics calculation
  const metrics = useMemo(() => {
    return {
      total: allCards.length,
      filtered: filteredCards.length,
      overdue: categorizedCards.overdue.length,
      dueToday: categorizedCards.dueToday.length,
      upcoming: categorizedCards.upcomingThisWeek.length,
      completed: categorizedCards.completed.length
    }
  }, [allCards, filteredCards, categorizedCards])

  // Toggle Card Completion with 3-Second Undo Popup (Card stays in place during countdown)
  const handleToggleComplete = (card, e) => {
    if (e) e.stopPropagation()
    
    // Cards from Done lists cannot be toggled here
    if (isDoneList(card.listTitle)) return

    const originalStatus = !!card.completed
    const pendingStatus = !originalStatus

    // If already in active countdown, cancel existing timer
    if (activeTimersRef.current[card._id]) {
      if (activeTimersRef.current[card._id].timerId) clearTimeout(activeTimersRef.current[card._id].timerId)
      if (activeTimersRef.current[card._id].intervalId) clearInterval(activeTimersRef.current[card._id].intervalId)
    }

    let countdown = 3

    // Create Undo toast state without moving card out of its column yet!
    setUndoToasts((prev) => ({
      ...prev,
      [card._id]: { countdown, originalStatus, pendingStatus }
    }))

    // 1s countdown tick
    const intervalId = setInterval(() => {
      setUndoToasts((prev) => {
        if (!prev[card._id]) return prev
        const currentCount = prev[card._id].countdown
        if (currentCount <= 1) return prev
        return {
          ...prev,
          [card._id]: { ...prev[card._id], countdown: currentCount - 1 }
        }
      })
    }, 1000)

    // 3s Database commit timeout
    const timerId = setTimeout(async () => {
      clearInterval(intervalId)
      delete activeTimersRef.current[card._id]

      // Remove Undo toast
      setUndoToasts((prev) => {
        const copy = { ...prev }
        delete copy[card._id]
        return copy
      })

      // Commit DB change and move card to target state
      setAllCards((prev) =>
        prev.map((c) => (c._id === card._id ? { ...c, completed: pendingStatus } : c))
      )

      if (selectedCardModal && selectedCardModal._id === card._id) {
        setSelectedCardModal((prev) => ({ ...prev, completed: pendingStatus }))
      }

      try {
        await updateCard(card._id, { completed: pendingStatus })
      } catch (err) {
        console.error('Failed to sync completion status to DB:', err)
      }
    }, 3000)

    activeTimersRef.current[card._id] = { timerId, intervalId, originalStatus, pendingStatus }
  }

  // Handle Undo Click
  const handleUndoComplete = (cardId, e) => {
    if (e) e.stopPropagation()

    // Clear active timers
    if (activeTimersRef.current[cardId]) {
      if (activeTimersRef.current[cardId].timerId) clearTimeout(activeTimersRef.current[cardId].timerId)
      if (activeTimersRef.current[cardId].intervalId) clearInterval(activeTimersRef.current[cardId].intervalId)
      delete activeTimersRef.current[cardId]
    }

    // Remove Undo toast
    setUndoToasts((prev) => {
      const copy = { ...prev }
      delete copy[cardId]
      return copy
    })
  }

  // Auto-scroll handler for Calendar
  const scrollToCalendar = () => {
    setViewMode('schedule')
    setShowFilterPopover(false)
    setTimeout(() => {
      calendarSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  // Auto-scroll handler for Schedule
  const scrollToSchedule = () => {
    setViewMode('schedule')
    setShowFilterPopover(false)
    setTimeout(() => {
      scheduleSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  // Calendar Days calculation
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const firstDayOfMonth = new Date(year, month, 1)
    const lastDayOfMonth = new Date(year, month + 1, 0)

    const startingDayOfWeek = firstDayOfMonth.getDay() // 0 = Sun
    const totalDays = lastDayOfMonth.getDate()

    const days = []

    // Previous month padding days
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ day: null, isCurrentMonth: false, dateKey: null })
    }

    // Current month days
    for (let day = 1; day <= totalDays; day++) {
      const dateObj = new Date(year, month, day)
      const dateKey = getLocalDateString(dateObj)

      const dayCards = filteredCards.filter((card) => {
        if (!card.dueDate) return false
        return getLocalDateString(card.dueDate) === dateKey
      })

      days.push({
        day,
        dateObj,
        dateKey,
        isCurrentMonth: true,
        cards: dayCards
      })
    }

    return days
  }, [currentDate, filteredCards])

  const todayDateStr = getLocalDateString(new Date())

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 text-white min-h-[85vh] flex flex-col gap-6 font-sans relative">
      
      {/* --------------------------- HEADER TOOLBAR --------------------------- */}
      <div className="bg-[#161622] border border-[#2A2A38] rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-20">
        
        {/* Title & Subtitle */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Planner & Timeline
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Schedule, deadlines, and task progress across all workspace boards
            </p>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          
          {/* Search Box */}
          <div className="relative flex-1 sm:w-64">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search planner tasks..."
              className="w-full bg-[#0F0F14] border border-[#2A2A38] focus:border-purple-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-gray-500 outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>

          {/* SVG Filter & View Options Popover Container */}
          <div className="relative" ref={filterPopoverRef}>
            <button
              type="button"
              onClick={() => {
                setShowFilterPopover(!showFilterPopover)
                setShowMetricsPopover(false)
              }}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                showFilterPopover || filterAssignee !== 'all' || filterStatus !== 'all'
                  ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                  : 'bg-[#0F0F14] border-[#2A2A38] text-gray-300 hover:border-gray-500'
              }`}
              title="View Settings & Filters"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="21" x2="4" y2="14"/>
                <line x1="4" y1="10" x2="4" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12" y2="3"/>
                <line x1="20" y1="21" x2="20" y2="16"/>
                <line x1="20" y1="12" x2="20" y2="3"/>
                <line x1="1" y1="14" x2="7" y2="14"/>
                <line x1="9" y1="8" x2="15" y2="8"/>
                <line x1="17" y1="16" x2="23" y2="16"/>
              </svg>
              <span className="hidden sm:inline">Views & Filters</span>
            </button>

            {/* Filter Popover Content Modal */}
            {showFilterPopover && (
              <div className="absolute right-0 top-12 z-50 w-72 bg-[#1C1C24] border border-[#2A2A35] rounded-2xl p-4 shadow-2xl animate-fadeIn flex flex-col gap-4 text-xs">
                <div className="flex items-center justify-between border-b border-[#2A2A35] pb-2">
                  <span className="font-bold text-white uppercase tracking-wider text-[11px]">Planner Settings</span>
                  <button
                    onClick={() => setShowFilterPopover(false)}
                    className="text-gray-400 hover:text-white cursor-pointer"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>

                {/* View Navigation / Scroll Option */}
                <div>
                  <label className="text-gray-400 font-semibold mb-1.5 block">Jump to View</label>
                  <div className="grid grid-cols-3 gap-1 bg-[#0F0F14] p-1 rounded-xl border border-[#2A2A38]">
                    <button
                      type="button"
                      onClick={scrollToSchedule}
                      className={`py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                        viewMode === 'schedule' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Schedule
                    </button>
                    <button
                      type="button"
                      onClick={scrollToCalendar}
                      className="py-1.5 rounded-lg font-medium text-gray-400 hover:text-white transition-all cursor-pointer hover:bg-[#252533]"
                    >
                      Calendar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setViewMode('board')
                        setShowFilterPopover(false)
                      }}
                      className={`py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                        viewMode === 'board' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      By Board
                    </button>
                  </div>
                </div>

                {/* Assignee Filter */}
                <div>
                  <label className="text-gray-400 font-semibold mb-1.5 block">Task Filter</label>
                  <div className="grid grid-cols-2 gap-1 bg-[#0F0F14] p-1 rounded-xl border border-[#2A2A38]">
                    <button
                      type="button"
                      onClick={() => setFilterAssignee('all')}
                      className={`py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                        filterAssignee === 'all' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      All Tasks
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterAssignee('me')}
                      className={`py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                        filterAssignee === 'me' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Assigned to Me
                    </button>
                  </div>
                </div>

                {/* Completion Status Filter */}
                <div>
                  <label className="text-gray-400 font-semibold mb-1.5 block">Completion Status</label>
                  <div className="grid grid-cols-3 gap-1 bg-[#0F0F14] p-1 rounded-xl border border-[#2A2A38]">
                    <button
                      type="button"
                      onClick={() => setFilterStatus('all')}
                      className={`py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                        filterStatus === 'all' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterStatus('pending')}
                      className={`py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                        filterStatus === 'pending' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterStatus('completed')}
                      className={`py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                        filterStatus === 'completed' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SVG Metrics Popover Container */}
          <div className="relative" ref={metricsPopoverRef}>
            <button
              type="button"
              onClick={() => {
                setShowMetricsPopover(!showMetricsPopover)
                setShowFilterPopover(false)
              }}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                showMetricsPopover
                  ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                  : 'bg-[#0F0F14] border-[#2A2A38] text-gray-300 hover:border-gray-500'
              }`}
              title="Planner Summary Metrics"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"/>
                <line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
              <span className="hidden sm:inline">Metrics</span>
            </button>

            {/* Metrics Popover Content Modal */}
            {showMetricsPopover && (
              <div className="absolute right-0 top-12 z-50 w-64 bg-[#1C1C24] border border-[#2A2A35] rounded-2xl p-4 shadow-2xl animate-fadeIn flex flex-col gap-3 text-xs">
                <div className="flex items-center justify-between border-b border-[#2A2A35] pb-2">
                  <span className="font-bold text-white uppercase tracking-wider text-[11px]">Task Analytics</span>
                  <button
                    onClick={() => setShowMetricsPopover(false)}
                    className="text-gray-400 hover:text-white cursor-pointer"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center bg-[#0F0F14] p-2.5 rounded-xl border border-[#2A2A38]">
                    <span className="text-gray-400">Total Cards</span>
                    <span className="font-bold text-white">{metrics.total}</span>
                  </div>

                  <div className="flex justify-between items-center bg-[#0F0F14] p-2.5 rounded-xl border border-[#2A2A38]">
                    <span className="text-rose-400 flex items-center gap-1.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      Overdue Tasks
                    </span>
                    <span className="font-bold text-rose-400">{metrics.overdue}</span>
                  </div>

                  <div className="flex justify-between items-center bg-[#0F0F14] p-2.5 rounded-xl border border-[#2A2A38]">
                    <span className="text-amber-400 flex items-center gap-1.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      Due Today
                    </span>
                    <span className="font-bold text-amber-400">{metrics.dueToday}</span>
                  </div>

                  <div className="flex justify-between items-center bg-[#0F0F14] p-2.5 rounded-xl border border-[#2A2A38]">
                    <span className="text-emerald-400 flex items-center gap-1.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                      Completed
                    </span>
                    <span className="font-bold text-emerald-400">{metrics.completed}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SVG Refresh Button */}
          <button
            type="button"
            onClick={fetchPlannerData}
            disabled={loading}
            className="p-2.5 rounded-xl bg-[#0F0F14] border border-[#2A2A38] text-gray-300 hover:text-white hover:border-gray-500 transition-all cursor-pointer disabled:opacity-50"
            title="Refresh Planner Data"
          >
            <svg className={loading ? 'animate-spin' : ''} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6"/>
              <path d="M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
          </button>

        </div>
      </div>

      {/* --------------------------- MAIN CONTENT VIEWS --------------------------- */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-3">
          <svg className="animate-spin text-purple-500" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <circle className="opacity-25" cx="12" cy="12" r="10"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
          </svg>
          <span className="text-xs font-medium">Assembling workspace schedule...</span>
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="bg-[#161622] border border-[#2A2A38] rounded-2xl p-12 text-center text-gray-400 flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#0F0F14] border border-[#2A2A38] flex items-center justify-center text-gray-500">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
            </svg>
          </div>
          <h3 className="text-base font-semibold text-white">No tasks match your filter</h3>
          <p className="text-xs text-gray-500 max-w-sm">Try clearing your search query or adjusting view filters in the toolbar.</p>
        </div>
      ) : viewMode === 'board' ? (
        /* VIEW OPTION: GROUPED BY BOARD */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {boards.map((b) => {
            const boardCards = filteredCards.filter((c) => c.boardId === b._id)
            return (
              <div key={b._id} className="bg-[#161622] border border-[#2A2A38] rounded-2xl p-5 shadow-xl flex flex-col">
                <div className="flex items-center justify-between border-b border-[#2A2A38] pb-3 mb-4">
                  <h3 className="font-bold text-sm text-white tracking-wide truncate">{b.title}</h3>
                  <span className="text-xs font-semibold bg-purple-600/20 text-purple-300 px-2.5 py-1 rounded-full border border-purple-500/30">
                    {boardCards.length} Cards
                  </span>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto max-h-[450px]">
                  {boardCards.length === 0 ? (
                    <div className="text-xs text-gray-500 py-6 text-center italic">No tasks in this board</div>
                  ) : (
                    boardCards.map((card) => (
                      <PlannerCardItem
                        key={card._id}
                        card={card}
                        undoState={undoToasts[card._id]}
                        onCardClick={(c) => setSelectedCardModal(c)}
                        onToggleComplete={handleToggleComplete}
                        onUndo={handleUndoComplete}
                      />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* DEFAULT VIEW: SCHEDULE TIMELINE + CALENDAR GRID DIRECTLY BELOW */
        <div className="flex flex-col gap-8">
          
          {/* 1. SMART SCHEDULE TIMELINE (4 COLUMNS, COMPACT DEFAULT MIN-H 250PX, DYNAMIC MAX-H 468PX) */}
          <div ref={scheduleSectionRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
            
            {/* Column 1: Overdue & Urgent */}
            <ScheduleColumn
              title="Overdue Tasks"
              badgeCount={categorizedCards.overdue.length}
              badgeColor="bg-rose-500/10 text-rose-400 border-rose-500/30"
              dotColor="bg-rose-500"
              cards={categorizedCards.overdue}
              undoToasts={undoToasts}
              onCardClick={(card) => setSelectedCardModal(card)}
              onToggleComplete={handleToggleComplete}
              onUndo={handleUndoComplete}
            />

            {/* Column 2: Due Today */}
            <ScheduleColumn
              title="Due Today"
              badgeCount={categorizedCards.dueToday.length}
              badgeColor="bg-amber-500/10 text-amber-400 border-amber-500/30"
              dotColor="bg-amber-400"
              cards={categorizedCards.dueToday}
              undoToasts={undoToasts}
              onCardClick={(card) => setSelectedCardModal(card)}
              onToggleComplete={handleToggleComplete}
              onUndo={handleUndoComplete}
            />

            {/* Column 3: Upcoming This Week */}
            <ScheduleColumn
              title="Upcoming (7 Days)"
              badgeCount={categorizedCards.upcomingThisWeek.length}
              badgeColor="bg-purple-500/10 text-purple-400 border-purple-500/30"
              dotColor="bg-purple-400"
              cards={categorizedCards.upcomingThisWeek}
              undoToasts={undoToasts}
              onCardClick={(card) => setSelectedCardModal(card)}
              onToggleComplete={handleToggleComplete}
              onUndo={handleUndoComplete}
            />

            {/* Column 4: Dropdown Switcher (Later & Open vs Completed) */}
            <ScheduleColumn
              title={fourthColumnMode === 'later' ? 'Later & Open Tasks' : 'Completed Tasks'}
              badgeCount={fourthColumnMode === 'later' ? categorizedCards.unscheduledOrLater.length : categorizedCards.completed.length}
              badgeColor={fourthColumnMode === 'later' ? 'bg-gray-500/10 text-gray-400 border-gray-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'}
              dotColor={fourthColumnMode === 'later' ? 'bg-gray-400' : 'bg-emerald-400'}
              cards={fourthColumnMode === 'later' ? categorizedCards.unscheduledOrLater : categorizedCards.completed}
              undoToasts={undoToasts}
              onCardClick={(card) => setSelectedCardModal(card)}
              onToggleComplete={handleToggleComplete}
              onUndo={handleUndoComplete}
              headerControl={
                <div className="relative" ref={fourthColDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setShowFourthColDropdown(!showFourthColDropdown)}
                    className="p-1.5 rounded-lg bg-[#0F0F14] border border-[#2A2A38] hover:border-gray-500 text-gray-400 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                    title="Switch Column View"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </button>

                  {showFourthColDropdown && (
                    <div className="absolute right-0 top-8 z-50 w-44 bg-[#1C1C24] border border-[#2A2A35] rounded-xl p-1.5 shadow-2xl animate-fadeIn flex flex-col gap-1 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setFourthColumnMode('later')
                          setShowFourthColDropdown(false)
                        }}
                        className={`px-3 py-2 rounded-lg text-left font-medium transition-all cursor-pointer flex items-center justify-between ${
                          fourthColumnMode === 'later'
                            ? 'bg-purple-600/20 text-purple-300 font-bold'
                            : 'text-gray-300 hover:bg-[#252533]'
                        }`}
                      >
                        <span>Later & Open</span>
                        {fourthColumnMode === 'later' && <span className="text-purple-400">✓</span>}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setFourthColumnMode('completed')
                          setShowFourthColDropdown(false)
                        }}
                        className={`px-3 py-2 rounded-lg text-left font-medium transition-all cursor-pointer flex items-center justify-between ${
                          fourthColumnMode === 'completed'
                            ? 'bg-purple-600/20 text-purple-300 font-bold'
                            : 'text-gray-300 hover:bg-[#252533]'
                        }`}
                      >
                        <span>Completed Tasks</span>
                        {fourthColumnMode === 'completed' && <span className="text-purple-400">✓</span>}
                      </button>
                    </div>
                  )}
                </div>
              }
            />

          </div>

          {/* 2. MONTHLY CALENDAR GRID VIEW (POSITIONED DIRECTLY BELOW SCHEDULE VIEW) */}
          <div ref={calendarSectionRef} className="bg-[#161622] border border-[#2A2A38] rounded-2xl p-6 shadow-xl flex flex-col gap-4 scroll-mt-6">
            
            {/* Calendar Controls */}
            <div className="flex items-center justify-between border-b border-[#2A2A38] pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </div>
                <h2 className="text-base font-bold text-white tracking-wide">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                  className="p-2 rounded-xl bg-[#0F0F14] border border-[#2A2A38] text-gray-300 hover:text-white cursor-pointer"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentDate(new Date())}
                  className="px-3 py-1.5 rounded-xl bg-[#0F0F14] border border-[#2A2A38] text-xs font-semibold text-gray-300 hover:text-white cursor-pointer"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
                  className="p-2 rounded-xl bg-[#0F0F14] border border-[#2A2A38] text-gray-300 hover:text-white cursor-pointer"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>
            </div>

            {/* Calendar Header Row */}
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider py-1">
              <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
            </div>

            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((cell, idx) => {
                if (!cell.isCurrentMonth) {
                  return <div key={idx} className="h-28 bg-[#0F0F14]/40 border border-[#2A2A38]/30 rounded-xl opacity-30" />
                }

                const isToday = cell.dateKey === todayDateStr
                const hasCards = cell.cards.length > 0

                return (
                  <div
                    key={idx}
                    className={`h-28 rounded-xl p-2 flex flex-col justify-between overflow-hidden transition-all border ${
                      isToday
                        ? 'border-purple-500 bg-purple-950/20 ring-2 ring-purple-500/40 shadow-lg shadow-purple-950/50'
                        : hasCards
                        ? 'border-amber-500/30 bg-[#1A1A26]'
                        : 'border-[#2A2A38] bg-[#0F0F14]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${
                        isToday
                          ? 'text-purple-300 bg-purple-600/30 px-1.5 py-0.5 rounded border border-purple-500/40'
                          : hasCards
                          ? 'text-amber-300'
                          : 'text-gray-400'
                      }`}>
                        {cell.day} {isToday ? '• TODAY' : ''}
                      </span>
                      {hasCards && (
                        <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded-full">
                          {cell.cards.length}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 overflow-y-auto mt-1 space-y-1 pr-0.5">
                      {cell.cards.map((c) => (
                        <div
                          key={c._id}
                          onClick={() => setSelectedCardModal(c)}
                          className="bg-[#121218] border border-[#2A2A38] hover:border-purple-500 rounded p-1 text-[10px] truncate cursor-pointer transition-colors flex items-center justify-between"
                          title={c.title}
                        >
                          <span className={c.completed || isDoneList(c.listTitle) ? 'line-through text-gray-500' : 'text-gray-200'}>
                            {c.title}
                          </span>
                          {(c.completed || isDoneList(c.listTitle)) && (
                            <span className="text-emerald-400 font-bold text-[9px]">✓</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

          </div>

        </div>
      )}

      {/* --------------------------- TASK DETAIL QUICK-ACTION MODAL --------------------------- */}
      {selectedCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#1C1C24] border border-[#2A2A35] rounded-2xl w-full max-w-lg p-6 shadow-2xl text-white flex flex-col gap-5 relative">
            
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setSelectedCardModal(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>

            {/* Header / Board Context */}
            <div>
              <div className="flex items-center gap-2 text-xs text-purple-400 font-semibold mb-1">
                <span>{selectedCardModal.boardTitle}</span>
                <span>•</span>
                <span className="text-gray-400">{selectedCardModal.listTitle}</span>
              </div>
              <h2 className={`text-lg font-bold ${selectedCardModal.completed || isDoneList(selectedCardModal.listTitle) ? 'line-through text-gray-400' : 'text-white'}`}>
                {selectedCardModal.title}
              </h2>
            </div>

            {/* Description */}
            {selectedCardModal.description && (
              <div className="bg-[#0F0F14] border border-[#2A2A38] rounded-xl p-3.5 text-xs text-gray-300 leading-relaxed">
                {selectedCardModal.description}
              </div>
            )}

            {/* Due Date & Member Meta */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-[#0F0F14] border border-[#2A2A38] p-3 rounded-xl">
                <span className="text-gray-400 font-semibold block mb-1">Due Date</span>
                <span className="font-mono text-gray-200">
                  {selectedCardModal.dueDate ? new Date(selectedCardModal.dueDate).toLocaleDateString() : 'No due date'}
                </span>
              </div>

              <div className="bg-[#0F0F14] border border-[#2A2A38] p-3 rounded-xl">
                <span className="text-gray-400 font-semibold block mb-1">Assigned Members</span>
                <span className="text-gray-200">
                  {selectedCardModal.members?.length > 0
                    ? selectedCardModal.members.map((m) => `@${m.username}`).join(', ')
                    : 'Unassigned'}
                </span>
              </div>
            </div>

            {/* Action Footer Buttons */}
            <div className="flex items-center gap-3 pt-2 border-t border-[#2A2A38]">
              {isDoneList(selectedCardModal.listTitle) ? (
                <div className="flex-1 py-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-2">
                  <span>✓</span>
                  <span>From {selectedCardModal.listTitle} (Completed List)</span>
                </div>
              ) : undoToasts[selectedCardModal._id] ? (
                <div className="flex-1 bg-[#1C1C26] border border-purple-500/50 rounded-xl px-3 py-2 flex items-center justify-between text-xs text-purple-200 shadow-xl animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping" />
                    <span className="font-semibold text-gray-200">
                      {undoToasts[selectedCardModal._id].pendingStatus ? 'Completed' : 'Reopened'} ({undoToasts[selectedCardModal._id].countdown}s)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleUndoComplete(selectedCardModal._id, e)}
                    className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] uppercase tracking-wider transition-colors cursor-pointer shadow-md"
                  >
                    Undo
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={(e) => handleToggleComplete(selectedCardModal, e)}
                  className={`flex-1 py-3 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    selectedCardModal.completed
                      ? 'bg-amber-600/20 text-amber-300 border border-amber-500/40 hover:bg-amber-600/30'
                      : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-600/20'
                  }`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  <span>{selectedCardModal.completed ? 'Reopen Task' : 'Mark as Completed'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleOpenBoard(selectedCardModal.boardId)}
                className="py-3 px-5 rounded-xl bg-purple-600 hover:bg-purple-500 font-semibold text-xs text-white transition-all shadow-lg shadow-purple-600/20 flex items-center gap-1.5 cursor-pointer"
              >
                <span>Open Board</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  <polyline points="15 3 21 3 21 9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}

// --------------------------- SUB-COMPONENTS ---------------------------

function ScheduleColumn({ title, badgeCount, badgeColor, dotColor, cards, undoToasts, onCardClick, onToggleComplete, onUndo, headerControl }) {
  return (
    <div className="bg-[#161622] border border-[#2A2A38] rounded-2xl p-4 shadow-xl flex flex-col min-h-[250px] max-h-[468px] transition-all duration-300">
      <div className="flex items-center justify-between border-b border-[#2A2A38] pb-3 mb-3 gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotColor}`} />
          <h3 className="font-bold text-xs text-white uppercase tracking-wider truncate" title={title}>{title}</h3>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${badgeColor}`}>
            {badgeCount}
          </span>
        </div>
        {headerControl && <div className="shrink-0">{headerControl}</div>}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pr-0.5">
        {cards.length === 0 ? (
          <div className="text-xs text-gray-500 py-10 text-center italic">No tasks in this category</div>
        ) : (
          cards.map((card) => (
            <PlannerCardItem
              key={card._id}
              card={card}
              undoState={undoToasts[card._id]}
              onCardClick={onCardClick}
              onToggleComplete={onToggleComplete}
              onUndo={onUndo}
            />
          ))
        )}
      </div>
    </div>
  )
}

function PlannerCardItem({ card, undoState, onCardClick, onToggleComplete, onUndo }) {
  const fromDoneList = isDoneList(card.listTitle)
  const isDone = card.completed || fromDoneList

  return (
    <div
      onClick={() => onCardClick(card)}
      className={`group bg-[#0F0F14] border border-[#2A2A38] hover:border-purple-500/60 rounded-xl p-3.5 transition-all shadow-sm cursor-pointer relative flex flex-col gap-2 ${
        isDone ? 'opacity-70' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className={`font-semibold text-xs text-gray-100 group-hover:text-purple-300 transition-colors line-clamp-2 ${
          isDone ? 'line-through text-gray-400' : ''
        }`}>
          {card.title}
        </h4>

        {/* Action / Status Indicator */}
        {fromDoneList ? (
          /* Card from Done/Finished list: No tick button, render indicator badge */
          <span className="shrink-0 text-[10px] font-medium bg-emerald-950/50 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
            <span>✓</span>
            <span>From {card.listTitle}</span>
          </span>
        ) : (
          /* Normal Task Checkbox Toggle Button */
          <button
            type="button"
            onClick={(e) => onToggleComplete(card, e)}
            className={`shrink-0 p-1 rounded-lg border transition-all cursor-pointer ${
              card.completed || (undoState && undoState.pendingStatus)
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                : 'border-[#2A2A38] text-gray-500 hover:text-white hover:border-gray-400'
            }`}
            title={card.completed ? 'Mark as incomplete' : 'Mark as completed'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </button>
        )}
      </div>

      {card.description && (
        <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">
          {card.description}
        </p>
      )}

      {/* Footer Meta */}
      <div className="flex items-center justify-between text-[10px] text-gray-400 pt-2 border-t border-white/5 mt-1">
        <span className="bg-purple-950/60 text-purple-300 px-2 py-0.5 rounded font-medium truncate max-w-[120px]">
          {card.boardTitle}
        </span>

        {card.dueDate && (
          <span className="font-mono text-gray-400">
            {new Date(card.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>

      {/* Undo Popup Bar Below Card */}
      {undoState && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="mt-2 bg-[#1C1C26] border border-purple-500/50 rounded-xl p-2 flex items-center justify-between text-xs text-purple-200 shadow-xl animate-fadeIn z-10"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
            <span className="text-[11px] font-medium text-gray-300">
              {undoState.pendingStatus ? 'Completed' : 'Reopened'} ({undoState.countdown}s)
            </span>
          </div>
          <button
            type="button"
            onClick={(e) => onUndo(card._id, e)}
            className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px] uppercase tracking-wider transition-colors cursor-pointer shadow-md"
          >
            Undo
          </button>
        </div>
      )}
    </div>
  )
}

export default PlannerView
