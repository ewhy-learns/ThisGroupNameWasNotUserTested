import React from 'react'
import { applySkillSuggestion, deferSkillSuggestion, getParticipantReviewRecord, getPendingSkillSuggestions, getProfile, getProfileSectionVisibility, getPublicIdentityLabel, getEventParticipantLabel, isFriendWith, hasSentFriendRequest, sendFriendRequest, listEvents, needsHostWrapUp, needsParticipantReview, removeParticipant, reviewPendingApplication, setParticipantCheckIn } from './AuthService'
import ApplyModal from './ApplyModal'
import ParticipantReviewModal from './ParticipantReviewModal'
import HostWrapUpModal from './HostWrapUpModal'
import IncidentFormModal from './IncidentFormModal'
import ApplicationFeedbackModal from './ApplicationFeedbackModal'
import { XIcon, MessageIcon, UserPlusIcon } from './Icons'
import { PersonAvatar, EventAvatar } from './AvatarUtils'

type Props = { open: boolean; eventId?: string; onClose: () => void; userId?: string }
type SessionTab = 'description' | 'map' | 'participants' | 'applications' | 'stats'

const tabBaseStyle: React.CSSProperties = {
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 13,
  fontWeight: 700,
}

const footerButtonStyle: React.CSSProperties = {
  flex: '0 0 auto',
}

function getInitials(label: string) {
  const cleaned = String(label || '').trim()
  if (!cleaned) return '?'
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

export default function ViewSession({ open, eventId, onClose, userId }: Props) {
  const [evt, setEvt] = React.useState<any | null>(null)
  const [showApply, setShowApply] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState<SessionTab>('description')
  const [showReviewModal, setShowReviewModal] = React.useState(false)
  const [showWrapUpModal, setShowWrapUpModal] = React.useState(false)
  const [showIncidentModal, setShowIncidentModal] = React.useState(false)
  const [reviewVersion, setReviewVersion] = React.useState(0)
  const [showFeedbackModal, setShowFeedbackModal] = React.useState(false)
  const [feedbackApplicant, setFeedbackApplicant] = React.useState<{ id: string; name: string; decision: 'approve' | 'reject' } | null>(null)
  const [isFeedbackValidating, setIsFeedbackValidating] = React.useState(false)
  const [friendRefreshKey, setFriendRefreshKey] = React.useState(0)

  React.useEffect(() => {
    if (!open || !eventId) return setEvt(null)
    const handleUpd = () => {
      const all = listEvents()
      const found = all.find((ev: any) => ev.id === eventId) || null
      setEvt(found ? { ...found } : null)
    }
    handleUpd()
    window.addEventListener('demo1_events_updated', handleUpd)
    const handleReviewsUpdated = () => {
      handleUpd()
      setReviewVersion(current => current + 1)
    }
    window.addEventListener('demo1_reviews_updated', handleReviewsUpdated)
    return () => {
      window.removeEventListener('demo1_events_updated', handleUpd)
      window.removeEventListener('demo1_reviews_updated', handleReviewsUpdated)
    }
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

  const participantList = React.useMemo(() => {
    const ordered: string[] = []
    const seen = new Set<string>()
    const push = (value: any) => {
      const next = String(value || '').trim()
      if (!next || seen.has(next)) return
      seen.add(next)
      ordered.push(next)
    }
    push(evt?.host)
    participants.forEach(push)
    return ordered
  }, [evt?.host, participants])

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

  const participantReviewRecord = React.useMemo(() => {
    if (!evt || !userId) return null
    return getParticipantReviewRecord(evt.id, userId)
  }, [evt, userId, reviewVersion])

  const shouldPromptParticipantReview = React.useMemo(() => {
    if (!evt || !userId) return false
    return needsParticipantReview(evt, userId)
  }, [evt, userId, reviewVersion])

  const shouldPromptHostWrapUp = React.useMemo(() => {
    if (!evt || !userId) return false
    return needsHostWrapUp(evt, userId)
  }, [evt, userId, reviewVersion])

  const pendingSkillSuggestion = React.useMemo(() => {
    if (!evt || !userId) return null
    return getPendingSkillSuggestions(userId, evt.id)[0] || null
  }, [evt, userId, reviewVersion])

  const canViewParticipants = isHost || amRegistered
  const canViewApplications = isHost
  const canViewParticipantStats = canViewParticipants

  const openProfile = React.useCallback((profileId: string, context?: { source: 'session_host_cards'; eventId: string; relation: 'participant' | 'application' }) => {
    try {
      window.dispatchEvent(new CustomEvent('demo1_open_profile', { detail: { id: profileId, context } }))
    } catch {}
  }, [])

  const handleReview = React.useCallback((applicantId: string, applicantName: string, decision: 'approve' | 'reject') => {
    setFeedbackApplicant({ id: applicantId, name: applicantName, decision })
    setShowFeedbackModal(true)
  }, [])

  const handleFeedbackSubmit = React.useCallback((feedback: string) => {
    if (!evt?.id || !feedbackApplicant) return
    setIsFeedbackValidating(true)
    try {
      const result = reviewPendingApplication(evt.id, feedbackApplicant.id, feedbackApplicant.decision, feedback)
      if (!result) {
        alert('Unable to update this application right now.')
        setShowFeedbackModal(false)
        setFeedbackApplicant(null)
        setIsFeedbackValidating(false)
        return
      }
      setEvt(result.event)
      const msgType = feedbackApplicant.decision === 'approve'
        ? (result.status === 'waitlisted' ? 'Session is full, so the applicant has been moved to the waitlist.' : 'Applicant approved and moved into participants.')
        : 'Application rejected.'
      alert(msgType)
      setShowFeedbackModal(false)
      setFeedbackApplicant(null)
    } catch (e) {
      alert('Error processing application')
    } finally {
      setIsFeedbackValidating(false)
    }
  }, [evt?.id, feedbackApplicant])

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
    if (canViewParticipantStats) tabs.push('stats')
    if (canViewApplications) tabs.push('applications')
    return tabs
  }, [canViewParticipants, canViewParticipantStats, canViewApplications])

  const defaultTab = React.useMemo<SessionTab>(() => {
    if (amRegistered && canViewParticipants) return 'participants'
    return 'description'
  }, [amRegistered, canViewParticipants])

  const participantStats = React.useMemo(() => {
    const currentYear = new Date().getFullYear()
    const genderCounts = new Map<string, number>()
    const ageRangeCounts = new Map<string, number>([
      ['Under 18', 0],
      ['18-24', 0],
      ['25-34', 0],
      ['35-44', 0],
      ['45-54', 0],
      ['55+', 0],
    ])
    const ages: number[] = []
    let visibleDemographicCount = 0

    for (const participantId of participantList) {
      const profile = getProfile(participantId)
      if (!profile) continue
      const visibility = getProfileSectionVisibility(profile, 'demographic')
      const canUseDemographics = participantId === userId
        || visibility === 'public'
        || (isHost && visibility === 'hosts')
      if (!canUseDemographics) continue

      visibleDemographicCount += 1

      const genderLabel = String(profile.gender || 'Prefer not to say').trim() || 'Prefer not to say'
      genderCounts.set(genderLabel, (genderCounts.get(genderLabel) || 0) + 1)

      const birthYear = Number(profile.yearOfBirth || 0)
      if (!birthYear || Number.isNaN(birthYear) || birthYear < 1900 || birthYear > currentYear) continue
      const age = currentYear - birthYear
      if (age < 0 || age > 120) continue
      ages.push(age)
      const bucket = age < 18
        ? 'Under 18'
        : age <= 24
          ? '18-24'
          : age <= 34
            ? '25-34'
            : age <= 44
              ? '35-44'
              : age <= 54
                ? '45-54'
                : '55+'
      ageRangeCounts.set(bucket, (ageRangeCounts.get(bucket) || 0) + 1)
    }

    const meanAge = ages.length > 0
      ? Math.round((ages.reduce((sum, age) => sum + age, 0) / ages.length) * 10) / 10
      : null

    return {
      totalParticipants: participantList.length,
      visibleDemographicCount,
      genderCounts: Array.from(genderCounts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
      ageRangeCounts: Array.from(ageRangeCounts.entries()),
      meanAge,
      ageSampleCount: ages.length,
    }
  }, [participantList, userId, isHost])

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
  const hostProfile = evt?.host ? getProfile(evt.host) : null
  const hostUsername = hostProfile?.username || (evt?.host ? getPublicIdentityLabel(evt.host, hostProfile || undefined) : null)
  const hostPreferredName = hostProfile?.preferredName || null
  const hostParticipantLabel = hostUsername
    ? (hostPreferredName && hostPreferredName !== hostUsername ? `${hostUsername} (${hostPreferredName})` : hostUsername)
    : (host || 'Organiser')

  const approvedCount = participantList.length
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

  const canApply = !!evt
    && timeState !== 'postevent'
    && !isHost
    && !amRegistered
    && timeState === 'upcoming'
    && (!myApplication || myApplication.status === 'denied')

  const primaryAction = React.useMemo(() => {
    if (!evt) return null
    if (isHost) {
      return {
        label: 'Edit',
        className: 'btn' as const,
        onClick: () => {
          try {
            window.dispatchEvent(new CustomEvent('demo1_edit_event', { detail: { event: evt } }))
          } catch {}
          onClose()
        },
      }
    }
    if (timeState === 'postevent' && amRegistered && shouldPromptParticipantReview) {
      return {
        label: 'Review',
        className: 'btn' as const,
        onClick: () => setShowReviewModal(true),
      }
    }
    if (timeState !== 'postevent' && amRegistered) {
      return {
        label: 'Check-In',
        className: 'btn' as const,
        onClick: () => {
          if (!userId || !evt?.id) return
          if (timeState !== 'preevent') {
            alert('Check-in opens 24 hours before the session starts.')
            return
          }
          setParticipantCheckIn(evt.id, userId, true)
          setReviewVersion(current => current + 1)
          alert('You are checked in for this session.')
        },
      }
    }
    if (canApply) {
      return {
        label: 'Apply',
        className: 'btn' as const,
        onClick: () => {
          if (!userId) {
            try {
              window.dispatchEvent(new CustomEvent('demo1_require_auth', { detail: { reason: 'apply', eventId: evt?.id } }))
            } catch {
              alert('Please log in to apply')
            }
            return
          }
          setShowApply(true)
        },
      }
    }
    return null
  }, [amRegistered, canApply, evt, isHost, onClose, shouldPromptParticipantReview, timeState, userId])

  const getSkillLevelForUser = React.useCallback((targetUserId: string, fallback?: string) => {
    if (fallback) return fallback
    const profile = getProfile(targetUserId)
    const skillKey = String(evt?.activity || '').trim()
    if (!profile || !skillKey) return 'Not assessed'
    return profile.skillChecks?.[skillKey] || 'Not assessed'
  }, [evt?.activity])

  const renderAvatar = React.useCallback((targetUserId: string, label: string) => {
    return <PersonAvatar userId={targetUserId} label={label} size={44} />
  }, [])

  const renderHostListContainer = React.useCallback((children: React.ReactNode) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '46vh', overflowY: 'auto', paddingRight: 4 }}>
      {children}
    </div>
  ), [])

  const renderHostPersonCard = React.useCallback((options: {
    userId: string
    label: string
    skillLevel?: string
    note?: React.ReactNode
    accent?: string
    background?: string
    actions?: React.ReactNode
  }) => {
    const skill = getSkillLevelForUser(options.userId, options.skillLevel)
    return (
      <div key={options.userId} style={{ background: options.background || '#f9fafb', borderRadius: 14, padding: 12, border: `1px solid ${options.accent || 'rgba(15,23,32,0.06)'}`, display: 'flex', gap: 10, alignItems: 'flex-start', height: '100%', boxSizing: 'border-box' }}>
        {renderAvatar(options.userId, options.label)}
        <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis' }}>{options.label}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Skill level: <strong style={{ color: '#374151' }}>{skill}</strong></div>
            </div>
          </div>
          {options.note ? <div style={{ fontSize: 12, color: '#4b5563', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{options.note}</div> : null}
          {options.actions ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 2 }}>{options.actions}</div> : null}
        </div>
      </div>
    )
  }, [getSkillLevelForUser, renderAvatar])

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
          {directionsHref && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <a className="btn" href={directionsHref} target="_blank" rel="noreferrer">Get directions</a>
            </div>
          )}
        </div>
      )
    }

    if (activeTab === 'participants') {
      if (!canViewParticipants) {
        return <div style={{ color: '#6b7280' }}>Participants become visible after approval.</div>
      }
      const hostParticipantCards = participantList.map((participantId: string) => {
        const isOrganiserRow = participantId === evt.host
        const display = isOrganiserRow ? hostParticipantLabel : getEventParticipantLabel(evt, participantId, userId)
        return (
          <div key={participantId} style={{ display: 'flex', alignItems: 'stretch', gap: 6 }}>
            <button
              type="button"
              style={{ flex: 1, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', minWidth: 0, display: 'block' }}
              onClick={() => openProfile(participantId, { source: 'session_host_cards', eventId: evt.id, relation: 'participant' })}
            >
              {renderHostPersonCard({
                userId: participantId,
                label: display,
                note: isOrganiserRow ? <span style={{ fontWeight: 700, color: '#b45309' }}>Organiser</span> : undefined,
              })}
            </button>
            {participantId !== evt.host && (
              <button
                className="btn ghost"
                type="button"
                style={{ flex: 'none', alignSelf: 'stretch', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 10px', minWidth: 0, aspectRatio: '1 / 1', lineHeight: 1 }}
                onClick={() => openMessages({ type: 'direct', otherUserId: participantId })}
                aria-label="Message"
              >
                <MessageIcon size={16} />
              </button>
            )}
          </div>
        )
      })

      const actionBtnStyle: React.CSSProperties = {
        flex: 'none',
        alignSelf: 'stretch',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 10px',
        minWidth: 0,
        aspectRatio: '1 / 1',
        lineHeight: 1,
      }

      // Participant view — cards matching host style, with friend/message side action
      const participantCards = participantList
        .filter((participantId: string) => participantId !== userId)
        .map((participantId: string) => {
          const isOrganiserRow = participantId === evt.host
          const display = isOrganiserRow ? hostParticipantLabel : getEventParticipantLabel(evt, participantId, userId)
          // friendRefreshKey forces re-evaluation after actions
          const alreadyFriend = userId ? isFriendWith(userId, participantId) : false
          const requestSent = userId && !alreadyFriend ? hasSentFriendRequest(userId, participantId) : false
          return (
            <div key={participantId} style={{ display: 'flex', alignItems: 'stretch', gap: 6 }}>
              <button
                type="button"
                style={{ flex: 1, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', minWidth: 0, display: 'block' }}
                onClick={() => openProfile(participantId)}
              >
                {renderHostPersonCard({
                  userId: participantId,
                  label: display,
                  note: isOrganiserRow ? <span style={{ fontWeight: 700, color: '#b45309' }}>Organiser</span> : undefined,
                })}
              </button>
              {alreadyFriend ? (
                <button
                  className="btn ghost"
                  type="button"
                  style={actionBtnStyle}
                  onClick={() => openMessages({ type: 'direct', otherUserId: participantId })}
                  aria-label="Message"
                >
                  <MessageIcon size={16} />
                </button>
              ) : requestSent ? (
                <button
                  className="btn ghost"
                  type="button"
                  style={{ ...actionBtnStyle, opacity: 0.5 }}
                  disabled
                  aria-label="Friend request sent"
                  title="Friend request sent"
                >
                  <UserPlusIcon size={16} />
                </button>
              ) : userId ? (
                <button
                  className="btn ghost"
                  type="button"
                  style={actionBtnStyle}
                  onClick={() => { sendFriendRequest(userId, participantId); setFriendRefreshKey(k => k + 1) }}
                  aria-label="Add friend"
                  title="Add friend"
                >
                  <UserPlusIcon size={16} />
                </button>
              ) : null}
            </div>
          )
        })
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 13, color: '#6b7280' }}>
            Participants: {approvedCount}{evt.participantsMax ? ` / ${evt.participantsMax}` : ''}
          </div>
          {participantList.length > 0 ? (isHost ? renderHostListContainer(hostParticipantCards) : renderHostListContainer(participantCards)) : (
            <div style={{ color: '#9ca3af' }}>No participants yet</div>
          )}
          {(isHost || amRegistered) && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8, paddingTop: 16, borderTop: '1px solid rgba(15,23,32,0.06)' }}>
              <button className="btn danger" type="button" onClick={() => setShowIncidentModal(true)}>Report</button>
              <button className="btn ghost" type="button" onClick={() => openMessages({ type: 'event', eventId: evt.id })}>Event chat</button>
            </div>
          )}
        </div>
      )
    }

    if (activeTab === 'stats') {
      if (!canViewParticipantStats) {
        return <div style={{ color: '#6b7280' }}>Participant stats become visible after approval.</div>
      }

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 13, color: '#6b7280' }}>
            Based on demographic information visible to you from approved participants.
            {participantStats.visibleDemographicCount < participantStats.totalParticipants ? ` ${participantStats.visibleDemographicCount} of ${participantStats.totalParticipants} participants are included.` : ''}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
            <div style={{ padding: 12, borderRadius: 14, background: '#f8fafc', border: '1px solid rgba(15,23,32,0.06)' }}>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Participants</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginTop: 4 }}>{participantStats.totalParticipants}</div>
            </div>
            <div style={{ padding: 12, borderRadius: 14, background: '#f8fafc', border: '1px solid rgba(15,23,32,0.06)' }}>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Visible demographic records</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginTop: 4 }}>{participantStats.visibleDemographicCount}</div>
            </div>
            <div style={{ padding: 12, borderRadius: 14, background: '#f8fafc', border: '1px solid rgba(15,23,32,0.06)' }}>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Mean age</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginTop: 4 }}>{participantStats.meanAge ?? 'N/A'}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{participantStats.ageSampleCount > 0 ? `Based on ${participantStats.ageSampleCount} shared ages` : 'No shared ages yet'}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <div style={{ padding: 14, borderRadius: 16, background: '#ffffff', border: '1px solid rgba(15,23,32,0.08)', boxShadow: '0 10px 24px rgba(15,23,32,0.05)' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#111827', marginBottom: 10 }}>Gender balance</div>
              {participantStats.genderCounts.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {participantStats.genderCounts.map(([label, count]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13, color: '#374151' }}>
                      <span>{label}</span>
                      <strong>{count}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#9ca3af', fontSize: 13 }}>No visible gender information yet.</div>
              )}
            </div>

            <div style={{ padding: 14, borderRadius: 16, background: '#ffffff', border: '1px solid rgba(15,23,32,0.08)', boxShadow: '0 10px 24px rgba(15,23,32,0.05)' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#111827', marginBottom: 10 }}>Age ranges</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {participantStats.ageRangeCounts.map(([label, count]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13, color: '#374151' }}>
                    <span>{label}</span>
                    <strong>{count}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )
    }

    if (activeTab === 'applications') {
      const allVisibleApplications = visibleApplications.map((app: any) => {
        // Get applicant name
        const nameLabel = app.preferredName && app.preferredName !== app.username
          ? `${app.username || getPublicIdentityLabel(app.userId)} (${app.preferredName})`
          : (app.username || getPublicIdentityLabel(app.userId))
        return { ...app, nameLabel }
      })

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 13, color: '#6b7280' }}>
            Applications and waitlist in one view. Approved applicants move into the participants list.
          </div>

          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: 14 }}>Applications & Waitlist ({visibleApplications.length})</h4>
            {allVisibleApplications.length > 0 ? (
              renderHostListContainer(allVisibleApplications.map((app: any) => {
                const isPending = app.status === 'pending'
                const isWaitlisted = app.status === 'waitlisted'
                const statusBadge = isWaitlisted
                  ? (
                      <div style={{ fontSize: 11, padding: '4px 8px', background: '#eef2ff', color: '#4338ca', borderRadius: 4, fontWeight: 600 }}>
                        Waitlisted {app.waitlistReason === 'capacity' ? '(capacity)' : ''}
                      </div>
                    )
                  : null

                const noteContent = (
                  <>
                    {statusBadge && <div style={{ marginBottom: 8 }}>{statusBadge}</div>}
                    <div>Share preferred name with participants: {app.preferredNameVisibleToParticipants ? 'Yes' : 'No'}</div>
                    {app.message ? <div style={{ marginTop: 4 }}>&quot;{app.message}&quot;</div> : null}
                    {app.feedback && (
                      <div style={{ marginTop: 8, padding: 8, background: 'rgba(99,102,241,0.05)', borderRadius: 4, fontSize: 13, color: '#6b7280' }}>
                        <strong style={{ color: '#374151' }}>Host feedback:</strong> {app.feedback}
                      </div>
                    )}
                  </>
                )

                return renderHostPersonCard({
                  userId: app.userId,
                  label: app.nameLabel,
                  skillLevel: app.skillLevel,
                  background: isWaitlisted ? '#eef2ff' : undefined,
                  accent: isWaitlisted ? 'rgba(99,102,241,0.14)' : undefined,
                  note: noteContent,
                  actions: (
                    <>
                      <button className="btn ghost" type="button" onClick={() => openProfile(app.userId, { source: 'session_host_cards', eventId: evt.id, relation: 'application' })}>View profile</button>
                      {isPending && (
                        <>
                          <button className="btn danger" type="button" onClick={() => handleReview(app.userId, app.nameLabel, 'reject')}>Reject</button>
                          <button className="btn" type="button" onClick={() => handleReview(app.userId, app.nameLabel, 'approve')}>Approve</button>
                        </>
                      )}
                      {isWaitlisted && (
                        <button className="btn ghost" type="button" onClick={() => openMessages({ type: 'direct', otherUserId: app.userId })}>Message</button>
                      )}
                    </>
                  ),
                })
              }))
            ) : (
              <div style={{ color: '#9ca3af' }}>No applications or waitlist entries</div>
            )}
          </div>
        </div>
      )
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ padding: 14, borderRadius: 16, background: '#ffffff', border: '1px solid rgba(15,23,32,0.08)', boxShadow: '0 10px 24px rgba(15,23,32,0.05)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Description</div>
          {evt.description ? (
            <div style={{ whiteSpace: 'pre-wrap', color: '#374151', lineHeight: 1.6 }}>{evt.description}</div>
          ) : (
            <div style={{ color: '#9ca3af' }}>No description has been added yet.</div>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
          <div style={{ padding: 12, borderRadius: 14, background: '#f8fafc', border: '1px solid rgba(15,23,32,0.06)' }}>
            <div style={{ fontSize: 12, color: '#6b7280' }}>Participants</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#111827', marginTop: 4 }}>{approvedCount}{evt.participantsMax ? ` / ${evt.participantsMax}` : ''}</div>
            {evt.participantsMin ? <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Minimum needed: {evt.participantsMin}</div> : null}
          </div>
          <div style={{ padding: 12, borderRadius: 14, background: '#f8fafc', border: '1px solid rgba(15,23,32,0.06)' }}>
            <div style={{ fontSize: 12, color: '#6b7280' }}>Applications</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#111827', marginTop: 4 }}>{pendingCount}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{waitlistedCount > 0 ? `${waitlistedCount} waitlisted` : 'No waitlist yet'}</div>
          </div>
          <div style={{ padding: 12, borderRadius: 14, background: '#f8fafc', border: '1px solid rgba(15,23,32,0.06)' }}>
            <div style={{ fontSize: 12, color: '#6b7280' }}>Equipment</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginTop: 4 }}>{evt.equipment || 'Not specified'}</div>
          </div>
          <div style={{ padding: 12, borderRadius: 14, background: '#f8fafc', border: '1px solid rgba(15,23,32,0.06)' }}>
            <div style={{ fontSize: 12, color: '#6b7280' }}>Suggested experience</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginTop: 4 }}>{evt.suggestedExperience || 'All levels welcome'}</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Organiser details</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'stretch', flexWrap: 'nowrap' }}>
            <button
              type="button"
              onClick={() => evt.host && openProfile(evt.host)}
              disabled={!evt.host}
              style={{
                flex: '1 1 260px',
                minWidth: 0,
                borderRadius: 16,
                border: '1px solid rgba(15,23,32,0.08)',
                background: '#ffffff',
                padding: 14,
                display: 'flex',
                gap: 12,
                alignItems: 'center',
                textAlign: 'left',
                cursor: evt.host ? 'pointer' : 'default',
                boxShadow: '0 10px 24px rgba(15,23,32,0.05)',
              }}
            >
              {evt.host ? renderAvatar(evt.host, host || hostUsername) : <div style={{ width: 44, height: 44, borderRadius: 999, background: '#e5e7eb' }} />}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {hostUsername
                    ? (hostPreferredName && hostPreferredName !== hostUsername ? `${hostUsername} (${hostPreferredName})` : hostUsername)
                    : (host || 'Unknown organiser')}
                </div>
                <div style={{ fontSize: 12, color: 'var(--secondary)', marginTop: 6, fontWeight: 700 }}>{evt.host ? 'View organiser profile' : 'Organiser profile unavailable'}</div>
              </div>
            </button>
            {userId && evt.host && !isHost && (
              <button
                type="button"
                className="btn ghost"
                style={{ flex: 'none', alignSelf: 'stretch', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 10px', minWidth: 0, aspectRatio: '1 / 1', lineHeight: 1 }}
                onClick={() => openMessages({ type: 'direct', otherUserId: evt.host })}
                aria-label="Message host"
                title="Message host"
              >
                <MessageIcon size={16} />
              </button>
            )}
          </div>
        </div>
        {renderMissing()}
      </div>
    )
  }

  if (!open) return null

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
              {evt ? (evt.title || evt.activity || 'Session') : 'Session'}
            </h3>
          </div>
          {/* Action buttons top right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Share button */}
            {evt && (
              <button className="btn ghost" style={{ padding: '4px 12px', fontSize: 13 }} onClick={() => alert('Share (prototype)')}>Share</button>
            )}
            {primaryAction && (
              <button className={primaryAction.className} style={{ padding: '4px 12px', fontSize: 13 }} onClick={primaryAction.onClick}>{primaryAction.label}</button>
            )}
            <button type="button" className="modal-close" onClick={onClose} aria-label="Close"><XIcon size={16} /></button>
          </div>
        </div>
        <div className="modal-body">
          {!evt ? (
            <div>Loading…</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 14, borderRadius: 18, background: 'linear-gradient(135deg, rgba(var(--accent-rgb),0.07), rgba(var(--secondary-rgb),0.06))', border: '1px solid rgba(15,23,32,0.06)' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <EventAvatar event={evt} size={72} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>{evt.date} · {evt.startTime}{evt.duration ? ` · ${Math.floor(evt.duration / 60)}h ${evt.duration % 60}m` : ''}</div>
                    <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{evt.location || 'Location not specified'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-start', alignItems: 'center', width: '100%' }}>
                  <span className="chip" style={{ fontSize: 12, padding: '2px 8px', minHeight: 20 }}>{evt.activity || 'Session'}</span>
                  <span className="chip" style={{ fontSize: 12, background: '#f1f5f9', color: '#0f172a', fontWeight: 700 }}>
                    {evt.cost ? evt.cost : 'Free'}
                  </span>
                  {(evt.vibes || []).map((v: string) => (
                    <span key={v} className="chip" style={{ fontSize: 12 }}>{v}</span>
                  ))}
                </div>
              </div>

              {myApplication && myApplication.status === 'pending' && (
                <div style={{ padding: '8px 12px', background: '#fef3c7', color: '#b45309', borderRadius: 8, fontSize: 14 }}>
                  Your application is pending.
                </div>
              )}
              {myApplication && myApplication.status === 'waitlisted' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ padding: '8px 12px', background: '#e0e7ff', color: '#4338ca', borderRadius: 8, fontSize: 14 }}>
                    <div style={{ fontWeight: 600 }}>You are waitlisted</div>
                    {myApplication.waitlistReason === 'capacity' && <div style={{ fontSize: 13, marginTop: 4 }}>The session reached capacity, but you're on the waitlist if a spot opens up.</div>}
                  </div>
                  {myApplication.feedback && (
                    <div style={{ padding: '8px 12px', background: '#f3e8ff', color: '#6b21a8', borderRadius: 8, fontSize: 13 }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>Organizer note:</div>
                      {myApplication.feedback}
                    </div>
                  )}
                </div>
              )}
              {myApplication && myApplication.status === 'denied' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ padding: '8px 12px', background: '#fee2e2', color: '#991b1b', borderRadius: 8, fontSize: 14, fontWeight: 600 }}>
                    Your application was not approved
                  </div>
                  {myApplication.feedback && (
                    <div style={{ padding: '8px 12px', background: '#fef2f2', color: '#7f1d1d', borderRadius: 8, fontSize: 13 }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>Feedback from organizer:</div>
                      {myApplication.feedback}
                    </div>
                  )}
                </div>
              )}

              {timeState === 'postevent' && amRegistered && shouldPromptParticipantReview && (
                <div style={{ padding: '10px 12px', background: '#fff7ed', color: '#9a3412', borderRadius: 10, fontSize: 14 }}>
                  You can review this session for up to one week after it ends.
                </div>
              )}

              {timeState === 'postevent' && amRegistered && participantReviewRecord?.submittedAt && (
                <div style={{ padding: '8px 12px', background: '#ecfdf5', color: '#065f46', borderRadius: 10, fontSize: 14 }}>
                  Thanks — your session review has been saved.
                </div>
              )}

              {timeState === 'postevent' && isHost && shouldPromptHostWrapUp && (
                <div style={{ padding: '10px 12px', background: '#eef2ff', color: '#3730a3', borderRadius: 10, fontSize: 14 }}>
                  Wrap up this session by reviewing attendance and participant skill suggestions.
                </div>
              )}

              {timeState === 'postevent' && !isHost && pendingSkillSuggestion && (
                <div style={{ padding: '10px 12px', background: '#eff6ff', color: '#1d4ed8', borderRadius: 10, fontSize: 14 }}>
                  <div>
                    Your organiser suggested updating your <strong>{pendingSkillSuggestion.activity}</strong> skill level to <strong>{pendingSkillSuggestion.suggestedSkillLevel}</strong>.
                    {pendingSkillSuggestion.feedback ? ` ${pendingSkillSuggestion.feedback}` : ''}
                  </div>
                </div>
              )}

              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 14 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                  {availableTabs.map(tab => {
                    const label = tab === 'description'
                      ? 'Description'
                      : tab === 'map'
                        ? 'Map'
                        : tab === 'participants'
                          ? 'Participants'
                          : tab === 'stats'
                            ? 'Stats'
                            : 'Applications'
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginTop: 18, paddingTop: 16, borderTop: '1px solid rgba(15,23,32,0.08)', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {myApplication && (myApplication.status === 'pending' || myApplication.status === 'waitlisted') && (
                      <button className="btn danger" style={footerButtonStyle} onClick={() => alert('Cancel application (prototype)')}>Cancel application</button>
                    )}
                    {timeState !== 'postevent' && amRegistered && (
                      <button className="btn danger" style={footerButtonStyle} onClick={() => {
                        if (!userId) return
                        const res = removeParticipant(evt.id, userId)
                        if (res) {
                          setEvt(res)
                          alert('You have withdrawn')
                        } else {
                          alert('Failed')
                        }
                      }}>Unable to make it</button>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
                    {timeState !== 'postevent' && amRegistered && (
                      <>
                        <button className="btn ghost" style={footerButtonStyle} onClick={addToCalendar}>Add to calendar</button>
                        {timeState === 'preevent' && <button className="btn ghost" style={footerButtonStyle} onClick={() => alert('Running late (prototype)')}>Running late</button>}
                        {timeState === 'preevent' && <button className="btn ghost" style={footerButtonStyle} onClick={() => alert('On my way (prototype)')}>On my way</button>}
                      </>
                    )}

                  {timeState === 'postevent' && amRegistered && shouldPromptParticipantReview && <button className="btn ghost" style={footerButtonStyle} type="button" onClick={() => setShowReviewModal(true)}>Leave review</button>}
                  {timeState === 'postevent' && !isHost && pendingSkillSuggestion && <button className="btn ghost" style={footerButtonStyle} type="button" onClick={() => { applySkillSuggestion(pendingSkillSuggestion.id, userId!); setReviewVersion(current => current + 1) }}>Apply suggestion</button>}
                  {timeState === 'postevent' && !isHost && pendingSkillSuggestion && <button className="btn ghost" style={footerButtonStyle} type="button" onClick={() => { deferSkillSuggestion(pendingSkillSuggestion.id, userId!); setReviewVersion(current => current + 1) }}>Later</button>}

                  {isHost && (
                    <>
                      {timeState === 'postevent' && participants.length > 0 && <button className="btn ghost" style={footerButtonStyle} type="button" onClick={() => setShowWrapUpModal(true)}>{shouldPromptHostWrapUp ? 'Session wrap up' : 'Edit wrap up'}</button>}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          )}
        </div>
      </div>
      {showApply && evt && userId && <ApplyModal open={showApply} eventId={evt.id} userId={userId} activityDetails={evt.activity || 'Activity'} onClose={() => setShowApply(false)} />}
      {showReviewModal && evt && userId && <ParticipantReviewModal open={showReviewModal} event={evt} userId={userId} onClose={() => { setShowReviewModal(false); setReviewVersion(current => current + 1) }} onOpenIncident={() => { setShowReviewModal(false); setShowIncidentModal(true) }} />}
      {showWrapUpModal && evt && userId && <HostWrapUpModal open={showWrapUpModal} event={evt} hostId={userId} onClose={() => { setShowWrapUpModal(false); setReviewVersion(current => current + 1) }} />}
      {showIncidentModal && evt && userId && <IncidentFormModal open={showIncidentModal} eventId={evt.id} userId={userId} reporterRole={isHost ? 'host' : 'participant'} onClose={() => setShowIncidentModal(false)} />}
      {showFeedbackModal && feedbackApplicant && <ApplicationFeedbackModal open={showFeedbackModal} applicantName={feedbackApplicant.name} decision={feedbackApplicant.decision} onClose={() => { setShowFeedbackModal(false); setFeedbackApplicant(null) }} onSubmit={handleFeedbackSubmit} isValidating={isFeedbackValidating} />}
    </div>
  )
}
