import { useState } from 'react'
import Navbar from '../components/layout/Navbar'
import { useAuth } from '../context/AuthContext'
import { updateProfile, changePassword } from '../api'
import { BOT_SEEDS, getDiceBearAvatar } from '../utils/avatars'

function SettingsPage() {
  const { user, updateUser } = useAuth()

  const [activeTab, setActiveTab] = useState('profile') // 'profile', 'security'

  // Profile Form State
  const [name, setName] = useState(user?.name || '')
  const [username, setUsername] = useState(user?.username || '')
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar || 'Gizmo')
  const [customSeed, setCustomSeed] = useState('')
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' })

  // Security Form State
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [securityLoading, setSecurityLoading] = useState(false)
  const [securityMsg, setSecurityMsg] = useState({ type: '', text: '' })

  const currentAvatarUri = getDiceBearAvatar(selectedAvatar || user?.username || 'Gizmo')

  // Handle Profile Update Submit
  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setProfileMsg({ type: '', text: '' })
    setProfileLoading(true)

    try {
      const res = await updateProfile({
        name: name.trim(),
        username: username.trim(),
        avatar: selectedAvatar
      })
      updateUser(res.data.user)
      setProfileMsg({ type: 'success', text: res.data.message || 'Profile updated successfully!' })
    } catch (err) {
      setProfileMsg({
        type: 'error',
        text: err.response?.data?.error || 'Failed to update profile. Please try again.'
      })
    } finally {
      setProfileLoading(false)
    }
  }

  // Handle Password Change Submit
  const handleSecuritySubmit = async (e) => {
    e.preventDefault()
    setSecurityMsg({ type: '', text: '' })

    if (newPassword.length < 6) {
      setSecurityMsg({ type: 'error', text: 'New password must be at least 6 characters long.' })
      return
    }

    if (newPassword !== confirmPassword) {
      setSecurityMsg({ type: 'error', text: 'New passwords do not match.' })
      return
    }

    setSecurityLoading(true)

    try {
      const res = await changePassword({
        currentPassword,
        newPassword
      })
      setSecurityMsg({ type: 'success', text: res.data.message || 'Password updated successfully!' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      if (!user.hasPassword) {
        updateUser({ hasPassword: true })
      }
    } catch (err) {
      setSecurityMsg({
        type: 'error',
        text: err.response?.data?.error || 'Failed to change password. Please try again.'
      })
    } finally {
      setSecurityLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0F0F14] text-white flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
        
        {/* Banner Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-[#171722] border border-[#2A2A38] p-6 mb-8 shadow-xl">
          <div className="flex flex-col sm:flex-row items-center gap-5 relative z-10">
            {/* DiceBear Avatar Preview */}
            <div className="w-20 h-20 rounded-2xl bg-[#13131A] border-2 border-purple-500/40 p-1 flex items-center justify-center shadow-lg shadow-purple-900/40 shrink-0">
              <img
                src={currentAvatarUri}
                alt="Selected Avatar"
                className="w-full h-full object-contain rounded-xl"
              />
            </div>

            <div className="text-center sm:text-left flex-1">
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center justify-center sm:justify-start gap-2">
                <span>{user?.name || user?.username || 'User Account'}</span>
              </h1>
              <p className="text-xs text-gray-400 mt-1">
                @{user?.username || 'username'} • {user?.email}
              </p>
            </div>
          </div>

          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-[#2A2A38] mb-6 gap-2">
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-3 px-4 font-semibold text-xs transition-all relative cursor-pointer ${
              activeTab === 'profile'
                ? 'text-purple-400 border-b-2 border-purple-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            👤 Profile Details
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`pb-3 px-4 font-semibold text-xs transition-all relative cursor-pointer ${
              activeTab === 'security'
                ? 'text-purple-400 border-b-2 border-purple-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            🔒 Security & Password
          </button>
        </div>

        {/* TAB 1: Profile Details & Avatar Selector */}
        {activeTab === 'profile' && (
          <div className="bg-[#171722] border border-[#2A2A38] rounded-2xl p-6 shadow-lg animate-fadeIn">
            <h2 className="text-lg font-bold text-white mb-1">Profile Details</h2>
            <p className="text-xs text-gray-400 mb-6">
              Select your profile avatar, display name, and username handle.
            </p>

            {profileMsg.text && (
              <div
                className={`mb-5 p-3.5 rounded-xl text-xs font-medium flex items-center gap-2 border ${
                  profileMsg.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-red-500/10 border-red-500/30 text-red-400'
                }`}
              >
                <span>{profileMsg.type === 'success' ? '✅' : '⚠️'}</span>
                <span>{profileMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleProfileSubmit} className="space-y-6">
              
              {/* Preset Robot Avatar Selection Grid */}
              <div>
                <div className="mb-2.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Select Profile Avatar
                  </label>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                  {BOT_SEEDS.map((bot) => {
                    const isSelected = selectedAvatar === bot.seed
                    const avatarUri = getDiceBearAvatar(bot.seed)
                    return (
                      <button
                        key={bot.id}
                        type="button"
                        onClick={() => setSelectedAvatar(bot.seed)}
                        className={`group relative flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-purple-500 bg-purple-500/15 scale-105 shadow-lg shadow-purple-500/30'
                            : 'border-[#2A2A38] bg-[#0F0F14] hover:border-gray-500 hover:scale-102'
                        }`}
                        title={bot.name}
                      >
                        <div className="w-12 h-12 rounded-lg bg-[#13131A] p-0.5 flex items-center justify-center overflow-hidden">
                          <img src={avatarUri} alt={bot.name} className="w-full h-full object-contain" />
                        </div>
                        <span className="text-[10px] text-gray-400 mt-1 font-medium group-hover:text-white truncate max-w-full">
                          {bot.name}
                        </span>
                        {isSelected && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow">
                            ✓
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahulya Pandit"
                  className="w-full bg-[#0F0F14] border border-[#2A2A38] focus:border-purple-500 rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-all placeholder:text-gray-600"
                />
                <p className="text-[11px] text-gray-500 mt-1">This is the name displayed on your cards and activity logs.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Username Handle
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="username"
                    required
                    className="w-full bg-[#0F0F14] border border-[#2A2A38] focus:border-purple-500 rounded-xl pl-9 pr-4 py-3 text-sm text-white focus:outline-none transition-all placeholder:text-gray-600 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full bg-[#0B0B0E] border border-[#22222E] rounded-xl px-4 py-3 text-sm text-gray-400 cursor-not-allowed font-mono opacity-80"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-xs">🔒 Primary Email</span>
                </div>
              </div>

              <div className="pt-3 border-t border-[#2A2A38] flex justify-end">
                <button
                  type="submit"
                  disabled={profileLoading}
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-[0.98] disabled:opacity-50 text-xs font-bold text-white shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
                >
                  {profileLoading ? 'Saving Changes...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: Security & Password */}
        {activeTab === 'security' && (
          <div className="bg-[#171722] border border-[#2A2A38] rounded-2xl p-6 shadow-lg animate-fadeIn">
            <h2 className="text-lg font-bold text-white mb-1">Security & Password</h2>
            <p className="text-xs text-gray-400 mb-6">
              Update your login password to keep your account safe and secure.
            </p>

            {securityMsg.text && (
              <div
                className={`mb-5 p-3.5 rounded-xl text-xs font-medium flex items-center gap-2 border ${
                  securityMsg.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-red-500/10 border-red-500/30 text-red-400'
                }`}
              >
                <span>{securityMsg.type === 'success' ? '✅' : '⚠️'}</span>
                <span>{securityMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleSecuritySubmit} className="space-y-5">
              {user?.hasPassword !== false && (
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    required
                    className="w-full bg-[#0F0F14] border border-[#2A2A38] focus:border-purple-500 rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-all placeholder:text-gray-600"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  className="w-full bg-[#0F0F14] border border-[#2A2A38] focus:border-purple-500 rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-all placeholder:text-gray-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                  className="w-full bg-[#0F0F14] border border-[#2A2A38] focus:border-purple-500 rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-all placeholder:text-gray-600"
                />
              </div>

              <div className="pt-3 border-t border-[#2A2A38] flex justify-end">
                <button
                  type="submit"
                  disabled={securityLoading}
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-[0.98] disabled:opacity-50 text-xs font-bold text-white shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
                >
                  {securityLoading ? 'Updating Password...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        )}

      </main>
    </div>
  )
}

export default SettingsPage
