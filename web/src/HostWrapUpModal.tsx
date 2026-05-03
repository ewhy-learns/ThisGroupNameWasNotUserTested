import React from 'react'
import Switch from './Switch'
import { getParticipantReviewRecord, getProfile, saveHostWrapUp, SkillLevel } from './AuthService'
import { XIcon } from './Icons'

type Props = {
  open: boolean
  event: any
  hostId: string
  onClose: () => void
}

type WrapEntry = {
  userId: string
  label: string
  didAttend: boolean
  currentSkillLevel?: SkillLevel
  suggestedSkillLevel?: SkillLevel
  feedback: string
}

const LEVELS: SkillLevel[] = ['No experience', 'Beginner', 'Intermediate', 'Advanced']

function shiftSkillLevel(current?: SkillLevel, delta: -1 | 1): SkillLevel {
  const currentIndex = Math.max(0, LEVELS.indexOf(current || 'No experience'))
  const nextIndex = Math.min(LEVELS.length - 1, Math.max(0, currentIndex + delta))
  return LEVELS[nextIndex]
}

function getInitials(label: string) {
  const cleaned = String(label || '').trim()
  if (!cleaned) return '?'
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

export default function HostWrapUpModal({ open, event, hostId, onClose }: Props) {
  const [entries, setEntries] = React.useState<WrapEntry[]>([])

  React.useEffect(() => {
    if (!open || !event) return
    const nextEntries = (Array.isArray(event.participants) ? event.participants : []).map((participantId: string) => {
      const profile = getProfile(participantId)
      const reviewRecord = getParticipantReviewRecord(event.id, participantId)
      const label = profile?.username ? (profile.preferredName && profile.preferredName !== profile.username ? `${profile.username} (${profile.preferredName})` : profile.username) : participantId
      const currentSkillLevel = profile?.skillChecks?.[event.activity] || undefined
      return {
        userId: participantId,
        label,
        didAttend: !!reviewRecord?.checkedIn,
        currentSkillLevel,
        suggestedSkillLevel: currentSkillLevel,
        feedback: '',
      }
    })
    setEntries(nextEntries)
  }, [open, event])

  if (!open || !event) return null

  const updateEntry = (userId: string, patch: Partial<WrapEntry>) => {
    setEntries(current => current.map(entry => entry.userId === userId ? { ...entry, ...patch } : entry))
  }

  const handleSubmit = () => {
    const saved = saveHostWrapUp({
      eventId: event.id,
      hostId,
      activity: event.activity,
      participants: entries.map(entry => ({
        userId: entry.userId,
        didAttend: entry.didAttend,
        currentSkillLevel: entry.currentSkillLevel,
        suggestedSkillLevel: entry.suggestedSkillLevel,
        feedback: entry.feedback,
      })),
    })
    if (!saved) {
      alert('Unable to save the wrap up right now.')
      return
    }
    onClose()
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>Session wrap up</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close"><XIcon size={16} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 13, color: '#6b7280' }}>Review who attended, update attendance, and leave skill suggestions for this session&apos;s participants.</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '55vh', overflowY: 'auto', paddingRight: 4 }}>
            {entries.length > 0 ? entries.map(entry => (
              <div key={entry.userId} style={{ border: '1px solid rgba(15,23,32,0.06)', borderRadius: 14, padding: 12, background: '#f9fafb', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 42, height: 42, borderRadius: 999, background: 'linear-gradient(135deg, #fb923c, #2563eb)', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, flex: '0 0 auto' }}>
                  {getInitials(entry.label)}
                </div>
                <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{entry.label}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Current skill: {entry.currentSkillLevel || 'Not assessed'}</div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 13 }}>Attended</div>
                    <Switch checked={entry.didAttend} onChange={next => updateEntry(entry.userId, { didAttend: next })} ariaLabel={`Did ${entry.label} attend`} />
                    <div style={{ fontSize: 12, color: '#6b7280' }}>Defaults to no unless the participant checked in with you.</div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button type="button" className="btn ghost" onClick={() => updateEntry(entry.userId, { suggestedSkillLevel: shiftSkillLevel(entry.suggestedSkillLevel, -1) })}>Decrease</button>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>Suggested: {entry.suggestedSkillLevel || 'Not assessed'}</div>
                    <button type="button" className="btn ghost" onClick={() => updateEntry(entry.userId, { suggestedSkillLevel: shiftSkillLevel(entry.suggestedSkillLevel, 1) })}>Increase</button>
                  </div>

                  <textarea className="input" rows={3} value={entry.feedback} onChange={e => updateEntry(entry.userId, { feedback: e.target.value })} placeholder="Leave feedback for this participant" />
                </div>
              </div>
            )) : <div style={{ color: '#9ca3af' }}>No approved participants to wrap up for this session.</div>}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" className="btn ghost" onClick={onClose}>Close</button>
            <button type="button" className="btn" onClick={handleSubmit}>Save wrap up</button>
          </div>
        </div>
      </div>
    </div>
  )
}

