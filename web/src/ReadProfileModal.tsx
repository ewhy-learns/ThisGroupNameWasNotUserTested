import React from 'react'
import { getProfile, getLoggedInUser } from './AuthService'

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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ marginBottom: 8 }}><strong>About</strong></div>
            <button aria-label="Edit about" title="Edit about" className="link-button" onClick={() => { onEditAbout && onEditAbout(); setTimeout(() => onClose(), 0) }}>✎</button>
          </div>
          <div style={{ marginBottom: 12 }}>{profile.about || <em>Not provided</em>}</div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
            <div><strong>Gender</strong></div>
            <button aria-label="Edit gender" title="Edit gender" className="link-button" onClick={() => { onEditGender && onEditGender(); setTimeout(() => onClose(), 0) }}>✎</button>
          </div>
          <div style={{ marginBottom: 12 }}>{profile.gender || 'Prefer not to say'}</div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ marginBottom: 8 }}><strong>Interests & Sports</strong></div>
            <button aria-label="Edit interests" title="Edit interests" className="link-button" onClick={() => { onEditInterests && onEditInterests(); setTimeout(() => onClose(), 0) }}>✎</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {profile.tags && profile.tags.length ? profile.tags.map(t => (
              <div key={t} className="chip">{t}</div>
            )) : <em>No tags selected</em>}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
            <div style={{ marginBottom: 8 }}><strong>Vibes</strong></div>
            {/* show edit pencil only to profile owner */}
            {getLoggedInUser() === userId && (
              <button aria-label="Edit vibes" title="Edit vibes" className="link-button" onClick={() => { onEditVibes && onEditVibes(); setTimeout(() => onClose(), 0) }}>✎</button>
            )}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {profile.vibes && profile.vibes.length ? [...profile.vibes].sort((a,b) => a.localeCompare(b)).map(v => (
              <div key={v} className="chip">{v}</div>
            )) : <em>No vibes selected</em>}
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
