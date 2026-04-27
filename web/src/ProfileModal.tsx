import React, { useMemo, useState } from 'react'
import { getSuggestedTags, saveProfile, suggestTag, getProfile } from './AuthService'

type Props = {
  open: boolean
  onClose: () => void
  userId: string
}

const DEFAULT_TAGS = [
  'Running','Cycling','Football','Basketball','Tennis','Swimming','Hiking','Yoga','Gym','Climbing','Skiing','Snowboarding','Skateboarding','Surfing','Golf','Rowing','Dancing','Cooking','Photography','Travel','Reading','Gaming','Coding','Gardening','Painting','Music'
]

// Large explicit list of sports, hobbies and activities (no generated "Activity N" entries)
const LARGE_TAGS = [
  'Running','Trail Running','Road Running','Cycling','Mountain Biking','Road Cycling','Triathlon','Swimming','Open Water Swimming',
  'Kayaking','Canoeing','Stand-up Paddleboarding','Rowing','Sailing','Surfing','Kitesurfing','Windsurfing','Sailing (small boat)',
  'Hiking','Backpacking','Mountaineering','Climbing','Bouldering','Indoor Climbing','Trail Walking','Orienteering','Camping',
  'Skiing','Snowboarding','Cross-country Skiing','Sledding','Ice Skating','Figure Skating','Ice Hockey','Snowshoeing',
  'Soccer','Football','Rugby','American Football','Baseball','Softball','Cricket','Lacrosse','Field Hockey',
  'Basketball','Volleyball','Beach Volleyball','Tennis','Table Tennis','Squash','Badminton','Pickleball',
  'Golf','Mini Golf','Frisbee','Ultimate Frisbee','Disc Golf','Bowling','Bocce','Curling','Polo',
  'Boxing','Kickboxing','Muay Thai','Martial Arts','Karate','Judo','Jiu-Jitsu','Taekwondo','Wrestling','Fencing',
  'Yoga','Pilates','Tai Chi','Meditation','Mindfulness','Dance','Ballet','Contemporary Dance','Hip-hop Dance','Salsa','Tango','Ballroom',
  'Gym','Weightlifting','Powerlifting','CrossFit','Calisthenics','Parkour','Gymnastics','Acrobatics','Circus Arts','Trampoline',
  'Skateboarding','Rollerblading','Scootering','Motorcycling','Motorsports','Auto Racing','Karting',
  'Shooting','Archery','Airsoft','Paintball','Fishing','Hunting',
  'Gardening','Urban Gardening','Permaculture','Beekeeping','Foraging','Botany',
  'Photography','Videography','Filmmaking','Blogging','Vlogging','Podcasting','Writing','Poetry','Journaling',
  'Painting','Drawing','Sketching','Watercolor','Acrylic','Oil Painting','Sculpting','Ceramics','Pottery','Woodworking','Carpentry',
  'Knitting','Crocheting','Sewing','Quilting','Embroidery','Fashion Design','Jewelry Making',
  'Cooking','Baking','Brewery','Home Brewing','Winemaking','Mixology','Cake Decorating','Food Blogging',
  'Music','Guitar','Piano','Drums','Violin','Cello','Saxophone','Trumpet','Clarinet','Flute','Ukulele','Banjo','Bass','Songwriting','Choir','Singing','DJing','Music Production',
  'Theater','Acting','Improv','Stand-up Comedy','Magic','Storytelling',
  'Board Games','Tabletop RPGs','Chess','Strategy Games','Card Games','Collectible Card Games','Bridge','Poker',
  'Video Games','eSports','Game Development','Coding','Programming','Web Development','Mobile Development','Game Modding','Artificial Intelligence','Data Science',
  'Electronics','Arduino','Raspberry Pi','Robotics','3D Printing','Model Building','RC Planes','RC Cars','Drone Flying',
  'Astronomy','Stargazing','Amateur Radio','Meteorology','Weather Spotting',
  'Birdwatching','Wildlife Watching','Nature Walks','Conservation Volunteering','Environmental Activism',
  'Travel','Backpacking Travel','Road Trips','Vanlife','Cultural Exchange','Language Learning',
  'Yoga Retreats','Wellness','Spa','Personal Training','Coaching','Mentoring',
  'Chess Boxing','Sepak Takraw','Paddle Sports','Underwater Hockey','Freediving','Scuba Diving','Snorkeling',
  'Collecting','Antiques','Coin Collecting','Stamp Collecting','Vintage Cars','Model Trains','Lego Building',
  'Puzzles','Sudoku','Crosswords','Rubiks Cube','Escape Rooms','Geocaching','Treasure Hunting','Metal Detecting',
  'Community Service','Volunteering','Fundraising','Political Activism','Campaigning',
  'Board Sailing','Kite Flying','Water Skiing','Wakeboarding','Wakesurfing','Fishing (Fly Fishing)','Spearfishing',
  'Basket Weaving','Calligraphy','Origami','Magic Tricks','Cardistry','Leatherworking','Blacksmithing',
  'Home Improvement','DIY Projects','Interior Design','Photography Editing','Graphic Design','Illustration',
  'Dance Fitness','Zumba','Aerial Yoga','Pole Fitness','Hula Hooping','Jump Rope',
  'Language Exchange','Public Speaking','Debate','Toastmasters','Networking','Entrepreneurship','Startups',
  'Meditation Groups','Philosophy Meetups','Book Clubs','Reading Groups','Literary Events',
  'Wine Tasting','Beer Tasting','Coffee Roasting','Tea Appreciation',
  'Pet Training','Dog Walking','Dog Agility','Equestrian','Horse Riding','Horse Care',
  'Sustainability Projects','Zero Waste Living','Minimalism','Tiny House Building',
  'Fitness Classes','Personal Fitness','Trail Maintenance','Habitat Restoration',
  'Metalworking','Glassblowing','Stained Glass','Mosaic Art','Urban Sketching',
  'Standup Paddle Yoga','Skimboarding','Bodyboarding','Beachcombing','Coastal Cleanups',
  'Road Cycling Touring','Cycle Commuting','Bike Repair','Urban Cycling Advocacy',
  'Philanthropy','Community Organizing','Leadership Training','Career Coaching',
  'Singing in Choirs','Opera Appreciation','Classical Music Ensemble','Band Practice',
  'Historical Reenactment','LARPing','Cosplay','Costume Making','Themed Events',
  'Sailing (Yacht)','Catamaran Sailing','Offshore Sailing','Regatta Racing',
  'Rock Balancing','Stone Skipping','Meditative Walking','Forest Bathing'
]

function sample<T>(arr: T[], k: number) {
  const res: T[] = []
  const used = new Set<number>()
  const n = arr.length
  while (res.length < k && used.size < n) {
    const idx = Math.floor(Math.random() * n)
    if (!used.has(idx)) {
      used.add(idx)
      res.push(arr[idx])
    }
  }
  return res
}

export default function ProfileModal({ open, onClose, userId }: Props) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [step, setStep] = useState<number>(1)
  const [about, setAbout] = useState('')
  const [aboutPublic, setAboutPublic] = useState<boolean>(true)
  const [gender, setGender] = useState<string>('Prefer not to say')
  const [toast, setToast] = useState<string | null>(null)
  const suggested = useMemo(() => getSuggestedTags(), [])

  const largeList = useMemo(() => LARGE_TAGS, [])

  // initial displayed tags: 10 random picks
  const [displayedTags, setDisplayedTags] = useState<string[]>(() => sample(largeList, 10))

  // load existing profile when opening for edit
  React.useEffect(() => {
    if (!open) return
    try {
      const profile = getProfile(userId)
      if (profile) {
        setSelected(profile.tags ?? [])
        setAbout(profile.about ?? '')
        setAboutPublic(profile.aboutPublic === undefined ? true : !!profile.aboutPublic)
        setGender(profile.gender ?? 'Prefer not to say')
        // refresh displayed tags to exclude already-selected
        setDisplayedTags(sample(largeList.filter(t => !(profile.tags ?? []).includes(t)), 10))
      } else {
        // new open: reshuffle displayed tags
        setDisplayedTags(sample(largeList, 10))
        setSelected([])
        setAbout('')
        setAboutPublic(true)
        setGender('Prefer not to say')
      }
    } catch (e) {
      console.warn('[ProfileModal] failed to load profile', e)
    }
  }, [open, userId, largeList])

  const allTags = useMemo(() => {
    // merge large list, defaults and suggested, unique
    const merged = Array.from(new Set([...largeList, ...DEFAULT_TAGS, ...suggested]))
    return merged
  }, [largeList, suggested])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return allTags.filter(t => !selected.includes(t))
    return allTags.filter(t => !selected.includes(t) && t.toLowerCase().includes(q))
  }, [query, allTags, selected])

  const toggle = (tag: string) => {
    setSelected(prev => {
      const selecting = !prev.includes(tag)
      const next = selecting ? [...prev, tag] : prev.filter(x => x !== tag)

      // remove from displayedTags so it disappears
      setDisplayedTags(dt => dt.filter(t => t !== tag))

      // persist to profile immediately (add or remove)
      try {
        if (userId) {
          const profile = getProfile(userId)
          const existing = profile?.tags ?? []
          const setTags = new Set<string>(existing)
          if (selecting) setTags.add(tag)
          else setTags.delete(tag)
          saveProfile({ id: userId, tags: Array.from(setTags), about, aboutPublic, gender, completedAt: Date.now() })
        }
      } catch (e) {
        console.warn('[ProfileModal] persist selected tag failed', e)
      }

      return next
    })
  }

  const handleSuggest = () => {
    const value = query.trim()
    if (!value) return
    // add suggestion and select it
    suggestTag(value)
    setSelected(prev => prev.includes(value) ? prev : [...prev, value])
    setQuery('')
    // remove from displayed
    setDisplayedTags(dt => dt.filter(t => t !== value))
    // persist suggestion
    try {
      if (userId) {
        const profile = getProfile(userId)
        const existing = profile?.tags ?? []
        const setTags = new Set<string>(existing)
        setTags.add(value)
        saveProfile({ id: userId, tags: Array.from(setTags), about, aboutPublic, gender, completedAt: Date.now() })
      }
    } catch (e) {
      console.warn('[ProfileModal] persist suggested tag failed', e)
    }
  }

  const refreshSuggestions = () => {
    const pool = largeList.filter(t => !selected.includes(t))
    setDisplayedTags(sample(pool, 10))
  }

  const handleSave = () => {
    // save profile (simple)
    saveProfile({ id: userId, tags: selected, about, aboutPublic, gender, completedAt: Date.now() })
    setToast('Profile saved')
    setTimeout(() => setToast(null), 1800)
    // close after short delay to show toast
    setTimeout(() => onClose(), 900)
  }

  // keyboard: close on Escape
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header">
          <h3>Profile setup</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="modal-body">

          {step === 1 ? (
            <>
              <p style={{ marginTop: 0 }}>
                Add your favorite sports and hobbies to help the system recommend activities you might like in your area. You can always come back later and update this.
              </p>

              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input" placeholder="Search tags" value={query} onChange={e => setQuery(e.target.value)} />
                <button type="button" className="btn ghost" onClick={refreshSuggestions}>Refresh</button>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                {(query.trim() ? filtered : displayedTags).map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggle(tag)}
                    className={"btn " + (selected.includes(tag) ? '' : 'ghost')}
                    style={{ padding: '6px 10px', fontSize: 13, borderRadius: 999, flex: 'unset' }}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {/* selected chips appear below suggestions */}
              {selected.length > 0 && (
                <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {selected.map(t => (
                    <div key={t} className="chip" onClick={() => toggle(t)}>{t} ✕</div>
                  ))}
                </div>
              )}

              {/* show suggest option if query not matching any tag */}
              {query.trim() && !allTags.some(t => t.toLowerCase() === query.trim().toLowerCase()) && (
                <div style={{ marginTop: 12 }}>
                  <button type="button" className="btn ghost full" onClick={handleSuggest}>Suggest "{query.trim()}"</button>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button type="button" className="btn" onClick={() => setStep(2)} disabled={selected.length === 0}>Next</button>
                <button type="button" className="btn ghost" onClick={onClose}>Skip</button>
              </div>
            </>
          ) : step === 2 ? (
            // Step 2: About me
            <>
              <p style={{ marginTop: 0 }}>
                Include anything in this section you might want others to know about you. This might be what brings you to the area, what your week might look like generally, activities that get you excited or what you might be wanting to find in participants or activities. This is optional but may help you build connection with other users.
              </p>

              <label className="input-label">About me (optional)</label>
              <textarea className="input" style={{ minHeight: 120 }} value={about} onChange={e => setAbout(e.target.value)} />

              <div style={{ marginTop: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={aboutPublic} onChange={e => setAboutPublic(e.target.checked)} />
                  <span>Make this about me public (visible to everyone). Otherwise it will be limited to friends.</span>
                </label>
              </div>


              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button type="button" className="btn" onClick={() => setStep(3)}>Next</button>
                <button type="button" className="btn ghost" onClick={() => setStep(1)}>Back</button>
              </div>
            </>
          ) : (
            // Step 3: Gender
            <>
              <p style={{ marginTop: 0 }}>
                The following question is used to help users gauge participants in an activity. This information will not be displayed on your public profile.
              </p>

              <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: 13, marginBottom: 6 }}>Gender (optional)</div>
                        <div style={{ marginBottom: 8, fontSize: 12 }}>
                          Note: The following question is used to help users gauge participants in an activity. This information will not be displayed on your public profile.
                        </div>
                        <select className="input" value={gender} onChange={e => setGender(e.target.value)}>
                          <option>Male</option>
                          <option>Female</option>
                          <option>Non-Binary</option>
                          <option>Prefer not to say</option>
                        </select>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button type="button" className="btn" onClick={handleSave}>Save</button>
                <button type="button" className="btn ghost" onClick={() => setStep(2)}>Back</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

