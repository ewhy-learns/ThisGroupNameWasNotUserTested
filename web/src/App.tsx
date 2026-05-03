import React, { useState, useEffect, useRef } from 'react'
import MapView from './MapView'
import MySessions from './MySessions'
import AuthModal from './AuthModal'
import ProfileModal from './ProfileModal'
import ReadProfileModal from './ReadProfileModal'
import AppSettingsModal from './AppSettingsModal'
import SkillCheckModal from './SkillCheckModal'
import EventModal from './EventModal'
import ViewSession from './ViewSession'
import AuthRequiredModal from './AuthRequiredModal'
import MessagesModal, { MessageTarget } from './MessagesModal'
import { addFriendToProfile, acceptFriendRequest, declineFriendRequest, generateReviewsForPastEvents, getAppSettings, getLoggedInUser, getProfile, getPublicIdentityLabel, getUnreadMessageCount, isProfileComplete, listPendingActions, logout, saveEventDraft, ProfileAccessContext } from './AuthService'
import { XIcon } from './Icons'

const COLOR_SCHEMES: Record<string, Record<string, string>> = {
  'orange-blue': {
    '--bg': '#fafbfc',
    '--card': '#ffffff',
    '--accent': '#fb923c',
    '--secondary': '#2563eb',
    '--text': '#0f1720',
    '--muted': '#6b7280',
    '--accent-rgb': '251, 146, 60',
    '--secondary-rgb': '37, 99, 235',
  },
  'green-gold': {
    '--bg': '#f7faf5',
    '--card': '#ffffff',
    '--accent': '#2f855a',
    '--secondary': '#d4a017',
    '--text': '#162317',
    '--muted': '#5f6f63',
    '--accent-rgb': '47, 133, 90',
    '--secondary-rgb': '212, 160, 23',
  },
  'light-blue-darkblue': {
    '--bg': '#f4f9ff',
    '--card': '#ffffff',
    '--accent': '#38bdf8',
    '--secondary': '#1d4ed8',
    '--text': '#0f172a',
    '--muted': '#64748b',
    '--accent-rgb': '56, 189, 248',
    '--secondary-rgb': '29, 78, 216',
  },
  greyscale: {
    '--bg': '#f5f5f5',
    '--card': '#ffffff',
    '--accent': '#525252',
    '--secondary': '#171717',
    '--text': '#111827',
    '--muted': '#6b7280',
    '--accent-rgb': '82, 82, 82',
    '--secondary-rgb': '23, 23, 23',
  },
}

function applyColorSchemePreference(preference?: string | null) {
  const theme = COLOR_SCHEMES[preference || 'orange-blue'] || COLOR_SCHEMES['orange-blue']
  const root = document.documentElement
  Object.entries(theme).forEach(([token, value]) => root.style.setProperty(token, value))
}

export default function App() {
  const [authOpen, setAuthOpen] = useState(false)
  const [user, setUser] = useState<string | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileRequiredFlow, setProfileRequiredFlow] = useState(false)
  const [profileInitialStep, setProfileInitialStep] = useState<number | undefined>(1)
  const [viewProfileOpen, setViewProfileOpen] = useState(false)
  const [viewProfileUserId, setViewProfileUserId] = useState<string | null>(null)
  const [viewProfileAccessContext, setViewProfileAccessContext] = useState<ProfileAccessContext | null>(null)
  const [reopenViewProfileAfterEdit, setReopenViewProfileAfterEdit] = useState(false)
  const [appSettingsOpen, setAppSettingsOpen] = useState(false)
  const [skillOpen, setSkillOpen] = useState(false)
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false)
  const [eventOpen, setEventOpen] = useState(false)
  const [viewSessionOpen, setViewSessionOpen] = useState(false)
  const [viewSessionId, setViewSessionId] = useState<string | undefined>(undefined)
  const [messagesOpen, setMessagesOpen] = useState(false)
  const [messagesTarget, setMessagesTarget] = useState<MessageTarget | null>({ type: 'inbox' })
  const [mainView, setMainView] = useState<'map'|'mySessions'>('map')
  const [authRequiredOpen, setAuthRequiredOpen] = useState(false)
  const [authModalMode, setAuthModalMode] = useState<'login'|'register'|undefined>(undefined)
  const [profileNudgeOpen, setProfileNudgeOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const publicUserLabel = user ? getPublicIdentityLabel(user) : ''
  const currentProfile = user ? getProfile(user) : null
  const avatarImageSrc = currentProfile?.photoDataUrl || currentProfile?.avatarDataUrl || currentProfile?.avatarUrl
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [pendingActionsOpen, setPendingActionsOpen] = useState(false)
  const [pendingActions, setPendingActions] = useState<ReturnType<typeof listPendingActions>>([])

  const formatWaitLabel = (waitedSince: number) => {
    const elapsedMs = Math.max(0, Date.now() - Number(waitedSince || 0))
    const minutes = Math.floor(elapsedMs / (60 * 1000))
    if (minutes < 60) return `${minutes}m waiting`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h waiting`
    const days = Math.floor(hours / 24)
    return `${days}d waiting`
  }

  useEffect(() => {
    setUser(getLoggedInUser())
    // generate reviews for any existing past events (once on load)
    try { generateReviewsForPastEvents() } catch {}
  }, [])

  useEffect(() => {
    const syncColorScheme = () => applyColorSchemePreference(user ? getAppSettings(user)?.colorScheme : 'orange-blue')
    syncColorScheme()
    const onAppSettingsUpdated = (event: Event) => {
      const settingsEvent = event as CustomEvent<{ userId?: string }>
      if (!user || !settingsEvent.detail?.userId || String(settingsEvent.detail.userId) === String(user)) {
        syncColorScheme()
      }
    }
    window.addEventListener('demo1_app_settings_updated', onAppSettingsUpdated as EventListener)
    return () => window.removeEventListener('demo1_app_settings_updated', onAppSettingsUpdated as EventListener)
  }, [user])

  useEffect(() => {
    if (!user) {
      setUnreadMessages(0)
      return
    }
    const refreshUnread = () => setUnreadMessages(getUnreadMessageCount(user))
    refreshUnread()
    window.addEventListener('demo1_messages_updated', refreshUnread)
    window.addEventListener('demo1_events_updated', refreshUnread)
    return () => {
      window.removeEventListener('demo1_messages_updated', refreshUnread)
      window.removeEventListener('demo1_events_updated', refreshUnread)
    }
  }, [user])

  useEffect(() => {
    if (!user) {
      setPendingActions([])
      return
    }
    const refreshPending = () => setPendingActions(listPendingActions(user))
    refreshPending()
    window.addEventListener('demo1_events_updated', refreshPending)
    window.addEventListener('demo1_reviews_updated', refreshPending)
    window.addEventListener('demo1_friend_requests_updated', refreshPending)
    return () => {
      window.removeEventListener('demo1_events_updated', refreshPending)
      window.removeEventListener('demo1_reviews_updated', refreshPending)
      window.removeEventListener('demo1_friend_requests_updated', refreshPending)
    }
  }, [user])

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
        const detail = ev?.detail || null
        const id = detail?.id
        if (id) {
          setViewProfileUserId(id)
          setViewProfileAccessContext(detail?.context || null)
          setReopenViewProfileAfterEdit(false)
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
    const onAddFriend = (ev: any) => {
      try {
        const targetUserId = ev?.detail?.userId
        if (!user || !targetUserId) return
        const result = addFriendToProfile(user, targetUserId)
        if (result) {
          setToastMessage('Friend added')
          setToastOpen(true)
          setTimeout(() => setToastOpen(false), 2500)
        }
      } catch {}
    }
    const onMessageUser = (ev: any) => {
      try {
        const targetUserId = ev?.detail?.userId
        if (!user || !targetUserId) return
        setMessagesTarget({ type: 'direct', otherUserId: targetUserId })
        setMessagesOpen(true)
      } catch {}
    }
    const onOpenMessages = (ev: any) => {
      try {
        const detail = ev?.detail || { type: 'inbox' }
        setMessagesTarget(detail)
        setMessagesOpen(true)
      } catch {}
    }
    const onEditEvent = (ev: any) => {
      try {
        const editableEvent = ev?.detail?.event || null
        if (!editableEvent) return
        handleEditDraft(editableEvent)
      } catch {}
    }
    window.addEventListener('demo1_add_friend', onAddFriend as EventListener)
    window.addEventListener('demo1_message_user', onMessageUser as EventListener)
    window.addEventListener('demo1_open_messages', onOpenMessages as EventListener)
    window.addEventListener('demo1_edit_event', onEditEvent as EventListener)
    return () => {
      window.removeEventListener('demo1_events_updated', onEventsUpdated as EventListener)
      window.removeEventListener('demo1_open_event', onOpenEvent as EventListener)
      window.removeEventListener('demo1_open_profile', onOpenProfile as EventListener)
      window.removeEventListener('demo1_require_auth', onRequireAuth as EventListener)
      window.removeEventListener('demo1_add_friend', onAddFriend as EventListener)
      window.removeEventListener('demo1_message_user', onMessageUser as EventListener)
      window.removeEventListener('demo1_open_messages', onOpenMessages as EventListener)
      window.removeEventListener('demo1_edit_event', onEditEvent as EventListener)
    }
  }, [user])

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
    // generate reviews for past events when user logs in
    try { generateReviewsForPastEvents() } catch {}
    // if the user hasn't completed profile, open profile modal
    const complete = isProfileComplete(id)
    if (!complete) {
      setProfileInitialStep(1)
      setProfileOpen(true)
      setProfileRequiredFlow(true)
    } else {
      // nudge user to complete their full profile
      setProfileNudgeOpen(true)
      setTimeout(() => setProfileNudgeOpen(false), 6000)
    }
  }

  const handleLogout = () => {
    logout()
    setUser(null)
  }

  const handleEditDraft = (draft: any) => {
    try {
      if (!draft) return
      const { createdAt, updatedAt, isDraft, templateName, ...editable } = draft
      saveEventDraft(editable)
      setEventOpen(true)
    } catch (e) {
      console.warn('[App] failed to open draft for editing', e)
    }
  }

  return (
    <div className="app-root">
      {/* header is always visible */}
      <header className="app-header">
        <h1>Demo1 Mobile</h1>
        <div className="header-actions">
          {/* message icon - only show when signed in */}
          {user && (
            <button aria-label="Pending actions" title="Pending actions" className="icon-btn" style={{ marginRight: 8, position: 'relative' }} onClick={() => setPendingActionsOpen(true)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
              {pendingActions.length > 0 && (
                <span style={{ position: 'absolute', top: 2, right: 2, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 999, background: '#dc2626', color: 'white', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  {pendingActions.length > 99 ? '99+' : pendingActions.length}
                </span>
              )}
            </button>
          )}
          {user && (
            <button aria-label="Messages" title="Messages" className="icon-btn" style={{ marginRight: 8, position: 'relative' }} onClick={() => { setMessagesTarget({ type: 'inbox' }); setMessagesOpen(true) }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              {unreadMessages > 0 && (
                <span style={{ position: 'absolute', top: 2, right: 2, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 999, background: 'var(--secondary)', color: 'white', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  {unreadMessages > 99 ? '99+' : unreadMessages}
                </span>
              )}
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
                  {avatarImageSrc ? (
                    <img src={avatarImageSrc} alt={publicUserLabel || user || 'Profile'} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 999 }} />
                  ) : (
                    (publicUserLabel || user).charAt(0).toUpperCase()
                  )}
              </button>
              {avatarMenuOpen && (
                <div className="avatar-menu" role="menu">
                  <button type="button" className="menu-item" role="menuitem" onClick={() => { setViewProfileUserId(user); setViewProfileAccessContext(null); setReopenViewProfileAfterEdit(false); setViewProfileOpen(true); setAvatarMenuOpen(false) }}>View profile</button>
                  <button type="button" className="menu-item" role="menuitem" onClick={() => { setProfileInitialStep(undefined); setProfileOpen(true); setProfileRequiredFlow(false); setReopenViewProfileAfterEdit(false); setAvatarMenuOpen(false) }}>Edit profile</button>
                  <button type="button" className="menu-item" role="menuitem" onClick={() => { setAppSettingsOpen(true); setAvatarMenuOpen(false) }}>App settings</button>
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

      {/* main content is always visible */}
      <main className="app-main">
        {mainView === 'map' ? <MapView /> : <MySessions userId={user ?? ''} onEditDraft={handleEditDraft} />}
      </main>

      {/* bottom nav: only visible when logged in */}
      {user && (
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
          <button aria-label="My sessions" onClick={() => setMainView('mySessions')} style={mainView === 'mySessions' ? { color: 'var(--secondary)', fontWeight: 700 } : undefined}>
            {/* list / sessions icon */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="4" rx="1" />
              <rect x="3" y="10" width="18" height="4" rx="1" />
              <rect x="3" y="16" width="18" height="4" rx="1" />
            </svg>
            <span>My sessions</span>
          </button>
          <button aria-label="Find session" onClick={() => setMainView('map')} style={mainView === 'map' ? { color: 'var(--secondary)', fontWeight: 700 } : undefined}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span>Find session</span>
          </button>
        </nav>
      )}

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onLoginSuccess={handleLoginSuccess} initialMode={authModalMode} />
      <AuthRequiredModal open={authRequiredOpen} onClose={() => setAuthRequiredOpen(false)} onLogin={() => { setAuthModalMode('login'); setAuthOpen(true) }} onRegister={() => { setAuthModalMode('register'); setAuthOpen(true) }} />
      <ProfileModal
        open={profileOpen}
        onClose={() => {
          setProfileOpen(false)
          setProfileRequiredFlow(false)
          if (reopenViewProfileAfterEdit && viewProfileUserId) {
            setViewProfileOpen(true)
          }
          setReopenViewProfileAfterEdit(false)
        }}
        userId={user ?? ''}
        initialStep={profileInitialStep}
        requiredFlow={profileRequiredFlow}
      />
      <ReadProfileModal
        open={viewProfileOpen}
        onClose={() => {
          setViewProfileOpen(false)
          setViewProfileUserId(null)
          setViewProfileAccessContext(null)
          setReopenViewProfileAfterEdit(false)
        }}
        userId={viewProfileUserId ?? (user ?? '')}
        accessContext={viewProfileAccessContext}
        onEditFullProfile={() => {
          setProfileInitialStep(undefined)
          setReopenViewProfileAfterEdit(true)
          setProfileOpen(true)
          setViewProfileOpen(false)
        }}
      />
      <AppSettingsModal open={appSettingsOpen} onClose={() => setAppSettingsOpen(false)} userId={user ?? ''} />
      <SkillCheckModal open={skillOpen} onClose={() => setSkillOpen(false)} userId={user ?? ''} />
      <EventModal open={eventOpen} onClose={() => setEventOpen(false)} userId={user ?? ''} />
      <ViewSession open={viewSessionOpen} eventId={viewSessionId} onClose={() => { setViewSessionOpen(false); setViewSessionId(undefined) }} userId={user ?? ''} />
      <MessagesModal open={messagesOpen} onClose={() => setMessagesOpen(false)} userId={user ?? ''} initialTarget={messagesTarget} />
      {pendingActionsOpen && (
        <div className="modal-overlay modal-overlay-priority" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Pending actions</h3>
              <button type="button" className="modal-close" onClick={() => setPendingActionsOpen(false)} aria-label="Close"><XIcon size={16} /></button>
            </div>
            <div className="modal-body" style={{ display: 'grid', gap: 10 }}>
              {pendingActions.length === 0 ? (
                <div style={{ color: '#6b7280' }}>No pending actions right now.</div>
              ) : (
                pendingActions.map(action => {
                  if (action.type === 'friendRequest' && action.fromUserId) {
                    return (
                      <div key={action.id} style={{ display: 'grid', gap: 4, padding: '10px 12px', borderRadius: 10, background: '#f9fafb', border: '1px solid rgba(15,23,32,0.06)' }}>
                        <div style={{ fontWeight: 700 }}>{action.title}</div>
                        <div style={{ fontSize: 12, color: '#4b5563' }}>{action.subtitle}</div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                          <button
                            type="button"
                            className="btn"
                            style={{ fontSize: 13, padding: '5px 14px' }}
                            onClick={() => {
                              if (user && action.fromUserId) {
                                acceptFriendRequest(user, action.fromUserId)
                                setToastMessage('Friend added!')
                                setToastOpen(true)
                                setTimeout(() => setToastOpen(false), 2500)
                              }
                            }}
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            className="btn ghost"
                            style={{ fontSize: 13, padding: '5px 14px' }}
                            onClick={() => { if (user && action.fromUserId) declineFriendRequest(user, action.fromUserId) }}
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    )
                  }
                  return (
                    <button
                      key={action.id}
                      type="button"
                      className="btn ghost"
                      style={{ textAlign: 'left', display: 'grid', gap: 4, justifyItems: 'start' }}
                      onClick={() => {
                        setPendingActionsOpen(false)
                        setMainView('mySessions')
                        if (action.eventId) {
                          window.dispatchEvent(new CustomEvent('demo1_open_event', { detail: { id: action.eventId } }))
                        }
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>{action.title}</div>
                      <div style={{ fontSize: 12, color: '#4b5563' }}>{action.subtitle}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>{formatWaitLabel(action.waitedSince)}</div>
                    </button>
                  )
                })
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                <button type="button" className="btn" onClick={() => setPendingActionsOpen(false)}>Done</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* profile completion nudge */}
      {profileNudgeOpen && user && (
        <div style={{ position: 'fixed', top: 70, left: '50%', transform: 'translateX(-50%)', zIndex: 3000, background: 'rgba(2,6,23,0.92)', color: 'white', padding: '10px 16px', borderRadius: 10, display: 'flex', gap: 10, alignItems: 'center', boxShadow: '0 8px 24px rgba(2,6,23,0.2)', maxWidth: 360, width: 'calc(100% - 32px)' }} role="status" aria-live="polite">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#fb923c', flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
          <span style={{ fontSize: 13, flex: 1 }}>Tap your profile picture to complete your profile — add a photo, bio and more!</span>
          <button type="button" onClick={() => setProfileNudgeOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 0, lineHeight: 1 }}><XIcon size={16} /></button>
        </div>
      )}
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

