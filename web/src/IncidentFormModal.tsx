import React from 'react'
import { saveIncidentReport } from './AuthService'
import { XIcon } from './Icons'

type Props = {
  open: boolean
  eventId: string
  userId: string
  reporterRole: 'participant' | 'host'
  onClose: () => void
}

export default function IncidentFormModal({ open, eventId, userId, reporterRole, onClose }: Props) {
  const [category, setCategory] = React.useState('General concern')
  const [details, setDetails] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setCategory('General concern')
    setDetails('')
  }, [open])

  if (!open) return null

  const handleSubmit = () => {
    if (!details.trim()) {
      alert('Please add some details before submitting the incident form.')
      return
    }
    const saved = saveIncidentReport({ eventId, userId, reporterRole, category, details })
    if (!saved) {
      alert('Unable to save this incident report right now.')
      return
    }
    onClose()
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>Incident form</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close"><XIcon size={16} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 13, color: '#6b7280' }}>This prototype stores incident reports locally only. In production this should be submitted to a secure service.</div>
          <div>
            <label className="input-label">Incident category</label>
            <select className="input" value={category} onChange={e => setCategory(e.target.value)}>
              <option>General concern</option>
              <option>Safety</option>
              <option>Behaviour</option>
              <option>Injury</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="input-label">Details</label>
            <textarea className="input" rows={5} value={details} onChange={e => setDetails(e.target.value)} placeholder="Describe what happened and any follow up needed." />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
            <button type="button" className="btn" onClick={handleSubmit}>Submit incident</button>
          </div>
        </div>
      </div>
    </div>
  )
}

