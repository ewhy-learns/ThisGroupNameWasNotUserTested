import React from 'react'
import { getPendingSkillSuggestions, getProfile, getPublicIdentityLabel, listDraftSessions, listEvents, needsHostWrapUp, needsParticipantReview } from './AuthService'
import { EventAvatar } from './AvatarUtils'

type RoleFilter = 'organising' | 'participating' | 'both'
type StatusFilter = 'all' | 'upcoming' | 'past' | 'outstanding'

function toTimestamp(evt: any) {
  try {
    if (!evt?.date) return evt?.updatedAt || evt?.createdAt || 0
    const dateStr = `${evt.date}T${evt.startTime || '00:00'}`
    const t = new Date(dateStr).getTime()
    return Number.isNaN(t) ? (evt?.updatedAt || evt?.createdAt || 0) : t
  } catch {
    return evt?.updatedAt || evt?.createdAt || 0
  }
}

function getRole(evt: any, userId: string) {
  const lowId = String(userId).toLowerCase()
  const isHost = String(evt.host || '').toLowerCase() === lowId
  const isParticipant = (
    Array.isArray(evt.participants) && evt.participants.map((p: any) => String(p).toLowerCase()).includes(lowId)
  ) || (
    Array.isArray(evt.applications) && evt.applications.some((a: any) => String(a.userId).toLowerCase() === lowId && a.status !== 'denied')
  )
  return { isHost, isParticipant }
}

function getMyApplication(evt: any, userId: string) {
  if (!Array.isArray(evt?.applications)) return null
  return evt.applications.find((a: any) => String(a.userId).toLowerCase() === String(userId).toLowerCase()) || null
}

// MySessions: show events the current user created (host) and events they applied to (participants)
export default function MySessions({ userId, onEditDraft }: { userId: string; onEditDraft?: (draft: any) => void }) {
  const [items, setItems] = React.useState<any[]>([])
  const [roleFilter, setRoleFilter] = React.useState<RoleFilter>('both')
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('upcoming')

  const load = React.useCallback(() => {
    if (!userId) {
      setItems([])
      return
    }
    try {
      const published = listEvents()
      const drafts = listDraftSessions(userId)
      const merged = [...published, ...drafts].sort((a, b) => toTimestamp(a) - toTimestamp(b))
      setItems(merged)
    } catch {
      setItems([])
    }
  }, [userId])

  React.useEffect(() => {
    load()
    const onEventsUpdated = () => { try { load() } catch {} }
    const onReviewsUpdated = () => { try { load() } catch {} }
    const onStorage = () => { try { load() } catch {} }
    window.addEventListener('demo1_events_updated', onEventsUpdated as EventListener)
    window.addEventListener('demo1_reviews_updated', onReviewsUpdated as EventListener)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('demo1_events_updated', onEventsUpdated as EventListener)
      window.removeEventListener('demo1_reviews_updated', onReviewsUpdated as EventListener)
      window.removeEventListener('storage', onStorage)
    }
  }, [load])

  if (!userId) {
    return (
      <div style={{ padding: 20 }}>
        <h3>My sessions</h3>
        <p>Please log in to see sessions you've created, drafted or joined.</p>
      </div>
    )
  }

  const now = Date.now()
  const filtered = items.filter(evt => {
    const { isHost, isParticipant } = getRole(evt, userId)
    const app = getMyApplication(evt, userId)
    const isDraft = !!evt.isDraft
    const isPast = !isDraft && toTimestamp(evt) < now
    const needsReview = !isDraft && needsParticipantReview(evt, userId, now)
    const needsWrapUp = !isDraft && needsHostWrapUp(evt, userId, now)
    const hasSkillSuggestion = !isDraft && getPendingSkillSuggestions(userId, evt.id, now).length > 0
    const hasOutstandingAction = isDraft || needsReview || needsWrapUp || hasSkillSuggestion || (!!app && (app.status === 'pending' || app.status === 'waitlisted')) || (isHost && Array.isArray(evt.applications) && evt.applications.some((a: any) => a.status === 'pending' || a.status === 'waitlisted'))

    if (roleFilter === 'organising' && !isHost) return false
    if (roleFilter === 'participating' && !isParticipant) return false
    if (roleFilter === 'both' && !(isHost || isParticipant)) return false

    if (statusFilter === 'upcoming' && (isPast || isDraft)) return false
    if (statusFilter === 'past' && !isPast) return false
    if (statusFilter === 'outstanding' && !hasOutstandingAction) return false

    return true
  })

  const openEvent = (evt: any) => {
    if (evt.isDraft) {
      alert('Draft editing can be wired next; this draft is already stored in My sessions and can also be used as a template.')
      return
    }
    try {
      const ce = new CustomEvent('demo1_open_event', { detail: { id: evt.id } })
      window.dispatchEvent(ce)
    } catch {
      alert('View session (prototype)')
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h3>My sessions</h3>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <button className={roleFilter === 'organising' ? 'btn' : 'btn ghost'} onClick={() => setRoleFilter('organising')}>Organising</button>
        <button className={roleFilter === 'participating' ? 'btn' : 'btn ghost'} onClick={() => setRoleFilter('participating')}>Participating</button>
        <button className={roleFilter === 'both' ? 'btn' : 'btn ghost'} onClick={() => setRoleFilter('both')}>Both</button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <button className={statusFilter === 'all' ? 'btn' : 'btn ghost'} onClick={() => setStatusFilter('all')}>All</button>
        <button className={statusFilter === 'upcoming' ? 'btn' : 'btn ghost'} onClick={() => setStatusFilter('upcoming')}>Upcoming</button>
        <button className={statusFilter === 'past' ? 'btn' : 'btn ghost'} onClick={() => setStatusFilter('past')}>Past</button>
        <button className={statusFilter === 'outstanding' ? 'btn' : 'btn ghost'} onClick={() => setStatusFilter('outstanding')}>Action required</button>
      </div>

      {filtered.length === 0 ? (
        <div style={{ color: '#6b7280' }}>No sessions match the current filters.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(evt => {
            const { isHost, isParticipant } = getRole(evt, userId)
            const app = getMyApplication(evt, userId)
            const hostProfile = evt.host ? getProfile(evt.host) : null
            const hostName = evt.host ? getPublicIdentityLabel(evt.host, hostProfile) : (evt.organiserName || 'Unknown host')
            const approvedCount = Array.isArray(evt.participants) ? evt.participants.length : 0
            const pendingCount = Array.isArray(evt.applications) ? evt.applications.filter((a: any) => a.status === 'pending').length : 0
            const waitlistCount = Array.isArray(evt.applications) ? evt.applications.filter((a: any) => a.status === 'waitlisted').length : 0
            const badges: string[] = []
            if (evt.isDraft) badges.push('Draft')
            if (isHost) badges.push('Organising')
            if (isParticipant && !isHost) badges.push('Participating')
            if (!app && isParticipant && !evt.isDraft) badges.push('approved')
            if (app?.status) badges.push(app.status)
            if (!evt.isDraft && toTimestamp(evt) < now) badges.push('Past')

            return (
              <div key={evt.id} style={{ border: '1px solid rgba(2,6,23,0.06)', borderRadius: 14, background: 'white', overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow 0.2s', ':hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.05)' } } as any} onClick={() => openEvent(evt)}>
                <div style={{ padding: 14, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <EventAvatar event={evt} size={64} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                      {badges.map(b => <span key={b} className="chip" style={{ fontSize: 11, padding: '2px 8px', minHeight: 20, fontWeight: 700 }}>{b}</span>)}
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 16, lineHeight: 1.25 }}>{evt.title || evt.activity || 'Untitled'}</div>
                    <div style={{ fontSize: 13, color: '#6b7280', marginTop: 6, lineHeight: 1.4 }}>
                      {evt.date || 'No date'}{evt.startTime ? ` · ${evt.startTime}` : ''}{evt.location ? ` · ${evt.location}` : ''}
                      <br/>
                      <span style={{ color: '#4b5563' }}>Host: <strong>{hostName}</strong></span>
                    </div>
                  </div>
                </div>

                {!evt.isDraft && (
                  <div style={{ borderTop: '1px solid rgba(2,6,23,0.04)', background: '#fdfbfa', padding: '10px 14px', fontSize: 12, color: '#6b7280', display: 'flex', flexWrap: 'wrap', gap: '8px 16px' }}>
                    <span>Approved: <strong style={{ color: '#111827' }}>{approvedCount}</strong>{evt.participantsMax ? ` / ${evt.participantsMax}` : ''}</span>
                    {evt.participantsMin ? <span>Min: {evt.participantsMin}</span> : null}
                    {isHost && pendingCount > 0 ? <span>Pending: <strong style={{ color: '#d97706' }}>{pendingCount}</strong></span> : null}
                    {waitlistCount > 0 ? <span>Waitlist: {waitlistCount}</span> : null}
                  </div>
                )}

                {(evt.isDraft || (!evt.isDraft && isHost)) && (
                  <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(2,6,23,0.06)', display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {evt.isDraft && <button className="btn" onClick={(e) => { e.stopPropagation(); if(onEditDraft) onEditDraft(evt); else alert('Draft editing unavailable'); }}>Edit draft</button>}
                    {!evt.isDraft && isHost && <button className="btn" onClick={(e) => { e.stopPropagation(); alert('Edit session (prototype)'); }}>Edit</button>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
