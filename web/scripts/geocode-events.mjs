import fs from 'fs'
import path from 'path'

// geocode-events.mjs
// Usage: node scripts/geocode-events.mjs
// This script will:
// - backup mock-data/events.json to mock-data/events.json.bak
// - clear locationCoords for all events
// - query Nominatim (OpenStreetMap) forward geocoding for each event.location
// - update locationCoords with the first result (lat, lon)
// Note: This script performs requests sequentially with a 1s delay to be polite to Nominatim.

// Support running this script from either repo root (demo1) or from the web folder.
let DATA_DIR = path.join(process.cwd(), 'mock-data')
if (!fs.existsSync(path.join(DATA_DIR, 'events.json'))) {
  // fallback: assume current working dir is repo root and mock data is under web/mock-data
  DATA_DIR = path.join(process.cwd(), 'web', 'mock-data')
}
const EVENTS_FILE = path.join(DATA_DIR, 'events.json')
const BACKUP_FILE = path.join(DATA_DIR, 'events.json.bak')

async function sleep(ms) { return new Promise(res => setTimeout(res, ms)) }

async function geocode(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`
  try {
    const res = await fetch(url, { headers: { 'Accept': 'application/json', 'User-Agent': 'demo1-geocode-script/1.0 (you@example.com)' } })
    if (!res.ok) {
      console.warn('Geocode request failed', res.status, res.statusText)
      return null
    }
    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) return null
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), display_name: data[0].display_name }
  } catch (e) {
    console.warn('Geocode fetch error', e)
    return null
  }
}

// Fallback mapping for common Armidale places (used when Nominatim requests fail).
const FALLBACK_MAP = {
  'armidale riverbank': { lat: -30.5032, lon: 151.6615 },
  'eastwood reserve': { lat: -30.5070, lon: 151.6492 },
  'university oval': { lat: -30.4948, lon: 151.6549 },
  'central park': { lat: -30.5058, lon: 151.6618 },
  'dangars gorge': { lat: -30.5785, lon: 151.6550 },
  'saumarez falls': { lat: -30.5860, lon: 151.6610 },
  'community hall': { lat: -30.5020, lon: 151.6555 },
  'sports centre': { lat: -30.5012, lon: 151.6599 },
  'botanic gardens': { lat: -30.5065, lon: 151.6551 },
  'aquatic centre': { lat: -30.4995, lon: 151.6602 },
  'university gym': { lat: -30.4930, lon: 151.6525 },
  'hillgrove': { lat: -30.5700, lon: 151.7000 },
  'sportsground nets': { lat: -30.4965, lon: 151.6565 },
  'community court': { lat: -30.5040, lon: 151.6580 },
  'saumarez': { lat: -30.5860, lon: 151.6610 },
  'armidale cbd': { lat: -30.5038, lon: 151.6610 },
  'armidale lake': { lat: -30.5090, lon: 151.6670 },
  'youth centre': { lat: -30.5005, lon: 151.6570 },
  'armidale gardens': { lat: -30.5060, lon: 151.6560 }
}

function fallbackGeocode(query) {
  if (!query || typeof query !== 'string') return null
  const q = query.toLowerCase()
  for (const key of Object.keys(FALLBACK_MAP)) {
    if (q.includes(key)) return { lat: FALLBACK_MAP[key].lat, lon: FALLBACK_MAP[key].lon, display_name: key }
  }
  return null
}

async function main() {
  if (!fs.existsSync(EVENTS_FILE)) {
    console.error('events.json not found at', EVENTS_FILE)
    process.exit(1)
  }
  const raw = fs.readFileSync(EVENTS_FILE, 'utf8')
  let events
  try {
    events = JSON.parse(raw)
    if (!Array.isArray(events)) throw new Error('events.json must be an array')
  } catch (e) {
    console.error('Failed to parse events.json', e)
    process.exit(1)
  }

  // backup
  fs.copyFileSync(EVENTS_FILE, BACKUP_FILE)
  console.log('Backup written to', BACKUP_FILE)

  // Clear coords first
  for (const ev of events) {
    ev.locationCoords = null
  }

  // For each event, geocode its location string
  let updated = 0
  for (let i = 0; i < events.length; i++) {
    const ev = events[i]
    const q = ev.location
    if (!q || typeof q !== 'string' || q.trim() === '') {
      console.log(`[${i+1}/${events.length}] Skipping event ${ev.id} (no location string)`)
      continue
    }
    console.log(`[${i+1}/${events.length}] Geocoding event ${ev.id}: "${q}"`)
    const result = await geocode(q)
    let final = result
    if (!final) {
      const fb = fallbackGeocode(q)
      if (fb) final = fb
    }
    if (final) {
      ev.locationCoords = { lat: final.lat, lon: final.lon }
      // Use the display name from the geocoder if available; otherwise keep original
      if (final.display_name) ev.location = final.display_name
      console.log(` -> Found: ${final.lat}, ${final.lon} — ${ev.location}`)
      updated++
    } else {
      ev.locationCoords = null
      console.log(' -> No result')
    }
    // be polite
    await sleep(1100)
  }

  fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2), 'utf8')
  console.log(`Done. Updated ${updated}/${events.length} events. events.json overwritten (backup at events.json.bak).`)
}

main()
  .catch(e => { console.error('Script failed', e); process.exit(1) })




