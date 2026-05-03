export type Account = {
  id: string
  createdAt: number
  recoveryEmail?: string
}

const ACCOUNTS_KEY = 'demo1_accounts_v1'
const USER_KEY = 'demo1_user_v1'
const UNE_EMAIL_DOMAIN = 'une.edu.au'
const USERNAME_PATTERN = /^[a-z0-9._-]{3,}$/i

function looksLikePhone(value: string) {
  return /^[+\d][\d\s-]{6,}$/.test(value)
}

function normalizeEmail(value: string | null | undefined) {
  const trimmed = String(value || '').trim().toLowerCase()
  return /^\S+@\S+\.\S+$/.test(trimmed) ? trimmed : ''
}

function normalizePhoneLookup(value: string | null | undefined) {
  const trimmed = String(value || '').trim()
  if (!trimmed) return ''
  const normalized = trimmed.replace(/[\s-]+/g, '')
  return /^\+?\d{7,}$/.test(normalized) ? normalized : ''
}

function getLegacyUneAccountId(value: string) {
  const normalized = normalizeAccountId(value)
  if (!normalized || normalized.includes('@') || looksLikePhone(normalized)) return normalized
  return `${normalized}@${UNE_EMAIL_DOMAIN}`
}

export function normalizeAccountId(value: string) {
  const trimmed = String(value || '').trim()
  if (!trimmed) return ''
  if (looksLikePhone(trimmed)) return trimmed
  if (trimmed.includes('@')) {
    const lower = trimmed.toLowerCase()
    const [localPart, domain] = lower.split('@')
    if (domain === UNE_EMAIL_DOMAIN && USERNAME_PATTERN.test(localPart)) return localPart
    return lower
  }
  return trimmed.replace(/\s+/g, '').toLowerCase()
}

function deriveUsernameFromId(id: string) {
  const trimmed = String(id || '').trim()
  if (!trimmed) return ''
  if (trimmed.includes('@')) return trimmed.split('@')[0].trim().toLowerCase()
  return trimmed
}

function normalizeAccountRecord(account: any): Account | null {
  const id = normalizeAccountId(account?.id || '')
  if (!id) return null
  return {
    id,
    createdAt: Number(account?.createdAt || Date.now()),
    recoveryEmail: normalizeEmail(account?.recoveryEmail) || undefined,
  }
}

function readAccounts(): Account[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    const accounts = Array.isArray(parsed)
      ? parsed.map(normalizeAccountRecord).filter((account): account is Account => !!account)
      : []
    if (JSON.stringify(parsed) !== JSON.stringify(accounts)) {
      writeAccounts(accounts)
    }
    return accounts
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

export function findAccountIdByIdentifier(value: string): string {
  const trimmed = String(value || '').trim()
  if (!trimmed) return ''

  const accounts = readAccounts()
  const normalizedId = normalizeAccountId(trimmed)
  const directMatch = accounts.find(account => account.id === normalizedId)
  if (directMatch) return directMatch.id

  const normalizedEmail = normalizeEmail(trimmed)
  if (normalizedEmail) {
    const recoveryMatch = accounts.find(account => normalizeEmail(account.recoveryEmail) === normalizedEmail)
    if (recoveryMatch) return recoveryMatch.id

    const profileEmailMatch = accounts.find(account => normalizeEmail(getProfile(account.id)?.email) === normalizedEmail)
    if (profileEmailMatch) return profileEmailMatch.id
  }

  const normalizedPhone = normalizePhoneLookup(trimmed)
  if (normalizedPhone) {
    const phoneMatch = accounts.find(account => normalizePhoneLookup(getProfile(account.id)?.phone) === normalizedPhone)
    if (phoneMatch) return phoneMatch.id
  }

  return ''
}

export function getAccountRecoveryEmail(id: string): string {
  const normalizedId = normalizeAccountId(id)
  if (!normalizedId) return ''
  return normalizeEmail(readAccounts().find(account => account.id === normalizedId)?.recoveryEmail) || ''
}

export function registerAccount(id: string, recoveryEmail?: string) {
  const normalizedId = normalizeAccountId(id)
  if (!normalizedId) throw new Error('Invalid id')
  const normalizedRecoveryEmail = normalizeEmail(recoveryEmail)
  const accounts = readAccounts()
  const existingIndex = accounts.findIndex(a => normalizeAccountId(a.id) === normalizedId)
  if (existingIndex >= 0) {
    if (normalizedRecoveryEmail && accounts[existingIndex].recoveryEmail !== normalizedRecoveryEmail) {
      accounts[existingIndex] = { ...accounts[existingIndex], recoveryEmail: normalizedRecoveryEmail }
      writeAccounts(accounts)
    }
    return normalizedId
  }
  accounts.push({ id: normalizedId, createdAt: Date.now(), recoveryEmail: normalizedRecoveryEmail || undefined })
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
const APP_SETTINGS_KEY = 'demo1_app_settings_v1'
const MESSAGE_THREADS_KEY = 'demo1_message_threads_v1'
const PARTICIPANT_REVIEWS_KEY = 'demo1_participant_reviews_v1'
const HOST_WRAPUPS_KEY = 'demo1_host_wrapups_v1'
const SKILL_SUGGESTIONS_KEY = 'demo1_skill_suggestions_v1'
const INCIDENT_REPORTS_KEY = 'demo1_incident_reports_v1'
const FRIEND_REQUESTS_KEY = 'demo1_friend_requests_v1'
const REVIEW_WINDOW_MS = 7 * 24 * 60 * 60 * 1000
const REVIEW_LATER_MS = 24 * 60 * 60 * 1000

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
  skillChecks?: { [tag: string]: SkillLevel }
  // optional list of "vibes" (social/contextual tags)
  vibes?: string[]
  rating?: number
  photoDataUrl?: string | null
  avatarDataUrl?: string | null
  avatarUrl?: string | null
  friendIds?: string[]
  privacy?: ProfilePrivacySettings
  colorScheme?: 'orange-blue' | 'green-gold' | 'light-blue-darkblue' | 'greyscale'
}

export type ThemeColorScheme = 'orange-blue' | 'green-gold' | 'light-blue-darkblue' | 'greyscale'
export type ProfileSectionKey = 'interests' | 'vibes' | 'about' | 'demographic' | 'contact' | 'hostHistory' | 'participantHistory' | 'reviews'
export type ProfileSectionVisibility = 'private' | 'hosts' | 'public'
export type ProfilePrivacySettings = Partial<Record<ProfileSectionKey, ProfileSectionVisibility>>

export type ProfileAccessContext = {
  source?: 'session_host_cards'
  eventId?: string
  relation?: 'participant' | 'application'
}

export type AppSettings = {
  userId: string
  colorScheme?: ThemeColorScheme
}

export type ProfileReviewEntry = {
  id: string
  type: 'host' | 'participant'
  eventId: string
  eventTitle: string
  reviewerLabel: string
  createdAt: number
  rating?: number
  body?: string
  isAnonymous?: boolean
  suggestedSkillLevel?: SkillLevel
}

export type SkillLevel = 'No experience' | 'Beginner' | 'Intermediate' | 'Advanced'

export type EventLocationCoords = {
  lat: number
  lon: number
}

export type Application = {
  userId: string
  status: 'pending' | 'approved' | 'waitlisted' | 'denied'
  message?: string
  isPublic?: boolean
  username?: string
  preferredName?: string
  preferredNameVisibleToParticipants?: boolean
  skillLevel?: SkillLevel
  appliedAt: number
  feedback?: string
  waitlistReason?: 'capacity' | 'pending_review'
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

export type ParticipantReviewRecord = {
  eventId: string
  userId: string
  hostId: string
  checkedIn?: boolean
  hostRating?: number
  anonymousHostRating?: boolean
  feedback?: string
  submittedAt?: number
  reviewLaterUntil?: number
  updatedAt: number
}

export type SessionRecommendation = {
  score: number
  badgeCount: number
  badge: string
  reasons: string[]
}

export type HostWrapUpEntry = {
  userId: string
  didAttend: boolean
  currentSkillLevel?: SkillLevel
  suggestedSkillLevel?: SkillLevel
  feedback?: string
  updatedAt: number
}

export type HostWrapUpRecord = {
  eventId: string
  hostId: string
  activity?: string
  submittedAt: number
  updatedAt: number
  participants: HostWrapUpEntry[]
}

export type SkillSuggestionRecord = {
  id: string
  eventId: string
  userId: string
  hostId: string
  activity: string
  currentSkillLevel?: SkillLevel
  suggestedSkillLevel: SkillLevel
  feedback?: string
  createdAt: number
  updatedAt: number
  appliedAt?: number
  reviewLaterUntil?: number
}

export type IncidentReportRecord = {
  id: string
  eventId: string
  userId: string
  reporterRole: 'participant' | 'host'
  category: string
  details: string
  createdAt: number
}

export type PendingAction = {
  id: string
  type: 'approval' | 'participantReview' | 'hostWrapUp' | 'skillSuggestion' | 'incidentReport' | 'friendRequest'
  eventId?: string
  fromUserId?: string
  title: string
  subtitle: string
  waitedSince: number
}

export type FriendRequest = {
  id: string
  fromUserId: string
  toUserId: string
  sentAt: number
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

function normalizeColorScheme(value?: string | null): ThemeColorScheme {
  return (value === 'green-gold' || value === 'light-blue-darkblue' || value === 'greyscale' || value === 'orange-blue') ? value : 'orange-blue'
}

function normalizeProfileSectionVisibility(section: ProfileSectionKey, value?: string | null): ProfileSectionVisibility {
  if (section === 'demographic' || section === 'contact') {
    return value === 'hosts' ? 'hosts' : 'private'
  }
  return (value === 'hosts' || value === 'public' || value === 'private') ? value : 'private'
}

function normalizeProfilePrivacy(profile: Profile | null | undefined): ProfilePrivacySettings {
  return {
    interests: normalizeProfileSectionVisibility('interests', profile?.privacy?.interests ?? 'public'),
    vibes: normalizeProfileSectionVisibility('vibes', profile?.privacy?.vibes ?? 'public'),
    about: normalizeProfileSectionVisibility('about', profile?.privacy?.about ?? (profile?.aboutPublic ? 'public' : 'private')),
    demographic: normalizeProfileSectionVisibility('demographic', profile?.privacy?.demographic ?? 'private'),
    contact: normalizeProfileSectionVisibility('contact', profile?.privacy?.contact ?? 'private'),
    hostHistory: normalizeProfileSectionVisibility('hostHistory', profile?.privacy?.hostHistory ?? 'public'),
    participantHistory: normalizeProfileSectionVisibility('participantHistory', profile?.privacy?.participantHistory ?? 'private'),
    reviews: normalizeProfileSectionVisibility('reviews', profile?.privacy?.reviews ?? 'public'),
  }
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
    privacy: normalizeProfilePrivacy(profile),
    aboutPublic: normalizeProfilePrivacy(profile).about === 'public',
    sharePreferredNameWithParticipants: !!profile.sharePreferredNameWithParticipants,
    friendIds: uniqueIds(Array.isArray(profile.friendIds) ? profile.friendIds.map(item => String(item)) : []),
    colorScheme: normalizeColorScheme(profile.colorScheme),
  }
}

function getAppSettingsStorageKey(userId: string) {
  return `${APP_SETTINGS_KEY}_${normalizeAccountId(userId)}`
}

export function getAppSettings(userId?: string | null): AppSettings | null {
  const normalizedUserId = normalizeAccountId(String(userId || ''))
  if (!normalizedUserId) return null
  try {
    const raw = localStorage.getItem(getAppSettingsStorageKey(normalizedUserId))
    if (!raw) {
      const profile = getProfile(normalizedUserId)
      return { userId: normalizedUserId, colorScheme: normalizeColorScheme(profile?.colorScheme) }
    }
    const parsed = JSON.parse(raw)
    return {
      userId: normalizedUserId,
      colorScheme: normalizeColorScheme(parsed?.colorScheme),
    }
  } catch {
    return { userId: normalizedUserId, colorScheme: 'orange-blue' }
  }
}

export function saveAppSettings(userId: string, settings: AppSettings) {
  const normalizedUserId = normalizeAccountId(userId)
  if (!normalizedUserId) return null
  const next: AppSettings = {
    userId: normalizedUserId,
    colorScheme: normalizeColorScheme(settings?.colorScheme),
  }
  localStorage.setItem(getAppSettingsStorageKey(normalizedUserId), JSON.stringify(next))
  try {
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('demo1_app_settings_updated', { detail: { userId: normalizedUserId } }))
    }
  } catch {}
  return next
}

export function getProfileSectionVisibility(profile: Profile | null | undefined, section: ProfileSectionKey): ProfileSectionVisibility {
  return normalizeProfilePrivacy(profile)[section]
}

function canViewHostOnlyProfileSectionWithContext(
  viewerId: string | null | undefined,
  profileOwnerId: string,
  context?: ProfileAccessContext,
) {
  const normalizedViewerId = normalizeAccountId(String(viewerId || ''))
  const normalizedOwnerId = normalizeAccountId(profileOwnerId)
  if (!normalizedViewerId || !normalizedOwnerId || normalizedViewerId === normalizedOwnerId) return false
  if (!context || context.source !== 'session_host_cards' || !context.eventId) return false

  const event = listEvents().find(entry => String(entry?.id) === String(context.eventId))
  if (!event) return false
  if (normalizeAccountId(event.host || '') !== normalizedViewerId) return false

  const participantMatch = Array.isArray(event.participants)
    && event.participants.some((entry: any) => normalizeAccountId(String(entry)) === normalizedOwnerId)
  const applicationMatch = Array.isArray(event.applications)
    && event.applications.some((entry: any) => normalizeAccountId(entry?.userId || '') === normalizedOwnerId)

  if (context.relation === 'participant') return participantMatch
  if (context.relation === 'application') return applicationMatch
  return participantMatch || applicationMatch
}

export function canViewProfileSection(
  profileOwnerId: string,
  viewerId: string | null | undefined,
  section: ProfileSectionKey,
  profile?: Profile | null,
  context?: ProfileAccessContext,
) {
  const normalizedOwnerId = normalizeAccountId(profileOwnerId)
  const normalizedViewerId = normalizeAccountId(String(viewerId || ''))
  if (!normalizedOwnerId) return false
  if (normalizedViewerId && normalizedViewerId === normalizedOwnerId) return true
  const visibility = getProfileSectionVisibility(profile ?? getProfile(normalizedOwnerId), section)
  if (visibility === 'public') return true
  if (visibility === 'hosts') return canViewHostOnlyProfileSectionWithContext(normalizedViewerId, normalizedOwnerId, context)
  return false
}

function sortEventsByStartDesc(a: any, b: any) {
  return (getEventStartTimestamp(b) || b?.createdAt || 0) - (getEventStartTimestamp(a) || a?.createdAt || 0)
}

function isEventVisibleInProfileHistory(event: any, profileOwnerId: string, viewerId: string | null | undefined) {
  const normalizedOwnerId = normalizeAccountId(profileOwnerId)
  const normalizedViewerId = normalizeAccountId(String(viewerId || ''))
  if (normalizedViewerId && normalizedViewerId === normalizedOwnerId) return true
  return String(event?.visibility || 'Public') === 'Public'
}

export function listHostedSessionsForProfile(profileOwnerId: string, viewerId?: string | null) {
  const normalizedOwnerId = normalizeAccountId(profileOwnerId)
  return listEvents()
    .filter(event => normalizeAccountId(event?.host || '') === normalizedOwnerId)
    .filter(event => isEventVisibleInProfileHistory(event, normalizedOwnerId, viewerId))
    .sort(sortEventsByStartDesc)
}

export function listParticipantSessionsForProfile(profileOwnerId: string, viewerId?: string | null) {
  const normalizedOwnerId = normalizeAccountId(profileOwnerId)
  return listEvents()
    .filter(event => Array.isArray(event?.participants) && event.participants.some((entry: any) => normalizeAccountId(String(entry)) === normalizedOwnerId))
    .filter(event => isEventVisibleInProfileHistory(event, normalizedOwnerId, viewerId))
    .sort(sortEventsByStartDesc)
}

export function listProfileReviews(profileOwnerId: string): ProfileReviewEntry[] {
  const normalizedOwnerId = normalizeAccountId(profileOwnerId)
  if (!normalizedOwnerId) return []

  const hostReviews: ProfileReviewEntry[] = readStoredList<ParticipantReviewRecord>(PARTICIPANT_REVIEWS_KEY)
    .filter(record => normalizeAccountId(record.hostId) === normalizedOwnerId)
    .filter(record => typeof record.submittedAt === 'number')
    .map(record => {
      const event = findEventById(record.eventId)
      return {
        id: `host_review:${record.eventId}:${record.userId}`,
        type: 'host',
        eventId: record.eventId,
        eventTitle: event?.title || event?.activity || 'Session',
        reviewerLabel: record.anonymousHostRating ? 'Anonymous participant' : getPublicIdentityLabel(record.userId),
        createdAt: Number(record.submittedAt || record.updatedAt || 0),
        rating: typeof record.hostRating === 'number' ? record.hostRating : undefined,
        body: record.feedback,
        isAnonymous: !!record.anonymousHostRating,
      }
    })

  const participantReviews: ProfileReviewEntry[] = readStoredList<HostWrapUpRecord>(HOST_WRAPUPS_KEY)
    .flatMap(record => record.participants
      .filter(entry => normalizeAccountId(entry.userId) === normalizedOwnerId)
      .filter(entry => !!entry.feedback || !!entry.suggestedSkillLevel)
      .map(entry => {
        const event = findEventById(record.eventId)
        return {
          id: `participant_review:${record.eventId}:${record.hostId}:${entry.userId}`,
          type: 'participant',
          eventId: record.eventId,
          eventTitle: event?.title || event?.activity || record.activity || 'Session',
          reviewerLabel: getPublicIdentityLabel(record.hostId),
          createdAt: Number(entry.updatedAt || record.updatedAt || record.submittedAt || 0),
          body: entry.feedback,
          suggestedSkillLevel: entry.suggestedSkillLevel,
        }
      }))

  return [...hostReviews, ...participantReviews].sort((a, b) => b.createdAt - a.createdAt)
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
    const primaryKey = PROFILE_KEY + '_' + normalizedId
    let raw = localStorage.getItem(primaryKey)
    if (!raw) {
      const legacyId = getLegacyUneAccountId(id)
      if (legacyId && legacyId !== normalizedId) {
        const legacyKey = PROFILE_KEY + '_' + legacyId
        raw = localStorage.getItem(legacyKey)
        if (raw) {
          try {
            const migrated = normalizeProfile(JSON.parse(raw) as Profile)
            if (migrated) {
              localStorage.setItem(primaryKey, JSON.stringify(migrated))
              localStorage.removeItem(legacyKey)
              raw = localStorage.getItem(primaryKey)
            }
          } catch {
            // ignore migration issues and continue with legacy value
          }
        }
      }
    }
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
  try {
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('demo1_profile_updated', { detail: { id: normalized.id } }))
    }
  } catch {}
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
  recoveryEmail?: string
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
  locationCoords?: EventLocationCoords
  date?: string
  startTime?: string
  endTime?: string
  duration?: number
  visibility?: 'Public'|'Friends'|'Invitation only'
  description?: string
  suggestedExperience?: SkillLevel | undefined
  participantsMin?: number
  participantsMax?: number
  cost?: string
  costValue?: number
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

function uniqueStrings(values: Array<string | null | undefined>) {
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of values) {
    const trimmed = String(value || '').trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(trimmed)
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

export function parseEventCostValue(cost?: string | number | null): number | undefined {
  if (typeof cost === 'number' && !Number.isNaN(cost)) return Math.max(0, cost)
  const raw = String(cost || '').trim()
  if (!raw) return undefined
  if (/^free$/i.test(raw)) return 0
  const match = raw.match(/-?\d+(?:\.\d+)?/)
  if (!match) return undefined
  const parsed = Number(match[0])
  return Number.isNaN(parsed) ? undefined : Math.max(0, parsed)
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
  const duration = typeof event?.duration === 'number' && !Number.isNaN(event.duration) ? Math.max(0, Number(event.duration)) : undefined
  const costValue = parseEventCostValue((event as any)?.costValue ?? event?.cost)
  const locationCoords = (event as any)?.locationCoords && (event as any).locationCoords.lat !== undefined && (event as any).locationCoords.lon !== undefined
    ? {
        lat: Number((event as any).locationCoords.lat),
        lon: Number((event as any).locationCoords.lon),
      }
    : undefined
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
    locationCoords: locationCoords && !Number.isNaN(locationCoords.lat) && !Number.isNaN(locationCoords.lon) ? locationCoords : undefined,
    duration,
    participantsMin: normalizedParticipantsMin,
    participantsMax,
    costValue,
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
  if (existingIndex >= 0) {
    const existing = threads[existingIndex]
    if (JSON.stringify(existing) === JSON.stringify(normalized)) {
      return existing
    }
  }
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
  if (existingIndex >= 0) {
    const current = threads[existingIndex]
    if (JSON.stringify(current) === JSON.stringify(next)) {
      return current
    }
  }
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
    const latestIncoming = threads[index].messages
      .filter(message => message.senderId !== normalizedUserId)
      .reduce((latest, message) => Math.max(latest, Number(message.sentAt || 0)), 0)
    const currentReadAt = Number(threads[index].lastReadAtBy?.[normalizedUserId] || 0)
    if (latestIncoming <= currentReadAt) return threads[index]
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

export function addFriendToProfile(userId: string, friendId: string) {
  const normalizedUserId = normalizeAccountId(userId)
  const normalizedFriendId = normalizeAccountId(friendId)
  if (!normalizedUserId || !normalizedFriendId || normalizedUserId === normalizedFriendId) return null
  const userProfile = getProfile(normalizedUserId)
  const friendProfile = getProfile(normalizedFriendId)
  if (!userProfile || !friendProfile) return null
  const userFriends = uniqueIds([...(userProfile.friendIds || []), normalizedFriendId])
  const friendFriends = uniqueIds([...(friendProfile.friendIds || []), normalizedUserId])
  saveProfile({ ...userProfile, friendIds: userFriends })
  saveProfile({ ...friendProfile, friendIds: friendFriends })
  return userFriends
}

export function getFriendIds(userId: string) {
  return uniqueIds(getProfile(userId)?.friendIds || [])
}

function emitFriendRequestsUpdated(detail?: object) {
  try { window.dispatchEvent(new CustomEvent('demo1_friend_requests_updated', { detail: detail || {} })) } catch {}
}

export function sendFriendRequest(fromUserId: string, toUserId: string): FriendRequest | null {
  const from = normalizeAccountId(fromUserId)
  const to = normalizeAccountId(toUserId)
  if (!from || !to || from === to) return null
  // Already friends — no request needed
  if (getFriendIds(from).includes(to)) return null
  const requests = readStoredList<FriendRequest>(FRIEND_REQUESTS_KEY)
  // Already have a pending request
  if (requests.some(r => normalizeAccountId(r.fromUserId) === from && normalizeAccountId(r.toUserId) === to)) return null
  const req: FriendRequest = {
    id: 'fr_' + Math.random().toString(36).slice(2, 10),
    fromUserId: from,
    toUserId: to,
    sentAt: Date.now(),
  }
  requests.push(req)
  writeStoredList(FRIEND_REQUESTS_KEY, requests)
  emitFriendRequestsUpdated({ fromUserId: from, toUserId: to })
  return req
}

export function acceptFriendRequest(userId: string, fromUserId: string) {
  const to = normalizeAccountId(userId)
  const from = normalizeAccountId(fromUserId)
  if (!to || !from) return false
  const requests = readStoredList<FriendRequest>(FRIEND_REQUESTS_KEY)
  const idx = requests.findIndex(r => normalizeAccountId(r.fromUserId) === from && normalizeAccountId(r.toUserId) === to)
  if (idx === -1) return false
  requests.splice(idx, 1)
  writeStoredList(FRIEND_REQUESTS_KEY, requests)
  addFriendToProfile(to, from)
  emitFriendRequestsUpdated({ fromUserId: from, toUserId: to, accepted: true })
  return true
}

export function declineFriendRequest(userId: string, fromUserId: string) {
  const to = normalizeAccountId(userId)
  const from = normalizeAccountId(fromUserId)
  if (!to || !from) return false
  const requests = readStoredList<FriendRequest>(FRIEND_REQUESTS_KEY)
  const filtered = requests.filter(r => !(normalizeAccountId(r.fromUserId) === from && normalizeAccountId(r.toUserId) === to))
  writeStoredList(FRIEND_REQUESTS_KEY, filtered)
  emitFriendRequestsUpdated({ fromUserId: from, toUserId: to, declined: true })
  return true
}

export function getPendingFriendRequests(userId: string): FriendRequest[] {
  const normalized = normalizeAccountId(userId)
  if (!normalized) return []
  return readStoredList<FriendRequest>(FRIEND_REQUESTS_KEY)
    .filter(r => normalizeAccountId(r.toUserId) === normalized)
}

export function hasSentFriendRequest(fromUserId: string, toUserId: string): boolean {
  const from = normalizeAccountId(fromUserId)
  const to = normalizeAccountId(toUserId)
  if (!from || !to) return false
  return readStoredList<FriendRequest>(FRIEND_REQUESTS_KEY)
    .some(r => normalizeAccountId(r.fromUserId) === from && normalizeAccountId(r.toUserId) === to)
}

export function isFriendWith(userId: string, targetId: string): boolean {
  return getFriendIds(normalizeAccountId(userId)).includes(normalizeAccountId(targetId))
}

export function getSessionRecommendation(userId: string | null | undefined, event: any): SessionRecommendation {
  if (!userId || !event) return { score: 0, badgeCount: 0, badge: '', reasons: [] }
  const normalizedUserId = normalizeAccountId(userId)
  const profile = getProfile(normalizedUserId)
  if (!profile) return { score: 0, badgeCount: 0, badge: '', reasons: [] }

  let score = 0
  const reasons: string[] = []

  const highRatedHosts = readStoredList<ParticipantReviewRecord>(PARTICIPANT_REVIEWS_KEY)
    .filter(record => normalizeAccountId(record.userId) === normalizedUserId)
    .filter(record => typeof record.hostRating === 'number' && Number(record.hostRating) >= 4)
    .map(record => normalizeAccountId(record.hostId))
  if (event.host && highRatedHosts.includes(normalizeAccountId(event.host))) {
    score += 2
    reasons.push('Highly rated host')
  }

  const friendIds = getFriendIds(normalizedUserId)
  const participantIds = uniqueIds([
    ...(Array.isArray(event.participants) ? event.participants : []),
    ...(Array.isArray(event.applications) ? event.applications.filter((app: any) => app.status !== 'denied').map((app: any) => app.userId) : []),
  ])
  const friendsJoining = participantIds.filter(id => friendIds.includes(id))
  if (friendsJoining.length > 0) {
    score += Math.min(2, friendsJoining.length)
    reasons.push(friendsJoining.length === 1 ? 'Friend participating' : `${friendsJoining.length} friends participating`)
  }

  const tagMatch = Array.isArray(profile.tags) && profile.tags.some(tag => String(tag).toLowerCase() === String(event.activity || '').toLowerCase())
  if (tagMatch) {
    score += 1
    reasons.push('Matches your interests')
  }

  const eventVibes = Array.isArray(event.vibes) ? event.vibes.map((value: any) => String(value).toLowerCase()) : []
  const vibeMatches = Array.isArray(profile.vibes) ? profile.vibes.filter(vibe => eventVibes.includes(String(vibe).toLowerCase())) : []
  if (vibeMatches.length > 0) {
    score += 1
    reasons.push('Matches your vibes')
  }

  const badgeCount = score >= 4 ? 3 : score >= 2 ? 2 : score >= 1 ? 1 : 0
  return {
    score,
    badgeCount,
    badge: badgeCount > 0 ? '👍'.repeat(badgeCount) : '',
    reasons,
  }
}

function emitReviewsUpdated(detail?: any) {
  try {
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('demo1_reviews_updated', { detail }))
    }
  } catch {}
}

function readStoredList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed as T[] : []
  } catch {
    return []
  }
}

function writeStoredList<T>(key: string, items: T[]) {
  localStorage.setItem(key, JSON.stringify(items))
}

function normalizeSkillLevel(level?: string | null): SkillLevel | undefined {
  if (level === 'No experience' || level === 'Beginner' || level === 'Intermediate' || level === 'Advanced') return level
  return undefined
}

function getHostReviewRecords(hostId: string) {
  const normalizedHostId = normalizeAccountId(hostId)
  return readStoredList<ParticipantReviewRecord>(PARTICIPANT_REVIEWS_KEY)
    .filter(record => normalizeAccountId(record.hostId) === normalizedHostId && typeof record.submittedAt === 'number' && typeof record.hostRating === 'number')
}

function recomputeHostRating(hostId: string) {
  const normalizedHostId = normalizeAccountId(hostId)
  if (!normalizedHostId) return
  const reviews = getHostReviewRecords(normalizedHostId)
  const profile = getProfile(normalizedHostId)
  if (!profile) return
  const nextRating = reviews.length
    ? Math.round((reviews.reduce((sum, record) => sum + Number(record.hostRating || 0), 0) / reviews.length) * 10) / 10
    : undefined
  if (profile.rating === nextRating) return
  saveProfile({ ...profile, rating: nextRating })
}

export function getEventEndTimestamp(event: any): number | null {
  try {
    if (!event?.date) return null
    const start = new Date(`${event.date}T${event.startTime || '00:00'}`)
    if (Number.isNaN(start.getTime())) return null
    if (event.endTime) {
      const end = new Date(`${event.date}T${event.endTime}`)
      if (!Number.isNaN(end.getTime())) return end.getTime()
    }
    const durationMinutes = Number(event.duration || 0)
    if (!Number.isNaN(durationMinutes) && durationMinutes > 0) return start.getTime() + durationMinutes * 60 * 1000
    return start.getTime()
  } catch {
    return null
  }
}

export function getEventStartTimestamp(event: any): number | null {
  try {
    if (!event?.date) return null
    const start = new Date(`${event.date}T${event.startTime || '00:00'}`)
    if (Number.isNaN(start.getTime())) return null
    return start.getTime()
  } catch {
    return null
  }
}

export function isEventWithinReviewWindow(event: any, now = Date.now()) {
  const end = getEventEndTimestamp(event)
  if (!end) return false
  return now >= end && now <= end + REVIEW_WINDOW_MS
}

export function getParticipantReviewRecord(eventId: string, userId: string): ParticipantReviewRecord | null {
  const normalizedUserId = normalizeAccountId(userId)
  return readStoredList<ParticipantReviewRecord>(PARTICIPANT_REVIEWS_KEY)
    .find(record => String(record.eventId) === String(eventId) && normalizeAccountId(record.userId) === normalizedUserId) || null
}

export function setParticipantCheckIn(eventId: string, userId: string, checkedIn: boolean) {
  const normalizedUserId = normalizeAccountId(userId)
  const records = readStoredList<ParticipantReviewRecord>(PARTICIPANT_REVIEWS_KEY)
  const idx = records.findIndex(record => String(record.eventId) === String(eventId) && normalizeAccountId(record.userId) === normalizedUserId)
  const existing = idx >= 0 ? records[idx] : null
  const next: ParticipantReviewRecord = {
    eventId,
    userId: normalizedUserId,
    hostId: existing?.hostId || (findEventById(eventId)?.host || ''),
    checkedIn,
    hostRating: existing?.hostRating,
    feedback: existing?.feedback,
    submittedAt: existing?.submittedAt,
    reviewLaterUntil: existing?.reviewLaterUntil,
    updatedAt: Date.now(),
  }
  if (idx >= 0) records[idx] = next
  else records.push(next)
  writeStoredList(PARTICIPANT_REVIEWS_KEY, records)
  emitReviewsUpdated({ eventId, userId: normalizedUserId, type: 'checkin' })
  return next
}

export function deferParticipantReview(eventId: string, userId: string, delayMs = REVIEW_LATER_MS) {
  const normalizedUserId = normalizeAccountId(userId)
  const records = readStoredList<ParticipantReviewRecord>(PARTICIPANT_REVIEWS_KEY)
  const idx = records.findIndex(record => String(record.eventId) === String(eventId) && normalizeAccountId(record.userId) === normalizedUserId)
  const existing = idx >= 0 ? records[idx] : null
  const next: ParticipantReviewRecord = {
    eventId,
    userId: normalizedUserId,
    hostId: existing?.hostId || (findEventById(eventId)?.host || ''),
    checkedIn: existing?.checkedIn,
    hostRating: existing?.hostRating,
    feedback: existing?.feedback,
    submittedAt: existing?.submittedAt,
    reviewLaterUntil: Date.now() + delayMs,
    updatedAt: Date.now(),
  }
  if (idx >= 0) records[idx] = next
  else records.push(next)
  writeStoredList(PARTICIPANT_REVIEWS_KEY, records)
  emitReviewsUpdated({ eventId, userId: normalizedUserId, type: 'review_later' })
  return next
}

export function saveParticipantReview(input: {
  eventId: string
  userId: string
  hostId: string
  hostRating: number
  anonymousHostRating?: boolean
  feedback?: string
  checkedIn?: boolean
}) {
  const normalizedUserId = normalizeAccountId(input.userId)
  const normalizedHostId = normalizeAccountId(input.hostId)
  const safeRating = Math.max(1, Math.min(5, Number(input.hostRating || 0)))
  if (!normalizedUserId || !normalizedHostId || !safeRating) return null
  const records = readStoredList<ParticipantReviewRecord>(PARTICIPANT_REVIEWS_KEY)
  const idx = records.findIndex(record => String(record.eventId) === String(input.eventId) && normalizeAccountId(record.userId) === normalizedUserId)
  const existing = idx >= 0 ? records[idx] : null
  const next: ParticipantReviewRecord = {
    eventId: input.eventId,
    userId: normalizedUserId,
    hostId: normalizedHostId,
    checkedIn: !!input.checkedIn,
    hostRating: safeRating,
    anonymousHostRating: !!input.anonymousHostRating,
    feedback: input.feedback?.trim() || undefined,
    submittedAt: Date.now(),
    reviewLaterUntil: undefined,
    updatedAt: Date.now(),
  }
  if (idx >= 0) records[idx] = { ...existing, ...next }
  else records.push(next)
  writeStoredList(PARTICIPANT_REVIEWS_KEY, records)
  recomputeHostRating(normalizedHostId)
  emitReviewsUpdated({ eventId: input.eventId, userId: normalizedUserId, type: 'participant_review' })
  return next
}

export function needsParticipantReview(event: any, userId: string, now = Date.now()) {
  const normalizedUserId = normalizeAccountId(userId)
  if (!event || !normalizedUserId) return false
  const isParticipant = Array.isArray(event.participants) && event.participants.map((entry: any) => normalizeAccountId(String(entry))).includes(normalizedUserId)
  if (!isParticipant) return false
  if (!isEventWithinReviewWindow(event, now)) return false
  const review = getParticipantReviewRecord(event.id, normalizedUserId)
  if (review?.submittedAt) return false
  if (review?.reviewLaterUntil && review.reviewLaterUntil > now) return false
  return true
}

export function getHostWrapUpRecord(eventId: string, hostId?: string): HostWrapUpRecord | null {
  const normalizedHostId = hostId ? normalizeAccountId(hostId) : undefined
  return readStoredList<HostWrapUpRecord>(HOST_WRAPUPS_KEY)
    .find(record => String(record.eventId) === String(eventId) && (!normalizedHostId || normalizeAccountId(record.hostId) === normalizedHostId)) || null
}

export function saveHostWrapUp(input: {
  eventId: string
  hostId: string
  activity?: string
  participants: Array<{
    userId: string
    didAttend: boolean
    currentSkillLevel?: SkillLevel
    suggestedSkillLevel?: SkillLevel
    feedback?: string
  }>
}) {
  const normalizedHostId = normalizeAccountId(input.hostId)
  if (!normalizedHostId) return null
  const now = Date.now()
  const wrapups = readStoredList<HostWrapUpRecord>(HOST_WRAPUPS_KEY)
  const idx = wrapups.findIndex(record => String(record.eventId) === String(input.eventId) && normalizeAccountId(record.hostId) === normalizedHostId)
  const next: HostWrapUpRecord = {
    eventId: input.eventId,
    hostId: normalizedHostId,
    activity: input.activity,
    submittedAt: now,
    updatedAt: now,
    participants: input.participants.map(entry => ({
      userId: normalizeAccountId(entry.userId),
      didAttend: !!entry.didAttend,
      currentSkillLevel: normalizeSkillLevel(entry.currentSkillLevel),
      suggestedSkillLevel: normalizeSkillLevel(entry.suggestedSkillLevel),
      feedback: entry.feedback?.trim() || undefined,
      updatedAt: now,
    })),
  }
  if (idx >= 0) wrapups[idx] = next
  else wrapups.push(next)
  writeStoredList(HOST_WRAPUPS_KEY, wrapups)

  const suggestions = readStoredList<SkillSuggestionRecord>(SKILL_SUGGESTIONS_KEY)
  for (const participant of next.participants) {
    const suggestionId = `skill_suggestion:${input.eventId}:${participant.userId}`
    const existingSuggestionIndex = suggestions.findIndex(item => item.id === suggestionId)
    const shouldSuggest = !!(participant.suggestedSkillLevel && participant.suggestedSkillLevel !== participant.currentSkillLevel)
    if (!shouldSuggest) {
      if (existingSuggestionIndex >= 0) suggestions.splice(existingSuggestionIndex, 1)
      continue
    }
    const suggestion: SkillSuggestionRecord = {
      id: suggestionId,
      eventId: input.eventId,
      userId: participant.userId,
      hostId: normalizedHostId,
      activity: String(input.activity || ''),
      currentSkillLevel: participant.currentSkillLevel,
      suggestedSkillLevel: participant.suggestedSkillLevel!,
      feedback: participant.feedback,
      createdAt: existingSuggestionIndex >= 0 ? suggestions[existingSuggestionIndex].createdAt : now,
      updatedAt: now,
      appliedAt: suggestions[existingSuggestionIndex]?.appliedAt,
      reviewLaterUntil: suggestions[existingSuggestionIndex]?.reviewLaterUntil,
    }
    if (existingSuggestionIndex >= 0) suggestions[existingSuggestionIndex] = suggestion
    else suggestions.push(suggestion)
  }
  writeStoredList(SKILL_SUGGESTIONS_KEY, suggestions)
  emitReviewsUpdated({ eventId: input.eventId, hostId: normalizedHostId, type: 'host_wrapup' })
  return next
}

export function needsHostWrapUp(event: any, userId: string, now = Date.now()) {
  const normalizedUserId = normalizeAccountId(userId)
  if (!event || !normalizedUserId) return false
  if (normalizeAccountId(event.host || '') !== normalizedUserId) return false
  if (!Array.isArray(event.participants) || event.participants.length === 0) return false
  if (!isEventWithinReviewWindow(event, now)) return false
  return !getHostWrapUpRecord(event.id, normalizedUserId)
}

export function getPendingSkillSuggestions(userId: string, eventId?: string, now = Date.now()) {
  const normalizedUserId = normalizeAccountId(userId)
  return readStoredList<SkillSuggestionRecord>(SKILL_SUGGESTIONS_KEY)
    .filter(item => normalizeAccountId(item.userId) === normalizedUserId)
    .filter(item => !eventId || String(item.eventId) === String(eventId))
    .filter(item => !item.appliedAt)
    .filter(item => !(item.reviewLaterUntil && item.reviewLaterUntil > now))
}

export function deferSkillSuggestion(suggestionId: string, userId: string, delayMs = REVIEW_LATER_MS) {
  const normalizedUserId = normalizeAccountId(userId)
  const suggestions = readStoredList<SkillSuggestionRecord>(SKILL_SUGGESTIONS_KEY)
  const idx = suggestions.findIndex(item => item.id === suggestionId && normalizeAccountId(item.userId) === normalizedUserId)
  if (idx === -1) return null
  suggestions[idx] = { ...suggestions[idx], reviewLaterUntil: Date.now() + delayMs, updatedAt: Date.now() }
  writeStoredList(SKILL_SUGGESTIONS_KEY, suggestions)
  emitReviewsUpdated({ suggestionId, userId: normalizedUserId, type: 'skill_suggestion_later' })
  return suggestions[idx]
}

export function applySkillSuggestion(suggestionId: string, userId: string) {
  const normalizedUserId = normalizeAccountId(userId)
  const suggestions = readStoredList<SkillSuggestionRecord>(SKILL_SUGGESTIONS_KEY)
  const idx = suggestions.findIndex(item => item.id === suggestionId && normalizeAccountId(item.userId) === normalizedUserId)
  if (idx === -1) return null
  const suggestion = suggestions[idx]
  if (!suggestion.activity || !suggestion.suggestedSkillLevel) return null
  saveProfileSkill(normalizedUserId, suggestion.activity, suggestion.suggestedSkillLevel)
  suggestions[idx] = { ...suggestion, appliedAt: Date.now(), updatedAt: Date.now(), reviewLaterUntil: undefined }
  writeStoredList(SKILL_SUGGESTIONS_KEY, suggestions)
  emitReviewsUpdated({ suggestionId, userId: normalizedUserId, type: 'skill_suggestion_applied' })
  return suggestions[idx]
}

export function saveIncidentReport(input: {
  eventId: string
  userId: string
  reporterRole: 'participant' | 'host'
  category: string
  details: string
}) {
  const reports = readStoredList<IncidentReportRecord>(INCIDENT_REPORTS_KEY)
  const next: IncidentReportRecord = {
    id: 'incident_' + Math.random().toString(36).slice(2, 10),
    eventId: input.eventId,
    userId: normalizeAccountId(input.userId),
    reporterRole: input.reporterRole,
    category: String(input.category || '').trim() || 'General concern',
    details: String(input.details || '').trim(),
    createdAt: Date.now(),
  }
  reports.push(next)
  writeStoredList(INCIDENT_REPORTS_KEY, reports)
  emitReviewsUpdated({ eventId: input.eventId, userId: next.userId, type: 'incident_report' })
  return next
}

export function listIncidentReportsForHost(userId: string) {
  const normalizedUserId = normalizeAccountId(userId)
  if (!normalizedUserId) return []
  const hostEventIds = new Set(
    listEvents()
      .filter(event => normalizeAccountId(event?.host || '') === normalizedUserId)
      .map(event => String(event.id))
  )
  if (hostEventIds.size === 0) return []
  return readStoredList<IncidentReportRecord>(INCIDENT_REPORTS_KEY)
    .filter(report => hostEventIds.has(String(report.eventId)))
    .sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0))
}

export function listPendingActions(userId: string, now = Date.now()): PendingAction[] {
  const normalizedUserId = normalizeAccountId(userId)
  if (!normalizedUserId) return []
  const events = listEvents()
  const actions: PendingAction[] = []

  for (const event of events) {
    const eventId = String(event?.id || '')
    if (!eventId) continue
    const title = String(event?.title || event?.activity || 'Session')
    const eventStart = getEventStartTimestamp(event) || Number(event?.createdAt || now)
    const eventEnd = getEventEndTimestamp(event) || eventStart
    const isHost = normalizeAccountId(event?.host || '') === normalizedUserId
    const isParticipant = Array.isArray(event?.participants) && event.participants.some((entry: any) => normalizeAccountId(String(entry)) === normalizedUserId)

    if (isHost && Array.isArray(event?.applications)) {
      const pendingApplications = event.applications.filter((entry: any) => entry?.status === 'pending' || entry?.status === 'waitlisted')
      for (const application of pendingApplications) {
        const applicantId = normalizeAccountId(String(application?.userId || ''))
        const applicantLabel = applicantId ? getPublicIdentityLabel(applicantId) : 'Participant'
        actions.push({
          id: `approval:${eventId}:${applicantId || Math.random().toString(36).slice(2, 8)}`,
          type: 'approval',
          eventId,
          title,
          subtitle: `${application?.status === 'waitlisted' ? 'Waitlisted' : 'Pending'} application from ${applicantLabel}`,
          waitedSince: Number(application?.appliedAt || eventStart),
        })
      }
    }

    if (isParticipant && needsParticipantReview(event, normalizedUserId, now)) {
      actions.push({
        id: `participantReview:${eventId}:${normalizedUserId}`,
        type: 'participantReview',
        eventId,
        title,
        subtitle: 'Leave your participant review',
        waitedSince: eventEnd,
      })
    }

    if (isHost && needsHostWrapUp(event, normalizedUserId, now)) {
      actions.push({
        id: `hostWrapUp:${eventId}:${normalizedUserId}`,
        type: 'hostWrapUp',
        eventId,
        title,
        subtitle: 'Complete host wrap-up and participant feedback',
        waitedSince: eventEnd,
      })
    }

    const suggestions = getPendingSkillSuggestions(normalizedUserId, eventId, now)
    for (const suggestion of suggestions) {
      actions.push({
        id: `skillSuggestion:${suggestion.id}`,
        type: 'skillSuggestion',
        eventId,
        title,
        subtitle: `Review suggested level: ${suggestion.suggestedSkillLevel}`,
        waitedSince: Number(suggestion.createdAt || suggestion.updatedAt || eventEnd),
      })
    }
  }

  for (const report of listIncidentReportsForHost(normalizedUserId)) {
    const event = events.find(item => String(item.id) === String(report.eventId))
    const title = String(event?.title || event?.activity || 'Session')
    const reporterLabel = getPublicIdentityLabel(report.userId)
    actions.push({
      id: `incidentReport:${report.id}`,
      type: 'incidentReport',
      eventId: String(report.eventId),
      title,
      subtitle: `Incident report from ${reporterLabel}: ${report.category}`,
      waitedSince: Number(report.createdAt || now),
    })
  }

  _appendFriendRequestActions(normalizedUserId, actions)

  return actions.sort((a, b) => a.waitedSince - b.waitedSince)
}
function _appendFriendRequestActions(userId: string, actions: PendingAction[]) {
  const requests = getPendingFriendRequests(userId)
  for (const req of requests) {
    const label = getPublicIdentityLabel(req.fromUserId)
    actions.push({
      id: `friendRequest:${req.id}`,
      type: 'friendRequest',
      fromUserId: req.fromUserId,
      title: 'Friend request',
      subtitle: `${label} wants to connect`,
      waitedSince: Number(req.sentAt || Date.now()),
    })
  }
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

export function saveProfileSkill(userId: string, tag: string, level: SkillLevel) {
  const prof = getProfile(userId)
  if (!prof) return
  if (!prof.skillChecks) prof.skillChecks = {}
  prof.skillChecks[tag] = level
  saveProfile(prof)
}

export function addProfileTagsAndVibes(userId: string, input: { tags?: string[]; vibes?: string[] }) {
  const normalizedUserId = normalizeAccountId(userId)
  if (!normalizedUserId) return null
  const existing = getProfile(normalizedUserId)
  const next: Profile = normalizeProfile({
    ...(existing || {
      id: normalizedUserId,
      tags: [],
      username: deriveUsernameFromId(normalizedUserId),
      preferredName: deriveUsernameFromId(normalizedUserId),
    }),
    id: normalizedUserId,
    tags: uniqueStrings([...(existing?.tags || []), ...((input.tags || []).map(value => String(value)))]),
    vibes: uniqueStrings([...(existing?.vibes || []), ...((input.vibes || []).map(value => String(value)))]),
  })
  if (!next) return null
  saveProfile(next)
  return next
}

export function getSuggestedProfileInfo(userId: string, now = Date.now()) {
  const normalizedUserId = normalizeAccountId(userId)
  if (!normalizedUserId) return { tags: [], vibes: [] }
  const profile = getProfile(normalizedUserId)
  const existingTags = new Set((profile?.tags || []).map(value => String(value).trim().toLowerCase()))
  const existingVibes = new Set((profile?.vibes || []).map(value => String(value).trim().toLowerCase()))
  const relevantEvents = listEvents().filter(event => {
    const end = getEventEndTimestamp(event)
    if (!end || end > now) return false
    const isHost = normalizeAccountId(event.host || '') === normalizedUserId
    const isParticipant = Array.isArray(event.participants) && event.participants.some((entry: any) => normalizeAccountId(String(entry)) === normalizedUserId)
    return isHost || isParticipant
  })
  const tags = uniqueStrings(relevantEvents.map(event => String(event.activity || '').trim())).filter(value => !existingTags.has(value.toLowerCase()))
  const vibes = uniqueStrings(relevantEvents.flatMap(event => Array.isArray(event.vibes) ? event.vibes.map((value: any) => String(value).trim()) : [])).filter(value => !existingVibes.has(value.toLowerCase()))
  return { tags, vibes }
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

export function reviewPendingApplication(eventId: string, userId: string, decision: 'approve' | 'reject', feedback?: string) {
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
        ev.applications[appIndex] = {
          ...application,
          status: 'waitlisted',
          feedback,
          waitlistReason: 'capacity'
        }
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
      ev.applications[appIndex] = { ...application, status: 'denied', feedback }
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


// Generate mock reviews for past events (prototype helper)
export function generateReviewsForPastEvents() {
  const events = listEvents()
  const now = Date.now()
  const pastEvents = events.filter(event => {
    const endTs = getEventEndTimestamp(event)
    return endTs && endTs < now
  })

  const existingReviews = readStoredList<ParticipantReviewRecord>(PARTICIPANT_REVIEWS_KEY)
  const existingWrapUps = readStoredList<HostWrapUpRecord>(HOST_WRAPUPS_KEY)
  const existingReviewEventParticipantKeys = new Set(existingReviews.map(r => `${r.eventId}:${r.userId}`))
  const existingWrapUpEventKeys = new Set(existingWrapUps.map(w => w.eventId))

  const reviewBodies = [
    'Great session, very welcoming host! Highly recommend.',
    'Well organized and fun. Would definitely join again.',
    'The host was very knowledgeable and supportive throughout.',
    'Had a wonderful time. Great group of people!',
    'Exactly what I was looking for. Thanks for organising!',
    'Really enjoyed the activity. The host kept everything running smoothly.',
    'Good experience overall. Will be back for more sessions.',
    'Brilliant session! Everyone was friendly and encouraging.',
    'Loved the energy. The host made all the difference.',
    'Solid session. Very professional and well run.',
    'Such a positive atmosphere. Felt welcome from the start.',
    'Perfect for my skill level. The host gauged the group well.',
  ]
  const skillLevels: SkillLevel[] = ['No experience', 'Beginner', 'Intermediate', 'Advanced']
  function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }

  const newReviews: ParticipantReviewRecord[] = []
  const newWrapUps: HostWrapUpRecord[] = []

  for (const event of pastEvents) {
    if ((event as any)?.skipAutoReviewGeneration) continue
    const hostId = normalizeAccountId(event.host || '')
    if (!hostId) continue
    const participants: string[] = Array.isArray(event.participants)
      ? (event.participants as any[]).map((p: any) => normalizeAccountId(String(p))).filter(Boolean)
      : []
    const endTs = getEventEndTimestamp(event) || now

    // Participant reviews (participants rate host)
    for (const participantId of participants) {
      const key = `${event.id}:${participantId}`
      if (existingReviewEventParticipantKeys.has(key)) continue
      const submittedAt = endTs + Math.floor(Math.random() * 3 * 24 * 60 * 60 * 1000)
      newReviews.push({
        eventId: event.id,
        userId: participantId,
        hostId,
        hostRating: Math.random() > 0.25 ? 5 : 4,
        feedback: pick(reviewBodies),
        anonymousHostRating: Math.random() > 0.7,
        submittedAt,
        updatedAt: submittedAt,
      })
    }

    // Host wrap-up (host reviews participants)
    if (!existingWrapUpEventKeys.has(event.id) && participants.length > 0) {
      const submittedAt = endTs + Math.floor(Math.random() * 2 * 24 * 60 * 60 * 1000)
      newWrapUps.push({
        eventId: event.id,
        hostId,
        activity: (event as any).activity || (event as any).title,
        submittedAt,
        updatedAt: submittedAt,
        participants: participants.map(pid => ({
          userId: pid,
          didAttend: Math.random() > 0.08,
          suggestedSkillLevel: pick(skillLevels),
          feedback: Math.random() > 0.45 ? pick(reviewBodies) : undefined,
          updatedAt: submittedAt,
        })),
      })
    }
  }

  if (newReviews.length > 0) {
    const allReviews = [...existingReviews, ...newReviews]
    localStorage.setItem(PARTICIPANT_REVIEWS_KEY, JSON.stringify(allReviews))
    // recompute host ratings
    const hostIds = new Set(newReviews.map(r => r.hostId))
    hostIds.forEach(hid => recomputeHostRating(hid))
  }
  if (newWrapUps.length > 0) {
    const allWrapUps = [...existingWrapUps, ...newWrapUps]
    localStorage.setItem(HOST_WRAPUPS_KEY, JSON.stringify(allWrapUps))
  }
  if (newReviews.length > 0 || newWrapUps.length > 0) {
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('demo1_reviews_updated'))
    }
  }
  return { reviewCount: newReviews.length, wrapUpCount: newWrapUps.length }
}

// Seed a local prototype account/profile so the app can run without a backend.
// Uses the same default public username used in the UI as a sensible seed value.
try {
  const seedId = 'username'
  if (!accountExists(seedId)) {
    registerAccount(seedId, 'jamie@example.org')
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
