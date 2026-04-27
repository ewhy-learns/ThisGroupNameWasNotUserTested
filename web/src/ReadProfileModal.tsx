import React from 'react'
import { getProfile } from './AuthService'

type Props = {
  open: boolean
  onClose: () => void
  userId: string
}

type ReadProps = Props & {
  onEditInterests?: () => void
}

export default function ReadProfileModal({ open, onClose, userId, onEditInterests }: ReadProps) {
  if (!open) return null
  const profile = getProfile(userId)
  if (!profile) {
    return (
      <div className="modal-overlay" role="dialog" aria-modal="true">
        <div className="modal">
          <div className="modal-header">
            <h3>Profile</h3>
            <button type="button" className="modal-close" onClick={onClose}>✕</button>
          </div>
          <div className="modal-body">
            <div>No profile data found.</div>
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
          <div style={{ marginBottom: 8 }}><strong>About</strong></div>
          <div style={{ marginBottom: 12 }}>{profile.about || <em>Not provided</em>}</div>

          <div style={{ marginTop: 12 }}><strong>Gender</strong></div>
          <div style={{ marginBottom: 12 }}>{profile.gender || 'Prefer not to say'}</div>

          <div style={{ marginBottom: 8 }}><strong>Interests & Sports</strong></div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {profile.tags && profile.tags.length ? profile.tags.map(t => (
              <div key={t} className="chip">{t}</div>
            )) : <em>No tags selected</em>}
          </div>


          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <button type="button" className="btn" onClick={onClose}>Close</button>
            <button type="button" className="btn ghost" onClick={() => { onEditInterests && onEditInterests() }}>Edit interests</button>
          </div>
        </div>
      </div>
    </div>
  )
}

