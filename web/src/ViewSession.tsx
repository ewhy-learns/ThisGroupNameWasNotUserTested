import React from 'react'
import { listEvents, getProfile, addParticipant, removeParticipant } from './AuthService'

type Props = { open: boolean; eventId?: string; onClose: () => void; userId?: string }

export default function ViewSession({ open, eventId, onClose, userId }: Props) {
  const [evt, setEvt] = React.useState<any | null>(null)

  React.useEffect(() => {
    if (!open || !eventId) return setEvt(null)
    try {
      const all = listEvents()
      const found = all.find((e:any) => e.id === eventId) || null
      setEvt(found)
    } catch (e) { setEvt(null) }
  }, [open, eventId])

  // Hooks must be called unconditionally (before any early returns)
  const eventTime = React.useMemo(() => {
    if (!evt || !evt.date) return null
    try {
      // combine date and startTime into a single Date
      const dateStr = evt.date + (evt.startTime ? 'T' + evt.startTime : 'T00:00')
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return null
      return d.getTime()
    } catch (e) { return null }
  }, [evt])

  const eventEndTime = React.useMemo(() => {
    if (!eventTime) return null
    const dur = Number(evt?.duration || 0)
    if (dur && !isNaN(dur)) return eventTime + dur * 60 * 1000
    // fallback: assume 4 hours if duration not provided
    return eventTime + 4 * 60 * 60 * 1000
  }, [eventTime, evt])

  const timeState = React.useMemo(() => {
    if (!eventTime) return 'unknown'
    const t = Date.now()
    if (t > (eventEndTime || 0)) return 'postevent'
    if (t >= (eventTime - 24 * 60 * 60 * 1000)) return 'preevent'
    return 'upcoming'
  }, [eventTime, eventEndTime])

  const amRegistered = React.useMemo(() => {
    if (!evt || !userId) return false
    return Array.isArray(evt.participants) && evt.participants.map((p:any)=>String(p)).includes(String(userId))
  }, [evt, userId])

  if (!open) return null

  const renderMissing = () => {
    if (!evt) return null
    const missing: string[] = []
    if (!evt.location) missing.push('Location')
    if (!evt.locationCoords) missing.push('Location coordinates (map marker)')
    if (!evt.date) missing.push('Date')
    if (!evt.startTime) missing.push('Start time')
    if (!evt.duration) missing.push('Duration')
    if (!evt.title && !evt.activity) missing.push('Title / Activity')
    if (missing.length === 0) return null
    return (
      <div style={{ marginTop: 10, padding: 10, background: '#fff7ed', border: '1px solid #ffd8a8', borderRadius: 8 }}>
        <strong>Missing info:</strong>
        <ul style={{ margin: '8px 0 0 18px' }}>{missing.map(m => <li key={m}>{m}</li>)}</ul>
      </div>
    )
  }

  const host = (() => {
    if (!evt) return null
    if (evt.organiserName) return evt.organiserName
    if (evt.host) {
      const prof = getProfile(evt.host)
      if (prof && prof.displayName) return prof.displayName
      // Do not reveal emails to other users
      if (userId === evt.host) return evt.host
      if (typeof evt.host === 'string' && evt.host.includes('@')) return 'User'
      return evt.host
    }
    return null
  })()

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {evt ? (evt.title || evt.activity || 'Session') : 'Session'}
          </h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">
          {!evt ? (
            <div>Loading…</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>{evt.date} · {evt.startTime}{evt.duration ? ` · ${Math.floor(evt.duration/60)}h ${evt.duration%60}m` : ''}</div>
                  <div style={{ marginTop: 6, fontWeight: 700 }}>{evt.location || 'Location not specified'}</div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>Organiser: {host || 'Unknown'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{evt.cost || 'Free'}</div>
                </div>
              </div>

              {evt.vibes && evt.vibes.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {evt.vibes.map((v:string) => <span key={v} className="chip">{v}</span>)}
                </div>
              )}

              {evt.photoDataUrl && <img src={evt.photoDataUrl} alt="event" style={{ width: '100%', borderRadius: 8 }} />}

              {evt.description && <div style={{ whiteSpace: 'pre-wrap', color: '#374151' }}>{evt.description}</div>}
              {renderMissing()}

              {/* participant actions based on state */}
              <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                {/* States for participants:
                    - preregistration (upcoming, not registered): show Apply
                    - registered (upcoming, registered): show Unable to make it
                    - preevent (within 24h): show Unable to make it + Running late + On my way
                    - postevent: remove action buttons
                */}
                {timeState !== 'postevent' && !amRegistered && timeState === 'upcoming' && (
                  <>
                    <button className="btn" onClick={async () => {
                      if (!userId) { try { window.dispatchEvent(new CustomEvent('demo1_require_auth', { detail: { reason: 'apply', eventId: evt?.id } })) } catch (e) { alert('Please log in to apply') }; return }
                      const res = addParticipant(evt.id, userId)
                      if (res) { setEvt(res); alert('You are registered') }
                      else alert('Failed to register')
                    }}>Apply</button>
                    <button className="btn ghost" onClick={() => alert('Share (prototype)')}>Share</button>
                    <button className="btn ghost" onClick={() => { try { const id = evt.host || ''; window.dispatchEvent(new CustomEvent('demo1_open_profile', { detail: { id } })) } catch (e) {} }}>Host profile</button>
                  </>
                )}

                {timeState !== 'postevent' && amRegistered && (
                  <>
                    <button className="btn ghost" onClick={async () => {
                      if (!userId) return
                      const res = removeParticipant(evt.id, userId)
                      if (res) { setEvt(res); alert('You have withdrawn') }
                      else alert('Failed')
                    }}>{timeState === 'upcoming' ? 'Unable to make it' : 'Unable to make it'}</button>
                    {timeState === 'preevent' && (
                      <>
                        <button className="btn" onClick={() => alert('Running late (prototype)')}>Running late</button>
                        <button className="btn" onClick={() => alert('On my way (prototype)')}>On my way</button>
                      </>
                    )}
                    <div style={{ flex: 1 }} />
                    <button className="btn ghost" onClick={() => alert('Report (prototype)')}>Report a participant</button>
                    <button className="btn ghost" onClick={() => alert('Share (prototype)')}>Share Session</button>
                  </>
                )}

                {timeState === 'postevent' && (
                  <>
                    <div style={{ flex: 1 }} />
                    <button className="btn ghost" onClick={() => alert('Share (prototype)')}>Share Session</button>
                  </>
                )}
              </div>

              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 13, color: '#6b7280' }}>Participants: {Array.isArray(evt.participants) ? evt.participants.length : 0} {evt.participantsMax ? ` / ${evt.participantsMax}` : ''}</div>
                {/* show list of public participants (profiles with aboutPublic true) */}
                <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  {Array.isArray(evt.participants) && evt.participants.length ? evt.participants.map((p:any) => {
                    const prof = getProfile(p)
                    if (prof && (prof as any).aboutPublic) {
                      const display = prof.displayName || (userId === p ? p : (typeof p === 'string' && p.includes('@') ? 'User' : p))
                      return <div key={p} className="chip" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{display}</div>
                    }
                    return null
                  }) : <div style={{ color: '#9ca3af' }}>No public participants to show</div>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

