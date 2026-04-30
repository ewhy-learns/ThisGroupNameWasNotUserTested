export type Account = {
  id: string
  createdAt: number
}

const ACCOUNTS_KEY = 'demo1_accounts_v1'
const USER_KEY = 'demo1_user_v1'

function readAccounts(): Account[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY)
    if (!raw) return []
    return JSON.parse(raw) as Account[]
  } catch {
    return []
  }
}

function writeAccounts(accounts: Account[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
}

export function accountExists(id: string): boolean {
  if (!id) return false
  const accounts = readAccounts()
  return accounts.some(a => a.id.toLowerCase() === id.toLowerCase())
}

export function registerAccount(id: string) {
  if (!id) throw new Error('Invalid id')
  const accounts = readAccounts()
  if (accounts.some(a => a.id.toLowerCase() === id.toLowerCase())) return
  accounts.push({ id, createdAt: Date.now() })
  writeAccounts(accounts)
}

export function setLoggedInUser(id: string | null) {
  if (id === null) {
    localStorage.removeItem(USER_KEY)
  } else {
    localStorage.setItem(USER_KEY, id)
  }
}

export function getLoggedInUser(): string | null {
  return localStorage.getItem(USER_KEY)
}

export function logout() {
  setLoggedInUser(null)
}

// Profile helpers
const PROFILE_KEY = 'demo1_profile_v1'
const SUGGESTED_TAGS_KEY = 'demo1_suggested_tags_v1'
const REG_DRAFT_KEY = 'demo1_registration_draft_v1'
const EVENT_DRAFT_KEY = 'demo1_event_draft_v1'
const EVENTS_KEY = 'demo1_events_v1'

export type Profile = {
  id: string
  tags: string[]
  // optional display name (public)
  displayName?: string
  // contact details (not publicized on events)
  email?: string
  phone?: string
  // optional password (prototype only - stored locally)
  password?: string
  about?: string
  aboutPublic?: boolean
  gender?: string
  completedAt: number
  // optional per-tag skill assessments; maps tag -> level. If a tag is absent, it's considered "Not assessed".
  skillChecks?: { [tag: string]: 'Beginner' | 'Intermediate' | 'Advanced' }
  // optional list of "vibes" (social/contextual tags)
  vibes?: string[]
}

export function getProfile(id: string): Profile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY + '_' + id)
    if (!raw) return null
    const prof = JSON.parse(raw) as Profile
    // Sanitize publicly visible fields when the viewer is not the profile owner.
    // This prevents accidentally showing emails or phone numbers that may be embedded
    // in the `about` text stored in localStorage (legacy seed data or older profiles).
    try {
      const viewer = getLoggedInUser()
      if (viewer !== id && prof && typeof prof.about === 'string') {
        // remove email addresses
        prof.about = prof.about.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/ig, '[redacted]')
        // remove common phone number patterns (digits with spaces/dashes, length >=7)
        prof.about = prof.about.replace(/(\+?\d[\d\-\s]{6,}\d)/g, '[redacted]')
      }
    } catch (e) {
      // ignore sanitization errors and return profile as-is
    }
    return prof
  } catch {
    return null
  }
}

export function saveProfile(profile: Profile) {
  localStorage.setItem(PROFILE_KEY + '_' + profile.id, JSON.stringify(profile))
}

export function isProfileComplete(id: string): boolean {
  return getProfile(id) !== null
}

export function suggestTag(tag: string) {
  try {
    const raw = localStorage.getItem(SUGGESTED_TAGS_KEY)
    const arr: string[] = raw ? JSON.parse(raw) : []
    if (!arr.includes(tag)) {
      arr.push(tag)
      localStorage.setItem(SUGGESTED_TAGS_KEY, JSON.stringify(arr))
    }
  } catch {
    // ignore
  }
}

export function getSuggestedTags(): string[] {
  try {
    const raw = localStorage.getItem(SUGGESTED_TAGS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

// registration draft helpers (persist form between sessions)
export type RegistrationDraft = {
  displayName?: string
  yearOfBirth?: string
  email?: string
  phone?: string
}

export function readRegistrationDraft(): RegistrationDraft {
  try {
    const raw = localStorage.getItem(REG_DRAFT_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as RegistrationDraft
  } catch {
    return {}
  }
}

export function writeRegistrationDraft(draft: RegistrationDraft) {
  try {
    localStorage.setItem(REG_DRAFT_KEY, JSON.stringify(draft))
  } catch {
    // ignore
  }
}

export function clearRegistrationDraft() {
  try {
    localStorage.removeItem(REG_DRAFT_KEY)
  } catch {
    // ignore
  }
}

// Event drafts and storage
export type EventDraft = {
  id?: string
  title?: string
  activity?: string
  location?: string
  date?: string
  startTime?: string
  endTime?: string
  visibility?: 'Public'|'Friends'|'Invitation only'
  description?: string
  suggestedExperience?: 'Beginner'|'Intermediate'|'Advanced'|undefined
  participantsMin?: number
  participantsMax?: number
  cost?: string
  equipment?: string
  vibes?: string[]
  photoDataUrl?: string | null
  updatedAt?: number
}

export function readEventDraft(): EventDraft | null {
  try {
    const raw = localStorage.getItem(EVENT_DRAFT_KEY)
    if (!raw) return null
    return JSON.parse(raw) as EventDraft
  } catch {
    return null
  }
}

export function saveEventDraft(draft: EventDraft) {
  try {
    draft.updatedAt = Date.now()
    localStorage.setItem(EVENT_DRAFT_KEY, JSON.stringify(draft))
  } catch {
    // ignore
  }
}

export function clearEventDraft() {
  try { localStorage.removeItem(EVENT_DRAFT_KEY) } catch {}
}

export type EventItem = EventDraft & { id: string; createdAt: number }

export function saveEvent(event: EventDraft) {
  try {
    const raw = localStorage.getItem(EVENTS_KEY)
    const arr: EventItem[] = raw ? JSON.parse(raw) : []
    const id = event.id ?? 'evt_' + Math.random().toString(36).slice(2,9)
    // Normalize host and participants to predictable string forms to avoid casing issues
    const normalizedEvent: any = { ...(event as any) }
    try {
      normalizedEvent.host = normalizedEvent.host ? String(normalizedEvent.host).trim() : ''
      if (Array.isArray(normalizedEvent.participants)) {
        normalizedEvent.participants = normalizedEvent.participants.map((p: any) => String(p).trim())
      }
    } catch (e) { /* ignore normalization errors */ }
    const item: EventItem = { ...normalizedEvent, id, createdAt: Date.now() }
    // normalize locationCoords lat/lon to numbers if present
    if ((item as any).locationCoords) {
      try {
        const lc = (item as any).locationCoords
        if (lc.lat !== undefined) lc.lat = Number(lc.lat)
        if (lc.lon !== undefined) lc.lon = Number(lc.lon)
      } catch (e) { /* ignore */ }
    }
    // if an event with same id exists, replace it; otherwise push
    const idx = arr.findIndex(a => a.id === id)
    if (idx >= 0) arr[idx] = item
    else arr.push(item)
    localStorage.setItem(EVENTS_KEY, JSON.stringify(arr))
    // Notify same-window listeners that events were updated (window 'storage' only fires for other tabs)
    try {
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        // include the saved item as detail so listeners (e.g. MapView) can optionally focus it
        const ce = new CustomEvent('demo1_events_updated', { detail: item })
        window.dispatchEvent(ce)
      }
    } catch (e) {
      // ignore
    }
    return item
  } catch (e) {
    console.warn('[AuthService] saveEvent failed', e)
    return null
  }
}

export function addParticipant(eventId: string, participantId: string) {
  try {
    const raw = localStorage.getItem(EVENTS_KEY)
    const arr: EventItem[] = raw ? JSON.parse(raw) : []
    const idx = arr.findIndex(e => e.id === eventId)
    if (idx === -1) return null
    const ev = arr[idx]
    ev.participants = Array.isArray(ev.participants) ? ev.participants.map((p:any)=>String(p)) : []
    if (!ev.participants.includes(participantId)) ev.participants.push(participantId)
    arr[idx] = ev
    localStorage.setItem(EVENTS_KEY, JSON.stringify(arr))
    try { if (typeof window !== 'undefined' && window.dispatchEvent) window.dispatchEvent(new CustomEvent('demo1_events_updated', { detail: ev })) } catch (e) {}
    return ev
  } catch (e) {
    return null
  }
}

export function removeParticipant(eventId: string, participantId: string) {
  try {
    const raw = localStorage.getItem(EVENTS_KEY)
    const arr: EventItem[] = raw ? JSON.parse(raw) : []
    const idx = arr.findIndex(e => e.id === eventId)
    if (idx === -1) return null
    const ev = arr[idx]
    ev.participants = Array.isArray(ev.participants) ? ev.participants.filter((p:any) => String(p) !== participantId) : []
    arr[idx] = ev
    localStorage.setItem(EVENTS_KEY, JSON.stringify(arr))
    try { if (typeof window !== 'undefined' && window.dispatchEvent) window.dispatchEvent(new CustomEvent('demo1_events_updated', { detail: ev })) } catch (e) {}
    return ev
  } catch (e) {
    return null
  }
}

export function listEvents(): EventItem[] {
  try {
    const raw = localStorage.getItem(EVENTS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}


// Seed a local prototype account/profile so the app can run without a backend.
// Uses the same default email used in the UI as a sensible seed value.
try {
  const seedId = 'username@une.edu.au'
  if (!accountExists(seedId)) {
    registerAccount(seedId)
  }
  if (!getProfile(seedId)) {
    saveProfile({
      id: seedId,
      tags: ['outdoor', 'community'],
      about: 'Prototype organiser account (local only).',
      aboutPublic: true,
      completedAt: Date.now(),
      skillChecks: {},
      vibes: ['friendly']
    })
  }
} catch (e) {
  // ignore errors during eager seeding
}


