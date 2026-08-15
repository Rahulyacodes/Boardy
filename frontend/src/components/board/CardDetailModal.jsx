// src/components/board/CardDetailModal.jsx
import { useState, useEffect } from 'react'
import { updateCard } from '../../api'

export const LABEL_COLORS = [
  { color: '#EF4444', name: 'Urgent (Red)' },
  { color: '#F97316', name: 'High Priority (Orange)' },
  { color: '#F59E0B', name: 'Medium (Yellow)' },
  { color: '#10B981', name: 'Feature (Green)' },
  { color: '#3B82F6', name: 'In Progress (Blue)' },
  { color: '#8B5CF6', name: 'Tech Debt (Purple)' },
]

function CardDetailModal({ card, listTitle, onClose, onCardUpdate }) {
  const [title, setTitle] = useState(card?.title || '')
  const [description, setDescription] = useState(card?.description || '')
  const [labels, setLabels] = useState(card?.labels || [])
  const [dueDate, setDueDate] = useState(card?.dueDate || '')
  const [checklist, setChecklist] = useState(card?.checklist || [])
  const [newCheckitemTitle, setNewCheckitemTitle] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setTitle(card?.title || '')
    setDescription(card?.description || '')
    setLabels(card?.labels || [])
    setDueDate(card?.dueDate || '')
    setChecklist(card?.checklist || [])
  }, [card])

  const handleSaveAll = async (overrideData = {}) => {
    setSaving(true)
    const updatePayload = {
      title,
      description,
      labels,
      dueDate,
      checklist,
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

  const handleDeleteCheckitem = (index) => {
    const updated = checklist.filter((_, i) => i !== index)
    setChecklist(updated)
    handleSaveAll({ checklist: updated })
  }

  // Progress metrics
  const completedCount = checklist.filter((c) => c.completed).length
  const totalCount = checklist.length
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 select-none">
      <div className="bg-[#1C1C24] border border-[#2A2A35] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl text-white overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 border-b border-[#2A2A35] flex items-start justify-between bg-[#17171F]">
          <div className="flex-1 pr-4">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => handleSaveAll()}
              className="bg-transparent text-xl font-bold text-white w-full focus:outline-none focus:bg-[#252532] rounded px-2 py-1 transition-colors"
            />
            <p className="text-xs text-gray-400 mt-1 pl-2">
              In list <span className="font-semibold text-purple-400">{listTitle || 'List'}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/10 text-base"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* 1. Color Labels Section */}
          <div>
            <h4 className="font-bold text-gray-300 uppercase tracking-wider text-[11px] mb-2">Labels</h4>
            <div className="flex flex-wrap gap-2">
              {LABEL_COLORS.map((l) => {
                const isSelected = labels.some((selected) => selected.color === l.color)
                return (
                  <button
                    key={l.color}
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
                onChange={(e) => {
                  setDueDate(e.target.value)
                  handleSaveAll({ dueDate: e.target.value })
                }}
                className="bg-[#0F0F14] border border-[#2A2A38] text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-500"
              />
              {dueDate && (
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

          {/* 3. Description Section */}
          <div>
            <h4 className="font-bold text-gray-300 uppercase tracking-wider text-[11px] mb-2">Description</h4>
            <textarea
              rows={3}
              placeholder="Add a detailed description for this task..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => handleSaveAll()}
              className="w-full bg-[#0F0F14] border border-[#2A2A38] focus:border-purple-500 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none resize-none"
            />
          </div>

          {/* 4. Checklist & Progress Bar Section */}
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
                      checked={item.completed}
                      onChange={() => handleToggleCheckitem(index)}
                      className="w-4 h-4 rounded accent-purple-600 cursor-pointer"
                    />
                    <span className={`text-xs ${item.completed ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                      {item.title}
                    </span>
                  </label>
                  <button
                    onClick={() => handleDeleteCheckitem(index)}
                    className="text-gray-500 hover:text-red-400 p-1 text-xs"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* Add Subtask Form */}
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
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#2A2A35] bg-[#17171F] flex items-center justify-between">
          <span className="text-[11px] text-gray-400">
            {saving ? 'Saving changes...' : 'All changes saved automatically'}
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
