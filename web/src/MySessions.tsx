import React from 'react'
import { listEvents, listDraftSessions, getProfile, getPublicIdentityLabel } from './AuthService'

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
    const onStorage = () => { try { load() } catch {} }
    window.addEventListener('demo1_events_updated', onEventsUpdated as EventListener)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('demo1_events_updated', onEventsUpdated as EventListener)
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
    const hasOutstandingAction = isDraft || (!!app && (app.status === 'pending' || app.status === 'waitlisted')) || (isHost && Array.isArray(evt.applications) && evt.applications.some((a: any) => a.status === 'pending' || a.status === 'waitlisted'))

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
              <div key={evt.id} style={{ border: '1px solid rgba(2,6,23,0.06)', padding: 12, borderRadius: 10, background: 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700 }}>{evt.title || evt.activity || 'Untitled'}</div>
                    <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                      {evt.date || 'No date'}{evt.startTime ? ` · ${evt.startTime}` : ''}{evt.location ? ` · ${evt.location}` : ''}
                    </div>
                    <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>Host: {hostName}</div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end' }}>
                    {badges.map(b => <span key={b} className="chip">{b}</span>)}
                  </div>
                </div>

                {!evt.isDraft && (
                  <div style={{ fontSize: 13, color: '#6b7280', marginTop: 8 }}>
                    Approved: {approvedCount}
                    {evt.participantsMin ? ` · Min ${evt.participantsMin}` : ''}
                    {evt.participantsMax ? ` · Max ${evt.participantsMax}` : ''}
                    {isHost ? ` · Pending ${pendingCount}` : ''}
                    {waitlistCount > 0 ? ` · Waitlist ${waitlistCount}` : ''}
                  </div>
                )}

                <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn ghost" onClick={() => openEvent(evt)}>{evt.isDraft ? 'View draft' : 'View'}</button>
                  {evt.isDraft && <button className="btn" onClick={() => onEditDraft ? onEditDraft(evt) : alert('Draft editing unavailable')}>Edit draft</button>}
                  {!evt.isDraft && isHost && <button className="btn" onClick={() => alert('Edit session (prototype)')}>Edit</button>}
                  {!evt.isDraft && app && (app.status === 'pending' || app.status === 'waitlisted') && <button className="btn" onClick={() => alert('Cancel application (prototype)')}>Cancel application</button>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
