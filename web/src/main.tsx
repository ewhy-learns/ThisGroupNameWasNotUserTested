import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

// Auto-seed mock data for client-only prototype
// If localStorage already contains accounts/events we leave them unchanged.
import accountsData from '../mock-data/accounts.json'
import profilesData from '../mock-data/profiles.json'
import eventsData from '../mock-data/events.json'
import { reconcileEventLocations, getPreferredName, getPublicIdentityLabel, normalizeAccountId } from './AuthService'

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
    // Trigger a background reconcile so location names are resolved from
    // coordinates using OpenStreetMap where possible.
    try { reconcileEventLocations() } catch (e) { /* ignore */ }
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

