import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

// Auto-seed mock data for client-only prototype
// If localStorage already contains accounts/events we leave them unchanged.
import accountsData from '../mock-data/accounts.json'
import profilesData from '../mock-data/profiles.json'
import eventsData from '../mock-data/events.json'

function seedIfEmpty() {
  try {
    const ACCOUNTS_KEY = 'demo1_accounts_v1'
    const PROFILE_PREFIX = 'demo1_profile_v1_'
    const EVENTS_KEY = 'demo1_events_v1'

    if (!localStorage.getItem(ACCOUNTS_KEY)) {
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accountsData))
      console.info('[seed] wrote', accountsData.length, 'accounts to', ACCOUNTS_KEY)
    }

    // profiles are written per-id
    let writtenProfiles = 0
    for (const p of profilesData) {
      const key = PROFILE_PREFIX + p.id
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify(p))
        writtenProfiles++
      }
    }
    if (writtenProfiles) console.info('[seed] wrote', writtenProfiles, 'profiles')

    if (!localStorage.getItem(EVENTS_KEY)) {
      localStorage.setItem(EVENTS_KEY, JSON.stringify(eventsData))
      console.info('[seed] wrote', eventsData.length, 'events to', EVENTS_KEY)
    }
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

