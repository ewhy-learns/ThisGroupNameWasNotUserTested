import React, { useMemo, useState } from 'react'
import { getSuggestedTags, saveProfile, suggestTag, getProfile, getPublicUsername, getPreferredName, getProfileSectionVisibility, ProfileSectionKey, ProfileSectionVisibility } from './AuthService'
import { XIcon, ArrowRightIcon, ArrowLeftIcon, CheckIcon } from './Icons'

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

const INTEREST_CAROUSEL_SIZE = 12
const INTEREST_CAROUSEL_STEP = 6
const VIBE_CAROUSEL_SIZE = 12
const VIBE_CAROUSEL_STEP = 4

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

function getWrappedItems<T>(arr: T[], start: number, count: number) {
  if (arr.length === 0) return []
  if (arr.length <= count) return arr
  const offset = ((start % arr.length) + arr.length) % arr.length
  return Array.from({ length: count }, (_, index) => arr[(offset + index) % arr.length])
}

type EditablePrivacy = Record<ProfileSectionKey, ProfileSectionVisibility>

const DEFAULT_PRIVACY: EditablePrivacy = {
  interests: 'public',
  vibes: 'public',
  about: 'private',
  demographic: 'private',
  contact: 'private',
  hostHistory: 'public',
  participantHistory: 'private',
  reviews: 'public',
}

export default function ProfileModal({ open, onClose, userId, initialStep, requiredFlow = false }: EditorProps) {
  const [interestQuery, setInterestQuery] = useState('')
  const [vibeQuery, setVibeQuery] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [step, setStep] = useState<number>(0)
  const [about, setAbout] = useState('')
  const [aboutPublic, setAboutPublic] = useState<boolean>(true)
  const [gender, setGender] = useState<string>('Prefer not to say')
  // contact details (editable in profile but not publicized on events)
  const [preferredName, setPreferredName] = useState<string>('')
  const [contactEmail, setContactEmail] = useState<string>('')
  const [contactPhone, setContactPhone] = useState<string>('')
  const [yearOfBirth, setYearOfBirth] = useState<string>('')
  const [photoDataUrl, setPhotoDataUrl] = useState<string>('')
  const [privacy, setPrivacy] = useState<EditablePrivacy>(DEFAULT_PRIVACY)
  const [sharePreferredNameWithParticipants, setSharePreferredNameWithParticipants] = useState<boolean>(false)
  // password change fields
  const [currentPassword, setCurrentPassword] = useState<string>('')
  const [newPassword, setNewPassword] = useState<string>('')
  const [confirmPassword, setConfirmPassword] = useState<string>('')
  const [toast, setToast] = useState<string | null>(null)
  const suggested = useMemo(() => getSuggestedTags(), [])
  const singleMode = typeof initialStep === 'number'
  const modalTitle = requiredFlow ? 'Get started' : singleMode ? 'Edit' : 'Edit profile'
  const [interestCarouselIndex, setInterestCarouselIndex] = useState(0)
  const [vibeCarouselIndex, setVibeCarouselIndex] = useState(0)

  const largeList = useMemo(() => LARGE_TAGS, [])
  const [filterMode, setFilterMode] = useState<'both'|'sports'|'no-sports'>('both')

  // vibes state
  const [selectedVibes, setSelectedVibes] = useState<string[]>([])
  const orderedVibes = useMemo(() => [...VIBES_TAGS], [])

  const renderPrivacyButtons = (section: ProfileSectionKey, options?: ProfileSectionVisibility[]) => {
    const allowedOptions = options || (section === 'demographic' || section === 'contact' ? ['private', 'hosts'] : ['private', 'hosts', 'public'])
    const labels: Record<ProfileSectionVisibility, string> = {
      private: 'Private',
      hosts: 'Hosts',
      public: 'Public',
    }
    return (
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
        {allowedOptions.map(option => (
          <button
            key={`${section}_${option}`}
            type="button"
              className={`btn-pill ${privacy[section] === option ? 'btn' : 'btn ghost'}`}
            onClick={() => setPrivacy(current => ({ ...current, [section]: option }))}
          >
            {labels[option]}
          </button>
        ))}
      </div>
    )
  }

  const scrollVibes = (direction: -1 | 1) => {
    setVibeCarouselIndex(current => current + direction * VIBE_CAROUSEL_STEP)
  }

  const scrollInterests = (direction: -1 | 1) => {
    setInterestCarouselIndex(current => current + direction * INTEREST_CAROUSEL_STEP)
  }

  const buildProfile = (overrides?: Record<string, any>) => {
    const existing = getProfile(userId)
    return {
      ...(existing || { id: userId, tags: [] }),
      id: userId,
      username: existing?.username || getPublicUsername(userId, existing),
      preferredName: (preferredName || existing?.preferredName || getPreferredName(userId, existing)) || undefined,
      tags: selected,
      vibes: selectedVibes,
      about,
      aboutPublic: privacy.about === 'public',
      gender,
      email: contactEmail || existing?.email || undefined,
      phone: contactPhone || existing?.phone || undefined,
      yearOfBirth: yearOfBirth || existing?.yearOfBirth || undefined,
      photoDataUrl: photoDataUrl || existing?.photoDataUrl || existing?.avatarDataUrl || existing?.avatarUrl || undefined,
      avatarDataUrl: photoDataUrl || existing?.avatarDataUrl || existing?.photoDataUrl || existing?.avatarUrl || undefined,
      privacy,
      sharePreferredNameWithParticipants,
      completedAt: existing?.completedAt,
      ...overrides,
    }
  }


  // load existing profile when opening for edit
  React.useEffect(() => {
    if (!open) return
    // if caller requested a particular step (e.g. edit about/gender/interests), set it
    if (initialStep && initialStep >= 1 && initialStep <= 7) {
      setStep(initialStep)
    } else if (requiredFlow) {
      setStep(1)
    } else {
      setStep(0) // show section menu
    }
    try {
      const profile = getProfile(userId)
        if (profile) {
        setSelected(profile.tags ?? [])
        setAbout(profile.about ?? '')
        setGender(profile.gender ?? 'Prefer not to say')
        setPreferredName(profile.preferredName ?? profile.displayName ?? getPreferredName(userId, profile))
        setContactEmail(profile.email ?? '')
        setContactPhone(profile.phone ?? '')
        setYearOfBirth(profile.yearOfBirth ?? '')
        setPhotoDataUrl(profile.photoDataUrl ?? profile.avatarDataUrl ?? profile.avatarUrl ?? '')
        setPrivacy({
          interests: getProfileSectionVisibility(profile, 'interests'),
          vibes: getProfileSectionVisibility(profile, 'vibes'),
          about: getProfileSectionVisibility(profile, 'about'),
          demographic: getProfileSectionVisibility(profile, 'demographic'),
          contact: getProfileSectionVisibility(profile, 'contact'),
          hostHistory: getProfileSectionVisibility(profile, 'hostHistory'),
          participantHistory: getProfileSectionVisibility(profile, 'participantHistory'),
          reviews: getProfileSectionVisibility(profile, 'reviews'),
        })
        setSharePreferredNameWithParticipants(!!profile.sharePreferredNameWithParticipants)
        setSelectedVibes(profile.vibes ?? [])
        setInterestQuery('')
        setVibeQuery('')
        setInterestCarouselIndex(0)
        setVibeCarouselIndex(0)
        } else {
        setSelected([])
        setAbout('')
          setGender('Prefer not to say')
          setPreferredName('')
          setContactEmail('')
          setContactPhone('')
          setYearOfBirth('')
          setPhotoDataUrl('')
          setPrivacy(DEFAULT_PRIVACY)
          setSharePreferredNameWithParticipants(false)
          setSelectedVibes([])
          setInterestQuery('')
          setVibeQuery('')
          setInterestCarouselIndex(0)
          setVibeCarouselIndex(0)
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

  const availableInterests = useMemo(() => {
    const base = allTags.filter(t => !selected.includes(t))
    // apply filterMode
    if (filterMode === 'both') return base
    if (filterMode === 'sports') return base.filter(t => SPORTS.has(t.toLowerCase()))
    return base.filter(t => !SPORTS.has(t.toLowerCase()))
  }, [allTags, selected, filterMode])

  const filteredInterests = useMemo(() => {
    const q = interestQuery.trim().toLowerCase()
    if (!q) return availableInterests
    return availableInterests.filter(tag => tag.toLowerCase().includes(q))
  }, [interestQuery, availableInterests])

  const visibleInterestSuggestions = useMemo(
    () => getWrappedItems(availableInterests, interestCarouselIndex, INTEREST_CAROUSEL_SIZE),
    [availableInterests, interestCarouselIndex],
  )

  const filteredVibes = useMemo(() => {
    const q = vibeQuery.trim().toLowerCase()
    if (!q) return orderedVibes
    return orderedVibes.filter(vibe => vibe.toLowerCase().includes(q))
  }, [orderedVibes, vibeQuery])

  const visibleVibeSuggestions = useMemo(
    () => getWrappedItems(filteredVibes, vibeCarouselIndex, VIBE_CAROUSEL_SIZE),
    [filteredVibes, vibeCarouselIndex],
  )

  React.useEffect(() => {
    setInterestCarouselIndex(current => (availableInterests.length ? ((current % availableInterests.length) + availableInterests.length) % availableInterests.length : 0))
  }, [availableInterests.length])

  React.useEffect(() => {
    setVibeCarouselIndex(current => (filteredVibes.length ? ((current % filteredVibes.length) + filteredVibes.length) % filteredVibes.length : 0))
  }, [filteredVibes.length])

  const toggle = (tag: string) => {
    setSelected(prev => {
      const selecting = !prev.includes(tag)
      const next = selecting ? [...prev, tag] : prev.filter(x => x !== tag)

      // persist to profile immediately (add or remove)
      try {
        if (userId) {
          const profile = getProfile(userId)
          const existing = profile?.tags ?? []
          const setTags = new Set<string>(existing)
          if (selecting) setTags.add(tag)
          else setTags.delete(tag)
          saveProfile(buildProfile({ tags: Array.from(setTags) }))
        }
      } catch (e) {
        console.warn('[ProfileModal] persist selected tag failed', e)
      }

      return next
    })
  }

  const handleSuggest = () => {
    const value = interestQuery.trim()
    if (!value) return
    // add suggestion and select it
    suggestTag(value)
    setSelected(prev => prev.includes(value) ? prev : [...prev, value])
    setInterestQuery('')
    // persist suggestion
    try {
      if (userId) {
        const profile = getProfile(userId)
        const existing = profile?.tags ?? []
        const setTags = new Set<string>(existing)
        setTags.add(value)
        saveProfile(buildProfile({ tags: Array.from(setTags) }))
      }
    } catch (e) {
      console.warn('[ProfileModal] persist suggested tag failed', e)
    }
  }

  const isProfileCompleted = () => {
    const p = getProfile(userId)
    return !!(p && p.completedAt)
  }

  // Validation for each step. About may be empty and 'Prefer not to say' is allowed for gender.
  const isStepValid = (s: number) => {
    if (s === 1) return true
    if (s === 2) return true
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
      // persist vibes immediately
      try {
        if (userId) {
          const profile = getProfile(userId)
          const p = buildProfile({ tags: profile?.tags ?? selected, vibes: next })
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
    const profile = buildProfile({ email: contactEmail || undefined, phone: contactPhone || undefined, completedAt: Date.now() })
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
      saveProfile({ ...profile, username: profile.username || getPublicUsername(userId, profile), preferredName: profile.preferredName || preferredName || getPreferredName(userId, profile), sharePreferredNameWithParticipants })
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

  const handleBackToMenu = () => setStep(0)

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

  // InfoTip component (inline for simplicity)
  const InfoTip = ({ text }: { text: string }) => {
    const [show, setShow] = React.useState(false)
    return (
      <span style={{ position: 'relative', display: 'inline-flex', verticalAlign: 'middle', marginLeft: 4 }}>
        <button type="button" onClick={() => setShow(s => !s)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#9ca3af', fontSize: 14, lineHeight: 1 }} aria-label="More info">ℹ</button>
        {show && (
          <div style={{ position: 'absolute', bottom: '120%', left: 0, zIndex: 200, background: '#1f2937', color: 'white', padding: '8px 12px', borderRadius: 10, fontSize: 12, width: 220, whiteSpace: 'normal', boxShadow: '0 8px 24px rgba(2,6,23,0.25)', lineHeight: 1.5 }} role="tooltip">
            {text}
            <button onClick={() => setShow(false)} style={{ position: 'absolute', top: 4, right: 6, background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 0, lineHeight: 1 }}><XIcon size={12} /></button>
          </div>
        )}
      </span>
    )
  }

  // Section menu (step 0)
  const renderSectionMenu = () => (
    <div style={{ display: 'grid', gap: 10 }}>
      <p style={{ marginTop: 0, color: '#6b7280', fontSize: 13 }}>Select a section to edit.</p>
      {([
        { step: 1, icon: '⚽', label: 'Interests & sports', desc: 'Sports, hobbies and activities you enjoy' },
        { step: 2, icon: '✨', label: 'Vibes', desc: 'The kind of sessions and people you enjoy' },
        { step: 3, icon: '📝', label: 'About me', desc: 'A short bio others can read on your profile' },
        { step: 4, icon: '👤', label: 'Demographics', desc: 'Gender and year of birth (private by default)' },
        { step: 5, icon: '🪪', label: 'Identity & contact', desc: 'Preferred name, profile photo, email, phone' },
        { step: 7, icon: '🔒', label: 'Privacy settings', desc: 'Control who sees each section of your profile' },
        { step: 6, icon: '🔑', label: 'Change password', desc: 'Update your local account password' },
      ] as Array<{ step: number; icon: string; label: string; desc: string }>).map(item => (
        <button key={item.step} type="button" onClick={() => setStep(item.step)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 16, border: '1px solid rgba(15,23,32,0.1)', background: 'white', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
          <span style={{ fontSize: 22, flexShrink: 0 }}>{item.icon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{item.label}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{item.desc}</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: '#9ca3af' }}><path d="M9 18l6-6-6-6"/></svg>
        </button>
      ))}
      <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn ghost"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('demo1_open_profile', { detail: { id: userId } }))
            onClose()
          }}
        >
          View profile
        </button>
        <button type="button" className="btn" onClick={onClose}>Done</button>
      </div>
    </div>
  )

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header">
          <h3>{modalTitle}</h3>
          <button type="button" className="modal-close" onClick={handleClose} aria-label="Close"><XIcon size={16} /></button>
        </div>

        <div className="modal-body">

          {step === 0 ? renderSectionMenu() : step === 1 ? (
            <>
              <p style={{ marginTop: 0 }}>
                Select at least one interest if you can, and add as many as feel useful. You can continue even if you want to skip this for now.
              </p>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    className="input"
                    placeholder="Search tags"
                    value={interestQuery}
                    onChange={e => setInterestQuery(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const v = interestQuery.trim()
                        if (!v) return
                        const match = allTags.find(t => t.toLowerCase() === v.toLowerCase())
                        if (match) {
                          toggle(match)
                        } else {
                          handleSuggest()
                        }
                      }
                    }}
                  />
                </div>

              {/* Filter controls */}
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button type="button" onClick={() => { setFilterMode('both'); setInterestCarouselIndex(0) }} className={filterMode === 'both' ? 'btn' : 'btn ghost'} style={{ fontSize: 13, padding: '6px 10px', borderRadius: 999 }}>All</button>
                <button type="button" onClick={() => { setFilterMode('sports'); setInterestCarouselIndex(0) }} className={filterMode === 'sports' ? 'btn' : 'btn ghost'} style={{ fontSize: 13, padding: '6px 10px', borderRadius: 999 }}>Sports only</button>
                <button type="button" onClick={() => { setFilterMode('no-sports'); setInterestCarouselIndex(0) }} className={filterMode === 'no-sports' ? 'btn' : 'btn ghost'} style={{ fontSize: 13, padding: '6px 10px', borderRadius: 999 }}>Hide sports</button>
              </div>

              {/* Arrow-driven wraparound suggestions */}
              {!interestQuery.trim() ? (
                <div style={{ position: 'relative', marginTop: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Suggested tags</div>
                  {availableInterests.length > INTEREST_CAROUSEL_SIZE && (
                    <>
                      <div style={{ position: 'absolute', left: 0, top: 28, bottom: 0, width: 38, background: 'linear-gradient(90deg, white 35%, rgba(255,255,255,0))', zIndex: 2, pointerEvents: 'none' }} />
                      <button type="button" className="icon-btn" aria-label="Scroll left" onClick={() => scrollInterests(-1)} style={{ position: 'absolute', left: 2, top: '62%', transform: 'translateY(-50%)', zIndex: 3, background: 'white', border: '1px solid rgba(15,23,32,0.08)', boxShadow: '0 6px 16px rgba(15,23,32,0.08)' }}>‹</button>
                    </>
                  )}
                  {availableInterests.length > INTEREST_CAROUSEL_SIZE && (
                    <>
                      <div style={{ position: 'absolute', right: 0, top: 28, bottom: 0, width: 38, background: 'linear-gradient(270deg, white 35%, rgba(255,255,255,0))', zIndex: 2, pointerEvents: 'none' }} />
                      <button type="button" className="icon-btn" aria-label="Scroll right" onClick={() => scrollInterests(1)} style={{ position: 'absolute', right: 2, top: '62%', transform: 'translateY(-50%)', zIndex: 3, background: 'white', border: '1px solid rgba(15,23,32,0.08)', boxShadow: '0 6px 16px rgba(15,23,32,0.08)' }}>›</button>
                    </>
                  )}
                  <div style={{ overflow: 'hidden', padding: '0 34px' }}>
                    <div style={{ display: 'grid', gridAutoFlow: 'column', gridTemplateRows: 'repeat(2, minmax(0, 1fr))', gap: 8, alignItems: 'start', width: 'max-content', paddingBottom: 4 }}>
                      {visibleInterestSuggestions.map(tag => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggle(tag)}
                          className={selected.includes(tag) ? 'btn' : 'btn ghost'}
                          style={{ padding: '6px 10px', fontSize: 13, borderRadius: 999, whiteSpace: 'nowrap', lineHeight: 1.1, minHeight: 32, flex: '0 0 auto' }}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Search results</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {filteredInterests.slice(0, 30).map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggle(tag)}
                        className={'btn ' + (selected.includes(tag) ? '' : 'ghost')}
                        style={{ padding: '6px 10px', fontSize: 13, borderRadius: 999, flex: 'unset' }}
                      >
                        {tag}
                      </button>
                    ))}
                    {filteredInterests.length === 0 && <div style={{ color: '#9ca3af', fontSize: 13 }}>No matching tags yet.</div>}
                  </div>
                </div>
              )}

              {/* Selected tags */}
              {selected.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Selected</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {selected.map(t => (
                      <div key={t} className="chip" onClick={() => toggle(t)}>{t} <XIcon size={10} style={{ verticalAlign: 'middle', marginLeft: 2 }} /></div>
                    ))}
                  </div>
                </div>
              )}

              {/* suggest option */}
              {interestQuery.trim() && !allTags.some(t => t.toLowerCase() === interestQuery.trim().toLowerCase()) && (
                <div style={{ marginTop: 12 }}>
                  <button type="button" className="btn ghost full" onClick={handleSuggest}>Suggest "{interestQuery.trim()}"</button>
                </div>
              )}

               <div style={{ marginTop: 14 }}>
                 <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>Privacy <InfoTip text="Controls who can see your interests and sports list on your profile page." /></div>
                 <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Choose who can see your interests from your profile.</div>
                 {renderPrivacyButtons('interests')}
               </div>

               <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                 {requiredFlow ? (
                    <button type="button" className="btn" onClick={() => setStep(2)} disabled={!isStepValid(1)}>Next: Vibes <ArrowRightIcon size={14} style={{ verticalAlign: 'middle', marginLeft: 2 }} /></button>
                 ) : (
                   <>
                     <button type="button" className="btn ghost" onClick={singleMode ? handleClose : handleBackToMenu}>Cancel</button>
                     <button type="button" className="btn" onClick={handleSave}>Save</button>
                   </>
                 )}
               </div>
            </>
          ) : step === 2 ? (
            // Step 2: Vibes
            <>
              <p style={{ marginTop: 0 }}>Select at least one vibe if it helps, and add as many as feel useful. You can continue without choosing any yet.</p>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    className="input"
                    placeholder="Search vibes"
                    value={vibeQuery}
                    onChange={e => { setVibeQuery(e.target.value); setVibeCarouselIndex(0) }}
                  />
                </div>

                <div style={{ position: 'relative', marginTop: 12 }}>
                  {filteredVibes.length > VIBE_CAROUSEL_SIZE && (
                    <>
                      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 38, background: 'linear-gradient(90deg, white 35%, rgba(255,255,255,0))', zIndex: 2, pointerEvents: 'none' }} />
                      <button type="button" className="icon-btn" aria-label="Scroll vibes left" onClick={() => scrollVibes(-1)} style={{ position: 'absolute', left: 2, top: '50%', transform: 'translateY(-50%)', zIndex: 3, background: 'white', border: '1px solid rgba(15,23,32,0.08)', boxShadow: '0 6px 16px rgba(15,23,32,0.08)' }}>‹</button>
                    </>
                  )}
                  {filteredVibes.length > VIBE_CAROUSEL_SIZE && (
                    <>
                      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 38, background: 'linear-gradient(270deg, white 35%, rgba(255,255,255,0))', zIndex: 2, pointerEvents: 'none' }} />
                      <button type="button" className="icon-btn" aria-label="Scroll vibes right" onClick={() => scrollVibes(1)} style={{ position: 'absolute', right: 2, top: '50%', transform: 'translateY(-50%)', zIndex: 3, background: 'white', border: '1px solid rgba(15,23,32,0.08)', boxShadow: '0 6px 16px rgba(15,23,32,0.08)' }}>›</button>
                    </>
                  )}
                  <div style={{ overflow: 'hidden', padding: '0 34px' }}>
                    <div style={{ display: 'grid', gridAutoFlow: 'column', gridTemplateRows: 'repeat(2, minmax(0, 1fr))', gap: 8, alignItems: 'start', width: 'max-content', paddingBottom: 4 }}>
                      {visibleVibeSuggestions.map(v => (
                        <button key={v} type="button" onClick={() => toggleVibe(v)} className={selectedVibes.includes(v) ? 'btn' : 'btn ghost'} style={{ padding: '6px 10px', fontSize: 13, borderRadius: 999, whiteSpace: 'nowrap', lineHeight: 1.1, minHeight: 32, flex: '0 0 auto' }}>{v}</button>
                      ))}
                    </div>
                  </div>
                  {filteredVibes.length === 0 && <div style={{ marginTop: 8, color: '#9ca3af', fontSize: 13 }}>No matching vibes found.</div>}
                </div>

                {selectedVibes.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Selected vibes</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {selectedVibes.map(v => <div key={v} className="chip" onClick={() => toggleVibe(v)}>{v} <XIcon size={10} style={{ verticalAlign: 'middle', marginLeft: 2 }} /></div>)}
                    </div>
                  </div>
                )}

                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Privacy</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Choose who can see your vibes from your profile.</div>
                  {renderPrivacyButtons('vibes')}
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  {requiredFlow ? (
                    <>
                      <button type="button" className="btn ghost" onClick={() => setStep(1)}><ArrowLeftIcon size={14} style={{ verticalAlign: 'middle', marginRight: 2 }} /> Back</button>
                      <button type="button" className="btn" onClick={() => { handleSave(); }} disabled={!isStepValid(2)}>Done <CheckIcon size={14} style={{ verticalAlign: 'middle', marginLeft: 2 }} /></button>
                    </>
                  ) : (
                    <>
                      <button type="button" className="btn ghost" onClick={singleMode ? handleClose : handleBackToMenu}>Cancel</button>
                      <button type="button" className="btn" onClick={handleSave}>Save</button>
                    </>
                  )}
                </div>
            </>
            ) : step === 3 ? (
            // Step 3: About me
            <>
              <p style={{ marginTop: 0 }}>
                Include anything in this section you might want others to know about you. This helps others connect with you.
              </p>

              <label className="input-label">About me <InfoTip text="A short bio - what brings you here, what activities you enjoy, what you look for in sessions." /></label>
              <textarea className="input" style={{ minHeight: 120 }} value={about} onChange={e => setAbout(e.target.value)} />

              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>Privacy <InfoTip text="Controls who can read your bio on your profile page." /></div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Choose who can see your about section.</div>
                {renderPrivacyButtons('about')}
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button type="button" className="btn ghost" onClick={singleMode ? handleClose : handleBackToMenu}>Cancel</button>
                <button type="button" className="btn" onClick={handleSave}>Save</button>
              </div>
              </>
            ) : step === 4 ? (
              // Step 4: Demographic information
              <>
                <p style={{ marginTop: 0 }}>
                  This information helps other users gauge group make-up while still letting you control what you share.
                </p>

                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 13, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>Gender <InfoTip text="Optional. By default this is private and only visible if you choose to share it with hosts." /></div>
                  <select className="input" value={gender} onChange={e => setGender(e.target.value)}>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Non-Binary</option>
                    <option>Prefer not to say</option>
                  </select>
                </div>

                <label className="input-label" style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 4 }}>Year of birth <InfoTip text="Optional. Used to show age group context in sessions. Private by default." /></label>
                <input className="input" value={yearOfBirth} onChange={e => setYearOfBirth(e.target.value)} placeholder="e.g. 1998" inputMode="numeric" />

                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>Privacy <InfoTip text="Demographic info is sensitive. Private means only you see it. Hosts means session organisers can see it when relevant." /></div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Demographic information is private by default.</div>
                  {renderPrivacyButtons('demographic', ['private', 'hosts'])}
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button type="button" className="btn ghost" onClick={singleMode ? handleClose : handleBackToMenu}>Cancel</button>
                  <button type="button" className="btn" onClick={handleSave}>Save</button>
                </div>
                </>
                ) : step === 5 ? (
                  // Step 5: Contact details
                  <>
                    <p style={{ marginTop: 0 }}>Your username is your public identity across the app. Preferred name is shown to hosts when you apply.</p>

                    <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Profile photo <InfoTip text="Your profile photo is always visible to anyone who views your profile. Choose a photo you are happy to share publicly." /></label>
                    <input type="file" accept="image/*" onChange={e => {
                      const f = e.target.files && e.target.files[0]
                      if (!f) return
                      const reader = new FileReader()
                      reader.onload = () => setPhotoDataUrl(String(reader.result || ''))
                      reader.readAsDataURL(f)
                    }} />
                    {photoDataUrl && <div style={{ marginTop: 8 }}><img src={photoDataUrl} alt="Profile preview" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 999, border: '1px solid rgba(15,23,32,0.08)' }} /></div>}

                    <label className="input-label" style={{ marginTop: 10 }}>Username</label>
                    <input className="input" value={getPublicUsername(userId)} readOnly aria-readonly="true" />

                    <label className="input-label" style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>Preferred name <InfoTip text="The name you want hosts to use when addressing you." /></label>
                    <input className="input" value={preferredName} onChange={e => setPreferredName(e.target.value)} placeholder="What hosts can call you (e.g. Alex)" />

                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>Preferred name visibility <InfoTip text="Choose whether your preferred name is visible publicly, or only to other session members." /></div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                        <button type="button" className={!sharePreferredNameWithParticipants ? 'btn' : 'btn ghost'} style={{ flex: '0 0 auto', padding: '6px 12px', fontSize: 13, borderRadius: 999 }} onClick={() => setSharePreferredNameWithParticipants(false)}>Public</button>
                        <button type="button" className={sharePreferredNameWithParticipants ? 'btn' : 'btn ghost'} style={{ flex: '0 0 auto', padding: '6px 12px', fontSize: 13, borderRadius: 999 }} onClick={() => setSharePreferredNameWithParticipants(true)}>Other session members</button>
                      </div>
                    </div>

                    <label className="input-label" style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 4 }}>Email <InfoTip text="Your email is private and will never be shown publicly. You can optionally share it with hosts." /></label>
                    <input className="input" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="you@example.org" />

                    <label className="input-label" style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>Phone <InfoTip text="Your phone number is private. You can optionally share it with hosts." /></label>
                    <input className="input" value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="+61 4xx xxx xxx" />

                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>Contact section privacy <InfoTip text="Controls whether your contact section is visible to others. Hosts means session organisers can see it." /></div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Contact details are private by default.</div>
                      {renderPrivacyButtons('contact', ['private', 'hosts'])}
                    </div>

                    <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                      <button type="button" className="btn ghost" onClick={singleMode ? handleClose : handleBackToMenu}>Cancel</button>
                      <button type="button" className="btn" onClick={() => { saveProfile(buildProfile({ email: contactEmail || undefined, phone: contactPhone || undefined })); setToast('Saved'); setTimeout(() => setToast(null), 1500) }}>Save</button>
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
                          <button type="button" className="btn ghost" onClick={handleClose}>Cancel</button>
                          <button type="button" className="btn" onClick={() => { handleChangePassword(); handleClose() }}>Save</button>
                        </>
                      ) : (
                        <>
                          <button type="button" className="btn ghost" onClick={handleBackToMenu}>Cancel</button>
                          <button type="button" className="btn" onClick={() => {
                            if (!isStepValid(6)) return
                            if (newPassword || confirmPassword || currentPassword) handleChangePassword()
                            else { setToast('No changes'); setTimeout(() => setToast(null), 1200) }
                          }} disabled={!isStepValid(6)}>Save</button>
                        </>
                      )}
                    </div>
                  </>
                ) : step === 7 ? (
                  // Step 7: Profile tabs privacy
                  <>
                    <p style={{ marginTop: 0 }}>Control who can see each section of your profile. These settings apply to visitors viewing your profile.</p>

                    <div style={{ display: 'grid', gap: 14 }}>
                      <div style={{ padding: 14, borderRadius: 14, background: '#f8fafc', border: '1px solid rgba(15,23,32,0.08)' }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>Interests &amp; sports</div>
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2, marginBottom: 8 }}>Your activity interests and hobbies.</div>
                        {renderPrivacyButtons('interests')}
                      </div>

                      <div style={{ padding: 14, borderRadius: 14, background: '#f8fafc', border: '1px solid rgba(15,23,32,0.08)' }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>Vibes</div>
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2, marginBottom: 8 }}>The session types and social context you enjoy.</div>
                        {renderPrivacyButtons('vibes')}
                      </div>

                      <div style={{ padding: 14, borderRadius: 14, background: '#f8fafc', border: '1px solid rgba(15,23,32,0.08)' }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>About me</div>
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2, marginBottom: 8 }}>Your profile bio.</div>
                        {renderPrivacyButtons('about')}
                      </div>

                      <div style={{ padding: 14, borderRadius: 14, background: '#f8fafc', border: '1px solid rgba(15,23,32,0.08)' }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>Demographics</div>
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2, marginBottom: 8 }}>Gender and year of birth.</div>
                        {renderPrivacyButtons('demographic', ['private', 'hosts'])}
                      </div>

                      <div style={{ padding: 14, borderRadius: 14, background: '#f8fafc', border: '1px solid rgba(15,23,32,0.08)' }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>Hosted sessions tab</div>
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2, marginBottom: 8 }}>Sessions you have hosted.</div>
                        {renderPrivacyButtons('hostHistory')}
                      </div>

                      <div style={{ padding: 14, borderRadius: 14, background: '#f8fafc', border: '1px solid rgba(15,23,32,0.08)' }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>Participant history tab</div>
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2, marginBottom: 8 }}>Sessions you have participated in.</div>
                        {renderPrivacyButtons('participantHistory')}
                      </div>

                      <div style={{ padding: 14, borderRadius: 14, background: '#f8fafc', border: '1px solid rgba(15,23,32,0.08)' }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>Reviews tab</div>
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2, marginBottom: 8 }}>Reviews and feedback received.</div>
                        {renderPrivacyButtons('reviews')}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                      <button type="button" className="btn ghost" onClick={singleMode ? handleClose : handleBackToMenu}>Cancel</button>
                      <button type="button" className="btn" onClick={handleSave}>Save</button>
                    </div>
                  </>
                ) : null}
        </div>
      </div>
    </div>
  )
}

