// src/components/board/CardDetailModal.jsx
import { useState, useEffect } from 'react'
import { updateCard, getCardComments, addCardComment, deleteCardComment } from '../../api'
import { useAuth } from '../../context/AuthContext'

export const LABEL_COLORS = [
  { color: '#EF4444', name: 'Urgent (Red)' },
  { color: '#F97316', name: 'High Priority (Orange)' },
  { color: '#F59E0B', name: 'Medium (Yellow)' },
  { color: '#10B981', name: 'Feature (Green)' },
  { color: '#3B82F6', name: 'In Progress (Blue)' },
  { color: '#8B5CF6', name: 'Tech Debt (Purple)' },
]

function CardDetailModal({ card, listTitle, boardMembers = [], isViewer = false, onClose, onCardUpdate }) {
  const { user: currentUser } = useAuth()

  const [title, setTitle] = useState(card?.title || '')
  const [description, setDescription] = useState(card?.description || '')
  const [labels, setLabels] = useState(card?.labels || [])
  const [dueDate, setDueDate] = useState(card?.dueDate || '')
  const [checklist, setChecklist] = useState(card?.checklist || [])
  const [assignedMembers, setAssignedMembers] = useState(card?.assignedMembers || [])
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
      setComments(res.data || [])
    } catch (err) {
      console.error('Error fetching comments:', err)
    }
  }

  useEffect(() => {
    fetchComments()
  }, [card?._id])

  const handleAddComment = async (e) => {
    e.preventDefault()
    if (!newCommentText.trim()) return
    setCommentLoading(true)
    try {
      const res = await addCardComment(card._id, newCommentText.trim())
      setComments((prev) => [...prev, res.data])
      setNewCommentText('')
    } catch (err) {
      console.error('Error posting comment:', err)
    } finally {
      setCommentLoading(false)
    }
  }

  const handleDeleteComment = async (commentId) => {
    try {
      await deleteCardComment(commentId)
      setComments((prev) => prev.filter((c) => c._id !== commentId))
    } catch (err) {
      console.error('Error deleting comment:', err)
    }
  }

  useEffect(() => {
    setTitle(card?.title || '')
    setDescription(card?.description || '')
    setLabels(card?.labels || [])
    setDueDate(card?.dueDate || '')
    setChecklist(card?.checklist || [])
    setAssignedMembers(card?.assignedMembers || [])
  }, [card])

  const handleSaveAll = async (overrideData = {}) => {
    setSaving(true)
    const updatePayload = {
      title,
      description,
      labels,
      dueDate,
      checklist,
      assignedMembers: assignedMembers.map(a => a._id || a),
      ...overrideData
    }
    try {
      const res = await updateCard(card._id, updatePayload)
      if (onCardUpdate) onCardUpdate(res.data)
    } catch (err) {
      console.error('Error updating card:', err)
    } finally {
      setSaving(false)
    }
  }

  // Label toggling
  const handleToggleLabel = (colorObj) => {
    const exists = labels.some((l) => l.color === colorObj.color)
    let updated
    if (exists) {
      updated = labels.filter((l) => l.color !== colorObj.color)
    } else {
      updated = [...labels, { color: colorObj.color, name: colorObj.name }]
    }
    setLabels(updated)
    handleSaveAll({ labels: updated })
  }

  // Checklist items
  const handleAddChecklistItem = (e) => {
    e.preventDefault()
    if (!newCheckitemTitle.trim()) return
    const newItem = { title: newCheckitemTitle.trim(), completed: false }
    const updated = [...checklist, newItem]
    setChecklist(updated)
    setNewCheckitemTitle('')
    handleSaveAll({ checklist: updated })
  }

  const handleToggleCheckitem = (index) => {
    const updated = checklist.map((item, i) =>
      i === index ? { ...item, completed: !item.completed } : item
    )
    setChecklist(updated)
    handleSaveAll({ checklist: updated })
  }

  // Progress metrics
  const totalCount = checklist.length
  const completedCount = checklist.filter((c) => c.completed).length
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
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
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
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
                const isSelected = labels.some((item) => item.color === l.color)
                return (
                  <button
                    key={l.color}
                    type="button"
                    disabled={isViewer}
                    onClick={() => handleToggleLabel(l)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
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
                value={dueDate}
                disabled={isViewer}
                onChange={(e) => {
                  setDueDate(e.target.value)
                  handleSaveAll({ dueDate: e.target.value })
                }}
                className="bg-[#0F0F14] border border-[#2A2A38] text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-500"
              />
              {dueDate && !isViewer && (
                <button
                  onClick={() => {
                    setDueDate('')
                    handleSaveAll({ dueDate: '' })
                  }}
                  className="text-red-400 hover:underline text-xs font-medium"
                >
                  Clear date
                </button>
              )}
            </div>
          </div>

          {/* 3. Assign Members Section */}
          <div>
            <h4 className="font-bold text-gray-300 uppercase tracking-wider text-[11px] mb-2">Assigned Members</h4>
            <div className="flex flex-wrap gap-2">
              {(boardMembers || []).map((m) => {
                const uObj = m.userId || {}
                const uId = uObj._id || uObj
                const uName = uObj.username || 'User'
                const isAssigned = assignedMembers.some(
                  (assigned) => (assigned._id || assigned) === uId
                )

                return (
                  <button
                    key={uId}
                    type="button"
                    disabled={isViewer}
                    onClick={() => {
                      let updated
                      if (isAssigned) {
                        updated = assignedMembers.filter((a) => (a._id || a) !== uId)
                      } else {
                        updated = [...assignedMembers, uObj]
                      }
                      setAssignedMembers(updated)
                      handleSaveAll({ assignedMembers: updated.map((a) => a._id || a) })
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                      isAssigned
                        ? 'bg-purple-600/30 border-purple-500 text-purple-300 shadow-sm scale-105'
                        : 'bg-[#0F0F14] border-[#2A2A38] text-gray-400 hover:text-white hover:border-gray-500'
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-[10px] font-bold text-white">
                      {uName.slice(0, 2).toUpperCase()}
                    </div>
                    <span>{uName}</span>
                    {isAssigned && <span className="text-purple-400 font-bold">✓</span>}
                  </button>
                )
              })}
            </div>
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
              {checklist.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-[#0F0F14] border border-[#2A2A38] rounded-xl px-3 py-2 hover:border-purple-500/40 transition-colors"
                >
                  <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      disabled={isViewer}
                      checked={item.completed}
                      onChange={() => handleToggleCheckitem(index)}
                      className="w-4 h-4 rounded accent-purple-600 cursor-pointer"
                    />
                    <span className={`text-xs ${item.completed ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                      {item.title}
                    </span>
                  </label>
                  {!isViewer && (
                    <button
                      onClick={() => handleDeleteCheckitem(index)}
                      className="text-gray-500 hover:text-red-400 p-1 text-xs"
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
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 font-semibold rounded-xl text-xs text-white transition-colors"
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
                  className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 font-semibold rounded-xl text-xs text-white transition-colors"
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
              {comments.length === 0 ? (
                <p className="text-xs text-gray-500 italic">No comments yet. Start the discussion!</p>
              ) : (
                comments.map((c) => {
                  const authorName = c.authorId?.username || 'User'
                  const initials = authorName.slice(0, 2).toUpperCase()
                  const isAuthor = c.authorId?._id === currentUser?.id || c.authorId === currentUser?.id

                  return (
                    <div key={c._id} className="flex items-start gap-2.5 bg-[#0F0F14] border border-[#2A2A38] rounded-xl p-3">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center font-bold text-[10px] text-white shrink-0 shadow-sm">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-bold text-xs text-purple-300">{authorName}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-500">
                              {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {!isViewer && isAuthor && (
                              <button
                                onClick={() => handleDeleteComment(c._id)}
                                className="text-gray-500 hover:text-red-400 text-xs"
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
            onClick={onClose}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-xl text-xs font-semibold text-white transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

export default CardDetailModal
