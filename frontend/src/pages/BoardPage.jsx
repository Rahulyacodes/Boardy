import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getBoard,
  createList,
  updateList,
  deleteList,
  renameList,
  createCard,
  deleteCard,
  updateCard,
  moveCard
} from '../api'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/layout/Navbar'
import { getDiceBearAvatar } from '../utils/avatars'
import BoardNavbar from '../components/layout/BoardNavbar'
import BottomDock from '../components/layout/BottomDock'
import PlannerView from '../components/board/PlannerView'
import CardDetailModal from '../components/board/CardDetailModal'

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

function BoardPage() {
  const { boardId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

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

  // Edit list modal (title & position serial number)
  const [listToEdit, setListToEdit] = useState(null)

  // Editing card modal/inline state
  const [editingCard, setEditingCard] = useState(null)
  const [editCardTitle, setEditCardTitle] = useState('')

  // Filter states
  const [filterMemberId, setFilterMemberId] = useState(null)
  const [filterText, setFilterText] = useState('')

  // Drag and Drop state
  const [draggedCard, setDraggedCard] = useState(null)
  const [draggedListId, setDraggedListId] = useState(null)
  const [dragOverListId, setDragOverListId] = useState(null)

  // Viewer role check
  const isOwner = board?.ownerId === user?.id || board?.ownerId?._id === user?.id
  const memberEntry = board?.members?.find((m) => (m.userId?._id || m.userId) === user?.id)
  const userRole = isOwner ? 'owner' : memberEntry ? memberEntry.role : 'viewer'
  const isViewer = userRole === 'viewer'

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

  const handleSaveEditList = async (e) => {
    e?.preventDefault()
    if (!listToEdit || !listToEdit.title.trim()) return
    try {
      await updateList(listToEdit._id, {
        title: listToEdit.title.trim(),
        position: Number(listToEdit.position)
      })
      setListToEdit(null)
      fetchBoardData()
    } catch (err) {
      console.error('Failed to edit list:', err)
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

  // Card & List Drag and Drop Event Handlers
  const handleListDragStart = (e, listId) => {
    e.stopPropagation()
    setDraggedListId(listId)
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'list', listId }))
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragStart = (e, card, sourceListId) => {
    setDraggedCard({ cardId: card._id, sourceListId })
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'card', cardId: card._id, sourceListId }))
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

    const dataRaw = e.dataTransfer.getData('text/plain')
    let parsedData = {}
    if (dataRaw) {
      try {
        parsedData = JSON.parse(dataRaw)
      } catch (err) {}
    }

    // Handle List Reordering Drop
    if (parsedData.type === 'list' || draggedListId) {
      const activeListId = parsedData.listId || draggedListId
      if (!activeListId || activeListId === targetListId) {
        setDraggedListId(null)
        return
      }
      const lists = board?.lists || []
      const targetIndex = lists.findIndex((l) => l._id === targetListId)
      if (targetIndex !== -1) {
        updateList(activeListId, { position: targetIndex + 1 })
          .then(() => fetchBoardData())
          .catch((err) => console.error('Failed to reorder list:', err))
      }
      setDraggedListId(null)
      return
    }

    // Handle Card Move Drop
    let cardId = draggedCard?.cardId || parsedData.cardId
    let sourceListId = draggedCard?.sourceListId || parsedData.sourceListId

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

  const pendingCardSyncTimers = useRef({})

  const handleToggleCompleteCard = (cardId, currentStatus) => {
    const nextStatus = !currentStatus
    setBoard((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        lists: prev.lists.map((list) => ({
          ...list,
          cards: list.cards.map((c) => (c._id === cardId ? { ...c, completed: nextStatus } : c))
        }))
      }
    })

    // Clear previous pending timer if user toggled again within 3s
    if (pendingCardSyncTimers.current[cardId]) {
      clearTimeout(pendingCardSyncTimers.current[cardId])
    }

    // Debounce DB write by 3 seconds (No Undo popup, clean board UI)
    pendingCardSyncTimers.current[cardId] = setTimeout(async () => {
      try {
        await updateCard(cardId, { completed: nextStatus })
      } catch (err) {
        console.error('Error updating card completion:', err)
        fetchBoardData()
      } finally {
        delete pendingCardSyncTimers.current[cardId]
      }
    }, 3000)
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
      <BoardNavbar
        board={board}
        onBoardUpdate={handleBoardUpdate}
        filterMemberId={filterMemberId}
        setFilterMemberId={setFilterMemberId}
        filterText={filterText}
        setFilterText={setFilterText}
      />

      {/* Read-Only Mode Notice Banner */}
      {isViewer && (
        <div className="relative z-20 bg-amber-500/20 border-b border-amber-500/30 backdrop-blur-md px-4 py-2 text-center text-xs text-amber-200 font-semibold flex items-center justify-center gap-2">
          <span>👁️</span>
          <span>You are viewing this board in Read-Only mode. Edits, dragging, and additions are restricted.</span>
        </div>
      )}

      {/* Content Body */}
      {activeTab === 'planner' ? (
        <div className="relative z-10 flex-1">
          <PlannerView
            onOpenBoard={(targetBoardId) => {
              setActiveTab('board')
              if (targetBoardId !== boardId) {
                navigate(`/board/${targetBoardId}`)
              }
            }}
          />
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
          <div className="flex items-start gap-4 h-full min-h-[calc(100vh-180px)] pb-12">
            {/* Render lists */}
            {board?.lists?.map((list, index) => {
              const rawCards = list.cards || []
              const filteredCards = rawCards.filter((card) => {
                if (filterMemberId) {
                  const isAssigned = (card.assignedMembers || []).some(
                    (m) => (m._id || m) === filterMemberId
                  )
                  if (!isAssigned) return false
                }
                if (filterText.trim()) {
                  const q = filterText.toLowerCase().trim()
                  const matchTitle = card.title?.toLowerCase().includes(q)
                  const matchDesc = card.description?.toLowerCase().includes(q)
                  if (!matchTitle && !matchDesc) return false
                }
                return true
              })

              const cardCount = filteredCards.length
              const isDragOver = dragOverListId === list._id

              return (
                <div
                  key={list._id}
                  draggable={!isViewer}
                  onDragStart={(e) => !isViewer && handleListDragStart(e, list._id)}
                  onDragOver={(e) => !isViewer && handleDragOver(e, list._id)}
                  onDragLeave={(e) => !isViewer && handleDragLeave(e, list._id)}
                  onDrop={(e) => !isViewer && handleDrop(e, list._id)}
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
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Serial Number Badge */}
                        <span className="text-[10px] font-bold text-purple-300 bg-purple-600/30 border border-purple-500/30 px-1.5 py-0.5 rounded shadow-sm">
                          #{index + 1}
                        </span>
                        <h3
                          onClick={() => {
                            if (!isViewer) {
                              setEditingListId(list._id)
                              setEditingListTitle(list.title)
                            }
                          }}
                          className={`font-bold text-sm text-gray-100 truncate ${
                            !isViewer ? 'cursor-pointer hover:text-purple-300' : ''
                          } transition-colors`}
                          title={!isViewer ? 'Click to rename' : ''}
                        >
                          {list.title}
                        </h3>
                        {/* Card Count Badge */}
                        <span className="text-xs text-gray-400 font-semibold px-1.5 py-0.5 rounded bg-white/10 shrink-0">
                          {cardCount}
                        </span>
                      </div>
                    )}

                    {/* Quick List Action Icons */}
                    {!isViewer && (
                      <div className="flex items-center gap-1 text-gray-400 text-xs shrink-0">
                        <button
                          onClick={() => setListToEdit({ _id: list._id, title: list.title, position: index + 1 })}
                          className="p-1 hover:text-purple-300 hover:bg-white/10 rounded transition-colors"
                          title="Edit list title & serial number"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
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
                    )}
                  </div>

                  {/* List Cards Container */}
                  <div className="flex-1 overflow-y-auto max-h-[calc(100vh-280px)] space-y-2 pr-0.5 min-h-[40px]">
                    {filteredCards.map((card) => {
                      const isBeingDragged = draggedCard?.cardId === card._id
                      const hasLabels = card.labels && card.labels.length > 0
                      const hasChecklist = card.checklist && card.checklist.length > 0
                      const completedChecklist = hasChecklist ? card.checklist.filter((c) => c.completed).length : 0
                      const hasAssigned = card.assignedMembers && card.assignedMembers.length > 0

                      return (
                        <div
                          key={card._id}
                          draggable={!isViewer}
                          onDragStart={(e) => !isViewer && handleDragStart(e, card, list._id)}
                          onDragEnd={() => {
                            setDraggedCard(null)
                            setDragOverListId(null)
                          }}
                          onClick={() => setEditingCard({ ...card, listTitle: list.title })}
                          className={`group relative bg-[#22222B]/90 hover:bg-[#2A2A36] border border-white/10 hover:border-purple-500/40 rounded-xl p-3 text-xs text-gray-100 shadow-md transition-all ${
                            !isViewer ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
                          } ${isBeingDragged ? 'opacity-30 scale-95 border-dashed border-purple-400' : ''}`}
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

                          {/* Card Title & Quick Complete Action */}
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex items-start gap-2 min-w-0 flex-1">
                              {!isDoneList(list.title) && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleToggleCompleteCard(card._id, card.completed)
                                  }}
                                  className={`mt-0.5 shrink-0 p-0.5 rounded border transition-all ${
                                    card.completed
                                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                                      : 'border-white/20 text-gray-500 hover:text-white hover:border-gray-400'
                                  }`}
                                  title={card.completed ? 'Mark as incomplete' : 'Mark as completed'}
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <polyline points="20 6 9 17 4 12"/>
                                  </svg>
                                </button>
                              )}
                              <span className={`font-medium leading-snug break-words ${card.completed || isDoneList(list.title) ? 'line-through text-gray-400' : 'text-gray-200'}`}>
                                {card.title}
                              </span>
                            </div>

                            {!isViewer && (
                              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity shrink-0">
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
                            )}
                          </div>

                          {/* Badges Footer: Due Date, Checklist Progress & Assigned Member Avatars */}
                          {(card.dueDate || hasChecklist || hasAssigned) && (
                            <div className="flex items-center justify-between gap-2 mt-2 pt-1 border-t border-white/5 text-[10px] text-gray-400 font-medium">
                              <div className="flex items-center gap-2">
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

                              {/* Assigned Member Avatars */}
                              {hasAssigned && (
                                <div className="flex items-center -space-x-1.5 overflow-hidden ml-auto">
                                  {(card.assignedMembers || []).filter(Boolean).map((m, idx) => {
                                    const displayName = (typeof m === 'object' ? (m.name || m.username) : null) || 'User'
                                    const avatarSeed = (typeof m === 'object' ? (m.avatar || displayName) : displayName)
                                    const avatarUri = getDiceBearAvatar(avatarSeed) || ''
                                    const memberKey = (typeof m === 'object' ? (m._id || m.id) : m) || idx
                                    return (
                                      <div
                                        key={memberKey}
                                        title={`Assigned to ${displayName}`}
                                        className="w-5 h-5 rounded-full bg-[#13131A] border border-[#22222B] flex items-center justify-center p-0.5 shadow-sm overflow-hidden"
                                      >
                                        <img src={avatarUri} alt={displayName} className="w-full h-full object-contain rounded-full" />
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Add a Card option per list */}
                  {!isViewer && (
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
                  )}
                </div>
              )
            })}

            {/* + Add Another List Option */}
            {!isViewer && (
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
            )}
          </div>
        </div>
      )}

      {/* Card Detail Modal (Description, Labels, Due Date, Checklist) */}
      {editingCard && (
        <CardDetailModal
          card={editingCard}
          listTitle={editingCard.listTitle}
          boardMembers={board?.members}
          isViewer={isViewer}
          onClose={() => setEditingCard(null)}
          onCardUpdate={(updatedCard) => {
            fetchBoardData()
            setEditingCard((prev) => (prev ? { ...prev, ...updatedCard } : null))
          }}
        />
      )}
      {/* Edit List Modal (Name & Serial Number Order) */}
      {listToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn select-none">
          <div className="bg-[#1C1C24] border border-[#2A2A35] rounded-2xl w-full max-w-md p-6 shadow-2xl text-white">
            <div className="flex items-center justify-between pb-3 border-b border-[#2A2A35] mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>✏️</span> Edit List Settings
              </h3>
              <button
                onClick={() => setListToEdit(null)}
                className="text-gray-400 hover:text-white text-sm p-1 rounded-lg hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditList} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-300 font-semibold mb-1.5">List Name</label>
                <input
                  type="text"
                  value={listToEdit.title}
                  onChange={(e) => setListToEdit({ ...listToEdit, title: e.target.value })}
                  className="w-full bg-[#0F0F14] border border-[#2A2A38] focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                  placeholder="Enter list title..."
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1.5">
                  Serial Number (Position Order)
                </label>
                <input
                  type="number"
                  min="1"
                  max={board?.lists?.length || 10}
                  value={listToEdit.position}
                  onChange={(e) => setListToEdit({ ...listToEdit, position: e.target.value })}
                  className="w-full bg-[#0F0F14] border border-[#2A2A38] focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                  required
                />
                <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">
                  Enter position number (1, 2, 3...) to reorder this list on the board. Lists are numbered sequentially by default.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#2A2A35]">
                <button
                  type="button"
                  onClick={() => setListToEdit(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-lg shadow-purple-600/30 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bottom Floating Navigation Dock */}
      <BottomDock activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  )
}

export default BoardPage