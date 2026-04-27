import React, { useState, useRef, useEffect } from 'react'
import { accountExists, registerAccount, setLoggedInUser } from './AuthService'

type Props = {
  open: boolean
  onClose: () => void
  onLoginSuccess: (id: string) => void
}

export default function AuthModal({ open, onClose, onLoginSuccess }: Props) {
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
    if (accountExists(normalized)) {
      // prototype: password is not checked
      setLoggedInUser(normalized)
      onLoginSuccess(normalized)
      clear()
      onClose()
    } else {
      setError('Account not found. Please register.')
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
    if (!passwordMeetsRequirements(pw)) {
      setError('Password does not meet complexity requirements')
      return
    }
    if (pw !== pwc) {
      setError('Passwords do not match')
      return
    }

    // choose identifier: email if provided, otherwise phone
    const identifier = e || ph
    registerAccount(identifier)

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
                    Password must be at least 10 characters and include upper and lower case letters, numbers and symbols.
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

