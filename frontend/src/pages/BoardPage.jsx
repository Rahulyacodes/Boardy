import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getBoard,
  createList,
  deleteList,
  renameList,
  createCard,
  deleteCard,
  updateCard,
  moveCard
} from '../api'
import Navbar from '../components/layout/Navbar'
import BoardNavbar from '../components/layout/BoardNavbar'
import BottomDock from '../components/layout/BottomDock'
import PlannerView from '../components/board/PlannerView'
import CardDetailModal from '../components/board/CardDetailModal'

function BoardPage() {
  const { boardId } = useParams()
  const navigate = useNavigate()

  const [board, setBoard] = useState(null)
  const [loading, setLoading] = useState(true)

  // Floating dock tab: 'board' or 'planner'
  const [activeTab, setActiveTab] = useState('board')

  // Adding new list state
  const [isAddingList, setIsAddingList] = useState(false)
  const [newListTitle, setNewListTitle] = useState('')
  const [addingListLoading, setAddingListLoading] = useState(false)

  // Adding new card state per list (map of listId -> boolean / string)
  const [addingCardForList, setAddingCardForList] = useState(null)
  const [newCardTitle, setNewCardTitle] = useState('')

  // Renaming list state
  const [editingListId, setEditingListId] = useState(null)
  const [editingListTitle, setEditingListTitle] = useState('')

  // Editing card modal/inline state
  const [editingCard, setEditingCard] = useState(null)
  const [editCardTitle, setEditCardTitle] = useState('')

  // Drag and Drop state
  const [draggedCard, setDraggedCard] = useState(null)
  const [dragOverListId, setDragOverListId] = useState(null)

  const fetchBoardData = async () => {
    try {
      const res = await getBoard(boardId)
      setBoard(res.data)
    } catch (err) {
      console.error('Error fetching board:', err)
      if (err.response?.status === 404) {
        navigate('/')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (boardId) {
      fetchBoardData()
    }
  }, [boardId])

  // Board update handler from BoardNavbar
  const handleBoardUpdate = (updatedBoardData) => {
    setBoard((prev) => ({ ...prev, ...updatedBoardData }))
  }

  // List Handlers
  const handleCreateList = async (e) => {
    e.preventDefault()
    if (!newListTitle.trim()) return
    setAddingListLoading(true)
    try {
      await createList(boardId, { title: newListTitle.trim() })
      setNewListTitle('')
      setIsAddingList(false)
      fetchBoardData()
    } catch (err) {
      console.error(err)
    } finally {
      setAddingListLoading(false)
    }
  }

  const handleDeleteList = async (listId, listTitle) => {
    if (!window.confirm(`Delete list "${listTitle}" and all its cards?`)) return
    try {
      await deleteList(listId)
      fetchBoardData()
    } catch (err) {
      console.error(err)
    }
  }

  const handleSaveRenameList = async (listId) => {
    if (!editingListTitle.trim()) {
      setEditingListId(null)
      return
    }
    try {
      await renameList(listId, { title: editingListTitle.trim() })
      setEditingListId(null)
      fetchBoardData()
    } catch (err) {
      console.error(err)
    }
  }

  // Card Handlers
  const handleCreateCard = async (listId, e) => {
    e.preventDefault()
    if (!newCardTitle.trim()) return
    try {
      await createCard(listId, { title: newCardTitle.trim() })
      setNewCardTitle('')
      setAddingCardForList(null)
      fetchBoardData()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDeleteCard = async (cardId) => {
    try {
      await deleteCard(cardId)
      fetchBoardData()
    } catch (err) {
      console.error(err)
    }
  }

  const handleUpdateCard = async (e) => {
    e.preventDefault()
    if (!editingCard || !editCardTitle.trim()) return
    try {
      await updateCard(editingCard._id, { title: editCardTitle.trim() })
      setEditingCard(null)
      fetchBoardData()
    } catch (err) {
      console.error(err)
    }
  }

  // Drag and Drop Event Handlers
  const handleDragStart = (e, card, sourceListId) => {
    setDraggedCard({ cardId: card._id, sourceListId })
    e.dataTransfer.setData('text/plain', JSON.stringify({ cardId: card._id, sourceListId }))
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, targetListId) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverListId !== targetListId) {
      setDragOverListId(targetListId)
    }
  }

  const handleDragLeave = (e, listId) => {
    if (dragOverListId === listId) {
      setDragOverListId(null)
    }
  }

  const handleDrop = (e, targetListId) => {
    e.preventDefault()
    setDragOverListId(null)

    let cardId = draggedCard?.cardId
    let sourceListId = draggedCard?.sourceListId

    const dataRaw = e.dataTransfer.getData('text/plain')
    if (dataRaw) {
      try {
        const parsed = JSON.parse(dataRaw)
        if (parsed.cardId) cardId = parsed.cardId
        if (parsed.sourceListId) sourceListId = parsed.sourceListId
      } catch (err) {}
    }

    if (!cardId || sourceListId === targetListId) {
      setDraggedCard(null)
      return
    }

    // Optimistically update board state
    setBoard((prevBoard) => {
      if (!prevBoard) return prevBoard

      let movedCard = null
      const listsWithCardRemoved = prevBoard.lists.map((list) => {
        if (list._id === sourceListId) {
          movedCard = list.cards.find((c) => c._id === cardId)
          return {
            ...list,
            cards: list.cards.filter((c) => c._id !== cardId)
          }
        }
        return list
      })

      if (!movedCard) return prevBoard

      return {
        ...prevBoard,
        lists: listsWithCardRemoved.map((list) => {
          if (list._id === targetListId) {
            return {
              ...list,
              cards: [...list.cards, { ...movedCard, listId: targetListId }]
            }
          }
          return list
        })
      }
    })

    setDraggedCard(null)

    // Sync card position move to backend API
    moveCard(cardId, { newListId: targetListId }).catch((err) => {
      console.error('Error syncing card move:', err)
      fetchBoardData() // Revert local state on error
    })
  }

  // Fallback default gradient
  const boardBg = board?.background || 'linear-gradient(135deg, #8B3A1C 0%, #E66820 40%, #1D1D2B 100%)'

  return (
    <div
      className="min-h-screen flex flex-col transition-all duration-500 bg-cover bg-center relative select-none"
      style={{ background: boardBg }}
    >
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] pointer-events-none" />

      {/* Main Top Navbar */}
      <Navbar />

      {/* Board Specific Navbar */}
      <BoardNavbar board={board} onBoardUpdate={handleBoardUpdate} />

      {/* Content Body */}
      {activeTab === 'planner' ? (
        <div className="relative z-10 flex-1">
          <PlannerView />
        </div>
      ) : loading ? (
        <div className="flex-1 flex items-center justify-center relative z-10">
          <div className="bg-black/40 backdrop-blur-md px-6 py-4 rounded-xl text-white font-medium text-sm flex items-center gap-3">
            <svg className="w-5 h-5 animate-spin text-purple-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Loading Board...
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto p-6 relative z-10">
          <div className="flex items-start gap-4 pb-24 min-h-[calc(100vh-140px)]">
            {/* List Columns */}
            {board?.lists?.map((list) => {
              const cardCount = list.cards ? list.cards.length : 0
              const isDragOver = dragOverListId === list._id

              return (
                <div
                  key={list._id}
                  onDragOver={(e) => handleDragOver(e, list._id)}
                  onDragLeave={(e) => handleDragLeave(e, list._id)}
                  onDrop={(e) => handleDrop(e, list._id)}
                  className={`bg-[#141419]/85 backdrop-blur-xl border rounded-2xl p-3.5 w-72 shrink-0 flex flex-col shadow-2xl transition-all ${
                    isDragOver
                      ? 'border-purple-500 ring-2 ring-purple-500/50 bg-[#1A1A26]/95 scale-[1.01]'
                      : 'border-white/10'
                  }`}
                >
                  {/* List Header */}
                  <div className="flex items-center justify-between px-1 py-1 mb-2 text-white">
                    {editingListId === list._id ? (
                      <input
                        type="text"
                        autoFocus
                        value={editingListTitle}
                        onChange={(e) => setEditingListTitle(e.target.value)}
                        onBlur={() => handleSaveRenameList(list._id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRenameList(list._id)
                          if (e.key === 'Escape') setEditingListId(null)
                        }}
                        className="bg-black/50 border border-purple-500 rounded px-2 py-1 text-xs text-white focus:outline-none font-semibold w-full"
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <h3
                          onClick={() => {
                            setEditingListId(list._id)
                            setEditingListTitle(list.title)
                          }}
                          className="font-bold text-sm text-gray-100 cursor-pointer hover:text-purple-300 transition-colors"
                          title="Click to rename"
                        >
                          {list.title}
                        </h3>
                        {/* Card Count Badge */}
                        <span className="text-xs text-gray-400 font-semibold px-1.5 py-0.5 rounded bg-white/10">
                          {cardCount}
                        </span>
                      </div>
                    )}

                    {/* Quick List Action Icons */}
                    <div className="flex items-center gap-1 text-gray-400 text-xs">
                      <button
                        onClick={() => handleDeleteList(list._id, list.title)}
                        className="p-1 hover:text-red-400 hover:bg-white/10 rounded transition-colors"
                        title="Delete list"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* List Cards Container */}
                  <div className="flex-1 overflow-y-auto max-h-[calc(100vh-280px)] space-y-2 pr-0.5 min-h-[40px]">
                    {list.cards?.map((card) => {
                      const isBeingDragged = draggedCard?.cardId === card._id
                      const hasLabels = card.labels && card.labels.length > 0
                      const hasChecklist = card.checklist && card.checklist.length > 0
                      const completedChecklist = hasChecklist ? card.checklist.filter((c) => c.completed).length : 0

                      return (
                        <div
                          key={card._id}
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, card, list._id)}
                          onDragEnd={() => {
                            setDraggedCard(null)
                            setDragOverListId(null)
                          }}
                          onClick={() => setEditingCard({ ...card, listTitle: list.title })}
                          className={`group relative bg-[#22222B]/90 hover:bg-[#2A2A36] border border-white/10 hover:border-purple-500/40 rounded-xl p-3 text-xs text-gray-100 shadow-md transition-all cursor-grab active:cursor-grabbing ${
                            isBeingDragged ? 'opacity-30 scale-95 border-dashed border-purple-400' : ''
                          }`}
                        >
                          {/* Mini Color Label Chips */}
                          {hasLabels && (
                            <div className="flex flex-wrap gap-1 mb-1.5">
                              {card.labels.map((l, i) => (
                                <span
                                  key={i}
                                  className="h-1.5 w-6 rounded-full inline-block shadow-sm"
                                  style={{ background: l.color }}
                                  title={l.name || 'Label'}
                                />
                              ))}
                            </div>
                          )}

                          {/* Card Title & Hover Delete Action */}
                          <div className="flex justify-between items-start">
                            <span className="font-medium text-gray-200 leading-snug">{card.title}</span>
                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteCard(card._id)
                                }}
                                className="text-gray-400 hover:text-red-400 p-0.5"
                                title="Delete card"
                              >
                                ✕
                              </button>
                            </div>
                          </div>

                          {/* Badges Footer: Due Date & Checklist Progress */}
                          {(card.dueDate || hasChecklist) && (
                            <div className="flex items-center gap-2 mt-2 pt-1 border-t border-white/5 text-[10px] text-gray-400 font-medium">
                              {card.dueDate && (
                                <span className="flex items-center gap-1 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-gray-300">
                                  🕒 {card.dueDate}
                                </span>
                              )}
                              {hasChecklist && (
                                <span className={`flex items-center gap-1 rounded px-1.5 py-0.5 ${
                                  completedChecklist === card.checklist.length ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-white/5 border border-white/10 text-gray-300'
                                }`}>
                                  ☑ {completedChecklist}/{card.checklist.length}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Add a Card option per list */}
                  <div className="mt-2 pt-1 border-t border-white/5">
                    {addingCardForList === list._id ? (
                      <form onSubmit={(e) => handleCreateCard(list._id, e)} className="mt-1">
                        <textarea
                          autoFocus
                          placeholder="Enter a title for this card..."
                          value={newCardTitle}
                          onChange={(e) => setNewCardTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault()
                              handleCreateCard(list._id, e)
                            }
                          }}
                          className="w-full bg-[#181820] border border-purple-500/60 rounded-xl p-2.5 text-xs text-white placeholder-gray-500 focus:outline-none resize-none mb-2 shadow-inner"
                          rows={2}
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="submit"
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded-lg text-xs font-semibold text-white transition-colors"
                          >
                            Add Card
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAddingCardForList(null)
                              setNewCardTitle('')
                            }}
                            className="text-gray-400 hover:text-white text-xs px-2 py-1"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        onClick={() => {
                          setAddingCardForList(list._id)
                          setNewCardTitle('')
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-gray-300 hover:text-white transition-all text-xs font-medium"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-gray-400">+</span>
                          <span>Add a card</span>
                        </div>
                        <svg className="w-3.5 h-3.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              )
            })}

            {/* + Add Another List Option */}
            <div className="w-72 shrink-0">
              {isAddingList ? (
                <form
                  onSubmit={handleCreateList}
                  className="bg-[#141419]/90 backdrop-blur-xl border border-white/15 rounded-2xl p-3.5 text-xs text-white shadow-2xl"
                >
                  <input
                    type="text"
                    autoFocus
                    placeholder="Enter list title..."
                    value={newListTitle}
                    onChange={(e) => setNewListTitle(e.target.value)}
                    className="w-full bg-[#181820] border border-purple-500/60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none mb-3"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={addingListLoading}
                      className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold text-xs text-white transition-colors"
                    >
                      {addingListLoading ? 'Adding...' : 'Add list'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingList(false)
                        setNewListTitle('')
                      }}
                      className="text-gray-400 hover:text-white text-xs px-2 py-1"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setIsAddingList(true)}
                  className="w-full flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/15 text-white transition-all text-xs font-semibold shadow-lg text-left"
                >
                  <span className="text-base font-bold">+</span>
                  <span>Add another list</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Card Detail Modal (Description, Labels, Due Date, Checklist) */}
      {editingCard && (
        <CardDetailModal
          card={editingCard}
          listTitle={editingCard.listTitle}
          onClose={() => setEditingCard(null)}
          onCardUpdate={(updatedCard) => {
            fetchBoardData()
            setEditingCard((prev) => (prev ? { ...prev, ...updatedCard } : null))
          }}
        />
      )}

      {/* Bottom Floating Navigation Dock */}
      <BottomDock activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  )
}

export default BoardPage