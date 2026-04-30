import React, { useMemo, useState } from 'react'
import Switch from './Switch'
import { getSuggestedTags, saveProfile, suggestTag, getProfile } from './AuthService'

type Props = {
  open: boolean
  onClose: () => void
  userId: string
}

type EditorProps = Props & {
  initialStep?: number
  requiredFlow?: boolean
}

const DEFAULT_TAGS = [
  'Running','Cycling','Football','Basketball','Tennis','Swimming','Hiking','Yoga','Gym','Climbing','Skiing','Snowboarding','Skateboarding','Surfing','Golf','Rowing','Dancing','Cooking','Photography','Travel','Reading','Gaming','Coding','Gardening','Painting','Music'
]

// Vibes tags (social/contextual)
export const VIBES_TAGS = [
  'Child Supervision','Child Participation','Casual','Social','Competitive','LGBTIQ+','Mens','Womens','U25s','Retirees','Mums','Dads','Aboriginal/Torres Strait Islander','18+'
]

// Large explicit list of sports, hobbies and activities (no generated "Activity N" entries)
export const LARGE_TAGS = [
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

    // A simple set of sports names to allow basic filtering (lowercase keys)
    const SPORTS = new Set([
      'running','trail running','road running','cycling','mountain biking','road cycling','triathlon','swimming','open water swimming',
      'kayaking','canoeing','stand-up paddleboarding','rowing','sailing','surfing','kitesurfing','windsurfing',
      'hiking','backpacking','mountaineering','climbing','bouldering','trail walking','orienteering','camping',
      'skiing','snowboarding','cross-country skiing','ice skating','ice hockey','snowshoeing',
      'soccer','football','rugby','american football','baseball','softball','cricket','lacrosse','field hockey',
      'basketball','volleyball','beach volleyball','tennis','table tennis','squash','badminton','pickleball',
      'golf','frisbee','ultimate frisbee','disc golf','bowling','curling','polo','boxing','kickboxing','martial arts',
      'yoga','pilates','tai chi','dance','gym','weightlifting','powerlifting','crossfit','calisthenics','parkour','gymnastics',
      'skateboarding','rollerblading','scootering','motorsports','karting','fishing','hunting','shooting','archery'
    ])
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

export default function ProfileModal({ open, onClose, userId, initialStep }: EditorProps) {
  const requiredFlow = (arguments[0] as any)?.requiredFlow ?? false
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [step, setStep] = useState<number>(1)
  const [about, setAbout] = useState('')
  const [aboutPublic, setAboutPublic] = useState<boolean>(true)
  const [gender, setGender] = useState<string>('Prefer not to say')
  // contact details (editable in profile but not publicized on events)
  const [displayName, setDisplayName] = useState<string>('')
  const [contactEmail, setContactEmail] = useState<string>('')
  const [contactPhone, setContactPhone] = useState<string>('')
  // password change fields
  const [currentPassword, setCurrentPassword] = useState<string>('')
  const [newPassword, setNewPassword] = useState<string>('')
  const [confirmPassword, setConfirmPassword] = useState<string>('')
  const [toast, setToast] = useState<string | null>(null)
  const suggested = useMemo(() => getSuggestedTags(), [])
  const singleMode = typeof initialStep === 'number'

  const largeList = useMemo(() => LARGE_TAGS, [])

  // initial displayed tags: 10 random picks
  const [displayedTags, setDisplayedTags] = useState<string[]>(() => sample(largeList, 10))
  const [filterMode, setFilterMode] = useState<'both'|'sports'|'no-sports'>('both')

  // vibes state
  const [displayedVibes, setDisplayedVibes] = useState<string[]>(() => sample(VIBES_TAGS, 10))
  const [selectedVibes, setSelectedVibes] = useState<string[]>([])

  // Ensure displayedTags always contains up to 10 items matching current filter and excluding selected
  function fillDisplayedTags(current: string[], selectedSet: Set<string>, mode?: 'both'|'sports'|'no-sports') {
    const effectiveMode = mode ?? filterMode
    const cur = current.filter(t => !selectedSet.has(t))
    const need = 10 - cur.length
    if (need <= 0) return cur.slice(0, 10)

    let pool = largeList.filter(t => !selectedSet.has(t) && !cur.includes(t))
    if (effectiveMode === 'sports') pool = pool.filter(t => SPORTS.has(t.toLowerCase()))
    else if (effectiveMode === 'no-sports') pool = pool.filter(t => !SPORTS.has(t.toLowerCase()))

    const add = sample(pool, need)
    return [...cur, ...add]
  }

  // load existing profile when opening for edit
  React.useEffect(() => {
    if (!open) return
    // if caller requested a particular step (e.g. edit about/gender/interests), set it
    if (initialStep && initialStep >= 1 && initialStep <= 6) {
      setStep(initialStep)
    } else {
      setStep(1)
    }
    try {
      const profile = getProfile(userId)
        if (profile) {
        setSelected(profile.tags ?? [])
        setAbout(profile.about ?? '')
        setAboutPublic(profile.aboutPublic === undefined ? true : !!profile.aboutPublic)
        setGender(profile.gender ?? 'Prefer not to say')
        setDisplayName(profile.displayName ?? '')
        setContactEmail(profile.email ?? '')
        setContactPhone(profile.phone ?? '')
        // refresh displayed tags to exclude already-selected, and ensure 10 items
        setDisplayedTags(() => fillDisplayedTags([], new Set(profile.tags ?? []), filterMode))
        // load vibes if present
        setSelectedVibes(profile.vibes ?? [])
        setDisplayedVibes(() => {
          const sel = new Set(profile.vibes ?? [])
          const pool = VIBES_TAGS.filter(t => !sel.has(t))
          return sample(pool, 10)
        })
        } else {
        // new open: reshuffle displayed tags and ensure 10 items
        setDisplayedTags(() => fillDisplayedTags([], new Set(), filterMode))
        setDisplayedVibes(() => sample(VIBES_TAGS, 10))
        setSelected([])
        setAbout('')
        setAboutPublic(true)
          setGender('Prefer not to say')
          setDisplayName('')
          setContactEmail('')
          setContactPhone('')
          // if this is a required onboarding flow, start at step 1 and prevent skipping
          if (requiredFlow) setStep(1)
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
    const base = !q ? allTags.filter(t => !selected.includes(t)) : allTags.filter(t => !selected.includes(t) && t.toLowerCase().includes(q))
    // apply filterMode
    if (filterMode === 'both') return base
    if (filterMode === 'sports') return base.filter(t => SPORTS.has(t.toLowerCase()))
    return base.filter(t => !SPORTS.has(t.toLowerCase()))
  }, [query, allTags, selected, filterMode])

  const toggle = (tag: string) => {
    setSelected(prev => {
      const selecting = !prev.includes(tag)
      const next = selecting ? [...prev, tag] : prev.filter(x => x !== tag)

      // update displayedTags to remove the tag and refill to 10 according to filter
      setDisplayedTags(dt => fillDisplayedTags(dt.filter(t => t !== tag), new Set(next), filterMode))

      // persist to profile immediately (add or remove)
      try {
        if (userId) {
          const profile = getProfile(userId)
          const existing = profile?.tags ?? []
          const setTags = new Set<string>(existing)
          if (selecting) setTags.add(tag)
          else setTags.delete(tag)
          saveProfile({ id: userId, tags: Array.from(setTags), vibes: selectedVibes, about, aboutPublic, gender, completedAt: Date.now() })
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
    setDisplayedTags(() => fillDisplayedTags([], new Set(selected), filterMode))
  }

  const isProfileCompleted = () => {
    const p = getProfile(userId)
    return !!(p && p.completedAt)
  }

  // Validation for each step. About may be empty and 'Prefer not to say' is allowed for gender.
  const isStepValid = (s: number) => {
    if (s === 1) return selected.length > 0
    if (s === 2) return selectedVibes.length > 0
    // About page may be empty according to requirements
    if (s === 3) return true
    // Allow "Prefer not to say" as a valid choice for gender
    if (s === 4) return true
    // Contact details page: always valid (fields optional)
    if (s === 5) return true
    // Change password page: require matching new passwords if provided
    if (s === 6) {
      if (!newPassword && !confirmPassword) return true
      return newPassword.length > 0 && newPassword === confirmPassword
    }
    return true
  }

  const toggleVibe = (tag: string) => {
    setSelectedVibes(prev => {
      const selecting = !prev.includes(tag)
      const next = selecting ? [...prev, tag] : prev.filter(x => x !== tag)
      // remove from displayedVibes and refill
      setDisplayedVibes(dv => {
        const cur = dv.filter(t => t !== tag)
        const need = 10 - cur.length
        if (need <= 0) return cur.slice(0, 10)
        const pool = VIBES_TAGS.filter(t => !next.includes(t) && !cur.includes(t))
        return [...cur, ...sample(pool, need)]
      })
      // persist vibes immediately
      try {
        if (userId) {
          const profile = getProfile(userId)
          const p = { id: userId, tags: profile?.tags ?? [], vibes: next, about: profile?.about ?? '', aboutPublic: profile?.aboutPublic ?? true, gender: profile?.gender ?? 'Prefer not to say', completedAt: Date.now() }
          saveProfile(p)
        }
      } catch (e) {
        console.warn('[ProfileModal] persist selected vibe failed', e)
      }
      return next
    })
  }

  const handleSave = () => {
    // save profile (simple) including vibes
    const profile = { id: userId, tags: selected, vibes: selectedVibes, about, aboutPublic, gender, completedAt: Date.now(), displayName: displayName || undefined, email: contactEmail || undefined, phone: contactPhone || undefined }
    saveProfile(profile)
    setToast('Profile saved')
    setTimeout(() => setToast(null), 1800)
    // close after short delay to show toast
    setTimeout(() => onClose(), 900)
  }

  const handleChangePassword = () => {
    try {
      const profile = getProfile(userId) || { id: userId, tags: [], completedAt: Date.now() }
      // If profile has a password, require currentPassword to match
      if ((profile as any).password) {
        if (currentPassword !== (profile as any).password) {
          setToast('Current password is incorrect')
          setTimeout(() => setToast(null), 2000)
          return
        }
      }
      if (!newPassword) {
        setToast('Enter a new password')
        setTimeout(() => setToast(null), 1400)
        return
      }
      if (newPassword !== confirmPassword) {
        setToast('New passwords do not match')
        setTimeout(() => setToast(null), 1600)
        return
      }
      ;(profile as any).password = newPassword
      saveProfile(profile)
      setToast('Password changed')
      setTimeout(() => setToast(null), 1600)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (e) {
      console.warn('[ProfileModal] change password failed', e)
      setToast('Change password failed')
      setTimeout(() => setToast(null), 1400)
    }
  }

  const handleClose = () => {
    if (requiredFlow && !isProfileCompleted()) {
      setToast('Please complete your profile before continuing')
      setTimeout(() => setToast(null), 2000)
      return
    }
    onClose()
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
          <button type="button" className="modal-close" onClick={handleClose} aria-label="Close">✕</button>
        </div>

        <div className="modal-body">

          {step === 1 ? (
            <>
              <p style={{ marginTop: 0 }}>
                Add your favorite sports and hobbies to help the system recommend activities you might like in your area. You can always come back later and update this.
              </p>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    className="input"
                    placeholder="Search tags"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const v = query.trim()
                        if (!v) return
                        // if query matches an existing tag (case-insensitive), select it
                        const match = allTags.find(t => t.toLowerCase() === v.toLowerCase())
                        if (match) {
                          toggle(match)
                        } else {
                          // otherwise suggest new tag
                          handleSuggest()
                        }
                      }
                    }}
                  />
                  <button type="button" className="btn ghost" onClick={refreshSuggestions}>Refresh</button>
                </div>

              {/* Filter controls: sports only / both / hide sports */}
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button type="button" onClick={() => { const m: 'both'|'sports'|'no-sports' = 'both'; setFilterMode(m); setDisplayedTags(() => fillDisplayedTags([], new Set(selected), m)); }} className={filterMode === 'both' ? 'btn' : 'btn ghost'}>All</button>
                <button type="button" onClick={() => { const m: 'both'|'sports'|'no-sports' = 'sports'; setFilterMode(m); setDisplayedTags(() => fillDisplayedTags([], new Set(selected), m)); }} className={filterMode === 'sports' ? 'btn' : 'btn ghost'}>Sports only</button>
                <button type="button" onClick={() => { const m: 'both'|'sports'|'no-sports' = 'no-sports'; setFilterMode(m); setDisplayedTags(() => fillDisplayedTags([], new Set(selected), m)); }} className={filterMode === 'no-sports' ? 'btn' : 'btn ghost'}>Hide sports</button>
              </div>

              <h4 style={{ marginTop: 14, marginBottom: 8 }}>Recommended tags</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                {(query.trim() ? filtered : (
                  // apply filter to displayedTags as well
                  filterMode === 'both' ? displayedTags : displayedTags.filter(t => filterMode === 'sports' ? SPORTS.has(t.toLowerCase()) : !SPORTS.has(t.toLowerCase()) )
                )).map(tag => (
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

              {/* Selected tags */}
              {selected.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Selected tags</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {selected.map(t => (
                      <div key={t} className="chip" onClick={() => toggle(t)}>{t} ✕</div>
                    ))}
                  </div>
                </div>
              )}

              {/* show suggest option if query not matching any tag */}
              {query.trim() && !allTags.some(t => t.toLowerCase() === query.trim().toLowerCase()) && (
                <div style={{ marginTop: 12 }}>
                  <button type="button" className="btn ghost full" onClick={handleSuggest}>Suggest "{query.trim()}"</button>
                </div>
              )}

               <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                 {singleMode ? (
                   <>
                     <button type="button" className="btn" onClick={handleSave}>Save</button>
                     <button type="button" className="btn ghost" onClick={handleClose}>Cancel</button>
                   </>
                 ) : (
                   <>
                     <button type="button" className="btn" onClick={() => setStep(2)} disabled={!isStepValid(1)}>Next</button>
                     {!requiredFlow && <button type="button" className="btn ghost" onClick={onClose}>Skip</button>}
                   </>
                 )}
               </div>
            </>
          ) : step === 2 ? (
            // Step 2: Vibes
            <>
              <p style={{ marginTop: 0 }}>Select the vibes that describe your typical sessions or intent. Refresh to see different suggested vibes.</p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input className="input" placeholder="Filter vibes" value={''} onChange={() => {}} />
                  <button type="button" className="btn ghost" onClick={() => setDisplayedVibes(() => sample(VIBES_TAGS.filter(v => !selectedVibes.includes(v)), 10))}>Refresh</button>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                  {displayedVibes.map(v => (
                    <button key={v} type="button" onClick={() => toggleVibe(v)} className={"btn " + (selectedVibes.includes(v) ? '' : 'ghost')} style={{ padding: '6px 10px', fontSize: 13, borderRadius: 999 }}>{v}</button>
                  ))}
                </div>

                {selectedVibes.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Selected vibes</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {selectedVibes.map(v => <div key={v} className="chip" onClick={() => toggleVibe(v)}>{v} ✕</div>)}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  {singleMode ? (
                    <>
                      <button type="button" className="btn" onClick={handleSave}>Save</button>
                      <button type="button" className="btn ghost" onClick={handleClose}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button type="button" className="btn" onClick={() => setStep(3)} disabled={!isStepValid(2)}>Next</button>
                      <button type="button" className="btn ghost" onClick={() => setStep(1)}>Back</button>
                    </>
                  )}
                </div>
            </>
            ) : step === 3 ? (
            // Step 3: About me
            <>
              <p style={{ marginTop: 0 }}>
                Include anything in this section you might want others to know about you. This might be what brings you to the area, what your week might look like generally, activities that get you excited or what you might be wanting to find in participants or activities. This helps others connect with you.
              </p>

              <label className="input-label">About me</label>
              <textarea className="input" style={{ minHeight: 120 }} value={about} onChange={e => setAbout(e.target.value)} />

              <div style={{ marginTop: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Switch checked={aboutPublic} onChange={v => setAboutPublic(v)} />
                  <span>Make this about me public (visible to everyone). Otherwise it will be limited to friends.</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                {singleMode ? (
                  <>
                    <button type="button" className="btn" onClick={handleSave}>Save</button>
                    <button type="button" className="btn ghost" onClick={handleClose}>Cancel</button>
                  </>
                ) : (
                  <>
                    <button type="button" className="btn" onClick={() => setStep(4)} disabled={!isStepValid(3)}>Next</button>
                    <button type="button" className="btn ghost" onClick={() => setStep(2)}>Back</button>
                  </>
                )}
              </div>
              </>
            ) : step === 4 ? (
              // Step 4: Gender
              <>
                <p style={{ marginTop: 0 }}>
                  The following question is used to help users gauge participants in an activity.
                </p>

                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 13, marginBottom: 6 }}>Gender (required)</div>
                  <div style={{ marginBottom: 8, fontSize: 12 }}>
                    Note: This information will not be displayed on your public profile unless you choose to.
                  </div>
                  <select className="input" value={gender} onChange={e => setGender(e.target.value)}>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Non-Binary</option>
                    <option>Prefer not to say</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  {singleMode ? (
                    <>
                      <button type="button" className="btn" onClick={handleSave}>Save</button>
                      <button type="button" className="btn ghost" onClick={handleClose}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button type="button" className="btn" onClick={() => { if (isStepValid(4)) handleSave() }} disabled={!isStepValid(4)}>Save</button>
                      <button type="button" className="btn ghost" onClick={() => setStep(3)}>Back</button>
                    </>
                  )}
                  </div>
                </>
                ) : step === 5 ? (
                  // Step 5: Contact details
                  <>
                    <p style={{ marginTop: 0 }}>Add a display name and contact details. Email and phone will not be publicized on event popups.</p>

                    <label className="input-label">Display name</label>
                    <input className="input" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="How you want to be shown (e.g. Alex)" />

                    <label className="input-label" style={{ marginTop: 8 }}>Email (private)</label>
                    <input className="input" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="you@example.org" />

                    <label className="input-label" style={{ marginTop: 8 }}>Phone (private)</label>
                    <input className="input" value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="+61 4xx xxx xxx" />

                    <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                      {singleMode ? (
                        <>
                          <button type="button" className="btn" onClick={handleSave}>Save</button>
                          <button type="button" className="btn ghost" onClick={handleClose}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <button type="button" className="btn" onClick={() => { if (isStepValid(5)) handleSave(); setStep(6) }} disabled={!isStepValid(5)}>Next</button>
                          <button type="button" className="btn ghost" onClick={() => setStep(4)}>Back</button>
                        </>
                      )}
                    </div>
                  </>
                ) : step === 6 ? (
                  // Step 6: Change password
                  <>
                    <p style={{ marginTop: 0 }}>Change your local account password (prototype). Passwords are stored locally for this demo.</p>

                    {(getProfile(userId) as any)?.password && (
                      <>
                        <label className="input-label">Current password</label>
                        <input className="input" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
                      </>
                    )}

                    <label className="input-label" style={{ marginTop: 8 }}>New password</label>
                    <input className="input" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />

                    <label className="input-label" style={{ marginTop: 8 }}>Confirm new password</label>
                    <input className="input" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />

                    <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                      {singleMode ? (
                        <>
                          <button type="button" className="btn" onClick={() => { handleChangePassword(); handleClose() }}>Save</button>
                          <button type="button" className="btn ghost" onClick={handleClose}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <button type="button" className="btn" onClick={() => { if (isStepValid(6)) handleChangePassword(); setStep(1) }} disabled={!isStepValid(6)}>Save</button>
                          <button type="button" className="btn ghost" onClick={() => setStep(5)}>Back</button>
                        </>
                      )}
                    </div>
                  </>
                ) : null}
        </div>
      </div>
    </div>
  )
}

