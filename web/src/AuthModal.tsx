import React, { useState, useRef, useEffect } from 'react'
import { accountExists, registerAccount, setLoggedInUser, readRegistrationDraft, writeRegistrationDraft, clearRegistrationDraft } from './AuthService'

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
  const [displayName, setDisplayName] = useState('')
  const [yearOfBirth, setYearOfBirth] = useState('')
  const [email, setEmail] = useState('')
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
    const normalized = id.trim()
    if (!normalized) {
      setError('Enter email or phone')
      return
    }
    // Prototype: allow very loose auth. If account exists, log in regardless of password.
    if (accountExists(normalized)) {
      setLoggedInUser(normalized)
      onLoginSuccess(normalized)
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

    const name = displayName.trim()
    const yob = yearOfBirth.trim()
    const e = email.trim()
    const ph = phone.trim()
    const pw = password
    const pwc = passwordConfirm

    if (!name) {
      setError('Enter display name')
      return
    }
    const yearNum = yob ? parseInt(yob, 10) : NaN
    const currentYear = new Date().getFullYear()
    if (isNaN(yearNum) || yearNum < 1900 || yearNum > currentYear - 10) {
      setError('Enter a valid year of birth')
      return
    }
    if (!e && !ph) {
      setError('Enter email or phone')
      return
    }
    if (e && !isValidEmail(e)) {
      setError('Enter a valid email address')
      return
    }
    if (ph && !isValidPhone(ph)) {
      setError('Enter a valid phone number')
      return
    }
    // Prototype: do not enforce password complexity. Passwords are optional/loose.

    // choose identifier: email if provided, otherwise phone
    const identifier = e || ph
    registerAccount(identifier)

    // Prototype: local registration only (no backend).

    // show thank you message and return to login screen (do not auto-login in prototype)
    setRegistered(true)
    setRegisteredName(name)
    setRegisteredIdentifier(identifier)
    // clear registration fields
    setDisplayName('')
    setYearOfBirth('')
    setEmail('')
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

  // seed email when entering registration mode if no email present
  useEffect(() => {
    if (mode === 'register') {
      if (!email || email.trim() === '') {
        setEmail('username@une.edu.au')
      }
    }
  }, [mode])

  // allow parent to open modal in a specific mode
  useEffect(() => {
    if (!open) return
    if (initialMode === 'register') setMode('register')
    else if (initialMode === 'login') setMode('login')
  }, [open, initialMode])

  const handleForgot = () => {
    // Prototype: no mail sent, just show a message
    if (!id.trim()) {
      setError('Enter your email/phone to reset')
      return
    }
    setError('Password reset link (prototype) sent to ' + id.trim())
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
        if (draft.displayName) setDisplayName(draft.displayName)
        if (draft.yearOfBirth) setYearOfBirth(draft.yearOfBirth)
        if (draft.email) setEmail(draft.email)
        if (draft.phone) setPhone(draft.phone)
      }
    } catch (e) {
      // ignore
    }
  }, [open])

  // persist registration draft whenever registration fields change
  useEffect(() => {
    try {
      writeRegistrationDraft({ displayName, yearOfBirth, email, phone })
    } catch (e) {
      // ignore
    }
  }, [displayName, yearOfBirth, email, phone])

  if (!open) return null

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header">
          <h3>{mode === 'login' ? 'Login' : 'Register'}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="modal-body">
          {mode === 'login' ? (
            <>
              <label className="input-label">Email or Phone</label>
              <input className="input" value={id} onChange={e => setId(e.target.value)} />

              <label className="input-label">Password</label>
              <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} />

              {error && <div className="error">{error}</div>}

              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button type="button" className="btn" onClick={handleLogin}>Login</button>
                <button type="button" className="btn ghost" onClick={handleForgot}>Forgot password</button>
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
                  <label className="input-label">Display name</label>
                  <input className="input" value={displayName} onChange={e => setDisplayName(e.target.value)} />

                  <label className="input-label">Year of birth</label>
                  <input className="input" value={yearOfBirth} onChange={e => setYearOfBirth(e.target.value)} placeholder="e.g. 1990" />

                  <label className="input-label">Email</label>
                  <input className="input" value={email} onChange={e => setEmail(e.target.value)} />

                  <label className="input-label">Phone</label>
                  <input className="input" value={phone} onChange={e => setPhone(e.target.value)} />

                  <label className="input-label">Password</label>
                  <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} />

                  <label className="input-label">Confirm password</label>
                  <input className="input" type="password" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} />

                  {error && <div className="error">{error}</div>}

                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button type="button" className="btn" onClick={handleRegister}>Create account</button>
                    <button type="button" className="btn ghost" onClick={() => setMode('login')}>Back to login</button>
                  </div>

                  <div style={{ marginTop: 12, fontSize: 12 }}>
                    Password is optional for this prototype. Any value will be accepted.
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

