import React, { useState, useRef, useEffect } from 'react'
import { accountExists, registerAccount, setLoggedInUser, readRegistrationDraft, writeRegistrationDraft, clearRegistrationDraft, normalizeAccountId, saveProfile, findAccountIdByIdentifier, getAccountRecoveryEmail } from './AuthService'
import { XIcon } from './Icons'

type Props = {
  open: boolean
  onClose: () => void
  onLoginSuccess: (id: string) => void
  initialMode?: 'login' | 'register'
}

export default function AuthModal({ open, onClose, onLoginSuccess, initialMode }: Props) {
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'login' | 'register'>('login')

  // registration fields (page 1)
  const [username, setUsername] = useState('')
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [preferredName, setPreferredName] = useState('')
  const [yearOfBirth, setYearOfBirth] = useState('')
  const [phone, setPhone] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [registered, setRegistered] = useState(false)
  const [registeredName, setRegisteredName] = useState('')
  const [registeredIdentifier, setRegisteredIdentifier] = useState('')
  const timerRef = useRef<number | null>(null)

  // don't early-return before hooks — check `open` later to avoid changing hook order

  const clear = () => {
    setId('')
    setPassword('')
    setError(null)
  }

  const handleLogin = () => {
    setError(null)
    const enteredIdentifier = id.trim()
    const resolvedId = findAccountIdByIdentifier(enteredIdentifier)
    const normalized = normalizeAccountId(enteredIdentifier)
    if (!enteredIdentifier || !normalized) {
      setError('Enter your username, email or phone')
      return
    }
    // Prototype: allow very loose auth. If account exists, log in regardless of password.
    if (resolvedId && accountExists(resolvedId)) {
      setLoggedInUser(resolvedId)
      onLoginSuccess(resolvedId)
      clear()
      onClose()
      return
    }

    // If account does not exist, create it locally and log in (prototype behavior).
    try {
      registerAccount(normalized)
      setLoggedInUser(normalized)
      onLoginSuccess(normalized)
      clear()
      onClose()
    } catch (e) {
      setError('Failed to create local account: ' + (e as Error).message)
    }
  }

  const passwordMeetsRequirements = (pw: string) => {
    if (!pw) return false
    if (pw.length < 10) return false
    if (!/[a-z]/.test(pw)) return false
    if (!/[A-Z]/.test(pw)) return false
    if (!/[0-9]/.test(pw)) return false
    if (!/[^A-Za-z0-9]/.test(pw)) return false
    return true
  }

  const isValidEmail = (e: string) => {
    return /^\S+@\S+\.\S+$/.test(e)
  }

  const isValidPhone = (p: string) => {
    // simple digits check, allow + and spaces
    return /^[+\d][\d\s-]{6,}$/.test(p)
  }

  const handleRegister = () => {
    setError(null)

    const enteredUsername = username.trim().toLowerCase()
    const email = recoveryEmail.trim().toLowerCase()
    const name = preferredName.trim()
    const yob = yearOfBirth.trim()
    const ph = phone.trim()
    const pw = password
    const identifier = normalizeAccountId(enteredUsername)

    if (!enteredUsername) {
      setError('Enter a username')
      return
    }
    if (!/^[a-z0-9._-]{3,}$/.test(enteredUsername)) {
      setError('Username must be at least 3 characters and use only letters, numbers, dots, underscores or hyphens')
      return
    }
    if (!email) {
      setError('Enter an email address')
      return
    }
    if (!isValidEmail(email)) {
      setError('Enter a valid email address')
      return
    }
    if (!name) {
      setError('Enter preferred name')
      return
    }
    const yearNum = yob ? parseInt(yob, 10) : NaN
    const currentYear = new Date().getFullYear()
    if (isNaN(yearNum) || yearNum < 1900 || yearNum > currentYear - 10) {
      setError('Enter a valid year of birth')
      return
    }
    if (ph && !isValidPhone(ph)) {
      setError('Enter a valid phone number')
      return
    }
    // Prototype: do not enforce password complexity. Passwords are optional/loose.

    registerAccount(identifier, email)
    saveProfile({
      id: identifier,
      username: enteredUsername,
      preferredName: name,
      yearOfBirth: yob || undefined,
      phone: ph || undefined,
      password: pw || undefined,
      tags: [],
      aboutPublic: true,
      sharePreferredNameWithParticipants: false,
      skillChecks: {},
      vibes: [],
    })

    // Prototype: local registration only (no backend).

    // show thank you message and return to login screen (do not auto-login in prototype)
    setRegistered(true)
    setRegisteredName(name)
    setRegisteredIdentifier(identifier)
    // clear registration fields
    setUsername('')
    setRecoveryEmail('')
    setPreferredName('')
    setYearOfBirth('')
    setPhone('')
    setPassword('')
    setPasswordConfirm('')
    setError(null)

    // clear persisted draft now registration succeeded
    try {
      clearRegistrationDraft()
    } catch (e) {
      // ignore
    }

    // auto-return to login after a short delay
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    timerRef.current = window.setTimeout(() => {
      setMode('login')
      setId(identifier)
      setRegistered(false)
      timerRef.current = null
    }, 2500)
  }

  // allow parent to open modal in a specific mode
  useEffect(() => {
    if (!open) return
    if (initialMode === 'register') setMode('register')
    else if (initialMode === 'login') setMode('login')
  }, [open, initialMode])

  const handleForgot = () => {
    // Prototype: no mail sent, just show a message
    if (!id.trim()) {
      setError('Enter your username, email or phone to reset')
      return
    }
    const resolvedId = findAccountIdByIdentifier(id.trim())
    const recoveryTarget = resolvedId ? getAccountRecoveryEmail(resolvedId) : ''
    setError('Password reset link (prototype) sent to ' + (recoveryTarget || id.trim()))
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [])

  // load registration draft when modal opens
  useEffect(() => {
    if (!open) return
    try {
      const draft = readRegistrationDraft()
      if (draft) {
        if (draft.username) setUsername(draft.username)
        if (draft.recoveryEmail) setRecoveryEmail(draft.recoveryEmail)
        if (draft.preferredName) setPreferredName(draft.preferredName)
        else if (draft.displayName) setPreferredName(draft.displayName)
        if (draft.yearOfBirth) setYearOfBirth(draft.yearOfBirth)
        if (draft.phone) setPhone(draft.phone)
      }
    } catch (e) {
      // ignore
    }
  }, [open])

  // persist registration draft whenever registration fields change
  useEffect(() => {
    try {
      writeRegistrationDraft({ username, recoveryEmail, preferredName, yearOfBirth, phone })
    } catch (e) {
      // ignore
    }
  }, [username, recoveryEmail, preferredName, yearOfBirth, phone])

  if (!open) return null

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header">
          <h3>{mode === 'login' ? 'Login' : 'Register'}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close"><XIcon size={16} /></button>
        </div>

        <div className="modal-body">
          {mode === 'login' ? (
            <>
              <label className="input-label">Username, email or phone</label>
              <input className="input" value={id} onChange={e => setId(e.target.value)} />

              <label className="input-label">Password</label>
              <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} />

              {error && <div className="error">{error}</div>}

              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button type="button" className="btn ghost" onClick={handleForgot}>Forgot password</button>
                <button type="button" className="btn" onClick={handleLogin}>Login</button>
              </div>

              <div style={{ marginTop: 12, fontSize: 14, display: 'flex', justifyContent: 'center' }}>
                <button type="button" className="btn ghost full" onClick={() => setMode('register')}>Register here</button>
              </div>
            </>
          ) : (
            // Registration page 1
            <>
              {registered ? (
                <div style={{ textAlign: 'center', padding: '12px 8px' }}>
                  <h4>Thanks for registering, {registeredName}!</h4>
                  <p style={{ marginTop: 8 }}>Please log in to continue.</p>
                  <div style={{ marginTop: 12 }}>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        setMode('login')
                        setId(registeredIdentifier)
                        setRegistered(false)
                      }}
                    >
                      Back to login
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <label className="input-label">Username</label>
                  <input className="input" value={username} onChange={e => setUsername(e.target.value)} placeholder="What other users will see" />

                  <div style={{ marginTop: 6, fontSize: 12, color: '#6b7280' }}>
                    Your public username will be <strong>{username.trim() ? normalizeAccountId(username) : 'username'}</strong>
                  </div>

                  <label className="input-label">Email</label>
                  <input className="input" value={recoveryEmail} onChange={e => setRecoveryEmail(e.target.value)} placeholder="Used for verification and account recovery" />

                  <div style={{ marginTop: 6, fontSize: 12, color: '#6b7280' }}>
                    This email stays private and is only used for verification and account recovery.
                  </div>

                  <label className="input-label">Preferred name</label>
                  <input className="input" value={preferredName} onChange={e => setPreferredName(e.target.value)} placeholder="What hosts can call you" />

                  <label className="input-label">Year of birth</label>
                  <input className="input" value={yearOfBirth} onChange={e => setYearOfBirth(e.target.value)} placeholder="e.g. 1990" />

                  <label className="input-label">Phone (optional)</label>
                  <input className="input" value={phone} onChange={e => setPhone(e.target.value)} />

                  <label className="input-label">Password</label>
                  <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} />

                  <label className="input-label">Confirm password</label>
                  <input className="input" type="password" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} />

                  {error && <div className="error">{error}</div>}

                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button type="button" className="btn ghost" onClick={() => setMode('login')}>Back to login</button>
                    <button type="button" className="btn" onClick={handleRegister}>Create account</button>
                  </div>

                  <div style={{ marginTop: 12, fontSize: 12 }}>
                    Password is optional for this prototype. Public identity uses your username; hosts can see your preferred name when you apply. Your email is private and only used for verification and account recovery.
                  </div>

                  <div style={{ marginTop: 10, fontSize: 12 }}>
                    <a href="#" className="privacy-link">Privacy policy</a>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

