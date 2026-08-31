// src/components/board/BackgroundPickerModal.jsx
import { useState, useMemo } from 'react'
import { getAutoDiscoveredBackgrounds, GRADIENTS_CATEGORY } from '../../utils/backgrounds'

function BackgroundPickerModal({ currentBackground, onSelectBackground, onClose }) {
  const backgroundsMap = useMemo(() => getAutoDiscoveredBackgrounds(), [])
  const categories = useMemo(() => Object.keys(backgroundsMap), [backgroundsMap])

  const [activeCategory, setActiveCategory] = useState(categories[0] || GRADIENTS_CATEGORY)
  const [customUrl, setCustomUrl] = useState('')

  const [testingUrl, setTestingUrl] = useState(false)
  const [urlError, setUrlError] = useState('')

  const activeItems = backgroundsMap[activeCategory] || []

  const handleApplyCustomUrl = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setUrlError('')

    const trimmed = customUrl.trim()
    if (!trimmed) return

    let cleanUrl = trimmed
    if (trimmed.startsWith('url(')) {
      const match = trimmed.match(/^url\(["']?(.*?)["']?\)$/)
      if (match && match[1]) cleanUrl = match[1]
    } else if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('/')) {
      cleanUrl = `https://${trimmed}`
    }

    setTestingUrl(true)

    // Pre-test image loading before setting background
    const img = new Image()
    img.onload = () => {
      setTestingUrl(false)
      const finalBgValue = `url("${cleanUrl}")`
      onSelectBackground(finalBgValue)
      setCustomUrl('')
      if (onClose) onClose()
    }

    img.onerror = () => {
      setTestingUrl(false)
      setUrlError('Failed to load image URL. Please check the link and try again.')
    }

    img.src = cleanUrl
  }

  return (
    <div className="bg-[#1C1C26] border border-[#2A2A38] rounded-2xl p-5 shadow-2xl w-[460px] sm:w-[500px] max-w-[92vw] animate-fadeIn text-white select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#2A2A38] pb-3.5 mb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
          <span className="font-bold text-xs uppercase tracking-wider text-white">Board Backgrounds</span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white text-sm font-bold transition-colors cursor-pointer px-1.5 py-0.5 rounded-lg hover:bg-white/10"
          >
            ✕
          </button>
        )}
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-3.5 scrollbar-thin">
        {categories.map((cat) => {
          const isActive = cat === activeCategory
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 border border-purple-400/40 font-bold'
                  : 'bg-[#121218] text-gray-400 hover:text-white border border-[#2A2A38] hover:border-gray-500'
              }`}
            >
              {cat}
            </button>
          )
        })}
      </div>

      {/* Thumbnails Grid */}
      <div className="grid grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-1">
        {activeItems.map((item) => {
          const isSelected = currentBackground === item.value || (item.type === 'image' && currentBackground?.includes(item.rawUrl))

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectBackground(item.value)}
              className={`group relative h-28 rounded-xl overflow-hidden transition-all cursor-pointer flex items-center justify-center ${
                isSelected
                  ? 'border-2 border-purple-500 shadow-md shadow-purple-500/30'
                  : 'border border-[#2A2A38] hover:border-purple-400/60 hover:scale-[1.02]'
              }`}
              title={item.name}
            >
              {item.type === 'gradient' ? (
                <div className="w-full h-full" style={{ background: item.value }} />
              ) : (
                <img
                  src={item.thumbnail}
                  alt={item.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              )}

              {/* Selected Checkmark Badge (Top Right) */}
              {isSelected && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-purple-600 text-white text-[9px] font-bold flex items-center justify-center shadow-lg border border-white/40 z-10">
                  ✓
                </span>
              )}

              {/* Minimal Bottom Overlay for Text Readability - Only for Vibrant Gradients */}
              {(item.type === 'gradient' || activeCategory === GRADIENTS_CATEGORY) && (
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-1.5 pt-4 text-left">
                  <span className="text-[11px] font-medium text-white truncate drop-shadow block leading-tight">
                    {item.name}
                  </span>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Custom Image URL Form */}
      <form onSubmit={handleApplyCustomUrl} className="mt-3.5 pt-3.5 border-t border-[#2A2A38] flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={customUrl}
            onChange={(e) => {
              setCustomUrl(e.target.value)
              if (urlError) setUrlError('')
            }}
            placeholder="Paste custom image URL..."
            className={`flex-1 min-w-0 bg-[#121218] border ${
              urlError ? 'border-red-500/80' : 'border-[#2A2A38] focus:border-purple-500'
            } rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 outline-none transition-all`}
          />
          <button
            type="submit"
            disabled={!customUrl.trim() || testingUrl}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-xs font-semibold text-white transition-all cursor-pointer shrink-0"
          >
            {testingUrl ? 'Testing...' : 'Apply'}
          </button>
        </div>

        {urlError && (
          <div className="text-[11px] font-medium text-red-300 bg-red-500/10 border border-red-500/30 px-3 py-2 rounded-xl flex items-center gap-2 animate-fadeIn">
            <svg className="w-4 h-4 text-red-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>{urlError}</span>
          </div>
        )}
      </form>
    </div>
  )
}

export default BackgroundPickerModal
