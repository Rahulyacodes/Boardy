import axios from 'axios'

// Dynamic base URL (supports Vite or Create React App environment variables)
const API_URL =
  import.meta.env?.VITE_API_URL ||
  'http://localhost:5000/api'

const api = axios.create({
  baseURL: API_URL
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

//---------- Auth ---------------
export const register = (data) => api.post('/auth/register', data)
export const sendRegistrationOtp = (data) => api.post('/auth/register-otp', data)
export const verifyRegistrationOtp = (data) => api.post('/auth/verify-registration-otp', data)
export const login = (data) => api.post('/auth/login', data)
export const sendLoginOtp = (data) => api.post('/auth/send-login-otp', data)
export const verifyLoginOtp = (data) => api.post('/auth/verify-login-otp', data)
export const googleLogin = (data) => api.post('/auth/google', data)
export const forgotPassword = (data) => api.post('/auth/forgot-password', data)
export const verifyOtp = (data) => api.post('/auth/verify-otp', data)
export const resetPassword = (data) => api.post('/auth/reset-password', data)
export const updateProfile = (data) => api.put('/auth/profile', data)
export const requestEmailChangeOtp = (data) => api.post('/auth/request-email-change-otp', data)
export const verifyEmailChangeOtp = (data) => api.post('/auth/verify-email-change-otp', data)
export const changePassword = (data) => api.put('/auth/change-password', data)

// ---- boards ----
export const getBoards = () => api.get('/boards')
export const createBoard = (data) => api.post('/boards', data)
export const getBoard = (id) => api.get(`/boards/${id}`)
export const updateBoard = (id, data) => api.patch(`/boards/${id}`, data)
export const deleteBoard = (id) => api.delete(`/boards/${id}`)
export const inviteMember = (id, data) => api.post(`/boards/${id}/members`, data)
export const removeMember = (id, userId) => api.delete(`/boards/${id}/members/${userId}`)
export const updateMemberRole = (id, userId, role) => api.patch(`/boards/${id}/members/${userId}`, { role })
export const getPendingInvites = () => api.get('/boards/invites/pending')
export const respondToInvite = (boardId, action) => api.patch(`/boards/${boardId}/invites/respond`, { action })
export const getInviteInfo = (inviteToken) => api.get(`/boards/invite-info/${inviteToken}`)
export const joinByLink = (inviteToken) => api.post(`/boards/join-by-link/${inviteToken}`)
export const leaveBoard = (boardId) => api.post(`/boards/${boardId}/leave`)

// ---- search ----
export const searchAll = (q) => api.get('/search', { params: { q } })

// ---- notifications ----
export const getNotifications = () => api.get('/notifications')
export const markNotificationRead = (id) => api.patch(`/notifications/${id}/read`)
export const markAllNotificationsRead = () => api.patch('/notifications/read-all')
export const deleteNotification = (id) => api.delete(`/notifications/${id}`)

// ---- lists ----
export const createList = (boardId, data) => api.post(`/boards/${boardId}/lists`, data)
export const updateList = (listId, data) => api.patch(`/lists/${listId}`, data)
export const renameList = (listId, data) => api.patch(`/lists/${listId}`, data)
export const deleteList = (listId) => api.delete(`/lists/${listId}`)

// ---- cards ----
export const createCard = (listId, data) => api.post(`/lists/${listId}/cards`, data)
export const updateCard = (cardId, data) => api.patch(`/cards/${cardId}`, data)
export const moveCard = (cardId, data) => api.patch(`/cards/${cardId}/move`, data)
export const deleteCard = (cardId) => api.delete(`/cards/${cardId}`)

// ---- comments ----
export const getCardComments = (cardId) => api.get(`/cards/${cardId}/comments`)
export const addCardComment = (cardId, text) => api.post(`/cards/${cardId}/comments`, { text })
export const deleteCardComment = (commentId) => api.delete(`/comments/${commentId}`)

// ---- board chat ----
export const getBoardMessages = (boardId) => api.get(`/boards/${boardId}/chat/messages`)
export const sendBoardMessage = (boardId, data) => api.post(`/boards/${boardId}/chat/messages`, data)