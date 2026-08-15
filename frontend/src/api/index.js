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
    if(token) config.headers.Authorization = `Bearer ${token}`
    return config
})

api.interceptors.response.use(
    response => response,
    error => {
      if(error.response?.status === 401){
        localStorage.removeItem('token')
        window.location.href = '/login'
      }
      return Promise.reject(error)  
    }
)

//---------- Auth ---------------
export const register = (data) => api.post('/auth/register', data)
export const login = (data) => api.post('/auth/login', data)

// ---- boards ----
export const getBoards    = ()       => api.get('/boards')
export const createBoard  = (data)   => api.post('/boards', data)
export const getBoard     = (id)     => api.get(`/boards/${id}`)
export const updateBoard  = (id, data) => api.patch(`/boards/${id}`, data)
export const deleteBoard  = (id)     => api.delete(`/boards/${id}`)
export const inviteMember = (id, data) => api.post(`/boards/${id}/members`, data)
export const removeMember = (id, userId) => api.delete(`/boards/${id}/members/${userId}`)
export const updateMemberRole = (id, userId, role) => api.patch(`/boards/${id}/members/${userId}`, { role })

// ---- lists ----
export const createList = (boardId, data) => api.post(`/boards/${boardId}/lists`, data)
export const renameList = (listId, data)  => api.patch(`/boards/${listId}`, data)
export const deleteList = (listId)        => api.delete(`/boards/${listId}`)

// ---- cards ----
export const createCard = (listId, data)  => api.post(`/lists/${listId}/cards`, data)
export const updateCard = (cardId, data)  => api.patch(`/cards/${cardId}`, data)
export const moveCard   = (cardId, data)  => api.patch(`/cards/${cardId}/move`, data)
export const deleteCard = (cardId)        => api.delete(`/cards/${cardId}`)