import React from 'react'
import { XIcon } from './Icons'

type Props = {
  open: boolean
  applicantName: string
  decision: 'approve' | 'reject'
  onClose: () => void
  onSubmit: (feedback: string) => void
  isValidating?: boolean
}

export default function ApplicationFeedbackModal({
  open,
  applicantName,
  decision,
  onClose,
  onSubmit,
  isValidating
}: Props) {
  const [feedback, setFeedback] = React.useState('')

  React.useEffect(() => {
    if (open) {
      setFeedback('')
    }
  }, [open])

  const handleSubmit = () => {
    onSubmit(feedback)
  }

  if (!open) return null

  const isApproval = decision === 'approve'
  const title = isApproval
    ? 'Approve Application - Optional Feedback'
    : 'Reject Application - Feedback'
  const placeholder = isApproval
    ? 'Optional: Add any notes for the applicant (e.g., next steps, skill development suggestions)'
    : 'Provide feedback to the applicant about why their application was not approved'
  const submitLabel = isApproval ? 'Approve' : 'Reject'

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header">
          <h3>{title}</h3>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
            disabled={isValidating}
          >
            <XIcon size={16} />
          </button>
        </div>
        <div className="modal-body">
          <div style={{ marginBottom: 16 }}>
            <p style={{ margin: '0 0 12px 0', fontSize: 14, color: '#6b7280' }}>
              Applicant: <strong>{applicantName}</strong>
            </p>
            {isApproval && (
              <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
                Session is at capacity, so this applicant {decision === 'approve' ? 'will be' : 'is being'} added to the waitlist.
              </p>
            )}
          </div>

          <textarea
            className="input"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder={placeholder}
            style={{ minHeight: 120, resize: 'vertical' }}
            disabled={isValidating}
          />
          <p style={{ margin: '8px 0 0 0', fontSize: 12, color: '#9ca3af' }}>
            {isApproval ? 'Optional' : 'The applicant will see this feedback'} ({feedback.length} characters)
          </p>
        </div>
        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(15,23,32,0.08)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            className="btn ghost"
            type="button"
            onClick={onClose}
            disabled={isValidating}
          >
            Cancel
          </button>
          <button
            className="btn"
            type="button"
            onClick={handleSubmit}
            disabled={isValidating}
          >
            {isValidating ? 'Submitting...' : submitLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

