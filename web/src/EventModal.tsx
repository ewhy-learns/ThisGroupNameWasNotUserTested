import React from 'react'
import { readEventDraft, saveEventDraft, clearEventDraft, saveEvent, getProfile, listEvents, suggestTag, saveDraftSession, deleteDraftSession, getPublicIdentityLabel } from './AuthService'
import { LARGE_TAGS } from './ProfileModal'
import { XIcon } from './Icons'

type Props = { open: boolean; onClose: () => void; userId: string }

// use the full LARGE_TAGS list for activity search
const ACTIVITY_TYPES = LARGE_TAGS
const VIBES = ['Child Supervision','Child Participation','Casual','Social','Competitive','LGBTIQ+','Mens','Womens','U25s','Retirees','Mums','Dads','Aboriginal/Torres Strait Islander','18+']
const DEMO_TEMPLATE_SESSION = {
  id: 'template_demo_session',
  title: 'Demo template session',
  activity: 'Social Run',
  location: 'Armidale Riverbank Reserve, Riverbank Rd, Armidale NSW 2350',
  locationCoords: { lat: -30.5032, lon: 151.6615 },
  startTime: '07:00',
  endTime: '08:00',
  duration: 60,
  visibility: 'Public',
  description: 'Friendly mock session template with example values you can quickly adapt.',
  suggestedExperience: 'Beginner',
  participantsMin: 4,
  participantsMax: 12,
  cost: 'Free',
  equipment: 'Running shoes, water bottle',
  vibes: ['Casual', 'Social'],
  photoDataUrl: null,
  createdAt: Date.now(),
  templateName: 'Demo template session',
}

export default function EventModal({ open, onClose, userId }: Props) {
  const [step, setStep] = React.useState<number>(1)
  const [draft, setDraft] = React.useState<any>({})
  const [showTemplates, setShowTemplates] = React.useState(false)
  const [templates, setTemplates] = React.useState<any[]>([])
  const [activityChoicePending, setActivityChoicePending] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    const d = readEventDraft() || {}
    setDraft(d)
    setStep(1)
  }, [open])


  const setField = (k: string, v: any) => {
    setDraft((p: any) => ({ ...p, [k]: v }))
  }

  // activity search state
  const [activityQuery, setActivityQuery] = React.useState('')
  const [activityMatches, setActivityMatches] = React.useState<string[]>([])

  React.useEffect(() => {
    if (!activityQuery) { setActivityMatches([]); return }
    const q = activityQuery.trim().toLowerCase()
    const matches = ACTIVITY_TYPES.filter(t => t.toLowerCase().includes(q)).slice(0, 12)
    setActivityMatches(matches)
  }, [activityQuery])

  // location autocomplete state
  const [locQuery, setLocQuery] = React.useState('')
  const [locMatches, setLocMatches] = React.useState<any[]>([])
  const locTimer = React.useRef<number | null>(null)

  React.useEffect(() => {
    if (!locQuery || locQuery.trim().length < 3) { setLocMatches([]); return }
    if (locTimer.current) window.clearTimeout(locTimer.current)
    locTimer.current = window.setTimeout(async () => {
      try {
        const url = 'https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&q=' + encodeURIComponent(locQuery)
        const res = await fetch(url, { headers: { 'Accept': 'application/json' } })
        const data = await res.json()
        setLocMatches(data || [])
      } catch (e) { console.warn('Location lookup failed', e); setLocMatches([]) }
    }, 350)
    return () => { if (locTimer.current) window.clearTimeout(locTimer.current) }
  }, [locQuery])

  // load templates for the current user
  React.useEffect(() => {
    if (!showTemplates) return
    try {
      const all = listEvents()
      // filter events created by this user (host) if present
      const mine = all.filter(e => e.host === userId)
      setTemplates([DEMO_TEMPLATE_SESSION, ...mine.sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0))])
    } catch (e) { setTemplates([DEMO_TEMPLATE_SESSION]) }
  }, [showTemplates, userId])

  // validation state
  const [missingFields, setMissingFields] = React.useState<string[]>([])
  const [validationMessage, setValidationMessage] = React.useState<string | null>(null)

  const participantRangeMessage = React.useMemo(() => {
    const min = draft.participantsMin
    const max = draft.participantsMax
    if (typeof min !== 'number' || Number.isNaN(min) || typeof max !== 'number' || Number.isNaN(max)) return null
    if (min <= max) return null
    return 'Minimum participants cannot be greater than maximum participants. Reduce the minimum or increase the maximum to continue.'
  }, [draft.participantsMin, draft.participantsMax])

  const ensureValidParticipantRange = React.useCallback(() => {
    if (!participantRangeMessage) return true
    setStep(2)
    setValidationMessage(participantRangeMessage)
    return false
  }, [participantRangeMessage])

  const validateStep1 = () => {
    const required = ['title','activity','location','date','startTime','duration']
    const missing = required.filter(r => !draft[r])
    // if the only missing field is activity, offer the user a choice to add anyway or add+suggest
    if (missing.length === 1 && missing.includes('activity')) {
      setMissingFields([])
      setValidationMessage('Activity is missing. You may add it later or add now and suggest it to the master list.')
      setActivityChoicePending(true)
      return false
    }
    if (missing.length > 0) {
      setMissingFields(missing)
      setValidationMessage('Please complete the highlighted fields before continuing.')
      return false
    }
    setMissingFields([])
    setValidationMessage(null)
    return true
  }

  const handleStep1Continue = () => {
    if (!validateStep1()) return
    saveDraft();
    setStep(2)
  }

  React.useEffect(() => {
    // clear validation state when switching steps
    setMissingFields([])
    setValidationMessage(null)
    setActivityChoicePending(false)
  }, [step])

  React.useEffect(() => {
    if (!participantRangeMessage && validationMessage && validationMessage.includes('Minimum participants cannot be greater')) {
      setValidationMessage(null)
    }
  }, [participantRangeMessage, validationMessage])

  // recalc endTime whenever startTime or duration changes
  React.useEffect(() => {
    const st = draft.startTime
    const dur = draft.duration
    if (!st || typeof dur !== 'number') return
    const stParts = st.split(':')
    if (stParts.length !== 2) return
    const startM = Number(stParts[0]) * 60 + Number(stParts[1])
    const endM = (startM + dur) % (24*60)
    const hh = String(Math.floor(endM/60)).padStart(2,'0')
    const mm = String(endM%60).padStart(2,'0')
    setField('endTime', `${hh}:${mm}`)
    setField('durationHHMM', `${String(Math.floor(dur/60)).padStart(2,'0')}:${String(dur%60).padStart(2,'0')}`)
  }, [draft.startTime, draft.duration])

  // only show modal when open; keep hooks declared before this guard
  if (!open) return null

  const saveDraft = () => {
    if (!ensureValidParticipantRange()) return false
    const organiserName = getPublicIdentityLabel(userId, getProfile(userId) || undefined)
    const baseDraft = { ...draft, host: userId, organiserName }
    const stored = saveDraftSession(baseDraft)
    const nextDraft = stored ? { ...baseDraft, id: stored.id } : baseDraft
    saveEventDraft(nextDraft)
    if (stored?.id && draft.id !== stored.id) {
      setDraft((prev: any) => ({ ...prev, id: stored.id, host: userId, organiserName }))
    }
    return true
  }

  const publish = () => {
    // validate required fields
    const required = ['title','activity','location','date','startTime','duration']
    const missing = required.filter(r => !draft[r])
    if (missing.length > 0) {
      setMissingFields(missing)
      setValidationMessage('Please complete the highlighted fields before publishing.')
      return
    }
    if (!ensureValidParticipantRange()) return
    // ensure we record the host for created events
    const organiserName = getPublicIdentityLabel(userId, getProfile(userId) || undefined)
    const toSave = { ...draft, host: userId, organiserName }
    const evt = saveEvent(toSave)
    if (evt) {
      if (draft.id && String(draft.id).startsWith('draft_')) {
        deleteDraftSession(String(draft.id))
      }
      clearEventDraft()
      // show simple confirmation
      setValidationMessage(null)
      onClose()
    } else {
      setValidationMessage('Failed to save event; please try again.')
    }
  }

  const profile = getProfile(userId)

  // recent vibes ordering stored locally so users see recently-used vibes first
  const RECENT_VIBES_KEY = 'demo1_vibes_recent_v1'
  function getRecentVibes(): string[] {
    try {
      const raw = localStorage.getItem(RECENT_VIBES_KEY)
      if (!raw) return []
      return JSON.parse(raw)
    } catch { return [] }
  }
  function saveRecentVibe(v: string) {
    try {
      const raw = localStorage.getItem(RECENT_VIBES_KEY)
      const arr: string[] = raw ? JSON.parse(raw) : []
      const vStr = String(v)
      // remove existing and add to front
      const next = [vStr, ...arr.filter(x => x !== vStr)].slice(0, 20)
      localStorage.setItem(RECENT_VIBES_KEY, JSON.stringify(next))
    } catch (e) { /* ignore */ }
  }

  // build vibe list: recent (user), then profile vibes, then defaults
  const suggestedVibes = (() => {
    const recent = getRecentVibes()
    const seen = new Set<string>()
    const out: string[] = []
    for (const v of recent) { if (!seen.has(v)) { out.push(v); seen.add(v) } }
    for (const v of (profile?.vibes ?? [])) { if (!seen.has(v)) { out.push(v); seen.add(v) } }
    for (const v of VIBES) { if (!seen.has(v)) { out.push(v); seen.add(v) } }
    return out
  })()

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header">
          <h3 style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>Create session
            <button type="button" title="Fill from template" className="icon-btn" onClick={() => setShowTemplates(s => !s)} style={{ marginLeft: 8 }}>
              {/* clipboard / template icon */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="4" rx="1" /><rect x="3" y="6" width="18" height="14" rx="2" /></svg>
            </button>
          </h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close"><XIcon size={16} /></button>
        </div>
        {showTemplates && (
          <div style={{ position: 'absolute', top: 78, right: 24, zIndex: 2400 }}>
            <div style={{ background: 'white', borderRadius: 8, boxShadow: '0 8px 24px rgba(2,6,23,0.12)', width: 320, maxHeight: 300, overflow: 'auto', border: '1px solid rgba(2,6,23,0.06)' }}>
              <div style={{ padding: 12, borderBottom: '1px solid rgba(2,6,23,0.04)', fontWeight: 700 }}>Your templates</div>
              {templates.length === 0 ? (
                <div style={{ padding: 12 }}>No saved sessions found.</div>
              ) : (
                templates.map(t => (
                  <div key={t.id} style={{ padding: 10, borderBottom: '1px solid rgba(2,6,23,0.04)', cursor: 'pointer' }} onClick={() => {
                    // copy template fields except date
                    const copy = { ...t }
                    delete copy.id
                    delete copy.createdAt
                    delete copy.date
                    delete copy.updatedAt
                    delete copy.isDraft
                    setDraft(prev => ({ ...prev, ...copy }))
                    setShowTemplates(false)
                  }}>
                    <div style={{ fontWeight: 700 }}>{t.title || t.activity || 'Untitled'}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{t.templateName ? t.templateName : new Date(t.createdAt).toLocaleString()}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        <div className="modal-body">
          {step === 1 && (
            <div>
              <p style={{ marginTop: 0, marginBottom: 12, fontWeight: 600 }}>Complete all the following. All fields must be completed to Save and continue.</p>

              <label className="input-label">Session title</label>
              <input className="input" value={draft.title || ''} onChange={e => setField('title', e.target.value)} style={missingFields.includes('title') ? { borderColor: '#e11d48' } : undefined} aria-invalid={missingFields.includes('title')} />

              <label className="input-label">Activity type</label>
              <div style={{ position: 'relative' }}>
                <input className="input" value={draft.activity || activityQuery} onChange={e => { const v = e.target.value; setActivityQuery(v); setField('activity', v); }} placeholder="Search activity" style={missingFields.includes('activity') ? { borderColor: '#e11d48' } : undefined} aria-invalid={missingFields.includes('activity')} />
                {activityMatches.length > 0 && (
                  <div style={{ position: 'absolute', left: 0, right: 0, background: 'white', boxShadow: '0 6px 18px rgba(2,6,23,0.08)', zIndex: 50, borderRadius: 8, marginTop: 6, maxHeight: 220, overflow: 'auto' }}>
                    {activityMatches.map(a => (
                      <div key={a} style={{ padding: '8px 12px', cursor: 'pointer' }} onClick={() => { setField('activity', a); setActivityQuery(''); setActivityMatches([]) }}>{a}</div>
                    ))}
                  </div>
                )}
                {/* Suggest button: allow user to add typed activity to suggested tags */}
                {draft.activity && draft.activity.trim() && !ACTIVITY_TYPES.some(t => t.toLowerCase() === draft.activity.trim().toLowerCase()) && (
                  <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="button" className="btn ghost" onClick={() => {
                      const a = draft.activity.trim()
                      try { suggestTag(a); setValidationMessage('Suggested "' + a + '" to the master list.'); setTimeout(() => setValidationMessage(null), 2200) } catch (e) { }
                    }}>Suggest this activity</button>
                  </div>
                )}
              </div>

              <label className="input-label">Location</label>
              <div style={{ position: 'relative' }}>
                <input className="input" value={draft.location || locQuery} onChange={e => { setLocQuery(e.target.value); setField('location', ''); }} placeholder="Search address" style={missingFields.includes('location') ? { borderColor: '#e11d48' } : undefined} aria-invalid={missingFields.includes('location')} />
                {locMatches.length > 0 && (
                  <div style={{ position: 'absolute', left: 0, right: 0, background: 'white', boxShadow: '0 6px 18px rgba(2,6,23,0.08)', zIndex: 50, borderRadius: 8, marginTop: 6, maxHeight: 220, overflow: 'auto' }}>
                    {locMatches.map((m:any) => (
                      <div key={m.place_id} style={{ padding: '8px 12px', cursor: 'pointer' }} onClick={() => { setField('location', m.display_name); setField('locationCoords', { lat: m.lat, lon: m.lon }); setLocQuery(''); setLocMatches([]) }}>{m.display_name}</div>
                    ))}
                  </div>
                )}
              </div>

              <label className="input-label">Date</label>
              <input className="input" type="date" value={draft.date || ''} onChange={e => setField('date', e.target.value)} style={missingFields.includes('date') ? { borderColor: '#e11d48' } : undefined} aria-invalid={missingFields.includes('date')} />

              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label className="input-label">Start time</label>
                  <input className="input" type="time" value={draft.startTime || ''} onChange={e => setField('startTime', e.target.value)} style={missingFields.includes('startTime') ? { borderColor: '#e11d48' } : undefined} aria-invalid={missingFields.includes('startTime')} />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="input-label">Duration</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      className="input"
                      type="number"
                      min={0}
                      max={23}
                      style={{ width: 80 }}
                      value={draft.durationHours ?? Math.floor((draft.duration||0)/60)}
                      onChange={e => {
                        const h = Math.max(0, Math.min(23, Number(e.target.value || 0)))
                        const m = draft.durationMinutes ?? (draft.duration ? draft.duration % 60 : 0)
                        const mins = h * 60 + m
                        setField('duration', mins)
                        setField('durationHours', h)
                        setField('durationMinutes', m)
                        setField('durationHHMM', `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`)
                      }}
                      aria-label="Duration hours"
                    />
                    <span>hours</span>
                    <input
                      className="input"
                      type="number"
                      min={0}
                      max={59}
                      style={{ width: 80 }}
                      value={draft.durationMinutes ?? ((draft.duration || 0) % 60)}
                      onChange={e => {
                        const m = Math.max(0, Math.min(59, Number(e.target.value || 0)))
                        const h = draft.durationHours ?? Math.floor((draft.duration||0)/60)
                        const mins = h * 60 + m
                        setField('duration', mins)
                        setField('durationHours', h)
                        setField('durationMinutes', m)
                        setField('durationHHMM', `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`)
                      }}
                      aria-label="Duration minutes"
                    />
                    <span>minutes</span>
                  </div>
                  {/* show calculated end time */}
                  {draft.endTime && (
                    <div style={{ marginTop: 6, fontSize: 13, color: '#374151' }}>Calculated end time: <strong>{draft.endTime}</strong></div>
                  )}
                </div>
              </div>

              <label className="input-label">Visibility</label>
              <select className="input" value={draft.visibility || 'Public'} onChange={e => setField('visibility', e.target.value)} style={missingFields.includes('visibility') ? { borderColor: '#e11d48' } : undefined} aria-invalid={missingFields.includes('visibility')}>
                <option>Public</option>
                <option>Friends</option>
                <option>Invitation only</option>
              </select>

              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className="btn ghost" onClick={() => { if (saveDraft()) alert('Draft session saved to My sessions') }}>Save as draft</button>
                <div style={{ flex: 1 }} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                  {validationMessage && <div className="error">{validationMessage}</div>}
                  {activityChoicePending ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn ghost" onClick={() => {
                        // Add anyway: set a placeholder activity (or use query) and continue
                        const a = activityQuery && activityQuery.trim() ? activityQuery.trim() : 'Other'
                        setField('activity', a)
                        setActivityChoicePending(false)
                        setValidationMessage(null)
                        if (saveDraft()) setStep(2)
                      }}>Add anyway</button>
                      <button className="btn" onClick={() => {
                        const a = activityQuery && activityQuery.trim() ? activityQuery.trim() : 'Other'
                        try { suggestTag(a) } catch (e) { /* ignore */ }
                        setField('activity', a)
                        setActivityChoicePending(false)
                        setValidationMessage(null)
                        if (saveDraft()) setStep(2)
                      }}>Add & suggest</button>
                    </div>
                  ) : (
                    <button className="btn" onClick={handleStep1Continue}>Save and continue</button>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h4>Recommended information</h4>
              <label className="input-label">Session description</label>
              <textarea className="input" style={{ minHeight: 120 }} value={draft.description || ''} onChange={e => setField('description', e.target.value)} placeholder={"E.g. We'll meet at the park entrance, run 5km, coffee afterwards."} />

              <label className="input-label">Suggested experience</label>
              <select className="input" value={draft.suggestedExperience || ''} onChange={e => setField('suggestedExperience', e.target.value)}>
                <option value="">Choose</option>
                <option>No experience</option>
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>

              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label className="input-label">Participants (min)</label>
                  <input className="input" type="number" value={draft.participantsMin || ''} onChange={e => setField('participantsMin', Number(e.target.value) || undefined)} style={participantRangeMessage ? { borderColor: '#e11d48' } : undefined} aria-invalid={!!participantRangeMessage} />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="input-label">Participants (max)</label>
                  <input className="input" type="number" value={draft.participantsMax || ''} onChange={e => setField('participantsMax', Number(e.target.value) || undefined)} style={participantRangeMessage ? { borderColor: '#e11d48' } : undefined} aria-invalid={!!participantRangeMessage} />
                </div>
              </div>
              {participantRangeMessage && <div className="error" style={{ marginTop: 8 }}>{participantRangeMessage}</div>}

              <label className="input-label">Costs</label>
              <input className="input" value={draft.cost || ''} onChange={e => setField('cost', e.target.value)} placeholder="E.g. Free, $5 per person" />

              <label className="input-label">Required equipment</label>
              <input className="input" value={draft.equipment || ''} onChange={e => setField('equipment', e.target.value)} placeholder="E.g. Running shoes, water bottle" />

              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className="btn ghost" onClick={() => { setValidationMessage(null); setStep(1) }}>Back</button>
                <button className="btn ghost" onClick={() => { if (saveDraft()) alert('Draft session saved to My sessions') }}>Save as draft</button>
                <button className="btn" onClick={() => { if (saveDraft()) setStep(3) }}>Save and continue</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h4>Session vibes & avatar</h4>
              <p style={{ marginTop: 0 }}>Suggested vibes (based on your profile)</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {suggestedVibes.map((v: string) => (
                  <button key={v} className={((draft.vibes||[]).includes(v) ? 'btn' : 'btn ghost')} onClick={() => {
                    const cur = draft.vibes || []
                    const selecting = !cur.includes(v)
                    const next = selecting ? [...cur, v] : cur.filter((x:any)=>x!==v)
                    setField('vibes', next)
                    if (selecting) {
                      try { saveRecentVibe(v) } catch (e) { /* ignore */ }
                    }
                  }}>{v}</button>
                ))}
              </div>

              <div style={{ marginTop: 12 }}>
                <label className="input-label">Event avatar (optional)</label>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>This image is used as the session avatar in search results and session lists.</div>
                <input type="file" accept="image/*" onChange={e => {
                  const f = e.target.files && e.target.files[0]
                  if (!f) return
                  const reader = new FileReader()
                  reader.onload = () => setField('photoDataUrl', reader.result as string)
                  reader.readAsDataURL(f)
                }} />
                {draft.photoDataUrl && <div style={{ marginTop: 8 }}><img src={draft.photoDataUrl} alt="preview" style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 20, border: '1px solid rgba(15,23,32,0.08)' }} /></div>}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                {validationMessage && <div className="error">{validationMessage}</div>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn ghost" onClick={() => { setValidationMessage(null); setStep(2) }}>Back</button>
                  <button className="btn ghost" onClick={() => { if (saveDraft()) alert('Draft session saved to My sessions') }}>Save as draft</button>
                  <button className="btn" onClick={() => { publish() }}>Publish</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

