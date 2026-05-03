import React from 'react'
import { getAppSettings, saveAppSettings, ThemeColorScheme } from './AuthService'
import { XIcon } from './Icons'

const COLOR_SCHEME_OPTIONS: Array<{ value: ThemeColorScheme; label: string; description: string }> = [
  { value: 'orange-blue', label: 'Orange-blue', description: 'Warm orange with vivid blue accents.' },
  { value: 'green-gold', label: 'Green-gold', description: 'Leafy greens with warm gold highlights.' },
  { value: 'light-blue-darkblue', label: 'Light blue-dark blue', description: 'Soft sky blues with deeper navy contrast.' },
  { value: 'greyscale', label: 'Greyscale', description: 'A neutral monochrome interface.' },
]

type Props = {
  open: boolean
  onClose: () => void
  userId: string
}

export default function AppSettingsModal({ open, onClose, userId }: Props) {
  const [colorScheme, setColorScheme] = React.useState<ThemeColorScheme>('orange-blue')

  React.useEffect(() => {
    if (!open || !userId) return
    const settings = getAppSettings(userId)
    setColorScheme(settings?.colorScheme || 'orange-blue')
  }, [open, userId])

  if (!open) return null

  const handleSave = () => {
    saveAppSettings(userId, { userId, colorScheme })
    onClose()
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header">
          <h3>App settings</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close"><XIcon size={16} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Colour scheme</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>App-wide display settings live here now, separate from your profile data.</div>
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            {COLOR_SCHEME_OPTIONS.map(option => {
              const selected = colorScheme === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setColorScheme(option.value)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    borderRadius: 16,
                    border: selected ? '2px solid var(--secondary)' : '1px solid rgba(15,23,32,0.08)',
                    background: selected ? 'rgba(var(--secondary-rgb),0.06)' : 'white',
                    padding: 14,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    cursor: 'pointer',
                    boxShadow: selected ? '0 8px 18px rgba(var(--secondary-rgb),0.08)' : 'none',
                  }}
                >
                  <span style={{ fontWeight: 700, color: '#111827' }}>{option.label}</span>
                  <span style={{ fontSize: 13, color: '#6b7280' }}>{option.description}</span>
                </button>
              )
            })}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
            <button type="button" className="btn" onClick={handleSave}>Save</button>
          </div>
        </div>
      </div>
    </div>
  )
}

