// src/components/layout/BottomDock.jsx
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getBoards, createBoard } from '../../api'
import { GRADIENT_PRESETS } from './BoardNavbar'
import BackgroundPickerModal from '../board/BackgroundPickerModal'
import { formatBackgroundStyle, DEFAULT_BACKGROUND, getNextDefaultBackground } from '../../utils/backgrounds'

function BottomDock({ activeTab = 'board', setActiveTab }) {
  const navigate = useNavigate()
  const { boardId } = useParams()

  const [boardsModalOpen, setBoardsModalOpen] = useState(false)
  const [boards, setBoards] = useState([])
  const [loading, setLoading] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [selectedGradient, setSelectedGradient] = useState(DEFAULT_BACKGROUND)
  const [userSelectedBg, setUserSelectedBg] = useState(false)
  const [showBgModal, setShowBgModal] = useState(false)
  const [createError, setCreateError] = useState('')

  useEffect(() => {
    if (boardsModalOpen) {
      fetchBoards()
    }
  }, [boardsModalOpen])

  const fetchBoards = async () => {
    setLoading(true)
    try {
      const res = await getBoards()
      setBoards(res.data)
      if (!userSelectedBg) {
        setSelectedGradient(getNextDefaultBackground(res.data.length))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenRecentBoard = async () => {
    if (setActiveTab) setActiveTab('board')
    if (boardId) return // Already on a board page

    // Fetch user boards and navigate to recent
    try {
      const res = await getBoards()
      if (res.data.length > 0) {
        navigate(`/board/${res.data[0]._id}`)
      } else {
        setBoardsModalOpen(true)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleOpenCreateForm = () => {
    if (!userSelectedBg) {
      setSelectedGradient(getNextDefaultBackground(boards.length))
    }
    setShowCreateForm(true)
  }

  const handleCreateBoard = async (e) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    setCreateError('')
    const bgToUse = userSelectedBg ? selectedGradient : getNextDefaultBackground(boards.length)
    try {
      const res = await createBoard({
        title: newTitle.trim(),
        background: bgToUse
      })
      setNewTitle('')
      setShowCreateForm(false)
      setBoardsModalOpen(false)
      setUserSelectedBg(false)
      if (setActiveTab) setActiveTab('board')
      navigate(`/board/${res.data._id}`)
    } catch (err) {
      console.error(err)
      setCreateError(err.response?.data?.message || err.response?.data?.error || 'Failed to create board')
    }
  }

  return (
    <>
      {/* Floating Bottom Pill Dock */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#141419]/90 backdrop-blur-xl border border-white/15 rounded-2xl p-1.5 shadow-2xl flex items-center gap-1.5 text-xs font-semibold text-white transition-all">
        {/* 1. Planner */}
        <button
          onClick={() => {
            if (setActiveTab) setActiveTab('planner')
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all cursor-pointer ${
            activeTab === 'planner'
              ? 'border-purple-500 text-purple-300 bg-transparent font-bold shadow-sm shadow-purple-500/20'
              : 'border-transparent hover:bg-white/10 text-gray-300'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>Planner</span>
        </button>

        {/* 2. Board */}
        <button
          onClick={handleOpenRecentBoard}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all cursor-pointer ${
            activeTab === 'board'
              ? 'border-purple-500 text-purple-300 bg-transparent font-bold shadow-sm shadow-purple-500/20'
              : 'border-transparent hover:bg-white/10 text-gray-300'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2m0 10V7m6 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
          <span>Board</span>
        </button>

        {/* 3. Switch boards */}
        <button
          onClick={() => setBoardsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-transparent hover:bg-white/10 text-gray-300 transition-all cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" />
          </svg>
          <span>Switch boards</span>
        </button>
      </div>

      {/* Switch Boards Modal */}
      {boardsModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#1C1C24] border border-[#2A2A35] rounded-2xl w-full max-w-xl p-6 shadow-2xl text-white">
            <div className="flex items-center justify-between mb-6 border-b border-[#2A2A35] pb-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <h3 className="text-lg font-bold">Your Boards</h3>
              </div>
              <button
                onClick={() => {
                  setBoardsModalOpen(false)
                  setShowCreateForm(false)
                }}
                className="text-gray-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            {loading ? (
              <p className="text-sm text-gray-400 text-center py-8">Loading boards...</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1 mb-4">
                {boards.map((b) => {
                  const bgStyle = formatBackgroundStyle(b.background || 'linear-gradient(135deg, #7C6FF7, #4ECDC4)')
                  return (
                    <div
                      key={b._id}
                      onClick={() => {
                        setBoardsModalOpen(false)
                        if (setActiveTab) setActiveTab('board')
                        navigate(`/board/${b._id}`)
                      }}
                      className={`rounded-xl p-4 cursor-pointer transition-all hover:scale-[1.02] border relative overflow-hidden flex flex-col justify-between ${
                        b._id === boardId ? 'border-purple-500 ring-2 ring-purple-500/50' : 'border-white/10'
                      }`}
                      style={{
                        ...bgStyle,
                        minHeight: '90px'
                      }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20 pointer-events-none" />
                      <div className="flex justify-between items-start relative z-10">
                        <h4 className="font-bold text-white drop-shadow text-sm">{b.title}</h4>
                        {b.isStarred && <span className="text-amber-300 text-xs">⭐</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Create New Board Inline Form or Trigger */}
            {showCreateForm ? (
              <form onSubmit={handleCreateBoard} className="bg-[#121218] border border-[#2A2A35] rounded-xl p-4 text-xs">
                <h4 className="font-semibold text-gray-200 mb-2">Create New Board</h4>
                <input
                  type="text"
                  autoFocus
                  placeholder="Board title..."
                  value={newTitle}
                  onChange={(e) => {
                    setNewTitle(e.target.value)
                    if (createError) setCreateError('')
                  }}
                  className="w-full bg-[#1C1C24] border border-[#2A2A35] rounded-lg px-3 py-2 text-white mb-2 focus:outline-none focus:border-purple-500"
                />

                {createError && (
                  <div className="text-[11px] font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-2.5 py-1.5 mb-3">
                    {createError}
                  </div>
                )}

                <div className="mb-3">
                  <label className="block text-gray-400 mb-1.5 font-medium">Select Background:</label>
                  <button
                    type="button"
                    onClick={() => setShowBgModal(true)}
                    className="w-full flex items-center justify-start px-3 py-2 rounded-xl border border-white/10 text-xs font-semibold text-gray-200 hover:border-purple-500 transition-all cursor-pointer overflow-hidden relative"
                    style={{
                      ...formatBackgroundStyle(selectedGradient)
                    }}
                  >
                    <div className="absolute inset-0 bg-black/40 pointer-events-none" />
                    <span className="relative z-10 drop-shadow bg-black/50 px-2 py-0.5 rounded-md">Explore options</span>
                  </button>
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 font-semibold text-white"
                  >
                    Create
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={handleOpenCreateForm}
                className="w-full py-2.5 rounded-xl border border-dashed border-[#3A3A4A] hover:border-purple-500 text-gray-300 hover:text-white flex items-center justify-center gap-2 transition-colors text-xs font-semibold"
              >
                <span>+ Create New Board</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Background Picker Modal Overlay */}
      {showBgModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowBgModal(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <BackgroundPickerModal
              currentBackground={selectedGradient}
              onSelectBackground={(bg) => {
                setSelectedGradient(bg)
                setUserSelectedBg(true)
                setShowBgModal(false)
              }}
              onClose={() => setShowBgModal(false)}
            />
          </div>
        </div>
      )}
    </>
  )
}

export default BottomDock
