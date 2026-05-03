import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

// Auto-seed mock data for client-only prototype
// If localStorage already contains accounts/events we leave them unchanged.
import accountsData from '../mock-data/accounts.json'
import profilesData from '../mock-data/profiles.json'
import eventsData from '../mock-data/events.json'
import { reconcileEventLocations, generateReviewsForPastEvents, getPreferredName, getPublicIdentityLabel, normalizeAccountId } from './AuthService'

function seedIfEmpty() {
  try {
    const ACCOUNTS_KEY = 'demo1_accounts_v1'
    const PROFILE_PREFIX = 'demo1_profile_v1_'
    const EVENTS_KEY = 'demo1_events_v1'

    const normalizeProfileRecord = (profile: any) => {
      const normalizedId = normalizeAccountId(profile?.id || '')
      const username = String(profile?.username || (normalizedId.includes('@') ? normalizedId.split('@')[0] : normalizedId) || '').trim().toLowerCase()
      const preferredName = String(profile?.preferredName || profile?.displayName || username || '').trim()
      return {
        ...profile,
        id: normalizedId,
        username,
        preferredName,
        displayName: preferredName || profile?.displayName,
        sharePreferredNameWithParticipants: !!profile?.sharePreferredNameWithParticipants,
      }
    }

    const readJson = (key: string, fallback: any) => {
      try {
        const raw = localStorage.getItem(key)
        return raw ? JSON.parse(raw) : fallback
      } catch {
        return fallback
      }
    }

    const existingAccounts = Array.isArray(readJson(ACCOUNTS_KEY, [])) ? readJson(ACCOUNTS_KEY, []) : []
    const mergedAccounts = [...existingAccounts]
    let addedAccounts = 0
    for (const account of accountsData as any[]) {
      const normalizedId = normalizeAccountId(account.id)
      if (!mergedAccounts.some((entry: any) => normalizeAccountId(entry.id) === normalizedId)) {
        mergedAccounts.push({ ...account, id: normalizedId })
        addedAccounts++
      }
    }
    if (!localStorage.getItem(ACCOUNTS_KEY) || addedAccounts > 0 || mergedAccounts.length !== existingAccounts.length) {
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(mergedAccounts))
      console.info('[seed] ensured', mergedAccounts.length, 'accounts in', ACCOUNTS_KEY)
    }

    // First normalize any existing profile records already in localStorage.
    const profileKeys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(PROFILE_PREFIX)) profileKeys.push(key)
    }
    for (const key of profileKeys) {
      try {
        const existing = readJson(key, null)
        if (!existing) continue
        const normalized = normalizeProfileRecord(existing)
        if (JSON.stringify(existing) !== JSON.stringify(normalized)) {
          localStorage.setItem(key, JSON.stringify(normalized))
        }
      } catch (e) {
        console.warn('[seed] failed to normalize profile', key, e)
      }
    }

    // profiles are written per-id and merged with any existing legacy records
    let writtenProfiles = 0
    for (const p of profilesData) {
      const normalizedSeed = normalizeProfileRecord(p)
      const key = PROFILE_PREFIX + normalizedSeed.id
      const existing = readJson(key, null)
      if (!existing) {
        localStorage.setItem(key, JSON.stringify(normalizedSeed))
        writtenProfiles++
      } else {
        const normalizedExisting = normalizeProfileRecord(existing)
        const merged = {
          ...normalizedSeed,
          ...normalizedExisting,
          username: normalizedExisting.username || normalizedSeed.username,
          preferredName: normalizedExisting.preferredName || normalizedSeed.preferredName,
          displayName: normalizedExisting.displayName || normalizedExisting.preferredName || normalizedSeed.preferredName,
        }
        if (JSON.stringify(existing) !== JSON.stringify(merged)) {
          localStorage.setItem(key, JSON.stringify(merged))
        }
      }
    }
    if (writtenProfiles) console.info('[seed] wrote', writtenProfiles, 'profiles')

    const existingEvents = Array.isArray(readJson(EVENTS_KEY, [])) ? readJson(EVENTS_KEY, []) : []
    const mergedEvents = [...existingEvents]
    let addedEvents = 0
    for (const event of eventsData as any[]) {
      if (!mergedEvents.some((entry: any) => entry.id === event.id)) {
        mergedEvents.push(event)
        addedEvents++
      }
    }
    const hostSeedId = normalizeAccountId('username')
    const toIsoDate = (ts: number) => new Date(ts).toISOString().slice(0, 10)
    const toIsoLocalDate = (date: Date) => {
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    }
    const nowTs = Date.now()
    const yesterday = new Date(nowTs)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayDate = toIsoLocalDate(yesterday)
    const syntheticPastSessions = [
      {
        id: 'evt_username_past_001',
        title: 'Community Walk and Coffee - Autumn Loop',
        activity: 'Walking Group',
        location: 'Armidale Bicentennial Arboretum, Armidale NSW',
        locationCoords: { lat: -30.514, lon: 151.661 },
        date: toIsoDate(nowTs - 26 * 24 * 60 * 60 * 1000),
        startTime: '08:30',
        duration: 70,
        endTime: '09:40',
        visibility: 'Public',
        description: 'Relaxed weekend walk followed by coffee. Hosted by username for newcomers and regulars.',
        participantsMin: 3,
        participantsMax: 20,
        participants: [
          normalizeAccountId('organiser01@example.org'),
          normalizeAccountId('organiser02@example.org'),
          normalizeAccountId('organiser03@example.org')
        ],
        cost: 'Free',
        equipment: 'Comfortable walking shoes',
        vibes: ['Casual', 'Social'],
        photoDataUrl: null,
        updatedAt: nowTs - 26 * 24 * 60 * 60 * 1000,
        createdAt: nowTs - 27 * 24 * 60 * 60 * 1000,
        host: hostSeedId,
        organiserName: 'username'
      },
      {
        id: 'evt_username_past_002',
        title: 'Sunday Social Badminton - Beginner Friendly',
        activity: 'Badminton',
        location: 'UNE Sports Hall, Armidale NSW',
        locationCoords: { lat: -30.4928, lon: 151.6489 },
        date: toIsoDate(nowTs - 18 * 24 * 60 * 60 * 1000),
        startTime: '16:00',
        duration: 90,
        endTime: '17:30',
        visibility: 'Public',
        description: 'Mixed-level social badminton session with short rotations and coaching tips.',
        participantsMin: 4,
        participantsMax: 16,
        participants: [
          normalizeAccountId('organiser02@example.org'),
          normalizeAccountId('organiser04@example.org'),
          normalizeAccountId('organiser05@example.org')
        ],
        cost: '$5',
        equipment: 'Racquet (spares available)',
        vibes: ['Social', 'Casual', 'Beginner Friendly'],
        photoDataUrl: null,
        updatedAt: nowTs - 18 * 24 * 60 * 60 * 1000,
        createdAt: nowTs - 19 * 24 * 60 * 60 * 1000,
        host: hostSeedId,
        organiserName: 'username'
      },
      {
        id: 'evt_username_past_003',
        title: 'Campus Sunset Run - Intervals and Recovery',
        activity: 'Running',
        location: 'UNE Campus Loop, Armidale NSW',
        locationCoords: { lat: -30.4937, lon: 151.6528 },
        date: toIsoDate(nowTs - 9 * 24 * 60 * 60 * 1000),
        startTime: '17:45',
        duration: 55,
        endTime: '18:40',
        visibility: 'Public',
        description: 'Short interval sets with walking recovery. Suitable for all levels.',
        participantsMin: 3,
        participantsMax: 14,
        participants: [
          normalizeAccountId('organiser01@example.org'),
          normalizeAccountId('organiser03@example.org')
        ],
        cost: 'Free',
        equipment: 'Running shoes',
        vibes: ['Social', 'Competitive'],
        photoDataUrl: null,
        updatedAt: nowTs - 9 * 24 * 60 * 60 * 1000,
        createdAt: nowTs - 10 * 24 * 60 * 60 * 1000,
        host: hostSeedId,
        organiserName: 'username'
      },
    ]

    for (const synthetic of syntheticPastSessions) {
      if (!mergedEvents.some((entry: any) => entry.id === synthetic.id)) {
        mergedEvents.push(synthetic)
        addedEvents++
      }
    }

    const reviewSeedSessions = [
      {
        id: 'evt_review_pending_host_001',
        title: 'Host Wrap-Up Test Session (Yesterday)',
        activity: 'Walking Group',
        location: 'Armidale River Walk, Armidale NSW',
        locationCoords: { lat: -30.5095, lon: 151.6655 },
        date: yesterdayDate,
        startTime: '09:00',
        duration: 90,
        endTime: '10:30',
        visibility: 'Public',
        description: 'Seeded test session that ended yesterday and should require host wrap-up.',
        suggestedExperience: 'Beginner',
        participantsMin: 2,
        participantsMax: 12,
        participants: [
          normalizeAccountId('organiser01@example.org'),
          normalizeAccountId('organiser02@example.org')
        ],
        cost: 'Free',
        equipment: 'Water bottle and walking shoes',
        vibes: ['Casual', 'Social'],
        photoDataUrl: null,
        updatedAt: nowTs,
        createdAt: nowTs - 3 * 24 * 60 * 60 * 1000,
        host: hostSeedId,
        organiserName: 'username',
        skipAutoReviewGeneration: true,
      },
      {
        id: 'evt_review_pending_participant_001',
        title: 'Participant Review Test Session (Yesterday)',
        activity: 'Badminton',
        location: 'UNE Sports Hall, Armidale NSW',
        locationCoords: { lat: -30.4928, lon: 151.6489 },
        date: yesterdayDate,
        startTime: '15:00',
        duration: 75,
        endTime: '16:15',
        visibility: 'Public',
        description: 'Seeded test session that ended yesterday and should require participant review.',
        suggestedExperience: 'Intermediate',
        participantsMin: 2,
        participantsMax: 10,
        participants: [
          hostSeedId,
          normalizeAccountId('organiser03@example.org')
        ],
        cost: '$5',
        equipment: 'Racquet and non-marking shoes',
        vibes: ['Social', 'Beginner Friendly'],
        photoDataUrl: null,
        updatedAt: nowTs,
        createdAt: nowTs - 3 * 24 * 60 * 60 * 1000,
        host: normalizeAccountId('organiser04@example.org'),
        organiserName: 'organiser04',
        skipAutoReviewGeneration: true,
      },
    ]

    for (const reviewSeed of reviewSeedSessions) {
      const existingIndex = mergedEvents.findIndex((entry: any) => entry.id === reviewSeed.id)
      if (existingIndex >= 0) {
        mergedEvents[existingIndex] = { ...mergedEvents[existingIndex], ...reviewSeed }
      } else {
        mergedEvents.push(reviewSeed)
        addedEvents++
      }
    }

    const normalizedEvents = mergedEvents.map((event: any) => {
      const host = event?.host ? normalizeAccountId(String(event.host)) : event?.host
      const participants = Array.isArray(event?.participants) ? event.participants.map((entry: any) => normalizeAccountId(String(entry))) : []
      const applications = Array.isArray(event?.applications)
        ? event.applications.map((application: any) => {
            const userId = normalizeAccountId(application?.userId || '')
            return {
              ...application,
              userId,
              username: application?.username || getPublicIdentityLabel(userId),
              preferredName: application?.preferredName || getPreferredName(userId),
              preferredNameVisibleToParticipants: !!(application?.preferredNameVisibleToParticipants ?? application?.isPublic),
            }
          })
        : []
      return {
        ...event,
        host,
        organiserName: host ? getPublicIdentityLabel(host) : event?.organiserName,
        participants,
        applications,
      }
    })
    if (!localStorage.getItem(EVENTS_KEY) || addedEvents > 0 || JSON.stringify(existingEvents) !== JSON.stringify(normalizedEvents)) {
      localStorage.setItem(EVENTS_KEY, JSON.stringify(normalizedEvents))
      console.info('[seed] ensured', normalizedEvents.length, 'events in', EVENTS_KEY)
    }

    try {
      const reviewSeedEventIds = new Set(['evt_review_pending_host_001', 'evt_review_pending_participant_001'])
      const participantReviewsKey = 'demo1_participant_reviews_v1'
      const hostWrapupsKey = 'demo1_host_wrapups_v1'
      const existingParticipantReviews = readJson(participantReviewsKey, [])
      const existingHostWrapups = readJson(hostWrapupsKey, [])
      const filteredParticipantReviews = Array.isArray(existingParticipantReviews)
        ? existingParticipantReviews.filter((entry: any) => !reviewSeedEventIds.has(String(entry?.eventId || '')))
        : []
      const filteredHostWrapups = Array.isArray(existingHostWrapups)
        ? existingHostWrapups.filter((entry: any) => !reviewSeedEventIds.has(String(entry?.eventId || '')))
        : []
      if (JSON.stringify(existingParticipantReviews) !== JSON.stringify(filteredParticipantReviews)) {
        localStorage.setItem(participantReviewsKey, JSON.stringify(filteredParticipantReviews))
      }
      if (JSON.stringify(existingHostWrapups) !== JSON.stringify(filteredHostWrapups)) {
        localStorage.setItem(hostWrapupsKey, JSON.stringify(filteredHostWrapups))
      }
    } catch (e) {
      console.warn('[seed] failed to reset pending-review seed records', e)
    }
    // Trigger a background reconcile so location names are resolved from
    // coordinates using OpenStreetMap where possible.
    try { reconcileEventLocations() } catch (e) { /* ignore */ }
    try {
      const generated = generateReviewsForPastEvents()
      if (generated.reviewCount > 0 || generated.wrapUpCount > 0) {
        console.info('[seed] generated reviews for past sessions', generated)
      }
    } catch (e) {
      console.warn('[seed] failed to generate past-session reviews', e)
    }
    // Ensure every event host has a profile. If the mock profiles don't include
    // a host referenced by an event, create a minimal profile so UIs can
    // resolve displayName reliably.
    try {
      let created = 0
      for (const e of eventsData) {
        const hostId = e.host ? normalizeAccountId(e.host) : e.host
        if (!hostId) continue
        const key = PROFILE_PREFIX + hostId
        if (!localStorage.getItem(key)) {
          const username = getPublicIdentityLabel(hostId)
          const preferredName = (e.organiserName && String(e.organiserName).trim()) || username
          const prof = { id: hostId, username, preferredName, displayName: preferredName, tags: [], about: '', aboutPublic: false, completedAt: Date.now(), vibes: [], sharePreferredNameWithParticipants: false }
          localStorage.setItem(key, JSON.stringify(prof))
          created++
        }
      }
      if (created) console.info('[seed] created', created, 'missing profiles for event hosts')
    } catch (e) { console.warn('[seed] failed to ensure host profiles', e) }
  } catch (e) {
    console.warn('[seed] failed to seed mock data', e)
  }
}

seedIfEmpty()

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Root element not found')

createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

