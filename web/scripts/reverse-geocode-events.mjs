import fs from 'fs'
import path from 'path'

// reverse-geocode-events.mjs
// Usage: node scripts/reverse-geocode-events.mjs
// Reads web/mock-data/events.json, backs it up, and attempts to reverse-geocode
// each event's locationCoords using Nominatim. On success updates event.location
// with the display_name returned. If remote calls fail, falls back to a local
// mapping by proximity.

let DATA_DIR = path.join(process.cwd(), 'mock-data')
if (!fs.existsSync(path.join(DATA_DIR, 'events.json'))) {
  DATA_DIR = path.join(process.cwd(), 'web', 'mock-data')
}
const EVENTS_FILE = path.join(DATA_DIR, 'events.json')
const BACKUP_FILE = path.join(DATA_DIR, 'events.json.bak')

async function sleep(ms) { return new Promise(res => setTimeout(res, ms)) }

async function reverseGeocode(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lon))}&zoom=16&addressdetails=0`
  try {
    const res = await fetch(url, { headers: { 'Accept': 'application/json', 'User-Agent': 'demo1-reverse-geocode/1.0 (contact@example.com)' } })
    if (!res.ok) {
      console.warn('Reverse geocode request failed', res.status, res.statusText)
      return null
    }
    const data = await res.json()
    if (!data) return null
    return data
  } catch (e) {
    console.warn('Reverse geocode fetch error', e)
    return null
  }
}

// Local canonical mapping of known Armidale landmarks (coords -> canonical display_name)
const CANONICAL = [
  { key: 'Armidale Riverbank Reserve', lat: -30.5032, lon: 151.6615, display: 'Armidale Riverbank Reserve, Riverbank Rd, Armidale NSW 2350' },
  { key: 'Eastwood Reserve', lat: -30.5070, lon: 151.6492, display: 'Eastwood Reserve, Eastwood Rd, Armidale NSW 2350' },
  { key: 'University Oval', lat: -30.4948, lon: 151.6549, display: 'University Oval, University of New England, Armidale NSW 2351' },
  { key: 'Central Park', lat: -30.5058, lon: 151.6618, display: 'Central Park, Central Park Rd, Armidale NSW 2350' },
  { key: 'Dangars Gorge', lat: -30.5785, lon: 151.6550, display: 'Dangars Gorge Trailhead, Dangars Gorge Rd, Armidale NSW 2350' },
  { key: 'Saumarez Falls', lat: -30.5860, lon: 151.6610, display: 'Saumarez Falls Picnic Area, Saumarez Rd, Armidale NSW 2350' },
  { key: 'Armidale Community Hall', lat: -30.5020, lon: 151.6555, display: 'Armidale Community Hall, 45 Community St, Armidale NSW 2350' },
  { key: 'Armidale Sports Centre', lat: -30.5012, lon: 151.6599, display: 'Armidale Sports Centre, Sports Centre Dr, Armidale NSW 2350' },
  { key: 'Armidale Botanic Gardens', lat: -30.5065, lon: 151.6551, display: 'Armidale Botanic Gardens, Botanic Gardens Rd, Armidale NSW 2350' },
  { key: 'Armidale Aquatic Centre', lat: -30.4995, lon: 151.6602, display: 'Armidale Aquatic Centre, Aquatic Ave, Armidale NSW 2350' },
  { key: 'UNE Sport & Recreation Centre', lat: -30.4930, lon: 151.6525, display: 'UNE Sport & Recreation Centre, University of New England, Armidale NSW 2351' },
  { key: 'Hillgrove Track', lat: -30.5700, lon: 151.7000, display: 'Hillgrove Track Start, Hillgrove Rd, Armidale NSW 2350' },
  { key: 'Sportsground Nets', lat: -30.4965, lon: 151.6565, display: 'Sportsground Nets, Sportsground Rd, Armidale NSW 2350' },
  { key: 'Community Court', lat: -30.5040, lon: 151.6580, display: 'Community Court, Queen St, Armidale NSW 2350' },
  { key: 'Armidale CBD', lat: -30.5038, lon: 151.6610, display: 'Armidale CBD, Beardy St, Armidale NSW 2350' },
  { key: 'Armidale Lake', lat: -30.5090, lon: 151.6670, display: 'Armidale Lake (Lake Innes Reserve), Armidale NSW 2350' },
  { key: 'Armidale Youth Centre', lat: -30.5005, lon: 151.6570, display: 'Armidale Youth & Community Centre, 5 Youth Centre Rd, Armidale NSW 2350' },
  { key: 'Armidale Gardens', lat: -30.5060, lon: 151.6560, display: 'Armidale Gardens, Gardens Ave, Armidale NSW 2350' }
]

function nearestCanonical(lat, lon, maxDeg = 0.01) {
  let best = null
  let bestDist = Infinity
  for (const c of CANONICAL) {
    const d = Math.hypot(lat - c.lat, lon - c.lon)
    if (d < bestDist) { bestDist = d; best = c }
  }
  if (bestDist <= maxDeg) return best
  return null
}

async function main() {
  if (!fs.existsSync(EVENTS_FILE)) { console.error('events.json not found at', EVENTS_FILE); process.exit(1) }
  const raw = fs.readFileSync(EVENTS_FILE, 'utf8')
  let events
  try { events = JSON.parse(raw); if (!Array.isArray(events)) throw new Error('events.json must be an array') } catch (e) { console.error('Failed to parse events.json', e); process.exit(1) }

  fs.copyFileSync(EVENTS_FILE, BACKUP_FILE)
  console.log('Backup written to', BACKUP_FILE)

  let updated = 0
  for (let i = 0; i < events.length; i++) {
    const ev = events[i]
    const lc = ev.locationCoords
    if (!lc || typeof lc.lat !== 'number' || typeof lc.lon !== 'number') {
      console.log(`[${i+1}/${events.length}] Skipping ${ev.id} — no coords`)
      continue
    }
    const lat = lc.lat
    const lon = lc.lon
    console.log(`[${i+1}/${events.length}] Reverse geocoding ${ev.id} @ ${lat}, ${lon}`)
    const data = await reverseGeocode(lat, lon)
    if (data && data.display_name) {
      ev.location = data.display_name
      console.log(` -> Reverse geocode OK: ${ev.location}`)
      updated++
    } else {
      const near = nearestCanonical(lat, lon)
      if (near) {
        ev.location = near.display
        console.log(` -> Used canonical fallback: ${ev.location}`)
        updated++
      } else {
        console.log(' -> No reverse result and no nearby canonical mapping; leaving location unchanged')
      }
    }
    // polite rate limit
    await sleep(1100)
  }

  fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2), 'utf8')
  console.log(`Done. Updated ${updated}/${events.length} events. Wrote ${EVENTS_FILE} (backup at ${path.basename(BACKUP_FILE)}).`)
}

main().catch(e => { console.error('Script failed', e); process.exit(1) })

