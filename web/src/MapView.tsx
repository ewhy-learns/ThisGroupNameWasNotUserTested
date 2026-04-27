import React, { useEffect, useRef, useState } from 'react'
import L from 'leaflet'

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

// Ensure default marker icons work with Vite bundling
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

type Props = {
  zoom?: number
}

export default function MapView({ zoom = 13 }: Props) {
  const mapEl = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const userMarkerRef = useRef<L.Marker | null>(null)
  const searchMarkerRef = useRef<L.Marker | null>(null)
  const accuracyRef = useRef<L.Circle | null>(null)
  const [status, setStatus] = useState<string>('Locating...')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchTimeout = useRef<number | null>(null)

  useEffect(() => {
    console.debug('[MapView] useEffect init')
    if (!mapEl.current) {
      console.debug('[MapView] mapEl not ready')
      return
    }
    if (mapRef.current) {
      console.debug('[MapView] map already initialized')
      return
    }

    const map = L.map(mapEl.current, { center: [0, 0], zoom, zoomControl: true })
    mapRef.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map)

    // sensible default while we locate -> University of New England (UNE)
    const UNE_COORD: [number, number] = [-30.5016, 151.6562]
    map.setView(UNE_COORD, 12)

    // sometimes the container size needs to be invalidated after visible
    setTimeout(() => {
      try {
        map.invalidateSize()
        console.debug('[MapView] invalidated map size after init')
      } catch (e) {
        console.warn('[MapView] invalidateSize failed', e)
      }
    }, 200)

    // cleanup any outstanding search timer on mount/unmount
    return () => {
      if (searchTimeout.current) window.clearTimeout(searchTimeout.current)
    }

    // Simplified geolocation: single fetch on page load, and recenter on demand.
    const locateOnce = (options?: PositionOptions) => {
      setStatus('Locating...')
      if (!('geolocation' in navigator)) {
        console.warn('Geolocation API not available in this browser')
        setStatus('Geolocation not available — defaulting to UNE')
        // center on UNE when geolocation is unavailable; do NOT create a marker
        try {
          map.setView(UNE_COORD, 12)
        } catch (e) {
          console.warn('[MapView] setting default UNE failed', e)
        }
        return
      }

      try {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            console.debug('[MapView] got position', pos.coords)
            setStatus('Located')
            const lat = pos.coords.latitude
            const lon = pos.coords.longitude

            try {
              map.flyTo([lat, lon], 14, { animate: true })
            } catch (e) {
              console.warn('[MapView] flyTo failed', e)
              map.setView([lat, lon], 14)
            }

            setTimeout(() => map.invalidateSize(), 300)

            if (userMarkerRef.current) {
              userMarkerRef.current.setLatLng([lat, lon])
            } else {
              userMarkerRef.current = L.marker([lat, lon]).addTo(map).bindPopup('You are here')
              userMarkerRef.current.openPopup()
            }

            const accuracy = pos.coords.accuracy ?? 0
            if (accuracyRef.current) {
              accuracyRef.current.setLatLng([lat, lon])
              accuracyRef.current.setRadius(accuracy)
            } else {
              accuracyRef.current = L.circle([lat, lon], { radius: accuracy, color: '#0366d6', opacity: 0.15 }).addTo(map)
            }
          },
          (err) => {
            console.warn('[MapView] Geolocation error', err)
            setStatus('Location unavailable — defaulting to UNE')
            // center on UNE as fallback; do NOT create a marker
            try {
              map.setView(UNE_COORD, 12)
            } catch (e) {
              console.warn('[MapView] setting default UNE failed', e)
            }
          },
          options || { enableHighAccuracy: false, maximumAge: 300000, timeout: 10000 }
        )
      } catch (e) {
        console.warn('[MapView] geolocation request failed', e)
        setStatus('Location error')
      }
    }

    // On mount, locate once
    locateOnce()

    // If developer wants to run a quick test, they can set window.__MAPVIEW_TEST__ = true
    if ((window as any).__MAPVIEW_TEST__ === true) {
      console.debug('[MapView] running test harness')
      const original = navigator.geolocation.getCurrentPosition
      try {
        (navigator as any).geolocation.getCurrentPosition = (success: PositionCallback) => {
          const fakePos = { coords: { latitude: 51.5074, longitude: -0.1278, accuracy: 30 } } as GeolocationPosition
          setTimeout(() => success(fakePos), 100)
        }
        // run locateOnce to use fake
        locateOnce()
        // simple pass check: after a short delay ensure marker exists
        setTimeout(() => {
          if (userMarkerRef.current) console.info('[MapView Test] PASS: marker present')
          else console.warn('[MapView Test] FAIL: marker missing')
          ;(navigator as any).geolocation.getCurrentPosition = original
        }, 500)
      } catch (e) {
        console.warn('[MapView Test] failed', e)
      }
    }

    // cleanup on unmount
    return () => {
      // clean up markers and circle
      if (userMarkerRef.current) {
        userMarkerRef.current.remove()
        userMarkerRef.current = null
      }
      if (accuracyRef.current) {
        accuracyRef.current.remove()
        accuracyRef.current = null
      }
      if (searchMarkerRef.current) {
        searchMarkerRef.current.remove()
        searchMarkerRef.current = null
      }
      map.remove()
      mapRef.current = null
    }
  }, [zoom])

  // Debounced search against Nominatim (OpenStreetMap)
  const runSearch = (q: string) => {
    if (!q) {
      setSearchResults([])
      setSearchLoading(false)
      return
    }
    setSearchLoading(true)
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=6`)
      .then(res => res.json())
      .then((data) => {
        setSearchResults(Array.isArray(data) ? data : [])
      })
      .catch((e) => {
        console.warn('[MapView] search failed', e)
        setSearchResults([])
      })
      .finally(() => setSearchLoading(false))
  }

  const onSearchChange = (v: string) => {
    setSearchQuery(v)
    setShowResults(true)
    if (searchTimeout.current) window.clearTimeout(searchTimeout.current)
    // debounce
    searchTimeout.current = window.setTimeout(() => runSearch(v.trim()), 350)
  }

  const selectSearchResult = (r: any) => {
    const map = mapRef.current
    if (!map) return
    const lat = parseFloat(r.lat)
    const lon = parseFloat(r.lon)
    try { map.flyTo([lat, lon], 15, { animate: true }) } catch { map.setView([lat, lon], 15) }
    // add or move search marker
    if (searchMarkerRef.current) {
      searchMarkerRef.current.setLatLng([lat, lon]).bindPopup(r.display_name).openPopup()
    } else {
      searchMarkerRef.current = L.marker([lat, lon]).addTo(map).bindPopup(r.display_name).openPopup()
    }
    setShowResults(false)
    setSearchResults([])
    setSearchQuery(r.display_name || '')
    setTimeout(() => map.invalidateSize(), 300)
  }

  const recenter = () => {
    const map = mapRef.current
    if (!map) return
    if ('geolocation' in navigator) {
      console.debug('[MapView] recenter requested')
      setStatus('Recentering...')
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          console.debug('[MapView] recenter got position', pos.coords)
          setStatus('Located')
          const lat = pos.coords.latitude
          const lon = pos.coords.longitude

          try {
            map.flyTo([lat, lon], 15, { animate: true })
          } catch (e) {
            map.setView([lat, lon], 15)
          }

          if (userMarkerRef.current) {
            userMarkerRef.current.setLatLng([lat, lon])
            userMarkerRef.current.openPopup()
          } else {
            userMarkerRef.current = L.marker([lat, lon]).addTo(map).bindPopup('You are here')
            userMarkerRef.current.openPopup()
          }

          const accuracy = pos.coords.accuracy ?? 0
          if (accuracyRef.current) {
            accuracyRef.current.setLatLng([lat, lon])
            accuracyRef.current.setRadius(accuracy)
          } else {
            accuracyRef.current = L.circle([lat, lon], { radius: accuracy, color: '#0366d6', opacity: 0.15 }).addTo(map)
          }
        },
          (err) => {
          console.warn('[MapView] recenter geolocation error', err)
          setStatus('Recenter error — defaulting to UNE')
          // default to UNE on recenter errors; do NOT create a marker
          try {
            map.setView(UNE_COORD, 12)
          } catch (e) {
            console.warn('[MapView] defaulting to UNE failed', e)
            setStatus('Location unavailable')
          }
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
      )
    }
  }

  return (
    <div className="map-root" style={{ display: 'flex', flex: 1, flexDirection: 'column', position: 'relative' }}>
      {/* search overlay */}
      <div className="map-search" style={{ position: 'absolute', top: 10, right: 10, zIndex: 1100, width: '320px', maxWidth: 'calc(100% - 24px)' }}>
        <input
          className="input"
          placeholder="Search places"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          onFocus={() => setShowResults(true)}
        />
        {showResults && (searchResults.length > 0 || searchLoading) && (
          <div className="search-results" style={{ background: 'white', borderRadius: 8, marginTop: 6, boxShadow: '0 6px 18px rgba(2,6,23,0.12)', maxHeight: 240, overflow: 'auto' }}>
            {searchLoading && <div style={{ padding: 8 }}>Searching…</div>}
            {searchResults.map(r => (
              <div key={`${r.place_id}`} className="search-result" style={{ padding: 8, borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }} onClick={() => selectSearchResult(r)}>
                <div style={{ fontSize: 13 }}>{r.display_name}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div ref={mapEl} className="map-container" style={{ flex: 1, minHeight: 300 }} />
      <div style={{ padding: '0.5rem' }}>
        <div style={{ marginBottom: 8, color: '#374151', fontSize: 14 }}>{status}</div>
        <button className="btn" onClick={recenter} type="button">
          Recenter
        </button>
      </div>
    </div>
  )
}

