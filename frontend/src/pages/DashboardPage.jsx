// src/pages/DashboardPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getBoards, createBoard } from '../api'
import Navbar from '../components/layout/Navbar'
import BottomDock from '../components/layout/BottomDock'
import PlannerView from '../components/board/PlannerView'
import { GRADIENT_PRESETS } from '../components/layout/BoardNavbar'

function DashboardPage() {
  const [boards, setBoards] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [selectedGradient, setSelectedGradient] = useState(GRADIENT_PRESETS[0].value)
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
        <div className="max-w-6xl mx-auto w-full px-6 py-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                Your Boards
              </h2>
              <p className="text-xs text-gray-400 mt-1">Select a board or create a new workspace</p>
            </div>

            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg transition-all flex items-center gap-2 hover:scale-105"
              style={{
                backgroundColor: 'var(--color-accent-purple)',
                color: 'white',
              }}
            >
              <span className="text-base font-bold">+</span>
              <span>Create New Board</span>
            </button>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-16 text-sm text-gray-400">
              Loading your boards...
            </div>
          )}

          {/* Boards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {boards.map((board) => (
              <div
                key={board._id}
                onClick={() => navigate(`/board/${board._id}`)}
                className="rounded-2xl p-4 cursor-pointer transition-all hover:scale-[1.03] hover:shadow-2xl border border-white/10 flex flex-col justify-between group"
                style={{
                  background: board.background || 'linear-gradient(135deg, #7C6FF7, #4ECDC4)',
                  minHeight: '130px'
                }}
              >
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-white text-base drop-shadow-md group-hover:underline">
                    {board.title}
                  </h3>
                  {board.isStarred && (
                    <span className="bg-black/30 p-1 rounded-full text-xs" title="Starred">
                      ⭐
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-white/80 font-medium">
                  <span>Open board →</span>
                </div>
              </div>
            ))}

            {/* Create New Board Form / Card */}
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

                {/* Theme picker */}
                <div>
                  <span className="text-[10px] text-gray-400 font-semibold mb-1 block">Theme:</span>
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {GRADIENT_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => setSelectedGradient(preset.value)}
                        className={`w-6 h-6 rounded-full border border-white/30 flex-shrink-0 transition-transform ${
                          selectedGradient === preset.value ? 'scale-125 ring-2 ring-purple-500' : ''
                        }`}
                        style={{ background: preset.value }}
                        title={preset.name}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 mt-1">
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors"
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
                    className="flex-1 py-1.5 rounded-lg text-xs font-medium"
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

          {/* Empty state */}
          {!loading && boards.length === 0 && (
            <div className="text-center py-20 bg-[#1C1C24]/50 border border-[#2A2A35] rounded-3xl mt-6">
              <p className="text-5xl mb-4">✨</p>
              <p className="font-bold text-lg mb-1" style={{ color: 'var(--color-text-primary)' }}>
                No boards created yet
              </p>
              <p className="text-xs text-gray-400 mb-6">Create your first board to start managing tasks</p>
              <button
                onClick={() => setShowForm(true)}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-purple-600 text-white shadow-lg hover:bg-purple-700 transition-all"
              >
                + Create Board
              </button>
            </div>
          )}
        </div>
      )}

      {/* Floating Bottom Navigation Dock */}
      <BottomDock activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  )
}

export default DashboardPage