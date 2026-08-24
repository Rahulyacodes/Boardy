// src/components/board/CardDetailModal.jsx
import { useState, useEffect, useMemo } from 'react'
import { updateCard, getCardComments, addCardComment, deleteCardComment } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { getDiceBearAvatar } from '../../utils/avatars'

export const LABEL_COLORS = [
  { color: '#EF4444', name: 'Urgent' },
  { color: '#F97316', name: 'High Priority' },
  { color: '#F59E0B', name: 'Medium' },
  { color: '#10B981', name: 'Feature' },
  { color: '#3B82F6', name: 'In Progress' },
  { color: '#8B5CF6', name: 'Tech Debt' },
]

function CardDetailModal({ card, listTitle, boardMembers = [], isViewer = false, onClose, onCardUpdate }) {
  const { user: currentUser } = useAuth()

  const [title, setTitle] = useState(card?.title || '')
  const [description, setDescription] = useState(card?.description || '')
  const [labels, setLabels] = useState(Array.isArray(card?.labels) ? card.labels : [])
  const [dueDate, setDueDate] = useState(card?.dueDate || '')
  const [checklist, setChecklist] = useState(Array.isArray(card?.checklist) ? card.checklist : [])
  const [assignedMembers, setAssignedMembers] = useState(Array.isArray(card?.assignedMembers) ? card.assignedMembers : [])
  const [newCheckitemTitle, setNewCheckitemTitle] = useState('')
  const [saving, setSaving] = useState(false)

  // Comments state
  const [comments, setComments] = useState([])
  const [newCommentText, setNewCommentText] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)

  const fetchComments = async () => {
    if (!card?._id) return
    try {
      const res = await getCardComments(card._id)
      setComments(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      console.error('Error fetching comments:', err)
    }
  }

  useEffect(() => {
    fetchComments()
  }, [card?._id])

  useEffect(() => {
    if (card) {
      setTitle(card.title || '')
      setDescription(card.description || '')
      setLabels(Array.isArray(card.labels) ? card.labels : [])
      setDueDate(card.dueDate || '')
      setChecklist(Array.isArray(card.checklist) ? card.checklist : [])
      setAssignedMembers(Array.isArray(card.assignedMembers) ? card.assignedMembers : [])
    }
  }, [card])

  const handleSaveAll = async (overrideData = {}) => {
    if (!card?._id) return
    setSaving(true)
    const updatePayload = {
      title,
      description,
      labels: (labels || []).filter(Boolean),
      dueDate,
      checklist: (checklist || []).filter(Boolean),
      assignedMembers: (assignedMembers || []).filter(Boolean).map((a) => (typeof a === 'object' ? a._id || a.id : a)),
      ...overrideData
    }
    try {
      const res = await updateCard(card._id, updatePayload)
      if (onCardUpdate && res?.data) onCardUpdate(res.data)
    } catch (err) {
      console.error('Error updating card:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleAddComment = async (e) => {
    e.preventDefault()
    if (!newCommentText.trim() || !card?._id) return
    setCommentLoading(true)
    try {
      const res = await addCardComment(card._id, newCommentText.trim())
      if (res?.data) {
        setComments((prev) => [...prev, res.data])
      }
      setNewCommentText('')
    } catch (err) {
      console.error('Error posting comment:', err)
    } finally {
      setCommentLoading(false)
    }
  }

  const handleDeleteComment = async (commentId) => {
    if (!commentId) return
    try {
      await deleteCardComment(commentId)
      setComments((prev) => prev.filter((c) => c && c._id !== commentId))
    } catch (err) {
      console.error('Error deleting comment:', err)
    }
  }

  // Label toggling
  const handleToggleLabel = (colorObj) => {
    const safeLabels = (labels || []).filter(Boolean)
    const exists = safeLabels.some((l) => l && l.color === colorObj.color)
    let updated
    if (exists) {
      updated = safeLabels.filter((l) => l && l.color !== colorObj.color)
    } else {
      updated = [...safeLabels, { color: colorObj.color, name: colorObj.name }]
    }
    setLabels(updated)
    handleSaveAll({ labels: updated })
  }

  // Checklist items
  const handleAddChecklistItem = (e) => {
    e.preventDefault()
    if (!newCheckitemTitle.trim()) return
    const newItem = { title: newCheckitemTitle.trim(), completed: false }
    const updated = [...(checklist || []).filter(Boolean), newItem]
    setChecklist(updated)
    setNewCheckitemTitle('')
    handleSaveAll({ checklist: updated })
  }

  const handleToggleCheckitem = (index) => {
    const updated = (checklist || []).filter(Boolean).map((item, i) =>
      i === index ? { ...item, completed: !item.completed } : item
    )
    setChecklist(updated)
    handleSaveAll({ checklist: updated })
  }

  const handleDeleteCheckitem = (index) => {
    const updated = (checklist || []).filter(Boolean).filter((_, i) => i !== index)
    setChecklist(updated)
    handleSaveAll({ checklist: updated })
  }

  // Normalize Board Members Safely
  const normalizedBoardMembers = useMemo(() => {
    if (!Array.isArray(boardMembers)) return []
    return boardMembers
      .filter(Boolean)
      .map((m) => {
        if (typeof m === 'object') {
          if (m.userId && typeof m.userId === 'object') {
            return {
              _id: m.userId._id || m.userId.id,
              name: m.userId.name || m.userId.username || 'Member',
              username: m.userId.username || m.userId.name || 'member',
              avatar: m.userId.avatar
            }
          }
          return {
            _id: m._id || m.id || m.userId,
            name: m.name || m.username || 'Member',
            username: m.username || m.name || 'member',
            avatar: m.avatar
          }
        }
        return { _id: String(m), name: 'Member', username: 'member' }
      })
      .filter((m) => Boolean(m._id))
  }, [boardMembers])

  // Progress metrics
  const safeChecklist = (checklist || []).filter(Boolean)
  const totalCount = safeChecklist.length
  const completedCount = safeChecklist.filter((c) => c && c.completed).length
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn select-none">
      <div className="bg-[#181820] border border-[#2A2A35] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-[#2A2A35] flex items-start justify-between bg-[#1C1C26]">
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
                In list: {listTitle || 'Board'}
              </span>
              {isViewer && (
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                  Read Only
                </span>
              )}
            </div>
            <input
              type="text"
              value={title}
              disabled={isViewer}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => handleSaveAll()}
              className="text-lg font-bold text-white bg-transparent border-b border-transparent focus:border-purple-500 hover:border-gray-700 rounded px-1 py-0.5 w-full focus:outline-none transition-colors"
              placeholder="Card Title..."
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Modal Content Scrollable */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          
          {/* 1. Labels Section */}
          <div>
            <h4 className="font-bold text-gray-300 uppercase tracking-wider text-[11px] mb-2">Labels</h4>
            <div className="flex flex-wrap gap-2">
              {LABEL_COLORS.map((l) => {
                const isSelected = (labels || []).some((item) => item && item.color === l.color)
                return (
                  <button
                    key={l.color}
                    type="button"
                    disabled={isViewer}
                    onClick={() => handleToggleLabel(l)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border cursor-pointer ${
                      isSelected ? 'ring-2 ring-white border-white scale-105' : 'border-transparent opacity-80 hover:opacity-100'
                    }`}
                    style={{ background: l.color, color: '#fff' }}
                  >
                    <span>{l.name}</span>
                    {isSelected && <span>✓</span>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 2. Due Date Section */}
          <div>
            <h4 className="font-bold text-gray-300 uppercase tracking-wider text-[11px] mb-2">Due Date</h4>
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={dueDate ? dueDate.split('T')[0] : ''}
                disabled={isViewer}
                onChange={(e) => {
                  setDueDate(e.target.value)
                  handleSaveAll({ dueDate: e.target.value })
                }}
                className="bg-[#0F0F14] border border-[#2A2A38] text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-500"
              />
              {dueDate && !isViewer && (
                <button
                  type="button"
                  onClick={() => {
                    setDueDate('')
                    handleSaveAll({ dueDate: '' })
                  }}
                  className="text-red-400 hover:underline text-xs font-medium cursor-pointer"
                >
                  Clear date
                </button>
              )}
            </div>
          </div>

          {/* 3. Assign Members Section */}
          <div>
            <h4 className="font-bold text-gray-300 uppercase tracking-wider text-[11px] mb-2">Assigned Members</h4>
            {normalizedBoardMembers.length === 0 ? (
              <p className="text-gray-500 text-[11px] italic">No members in this board</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {normalizedBoardMembers.map((m) => {
                  const uId = m._id
                  const displayName = m.name || m.username || 'User'
                  const isAssigned = (assignedMembers || []).some((assigned) => {
                    if (!assigned) return false
                    const assignedId = typeof assigned === 'object' ? (assigned._id || assigned.id) : assigned
                    return String(assignedId) === String(uId)
                  })

                  return (
                    <button
                      key={uId}
                      type="button"
                      disabled={isViewer}
                      onClick={() => {
                        let updated
                        if (isAssigned) {
                          updated = (assignedMembers || []).filter((a) => {
                            if (!a) return false
                            const aId = typeof a === 'object' ? (a._id || a.id) : a
                            return String(aId) !== String(uId)
                          })
                        } else {
                          updated = [...(assignedMembers || []), m]
                        }
                        setAssignedMembers(updated)
                        handleSaveAll({ assignedMembers: updated.map((a) => (typeof a === 'object' ? a._id || a.id : a)) })
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border cursor-pointer ${
                        isAssigned
                          ? 'bg-purple-600/30 border-purple-500 text-purple-300 shadow-sm scale-105'
                          : 'bg-[#0F0F14] border-[#2A2A38] text-gray-400 hover:text-white hover:border-gray-500'
                      }`}
                    >
                      <div className="w-5 h-5 rounded-full bg-[#13131A] border border-purple-500/40 p-0.5 flex items-center justify-center overflow-hidden shrink-0">
                        <img src={getDiceBearAvatar(m.avatar || displayName) || ''} alt={displayName} className="w-full h-full object-contain rounded-full" />
                      </div>
                      <span>{displayName}</span>
                      {isAssigned && <span className="text-purple-400 font-bold">✓</span>}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* 4. Description Section */}
          <div>
            <h4 className="font-bold text-gray-300 uppercase tracking-wider text-[11px] mb-2">Description</h4>
            <textarea
              rows={3}
              disabled={isViewer}
              placeholder="Add a detailed description for this task..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => handleSaveAll()}
              className="w-full bg-[#0F0F14] border border-[#2A2A38] focus:border-purple-500 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none resize-none"
            />
          </div>

          {/* 5. Checklist & Progress Bar Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-gray-300 uppercase tracking-wider text-[11px]">Checklist Subtasks</h4>
              {totalCount > 0 && (
                <span className="text-[11px] font-semibold text-purple-400">
                  {completedCount}/{totalCount} ({progressPercent}%)
                </span>
              )}
            </div>

            {/* Progress Bar */}
            {totalCount > 0 && (
              <div className="w-full h-2 bg-[#0F0F14] rounded-full overflow-hidden mb-3 border border-[#2A2A38]">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-teal-400 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            )}

            {/* Checklist Items */}
            <div className="space-y-2 mb-3">
              {safeChecklist.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-[#0F0F14] border border-[#2A2A38] rounded-xl px-3 py-2 hover:border-purple-500/40 transition-colors"
                >
                  <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      disabled={isViewer}
                      checked={Boolean(item.completed)}
                      onChange={() => handleToggleCheckitem(index)}
                      className="w-4 h-4 rounded accent-purple-600 cursor-pointer"
                    />
                    <span className={`text-xs ${item.completed ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                      {item.title}
                    </span>
                  </label>
                  {!isViewer && (
                    <button
                      type="button"
                      onClick={() => handleDeleteCheckitem(index)}
                      className="text-gray-500 hover:text-red-400 p-1 text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add Subtask Form */}
            {!isViewer && (
              <form onSubmit={handleAddChecklistItem} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add subtask item..."
                  value={newCheckitemTitle}
                  onChange={(e) => setNewCheckitemTitle(e.target.value)}
                  className="flex-1 bg-[#0F0F14] border border-[#2A2A38] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 font-semibold rounded-xl text-xs text-white transition-colors cursor-pointer"
                >
                  + Add
                </button>
              </form>
            )}
          </div>

          {/* Activity & Comments Section */}
          <div className="bg-[#14141A] border border-[#2A2A38] rounded-2xl p-4 shadow-inner">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">💬</span>
              <h3 className="font-bold text-sm text-gray-200">Activity & Comments</h3>
            </div>

            {/* Post New Comment */}
            {!isViewer ? (
              <form onSubmit={handleAddComment} className="mb-4">
                <textarea
                  placeholder="Write a comment..."
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  className="w-full bg-[#0F0F14] border border-[#2A2A38] rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none mb-2"
                  rows={2}
                />
                <button
                  type="submit"
                  disabled={commentLoading || !newCommentText.trim()}
                  className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 font-semibold rounded-xl text-xs text-white transition-colors cursor-pointer"
                >
                  {commentLoading ? 'Posting...' : 'Save Comment'}
                </button>
              </form>
            ) : (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 text-amber-300 text-xs mb-4 flex items-center gap-2">
                <span>👁️</span>
                <span>You are in Read-Only mode. Commenting is disabled for Viewers.</span>
              </div>
            )}

            {/* Comments Feed */}
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {(comments || []).filter(Boolean).length === 0 ? (
                <p className="text-xs text-gray-500 italic">No comments yet. Start the discussion!</p>
              ) : (
                (comments || []).filter(Boolean).map((c) => {
                  const authorObj = (c.authorId && typeof c.authorId === 'object') ? c.authorId : {}
                  const authorName = authorObj.name || authorObj.username || 'User'
                  const authorAvatarUri = getDiceBearAvatar(authorObj.avatar || authorName) || ''
                  const authorIdVal = authorObj._id || c.authorId
                  const currentUserIdVal = currentUser?.id || currentUser?._id
                  const isAuthor = Boolean(authorIdVal && currentUserIdVal && String(authorIdVal) === String(currentUserIdVal))

                  return (
                    <div key={c._id || Math.random()} className="flex items-start gap-2.5 bg-[#0F0F14] border border-[#2A2A38] rounded-xl p-3">
                      <div className="w-7 h-7 rounded-full bg-[#13131A] border border-purple-500/40 p-0.5 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                        <img src={authorAvatarUri} alt={authorName} className="w-full h-full object-contain rounded-full" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-bold text-xs text-purple-300">{authorName}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-500">
                              {c.createdAt ? new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                            {!isViewer && isAuthor && c._id && (
                              <button
                                type="button"
                                onClick={() => handleDeleteComment(c._id)}
                                className="text-gray-500 hover:text-red-400 text-xs cursor-pointer"
                                title="Delete comment"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-200 leading-relaxed whitespace-pre-wrap">{c.text}</p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#2A2A35] bg-[#17171F] flex items-center justify-between">
          <span className="text-[11px] text-gray-400">
            {isViewer ? 'Read-Only Mode' : saving ? 'Saving changes...' : 'All changes saved automatically'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-xl text-xs font-semibold text-white transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

export default CardDetailModal
