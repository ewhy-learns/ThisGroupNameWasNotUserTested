import React from 'react'
import { addProfileTagsAndVibes, canViewProfileSection, getProfile, getLoggedInUser, getProfileSectionVisibility, getPublicIdentityLabel, getPreferredName, getSuggestedProfileInfo, listHostedSessionsForProfile, listParticipantSessionsForProfile, listProfileReviews, ProfileAccessContext } from './AuthService'
import { XIcon } from './Icons'

type Props = {
  open: boolean
  onClose: () => void
  userId: string
  accessContext?: ProfileAccessContext | null
}

type ReadProps = Props & {
  onEditFullProfile?: () => void
}

type ProfileTab = 'profile' | 'host' | 'participant' | 'reviews'
type ViewAsMode = 'self' | 'public' | 'host' | 'friends' | 'participants'

function formatSessionDate(evt: any) {
  if (!evt) return 'Date not set'
  return `${evt.date || 'No date'}${evt.startTime ? ` · ${evt.startTime}` : ''}`
}

function getSessionTimestamp(evt: any) {
  try {
    if (evt?.date) {
      const dt = new Date(`${evt.date}T${evt.startTime || '00:00'}`)
      if (!Number.isNaN(dt.getTime())) return dt.getTime()
    }
  } catch {}
  return Number(evt?.createdAt || 0)
}

function ActionIconButton({ label, onClick, variant = 'solid', icon }: { label: string; onClick: () => void; variant?: 'solid' | 'ghost'; icon: React.ReactNode }) {
  return (
    <button
      className={variant === 'solid' ? 'btn' : 'btn ghost'}
      type="button"
      onClick={onClick}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

export default function ReadProfileModal({ open, onClose, userId, accessContext, onEditFullProfile }: ReadProps) {
  const [profileVersion, setProfileVersion] = React.useState(0)
  const [activeTab, setActiveTab] = React.useState<ProfileTab>('profile')
  const [viewAs, setViewAs] = React.useState<ViewAsMode>('self')
  const [expandedReviewIds, setExpandedReviewIds] = React.useState<Set<string>>(new Set())
  const viewer = getLoggedInUser()
  const profile = React.useMemo(() => getProfile(userId), [userId, profileVersion])
  const suggestedProfileInfo = React.useMemo(() => viewer === userId ? getSuggestedProfileInfo(userId) : { tags: [], vibes: [] }, [viewer, userId, profileVersion])

  React.useEffect(() => {
    if (!open) return
    setActiveTab('profile')
    setViewAs('self')
    setExpandedReviewIds(new Set())
  }, [open, userId])

  React.useEffect(() => {
    if (!open) return
    const refresh = () => setProfileVersion(current => current + 1)
    window.addEventListener('demo1_profile_updated', refresh)
    window.addEventListener('demo1_events_updated', refresh)
    window.addEventListener('demo1_reviews_updated', refresh)
    return () => {
      window.removeEventListener('demo1_profile_updated', refresh)
      window.removeEventListener('demo1_events_updated', refresh)
      window.removeEventListener('demo1_reviews_updated', refresh)
    }
  }, [open])

  if (!open) return null

  if (!profile) {
    return (
      <div className="modal-overlay" role="dialog" aria-modal="true">
        <div className="modal">
          <div className="modal-header">
            <h3>View profile</h3>
            <button type="button" className="modal-close" onClick={onClose}>✕</button>
          </div>
          <div className="modal-body">
            <div style={{ marginBottom: 12 }}>No profile data found.</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" onClick={() => { onEditFullProfile && onEditFullProfile(); onClose() }}>Create profile</button>
              <button className="btn ghost" onClick={onClose}>Close</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const publicLabel = getPublicIdentityLabel(userId, profile || undefined)
  const preferredName = getPreferredName(userId, profile || undefined)
  const privacyLabels = { private: 'Private', hosts: 'Hosts only', public: 'Public' } as const

  const getPreviewCanView = (section: Parameters<typeof getProfileSectionVisibility>[1]) => {
    if (viewer !== userId) {
      return canViewProfileSection(userId, viewer, section, profile, accessContext || undefined)
    }
    if (viewAs === 'self') {
      return true
    }
    const visibility = getProfileSectionVisibility(profile, section)
    if (viewAs === 'public') return visibility === 'public'
    // For host/friends/participants previews, show content available to connected users.
    return visibility === 'public' || visibility === 'hosts'
  }

  const showInterests = getPreviewCanView('interests')
  const showVibes = getPreviewCanView('vibes')
  const showAbout = getPreviewCanView('about')
  const showDemographic = getPreviewCanView('demographic')
  const showContact = getPreviewCanView('contact')
  const showHostHistory = getPreviewCanView('hostHistory')
  const showParticipantHistory = getPreviewCanView('participantHistory')
  const showReviews = getPreviewCanView('reviews')
  const sessionsViewer = viewer === userId && viewAs === 'public' ? null : viewer
  // Keep hook order stable: avoid conditional hooks after early returns.
  const hostedSessions = listHostedSessionsForProfile(userId, sessionsViewer)
  const participantSessions = listParticipantSessionsForProfile(userId, sessionsViewer)
  const reviews = listProfileReviews(userId)
  const availableTabs = (['profile', ...(showHostHistory ? ['host'] : []), ...(showParticipantHistory ? ['participant'] : []), ...(showReviews ? ['reviews'] : [])] as ProfileTab[])

  const handleAddSuggestions = (input: { tags?: string[]; vibes?: string[] }) => {
    if (!viewer || viewer !== userId) return
    addProfileTagsAndVibes(userId, input)
    setProfileVersion(current => current + 1)
  }

  const renderSessionList = (items: any[], emptyLabel: string) => {
    if (items.length === 0) return <div style={{ color: '#9ca3af' }}>{emptyLabel}</div>
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map(evt => {
          const isUpcoming = getSessionTimestamp(evt) > Date.now()
          return (
            <div key={evt.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid rgba(15,23,32,0.08)', borderRadius: 12, background: 'white' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{evt.title || evt.activity || 'Session'}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{formatSessionDate(evt)}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{evt.location || 'Location not specified'}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', flex: '0 0 auto' }}>
                <span className="chip" style={{ cursor: 'default' }}>{isUpcoming ? 'Upcoming' : 'Past'}</span>
                <button className="btn ghost" type="button" style={{ flex: '0 0 auto', minWidth: 84 }} onClick={() => window.dispatchEvent(new CustomEvent('demo1_open_event', { detail: { id: evt.id } }))}>View</button>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderReviewList = () => {
    if (reviews.length === 0) return <div style={{ color: '#9ca3af' }}>No reviews have been left yet.</div>
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {reviews.map(review => {
          const isExpanded = expandedReviewIds.has(review.id)
          const toggleExpand = () => setExpandedReviewIds(prev => {
            const next = new Set(prev)
            if (next.has(review.id)) next.delete(review.id)
            else next.add(review.id)
            return next
          })
          return (
            <div key={review.id} style={{ padding: 12, borderRadius: 14, border: '1px solid rgba(15,23,32,0.08)', background: 'white', display: 'flex', flexDirection: 'column', gap: 8, cursor: review.body ? 'pointer' : 'default' }} onClick={review.body ? toggleExpand : undefined} role={review.body ? 'button' : undefined} aria-expanded={review.body ? isExpanded : undefined}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{review.reviewerLabel}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{review.eventTitle}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  {typeof review.rating === 'number' && <div style={{ color: '#f59e0b', fontWeight: 700 }}>{'★'.repeat(Math.max(0, Math.min(5, review.rating)))}{review.rating < 5 ? '☆'.repeat(5 - review.rating) : ''}</div>}
                  {review.body && <div style={{ fontSize: 11, color: '#9ca3af' }}>{isExpanded ? 'tap to collapse' : 'tap to expand'}</div>}
                </div>
              </div>
              {review.body && (
                <div style={{ position: 'relative', overflow: 'hidden' }}>
                  <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.5, maxHeight: isExpanded ? 'none' : '3em', overflow: 'hidden' }}>
                    {review.body}
                  </div>
                  {!isExpanded && (
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1.8em', background: 'linear-gradient(transparent, white)' }} />
                  )}
                </div>
              )}
              {review.suggestedSkillLevel && <div style={{ fontSize: 12, color: '#1d4ed8' }}>Suggested skill level: <strong>{review.suggestedSkillLevel}</strong></div>}
              <div style={{ fontSize: 11, color: '#9ca3af' }}>{new Date(review.createdAt).toLocaleDateString()}</div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderProfileTab = () => (
    <div style={{ display: 'grid', gap: 12 }}>
      {showAbout && <div style={{ padding: 14, borderRadius: 16, border: '1px solid rgba(15,23,32,0.08)', background: 'white' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800 }}>About me</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{viewer === userId ? `Privacy: ${privacyLabels[getProfileSectionVisibility(profile, 'about')]}.` : 'Profile overview.'}</div>
          </div>
        </div>
        <div style={{ marginTop: 10, fontSize: 13, color: '#4b5563', lineHeight: 1.55 }}>{profile.about || <em>No bio provided</em>}</div>
      </div>}

      {viewer === userId && (suggestedProfileInfo.tags.length > 0 || suggestedProfileInfo.vibes.length > 0) && (
        <div style={{ padding: 14, borderRadius: 16, border: '1px solid rgba(15,23,32,0.08)', background: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800 }}>Suggested profile information</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Based on sessions you have joined or hosted.</div>
            </div>
            <button type="button" className="btn ghost" onClick={() => handleAddSuggestions({ tags: suggestedProfileInfo.tags, vibes: suggestedProfileInfo.vibes })}>Add all</button>
          </div>
          {suggestedProfileInfo.tags.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Activities</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {suggestedProfileInfo.tags.map(tag => <button key={tag} type="button" className="btn ghost btn-pill" onClick={() => handleAddSuggestions({ tags: [tag] })}>{tag} +</button>)}
              </div>
            </div>
          )}
          {suggestedProfileInfo.vibes.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Vibes</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {suggestedProfileInfo.vibes.map(vibe => <button key={vibe} type="button" className="btn ghost btn-pill" onClick={() => handleAddSuggestions({ vibes: [vibe] })}>{vibe} +</button>)}
              </div>
            </div>
          )}
        </div>
      )}

      {showInterests && <div style={{ padding: 14, borderRadius: 16, border: '1px solid rgba(15,23,32,0.08)', background: 'white' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800 }}>Interests, sports and hobbies</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Used for recommendations and profile matching.{viewer === userId ? ` Privacy: ${privacyLabels[getProfileSectionVisibility(profile, 'interests')]}.` : ''}</div>
          </div>
        </div>
        <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {profile.tags && profile.tags.length ? profile.tags.map((tag: any) => <div key={tag} className="chip">{tag}</div>) : <div style={{ color: '#9ca3af' }}>No interests added</div>}
        </div>
      </div>}

      {showVibes && <div style={{ padding: 14, borderRadius: 16, border: '1px solid rgba(15,23,32,0.08)', background: 'white' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800 }}>Vibes</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Helps others understand the kinds of sessions you enjoy.{viewer === userId ? ` Privacy: ${privacyLabels[getProfileSectionVisibility(profile, 'vibes')]}.` : ''}</div>
          </div>
        </div>
        <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {profile.vibes && profile.vibes.length ? profile.vibes.map((v: any) => <div key={v} className="chip">{v}</div>) : <div style={{ color: '#9ca3af' }}>No vibes added</div>}
        </div>
      </div>}

      {showDemographic && <div style={{ padding: 14, borderRadius: 16, border: '1px solid rgba(15,23,32,0.08)', background: 'white' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800 }}>Optional information</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Gender and birth year.{viewer === userId ? ` Privacy: ${privacyLabels[getProfileSectionVisibility(profile, 'demographic')]}.` : ''}</div>
          </div>
        </div>
        <div style={{ marginTop: 10, display: 'grid', gap: 6, fontSize: 13, color: '#4b5563' }}>
          <div><strong>Gender:</strong> {profile.gender || 'Prefer not to say'}</div>
          <div><strong>Year of birth:</strong> {profile.yearOfBirth || 'Not set'}</div>
        </div>
      </div>}

      {showContact && <div style={{ padding: 14, borderRadius: 16, border: '1px solid rgba(15,23,32,0.08)', background: 'white' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800 }}>Identity and contact</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Preferred name, profile photo, and contact details.{viewer === userId ? ` Privacy: ${privacyLabels[getProfileSectionVisibility(profile, 'contact')]}.` : ''}</div>
          </div>
        </div>
        <div style={{ marginTop: 10, display: 'grid', gap: 6, fontSize: 13, color: '#4b5563' }}>
          <div><strong>Username:</strong> {publicLabel}</div>
          <div><strong>Preferred name:</strong> {preferredName || 'Not set'}</div>
          <div><strong>Email:</strong> {profile.email || 'Not set'}</div>
          <div><strong>Phone:</strong> {profile.phone || 'Not set'}</div>
        </div>
      </div>}

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: 14, borderRadius: 16, border: '1px solid rgba(15,23,32,0.08)', background: 'white' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Participant stats</div>
          <div style={{ marginTop: 6, fontSize: 13, color: '#6b7280' }}>Events joined: <strong>{participantSessions.length}</strong></div>
        </div>
        <div style={{ width: 1, background: '#eef2ff', alignSelf: 'stretch' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Host stats</div>
          <div style={{ marginTop: 6, fontSize: 13, color: '#6b7280' }}>Events hosted: <strong>{hostedSessions.length}</strong></div>
        </div>
      </div>
    </div>
  )

  const renderTabContent = () => {
    if (activeTab === 'host') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 13, color: '#6b7280' }}>Sessions this user has hosted or is currently running.</div>
          {renderSessionList(hostedSessions, 'No hosted sessions available.')}
        </div>
      )
    }
    if (activeTab === 'participant') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 13, color: '#6b7280' }}>Sessions this user has participated in and chosen to share on their profile.</div>
          {renderSessionList(participantSessions, 'No participant history available.')}
        </div>
      )
    }
    if (activeTab === 'reviews') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 13, color: '#6b7280' }}>Reviews and feedback left for this user.</div>
          {renderReviewList()}
        </div>
      )
    }
    return renderProfileTab()
  }

  return (
    <div className="modal-overlay modal-overlay-priority" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header">
          <h3>View profile</h3>
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 16, borderRadius: 18, background: 'linear-gradient(135deg, rgba(var(--accent-rgb),0.08), rgba(var(--secondary-rgb),0.05))', border: '1px solid rgba(15,23,32,0.06)' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {profile.photoDataUrl || profile.avatarDataUrl || profile.avatarUrl ? (
                  <img src={profile.photoDataUrl || profile.avatarDataUrl || profile.avatarUrl || ''} alt={publicLabel} style={{ width: 72, height: 72, borderRadius: 999, objectFit: 'cover', border: '2px solid white', boxShadow: '0 8px 20px rgba(15,23,32,0.08)' }} />
                ) : (
                  <div style={{ width: 72, height: 72, borderRadius: 999, background: 'linear-gradient(135deg, var(--accent), var(--secondary))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 24, border: '2px solid white', boxShadow: '0 8px 20px rgba(15,23,32,0.08)' }}>{(publicLabel || '').charAt(0).toUpperCase()}</div>
                )}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 18 }}>{publicLabel}</div>
                  {showContact && preferredName && preferredName !== publicLabel && <div style={{ fontSize: 13, color: '#4b5563', marginTop: 4 }}>Preferred name: {preferredName}</div>}
                  {showDemographic && profile.yearOfBirth && <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>Year of birth: {profile.yearOfBirth}</div>}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {viewer !== userId ? (
                  <>
                    <ActionIconButton
                      label="Add friend"
                      onClick={() => window.dispatchEvent(new CustomEvent('demo1_add_friend', { detail: { userId } }))}
                      icon={(
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="8.5" cy="7" r="4" />
                          <path d="M20 8v6" />
                          <path d="M23 11h-6" />
                        </svg>
                      )}
                    />
                    <ActionIconButton
                      label="Message"
                      variant="ghost"
                      onClick={() => window.dispatchEvent(new CustomEvent('demo1_message_user', { detail: { userId } }))}
                      icon={(
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                      )}
                    />
                  </>
                ) : (
                  <>
                    <ActionIconButton
                      label="Edit profile"
                      variant="ghost"
                      onClick={() => { setTimeout(() => onEditFullProfile && onEditFullProfile(), 0); setTimeout(() => onClose(), 0) }}
                      icon={(
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                      )}
                    />
                    <button type="button" className="btn" onClick={onClose}>Done</button>
                  </>
                )}
              </div>

              {/* View As toggle - only visible to own profile owner */}
              {viewer === userId && (
                <div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6, fontWeight: 600 }}>Preview as:</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(['self', 'public', 'host', 'friends', 'participants'] as ViewAsMode[]).map(mode => {
                      const labels: Record<ViewAsMode, string> = { self: 'Me', public: 'Public', host: 'Host', friends: 'Friends', participants: 'Participants' }
                      return (
                        <button key={mode} type="button" className={viewAs === mode ? 'btn' : 'btn ghost'} style={{ flex: '0 0 auto', padding: '5px 10px', fontSize: 12, borderRadius: 999 }} onClick={() => setViewAs(mode)}>
                          {labels[mode]}
                        </button>
                      )
                    })}
                  </div>
                  {viewAs !== 'self' && (
                    <div style={{ marginTop: 6, fontSize: 12, color: '#f59e0b', fontWeight: 600 }}>
                      👁 Previewing as {viewAs === 'public' ? 'an unauthenticated visitor' : `a ${viewAs}`}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {availableTabs.map(tab => {
                const selected = activeTab === tab
                const label = tab === 'profile' ? 'Profile' : tab === 'host' ? 'Host' : tab === 'participant' ? 'Participant' : 'Reviews'
                return (
                  <button key={tab} type="button" className={selected ? 'btn' : 'btn ghost'} style={{ flex: '0 0 auto', padding: '8px 12px', fontSize: 13, borderRadius: 999 }} onClick={() => setActiveTab(tab)}>
                    {label}
                  </button>
                )
              })}
            </div>

            {renderTabContent()}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="btn" onClick={onClose}>{viewer === userId ? 'Done' : 'Close'}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
