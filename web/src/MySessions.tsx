import React from 'react'
import { listEvents, getProfile } from './AuthService'

// MySessions: show events the current user created (host) and events they applied to (participants)
export default function MySessions({ userId }: { userId: string }) {
  const [created, setCreated] = React.useState<any[]>([])
  const [applied, setApplied] = React.useState<any[]>([])

  const load = React.useCallback(() => {
    if (!userId) {
      setCreated([])
      setApplied([])
      return
    }
    try {
      const all = listEvents()
      const lowId = String(userId || '').toLowerCase()
      const mine = all.filter(e => String(e.host || '').toLowerCase() === lowId).sort((a,b) => (b.createdAt||0) - (a.createdAt||0))
      const apps = all.filter(e => Array.isArray((e as any).participants) && (e as any).participants.map((p:any)=>String(p).toLowerCase()).includes(lowId)).sort((a,b) => (b.date||'').localeCompare(a.date||''))
      setCreated(mine)
      setApplied(apps)
    } catch (e) {
      setCreated([])
      setApplied([])
    }
  }, [userId])

  React.useEffect(() => {
    load()
    // listen for same-window event publishes so the list updates immediately after creating an event
    const onEventsUpdated = (ev: any) => {
      try { load() } catch (e) { /* ignore */ }
    }
    window.addEventListener('demo1_events_updated', onEventsUpdated as EventListener)
    // also refresh if another tab updates localStorage
    const onStorage = (ev: StorageEvent) => { if (ev.key === 'demo1_events_v1') load() }
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
        <p>Please log in to see sessions you've created or applied for.</p>
      </div>
    )
  }


  return (
    <div style={{ padding: 16 }}>
      <h3>My sessions</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <h4>Created by you</h4>
          {created.length === 0 ? <div>No sessions created yet.</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {created.map(evt => (
                <div key={evt.id} style={{ border: '1px solid rgba(2,6,23,0.06)', padding: 10, borderRadius: 8 }}>
                  <div style={{ fontWeight: 700 }}>{evt.title || evt.activity || 'Untitled'}</div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>{evt.date} · {evt.startTime} · {evt.location}</div>
                  <div style={{ marginTop: 8 }}>
                    <button className="btn ghost" onClick={() => { try { const ce = new CustomEvent('demo1_open_event', { detail: { id: evt.id } }); window.dispatchEvent(ce) } catch (e) { alert('View session (prototype)') } }}>View</button>
                    <button className="btn" style={{ marginLeft: 8 }} onClick={() => alert('Edit session (prototype)')}>Edit</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <h4>Applied / Joined</h4>
          {applied.length === 0 ? <div>No applications or joined sessions found.</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {applied.map(evt => (
                <div key={evt.id} style={{ border: '1px solid rgba(2,6,23,0.06)', padding: 10, borderRadius: 8 }}>
                  <div style={{ fontWeight: 700 }}>{evt.title || evt.activity || 'Untitled'}</div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>{evt.date} · {evt.startTime} · {evt.location}</div>
                  <div style={{ marginTop: 8 }}>
                    <button className="btn ghost" onClick={() => { try { const ce = new CustomEvent('demo1_open_event', { detail: { id: evt.id } }); window.dispatchEvent(ce) } catch (e) { alert('View session (prototype)') } }}>View</button>
                    <button className="btn" style={{ marginLeft: 8 }} onClick={() => alert('Cancel application (prototype)')}>Cancel</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

