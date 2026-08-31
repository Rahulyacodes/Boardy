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

          {/* Boards Grid & Left Create Card */}
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

          {/* Borderless Centered Empty State (Rendered when 0 boards exist) */}
          {!loading && boards.length === 0 && (
            <div className="flex flex-col items-center justify-center py-6 px-4 text-center mt-2 mb-10 -translate-y-4">
              {showForm ? (
                <form
                  onSubmit={handleCreateBoard}
                  className="w-full max-w-sm bg-[#161622] border border-[#2B2C3A] rounded-3xl p-6 shadow-2xl flex flex-col gap-4 text-left"
                >
                  <h3 className="text-base font-bold text-white mb-1">Create Your First Board</h3>
                  <input
                    autoFocus
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Enter board title..."
                    className="w-full px-3.5 py-2.5 bg-[#1C1C28] border border-purple-500/50 rounded-xl text-xs text-white placeholder-gray-500 outline-none focus:border-purple-500 shadow-inner"
                  />

                  {/* Theme picker */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowBgModal(true)}
                      className="w-full flex items-center justify-start px-3 py-2 rounded-xl border border-white/10 text-xs font-semibold text-gray-200 hover:border-purple-500 transition-all cursor-pointer"
                      style={{
                        ...formatBackgroundStyle(selectedGradient)
                      }}
                    >
                      <span className="drop-shadow bg-black/50 px-2 py-0.5 rounded-md">Explore options</span>
                    </button>
                  </div>

                  <div className="flex gap-2.5 mt-2">
                    <button
                      type="submit"
                      disabled={creating}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white transition-colors cursor-pointer"
                    >
                      {creating ? 'Creating...' : 'Create Board'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false)
                        setNewTitle('')
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-col items-center justify-center max-w-md mx-auto">
                  {/* SVG Vector Graphic Icon (+10% size) */}
                  <div className="w-16 h-16 rounded-2xl bg-purple-600/15 border border-purple-500/35 flex items-center justify-center text-purple-400 mb-5 shadow-xl shadow-purple-500/10">
                    <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2m0 10V7m6 10a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2v10a2 2 0 002 2h2z" />
                    </svg>
                  </div>

                  <h3 className="font-bold text-2xl text-white mb-2.5 tracking-tight">
                    No boards created yet
                  </h3>
                  <p className="text-[13px] text-gray-400 max-w-md mb-7 leading-relaxed">
                    Create your first workspace board to organize tasks, manage projects, and collaborate with your team.
                  </p>

                  <button
                    onClick={() => setShowForm(true)}
                    className="px-5.5 py-2.5 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-purple-500/25 transition-all flex items-center gap-2 cursor-pointer hover:scale-105"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Create Board</span>
                  </button>
                </div>
              )}
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