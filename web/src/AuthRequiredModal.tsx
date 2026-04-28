import React from 'react'

type Props = {
  open: boolean
  onClose: () => void
  onLogin: () => void
  onRegister: () => void
}

export default function AuthRequiredModal({ open, onClose, onLogin, onRegister }: Props) {
  if (!open) return null
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h3>Sign in required</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">
          <p style={{ marginTop: 0 }}>You need to be signed in to perform this action. Please log in or register to continue.</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn" onClick={() => { onLogin(); onClose() }}>Login</button>
            <button className="btn ghost" onClick={() => { onRegister(); onClose() }}>Register</button>
          </div>
        </div>
      </div>
    </div>
  )
}

