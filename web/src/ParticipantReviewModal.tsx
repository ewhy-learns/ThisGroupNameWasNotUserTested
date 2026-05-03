import React from 'react'
import { addProfileTagsAndVibes, deferParticipantReview, getEventEndTimestamp, getParticipantReviewRecord, getProfile, saveParticipantReview, setParticipantCheckIn } from './AuthService'
import Switch from './Switch'
import { XIcon, CheckIcon } from './Icons'

type Props = {
  open: boolean
  event: any
  userId: string
  onClose: () => void
  onOpenIncident?: () => void
}

function formatDeadline(ts: number | null) {
  if (!ts) return 'within one week'
  try {
    return new Date(ts + 7 * 24 * 60 * 60 * 1000).toLocaleDateString([], { day: 'numeric', month: 'short' })
  } catch {
    return 'within one week'
  }
}

export default function ParticipantReviewModal({ open, event, userId, onClose, onOpenIncident }: Props) {
  const [rating, setRating] = React.useState(0)
  const [feedback, setFeedback] = React.useState('')
  const [checkedIn, setCheckedInState] = React.useState(false)
  const [anonymousRating, setAnonymousRating] = React.useState(true)
  const [suggestedProfileTags, setSuggestedProfileTags] = React.useState<string[]>([])
  const [suggestedProfileVibes, setSuggestedProfileVibes] = React.useState<string[]>([])
  const [selectedProfileTags, setSelectedProfileTags] = React.useState<string[]>([])
  const [selectedProfileVibes, setSelectedProfileVibes] = React.useState<string[]>([])

  React.useEffect(() => {
    if (!open || !event || !userId) return
    const existing = getParticipantReviewRecord(event.id, userId)
    const profile = getProfile(userId)
    const existingTags = new Set((profile?.tags || []).map(value => String(value).trim().toLowerCase()))
    const existingVibes = new Set((profile?.vibes || []).map(value => String(value).trim().toLowerCase()))
    const missingActivity = event.activity && !existingTags.has(String(event.activity).trim().toLowerCase()) ? [String(event.activity).trim()] : []
    const missingVibes = (Array.isArray(event.vibes) ? event.vibes : [])
      .map((value: any) => String(value).trim())
      .filter(Boolean)
      .filter((value: string) => !existingVibes.has(value.toLowerCase()))
    setRating(Number(existing?.hostRating || 0))
    setFeedback(existing?.feedback || '')
    setCheckedInState(!!existing?.checkedIn)
    setAnonymousRating(existing?.anonymousHostRating ?? true)
    setSuggestedProfileTags(missingActivity)
    setSuggestedProfileVibes(missingVibes)
    setSelectedProfileTags(missingActivity)
    setSelectedProfileVibes(missingVibes)
  }, [open, event, userId])

  if (!open || !event) return null

  const tags = [event.activity, ...(Array.isArray(event.vibes) ? event.vibes : [])].filter(Boolean)
  const hasProfileSuggestions = suggestedProfileTags.length > 0 || suggestedProfileVibes.length > 0
  const deadlineLabel = formatDeadline(getEventEndTimestamp(event))

  const handleCheckedInChange = (next: boolean) => {
    setCheckedInState(next)
    if (userId && event?.id) setParticipantCheckIn(event.id, userId, next)
  }

  const handleSubmit = () => {
    if (!rating) {
      alert('Please choose a star rating for the host before submitting your review.')
      return
    }
    const saved = saveParticipantReview({
      eventId: event.id,
      userId,
      hostId: event.host,
      hostRating: rating,
      anonymousHostRating: anonymousRating,
      feedback,
      checkedIn,
    })
    if (!saved) {
      alert('Unable to save your review right now.')
      return
    }
    if (selectedProfileTags.length > 0 || selectedProfileVibes.length > 0) {
      addProfileTagsAndVibes(userId, { tags: selectedProfileTags, vibes: selectedProfileVibes })
    }
    onClose()
  }

  const handleReviewLater = () => {
    deferParticipantReview(event.id, userId)
    onClose()
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>Review session</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close"><XIcon size={16} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ fontWeight: 700 }}>{event.title || event.activity || 'Session'}</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>You can review this session until {deadlineLabel}.</div>
          </div>

          {tags.length > 0 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Session tags</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {tags.map((tag: string) => <span key={tag} className="chip">{tag}</span>)}
              </div>
            </div>
          )}

          {hasProfileSuggestions && (
            <div style={{ padding: 12, borderRadius: 12, background: '#f8fafc', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Add this session to your profile?</div>
                <div style={{ marginTop: 6, fontSize: 13, color: '#6b7280' }}>These are not currently in your profile. They are pre-selected so you can save them as part of this review.</div>
              </div>
              {suggestedProfileTags.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Activity</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {suggestedProfileTags.map(tag => (
                      <button key={tag} type="button" className={`btn-pill ${selectedProfileTags.includes(tag) ? 'btn' : 'btn ghost'}`} onClick={() => setSelectedProfileTags(current => current.includes(tag) ? current.filter(value => value !== tag) : [...current, tag])}>
                        {tag}{selectedProfileTags.includes(tag) ? <> <CheckIcon size={12} style={{ verticalAlign: 'middle' }} /></> : ''}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {suggestedProfileVibes.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Vibes</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {suggestedProfileVibes.map(vibe => (
                      <button key={vibe} type="button" className={`btn-pill ${selectedProfileVibes.includes(vibe) ? 'btn' : 'btn ghost'}`} onClick={() => setSelectedProfileVibes(current => current.includes(vibe) ? current.filter(value => value !== vibe) : [...current, vibe])}>
                        {vibe}{selectedProfileVibes.includes(vibe) ? <> <CheckIcon size={12} style={{ verticalAlign: 'middle' }} /></> : ''}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" className="btn ghost" onClick={() => { setSelectedProfileTags(suggestedProfileTags); setSelectedProfileVibes(suggestedProfileVibes) }}>Select all</button>
                <button type="button" className="btn ghost" onClick={() => { setSelectedProfileTags([]); setSelectedProfileVibes([]) }}>Skip all</button>
                <div style={{ fontSize: 12, color: '#6b7280', alignSelf: 'center' }}>Tap any selected chip to remove it before you submit.</div>
              </div>
            </div>
          )}

          <div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Rate the host</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[1, 2, 3, 4, 5].map(value => (
                <button
                  key={value}
                  type="button"
                  className={rating >= value ? 'btn' : 'btn ghost'}
                  style={{ flex: '0 0 auto', minWidth: 52 }}
                  onClick={() => setRating(value)}
                >
                  {value}★
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
              <Switch checked={anonymousRating} onChange={setAnonymousRating} ariaLabel="Submit host rating anonymously" />
              <div style={{ fontSize: 13, color: '#4b5563' }}>Submit host rating anonymously</div>
            </div>
          </div>

          <div>
            <label className="input-label">Feedback for the host</label>
            <textarea className="input" rows={4} value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="What went well? What could be improved?" />
          </div>

          <div style={{ padding: 12, borderRadius: 12, background: '#f8fafc', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Check-in status</div>
            <div style={{ marginTop: 6, fontSize: 13, color: '#6b7280' }}>Update whether you checked in with the organiser for this session.</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, fontSize: 14 }}>
              <Switch checked={checkedIn} onChange={handleCheckedInChange} ariaLabel="I checked in with the organiser" />
              <div>I checked in with the organiser</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
            <button type="button" className="btn ghost" onClick={handleReviewLater}>Review later</button>
            <button type="button" className="btn ghost" onClick={() => onOpenIncident ? onOpenIncident() : alert('Incident form (prototype)')}>Incident form</button>
            <div style={{ flex: 1 }} />
            <button type="button" className="btn" onClick={handleSubmit}>Submit review</button>
          </div>
        </div>
      </div>
    </div>
  )
}

