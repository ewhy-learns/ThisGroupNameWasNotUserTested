import React from 'react'
import { EventLocationCoords } from './AuthService'
import { XIcon } from './Icons'

export type MapSearchFilters = {
  keyword?: string
  locationName?: string
  centerCoords?: EventLocationCoords
  radiusKm?: number
  timeAfter?: string
  timeBefore?: string
  dateAfter?: string
  dateBefore?: string
  maxCost?: number
  minHostRating?: number
}

type Props = {
  open: boolean
  filters: MapSearchFilters
  onApply: (filters: MapSearchFilters) => void
  onClose: () => void
}

function getDefaultFilters(): MapSearchFilters {
  return {
    keyword: '',
    locationName: '',
    centerCoords: undefined,
    radiusKm: 25,
    timeAfter: '',
    timeBefore: '',
    dateAfter: new Date().toISOString().slice(0, 10),
    dateBefore: '',
    maxCost: undefined,
    minHostRating: undefined,
  }
}

export default function MapSearchFiltersModal({ open, filters, onApply, onClose }: Props) {
  const [draft, setDraft] = React.useState<MapSearchFilters>(getDefaultFilters())
  const [locationQuery, setLocationQuery] = React.useState('')
  const [locationResults, setLocationResults] = React.useState<any[]>([])
  const [searchingLocation, setSearchingLocation] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    const next = { ...getDefaultFilters(), ...filters }
    setDraft(next)
    setLocationQuery(next.locationName || '')
    setLocationResults([])
  }, [open, filters])

  React.useEffect(() => {
    if (!open) return
    const query = locationQuery.trim()
    if (query.length < 3) {
      setLocationResults([])
      return
    }
    const timer = window.setTimeout(async () => {
      setSearchingLocation(true)
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=6&q=${encodeURIComponent(query)}`
        const res = await fetch(url, { headers: { Accept: 'application/json' } })
        const data = await res.json()
        setLocationResults(Array.isArray(data) ? data : [])
      } catch {
        setLocationResults([])
      } finally {
        setSearchingLocation(false)
      }
    }, 300)
    return () => window.clearTimeout(timer)
  }, [locationQuery, open])


  if (!open) return null

  const applyFilters = () => {
    onApply({
      ...draft,
      keyword: draft.keyword?.trim() || undefined,
      locationName: draft.locationName?.trim() || undefined,
      radiusKm: draft.radiusKm && draft.radiusKm > 0 ? draft.radiusKm : undefined,
      maxCost: draft.maxCost !== undefined && !Number.isNaN(draft.maxCost) ? draft.maxCost : undefined,
      minHostRating: draft.minHostRating !== undefined && !Number.isNaN(draft.minHostRating) ? draft.minHostRating : undefined,
      timeAfter: draft.timeAfter || undefined,
      timeBefore: draft.timeBefore || undefined,
      dateAfter: draft.dateAfter || undefined,
      dateBefore: draft.dateBefore || undefined,
    })
    onClose()
  }

  const resetFilters = () => {
    const defaults = getDefaultFilters()
    setDraft(defaults)
    setLocationQuery(defaults.locationName || '')
    setLocationResults([])
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>Search upcoming sessions</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close"><XIcon size={16} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 13, color: '#6b7280' }}>Upcoming sessions only.</div>

          <div>
            <label className="input-label">Keyword</label>
            <input className="input" value={draft.keyword || ''} onChange={e => setDraft(current => ({ ...current, keyword: e.target.value }))} placeholder="Search activity, vibes, description" />
          </div>

          <div>
            <label className="input-label">Location</label>
            <input className="input" value={locationQuery} onChange={e => {
              const value = e.target.value
              setLocationQuery(value)
              setDraft(current => ({ ...current, locationName: value, centerCoords: undefined }))
            }} placeholder="Search suburb, campus or address" />
            {(searchingLocation || locationResults.length > 0) && (
              <div style={{ background: 'white', borderRadius: 12, marginTop: 8, boxShadow: '0 6px 18px rgba(2,6,23,0.12)', maxHeight: 220, overflow: 'auto', border: '1px solid rgba(15,23,32,0.06)' }}>
                {searchingLocation && <div style={{ padding: 10, color: '#6b7280' }}>Searching…</div>}
                {locationResults.map(result => (
                  <button
                    key={result.place_id}
                    type="button"
                    onClick={() => {
                      const nextName = result.display_name || locationQuery
                      setLocationQuery(nextName)
                      setLocationResults([])
                      setDraft(current => ({
                        ...current,
                        locationName: nextName,
                        centerCoords: {
                          lat: Number(result.lat),
                          lon: Number(result.lon),
                        },
                      }))
                    }}
                    style={{ width: '100%', textAlign: 'left', border: 0, background: 'transparent', padding: 10, cursor: 'pointer' }}
                  >
                    {result.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label className="input-label">Distance (km)</label>
              <input className="input" type="number" min={1} step={1} value={draft.radiusKm ?? ''} onChange={e => setDraft(current => ({ ...current, radiusKm: e.target.value ? Number(e.target.value) : undefined }))} placeholder="Any radius" />
            </div>
            <div>
              <label className="input-label">Max cost</label>
              <input className="input" type="number" min={0} step={1} value={draft.maxCost ?? ''} onChange={e => setDraft(current => ({ ...current, maxCost: e.target.value ? Number(e.target.value) : undefined }))} placeholder="Any cost" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label className="input-label">Time after</label>
              <input className="input" type="time" value={draft.timeAfter || ''} onChange={e => setDraft(current => ({ ...current, timeAfter: e.target.value }))} />
            </div>
            <div>
              <label className="input-label">Time before</label>
              <input className="input" type="time" value={draft.timeBefore || ''} onChange={e => setDraft(current => ({ ...current, timeBefore: e.target.value }))} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label className="input-label">Date after</label>
              <input className="input" type="date" value={draft.dateAfter || ''} onChange={e => setDraft(current => ({ ...current, dateAfter: e.target.value }))} />
            </div>
            <div>
              <label className="input-label">Date before</label>
              <input className="input" type="date" value={draft.dateBefore || ''} onChange={e => setDraft(current => ({ ...current, dateBefore: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="input-label">Minimum host rating</label>
            <input className="input" type="number" min={0} max={5} step={0.5} value={draft.minHostRating ?? ''} onChange={e => setDraft(current => ({ ...current, minHostRating: e.target.value ? Number(e.target.value) : undefined }))} placeholder="Any rating" />
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button type="button" className="btn ghost" onClick={resetFilters}>Reset</button>
            <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
            <button type="button" className="btn" onClick={applyFilters}>Apply filters</button>
          </div>
        </div>
      </div>
    </div>
  )
}

