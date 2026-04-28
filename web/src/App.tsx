import React, { useState, useEffect, useRef } from 'react'
import MapView from './MapView'
import AuthModal from './AuthModal'
import ProfileModal from './ProfileModal'
import ReadProfileModal from './ReadProfileModal'
import SkillCheckModal from './SkillCheckModal'
import EventModal from './EventModal'
import AuthRequiredModal from './AuthRequiredModal'
import { getLoggedInUser, logout, isProfileComplete } from './AuthService'

export default function App() {
  const [authOpen, setAuthOpen] = useState(false)
  const [user, setUser] = useState<string | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileInitialStep, setProfileInitialStep] = useState<number>(1)
  const [viewProfileOpen, setViewProfileOpen] = useState(false)
  const [skillOpen, setSkillOpen] = useState(false)
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false)
  const [eventOpen, setEventOpen] = useState(false)
  const [authRequiredOpen, setAuthRequiredOpen] = useState(false)
  const [authModalMode, setAuthModalMode] = useState<'login'|'register'|undefined>(undefined)
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
          {/* message icon */}
          <button aria-label="Messages" title="Messages" className="icon-btn" style={{ marginRight: 8 }} onClick={() => alert('Messages (prototype)')}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </button>
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
                  <button type="button" className="menu-item" role="menuitem" onClick={() => { setViewProfileOpen(true); setAvatarMenuOpen(false) }}>Edit profile</button>
                  <button type="button" className="menu-item" role="menuitem" onClick={() => { alert('History (prototype)') ; setAvatarMenuOpen(false) }}>History</button>
                  <button type="button" className="menu-item" role="menuitem" onClick={() => { setSkillOpen(true); setAvatarMenuOpen(false) }}>Skill check</button>
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

        <nav className="bottom-nav" role="navigation" aria-label="Main navigation">
        <button aria-label="Create session" onClick={() => {
            if (!user) {
              setAuthRequiredOpen(true)
            } else {
              setEventOpen(true)
            }
          }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span>Create session</span>
        </button>
        <button aria-label="Home">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span>Home</span>
        </button>
        <button aria-label="Find session">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span>Find session</span>
        </button>
      </nav>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onLoginSuccess={handleLoginSuccess} initialMode={authModalMode} />
      <AuthRequiredModal open={authRequiredOpen} onClose={() => setAuthRequiredOpen(false)} onLogin={() => { setAuthModalMode('login'); setAuthOpen(true) }} onRegister={() => { setAuthModalMode('register'); setAuthOpen(true) }} />
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} userId={user ?? ''} initialStep={profileInitialStep} />
      <ReadProfileModal
        open={viewProfileOpen}
        onClose={() => setViewProfileOpen(false)}
        userId={user ?? ''}
        onEditInterests={() => { setProfileInitialStep(1); setProfileOpen(true); setViewProfileOpen(false); }}
        onEditAbout={() => { setProfileInitialStep(2); setProfileOpen(true); setViewProfileOpen(false); }}
        onEditGender={() => { setProfileInitialStep(3); setProfileOpen(true); setViewProfileOpen(false); }}
        onEditVibes={() => { setProfileInitialStep(4); setProfileOpen(true); setViewProfileOpen(false); }}
      />
      <SkillCheckModal open={skillOpen} onClose={() => setSkillOpen(false)} userId={user ?? ''} />
      <EventModal open={eventOpen} onClose={() => setEventOpen(false)} userId={user ?? ''} />
    </div>
  )
}

