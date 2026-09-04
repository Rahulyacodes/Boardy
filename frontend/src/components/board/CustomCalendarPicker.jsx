import React, { useState } from 'react'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function CustomCalendarPicker({ value, onChange, onSave, onRemove }) {
  // Parsing selected date
  const parseSelectedDate = (valStr) => {
    if (!valStr) return null
    const [y, m, d] = valStr.split('T')[0].split('-').map(Number)
    if (!y || !m || !d) return null
    return new Date(y, m - 1, d)
  }

  const selectedDateObj = parseSelectedDate(value)
  const initialYear = selectedDateObj ? selectedDateObj.getFullYear() : new Date().getFullYear()
  const initialMonth = selectedDateObj ? selectedDateObj.getMonth() : new Date().getMonth()

  const [viewYear, setViewYear] = useState(initialYear)
  const [viewMonth, setViewMonth] = useState(initialMonth)
  const [showCalendarGrid, setShowCalendarGrid] = useState(false)

  const today = new Date()
  const todayFormatted = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const selectedFormatted = value ? value.split('T')[0] : ''

  // Month navigation (Step 1 month at a time)
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear((y) => y - 1)
    } else {
      setViewMonth((m) => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear((y) => y + 1)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  // Generate 7-column Calendar Matrix for viewMonth & viewYear
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay() // 0 = Sun
  const daysInViewMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate()

  // Previous month padding days
  const prevMonthPadding = []
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    prevMonthPadding.push(daysInPrevMonth - i)
  }

  // Current month days (1..daysInViewMonth)
  const currentMonthDays = Array.from({ length: daysInViewMonth }, (_, i) => i + 1)

  // Next month padding days to complete 7-column rows
  const totalCells = prevMonthPadding.length + currentMonthDays.length
  const nextMonthPaddingCount = (7 - (totalCells % 7)) % 7
  const nextMonthPadding = Array.from({ length: nextMonthPaddingCount }, (_, i) => i + 1)

  const handleDayClick = (dayNum) => {
    const formatted = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
    onChange(formatted)
  }

  const setPreset = (daysOffset) => {
    const target = new Date()
    target.setDate(target.getDate() + daysOffset)
    const formatted = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`
    setViewYear(target.getFullYear())
    setViewMonth(target.getMonth())
    onChange(formatted)
  }

  // Format display date string (e.g., "24 Aug 2026")
  const getDisplayDateText = () => {
    if (!selectedDateObj) return 'Select a due date...'
    return `${selectedDateObj.getDate()} ${MONTH_NAMES[selectedDateObj.getMonth()]} ${selectedDateObj.getFullYear()}`
  }

  return (
    <div className="bg-[#161622] border border-[#2A2A38] rounded-2xl p-4 shadow-2xl text-white select-none w-[300px]">
      {/* Date Header Display with Purple Calendar Button */}
      <div className="mb-3">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
          Due Date
        </label>
        <div
          onClick={() => setShowCalendarGrid(!showCalendarGrid)}
          className="w-full bg-[#111118] border border-[#2A2A38] hover:border-purple-500/60 rounded-xl px-3 py-2 flex items-center justify-between cursor-pointer transition-colors"
        >
          <span className={`text-xs font-semibold ${value ? 'text-white' : 'text-gray-400'}`}>
            {getDisplayDateText()}
          </span>
          <div className="w-7 h-7 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300 hover:bg-purple-600 hover:text-white transition-all shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          </div>
        </div>
      </div>

      {/* Expanded 1-Month Separated Calendar Component */}
      {showCalendarGrid && (
        <div className="pt-3 border-t border-[#262636] mb-3 animate-fadeIn">
          {/* Quick Presets */}
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            <button
              type="button"
              onClick={() => setPreset(0)}
              className="py-1 rounded-lg bg-transparent border border-purple-500/40 hover:bg-purple-500/20 text-purple-300 font-semibold text-[10px] transition-colors cursor-pointer"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setPreset(1)}
              className="py-1 rounded-lg bg-transparent border border-purple-500/40 hover:bg-purple-500/20 text-purple-300 font-semibold text-[10px] transition-colors cursor-pointer"
            >
              Tomorrow
            </button>
            <button
              type="button"
              onClick={() => setPreset(7)}
              className="py-1 rounded-lg bg-transparent border border-purple-500/40 hover:bg-purple-500/20 text-purple-300 font-semibold text-[10px] transition-colors cursor-pointer"
            >
              In 7 Days
            </button>
          </div>

          {/* Month & Year Navigation Bar (Separated Month View) */}
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-1">
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="bg-[#111118] border border-[#2A2A38] text-white text-xs font-bold rounded-lg px-2 py-1 outline-none cursor-pointer focus:border-purple-500"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx} className="bg-[#161622] text-white">
                    {name}
                  </option>
                ))}
              </select>
              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="bg-[#111118] border border-[#2A2A38] text-white text-xs font-bold rounded-lg px-1.5 py-1 outline-none cursor-pointer focus:border-purple-500"
              >
                {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => (
                  <option key={y} value={y} className="bg-[#161622] text-white">
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="w-7 h-7 rounded-lg bg-transparent border border-purple-500/40 hover:bg-purple-500/20 text-purple-300 flex items-center justify-center transition-colors text-sm cursor-pointer"
                title="Previous Month"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="w-7 h-7 rounded-lg bg-transparent border border-purple-500/40 hover:bg-purple-500/20 text-purple-300 flex items-center justify-center transition-colors text-sm cursor-pointer"
                title="Next Month"
              >
                ›
              </button>
            </div>
          </div>

          {/* Day Names Row (Sun .. Sat) */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
            {DAY_NAMES.map((d) => (
              <span key={d} className="text-[10px] font-bold text-purple-300/70 uppercase tracking-tight">
                {d}
              </span>
            ))}
          </div>

          {/* 7-Column Days Grid for current viewMonth */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Previous Month Padding */}
            {prevMonthPadding.map((d, idx) => (
              <div key={`prev-${idx}`} className="w-8 h-8 flex items-center justify-center text-[11px] text-gray-600 opacity-25 select-none">
                {d}
              </div>
            ))}

            {/* Current Month Days */}
            {currentMonthDays.map((dayNum) => {
              const formatted = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
              const isSelected = selectedFormatted === formatted
              const isToday = todayFormatted === formatted

              return (
                <button
                  key={dayNum}
                  type="button"
                  onClick={() => handleDayClick(dayNum)}
                  className={`w-8 h-8 rounded-xl text-xs flex items-center justify-center transition-all cursor-pointer ${
                    isSelected
                      ? 'border-2 border-purple-500 text-purple-300 bg-transparent font-bold shadow-sm shadow-purple-500/30'
                      : isToday
                      ? 'border border-purple-400/60 text-purple-200 bg-transparent hover:bg-purple-500/20 font-semibold'
                      : 'hover:bg-white/10 text-gray-200 border border-transparent font-medium'
                  }`}
                >
                  {dayNum}
                </button>
              )
            })}

            {/* Next Month Padding */}
            {nextMonthPadding.map((d, idx) => (
              <div key={`next-${idx}`} className="w-8 h-8 flex items-center justify-center text-[11px] text-gray-600 opacity-25 select-none">
                {d}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Footer Buttons (Purple Border Only, No Background Fill) */}
      <div className="flex items-center gap-2 pt-3 border-t border-[#262636]">
        <button
          type="button"
          onClick={onSave}
          className="flex-1 py-2 bg-transparent border-2 border-purple-500 hover:bg-purple-500/20 text-purple-300 font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-sm shadow-purple-500/20"
        >
          Save Date
        </button>
        {value && (
          <button
            type="button"
            onClick={onRemove}
            className="px-3 py-2 bg-transparent border border-red-500/50 hover:bg-red-500/20 text-red-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  )
}
