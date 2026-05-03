import React, { useState, useEffect } from 'react'
import { getProfile, saveProfileSkill, applyToEvent, saveProfile, SkillLevel } from './AuthService'
import Switch from './Switch'

type Props = {
  open: boolean
  eventId: string
  userId: string
  activityDetails: string
  onClose: () => void
}

export default function ApplyModal({ open, eventId, userId, activityDetails, onClose }: Props) {
  const [step, setStep] = useState(1)
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('No experience')
  const [message, setMessage] = useState('')
  const [sharePreferredNameWithParticipants, setSharePreferredNameWithParticipants] = useState(false)

  useEffect(() => {
    if (open) {
      const prof = getProfile(userId)
      const existingSkill = prof?.skillChecks?.[activityDetails]
      if (existingSkill) {
        setSkillLevel(existingSkill as any)
        setStep(2) // skip skill check if already known
      } else {
        setStep(1)
      }
      setMessage('')
      setSharePreferredNameWithParticipants(!!prof?.sharePreferredNameWithParticipants)
    }
  }, [open, userId, activityDetails])

  if (!open) return null

  const handleNext = () => {
    saveProfileSkill(userId, activityDetails, skillLevel)
    setStep(2)
  }

  const handleSubmit = () => {
    const profile = getProfile(userId)
    if (profile) {
      saveProfile({ ...profile, sharePreferredNameWithParticipants })
    }
    applyToEvent(eventId, {
      userId,
      status: 'pending',
      message,
      preferredNameVisibleToParticipants: sharePreferredNameWithParticipants,
      skillLevel,
      appliedAt: Date.now()
    })
    onClose()
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal">
        <div className="modal-header">
          <h3>Apply for Session</h3>
          <button className="modal-close" onClick={onClose}>x</button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {step === 1 && (
             <>
               <p>Please provide your self-assessed skill level for <strong>{activityDetails}</strong>.</p>
               <select className="input" value={skillLevel} onChange={e => setSkillLevel(e.target.value as any)}>
                  <option value="No experience">No experience</option>
                 <option value="Beginner">Beginner</option>
                 <option value="Intermediate">Intermediate</option>
                 <option value="Advanced">Advanced</option>
               </select>
               <button className="btn" onClick={handleNext}>Next</button>
             </>
          )}
          {step === 2 && (
             <>
               <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Message to Organiser (Optional)</label>
                  <textarea className="input" rows={3} value={message} onChange={e => setMessage(e.target.value)} placeholder="Say hi!" />
               </div>
               <div style={{ fontSize: 13, color: '#4b5563' }}>
                  Hosts will be able to see your preferred name with this application. Your public identity elsewhere stays as your username.
               </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Switch checked={sharePreferredNameWithParticipants} onChange={setSharePreferredNameWithParticipants} ariaLabel="Let approved participants see my preferred name" />
                  <div style={{ fontSize: 13 }}>Let approved participants see my preferred name</div>
               </div>
               <button className="btn" onClick={handleSubmit}>Submit Application</button>
             </>
          )}
        </div>
      </div>
    </div>
  )
}

