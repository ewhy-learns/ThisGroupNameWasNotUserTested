import React from 'react'
import { getProfile, getLoggedInUser, listEvents } from './AuthService'
import Switch from './Switch'

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
}

export default function ReadProfileModal({ open, onClose, userId, onEditInterests, onEditAbout, onEditGender, onEditVibes }: ReadProps) {
  if (!open) return null
  const profile = getProfile(userId)
  const viewer = getLoggedInUser()
  const [showParticipantStats, setShowParticipantStats] = React.useState<boolean>(true)

  const safeDisplay = (id: string | undefined, prof: any) => {
    if (prof && prof.displayName) return prof.displayName
    // if the viewer is the same user, show the raw id (owner can see their own email)
    if (viewer === id) return id || ''
    // do not reveal emails to other users
    if (id && id.includes('@')) return 'User'
    return id || ''
  }
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

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header">
          <h3>Profile</h3>
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 84, flex: '0 0 84px', textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: 999, background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 20 }}>{(safeDisplay(userId, profile) || '').charAt(0).toUpperCase()}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>{safeDisplay(userId, profile)}</div>
                  <div style={{ fontSize: 13, color: '#6b7280', marginTop: 6 }}>{profile.about || <em>No bio provided</em>}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {viewer === userId ? (
                    <button aria-label="Edit profile" title="Edit profile" className="link-button" onClick={() => { setTimeout(() => onEditAbout && onEditAbout(), 0); setTimeout(() => onClose(), 0) }}>✎</button>
                  ) : null}
                </div>
              </div>

              {/* Vibes */}
              <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {profile.vibes && profile.vibes.length ? profile.vibes.map(v => <div key={v} className="chip">{v}</div>) : <div style={{ color: '#9ca3af' }}>No vibes</div>}
              </div>

              {/* Participant / Organiser stats: toggle to switch between views */}
              <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Switch checked={showParticipantStats} onChange={v => setShowParticipantStats(v)} ariaLabel="Toggle participant / organiser stats" />
                  <span style={{ fontSize: 13 }}>{showParticipantStats ? 'Show participant stats' : 'Show organiser stats'}</span>
                </div>

                <div style={{ borderLeft: '1px solid #eef2ff', paddingLeft: 12 }}>
                  {showParticipantStats ? (
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>Participant Stats</div>
                      <div style={{ marginTop: 6, fontSize: 13, color: '#6b7280' }}>
                        {(() => {
                          try {
                            const all = listEvents()
                            const pid = profile.id || userId
                            const joined = all.filter(e => Array.isArray(e.participants) && e.participants.map((p:any)=>String(p)).includes(String(pid)))
                            const joinedCount = joined.length
                            // number of unique hosts this user has joined
                            const hosts = new Set(joined.map(j => j.host))
                            return (<div>Events Joined: <strong>{joinedCount}</strong><br/>Hosts engaged: <strong>{hosts.size}</strong></div>)
                          } catch (e) { return null }
                        })()}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>Organiser Stats</div>
                      <div style={{ marginTop: 6, fontSize: 13, color: '#6b7280' }}>
                        {(() => {
                          try {
                            const all = listEvents()
                            const hosted = all.filter(e => e.host === (profile.id || userId))
                            const hostedCount = hosted.length
                            const successCount = hosted.filter(h => Array.isArray(h.participants) && h.participants.length > 0).length
                            const successRate = hostedCount ? Math.round((successCount / hostedCount) * 100) : 0
                            return (<div>Events Hosted: <strong>{hostedCount}</strong><br/>Event success rate: <strong>{successRate}%</strong></div>)
                          } catch (e) { return null }
                        })()}
                      </div>
                    </div>
                  )}
                </div>
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
