import React, { useState, useEffect, useRef } from 'react'
import MapView from './MapView'
import MySessions from './MySessions'
import AuthModal from './AuthModal'
import ProfileModal from './ProfileModal'
import ReadProfileModal from './ReadProfileModal'
import SkillCheckModal from './SkillCheckModal'
import EventModal from './EventModal'
import ViewSession from './ViewSession'
import AuthRequiredModal from './AuthRequiredModal'
import { getLoggedInUser, logout, isProfileComplete } from './AuthService'

export default function App() {
  const [authOpen, setAuthOpen] = useState(false)
  const [user, setUser] = useState<string | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileRequiredFlow, setProfileRequiredFlow] = useState(false)
  const [profileInitialStep, setProfileInitialStep] = useState<number>(1)
  const [viewProfileOpen, setViewProfileOpen] = useState(false)
  const [viewProfileUserId, setViewProfileUserId] = useState<string | null>(null)
  const [skillOpen, setSkillOpen] = useState(false)
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false)
  const [eventOpen, setEventOpen] = useState(false)
  const [viewSessionOpen, setViewSessionOpen] = useState(false)
  const [viewSessionId, setViewSessionId] = useState<string | undefined>(undefined)
  const [mainView, setMainView] = useState<'map'|'mySessions'>('map')
  const [authRequiredOpen, setAuthRequiredOpen] = useState(false)
  const [authModalMode, setAuthModalMode] = useState<'login'|'register'|undefined>(undefined)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setUser(getLoggedInUser())
  }, [])

  // toast for simple feedback (e.g. session created)
  const [toastOpen, setToastOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  useEffect(() => {
    function onEventsUpdated(e: any) {
      const detail = e && e.detail ? e.detail : null
      const title = detail && detail.title ? detail.title : 'Session'
      setToastMessage(`${title} created`)
      setToastOpen(true)
      // auto-hide after 3s
      setTimeout(() => setToastOpen(false), 3000)
    }
    window.addEventListener('demo1_events_updated', onEventsUpdated as EventListener)
    // listen for requests to open a session detail view
    const onOpenEvent = (ev: any) => {
      try {
        const id = ev && ev.detail && ev.detail.id ? ev.detail.id : undefined
        if (id) {
          setViewSessionId(id)
          setViewSessionOpen(true)
        }
      } catch (e) {}
    }
    window.addEventListener('demo1_open_event', onOpenEvent as EventListener)
    // listen for requests to open a profile view
    const onOpenProfile = (ev: any) => {
      try {
        const id = ev && ev.detail && ev.detail.id ? ev.detail.id : undefined
        if (id) {
          setViewProfileUserId(id)
          setViewProfileOpen(true)
        }
      } catch (e) {}
    }
    window.addEventListener('demo1_open_profile', onOpenProfile as EventListener)
    // listen for requests to require auth (e.g. apply when not logged in)
    const onRequireAuth = (ev: any) => {
      try {
        const detail = ev && ev.detail ? ev.detail : null
        // detail may include reason, eventId etc. For now, simply open the auth required modal
        setAuthRequiredOpen(true)
      } catch (e) {}
    }
    window.addEventListener('demo1_require_auth', onRequireAuth as EventListener)
    return () => {
      window.removeEventListener('demo1_events_updated', onEventsUpdated as EventListener)
      window.removeEventListener('demo1_open_event', onOpenEvent as EventListener)
      window.removeEventListener('demo1_open_profile', onOpenProfile as EventListener)
      window.removeEventListener('demo1_require_auth', onRequireAuth as EventListener)
    }
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
    if (!complete) {
      setProfileInitialStep(1)
      setProfileOpen(true)
      setProfileRequiredFlow(true)
      // indicate this is the required onboarding flow
      // we'll pass requiredFlow=true when rendering below by checking state
      // store a small flag in state via profileInitialStep usage
    }
  }

  const handleLogout = () => {
    logout()
    setUser(null)
  }

  return (
    <div className="app-root">
      {/* show header only when user is logged in */}
      {user && (
        <header className="app-header">
          <h1>Demo1 Mobile</h1>
          <div className="header-actions">
            {/* message icon - only show when signed in */}
            {user && (
              <button aria-label="Messages" title="Messages" className="icon-btn" style={{ marginRight: 8 }} onClick={() => alert('Messages (prototype)')}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
              </button>
            )}
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
      )}

      {/* main content and bottom nav remain visible even when not logged in */}
      <main className="app-main">
        {mainView === 'map' ? <MapView /> : <MySessions userId={user ?? ''} />}
      </main>

      <nav className="bottom-nav" role="navigation" aria-label="Main navigation">
        {/* simple active styling for the bottom nav so current view is highlighted */}
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
        <button aria-label="My sessions" onClick={() => setMainView('mySessions')} style={mainView === 'mySessions' ? { color: '#0B61FF', fontWeight: 700 } : undefined}>
          {/* list / sessions icon */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="4" rx="1" />
            <rect x="3" y="10" width="18" height="4" rx="1" />
            <rect x="3" y="16" width="18" height="4" rx="1" />
          </svg>
          <span>My sessions</span>
        </button>
        <button aria-label="Find session" onClick={() => setMainView('map')} style={mainView === 'map' ? { color: '#0B61FF', fontWeight: 700 } : undefined}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span>Find session</span>
        </button>
      </nav>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onLoginSuccess={handleLoginSuccess} initialMode={authModalMode} />
      <AuthRequiredModal open={authRequiredOpen} onClose={() => setAuthRequiredOpen(false)} onLogin={() => { setAuthModalMode('login'); setAuthOpen(true) }} onRegister={() => { setAuthModalMode('register'); setAuthOpen(true) }} />
      <ProfileModal open={profileOpen} onClose={() => { setProfileOpen(false); setProfileRequiredFlow(false) }} userId={user ?? ''} initialStep={profileInitialStep} requiredFlow={profileRequiredFlow} />
      <ReadProfileModal
        open={viewProfileOpen}
        onClose={() => { setViewProfileOpen(false); setViewProfileUserId(null) }}
        userId={viewProfileUserId ?? (user ?? '')}
        // Map read-profile edit buttons to the correct ProfileModal step numbers:
        // Step 1 = Interests/Tags, Step 2 = Vibes, Step 3 = About, Step 4 = Gender
        onEditInterests={() => { setProfileInitialStep(1); setProfileOpen(true); setViewProfileOpen(false); }}
        onEditVibes={() => { setProfileInitialStep(2); setProfileOpen(true); setViewProfileOpen(false); }}
        onEditAbout={() => { setProfileInitialStep(3); setProfileOpen(true); setViewProfileOpen(false); }}
        onEditGender={() => { setProfileInitialStep(4); setProfileOpen(true); setViewProfileOpen(false); }}
      />
      <SkillCheckModal open={skillOpen} onClose={() => setSkillOpen(false)} userId={user ?? ''} />
      <EventModal open={eventOpen} onClose={() => setEventOpen(false)} userId={user ?? ''} />
      <ViewSession open={viewSessionOpen} eventId={viewSessionId} onClose={() => { setViewSessionOpen(false); setViewSessionId(undefined) }} userId={user ?? ''} />
      {/* toast */}
      {toastOpen && (
        <div style={{ position: 'fixed', right: 20, top: 84, zIndex: 3000 }} aria-live="polite">
          <div style={{ background: 'rgba(2,6,23,0.95)', color: 'white', padding: '10px 14px', borderRadius: 8, display: 'flex', gap: 10, alignItems: 'center', boxShadow: '0 8px 24px rgba(2,6,23,0.16)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#34d399' }}>
              <path d="M20 6L9 17l-5-5" stroke="currentColor" />
            </svg>
            <div style={{ fontWeight: 600 }}>{toastMessage}</div>
          </div>
        </div>
      )}
    </div>
  )
}
