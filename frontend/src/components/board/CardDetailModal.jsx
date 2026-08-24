// src/components/board/CardDetailModal.jsx
import { useState, useEffect, useMemo, useRef } from 'react'
import { updateCard, deleteCard, getCardComments, addCardComment, deleteCardComment } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { getDiceBearAvatar } from '../../utils/avatars'

export const PREDEFINED_LABELS = [
  { color: '#EF4444', name: 'Urgent' },
  { color: '#F97316', name: 'High Priority' },
  { color: '#F59E0B', name: 'Medium' },
  { color: '#10B981', name: 'Feature' },
  { color: '#3B82F6', name: 'In Progress' },
  { color: '#8B5CF6', name: 'Tech Debt' },
]

export const PRESET_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#10B981', '#06B6D4',
  '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#64748B'
]

// Smart Relative Time Formatter (Calendar day aware & 12h limit)
export function formatTimeAgo(dateInput) {
  if (!dateInput) return ''
  const date = new Date(dateInput)
  if (isNaN(date.getTime())) return ''

  const now = new Date()
  const diffInSeconds = Math.floor((now - date) / 1000)

  // Check if same calendar day
  const isSameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()

  // If same calendar day and under 12 hours ago, show relative time
  if (isSameDay) {
    if (diffInSeconds < 45) {
      return 'just now'
    }
    const diffInMinutes = Math.floor(diffInSeconds / 60)
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`
    }
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 12) {
      return `${diffInHours}h ago`
    }
  }

  // If calendar date is different or >= 12 hours ago, show exact date and time (e.g. 16 Aug, 19:07)
  const isSameYear = date.getFullYear() === now.getFullYear()
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  const dateStr = date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    ...(isSameYear ? {} : { year: 'numeric' })
  })

  return `${dateStr}, ${timeStr}`
}

// Robust check if HTML string is empty (handles <br>, <p><br></p>, &nbsp;, whitespace)
function isHtmlEmpty(htmlStr) {
  if (!htmlStr) return true
  const textOnly = htmlStr
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, '')
    .trim()
  return textOnly.length === 0
}

// Convert Legacy Markdown to Clean HTML for existing cards
function convertMarkdownToHtml(markdownStr) {
  if (!markdownStr || isHtmlEmpty(markdownStr)) return ''
  if (/<[a-z][\s\S]*>/i.test(markdownStr)) {
    return markdownStr
  }
  const lines = markdownStr.split('\n')
  const htmlLines = lines.map((line) => {
    const l = line.trim()
    if (l.startsWith('# ')) return `<h1>${parseLegacyInline(l.slice(2))}</h1>`
    if (l.startsWith('## ')) return `<h2>${parseLegacyInline(l.slice(3))}</h2>`
    if (l.startsWith('### ')) return `<h3>${parseLegacyInline(l.slice(4))}</h3>`
    if (l.startsWith('- ') || l.startsWith('* ')) return `<ul><li>${parseLegacyInline(l.slice(2))}</li></ul>`
    if (!l) return '<br/>'
    return `<p>${parseLegacyInline(line)}</p>`
  })
  return htmlLines.join('')
}

function parseLegacyInline(text) {
  return text
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-purple-400 underline font-medium">$1</a>')
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
    .replace(/\*(.*?)\*/g, '<i>$1</i>')
}

function CardDetailModal({
  card,
  listTitle,
  boardLists = [],
  boardMembers = [],
  isViewer = false,
  onClose,
  onCardUpdate,
  onMoveCardToList,
  onDeleteCard
}) {
  const { user: currentUser } = useAuth()

  // Card core state
  const [title, setTitle] = useState(card?.title || '')
  const [completed, setCompleted] = useState(Boolean(card?.completed))
  const [description, setDescription] = useState(() => convertMarkdownToHtml(card?.description || ''))
  const [isEditingDesc, setIsEditingDesc] = useState(false)
  const [showHeadingMenu, setShowHeadingMenu] = useState(false)
  
  // Link Modal state
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [linkUrlInput, setLinkUrlInput] = useState('')
  const [linkTitleInput, setLinkTitleInput] = useState('')

  const [labels, setLabels] = useState(Array.isArray(card?.labels) ? card.labels : [])
  const [dueDate, setDueDate] = useState(card?.dueDate || '')
  const [attachments, setAttachments] = useState(Array.isArray(card?.attachments) ? card.attachments : [])
  const [assignedMembers, setAssignedMembers] = useState(Array.isArray(card?.assignedMembers) ? card.assignedMembers : [])
  
  // Multiple Checklists state: [{ title: string, items: [{ title: string, completed: boolean }] }]
  const [checklists, setChecklists] = useState(() => {
    if (Array.isArray(card?.checklists) && card.checklists.length > 0) {
      return card.checklists
    }
    if (Array.isArray(card?.checklist) && card.checklist.length > 0) {
      return [{ title: 'Checklist', items: card.checklist }]
    }
    return []
  })

  // Popover form inputs
  const [checklistTitleInput, setChecklistTitleInput] = useState('')
  const [newSubitemInputs, setNewSubitemInputs] = useState({})

  // Attachments form input
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('')
  const [newAttachmentTitle, setNewAttachmentTitle] = useState('')

  // Custom Label form input
  const [customLabelTitle, setCustomLabelTitle] = useState('')
  const [customLabelColor, setCustomLabelColor] = useState('#10B981')

  // Comments & Activity state
  const [comments, setComments] = useState([])
  const [newCommentText, setNewCommentText] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)
  const [showActivityDetails, setShowActivityDetails] = useState(true)

  // Delete Card Confirmation Modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeletingCard, setIsDeletingCard] = useState(false)

  // Popovers state: null | 'members' | 'labels' | 'dates' | 'checklist' | 'attachment' | 'listSelect'
  const [activePopover, setActivePopover] = useState(null)
  const [saving, setSaving] = useState(false)

  // Member search in popover
  const [memberSearch, setMemberSearch] = useState('')

  // Refs
  const popoverRef = useRef(null)
  const titleInputRef = useRef(null)
  const descEditorRef = useRef(null)

  // Close popovers on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setActivePopover(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Sync state when card prop updates
  useEffect(() => {
    if (card) {
      setTitle(card.title || '')
      setCompleted(Boolean(card.completed))
      const htmlDesc = convertMarkdownToHtml(card.description || '')
      setDescription(htmlDesc)
      setLabels(Array.isArray(card.labels) ? card.labels : [])
      setDueDate(card.dueDate || '')
      setAttachments(Array.isArray(card.attachments) ? card.attachments : [])
      setAssignedMembers(Array.isArray(card.assignedMembers) ? card.assignedMembers : [])
      if (Array.isArray(card.checklists) && card.checklists.length > 0) {
        setChecklists(card.checklists)
      } else if (Array.isArray(card.checklist) && card.checklist.length > 0) {
        setChecklists([{ title: 'Checklist', items: card.checklist }])
      } else {
        setChecklists([])
      }
    }
  }, [card])

  // Sync contentEditable innerHTML when editing mode toggles or description resets
  useEffect(() => {
    if (isEditingDesc && descEditorRef.current) {
      descEditorRef.current.innerHTML = description || ''
    }
  }, [isEditingDesc])

  // WYSIWYG ContentEditable Formatting Exec Commands
  const applyBold = () => {
    descEditorRef.current?.focus()
    document.execCommand('bold', false, null)
    if (descEditorRef.current) setDescription(descEditorRef.current.innerHTML)
  }

  const applyItalic = () => {
    descEditorRef.current?.focus()
    document.execCommand('italic', false, null)
    if (descEditorRef.current) setDescription(descEditorRef.current.innerHTML)
  }

  const applyHeadingBlock = (tag) => {
    descEditorRef.current?.focus()
    if (!tag) {
      document.execCommand('formatBlock', false, '<p>')
    } else {
      document.execCommand('formatBlock', false, `<${tag}>`)
    }
    setShowHeadingMenu(false)
    if (descEditorRef.current) setDescription(descEditorRef.current.innerHTML)
  }

  const applyBulletList = () => {
    descEditorRef.current?.focus()
    document.execCommand('insertUnorderedList', false, null)
    if (descEditorRef.current) setDescription(descEditorRef.current.innerHTML)
  }

  const handleOpenLinkModal = () => {
    const sel = window.getSelection()
    const selectedText = sel ? sel.toString().trim() : ''
    if (selectedText) setLinkTitleInput(selectedText)
    setShowLinkModal(true)
  }

  const handleConfirmInsertLink = (e) => {
    e.preventDefault()
    if (!linkUrlInput.trim()) return
    let finalUrl = linkUrlInput.trim()
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = `https://${finalUrl}`
    }
    const displayTitle = linkTitleInput.trim() || finalUrl
    descEditorRef.current?.focus()
    const linkHtml = `<a href="${finalUrl}" target="_blank" rel="noopener noreferrer" class="text-purple-400 underline font-medium">${displayTitle}</a>&nbsp;`
    document.execCommand('insertHTML', false, linkHtml)
    if (descEditorRef.current) setDescription(descEditorRef.current.innerHTML)

    setLinkUrlInput('')
    setLinkTitleInput('')
    setShowLinkModal(false)
  }

  // Fetch comments
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

  // Save changes to API
  const handleSaveAll = async (overrideData = {}) => {
    if (!card?._id) return
    setSaving(true)
    const currentChecklists = overrideData.checklists !== undefined ? overrideData.checklists : checklists
    const rawDesc = overrideData.description !== undefined ? overrideData.description : description
    const cleanedDesc = isHtmlEmpty(rawDesc) ? '' : rawDesc

    const updatePayload = {
      title,
      completed,
      description: cleanedDesc,
      labels: (labels || []).filter(Boolean),
      dueDate,
      checklists: (currentChecklists || []).filter(Boolean),
      checklist: (currentChecklists || []).flatMap((c) => c.items || []),
      attachments: (attachments || []).filter(Boolean),
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

  // Delete Card Handler
  const handleConfirmDeleteCard = async () => {
    if (!card?._id) return
    setIsDeletingCard(true)
    try {
      if (onDeleteCard) {
        await onDeleteCard(card._id)
      } else {
        await deleteCard(card._id)
        if (onClose) onClose()
      }
    } catch (err) {
      console.error('Error deleting card:', err)
    } finally {
      setIsDeletingCard(false)
      setShowDeleteConfirm(false)
    }
  }

  // Toggle completion
  const handleToggleComplete = () => {
    const nextCompleted = !completed
    setCompleted(nextCompleted)
    handleSaveAll({ completed: nextCompleted })
  }

  // Toggle Predefined or Custom Label
  const handleToggleLabel = (labelObj) => {
    const safeLabels = (labels || []).filter(Boolean)
    const exists = safeLabels.some((l) => l && l.color === labelObj.color && l.name === labelObj.name)
    let updated
    if (exists) {
      updated = safeLabels.filter((l) => !(l && l.color === labelObj.color && l.name === labelObj.name))
    } else {
      updated = [...safeLabels, { color: labelObj.color, name: labelObj.name }]
    }
    setLabels(updated)
    handleSaveAll({ labels: updated })
  }

  // Create Custom Label
  const handleCreateCustomLabel = (e) => {
    e.preventDefault()
    if (!customLabelColor) return
    const newLabel = {
      color: customLabelColor,
      name: customLabelTitle.trim() || 'Custom Label'
    }
    const updated = [...(labels || []).filter(Boolean), newLabel]
    setLabels(updated)
    setCustomLabelTitle('')
    setActivePopover(null)
    handleSaveAll({ labels: updated })
  }

  // Add New Checklist (Supports 1st, 2nd, 3rd, etc.)
  const handleAddChecklist = (e) => {
    if (e) e.preventDefault()
    const titleToUse = checklistTitleInput.trim() || `Checklist ${checklists.length + 1}`
    const newChecklist = {
      title: titleToUse,
      items: []
    }
    const updated = [...checklists, newChecklist]
    setChecklists(updated)
    setChecklistTitleInput('')
    setActivePopover(null)
    handleSaveAll({ checklists: updated })
  }

  // Subtask Checklist Item Handlers (Index based per checklist)
  const handleAddSubitem = (clIndex, e) => {
    e.preventDefault()
    const text = (newSubitemInputs[clIndex] || '').trim()
    if (!text) return
    const updated = checklists.map((cl, i) => {
      if (i === clIndex) {
        return {
          ...cl,
          items: [...(cl.items || []), { title: text, completed: false }]
        }
      }
      return cl
    })
    setChecklists(updated)
    setNewSubitemInputs((prev) => ({ ...prev, [clIndex]: '' }))
    handleSaveAll({ checklists: updated })
  }

  const handleToggleSubitem = (clIndex, itemIndex) => {
    const updated = checklists.map((cl, i) => {
      if (i === clIndex) {
        const updatedItems = (cl.items || []).map((item, j) =>
          j === itemIndex ? { ...item, completed: !item.completed } : item
        )
        return { ...cl, items: updatedItems }
      }
      return cl
    })
    setChecklists(updated)
    handleSaveAll({ checklists: updated })
  }

  const handleDeleteSubitem = (clIndex, itemIndex) => {
    const updated = checklists.map((cl, i) => {
      if (i === clIndex) {
        return {
          ...cl,
          items: (cl.items || []).filter((_, j) => j !== itemIndex)
        }
      }
      return cl
    })
    setChecklists(updated)
    handleSaveAll({ checklists: updated })
  }

  const handleDeleteChecklist = (clIndex) => {
    const updated = checklists.filter((_, i) => i !== clIndex)
    setChecklists(updated)
    handleSaveAll({ checklists: updated })
  }

  // Link Attachments
  const handleAddAttachment = (e) => {
    e.preventDefault()
    if (!newAttachmentUrl.trim()) return
    let finalUrl = newAttachmentUrl.trim()
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = `https://${finalUrl}`
    }
    const newAtt = {
      url: finalUrl,
      title: newAttachmentTitle.trim() || finalUrl,
      createdAt: new Date().toISOString()
    }
    const updated = [...(attachments || []).filter(Boolean), newAtt]
    setAttachments(updated)
    setNewAttachmentUrl('')
    setNewAttachmentTitle('')
    setActivePopover(null)
    handleSaveAll({ attachments: updated })
  }

  const handleDeleteAttachment = (index) => {
    const updated = (attachments || []).filter(Boolean).filter((_, i) => i !== index)
    setAttachments(updated)
    handleSaveAll({ attachments: updated })
  }

  // Comment Handlers
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

  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return normalizedBoardMembers
    const q = memberSearch.toLowerCase()
    return normalizedBoardMembers.filter(
      (m) => m.name.toLowerCase().includes(q) || m.username.toLowerCase().includes(q)
    )
  }, [normalizedBoardMembers, memberSearch])

  // Creation Date Formatting
  const creationDateStr = useMemo(() => {
    if (!card?.createdAt) return ''
    try {
      const d = new Date(card.createdAt)
      return d.toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (e) {
      return ''
    }
  }, [card?.createdAt])

  // Check if Badges row has any content to display
  const hasMembers = (assignedMembers || []).filter(Boolean).length > 0
  const hasLabels = (labels || []).filter(Boolean).length > 0
  const hasDueDate = Boolean(dueDate)
  const showBadgesRow = hasMembers || hasLabels || hasDueDate

  // Check if description has content
  const hasDescContent = !isHtmlEmpty(description)

  // Check if description has unsaved changes
  const initialHtmlDesc = convertMarkdownToHtml(card?.description || '')
  const isDescChanged = description !== initialHtmlDesc

  // Actions Popover key check to prevent empty overlay container rendering
  const isActionTabPopoverOpen = ['members', 'labels', 'dates', 'checklist', 'attachment'].includes(activePopover)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn font-sans text-white">
      
      {/* --------------------------- MAIN MODAL CONTAINER --------------------------- */}
      <div className="bg-[#1C1C24] border border-[#2A2A38] w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] relative select-none">
        
        {/* TOP BAR / HEADER */}
        <div className="px-6 py-3.5 border-b border-[#2A2A38] bg-[#161620] flex items-center justify-between gap-4 shrink-0">
          
          {/* Left: List Dropdown Pill */}
          <div className="flex items-center gap-3 relative">
            <div className="relative">
              <button
                type="button"
                onClick={() => setActivePopover(activePopover === 'listSelect' ? null : 'listSelect')}
                className="px-3 py-1.5 rounded-xl bg-[#252533] hover:bg-[#2F2F40] border border-[#3A3A4D] text-xs font-semibold text-gray-200 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
                title="Move to list"
              >
                <span className="text-purple-400 font-bold">{listTitle || 'To Do'}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              {/* List Selector Dropdown Popover */}
              {activePopover === 'listSelect' && (
                <div ref={popoverRef} className="absolute left-0 top-10 z-50 w-52 bg-[#181822] border border-[#2A2A38] rounded-xl p-1.5 shadow-2xl animate-fadeIn flex flex-col gap-1 text-xs">
                  <div className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Move Card to List</div>
                  {(boardLists || []).map((l) => (
                    <button
                      key={l._id}
                      type="button"
                      onClick={() => {
                        if (onMoveCardToList) onMoveCardToList(l._id, l.title)
                        setActivePopover(null)
                      }}
                      className={`px-3 py-2 rounded-lg text-left font-medium transition-all cursor-pointer flex items-center justify-between ${
                        l.title === listTitle
                          ? 'bg-purple-600/20 text-purple-300 font-bold'
                          : 'text-gray-300 hover:bg-[#252533]'
                      }`}
                    >
                      <span>{l.title}</span>
                      {l.title === listTitle && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-purple-400">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {isViewer && (
              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30 flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                Read Only
              </span>
            )}
          </div>

          {/* Right Header Actions: Card Creation Time, Delete Button & Close Button */}
          <div className="flex items-center gap-3">
            
            {/* Card Creation Date & Time */}
            {creationDateStr && (
              <span className="text-[11px] font-medium text-gray-400 flex items-center gap-1.5 bg-[#252533]/60 border border-[#3A3A4D]/50 px-2.5 py-1 rounded-xl">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                <span>Created {creationDateStr}</span>
              </span>
            )}

            {/* Delete Card Icon Button */}
            {!isViewer && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                title="Delete Card"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  <line x1="10" y1="11" x2="10" y2="17"/>
                  <line x1="14" y1="11" x2="14" y2="17"/>
                </svg>
              </button>
            )}

            {/* Close Modal Button */}
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* --------------------------- 2-COLUMN MODAL BODY --------------------------- */}
        <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-[#2A2A38]">
          
          {/* ================= LEFT COLUMN: MAIN CARD DETAILS ================= */}
          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            
            {/* 1. CARD TITLE WITH EDIT ICON & CHECKMARK TOGGLE */}
            <div className="flex items-start gap-3">
              <button
                type="button"
                disabled={isViewer}
                onClick={handleToggleComplete}
                className={`mt-1 shrink-0 w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center cursor-pointer ${
                  completed
                    ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                    : 'border-gray-500 hover:border-purple-400 text-transparent bg-transparent'
                }`}
                title={completed ? 'Mark incomplete' : 'Mark complete'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </button>

              <div className="flex-1 flex items-center gap-2">
                <input
                  ref={titleInputRef}
                  type="text"
                  value={title}
                  disabled={isViewer}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => handleSaveAll()}
                  className={`text-xl font-bold text-white bg-transparent border-b border-transparent focus:border-purple-500 hover:border-gray-700 rounded px-1 py-0.5 flex-1 focus:outline-none transition-colors ${
                    completed ? 'line-through text-gray-400' : ''
                  }`}
                  placeholder="Task title..."
                />
                
                {/* Pencil Edit Icon for Title */}
                {!isViewer && (
                  <button
                    type="button"
                    onClick={() => titleInputRef.current?.focus()}
                    className="text-gray-500 hover:text-purple-400 p-1 rounded hover:bg-white/5 transition-colors cursor-pointer"
                    title="Change card name"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 20h9"/>
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* 2. ACTION TABS BAR (Members, Labels, Dates, Checklist, Attachment) */}
            <div className="relative flex items-center gap-2 flex-wrap">
              
              {/* Members Button */}
              <button
                type="button"
                disabled={isViewer}
                onClick={() => setActivePopover(activePopover === 'members' ? null : 'members')}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activePopover === 'members' ? 'bg-purple-600/30 border-purple-500 text-purple-300' : 'bg-[#121218] border-[#2A2A38] text-gray-300 hover:border-gray-500'
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                <span>Members</span>
              </button>

              {/* Labels Button */}
              <button
                type="button"
                disabled={isViewer}
                onClick={() => setActivePopover(activePopover === 'labels' ? null : 'labels')}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activePopover === 'labels' ? 'bg-purple-600/30 border-purple-500 text-purple-300' : 'bg-[#121218] border-[#2A2A38] text-gray-300 hover:border-gray-500'
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                <span>Labels</span>
              </button>

              {/* Dates Button */}
              <button
                type="button"
                disabled={isViewer}
                onClick={() => setActivePopover(activePopover === 'dates' ? null : 'dates')}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activePopover === 'dates' ? 'bg-purple-600/30 border-purple-500 text-purple-300' : 'bg-[#121218] border-[#2A2A38] text-gray-300 hover:border-gray-500'
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <span>Dates</span>
              </button>

              {/* Checklist Button */}
              <button
                type="button"
                disabled={isViewer}
                onClick={() => setActivePopover(activePopover === 'checklist' ? null : 'checklist')}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activePopover === 'checklist' ? 'bg-purple-600/30 border-purple-500 text-purple-300' : 'bg-[#121218] border-[#2A2A38] text-gray-300 hover:border-gray-500'
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                <span>Checklist</span>
              </button>

              {/* Attachment Button */}
              <button
                type="button"
                disabled={isViewer}
                onClick={() => setActivePopover(activePopover === 'attachment' ? null : 'attachment')}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activePopover === 'attachment' ? 'bg-purple-600/30 border-purple-500 text-purple-300' : 'bg-[#121218] border-[#2A2A38] text-gray-300 hover:border-gray-500'
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                <span>Attachment</span>
              </button>

              {/* ----------------- POPOVER OVERLAYS CONTAINER ----------------- */}
              {isActionTabPopoverOpen && (
                <div ref={popoverRef} className="absolute left-0 top-11 z-50 bg-[#1A1A26] border border-[#3A3A4D] rounded-2xl p-4 shadow-2xl animate-fadeIn w-80 text-xs text-white">
                  
                  {/* Popover Header */}
                  <div className="flex items-center justify-between border-b border-[#2A2A38] pb-2 mb-3">
                    <span className="font-bold text-gray-200 uppercase tracking-wider text-[11px]">
                      {activePopover === 'members' && 'Board Members'}
                      {activePopover === 'labels' && 'Labels'}
                      {activePopover === 'dates' && 'Due Date'}
                      {activePopover === 'checklist' && 'Add Checklist'}
                      {activePopover === 'attachment' && 'Attach Link'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActivePopover(null)}
                      className="text-gray-400 hover:text-white cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  {/* 1. POPOVER: MEMBERS */}
                  {activePopover === 'members' && (
                    <div className="space-y-2.5">
                      <input
                        type="text"
                        placeholder="Search members..."
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        className="w-full bg-[#121218] border border-[#2A2A38] rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                      />
                      <div className="max-h-48 overflow-y-auto space-y-1 pr-0.5">
                        {filteredMembers.map((m) => {
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
                              className={`w-full px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer ${
                                isAssigned ? 'bg-purple-600/20 text-purple-300 font-semibold' : 'hover:bg-[#252533] text-gray-300'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-[#121218] border border-purple-500/40 p-0.5 flex items-center justify-center overflow-hidden shrink-0">
                                  <img src={getDiceBearAvatar(m.avatar || displayName) || ''} alt={displayName} className="w-full h-full object-contain rounded-full" />
                                </div>
                                <span className="truncate max-w-[170px]">{displayName}</span>
                              </div>
                              {isAssigned && (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-purple-400">
                                  <polyline points="20 6 9 17 4 12"/>
                                </svg>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* 2. POPOVER: LABELS (2 IN A ROW GRID + OR SEPARATOR + EQUAL COLOR SWATCHES) */}
                  {activePopover === 'labels' && (
                    <div className="space-y-3">
                      <div>
                        <span className="text-gray-400 font-semibold text-[10px] block mb-2 uppercase tracking-wider">Predefined Labels</span>
                        
                        {/* 2 Labels Per Row Grid */}
                        <div className="grid grid-cols-2 gap-2">
                          {PREDEFINED_LABELS.map((l) => {
                            const isSelected = (labels || []).some((item) => item && item.color === l.color && item.name === l.name)
                            return (
                              <button
                                key={l.color + l.name}
                                type="button"
                                onClick={() => handleToggleLabel(l)}
                                className="h-7 rounded-lg px-2.5 text-[11px] font-semibold flex items-center justify-between transition-transform active:scale-95 shadow cursor-pointer truncate"
                                style={{ background: l.color, color: '#fff' }}
                              >
                                <span className="truncate">{l.name}</span>
                                {isSelected && (
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-white ml-1 shrink-0">
                                    <polyline points="20 6 9 17 4 12"/>
                                  </svg>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Clear "OR" Divider */}
                      <div className="relative flex py-1 items-center">
                        <div className="flex-grow border-t border-[#2A2A38]"></div>
                        <span className="flex-shrink mx-2 text-[10px] text-gray-400 font-bold uppercase tracking-widest">OR</span>
                        <div className="flex-grow border-t border-[#2A2A38]"></div>
                      </div>

                      {/* Custom Label Creator Form */}
                      <form onSubmit={handleCreateCustomLabel} className="space-y-2.5">
                        <span className="text-gray-400 font-semibold text-[10px] block uppercase tracking-wider">Create Custom Label</span>
                        <input
                          type="text"
                          placeholder="Label title..."
                          value={customLabelTitle}
                          onChange={(e) => setCustomLabelTitle(e.target.value)}
                          className="w-full bg-[#121218] border border-[#2A2A38] focus:border-purple-500 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                        />
                        
                        <div>
                          <span className="text-gray-400 text-[10px] block mb-1.5">Choose Color</span>
                          
                          {/* 5 columns x 2 rows equal grid for color swatches */}
                          <div className="grid grid-cols-5 gap-2">
                            {PRESET_COLORS.map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => setCustomLabelColor(c)}
                                className={`h-6 rounded-full transition-all cursor-pointer flex items-center justify-center ${
                                  customLabelColor === c ? 'ring-2 ring-white scale-105' : 'opacity-80 hover:opacity-100'
                                }`}
                                style={{ background: c }}
                              />
                            ))}
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer shadow mt-1"
                        >
                          Create & Add Label
                        </button>
                      </form>
                    </div>
                  )}

                  {/* 3. POPOVER: DATES */}
                  {activePopover === 'dates' && (
                    <div className="space-y-3">
                      <input
                        type="date"
                        value={dueDate ? dueDate.split('T')[0] : ''}
                        onChange={(e) => {
                          setDueDate(e.target.value)
                          handleSaveAll({ dueDate: e.target.value })
                        }}
                        className="w-full bg-[#121218] border border-[#2A2A38] text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-500"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setActivePopover(null)}
                          className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                        >
                          Save Date
                        </button>
                        {dueDate && (
                          <button
                            type="button"
                            onClick={() => {
                              setDueDate('')
                              handleSaveAll({ dueDate: '' })
                              setActivePopover(null)
                            }}
                            className="px-3 py-2 bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 4. POPOVER: CHECKLIST (MULTIPLE CHECKLISTS CREATOR) */}
                  {activePopover === 'checklist' && (
                    <form onSubmit={handleAddChecklist} className="space-y-3">
                      <div>
                        <label className="text-gray-400 font-semibold text-[10px] block mb-1">Checklist Title</label>
                        <input
                          type="text"
                          placeholder={`Checklist ${checklists.length + 1}`}
                          value={checklistTitleInput}
                          onChange={(e) => setChecklistTitleInput(e.target.value)}
                          className="w-full bg-[#121218] border border-[#2A2A38] focus:border-purple-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                          autoFocus
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer shadow"
                      >
                        Add Checklist
                      </button>
                    </form>
                  )}

                  {/* 5. POPOVER: ATTACHMENT (LINK ONLY) */}
                  {activePopover === 'attachment' && (
                    <form onSubmit={handleAddAttachment} className="space-y-3">
                      <div>
                        <label className="text-gray-400 font-semibold text-[10px] block mb-1">Attach Link (URL)</label>
                        <input
                          type="url"
                          placeholder="https://example.com"
                          value={newAttachmentUrl}
                          onChange={(e) => setNewAttachmentUrl(e.target.value)}
                          className="w-full bg-[#121218] border border-[#2A2A38] focus:border-purple-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-gray-400 font-semibold text-[10px] block mb-1">Display Name (Optional)</label>
                        <input
                          type="text"
                          placeholder="Design link / Documentation..."
                          value={newAttachmentTitle}
                          onChange={(e) => setNewAttachmentTitle(e.target.value)}
                          className="w-full bg-[#121218] border border-[#2A2A38] focus:border-purple-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer shadow"
                      >
                        Attach Link
                      </button>
                    </form>
                  )}

                </div>
              )}
            </div>

            {/* 3. SELECTED BADGES ROW (Only rendered if Members, Labels, or Due Date are active!) */}
            {showBadgesRow && (
              <div className="flex flex-wrap items-start gap-6 pt-1">
                
                {/* Active Members List */}
                {hasMembers && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-gray-400 block uppercase">Members</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(assignedMembers || []).filter(Boolean).map((m, idx) => {
                        const uId = typeof m === 'object' ? (m._id || m.id) : m
                        const displayName = (typeof m === 'object' ? (m.name || m.username) : null) || 'User'
                        const avatarSeed = (typeof m === 'object' ? (m.avatar || displayName) : displayName)
                        const avatarUri = getDiceBearAvatar(avatarSeed) || ''
                        return (
                          <div
                            key={uId || idx}
                            title={`@${displayName}`}
                            className="w-7 h-7 rounded-full bg-[#121218] border border-purple-500/40 p-0.5 flex items-center justify-center shadow overflow-hidden"
                          >
                            <img src={avatarUri} alt={displayName} className="w-full h-full object-contain rounded-full" />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Active Labels List */}
                {hasLabels && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-gray-400 block uppercase">Labels</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(labels || []).filter(Boolean).map((l, idx) => (
                        <span
                          key={l.color + (l.name || idx)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1"
                          style={{ background: l.color, color: '#fff' }}
                        >
                          {l.name || 'Label'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Active Due Date Badge */}
                {hasDueDate && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-gray-400 block uppercase">Due Date</span>
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-medium inline-flex items-center gap-1.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                      </svg>
                      <span>{new Date(dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </span>
                  </div>
                )}

              </div>
            )}

            {/* 4. DESCRIPTION SECTION WITH REAL-TIME WYSIWYG RICH TEXT EDITOR */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="21" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="3" y2="18"/></svg>
                  <h3 className="font-bold text-sm text-gray-200">Description</h3>
                </div>

                {/* Edit Button / Unsaved Badge */}
                <div className="flex items-center gap-2">
                  {isDescChanged && (
                    <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[11px] font-semibold border border-amber-500/30 animate-fadeIn">
                      Unsaved changes
                    </span>
                  )}
                  {!isEditingDesc && !isViewer && (
                    <button
                      type="button"
                      onClick={() => setIsEditingDesc(true)}
                      className="px-2.5 py-1 rounded-xl bg-[#252533] hover:bg-[#2F2F40] border border-[#3A3A4D] text-xs font-semibold text-gray-300 hover:text-white transition-colors cursor-pointer"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>

              {/* VIEW MODE */}
              {!isEditingDesc ? (
                <div
                  onClick={() => !isViewer && setIsEditingDesc(true)}
                  className={`bg-[#121218] border border-[#2A2A38] hover:border-gray-600 rounded-2xl p-4 min-h-[80px] transition-all cursor-pointer [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-white [&_h1]:mt-2 [&_h1]:mb-1 [&_h1]:border-b [&_h1]:border-[#2A2A38] [&_h1]:pb-1 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-purple-300 [&_h2]:mt-2 [&_h2]:mb-1 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-purple-200 [&_h3]:mt-1.5 [&_h3]:mb-1 [&_ul]:list-disc [&_ul]:list-inside [&_ul]:my-1.5 [&_li]:my-0.5 [&_a]:text-purple-400 [&_a]:underline [&_a]:font-medium [&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic ${
                    !hasDescContent ? 'flex items-center text-gray-500 text-xs italic' : ''
                  }`}
                >
                  {hasDescContent ? (
                    <div dangerouslySetInnerHTML={{ __html: description }} />
                  ) : (
                    <span>Write your thoughts or add a detailed description...</span>
                  )}
                </div>
              ) : (
                /* REAL-TIME WYSIWYG EDIT MODE */
                <div className="space-y-2.5">
                  <div className="bg-[#121218] border border-purple-500 ring-1 ring-purple-500/50 rounded-2xl overflow-hidden transition-colors relative">
                    
                    {/* WYSIWYG Toolbar */}
                    <div className="bg-[#181822] border-b border-[#2A2A38] px-3 py-1.5 flex items-center gap-1 flex-wrap text-xs select-none">
                      
                      {/* Text Size Dropdown (Tt v) */}
                      <div className="relative">
                        <button
                          type="button"
                          disabled={isViewer}
                          onClick={() => setShowHeadingMenu(!showHeadingMenu)}
                          className="px-2 py-1 rounded-lg hover:bg-white/10 text-gray-300 font-semibold flex items-center gap-1 cursor-pointer"
                          title="Text size"
                        >
                          <span className="font-serif font-bold text-sm">Tt</span>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                        </button>
                        {showHeadingMenu && (
                          <div className="absolute left-0 top-8 z-20 bg-[#1F1F2B] border border-[#3A3A4D] rounded-xl p-1 shadow-xl flex flex-col w-32 text-xs">
                            <button type="button" onClick={() => applyHeadingBlock(null)} className="px-3 py-1.5 hover:bg-purple-600/30 rounded text-left text-gray-200">Normal text</button>
                            <button type="button" onClick={() => applyHeadingBlock('h1')} className="px-3 py-1.5 hover:bg-purple-600/30 rounded text-left font-bold text-sm text-white">Heading 1</button>
                            <button type="button" onClick={() => applyHeadingBlock('h2')} className="px-3 py-1.5 hover:bg-purple-600/30 rounded text-left font-semibold text-gray-100">Heading 2</button>
                            <button type="button" onClick={() => applyHeadingBlock('h3')} className="px-3 py-1.5 hover:bg-purple-600/30 rounded text-left font-medium text-gray-200">Heading 3</button>
                          </div>
                        )}
                      </div>

                      <div className="w-[1px] h-4 bg-[#2A2A38] mx-1"></div>

                      {/* Bold (B) */}
                      <button
                        type="button"
                        disabled={isViewer}
                        onClick={applyBold}
                        className="w-7 h-7 rounded-lg hover:bg-white/10 text-gray-300 font-bold flex items-center justify-center cursor-pointer text-sm"
                        title="Bold text"
                      >
                        B
                      </button>

                      {/* Italic (I) */}
                      <button
                        type="button"
                        disabled={isViewer}
                        onClick={applyItalic}
                        className="w-7 h-7 rounded-lg hover:bg-white/10 text-gray-300 italic font-serif flex items-center justify-center cursor-pointer text-sm"
                        title="Italic text"
                      >
                        I
                      </button>

                      <div className="w-[1px] h-4 bg-[#2A2A38] mx-1"></div>

                      {/* Bullet List (:=) */}
                      <button
                        type="button"
                        disabled={isViewer}
                        onClick={applyBulletList}
                        className="w-7 h-7 rounded-lg hover:bg-white/10 text-gray-300 flex items-center justify-center cursor-pointer"
                        title="Bullet list"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                      </button>

                      {/* Insert Link (🔗) */}
                      <button
                        type="button"
                        disabled={isViewer}
                        onClick={handleOpenLinkModal}
                        className="w-7 h-7 rounded-lg hover:bg-white/10 text-gray-300 flex items-center justify-center cursor-pointer"
                        title="Insert link"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                      </button>

                    </div>

                    {/* ContentEditable Editor Container with Overlay Placeholder */}
                    <div className="relative">
                      {!hasDescContent && (
                        <div className="absolute top-3.5 left-3.5 text-xs text-gray-500 italic pointer-events-none select-none">
                          Write your thoughts or add a detailed description...
                        </div>
                      )}
                      <div
                        ref={descEditorRef}
                        contentEditable={!isViewer}
                        suppressContentEditableWarning
                        onInput={() => {
                          if (descEditorRef.current) {
                            setDescription(descEditorRef.current.innerHTML)
                          }
                        }}
                        className="w-full min-h-[120px] p-3.5 text-xs text-white outline-none leading-relaxed focus:outline-none [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-white [&_h1]:mt-2 [&_h1]:mb-1 [&_h1]:border-b [&_h1]:border-[#2A2A38] [&_h1]:pb-1 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-purple-300 [&_h2]:mt-2 [&_h2]:mb-1 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-purple-200 [&_h3]:mt-1.5 [&_h3]:mb-1 [&_ul]:list-disc [&_ul]:list-inside [&_ul]:my-1.5 [&_li]:my-0.5 [&_a]:text-purple-400 [&_a]:underline [&_a]:font-medium [&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic"
                      />
                    </div>
                  </div>

                  {/* Save & Discard Controls */}
                  {!isViewer && (
                    <div className="flex items-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          handleSaveAll({ description })
                          setIsEditingDesc(false)
                        }}
                        className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer shadow"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const resetHtml = convertMarkdownToHtml(card?.description || '')
                          setDescription(resetHtml)
                          if (descEditorRef.current) descEditorRef.current.innerHTML = resetHtml
                          setIsEditingDesc(false)
                        }}
                        className="text-gray-400 hover:text-white font-medium text-xs transition-colors cursor-pointer"
                      >
                        Discard changes
                      </button>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* 5. MULTIPLE CHECKLISTS SECTION (PLACED BELOW DESCRIPTION) */}
            {checklists.map((cl, clIndex) => {
              const items = cl.items || []
              const totalItems = items.length
              const completedItems = items.filter((i) => i.completed).length
              const percent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

              return (
                <div key={clIndex} className="space-y-3 pt-2">
                  
                  {/* Checklist Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                      <h3 className="font-bold text-sm text-gray-200">{cl.title || `Checklist ${clIndex + 1}`}</h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-purple-400">
                        {completedItems}/{totalItems} ({percent}%)
                      </span>
                      {!isViewer && (
                        <button
                          type="button"
                          onClick={() => handleDeleteChecklist(clIndex)}
                          className="px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-medium transition-colors cursor-pointer"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {totalItems > 0 && (
                    <div className="w-full h-2 bg-[#121218] rounded-full overflow-hidden border border-[#2A2A38]">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-emerald-400 transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  )}

                  {/* Checklist Subtask Items */}
                  <div className="space-y-2">
                    {items.map((item, itemIndex) => (
                      <div
                        key={itemIndex}
                        className="flex items-center justify-between bg-[#121218] border border-[#2A2A38] rounded-xl px-3.5 py-2 hover:border-purple-500/40 transition-colors"
                      >
                        <div
                          onClick={() => !isViewer && handleToggleSubitem(clIndex, itemIndex)}
                          className="flex items-center gap-3 cursor-pointer flex-1 min-w-0 select-none"
                        >
                          {/* Clean Outlined Checkmark Button */}
                          <button
                            type="button"
                            disabled={isViewer}
                            className={`w-4 h-4 rounded-md border-2 transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                              item.completed
                                ? 'border-purple-500 bg-purple-500/20 text-purple-400'
                                : 'border-gray-600 hover:border-purple-400 text-transparent bg-transparent'
                            }`}
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          </button>
                          <span className={`text-xs break-words ${item.completed ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                            {item.title}
                          </span>
                        </div>

                        {!isViewer && (
                          <button
                            type="button"
                            onClick={() => handleDeleteSubitem(clIndex, itemIndex)}
                            className="text-gray-500 hover:text-red-400 p-1 text-xs cursor-pointer"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Add Subitem Form per Checklist */}
                  {!isViewer && (
                    <form onSubmit={(e) => handleAddSubitem(clIndex, e)} className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="Add an item..."
                        value={newSubitemInputs[clIndex] || ''}
                        onChange={(e) => setNewSubitemInputs({ ...newSubitemInputs, [clIndex]: e.target.value })}
                        className="flex-1 bg-[#121218] border border-[#2A2A38] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                      />
                      <button
                        type="submit"
                        className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 font-semibold rounded-xl text-xs text-white transition-colors cursor-pointer"
                      >
                        Add
                      </button>
                    </form>
                  )}

                </div>
              )
            })}

            {/* 6. ATTACHMENTS (LINK ONLY) SECTION */}
            {attachments.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                    <h3 className="font-bold text-sm text-gray-200">Attachments</h3>
                  </div>
                  {!isViewer && (
                    <button
                      type="button"
                      onClick={() => setActivePopover('attachment')}
                      className="px-3 py-1 rounded-xl bg-[#252533] hover:bg-[#2F2F40] border border-[#3A3A4D] text-xs font-semibold text-gray-300 hover:text-white transition-colors cursor-pointer"
                    >
                      + Add Link
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {(attachments || []).filter(Boolean).map((att, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-[#121218] border border-[#2A2A38] rounded-xl p-3 hover:border-purple-500/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                        <div className="w-8 h-8 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <a
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-xs text-purple-300 hover:underline truncate block"
                          >
                            {att.title || att.url}
                          </a>
                          <span className="text-[10px] text-gray-500 truncate block">{att.url}</span>
                        </div>
                      </div>

                      {!isViewer && (
                        <button
                          type="button"
                          onClick={() => handleDeleteAttachment(idx)}
                          className="text-gray-500 hover:text-red-400 p-1 text-xs cursor-pointer"
                          title="Delete attachment"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* ================= RIGHT COLUMN: COMMENTS & ACTIVITY PANEL ================= */}
          <div className="w-full lg:w-96 bg-[#161620] p-6 space-y-5 flex flex-col justify-between shrink-0">
            <div className="space-y-4 flex-1">
              
              {/* Panel Header */}
              <div className="flex items-center justify-between border-b border-[#2A2A38] pb-3">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  <h3 className="font-bold text-sm text-gray-200">Comments and activity</h3>
                </div>

                <button
                  type="button"
                  onClick={() => setShowActivityDetails(!showActivityDetails)}
                  className="px-2.5 py-1 rounded-xl bg-[#252533] hover:bg-[#2F2F40] border border-[#3A3A4D] text-[11px] font-semibold text-gray-300 hover:text-white transition-colors cursor-pointer"
                >
                  {showActivityDetails ? 'Hide details' : 'Show details'}
                </button>
              </div>

              {/* Post New Comment Input Box */}
              {!isViewer ? (
                <form onSubmit={handleAddComment} className="space-y-2">
                  <textarea
                    rows={2}
                    placeholder="Write a comment..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    className="w-full bg-[#121218] border border-[#2A2A38] focus:border-purple-500 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none resize-none leading-relaxed"
                  />
                  {newCommentText.trim() && (
                    <button
                      type="submit"
                      disabled={commentLoading}
                      className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer shadow"
                    >
                      {commentLoading ? 'Posting...' : 'Save Comment'}
                    </button>
                  )}
                </form>
              ) : (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 text-amber-300 text-xs flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  <span>Read-Only mode. Commenting is disabled for Viewers.</span>
                </div>
              )}

              {/* Comments & Activity Stream */}
              <div className="space-y-3.5 max-h-[50vh] lg:max-h-[60vh] overflow-y-auto pr-1">
                
                {/* Dynamic System Activity Entry with Relative Time */}
                {showActivityDetails && (
                  <div className="flex items-start gap-2.5 text-xs text-gray-400 bg-[#121218]/60 p-2.5 rounded-xl border border-[#2A2A38]/50">
                    <div className="w-6 h-6 rounded-full bg-purple-600/30 text-purple-300 border border-purple-500/40 flex items-center justify-center text-[10px] font-bold shrink-0">
                      {currentUser?.username ? currentUser.username.slice(0, 2).toUpperCase() : 'LD'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] leading-tight">
                        <span className="font-semibold text-gray-200">{currentUser?.username || 'User'}</span> added this card to <span className="font-medium text-purple-300">{listTitle || 'Board'}</span>
                      </p>
                      <span className="text-[10px] text-gray-500">{formatTimeAgo(card?.createdAt) || 'just now'}</span>
                    </div>
                  </div>
                )}

                {/* User Comments List with Smart Relative Time */}
                {(comments || []).filter(Boolean).length === 0 ? (
                  <p className="text-xs text-gray-500 italic text-center py-4">No comments yet.</p>
                ) : (
                  (comments || []).filter(Boolean).map((c) => {
                    const authorObj = (c.authorId && typeof c.authorId === 'object') ? c.authorId : {}
                    const authorName = authorObj.name || authorObj.username || 'User'
                    const authorAvatarUri = getDiceBearAvatar(authorObj.avatar || authorName) || ''
                    const authorIdVal = authorObj._id || c.authorId
                    const currentUserIdVal = currentUser?.id || currentUser?._id
                    const isAuthor = Boolean(authorIdVal && currentUserIdVal && String(authorIdVal) === String(currentUserIdVal))

                    return (
                      <div key={c._id || Math.random()} className="flex items-start gap-2.5 bg-[#121218] border border-[#2A2A38] rounded-xl p-3">
                        <div className="w-7 h-7 rounded-full bg-[#161620] border border-purple-500/40 p-0.5 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                          <img src={authorAvatarUri} alt={authorName} className="w-full h-full object-contain rounded-full" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="font-bold text-xs text-purple-300">{authorName}</span>
                            <span className="text-[10px] text-gray-500" title={c.createdAt ? new Date(c.createdAt).toLocaleString() : ''}>
                              {formatTimeAgo(c.createdAt)}
                            </span>
                          </div>

                          <div className="bg-[#1C1C26] rounded-lg p-2 text-xs text-gray-200 leading-relaxed whitespace-pre-wrap mb-1">
                            {c.text}
                          </div>

                          {!isViewer && isAuthor && c._id && (
                            <div className="flex items-center gap-2 text-[10px] text-gray-500">
                              <button
                                type="button"
                                onClick={() => handleDeleteComment(c._id)}
                                className="hover:text-red-400 transition-colors cursor-pointer"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

            </div>

            {/* Modal Footer Auto-save Status */}
            <div className="pt-3 border-t border-[#2A2A38] flex items-center justify-between text-[11px] text-gray-400">
              <span>{saving ? 'Syncing...' : 'Saved'}</span>
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 rounded-xl text-xs font-semibold text-white transition-colors cursor-pointer shadow"
              >
                Done
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* ================= LINK INSERTION POP-UP MODAL ================= */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <form onSubmit={handleConfirmInsertLink} className="bg-[#1A1A26] border border-[#3A3A4D] rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4 text-white text-xs">
            <div className="flex items-center justify-between border-b border-[#2A2A38] pb-2.5">
              <span className="font-bold text-sm text-gray-100 flex items-center gap-2">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-400"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                Add Link
              </span>
              <button type="button" onClick={() => setShowLinkModal(false)} className="text-gray-400 hover:text-white cursor-pointer">
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-gray-300 font-semibold text-[11px] block mb-1">Link URL <span className="text-red-400">*</span></label>
                <input
                  type="url"
                  placeholder="https://example.com"
                  value={linkUrlInput}
                  onChange={(e) => setLinkUrlInput(e.target.value)}
                  className="w-full bg-[#121218] border border-[#2A2A38] focus:border-purple-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="text-gray-300 font-semibold text-[11px] block mb-1">Link Name / Title <span className="text-gray-500 font-normal">(Optional)</span></label>
                <input
                  type="text"
                  placeholder="Documentation / Link title..."
                  value={linkTitleInput}
                  onChange={(e) => setLinkTitleInput(e.target.value)}
                  className="w-full bg-[#121218] border border-[#2A2A38] focus:border-purple-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="flex-1 py-2 rounded-xl bg-[#252533] hover:bg-[#2F2F40] text-gray-300 font-semibold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors cursor-pointer shadow"
              >
                Insert Link
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= DELETE CARD CONFIRMATION MODAL ================= */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#1A1A26] border border-[#3A3A4D] rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center">
            
            <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Delete Card?</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Are you sure you want to delete <span className="text-white font-semibold">"{title}"</span>? All checklist subtasks, link attachments, comments, and history will be permanently lost.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 rounded-xl bg-[#252533] hover:bg-[#2F2F40] text-gray-300 font-semibold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingCard}
                onClick={handleConfirmDeleteCard}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50 shadow"
              >
                {isDeletingCard ? 'Deleting...' : 'Delete Card'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}

export default CardDetailModal
