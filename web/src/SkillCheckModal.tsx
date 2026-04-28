import React from 'react'
import { getProfile, saveProfile } from './AuthService'

type Props = {
  open: boolean
  onClose: () => void
  userId: string
}

const LEVELS: Array<'Beginner'|'Intermediate'|'Advanced'> = ['Beginner','Intermediate','Advanced']

export default function SkillCheckModal({ open, onClose, userId }: Props) {
  const [valuesLevel, setValuesLevel] = React.useState<Record<string,string>>({})
  React.useEffect(() => {
    if (!open) return
    const profile = getProfile(userId)
    const initialLevel: Record<string,string> = {}
    if (profile && profile.tags) {
      (profile.tags || []).forEach(t => {
        const raw = profile.skillChecks && (profile.skillChecks as any)[t]
        if (!raw) {
          // leave undefined -> no radio selected (Not assessed)
        } else {
          initialLevel[t] = raw
        }
      })
    }
    setValuesLevel(initialLevel)
  }, [open, userId])

  if (!open) return null

  const profile = getProfile(userId)
  const tags = ((profile && profile.tags) || []).slice().sort((a,b) => a.localeCompare(b))

  const setLevel = (tag: string, level: string) => {
    setValuesLevel(prev => ({ ...prev, [tag]: level }))
  }
  // no per-tag public flag; overall visibility removed per request

  const handleSave = () => {
    try {
      const prof = getProfile(userId) || { id: userId, tags: [], completedAt: Date.now() }
      prof.skillChecks = { ...(prof.skillChecks || {}) } as any
      for (const t of tags) {
        if (valuesLevel[t]) prof.skillChecks[t] = valuesLevel[t] as any
        else delete prof.skillChecks[t]
      }
      prof.completedAt = Date.now()
      saveProfile(prof)
    } catch (e) {
      console.warn('[SkillCheckModal] save failed', e)
    }
    onClose()
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal" style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <h3>Skill check</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">
          <p style={{ marginTop: 0 }}>
            The skill checks allow other participants to gauge the general ability of the group. Each activity type can be either:
            <br /><strong>Beginner</strong> - Really new to the activity. Generally less than a year of experience
            <br /><strong>Intermediate</strong> - Know what you're doing but still developing your skills.
            <br /><strong>Advanced</strong> - Able to perform to a high ability. Likely in first grade or representative history in the activity
          </p>

          {tags.length === 0 ? (
            <div>No activity tags selected. Add some from your profile first.</div>
          ) : (
            <div style={{ maxHeight: 360, overflow: 'auto', paddingRight: 8 }}>
              {/* Table header */}
              <div style={{ position: 'sticky', top: 0, background: 'white', zIndex: 2, display: 'grid', gridTemplateColumns: '1fr repeat(3, 1fr)', gap: 12, padding: '8px 0', borderBottom: '2px solid #e6e9ee', fontWeight: 700 }}>
                <div>Activity</div>
                <div style={{ textAlign: 'center' }}>Beginner</div>
                <div style={{ textAlign: 'center' }}>Intermediate</div>
                <div style={{ textAlign: 'center' }}>Advanced</div>
              </div>
              {tags.map(tag => (
                <div key={tag} style={{ display: 'grid', gridTemplateColumns: '1fr repeat(3, 1fr)', gap: 12, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ fontWeight: 600 }}>{tag}</div>
                  {LEVELS.map(l => (
                    <div key={l} style={{ textAlign: 'center' }}>
                      <input type="radio" name={tag} value={l} checked={valuesLevel[tag] === l} onChange={() => setLevel(tag, l)} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button type="button" className="btn" onClick={handleSave}>Save</button>
            <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  )
}

