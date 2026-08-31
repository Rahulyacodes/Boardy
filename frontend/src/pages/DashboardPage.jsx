// src/pages/DashboardPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getBoards, createBoard } from '../api'
import Navbar from '../components/layout/Navbar'
import BottomDock from '../components/layout/BottomDock'
import PlannerView from '../components/board/PlannerView'
import { GRADIENT_PRESETS } from '../components/layout/BoardNavbar'
import BackgroundPickerModal from '../components/board/BackgroundPickerModal'
import { formatBackgroundStyle, DEFAULT_BACKGROUND } from '../utils/backgrounds'

function DashboardPage() {
  const [boards, setBoards] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [selectedGradient, setSelectedGradient] = useState(DEFAULT_BACKGROUND)
  const [showBgModal, setShowBgModal] = useState(false)
  const [creating, setCreating] = useState(false)

  // Floating dock tab switcher: 'board' or 'planner'
  const [activeTab, setActiveTab] = useState('board')

  const navigate = useNavigate()

  useEffect(() => {
    getBoards()
      .then((res) => setBoards(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  const handleCreateBoard = async (e) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    setCreating(true)

    try {
      const res = await createBoard({
        title: newTitle.trim(),
        background: selectedGradient
      })
      setBoards((prev) => [res.data, ...prev])
      setNewTitle('')
      setShowForm(false)
    } catch (err) {
      console.error(err)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col pb-24" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <Navbar />

      {activeTab === 'planner' ? (
        <PlannerView
          onOpenBoard={(targetBoardId) => {
            navigate(`/board/${targetBoardId}`)
          }}
        />
      ) : (
        <div className="max-w-6xl mx-auto w-full px-6 py-8 flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                Your Boards
              </h2>
              <p className="text-xs text-gray-400 mt-1">Select a board or create a new workspace</p>
            </div>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-20 text-sm text-gray-400">
              Loading your boards...
            </div>
          )}

          {/* Boards Grid & Create Card */}
          {!loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {boards.map((board) => {
                const bgStyle = formatBackgroundStyle(board.background || 'linear-gradient(135deg, #7C6FF7, #4ECDC4)')
                return (
                  <div
                    key={board._id}
                    onClick={() => navigate(`/board/${board._id}`)}
                    className="rounded-2xl p-4 cursor-pointer transition-all hover:scale-[1.03] hover:shadow-2xl border border-white/10 flex flex-col justify-between group relative overflow-hidden"
                    style={{
                      ...bgStyle,
                      minHeight: '130px'
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20 pointer-events-none" />
                    <div className="flex justify-between items-start relative z-10">
                      <h3 className="font-bold text-white text-base drop-shadow-md group-hover:underline">
                        {board.title}
                      </h3>
                      {board.isStarred && (
                        <span className="bg-black/40 p-1.5 rounded-lg text-amber-300 backdrop-blur-md border border-amber-500/30 shadow-sm" title="Starred">
                          <svg className="w-3.5 h-3.5 fill-amber-400 text-amber-400" viewBox="0 0 24 24">
                            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                          </svg>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-white/90 font-medium relative z-10 drop-shadow">
                      <span>Open board →</span>
                    </div>
                  </div>
                )
              })}

              {/* Create New Board Form / Left Card */}
              {showForm ? (
                <form
                  onSubmit={handleCreateBoard}
                  className="rounded-2xl p-4 flex flex-col gap-3 border border-[#2A2A35]"
                  style={{
                    backgroundColor: 'var(--color-bg-surface)',
                    minHeight: '130px'
                  }}
                >
                  <input
                    autoFocus
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Board title..."
                    className="w-full px-3 py-2 rounded-xl text-xs outline-none border focus:border-purple-500"
                    style={{
                      backgroundColor: 'var(--color-bg-primary)',
                      borderColor: 'var(--color-bg-border)',
                      color: 'var(--color-text-primary)',
                    }}
                  />

                  {/* Theme picker trigger button */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowBgModal(true)}
                      className="w-full flex items-center justify-start px-3 py-1.5 rounded-xl border border-white/10 text-xs font-semibold text-gray-200 hover:border-purple-500 transition-all cursor-pointer"
                      style={{
                        ...formatBackgroundStyle(selectedGradient)
                      }}
                    >
                      <span className="drop-shadow bg-black/50 px-2 py-0.5 rounded-md">Explore options</span>
                    </button>
                  </div>

                  <div className="flex gap-2 mt-1">
                    <button
                      type="submit"
                      disabled={creating}
                      className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      style={{ backgroundColor: 'var(--color-accent-purple)', color: 'white' }}
                    >
                      {creating ? 'Creating...' : 'Create'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false)
                        setNewTitle('')
                      }}
                      className="flex-1 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
                      style={{
                        backgroundColor: 'var(--color-bg-primary)',
                        border: '1px solid var(--color-bg-border)',
                        color: 'var(--color-text-muted)'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div
                  onClick={() => setShowForm(true)}
                  className="rounded-2xl p-4 cursor-pointer transition-all flex flex-col items-center justify-center gap-2 border border-dashed border-[#2A2A35] hover:border-purple-500/80 hover:bg-[#1C1C24]"
                  style={{
                    backgroundColor: 'var(--color-bg-surface)',
                    minHeight: '130px',
                    color: 'var(--color-text-muted)'
                  }}
                >
                  <span className="text-2xl font-light text-purple-400">+</span>
                  <span className="text-xs font-semibold">Create new board</span>
                </div>
              )}
            </div>
          )}

          {/* Integrated Screen Text (No boxes, no borders, no emojis) */}
          {!loading && (
            <div className="mt-20 text-center flex-1 flex flex-col items-center justify-center">
              {boards.length === 0 ? (
                <p className="text-base font-medium text-gray-400">
                  Create your workspace
                </p>
              ) : boards.some((b) => b.title === 'Your 1st Board') ? (
                <p className="text-sm font-medium text-gray-400">
                  <span className="text-purple-400 font-semibold">Your 1st Board is right here</span> — you can edit it or create a new one
                </p>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* Floating Bottom Navigation Dock */}
      <BottomDock activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Background Picker Modal Overlay */}
      {showBgModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowBgModal(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <BackgroundPickerModal
              currentBackground={selectedGradient}
              onSelectBackground={(bg) => {
                setSelectedGradient(bg)
                setShowBgModal(false)
              }}
              onClose={() => setShowBgModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default DashboardPage