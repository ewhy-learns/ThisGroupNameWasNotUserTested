export type Account = {
  id: string
  createdAt: number
}

const ACCOUNTS_KEY = 'demo1_accounts_v1'
const USER_KEY = 'demo1_user_v1'

function readAccounts(): Account[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY)
    if (!raw) return []
    return JSON.parse(raw) as Account[]
  } catch {
    return []
  }
}

function writeAccounts(accounts: Account[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
}

export function accountExists(id: string): boolean {
  if (!id) return false
  const accounts = readAccounts()
  return accounts.some(a => a.id.toLowerCase() === id.toLowerCase())
}

export function registerAccount(id: string) {
  if (!id) throw new Error('Invalid id')
  const accounts = readAccounts()
  if (accounts.some(a => a.id.toLowerCase() === id.toLowerCase())) return
  accounts.push({ id, createdAt: Date.now() })
  writeAccounts(accounts)
}

export function setLoggedInUser(id: string | null) {
  if (id === null) {
    localStorage.removeItem(USER_KEY)
  } else {
    localStorage.setItem(USER_KEY, id)
  }
}

export function getLoggedInUser(): string | null {
  return localStorage.getItem(USER_KEY)
}

export function logout() {
  setLoggedInUser(null)
}

// Profile helpers
const PROFILE_KEY = 'demo1_profile_v1'
const SUGGESTED_TAGS_KEY = 'demo1_suggested_tags_v1'

export type Profile = {
  id: string
  tags: string[]
  about?: string
  aboutPublic?: boolean
  gender?: string
  completedAt: number
}

export function getProfile(id: string): Profile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY + '_' + id)
    if (!raw) return null
    return JSON.parse(raw) as Profile
  } catch {
    return null
  }
}

export function saveProfile(profile: Profile) {
  localStorage.setItem(PROFILE_KEY + '_' + profile.id, JSON.stringify(profile))
}

export function isProfileComplete(id: string): boolean {
  return getProfile(id) !== null
}

export function suggestTag(tag: string) {
  try {
    const raw = localStorage.getItem(SUGGESTED_TAGS_KEY)
    const arr: string[] = raw ? JSON.parse(raw) : []
    if (!arr.includes(tag)) {
      arr.push(tag)
      localStorage.setItem(SUGGESTED_TAGS_KEY, JSON.stringify(arr))
    }
  } catch {
    // ignore
  }
}

export function getSuggestedTags(): string[] {
  try {
    const raw = localStorage.getItem(SUGGESTED_TAGS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

