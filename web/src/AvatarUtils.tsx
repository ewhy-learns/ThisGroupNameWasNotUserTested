import React from 'react'
import { getProfile } from './AuthService'

// ---------------------------------------------------------------------------
// Activity → emoji mapping
// ---------------------------------------------------------------------------

const ACTIVITY_EMOJI_MAP: Array<[RegExp, string]> = [
  [/run|jog/i, '🏃'],
  [/walk|stroll/i, '🚶'],
  [/trail run/i, '🏃'],
  [/cycl|biking|bicycle/i, '🚴'],
  [/swim/i, '🏊'],
  [/tennis/i, '🎾'],
  [/basketball/i, '🏀'],
  [/soccer|football/i, '⚽'],
  [/rugby/i, '🏉'],
  [/american football/i, '🏈'],
  [/baseball|softball/i, '⚾'],
  [/cricket/i, '🏏'],
  [/volleyball/i, '🏐'],
  [/golf/i, '⛳'],
  [/ski|snowboard|snow/i, '⛷️'],
  [/surf/i, '🏄'],
  [/sail/i, '⛵'],
  [/kayak|canoe/i, '🚣'],
  [/hik|trail walk|backpack/i, '🥾'],
  [/climb|boulder/i, '🧗'],
  [/yoga|pilates|tai chi/i, '🧘'],
  [/gym|weightlift|crossfit|powerlifting|calisthen/i, '💪'],
  [/danc|ballet|salsa|tango|zumba/i, '💃'],
  [/cook|bak|brew|mixology/i, '🍳'],
  [/photo/i, '📷'],
  [/music|guitar|piano|drum|violin|sing|choir|band|dj/i, '🎵'],
  [/paint|draw|sketch|watercolor|art/i, '🎨'],
  [/gaming|game|esport|chess/i, '🎮'],
  [/cod|program|develop|software/i, '💻'],
  [/garden|permacult|beekeep/i, '🌱'],
  [/travel|road trip|backpack travel/i, '✈️'],
  [/meditat|mindful|wellness/i, '🧠'],
  [/box|kickbox|martial|karate|judo|jiu-jitsu|taekwondo|wrestl|fenc/i, '🥊'],
  [/archery|bow/i, '🏹'],
  [/fish/i, '🎣'],
  [/horse|equestrian/i, '🐴'],
  [/skate|rollerblad|scooter/i, '🛹'],
  [/paddles|paddleboard/i, '🏄'],
  [/bird|wildlife|nature/i, '🦅'],
  [/theater|acting|improv|comedy/i, '🎭'],
  [/write|journal|blog|podcast/i, '✍️'],
  [/volunteer|community|charity/i, '🤝'],
  [/read|book club|literar/i, '📚'],
  [/coffee|tea|wine|beer|tasting/i, '☕'],
  [/wood|carpentry|blacksmith/i, '🔨'],
  [/knit|sew|crochet|embroid/i, '🧶'],
  [/astronomy|stargazing/i, '🔭'],
  [/3d print|robot|arduino|electron/i, '🤖'],
  [/drone/i, '🛸'],
  [/parkour|gymnast|acrobat|trampoline/i, '🤸'],
]

export function getActivityEmoji(activity?: string): string {
  if (!activity) return '🏅'
  for (const [pattern, emoji] of ACTIVITY_EMOJI_MAP) {
    if (pattern.test(activity)) return emoji
  }
  return '🏅'
}

// ---------------------------------------------------------------------------
// Vibe → background colour
// ---------------------------------------------------------------------------

const VIBE_COLORS: Array<[string, string]> = [
  ['Competitive', '#dc2626'],
  ['Social', '#2563eb'],
  ['Casual', '#fb923c'],
  ['LGBTIQ+', '#9333ea'],
  ['U25s', '#06b6d4'],
  ['Retirees', '#6b7280'],
  ['Womens', '#ec4899'],
  ['Mens', '#0284c7'],
]

export function getVibeColor(vibes: string[]): string {
  for (const [vibe, color] of VIBE_COLORS) {
    if (vibes.includes(vibe)) return color
  }
  return 'var(--accent)'
}

// ---------------------------------------------------------------------------
// EventAvatar
// ---------------------------------------------------------------------------

type EventAvatarProps = {
  event: any
  size?: number
}

export function EventAvatar({ event, size = 72 }: EventAvatarProps) {
  if (event?.photoDataUrl) {
    return (
      <img
        src={event.photoDataUrl}
        alt={event.title || event.activity || 'Session'}
        style={{ width: size, height: size, borderRadius: 14, objectFit: 'cover', border: '1px solid rgba(15,23,32,0.06)', flex: '0 0 auto' }}
      />
    )
  }
  const emoji = getActivityEmoji(event?.activity || event?.title)
  const fontSize = Math.round(size * 0.44)
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: 14,
      background: 'rgba(var(--accent-rgb),0.10)',
      border: '1px solid rgba(15,23,32,0.06)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize,
      flex: '0 0 auto',
      userSelect: 'none',
    }}>
      {emoji}
    </div>
  )
}

// ---------------------------------------------------------------------------
// PersonAvatar
// ---------------------------------------------------------------------------

function getInitials(label: string) {
  const cleaned = String(label || '').trim()
  if (!cleaned) return '?'
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

type PersonAvatarProps = {
  userId: string
  label: string
  size?: number
}

export function PersonAvatar({ userId, label, size = 44 }: PersonAvatarProps) {
  const profile: any = getProfile(userId)
  const imageSrc = profile?.photoDataUrl || profile?.avatarDataUrl || profile?.avatarUrl

  if (imageSrc) {
    return (
      <img
        src={imageSrc}
        alt={label}
        style={{ width: size, height: size, borderRadius: 999, objectFit: 'cover', flex: '0 0 auto', border: '1px solid rgba(15,23,32,0.06)' }}
      />
    )
  }

  const tags: string[] = Array.isArray(profile?.tags) ? profile.tags : []
  const vibes: string[] = Array.isArray(profile?.vibes) ? profile.vibes : []
  const topTag = tags[0]
  const emoji = topTag ? getActivityEmoji(topTag) : null
  const bgColor = getVibeColor(vibes)
  const fontSize = Math.round(size * 0.44)

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: 999,
      background: emoji ? `${bgColor}22` : `linear-gradient(135deg, var(--accent), var(--secondary))`,
      border: emoji ? `1.5px solid ${bgColor}44` : 'none',
      color: emoji ? bgColor : 'white',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: emoji ? undefined : 800,
      fontSize,
      flex: '0 0 auto',
      userSelect: 'none',
    }}>
      {emoji ?? getInitials(label)}
    </div>
  )
}
