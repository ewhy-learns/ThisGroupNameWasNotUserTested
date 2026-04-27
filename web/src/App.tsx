import React, { useState, useEffect, useRef } from 'react'
import MapView from './MapView'
import AuthModal from './AuthModal'
import ProfileModal from './ProfileModal'
import ReadProfileModal from './ReadProfileModal'
import { getLoggedInUser, logout, isProfileComplete } from './AuthService'

export default function App() {
  const [authOpen, setAuthOpen] = useState(false)
  const [user, setUser] = useState<string | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [viewProfileOpen, setViewProfileOpen] = useState(false)
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setUser(getLoggedInUser())
  }, [])

  // close avatar menu on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!avatarMenuOpen) return
      if (!menuRef.current) return
      if (!(e.target instanceof Node)) return
      if (!menuRef.current.contains(e.target)) {
        setAvatarMenuOpen(false)
      }
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [avatarMenuOpen])

  const handleLoginSuccess = (id: string) => {
    setUser(id)
    // if the user hasn't completed profile, open profile modal
    const complete = isProfileComplete(id)
    if (!complete) setProfileOpen(true)
  }

  const handleLogout = () => {
    logout()
    setUser(null)
  }

  return (
    <div className="app-root">
      <header className="app-header">
        <h1>Demo1 Mobile</h1>
        <div className="header-actions">
          {user ? (
            <div className="avatar-wrap" ref={menuRef}>
              <button
                type="button"
                aria-haspopup="true"
                aria-expanded={avatarMenuOpen}
                className="avatar"
                onClick={() => setAvatarMenuOpen(open => !open)}
              >
                {user.charAt(0).toUpperCase()}
              </button>
              {avatarMenuOpen && (
                <div className="avatar-menu" role="menu">
                  <button type="button" className="menu-item" role="menuitem" onClick={() => { setProfileOpen(true); setAvatarMenuOpen(false) }}>Edit profile</button>
                  <button type="button" className="menu-item" role="menuitem" onClick={() => { setViewProfileOpen(true); setAvatarMenuOpen(false) }}>View profile</button>
                  <button type="button" className="menu-item" role="menuitem" onClick={() => { alert('History (prototype)') ; setAvatarMenuOpen(false) }}>History</button>
                  <button type="button" className="menu-item" role="menuitem" onClick={() => { handleLogout(); setAvatarMenuOpen(false) }}>Logout</button>
                </div>
              )}
            </div>
          ) : (
            <button type="button" className="btn" onClick={() => setAuthOpen(true)}>Login</button>
          )}
        </div>
      </header>

      <main className="app-main">
        <MapView />
      </main>

      <nav className="bottom-nav">
        <button aria-label="Home">Home</button>
        <button aria-label="Search">Search</button>
      </nav>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onLoginSuccess={handleLoginSuccess} />
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} userId={user ?? ''} />
      <ReadProfileModal
        open={viewProfileOpen}
        onClose={() => setViewProfileOpen(false)}
        userId={user ?? ''}
        onEditInterests={() => { setProfileOpen(true); setViewProfileOpen(false) }}
      />
    </div>
  )
}

