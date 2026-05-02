import React from 'react'
import { listEvents, getProfile, removeParticipant, getPublicIdentityLabel, getEventParticipantLabel, reviewPendingApplication } from './AuthService'
import ApplyModal from './ApplyModal'

type Props = { open: boolean; eventId?: string; onClose: () => void; userId?: string }
type SessionTab = 'description' | 'map' | 'participants' | 'applications' | 'waitlist'

const tabBaseStyle: React.CSSProperties = {
  borderRadius: 999,
  padding: '8px 12px',
  fontSize: 13,
  fontWeight: 700,
}

export default function ViewSession({ open, eventId, onClose, userId }: Props) {
  const [evt, setEvt] = React.useState<any | null>(null)
  const [showApply, setShowApply] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState<SessionTab>('description')

  React.useEffect(() => {
    if (!open || !eventId) return setEvt(null)
    const handleUpd = () => {
      const all = listEvents()
      const found = all.find((ev: any) => ev.id === eventId) || null
      setEvt(found)
    }
    handleUpd()
    window.addEventListener('demo1_events_updated', handleUpd)
    return () => window.removeEventListener('demo1_events_updated', handleUpd)
  }, [open, eventId])

  const eventTime = React.useMemo(() => {
    if (!evt || !evt.date) return null
    try {
      const dateStr = evt.date + (evt.startTime ? 'T' + evt.startTime : 'T00:00')
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return null
      return d.getTime()
    } catch {
      return null
    }
  }, [evt])

  const eventEndTime = React.useMemo(() => {
    if (!eventTime) return null
    const dur = Number(evt?.duration || 0)
    if (dur && !isNaN(dur)) return eventTime + dur * 60 * 1000
    return eventTime + 4 * 60 * 60 * 1000
  }, [eventTime, evt])

  const timeState = React.useMemo(() => {
    if (!eventTime) return 'unknown'
    const t = Date.now()
    if (t > (eventEndTime || 0)) return 'postevent'
    if (t >= (eventTime - 24 * 60 * 60 * 1000)) return 'preevent'
    return 'upcoming'
  }, [eventTime, eventEndTime])

  const participants = React.useMemo(() => (
    Array.isArray(evt?.participants) ? evt.participants.map((entry: any) => String(entry)) : []
  ), [evt])

  const applications = React.useMemo(() => (
    Array.isArray(evt?.applications) ? evt.applications : []
  ), [evt])

  const pendingApplications = React.useMemo(() => applications.filter((app: any) => app.status === 'pending'), [applications])
  const waitlistedApplications = React.useMemo(() => applications.filter((app: any) => app.status === 'waitlisted'), [applications])
  const visibleApplications = React.useMemo(() => [...pendingApplications, ...waitlistedApplications], [pendingApplications, waitlistedApplications])

  const isHost = React.useMemo(() => !!evt && !!userId && String(evt.host || '') === String(userId), [evt, userId])

  const amRegistered = React.useMemo(() => {
    if (!evt || !userId) return false
    return participants.includes(String(userId))
  }, [evt, userId, participants])

  const myApplication = React.useMemo(() => {
    if (!evt || !userId) return null
    return applications.find((a: any) => String(a.userId) === String(userId)) || null
  }, [evt, userId, applications])

  const canViewParticipants = isHost || amRegistered
  const canViewApplications = isHost

  const openProfile = React.useCallback((profileId: string) => {
    try {
      window.dispatchEvent(new CustomEvent('demo1_open_profile', { detail: { id: profileId } }))
    } catch {}
  }, [])

  const handleReview = React.useCallback((applicantId: string, decision: 'approve' | 'reject') => {
    if (!evt?.id) return
    const result = reviewPendingApplication(evt.id, applicantId, decision)
    if (!result) {
      alert('Unable to update this application right now.')
      return
    }
    setEvt(result.event)
    if (decision === 'approve') {
      alert(result.status === 'waitlisted' ? 'Session is full, so the applicant has been moved to the waitlist.' : 'Applicant approved and moved into participants.')
    } else {
      alert('Application rejected.')
    }
  }, [evt])

  const openMessages = React.useCallback((target: any) => {
    try {
      window.dispatchEvent(new CustomEvent('demo1_open_messages', { detail: target }))
    } catch {}
  }, [])

  const addToCalendar = React.useCallback(() => {
    if (!evt) return
    const start = evt.date && evt.startTime ? new Date(`${evt.date}T${evt.startTime}`) : null
    if (!start || Number.isNaN(start.getTime())) {
      alert('This session needs a valid date and start time before it can be added to a calendar.')
      return
    }
    const end = evt.endTime ? new Date(`${evt.date}T${evt.endTime}`) : new Date(start.getTime() + Number(evt.duration || 60) * 60 * 1000)
    const formatIcsDate = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Demo1//Sessions//EN',
      'BEGIN:VEVENT',
      `UID:${evt.id || 'session'}@demo1.local`,
      `DTSTAMP:${formatIcsDate(new Date())}`,
      `DTSTART:${formatIcsDate(start)}`,
      `DTEND:${formatIcsDate(end)}`,
      `SUMMARY:${String(evt.title || evt.activity || 'Session').replace(/\n/g, ' ')}`,
      evt.location ? `LOCATION:${String(evt.location).replace(/\n/g, ' ')}` : '',
      evt.description ? `DESCRIPTION:${String(evt.description).replace(/\n/g, '\\n')}` : '',
      'END:VEVENT',
      'END:VCALENDAR',
    ].filter(Boolean)
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${String(evt.title || evt.activity || 'session').replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'session'}.ics`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }, [evt])

  const availableTabs = React.useMemo<SessionTab[]>(() => {
    const tabs: SessionTab[] = ['description', 'map']
    if (canViewParticipants) tabs.push('participants')
    if (canViewApplications) tabs.push('applications')
    if (canViewApplications) tabs.push('waitlist')
    return tabs
  }, [canViewParticipants, canViewApplications])

  const defaultTab = React.useMemo<SessionTab>(() => {
    if (amRegistered && canViewParticipants) return 'participants'
    return 'description'
  }, [amRegistered, canViewParticipants])

  React.useEffect(() => {
    if (!open) {
      setActiveTab('description')
      return
    }
    setActiveTab(defaultTab)
  }, [open, eventId, defaultTab])

  React.useEffect(() => {
    if (!availableTabs.includes(activeTab)) {
      setActiveTab(defaultTab)
    }
  }, [availableTabs, activeTab, defaultTab])

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
    if (evt.host) {
      const prof = getProfile(evt.host)
      if (prof) return getPublicIdentityLabel(evt.host, prof)
      if (evt.organiserName) return evt.organiserName
      return getPublicIdentityLabel(evt.host)
    }
    if (evt.organiserName) return evt.organiserName
    return null
  })()

  const approvedCount = participants.length
  const pendingCount = pendingApplications.length
  const waitlistedCount = waitlistedApplications.length
  const hasCoords = typeof evt?.locationCoords?.lat === 'number' && typeof evt?.locationCoords?.lon === 'number'
  const mapHref = hasCoords
    ? `https://www.openstreetmap.org/?mlat=${encodeURIComponent(String(evt.locationCoords.lat))}&mlon=${encodeURIComponent(String(evt.locationCoords.lon))}#map=16/${encodeURIComponent(String(evt.locationCoords.lat))}/${encodeURIComponent(String(evt.locationCoords.lon))}`
    : evt?.location
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(String(evt.location))}`
      : ''
  const directionsHref = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${evt.locationCoords.lat},${evt.locationCoords.lon}`)}&travelmode=driving`
    : evt?.location
      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(String(evt.location))}&travelmode=driving`
      : ''
  const embedMapSrc = hasCoords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(String(evt.locationCoords.lon - 0.01))}%2C${encodeURIComponent(String(evt.locationCoords.lat - 0.01))}%2C${encodeURIComponent(String(evt.locationCoords.lon + 0.01))}%2C${encodeURIComponent(String(evt.locationCoords.lat + 0.01))}&layer=mapnik&marker=${encodeURIComponent(String(evt.locationCoords.lat))}%2C${encodeURIComponent(String(evt.locationCoords.lon))}`
    : ''

  const renderTabContent = () => {
    if (!evt) return null

    if (activeTab === 'map') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {hasCoords ? (
            <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e7eb', minHeight: 220 }}>
              <iframe title="Session map" src={embedMapSrc} style={{ width: '100%', height: 220, border: 0 }} loading="lazy" />
            </div>
          ) : (
            <div style={{ padding: 16, borderRadius: 12, background: '#f9fafb', color: '#6b7280' }}>
              A map preview is not available yet for this session.
            </div>
          )}
          <div style={{ fontSize: 14, color: '#374151' }}>
            <strong>Location:</strong> {evt.location || 'Location not specified'}
          </div>
          {hasCoords && (
            <div style={{ fontSize: 13, color: '#6b7280' }}>
              Coordinates: {evt.locationCoords.lat}, {evt.locationCoords.lon}
            </div>
          )}
          {(directionsHref || mapHref) && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {directionsHref && <a className="btn" href={directionsHref} target="_blank" rel="noreferrer">Get directions</a>}
              {mapHref && <a className="btn ghost" href={mapHref} target="_blank" rel="noreferrer">Open map</a>}
            </div>
          )}
        </div>
      )
    }

    if (activeTab === 'participants') {
      if (!canViewParticipants) {
        return <div style={{ color: '#6b7280' }}>Participants become visible after approval.</div>
      }
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 13, color: '#6b7280' }}>
            Approved participants: {approvedCount}{evt.participantsMax ? ` / ${evt.participantsMax}` : ''}
          </div>
          {participants.length > 0 ? participants.map((participantId: string) => {
            const display = getEventParticipantLabel(evt, participantId, userId)
            return (
              <div key={participantId} style={{ background: '#f9fafb', padding: 10, borderRadius: 10, fontSize: 14 }}>
                {display}
              </div>
            )
          }) : (
            <div style={{ color: '#9ca3af' }}>No approved participants yet</div>
          )}
        </div>
      )
    }

    if (activeTab === 'applications') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 13, color: '#6b7280' }}>
            Pending applications are only visible to the host. Approved applicants move into the participants list.
          </div>

          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: 14 }}>Pending applications ({pendingCount})</h4>
            {pendingApplications.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pendingApplications.map((app: any) => (
                  <div key={app.userId} style={{ background: '#f9fafb', padding: 10, borderRadius: 10 }}>
                    <strong style={{ fontSize: 13 }}>{app.preferredName && app.preferredName !== app.username ? `${app.username || getPublicIdentityLabel(app.userId)} (${app.preferredName})` : (app.username || getPublicIdentityLabel(app.userId))}</strong>
                    <div style={{ fontSize: 12, marginTop: 4 }}>Skill: {app.skillLevel || 'Not provided'}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>Share preferred name with participants: {app.preferredNameVisibleToParticipants ? 'Yes' : 'No'}</div>
                    {app.message && <div style={{ fontSize: 12, marginTop: 6, color: '#4b5563' }}>&quot;{app.message}&quot;</div>}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                      <button className="btn ghost" type="button" onClick={() => openProfile(app.userId)}>View profile</button>
                      <button className="btn" type="button" onClick={() => handleReview(app.userId, 'approve')}>Approve</button>
                      <button className="btn ghost" type="button" onClick={() => handleReview(app.userId, 'reject')}>Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: '#9ca3af' }}>No pending applications right now</div>
            )}
          </div>
        </div>
      )
    }

    if (activeTab === 'waitlist') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 13, color: '#6b7280' }}>
            Waitlisted applicants remain visible to the host here until a spot opens up.
          </div>

          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: 14 }}>Waitlist ({waitlistedCount})</h4>
            {waitlistedApplications.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {waitlistedApplications.map((app: any) => (
                  <div key={app.userId} style={{ background: '#eef2ff', padding: 10, borderRadius: 10 }}>
                    <strong style={{ fontSize: 13 }}>{app.preferredName && app.preferredName !== app.username ? `${app.username || getPublicIdentityLabel(app.userId)} (${app.preferredName})` : (app.username || getPublicIdentityLabel(app.userId))}</strong>
                    <div style={{ fontSize: 12, marginTop: 4 }}>Skill: {app.skillLevel || 'Not provided'}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>Share preferred name with participants: {app.preferredNameVisibleToParticipants ? 'Yes' : 'No'}</div>
                    {app.message && <div style={{ fontSize: 12, marginTop: 6, color: '#4b5563' }}>&quot;{app.message}&quot;</div>}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: '#9ca3af' }}>Nobody is currently waitlisted</div>
            )}
          </div>
        </div>
      )
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {evt.photoDataUrl && <img src={evt.photoDataUrl} alt="event" style={{ width: '100%', borderRadius: 8 }} />}
        {evt.description ? (
          <div style={{ whiteSpace: 'pre-wrap', color: '#374151' }}>{evt.description}</div>
        ) : (
          <div style={{ color: '#9ca3af' }}>No description has been added yet.</div>
        )}
        {renderMissing()}
      </div>
    )
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal" style={{ maxWidth: 640 }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>{evt.date} · {evt.startTime}{evt.duration ? ` · ${Math.floor(evt.duration / 60)}h ${evt.duration % 60}m` : ''}</div>
                  <div style={{ marginTop: 6, fontWeight: 700 }}>{evt.location || 'Location not specified'}</div>
                  <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>Organiser: {host || 'Unknown'}</div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 12, color: '#6b7280' }}>
                  {evt.cost || 'Free'}
                </div>
              </div>

              {evt.vibes && evt.vibes.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {evt.vibes.map((v: string) => <span key={v} className="chip">{v}</span>)}
                </div>
              )}

              {myApplication && myApplication.status === 'pending' && (
                <div style={{ padding: '8px 12px', background: '#fef3c7', color: '#b45309', borderRadius: 8, fontSize: 14 }}>
                  Your application is pending.
                </div>
              )}
              {myApplication && myApplication.status === 'waitlisted' && (
                <div style={{ padding: '8px 12px', background: '#e0e7ff', color: '#4338ca', borderRadius: 8, fontSize: 14 }}>
                  You are waitlisted.
                </div>
              )}

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 13, color: '#6b7280' }}>
                <span>Approved: {approvedCount}{evt.participantsMax ? ` / ${evt.participantsMax}` : ''}</span>
                {evt.participantsMin ? <span>Min: {evt.participantsMin}</span> : null}
                {isHost ? <span>Pending applications: {pendingCount}</span> : null}
                {waitlistedCount > 0 ? <span>Waitlist: {waitlistedCount}</span> : null}
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                {timeState !== 'postevent' && !isHost && !amRegistered && timeState === 'upcoming' && (!myApplication || myApplication.status === 'denied') && (
                  <button className="btn" onClick={() => {
                    if (!userId) {
                      try {
                        window.dispatchEvent(new CustomEvent('demo1_require_auth', { detail: { reason: 'apply', eventId: evt?.id } }))
                      } catch {
                        alert('Please log in to apply')
                      }
                      return
                    }
                    setShowApply(true)
                  }}>Apply</button>
                )}

                {timeState !== 'postevent' && amRegistered && (
                  <>
                    <button className="btn ghost" onClick={() => {
                      if (!userId) return
                      const res = removeParticipant(evt.id, userId)
                      if (res) {
                        setEvt(res)
                        alert('You have withdrawn')
                      } else {
                        alert('Failed')
                      }
                    }}>Unable to make it</button>
                    {timeState === 'preevent' && (
                      <>
                        <button className="btn" onClick={() => alert('Running late (prototype)')}>Running late</button>
                        <button className="btn" onClick={() => alert('On my way (prototype)')}>On my way</button>
                      </>
                    )}
                    <button className="btn ghost" onClick={addToCalendar}>Add to calendar</button>
                    <button className="btn ghost" onClick={() => openMessages({ type: 'event', eventId: evt.id })}>Event chat</button>
                    <button className="btn ghost" onClick={() => alert('Report (prototype)')}>Report a participant</button>
                  </>
                )}

                {isHost && (
                  <button className="btn ghost" onClick={() => openMessages({ type: 'event', eventId: evt.id })}>Event chat</button>
                )}

                {!isHost && (
                  <>
                    <button className="btn ghost" onClick={() => {
                      try {
                        const id = evt.host || ''
                        window.dispatchEvent(new CustomEvent('demo1_open_profile', { detail: { id } }))
                      } catch {}
                    }}>Host profile</button>
                    {userId && <button className="btn ghost" onClick={() => openMessages({ type: 'direct', otherUserId: evt.host })}>Message host</button>}
                  </>
                )}
                <button className="btn ghost" onClick={() => alert('Share (prototype)')}>Share</button>
              </div>

              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Overview</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                  {availableTabs.map(tab => {
                    const label = tab === 'description'
                      ? 'Description'
                      : tab === 'map'
                        ? 'Map'
                        : tab === 'participants'
                          ? `Participants (${approvedCount})`
                          : tab === 'applications'
                            ? `Applications (${pendingCount})`
                            : `Waitlist (${waitlistedCount})`
                    const selected = activeTab === tab
                    return (
                      <button
                        key={tab}
                        type="button"
                        className={selected ? 'btn' : 'btn ghost'}
                        style={selected ? tabBaseStyle : { ...tabBaseStyle, fontWeight: 600 }}
                        onClick={() => setActiveTab(tab)}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
                {renderTabContent()}
              </div>
            </div>
          )}
        </div>
      </div>
      {showApply && evt && userId && <ApplyModal open={showApply} eventId={evt.id} userId={userId} activityDetails={evt.activity || 'Activity'} onClose={() => setShowApply(false)} />}
    </div>
  )
}
