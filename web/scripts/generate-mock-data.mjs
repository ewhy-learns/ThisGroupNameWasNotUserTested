import fs from 'fs'
import path from 'path'

// Simple deterministic RNG so repeated runs produce same output
let seed = 1234567
function rnd() { seed = (1103515245 * seed + 12345) % 0x80000000; return seed / 0x80000000 }

const cities = ['Armidale, NSW', 'Canberra, ACT', 'Perth, WA']

// Example venues (name + coords) per city — used so multiple events can share locations
const VENUES = {
  'Armidale, NSW': [
    { name: 'Central Park Sportsground', lat: -30.505, lon: 151.662 },
    { name: 'University Oval', lat: -30.495, lon: 151.655 },
    { name: 'Eastwood Reserve', lat: -30.510, lon: 151.648 },
    { name: 'Riverwalk Pavilion', lat: -30.498, lon: 151.669 }
  ],
  'Canberra, ACT': [
    { name: 'Lakeview Fields', lat: -35.281, lon: 149.125 },
    { name: 'Northside Oval', lat: -35.278, lon: 149.138 },
    { name: 'Gungahlin Park', lat: -35.226, lon: 149.115 },
    { name: 'Westside Recreation Grounds', lat: -35.285, lon: 149.110 }
  ],
  'Perth, WA': [
    { name: 'Riverside Sports Hub', lat: -31.952, lon: 115.857 },
    { name: 'Coogee Beach Park', lat: -32.039, lon: 115.732 },
    { name: 'Fremantle Oval', lat: -32.056, lon: 115.746 },
    { name: 'Kings Park Meeting Point', lat: -31.962, lon: 115.842 }
  ]
}

const activities = [
  'Trail Run', 'Social Soccer', 'Basketball Pickup', 'Yoga in the Park', 'Mountain Biking', 'Beach Volleyball', 'Indoor Rock Climb', 'Table Tennis', 'Community Swim', 'Group Ride', 'Climbing Meet', 'Ultimate Frisbee', 'Park Pilates', 'Rowing Tryout', 'Dance Social', 'Rugby Touch', 'Cricket Net Session', 'Orienteering', 'Hiking Group', 'Kayak Meet'
]

const vibes = ['Casual','Social','Competitive','Beginner-friendly','Family','LGBTQI+','Mens','Womens','18+','Outdoors','Indoor','Skills-focused']
const experiences = ['Beginner','Intermediate','Advanced','']

function pad(n){return n.toString().padStart(2,'0')}

function randChoice(arr){ return arr[Math.floor(rnd()*arr.length)] }

const today = new Date('2026-04-30T08:00:00Z')
const twoMonthsLater = new Date(today)
twoMonthsLater.setMonth(twoMonthsLater.getMonth()+2)

function randomDateBetween(start, end){
  const s = start.getTime()
  const e = end.getTime()
  const t = Math.floor(s + rnd()*(e-s))
  const d = new Date(t)
  // ensure daytime hours 7-19
  const hour = 7 + Math.floor(rnd()*12)
  const minute = [0,0,15,30,45][Math.floor(rnd()*4)]
  d.setUTCHours(hour, minute, 0, 0)
  return d
}

function formatDateYMD(d){
  const yyyy = d.getUTCFullYear()
  const mm = pad(d.getUTCMonth()+1)
  const dd = pad(d.getUTCDate())
  return `${yyyy}-${mm}-${dd}`
}

function formatTimeHHMM(d){
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
}

// Create 100 unique organisers
const organisers = []
for(let i=1;i<=100;i++){
  const id = `organiser${pad(i)}@example.org`
  const createdAt = today.getTime() - Math.floor(rnd()*30*24*3600*1000)
  organisers.push({ id, createdAt })
}

// Create profiles for organisers (minimal)
const profiles = organisers.map((o, idx) => {
  const tags = []
  // pick 1-3 tags from activities
  const c = 1 + Math.floor(rnd()*3)
  for(let j=0;j<c;j++){ const t = randChoice(activities); if(!tags.includes(t)) tags.push(t) }
  const p = {
    id: o.id,
    tags,
    about: `Organizer ${o.id} runs community ${tags.join(', ')} sessions.`,
    aboutPublic: true,
    gender: randChoice(['Prefer not to say','Female','Male']),
    completedAt: Date.now() - Math.floor(rnd()*10*24*3600*1000),
    vibes: [ randChoice(vibes) ],
  }
  return p
})

// Generate 100 events distributed across three cities and within next two months
const events = []
for(let i=0;i<100;i++){
  const host = organisers[i].id
  const activity = randChoice(activities)
  const city = cities[i % cities.length]
  const venues = VENUES[city]
  // pick a venue (finite list so many events share same locations)
  const venue = venues[Math.floor(rnd()*venues.length)]
  const dt = randomDateBetween(today, twoMonthsLater)
  const date = formatDateYMD(dt)
  const start = formatTimeHHMM(dt)
  const durationMins = [60,90,120,45,30][Math.floor(rnd()*5)]
  const endD = new Date(dt.getTime() + durationMins*60000)
  const title = `${activity} - ${city.split(',')[0]} ${date}`
  const evt = {
    id: `evt_${(Math.random()).toString(36).slice(2,9)}_${i}`,
    title,
    activity,
    location: `${venue.name}, ${city}`,
    locationCoords: { lat: venue.lat, lon: venue.lon },
    date,
    startTime: start,
    duration: durationMins,
    endTime: formatTimeHHMM(endD),
    visibility: 'Public',
    description: `Join us for ${activity} in ${city.split(',')[0]}. Suitable for a range of abilities. Organiser: ${host}`,
    suggestedExperience: randChoice(experiences) || undefined,
    participantsMin: 2 + Math.floor(rnd()*4),
    participantsMax: 8 + Math.floor(rnd()*12),
    cost: randChoice(['Free','Donation','$5','$10']),
    equipment: randChoice(['Bring your own','Provided','Bring water bottle','Bring shoes']),
    vibes: [ randChoice(vibes), randChoice(vibes) ].filter((v,i,a)=>a.indexOf(v)===i),
    photoDataUrl: null,
    updatedAt: Date.now(),
    createdAt: Date.now() - Math.floor(rnd()*1000*60*60*24*20),
    host,
    organiserName: `Organizer ${i+1}`
  }
  events.push(evt)
}

// Ensure every event date makes sense and is within range
// Resolve output directory inside the web/mock-data folder of the project
const projectRoot = path.resolve(process.cwd(), '.')
const finalOutDir = path.join(projectRoot, 'web', 'mock-data')
if(!fs.existsSync(finalOutDir)) fs.mkdirSync(finalOutDir, { recursive: true })

fs.writeFileSync(path.join(finalOutDir, 'accounts.json'), JSON.stringify(organisers, null, 2))
fs.writeFileSync(path.join(finalOutDir, 'profiles.json'), JSON.stringify(profiles, null, 2))
fs.writeFileSync(path.join(finalOutDir, 'events.json'), JSON.stringify(events, null, 2))

console.log('Generated mock data:')
console.log(' - accounts:', organisers.length)
console.log(' - profiles:', profiles.length)
console.log(' - events:', events.length)

// Also print first sample
console.log('Sample event:', events[0])

