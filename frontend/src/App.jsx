// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import LoginPage     from './pages/LoginPage'
import RegisterPage  from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import BoardPage     from './pages/BoardPage'
import SettingsPage  from './pages/SettingsPage'
import InviteLandingPage from './pages/InviteLandingPage'
import NotFoundPage  from './pages/NotFoundPage'

// protects routes — if not logged in, redirect to login
function ProtectedRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/invite" element={<Navigate to="/" replace />} />
        <Route path="/invite/:inviteToken" element={<InviteLandingPage />} />
        <Route path="/" element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }/>
        <Route path="/board/:boardId" element={
          <ProtectedRoute>
            <BoardPage />
          </ProtectedRoute>
        }/>
        <Route path="/settings" element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }/>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App