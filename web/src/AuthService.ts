export type Account = {
  id: string
  createdAt: number
}

const ACCOUNTS_KEY = 'demo1_accounts_v1'
const USER_KEY = 'demo1_user_v1'
const UNE_EMAIL_DOMAIN = 'une.edu.au'

function looksLikePhone(value: string) {
  return /^[+\d][\d\s-]{6,}$/.test(value)
}

export function normalizeAccountId(value: string) {
  const trimmed = String(value || '').trim()
  if (!trimmed) return ''
  if (trimmed.includes('@')) return trimmed.toLowerCase()
  if (looksLikePhone(trimmed)) return trimmed
  return `${trimmed.replace(/\s+/g, '').toLowerCase()}@${UNE_EMAIL_DOMAIN}`
}

function deriveUsernameFromId(id: string) {
  const trimmed = String(id || '').trim()
  if (!trimmed) return ''
  if (trimmed.includes('@')) return trimmed.split('@')[0].trim().toLowerCase()
  return trimmed
}

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
  const normalizedId = normalizeAccountId(id)
  if (!normalizedId) return false
  const accounts = readAccounts()
  return accounts.some(a => normalizeAccountId(a.id) === normalizedId)
}

export function registerAccount(id: string) {
  const normalizedId = normalizeAccountId(id)
  if (!normalizedId) throw new Error('Invalid id')
  const accounts = readAccounts()
  if (accounts.some(a => normalizeAccountId(a.id) === normalizedId)) return normalizedId
  accounts.push({ id: normalizedId, createdAt: Date.now() })
  writeAccounts(accounts)
  return normalizedId
}

export function setLoggedInUser(id: string | null) {
  if (id === null) {
    localStorage.removeItem(USER_KEY)
  } else {
    localStorage.setItem(USER_KEY, normalizeAccountId(id))
  }
}

export function getLoggedInUser(): string | null {
  const raw = localStorage.getItem(USER_KEY)
  return raw ? normalizeAccountId(raw) : null
}

export function logout() {
  setLoggedInUser(null)
}

// Profile helpers
const PROFILE_KEY = 'demo1_profile_v1'
const SUGGESTED_TAGS_KEY = 'demo1_suggested_tags_v1'
const REG_DRAFT_KEY = 'demo1_registration_draft_v1'
const EVENT_DRAFT_KEY = 'demo1_event_draft_v1'
const EVENT_SESSION_DRAFTS_KEY = 'demo1_event_session_drafts_v1'
const EVENTS_KEY = 'demo1_events_v1'
const MESSAGE_THREADS_KEY = 'demo1_message_threads_v1'

export type Profile = {
  id: string
  tags: string[]
  // public anonymised handle shown throughout the app
  username?: string
  // preferred/private given name used by hosts during applications
  preferredName?: string
  // legacy alias kept for backward compatibility while old local data migrates
  displayName?: string
  // contact details (not publicized on events)
  email?: string
  phone?: string
  yearOfBirth?: string
  // optional password (prototype only - stored locally)
  password?: string
  about?: string
  aboutPublic?: boolean
  gender?: string
  completedAt?: number
  sharePreferredNameWithParticipants?: boolean
  // optional per-tag skill assessments; maps tag -> level. If a tag is absent, it's considered "Not assessed".
  skillChecks?: { [tag: string]: 'Beginner' | 'Intermediate' | 'Advanced' }
  // optional list of "vibes" (social/contextual tags)
  vibes?: string[]
  rating?: number
}

export type Application = {
  userId: string
  status: 'pending' | 'approved' | 'waitlisted' | 'denied'
  message?: string
  isPublic?: boolean
  username?: string
  preferredName?: string
  preferredNameVisibleToParticipants?: boolean
  skillLevel?: 'Beginner' | 'Intermediate' | 'Advanced'
  appliedAt: number
}

export type ParticipantDetails = {
  userId: string
  username?: string
  preferredName?: string
  preferredNameVisibleToParticipants?: boolean
  joinedAt?: number
}

export type MessageRecord = {
  id: string
  senderId: string
  body: string
  sentAt: number
}

export type MessageThread = {
  id: string
  type: 'direct' | 'event'
  participantIds: string[]
  eventId?: string
  directUserIds?: string[]
  messages: MessageRecord[]
  createdAt: number
  updatedAt: number
  lastReadAtBy?: Record<string, number>
}

export type MessageThreadSummary = {
  id: string
  type: 'direct' | 'event'
  title: string
  subtitle?: string
  updatedAt: number
  unreadCount: number
  eventId?: string
  otherUserId?: string
}

export type StoredDraftSession = EventDraft & {
  id: string
  host: string
  createdAt: number
  updatedAt: number
  isDraft: true
  templateName?: string
}

// Utility: sanitize user-provided free text before making it public.
function sanitizeText(s: string | undefined | null) {
  if (!s || typeof s !== 'string') return s
  // remove email addresses
  let out = s.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/ig, '[redacted]')
  // remove common phone number patterns (digits with spaces/dashes, length >=7)
  out = out.replace(/(\+?\d[\d\-\s]{6,}\d)/g, '[redacted]')
  return out
}

function normalizeProfile(profile: Profile | null): Profile | null {
  if (!profile) return null
  const normalizedId = normalizeAccountId(profile.id)
  const username = String(profile.username || deriveUsernameFromId(normalizedId) || '').trim()
  const preferredName = String(profile.preferredName || profile.displayName || username || '').trim()
  return {
    ...profile,
    id: normalizedId,
    username,
    preferredName,
    displayName: preferredName || profile.displayName,
    email: profile.email ? String(profile.email).trim().toLowerCase() : profile.email,
    phone: profile.phone ? String(profile.phone).trim() : profile.phone,
    sharePreferredNameWithParticipants: !!profile.sharePreferredNameWithParticipants,
  }
}

export function getPublicUsername(id: string, profile?: Profile | null) {
  const prof = normalizeProfile(profile ?? getProfile(id))
  return String(prof?.username || deriveUsernameFromId(normalizeAccountId(id)) || 'user').trim()
}

export function getPreferredName(id: string, profile?: Profile | null) {
  const prof = normalizeProfile(profile ?? getProfile(id))
  return String(prof?.preferredName || prof?.displayName || getPublicUsername(id, prof) || 'User').trim()
}

export function getPublicIdentityLabel(id: string, profile?: Profile | null) {
  return getPublicUsername(id, profile)
}

export function getHostVisibleIdentityLabel(id: string, profile?: Profile | null) {
  const username = getPublicUsername(id, profile)
  const preferredName = getPreferredName(id, profile)
  if (preferredName && preferredName !== username) return `${username} (${preferredName})`
  return username
}

export function getEventParticipantLabel(event: any, participantId: string, viewerId?: string | null) {
  const profile = getProfile(participantId)
  const username = getPublicUsername(participantId, profile)
  const preferredName = getPreferredName(participantId, profile)
  if (!preferredName || preferredName === username) return username

  const participantDetails = Array.isArray(event?.participantDetails) ? event.participantDetails : []
  const participantRecord = participantDetails.find((entry: any) => String(entry?.userId) === String(participantId))
  const applications = Array.isArray(event?.applications) ? event.applications : []
  const application = applications.find((entry: any) => String(entry?.userId) === String(participantId))
  const allowParticipants = !!(participantRecord?.preferredNameVisibleToParticipants ?? application?.preferredNameVisibleToParticipants ?? application?.isPublic)
  const approvedParticipants = Array.isArray(event?.participants) ? event.participants.map((entry: any) => String(entry)) : []
  const viewer = viewerId ? String(viewerId) : ''
  const viewerIsHost = !!viewer && String(event?.host || '') === viewer
  const viewerIsApprovedParticipant = !!viewer && approvedParticipants.includes(viewer)
  const viewerIsOwner = !!viewer && viewer === String(participantId)

  if (viewerIsOwner || viewerIsHost || (allowParticipants && viewerIsApprovedParticipant)) {
    return `${username} (${preferredName})`
  }

  return username
}

export function getProfile(id: string): Profile | null {
  try {
    const normalizedId = normalizeAccountId(id)
    const raw = localStorage.getItem(PROFILE_KEY + '_' + normalizedId)
    if (!raw) return null
    const prof = normalizeProfile(JSON.parse(raw) as Profile)
    if (!prof) return null
    // Sanitize publicly visible fields when the viewer is not the profile owner.
    // This prevents accidentally showing emails or phone numbers that may be embedded
    // in the `about` text stored in localStorage (legacy seed data or older profiles).
    try {
      const viewer = getLoggedInUser()
      if (viewer !== normalizedId && prof && typeof prof.about === 'string') {
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
  const normalized = normalizeProfile(profile)
  if (!normalized) return
  localStorage.setItem(PROFILE_KEY + '_' + normalized.id, JSON.stringify(normalized))
}

export function isProfileComplete(id: string): boolean {
  const profile = getProfile(id)
  return !!(profile && profile.completedAt)
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
  username?: string
  preferredName?: string
  displayName?: string
  yearOfBirth?: string
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
  participants?: string[] // legacy
  participantDetails?: ParticipantDetails[]
  applications?: Application[]
  host?: string
  // legacy fallback; public UI should prefer the host profile username
  organiserName?: string
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

function readStoredDraftSessions(): StoredDraftSession[] {
  try {
    const raw = localStorage.getItem(EVENT_SESSION_DRAFTS_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr as StoredDraftSession[] : []
  } catch {
    return []
  }
}

function writeStoredDraftSessions(items: StoredDraftSession[]) {
  localStorage.setItem(EVENT_SESSION_DRAFTS_KEY, JSON.stringify(items))
}

function uniqueIds(values: string[]) {
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of values) {
    const normalized = normalizeAccountId(value)
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    out.push(normalized)
  }
  return out
}

function normalizeParticipantDetailsEntry(entry: any): ParticipantDetails | null {
  const userId = normalizeAccountId(entry?.userId || entry?.id || '')
  if (!userId) return null
  const profile = getProfile(userId)
  return {
    ...entry,
    userId,
    username: entry?.username || getPublicUsername(userId, profile),
    preferredName: entry?.preferredName || getPreferredName(userId, profile),
    preferredNameVisibleToParticipants: !!entry?.preferredNameVisibleToParticipants,
    joinedAt: entry?.joinedAt,
  }
}

function normalizeEventRecord<T extends EventDraft | EventItem>(event: T): T {
  const normalizedHost = event?.host ? normalizeAccountId(String(event.host).trim()) : ''
  const participantsMin = typeof event?.participantsMin === 'number' && !Number.isNaN(event.participantsMin)
    ? Math.max(0, Number(event.participantsMin))
    : undefined
  const participantsMax = typeof event?.participantsMax === 'number' && !Number.isNaN(event.participantsMax)
    ? Math.max(0, Number(event.participantsMax))
    : undefined
  const normalizedParticipantsMin = participantsMin !== undefined && participantsMax !== undefined && participantsMin > participantsMax
    ? participantsMax
    : participantsMin
  const participants = uniqueIds(Array.isArray(event?.participants) ? event.participants.map((entry: any) => String(entry)) : [])
  const participantDetailsMap = new Map<string, ParticipantDetails>()

  if (Array.isArray(event?.participantDetails)) {
    for (const entry of event.participantDetails) {
      const normalized = normalizeParticipantDetailsEntry(entry)
      if (normalized) participantDetailsMap.set(normalized.userId, normalized)
    }
  }

  const applications = Array.isArray(event?.applications)
    ? event.applications.reduce((acc: Application[], app: any) => {
        const userId = normalizeAccountId(app?.userId || '')
        if (!userId) return acc
        const profile = getProfile(userId)
        const normalizedApp: Application = {
          ...app,
          userId,
          username: app?.username || getPublicUsername(userId, profile),
          preferredName: app?.preferredName || getPreferredName(userId, profile),
          preferredNameVisibleToParticipants: !!(app?.preferredNameVisibleToParticipants ?? app?.isPublic),
          appliedAt: Number(app?.appliedAt || 0),
        }

        if (normalizedApp.status === 'approved') {
          if (!participants.includes(userId)) participants.push(userId)
          const existing = participantDetailsMap.get(userId)
          participantDetailsMap.set(userId, {
            ...existing,
            userId,
            username: normalizedApp.username,
            preferredName: normalizedApp.preferredName,
            preferredNameVisibleToParticipants: !!normalizedApp.preferredNameVisibleToParticipants,
            joinedAt: existing?.joinedAt || normalizedApp.appliedAt,
          })
          return acc
        }

        acc.push(normalizedApp)
        return acc
      }, [])
    : []

  const participantDetails = participants.map(userId => {
    const existing = participantDetailsMap.get(userId)
    if (existing) {
      return {
        ...existing,
        userId,
        username: existing.username || getPublicUsername(userId),
        preferredName: existing.preferredName || getPreferredName(userId),
      }
    }
    const profile = getProfile(userId)
    return {
      userId,
      username: getPublicUsername(userId, profile),
      preferredName: getPreferredName(userId, profile),
      preferredNameVisibleToParticipants: false,
    }
  })

  const organiserName = normalizedHost ? getPublicUsername(normalizedHost, getProfile(normalizedHost)) : event?.organiserName

  return {
    ...event,
    host: normalizedHost,
    organiserName,
    participantsMin: normalizedParticipantsMin,
    participantsMax,
    participants,
    participantDetails,
    applications,
  }
}

function readMessageThreads(): MessageThread[] {
  try {
    const raw = localStorage.getItem(MESSAGE_THREADS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed as MessageThread[] : []
  } catch {
    return []
  }
}

function writeMessageThreads(threads: MessageThread[]) {
  localStorage.setItem(MESSAGE_THREADS_KEY, JSON.stringify(threads))
}

function emitMessagesUpdated(detail?: any) {
  try {
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('demo1_messages_updated', { detail }))
    }
  } catch {}
}

function normalizeMessageThread(thread: MessageThread): MessageThread {
  const participantIds = uniqueIds(Array.isArray(thread.participantIds) ? thread.participantIds : [])
  const directUserIds = Array.isArray(thread.directUserIds) ? uniqueIds(thread.directUserIds) : undefined
  const messages = Array.isArray(thread.messages)
    ? thread.messages.map(message => ({
        ...message,
        senderId: normalizeAccountId(message.senderId),
        body: String(message.body || '').trim(),
        sentAt: Number(message.sentAt || 0),
      })).filter(message => !!message.senderId && !!message.body)
    : []
  const lastReadAtBy: Record<string, number> = {}
  for (const [key, value] of Object.entries(thread.lastReadAtBy || {})) {
    lastReadAtBy[normalizeAccountId(key)] = Number(value || 0)
  }
  return {
    ...thread,
    participantIds,
    directUserIds,
    eventId: thread.eventId,
    messages,
    createdAt: Number(thread.createdAt || Date.now()),
    updatedAt: Number(thread.updatedAt || thread.createdAt || Date.now()),
    lastReadAtBy,
  }
}

function getDirectThreadId(userA: string, userB: string) {
  return `dm:${uniqueIds([userA, userB]).sort().join('__')}`
}

function getEventThreadId(eventId: string) {
  return `event:${String(eventId || '').trim()}`
}

function canAccessEventChat(event: EventItem | EventDraft | null | undefined, userId: string | null | undefined) {
  if (!event || !userId) return false
  const normalizedUserId = normalizeAccountId(userId)
  const normalizedHost = event.host ? normalizeAccountId(event.host) : ''
  const participants = Array.isArray(event.participants) ? event.participants.map(entry => normalizeAccountId(String(entry))) : []
  return normalizedHost === normalizedUserId || participants.includes(normalizedUserId)
}

function findEventById(eventId: string) {
  return listEvents().find(event => String(event.id) === String(eventId)) || null
}

function getUnreadCountForThread(thread: MessageThread, userId: string) {
  const normalizedUserId = normalizeAccountId(userId)
  const lastReadAt = Number(thread.lastReadAtBy?.[normalizedUserId] || 0)
  return thread.messages.filter(message => message.senderId !== normalizedUserId && Number(message.sentAt || 0) > lastReadAt).length
}

function sortThreadSummaries(a: MessageThreadSummary, b: MessageThreadSummary) {
  return b.updatedAt - a.updatedAt || a.title.localeCompare(b.title)
}

export function ensureDirectMessageThread(userId: string, otherUserId: string) {
  const normalizedUserId = normalizeAccountId(userId)
  const normalizedOtherUserId = normalizeAccountId(otherUserId)
  if (!normalizedUserId || !normalizedOtherUserId || normalizedUserId === normalizedOtherUserId) return null

  const threadId = getDirectThreadId(normalizedUserId, normalizedOtherUserId)
  const threads = readMessageThreads().map(normalizeMessageThread)
  const existingIndex = threads.findIndex(thread => thread.id === threadId)
  const now = Date.now()
  const base: MessageThread = existingIndex >= 0 ? threads[existingIndex] : {
    id: threadId,
    type: 'direct',
    participantIds: uniqueIds([normalizedUserId, normalizedOtherUserId]),
    directUserIds: uniqueIds([normalizedUserId, normalizedOtherUserId]),
    messages: [],
    createdAt: now,
    updatedAt: now,
    lastReadAtBy: {
      [normalizedUserId]: now,
      [normalizedOtherUserId]: 0,
    },
  }
  const normalized = normalizeMessageThread(base)
  if (existingIndex >= 0) threads[existingIndex] = normalized
  else threads.push(normalized)
  writeMessageThreads(threads)
  emitMessagesUpdated({ threadId })
  return normalized
}

export function ensureEventMessageThread(eventId: string, userId: string) {
  const event = findEventById(eventId)
  if (!event || !canAccessEventChat(event, userId)) return null
  const normalizedUserId = normalizeAccountId(userId)
  const threadId = getEventThreadId(eventId)
  const threads = readMessageThreads().map(normalizeMessageThread)
  const existingIndex = threads.findIndex(thread => thread.id === threadId)
  const participantIds = uniqueIds([...(Array.isArray(event.participants) ? event.participants : []), event.host || ''])
  const now = Date.now()
  const existing = existingIndex >= 0 ? threads[existingIndex] : null
  const next: MessageThread = normalizeMessageThread({
    id: threadId,
    type: 'event',
    eventId,
    participantIds,
    messages: existing?.messages || [],
    createdAt: existing?.createdAt || now,
    updatedAt: existing?.updatedAt || now,
    lastReadAtBy: {
      ...(existing?.lastReadAtBy || {}),
      [normalizedUserId]: Number(existing?.lastReadAtBy?.[normalizedUserId] || now),
    },
  })
  if (existingIndex >= 0) threads[existingIndex] = next
  else threads.push(next)
  writeMessageThreads(threads)
  emitMessagesUpdated({ threadId })
  return next
}

export function markMessageThreadRead(threadId: string, userId: string) {
  try {
    const normalizedUserId = normalizeAccountId(userId)
    const threads = readMessageThreads().map(normalizeMessageThread)
    const index = threads.findIndex(thread => thread.id === threadId && thread.participantIds.includes(normalizedUserId))
    if (index === -1) return null
    threads[index] = {
      ...threads[index],
      lastReadAtBy: {
        ...(threads[index].lastReadAtBy || {}),
        [normalizedUserId]: Date.now(),
      },
    }
    writeMessageThreads(threads)
    emitMessagesUpdated({ threadId })
    return threads[index]
  } catch {
    return null
  }
}

export function sendMessageToThread(threadId: string, userId: string, body: string) {
  try {
    const normalizedUserId = normalizeAccountId(userId)
    const text = String(body || '').trim()
    if (!normalizedUserId || !text) return null
    const threads = readMessageThreads().map(normalizeMessageThread)
    const index = threads.findIndex(thread => thread.id === threadId && thread.participantIds.includes(normalizedUserId))
    if (index === -1) return null
    const now = Date.now()
    const nextMessage: MessageRecord = {
      id: 'msg_' + Math.random().toString(36).slice(2, 10),
      senderId: normalizedUserId,
      body: text,
      sentAt: now,
    }
    threads[index] = normalizeMessageThread({
      ...threads[index],
      messages: [...threads[index].messages, nextMessage],
      updatedAt: now,
      lastReadAtBy: {
        ...(threads[index].lastReadAtBy || {}),
        [normalizedUserId]: now,
      },
    })
    writeMessageThreads(threads)
    emitMessagesUpdated({ threadId })
    return threads[index]
  } catch {
    return null
  }
}

export function getMessageThread(threadId: string, userId: string) {
  const normalizedUserId = normalizeAccountId(userId)
  const thread = readMessageThreads().map(normalizeMessageThread).find(entry => entry.id === threadId && entry.participantIds.includes(normalizedUserId)) || null
  return thread
}

export function getAccessibleMessageThreads(userId: string): MessageThreadSummary[] {
  const normalizedUserId = normalizeAccountId(userId)
  if (!normalizedUserId) return []

  const threads = readMessageThreads().map(normalizeMessageThread)
  const summaries: MessageThreadSummary[] = []

  for (const thread of threads) {
    if (!thread.participantIds.includes(normalizedUserId)) continue
    if (thread.type === 'direct') {
      const otherUserId = (thread.directUserIds || thread.participantIds).find(id => id !== normalizedUserId)
      if (!otherUserId) continue
      summaries.push({
        id: thread.id,
        type: 'direct',
        title: getPublicIdentityLabel(otherUserId),
        subtitle: thread.messages.length ? thread.messages[thread.messages.length - 1].body : 'Direct message',
        updatedAt: thread.updatedAt,
        unreadCount: getUnreadCountForThread(thread, normalizedUserId),
        otherUserId,
      })
    }
  }

  const events = listEvents().filter(event => canAccessEventChat(event, normalizedUserId))
  for (const event of events) {
    const threadId = getEventThreadId(event.id)
    const existing = threads.find(thread => thread.id === threadId)
    const lastMessage = existing?.messages?.[existing.messages.length - 1]
    summaries.push({
      id: threadId,
      type: 'event',
      title: event.title || event.activity || 'Event chat',
      subtitle: lastMessage?.body || 'Event group chat',
      updatedAt: existing?.updatedAt || Number(event.updatedAt || event.createdAt || 0),
      unreadCount: existing ? getUnreadCountForThread(existing, normalizedUserId) : 0,
      eventId: event.id,
    })
  }

  const merged = new Map<string, MessageThreadSummary>()
  for (const summary of summaries) merged.set(summary.id, summary)
  return Array.from(merged.values()).sort(sortThreadSummaries)
}

export function getUnreadMessageCount(userId: string) {
  return getAccessibleMessageThreads(userId).reduce((sum, thread) => sum + thread.unreadCount, 0)
}

export function listDraftSessions(userId?: string): StoredDraftSession[] {
  try {
    const all = readStoredDraftSessions()
    if (!userId) return all
    const lowId = String(userId).toLowerCase()
    return all.filter(item => String(item.host || '').toLowerCase() === lowId)
  } catch {
    return []
  }
}

export function saveDraftSession(draft: EventDraft & { host: string; id?: string; templateName?: string }) {
  try {
    const all = readStoredDraftSessions()
    const now = Date.now()
    const id = draft.id ?? ('draft_' + Math.random().toString(36).slice(2, 9))
    const existing = all.find(item => item.id === id)
    const item: StoredDraftSession = {
      ...draft,
      id,
      host: draft.host,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      isDraft: true,
      templateName: draft.templateName,
    }
    const idx = all.findIndex(entry => entry.id === id)
    if (idx >= 0) all[idx] = item
    else all.push(item)
    writeStoredDraftSessions(all)
    try {
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('demo1_events_updated', { detail: item }))
      }
    } catch {}
    return item
  } catch {
    return null
  }
}

export function deleteDraftSession(draftId: string) {
  try {
    const all = readStoredDraftSessions()
    writeStoredDraftSessions(all.filter(item => item.id !== draftId))
    try {
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('demo1_events_updated', { detail: { id: draftId, deletedDraft: true } }))
      }
    } catch {}
  } catch {}
}

export type EventItem = EventDraft & { id: string; createdAt: number }

export function saveEvent(event: EventDraft) {
  try {
    const raw = localStorage.getItem(EVENTS_KEY)
    const arr: EventItem[] = raw ? JSON.parse(raw) : []
    const id = event.id ?? 'evt_' + Math.random().toString(36).slice(2,9)
    const normalizedEvent: any = normalizeEventRecord({ ...(event as any) })
    try {
      if (normalizedEvent.description) normalizedEvent.description = sanitizeText(String(normalizedEvent.description))
    } catch (e) { /* ignore sanitization errors */ }
    // Ensure host has an associated profile. If not, create a minimal one so
    // UIs can always resolve a displayName from the profile. We do this
    // synchronously to avoid breaking callers that expect saveEvent to be
    // synchronous.
    try {
      const hostId = normalizedEvent.host && String(normalizedEvent.host).trim()
      if (hostId) {
        const existing = getProfile(hostId)
        if (!existing) {
          let derived = deriveUsernameFromId(hostId)
          if (!derived) derived = hostId
          const prof: Profile = {
            id: hostId,
            tags: [],
            username: derived,
            preferredName: derived,
            aboutPublic: false,
            completedAt: undefined,
          }
          try { saveProfile(prof) } catch (e) { /* ignore */ }
        } else {
          // if profile exists but organiserName supplied, prefer profile.displayName later
        }
      }
    } catch (e) { /* ignore profile creation errors */ }

    // Build the final stored item. organiserName should reflect the profile's
    // displayName (if available) so UIs can rely on profiles as single source
    // of truth for public names.
    const profForName = normalizedEvent.host ? getProfile(String(normalizedEvent.host).trim()) : null
    const organiserNameFromProfile = normalizedEvent.host ? getPublicUsername(String(normalizedEvent.host).trim(), profForName) : undefined

    const item: EventItem = normalizeEventRecord({ ...normalizedEvent, id, createdAt: Date.now(), organiserName: organiserNameFromProfile })
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
    // If we have coordinates but no human-friendly location name, try to
    // resolve it in the background using OpenStreetMap/Nominatim and update
    // the stored event when a nicer name is available.
    try { reverseGeocodeAndUpdate(item.id) } catch (e) { /* ignore */ }
    return item
  } catch (e) {
    console.warn('[AuthService] saveEvent failed', e)
    return null
  }
}

// Small sleep helper used to rate-limit Nominatim requests (keep ~1s between queries)
function sleep(ms: number) { return new Promise(res => setTimeout(res, ms)) }

// Best-effort reverse geocode: given an event id, try to resolve the stored
// locationCoords to a human-friendly place name using Nominatim (OpenStreetMap).
// If successful, update the event location in storage. This returns a Promise
// and can be awaited by callers. We include a User-Agent header to satisfy
// Nominatim's API usage policy and avoid concurrent floods by letting callers
// sequence requests with a small delay.
async function reverseGeocodeAndUpdate(eventId: string) {
  try {
    const raw = localStorage.getItem(EVENTS_KEY)
    if (!raw) return
    const arr: EventItem[] = JSON.parse(raw)
    const idx = arr.findIndex(e => e.id === eventId)
    if (idx === -1) return
    const ev = arr[idx]
    if (!ev || !ev.locationCoords) return
    const lat = Number((ev.locationCoords as any).lat)
    const lon = Number((ev.locationCoords as any).lon)
    if (isNaN(lat) || isNaN(lon)) return

    try {
      // Browsers disallow setting the User-Agent header; include an email
      // parameter per Nominatim usage guidance so the service can identify
      // the client if needed.
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lon))}&zoom=16&addressdetails=0&email=contact@example.com`
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } })
      if (!res.ok) return
      const data = await res.json()
      if (data && data.display_name && typeof data.display_name === 'string') {
        const display = data.display_name
        if (!ev.location || String(ev.location).trim() !== String(display).trim()) {
          ev.location = display
          arr[idx] = ev
          localStorage.setItem(EVENTS_KEY, JSON.stringify(arr))
          try { if (typeof window !== 'undefined' && window.dispatchEvent) window.dispatchEvent(new CustomEvent('demo1_events_updated', { detail: ev })) } catch (e) {}
        }
      }
    } catch (e) {
      // ignore fetch errors
    }
  } catch (e) {
    // ignore
  }
}

// Public helper: reconcile stored events to ensure location names match their
// coordinates where possible. This runs background reverse-geocoding for each
// event that has coordinates.
export async function reconcileEventLocations() {
  try {
    const raw = localStorage.getItem(EVENTS_KEY)
    if (!raw) return
    const arr: EventItem[] = JSON.parse(raw)
    // Process events sequentially to avoid hitting Nominatim rate limits.
    for (const e of arr) {
      if (e && e.locationCoords && typeof (e.locationCoords as any).lat === 'number' && typeof (e.locationCoords as any).lon === 'number') {
        try { await reverseGeocodeAndUpdate(e.id) } catch (err) { /* ignore */ }
        // polite rate limit: wait ~1.1s between requests
        try { await sleep(1100) } catch (e) { /* ignore */ }
      }
    }
  } catch (e) { /* ignore */ }
}

export function addParticipant(eventId: string, participantId: string) {
  try {
    const raw = localStorage.getItem(EVENTS_KEY)
    const arr: EventItem[] = raw ? JSON.parse(raw) : []
    const idx = arr.findIndex(e => e.id === eventId)
    if (idx === -1) return null
    const ev = arr[idx]
    const normalizedParticipantId = normalizeAccountId(participantId)
    ev.participants = Array.isArray(ev.participants) ? ev.participants.map((p:any)=>normalizeAccountId(String(p))) : []
    if (!ev.participants.includes(normalizedParticipantId)) ev.participants.push(normalizedParticipantId)
    const profile = getProfile(normalizedParticipantId)
    ev.participantDetails = Array.isArray(ev.participantDetails) ? ev.participantDetails.filter((entry: any) => normalizeAccountId(entry?.userId || '') !== normalizedParticipantId) : []
    ev.participantDetails.push({
      userId: normalizedParticipantId,
      username: getPublicUsername(normalizedParticipantId, profile),
      preferredName: getPreferredName(normalizedParticipantId, profile),
      preferredNameVisibleToParticipants: !!profile?.sharePreferredNameWithParticipants,
    })
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
    const normalizedParticipantId = normalizeAccountId(participantId)
    ev.participants = Array.isArray(ev.participants) ? ev.participants.filter((p:any) => normalizeAccountId(String(p)) !== normalizedParticipantId) : []
    ev.participantDetails = Array.isArray(ev.participantDetails) ? ev.participantDetails.filter((entry: any) => normalizeAccountId(entry?.userId || '') !== normalizedParticipantId) : []
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
    const arr: EventItem[] = raw ? JSON.parse(raw) : []
    // For viewers who are not the event host, redact any emails/phones that
    // might remain in the description (from legacy data). This prevents
    // accidental leakage of contact details in the UI.
    try {
      const viewer = getLoggedInUser()
      const normalizedEvents = arr.map(ev => normalizeEventRecord(ev))
      if (JSON.stringify(arr) !== JSON.stringify(normalizedEvents)) {
        localStorage.setItem(EVENTS_KEY, JSON.stringify(normalizedEvents))
      }
      return normalizedEvents.map(ev => {
        const normalizedHost = ev.host ? normalizeAccountId(String(ev.host)) : ''
        const baseEvent = ev
        if (viewer && normalizedHost === viewer) return baseEvent
        if (baseEvent.description) {
          return { ...baseEvent, description: sanitizeText(baseEvent.description) }
        }
        return baseEvent
      })
    } catch (e) {
      return arr
    }
  } catch { return [] }
}

export function saveProfileSkill(userId: string, tag: string, level: 'Beginner'|'Intermediate'|'Advanced') {
  const prof = getProfile(userId)
  if (!prof) return
  if (!prof.skillChecks) prof.skillChecks = {}
  prof.skillChecks[tag] = level
  saveProfile(prof)
}

export function applyToEvent(eventId: string, app: Application) {
  try {
    const raw = localStorage.getItem(EVENTS_KEY)
    const arr: EventItem[] = raw ? JSON.parse(raw) : []
    const idx = arr.findIndex(e => e.id === eventId)
    if (idx === -1) return null
    const ev = arr[idx]
    if (!ev.applications) ev.applications = []
    ev.participants = Array.isArray(ev.participants) ? ev.participants.map((p: any) => normalizeAccountId(String(p))) : []
    const normalizedUserId = normalizeAccountId(app.userId)
    if (ev.participants.includes(normalizedUserId)) return ev
    const profile = getProfile(normalizedUserId)
    const hydratedApplication: Application = {
      ...app,
      userId: normalizedUserId,
      username: app.username || getPublicUsername(normalizedUserId, profile),
      preferredName: app.preferredName || getPreferredName(normalizedUserId, profile),
      preferredNameVisibleToParticipants: !!(app.preferredNameVisibleToParticipants ?? app.isPublic),
    }

    // Check if max reached -> auto waitlist
    const approvedCount = ev.participants?.length || 0
    if (ev.participantsMax && approvedCount >= ev.participantsMax) {
      hydratedApplication.status = 'waitlisted'
    } else {
      hydratedApplication.status = 'pending'
    }

    const existingIndex = ev.applications.findIndex(a => normalizeAccountId(a.userId) === normalizedUserId)
    if (existingIndex >= 0) {
      ev.applications[existingIndex] = { ...ev.applications[existingIndex], ...hydratedApplication }
    } else {
      ev.applications.push(hydratedApplication)
    }

    arr[idx] = ev
    localStorage.setItem(EVENTS_KEY, JSON.stringify(arr))

    // Notify
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('demo1_events_updated', { detail: ev }))
    }

    // Prototype emulator: if pending, resolve later
    if (hydratedApplication.status === 'pending') {
      emulateApproval(eventId, hydratedApplication.userId)
    }

    return ev
  } catch (e) {
    return null
  }
}

export function reviewPendingApplication(eventId: string, userId: string, decision: 'approve' | 'reject') {
  try {
    const raw = localStorage.getItem(EVENTS_KEY)
    const arr: EventItem[] = raw ? JSON.parse(raw) : []
    const idx = arr.findIndex(e => e.id === eventId)
    if (idx === -1) return null

    const ev = normalizeEventRecord(arr[idx])
    const normalizedUserId = normalizeAccountId(userId)
    const appIndex = Array.isArray(ev.applications)
      ? ev.applications.findIndex(a => normalizeAccountId(a.userId) === normalizedUserId && a.status === 'pending')
      : -1

    if (appIndex === -1) return null

    const application = ev.applications[appIndex]
    let resolution: 'approved' | 'waitlisted' | 'denied' = 'denied'

    if (decision === 'approve') {
      const approvedCount = Array.isArray(ev.participants) ? ev.participants.length : 0
      if (ev.participantsMax && approvedCount >= ev.participantsMax) {
        ev.applications[appIndex] = { ...application, status: 'waitlisted' }
        resolution = 'waitlisted'
      } else {
        ev.participants = Array.isArray(ev.participants) ? ev.participants : []
        if (!ev.participants.includes(normalizedUserId)) ev.participants.push(normalizedUserId)
        ev.participantDetails = Array.isArray(ev.participantDetails) ? ev.participantDetails.filter((entry: any) => normalizeAccountId(entry?.userId || '') !== normalizedUserId) : []
        ev.participantDetails.push({
          userId: normalizedUserId,
          username: application.username,
          preferredName: application.preferredName,
          preferredNameVisibleToParticipants: !!application.preferredNameVisibleToParticipants,
          joinedAt: application.appliedAt,
        })
        ev.applications.splice(appIndex, 1)
        resolution = 'approved'
      }
    } else {
      ev.applications[appIndex] = { ...application, status: 'denied' }
      resolution = 'denied'
    }

    const normalizedEvent = normalizeEventRecord(ev)
    arr[idx] = normalizedEvent
    localStorage.setItem(EVENTS_KEY, JSON.stringify(arr))
    try {
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('demo1_events_updated', { detail: normalizedEvent }))
      }
    } catch {}

    return { event: normalizedEvent, status: resolution }
  } catch {
    return null
  }
}

function emulateApproval(eventId: string, userId: string) {
  const delay = Math.floor(Math.random() * (120000 - 30000) + 30000)
  setTimeout(() => {
    try {
      const raw = localStorage.getItem(EVENTS_KEY)
      if (!raw) return
      const arr: EventItem[] = JSON.parse(raw)
      const idx = arr.findIndex(e => e.id === eventId)
      if (idx === -1) return
      const ev = arr[idx]
      if (!ev.applications) return

      const appIndex = ev.applications.findIndex(a => a.userId === userId)
      if (appIndex === -1 || ev.applications[appIndex].status !== 'pending') return
      const application = ev.applications[appIndex]
      let resolution: 'approved' | 'waitlisted' | 'denied' = 'denied'

      let toggle = localStorage.getItem('demo1_emu_toggle') || 'approve'
      if (toggle === 'approve') {
        const approvedCount = ev.participants?.length || 0
        if (ev.participantsMax && approvedCount >= ev.participantsMax) {
          // Fallback to waitlisted if spot taken
          ev.applications[appIndex].status = 'waitlisted'
          resolution = 'waitlisted'
        } else {
          if (!ev.participants) ev.participants = []
          if (!ev.participants.includes(userId)) ev.participants.push(userId)
          ev.participantDetails = Array.isArray(ev.participantDetails) ? ev.participantDetails.filter((entry: any) => normalizeAccountId(entry?.userId || '') !== userId) : []
          ev.participantDetails.push({
            userId,
            username: application.username,
            preferredName: application.preferredName,
            preferredNameVisibleToParticipants: !!application.preferredNameVisibleToParticipants,
            joinedAt: application.appliedAt,
          })
          ev.applications.splice(appIndex, 1)
          resolution = 'approved'
        }
      } else {
        ev.applications[appIndex].status = 'denied'
        resolution = 'denied'
      }

      // switch toggle
      localStorage.setItem('demo1_emu_toggle', toggle === 'approve' ? 'deny' : 'approve')

      arr[idx] = ev
      localStorage.setItem(EVENTS_KEY, JSON.stringify(arr))

      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('demo1_events_updated', { detail: ev }))

        // Emulate toast
        const msg = resolution === 'waitlisted'
          ? 'Session is full; you are waitlisted.'
          : resolution === 'approved'
            ? `You have been approved for ${ev.title || 'the session'}`
            : `Your application to ${ev.title || 'the session'} was not successful.`

        alert(`Notification for ${userId}:\n\n${msg}\n\n(Note: This would be sent to server for later retrieval)`)
      }
    } catch {}
  }, delay)
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
      username: 'username',
      preferredName: 'Jamie',
      tags: ['outdoor', 'community'],
      about: 'Prototype organiser account (local only).',
      aboutPublic: true,
      completedAt: Date.now(),
      sharePreferredNameWithParticipants: false,
      skillChecks: {},
      vibes: ['friendly']
    })
  }
} catch (e) {
  // ignore errors during eager seeding
}
