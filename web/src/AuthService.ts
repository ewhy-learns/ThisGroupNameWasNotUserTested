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
    return JSON.parse(raw) as Profile
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
    const item: EventItem = { ...(event as any), id, createdAt: Date.now() }
    arr.push(item)
    localStorage.setItem(EVENTS_KEY, JSON.stringify(arr))
    return item
  } catch (e) {
    console.warn('[AuthService] saveEvent failed', e)
    return null
  }
}

export function listEvents(): EventItem[] {
  try {
    const raw = localStorage.getItem(EVENTS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

