import React from 'react'
import { getProfile, getLoggedInUser, listEvents, getPublicIdentityLabel, getPreferredName } from './AuthService'

type Props = {
  open: boolean
  onClose: () => void
  userId: string
}

type ReadProps = Props & {
  onEditInterests?: () => void
  onEditAbout?: () => void
  onEditGender?: () => void
  onEditVibes?: () => void
  onEditIdentity?: () => void
}

export default function ReadProfileModal({ open, onClose, userId, onEditInterests, onEditAbout, onEditGender, onEditVibes, onEditIdentity }: ReadProps) {
  if (!open) return null
  const profile = getProfile(userId)
  const viewer = getLoggedInUser()
  // no toggle: always show both participant and organiser stats separated by a divider

  const publicLabel = getPublicIdentityLabel(userId, profile || undefined)
  const preferredName = getPreferredName(userId, profile || undefined)
  if (!profile) {
    return (
      <div className="modal-overlay" role="dialog" aria-modal="true">
        <div className="modal">
          <div className="modal-header">
            <h3>Profile</h3>
            <button type="button" className="modal-close" onClick={onClose}>✕</button>
          </div>
          <div className="modal-body">
            <div style={{ marginBottom: 12 }}>No profile data found.</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" onClick={() => { onEditInterests && onEditInterests(); onClose() }}>Create profile</button>
              <button className="btn ghost" onClick={onClose}>Close</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // gather hosted events (history and upcoming) for this profile
  const allEvents = listEvents()
  const pid = profile.id || userId
  const hostedEvents = allEvents.filter(e => String(e.host) === String(pid))
  const now = Date.now()
  const getEventTime = (e: any) => {
    try {
      if (e.date) {
        const t = e.startTime ? `${e.date}T${e.startTime}` : e.date
        const d = new Date(t)
        if (!isNaN(d.getTime())) return d.getTime()
      }
      return e.createdAt || 0
    } catch {
      return 0
    }
  }
  const upcoming = hostedEvents.filter((e: any) => getEventTime(e) > now).sort((a: any, b: any) => getEventTime(a) - getEventTime(b))
  const past = hostedEvents.filter((e: any) => getEventTime(e) <= now).sort((a: any, b: any) => getEventTime(b) - getEventTime(a))

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header">
          <h3>Profile</h3>
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>{publicLabel}</div>
                  {viewer === userId && preferredName !== publicLabel && (
                    <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>Preferred name: {preferredName}</div>
                  )}
                  <div style={{ fontSize: 13, color: '#6b7280', marginTop: 6 }}>{profile.about || <em>No bio provided</em>}</div>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                  {/* avatar moved to top-right */}
                  <div style={{ width: 64, height: 64, borderRadius: 999, background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 20 }}>{(publicLabel || '').charAt(0).toUpperCase()}</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {viewer !== userId ? (
                      <>
                        <button className="btn" onClick={() => window.dispatchEvent(new CustomEvent('demo1_add_friend', { detail: { userId } }))}>Add friend</button>
                        <button className="btn ghost" onClick={() => window.dispatchEvent(new CustomEvent('demo1_message_user', { detail: { userId } }))}>Message</button>
                      </>
                    ) : (
                      <>
                        <button aria-label="Edit identity" title="Edit identity" className="link-button" onClick={() => { setTimeout(() => onEditIdentity && onEditIdentity(), 0); setTimeout(() => onClose(), 0) }}>👤</button>
                        <button aria-label="Edit profile" title="Edit profile" className="link-button" onClick={() => { setTimeout(() => onEditAbout && onEditAbout(), 0); setTimeout(() => onClose(), 0) }}>✎</button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Vibes */}
              <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {profile.vibes && profile.vibes.length ? profile.vibes.map((v: any) => <div key={v} className="chip">{v}</div>) : <div style={{ color: '#9ca3af' }}>No vibes</div>}
              </div>

              {/* Participant and Organiser stats shown together with a divider */}
              <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Participant Stats</div>
                  <div style={{ marginTop: 6, fontSize: 13, color: '#6b7280' }}>
                    {(() => {
                      try {
                        const all = listEvents()
                        const pid = profile.id || userId
                        const joined = all.filter((e: any) => Array.isArray(e.participants) && e.participants.map((p: any) => String(p)).includes(String(pid)))
                        const joinedCount = joined.length
                        const hosts = new Set(joined.map((j: any) => j.host))
                        return (<div>Events Joined: <strong>{joinedCount}</strong><br />Hosts engaged: <strong>{hosts.size}</strong></div>)
                      } catch (e) { return null }
                    })()}
                  </div>
                </div>

                <div style={{ width: 1, background: '#eef2ff' }} />

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Organiser Stats</div>
                  <div style={{ marginTop: 6, fontSize: 13, color: '#6b7280' }}>
                    {(() => {
                      try {
                        const all = listEvents()
                        const hosted = all.filter((e: any) => e.host === (profile.id || userId))
                        const hostedCount = hosted.length
                        const successCount = hosted.filter((h: any) => Array.isArray(h.participants) && h.participants.length > 0).length
                        const successRate = hostedCount ? Math.round((successCount / hostedCount) * 100) : 0
                        return (<div>Events Hosted: <strong>{hostedCount}</strong><br />Event success rate: <strong>{successRate}%</strong></div>)
                      } catch (e) { return null }
                    })()}
                  </div>
                </div>
              </div>

              {/* Hosted upcoming and history lists */}
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Upcoming hosted sessions</div>
                {upcoming && upcoming.length ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {upcoming.slice(0,5).map((ev: any) => (
                      <div key={ev.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', border: '1px solid #eef2ff', borderRadius: 6 }}>
                        <div>
                          <div style={{ fontWeight: 700 }}>{ev.title}</div>
                          <div style={{ fontSize: 12, color: '#6b7280' }}>{ev.date} {ev.startTime || ''}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn ghost" onClick={() => window.dispatchEvent(new CustomEvent('demo1_open_event', { detail: ev }))}>View</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: '#9ca3af' }}>No upcoming hosted sessions</div>
                )}

                <div style={{ height: 12 }} />

                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Hosted history</div>
                {past && past.length ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {past.slice(0,5).map((ev: any) => (
                      <div key={ev.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', border: '1px solid #eef2ff', borderRadius: 6 }}>
                        <div>
                          <div style={{ fontWeight: 700 }}>{ev.title}</div>
                          <div style={{ fontSize: 12, color: '#6b7280' }}>{ev.date} {ev.startTime || ''}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn ghost" onClick={() => window.dispatchEvent(new CustomEvent('demo1_open_event', { detail: ev }))}>View</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: '#9ca3af' }}>No hosted history</div>
                )}
              </div>

              {/* Reviews box */}
              <div style={{ marginTop: 12, border: '1px solid #e6edf3', borderRadius: 8, padding: 12, background: 'white' }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Friends reviews</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ color: '#f59e0b' }}>★★★★★</div>
                </div>
                <div style={{ height: 8 }} />
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Overall reviews</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ color: '#f59e0b' }}>★★★★☆</div>
                </div>
                <div style={{ marginTop: 12, textAlign: 'right' }}><strong style={{ fontSize: 13 }}>See reviews</strong></div>
              </div>

              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <button type="button" className="btn" onClick={onClose}>Close</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
