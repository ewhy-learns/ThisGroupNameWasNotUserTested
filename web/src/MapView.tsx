import React, { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { getProfile, getLoggedInUser, getPublicIdentityLabel } from './AuthService'
// Leaflet CSS is required for markers, popups and controls to render correctly
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
// ...existing code...

// Ensure default marker icons work with Vite bundling
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

// Explicit default marker icon to ensure markers render correctly even when
// bundlers/CSS cause the automatic default to be missing. Use the same images
// provided by the leaflet package but create an explicit L.Icon instance and
// pass it to markers below.
const explicitDefaultIcon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
})

type Props = {
  zoom?: number
}

export default function MapView({ zoom = 13 }: Props) {
  const mapEl = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const userMarkerRef = useRef<L.CircleMarker | null>(null)
  const userPulseRef = useRef<L.CircleMarker | null>(null)
  const searchMarkerRef = useRef<L.Marker | null>(null)
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

    // Load any events from localStorage and add markers if they include locationCoords
    // Start with a plain layerGroup; if the markercluster plugin is available we'll switch to it.
    let clusterGroup: any = L.layerGroup()
    // prefer map.addLayer for compatibility
    try { map.addLayer(clusterGroup) } catch (e) { try { clusterGroup.addTo && clusterGroup.addTo(map) } catch (e2) {} }

    // Keep a plain LayerGroup for markers (no clustering) — simpler and more robust for the prototype.
    // If you later want clustering, re-enable the markercluster plugin and adapt this logic.

    const createPopupHtml = (e: any) => {
      const title = e.title || e.activity || 'Event'
      const loc = e.location || ''
      const dt = (e.date ? `${e.date}` : '') + (e.startTime ? ` ${e.startTime}` : '')
      // Prefer explicit organiser display name from the profile. Do NOT publicize email/phone on the event popup.
      let host = ''
      let rating = ''
      if (e.host && typeof e.host === 'string') {
        try {
          const prof = getProfile(e.host)
          if (prof) host = getPublicIdentityLabel(e.host, prof)
          if (prof && typeof (prof as any).rating === 'number') rating = ` (${(prof as any).rating}★)`
        } catch (err) { /* ignore */ }
      }
      // If profile lookup failed, fall back to any organiserName stored on the event
      if (!host && e.organiserName) host = e.organiserName
      // If still missing and host doesn't look like an email, use it as a fallback plain string
      const fallbackHost = (!host && e.host && typeof e.host === 'string' && !e.host.includes('@')) ? e.host : ''
      const parts = []
      parts.push(`<div class="map-popup-card" style="padding:4px;min-width:180px">`)
      parts.push(`<div style="font-weight:700;font-size:15px;margin-bottom:6px">${escapeHtml(title)}</div>`)
      if (dt) parts.push(`<div style="font-size:12px;color:#6b7280;margin-bottom:4px">${escapeHtml(dt)}</div>`)
      const hostToShow = host || fallbackHost
      if (hostToShow) parts.push(`<div style="margin-top:8px;font-size:13px">Host: <strong>${escapeHtml(hostToShow)}${escapeHtml(rating)}</strong></div>`)
      parts.push(`<div style="margin-top:12px;display:flex;justify-content:flex-end"><button data-event-id=\"${escapeHtml(e.id)}\" class=\"btn map-join-link\">View / Join</button></div>`)
      parts.push(`</div>`)
      return parts.join('\n')
    }

    function escapeHtml(s: any) {
      if (s === undefined || s === null) return ''
      return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
    }

    const markers: L.Marker[] = []
    const loadEventMarkers = () => {
      // clear previous markers
      try { clusterGroup.clearLayers() } catch (e) { /* ignore */ }
      try {
        const raw = localStorage.getItem('demo1_events_v1')
        if (!raw) return
        const evts = JSON.parse(raw)
        if (!Array.isArray(evts)) return
        for (const e of evts) {
          const lc = e.locationCoords
          if (lc && typeof lc.lat === 'number' && typeof lc.lon === 'number') {
            try {
              // Some bundlers / CSS issues can leave the default marker icon invisible.
              // If the default icon URL is not available, fall back to a visible circle marker.
              const defaultIconUrl = (L.Icon.Default.prototype as any).options && (L.Icon.Default.prototype as any).options.iconUrl
              let m: L.Layer
              if (!defaultIconUrl) {
                m = L.circleMarker([lc.lat, lc.lon], { radius: 6, color: '#0B61FF', fillColor: '#0B61FF', fillOpacity: 0.9 })
                // circleMarker doesn't have bindPopup typed the same, but it does support it at runtime
                ;(m as any).bindPopup && (m as any).bindPopup(createPopupHtml(e))
                if ((clusterGroup as any).addLayer) { (clusterGroup as any).addLayer(m as any) } else { (m as any).addTo(map) }
                ;(m as any).__demoEventId = e.id
                markers.push(m as any)
                } else {
                 // create marker using the explicit icon so it is visible
                 const marker = L.marker([lc.lat, lc.lon], { icon: explicitDefaultIcon })
                const popup = createPopupHtml(e)
                marker.bindPopup(popup)
                if ((clusterGroup as any).addLayer) { (clusterGroup as any).addLayer(marker) } else { marker.addTo(map) }
                ;(marker as any).__demoEventId = e.id
                markers.push(marker)
              }
            } catch (err) {
              // ignore marker creation errors
            }
          }
        }
      } catch (err) {
        console.warn('[MapView] failed to load mock event markers', err)
      }
    }

    // initial load
    loadEventMarkers()

    // react to other tabs updating events in localStorage
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === 'demo1_events_v1') {
        loadEventMarkers()
      }
    }
    window.addEventListener('storage', onStorage)
    // react to same-window publishes when events are saved via the prototype API
    const onEventsUpdated = (evt: any) => {
      // reload markers first
      loadEventMarkers()
      try {
        const item = evt && evt.detail
        if (item && item.locationCoords && typeof item.locationCoords.lat === 'number' && typeof item.locationCoords.lon === 'number') {
          const lat = item.locationCoords.lat
          const lon = item.locationCoords.lon
          const map = mapRef.current
          // Only focus the map and open the popup automatically when the
          // logged-in user is the host/creator of the event. Other users
          // should not have the map jump to pins created by others.
          try {
            const current = getLoggedInUser()
            if (map && item.host && current && String(item.host) === String(current)) {
              try { map.flyTo([lat, lon], 15, { animate: true }) } catch { try { map.setView([lat, lon], 15) } catch {} }
              // try open popup for the created event if marker added
              const found = markers.find((m: any) => m && m.__demoEventId === item.id)
              if (found && (found as any).openPopup) (found as any).openPopup()
            }
          } catch (e) {
            // ignore focus errors
          }
        }
      } catch (e) {
        // ignore focus errors
      }
    }
    window.addEventListener('demo1_events_updated', onEventsUpdated as EventListener)
    // delegate clicks from popup "View / Join" links to open the session view dialog
    const onDocClick = (ev: MouseEvent) => {
      try {
        const target = ev.target as HTMLElement | null
        if (!target) return
        const anchor = target.closest && (target.closest('.map-join-link') as HTMLElement | null)
        if (!anchor) return
        ev.preventDefault()
        const id = anchor.getAttribute('data-event-id')
        if (!id) return
        try {
          const ce = new CustomEvent('demo1_open_event', { detail: { id } })
          window.dispatchEvent(ce)
        } catch (e) { /* ignore */ }
      } catch (e) { /* ignore */ }
    }
    document.addEventListener('click', onDocClick)

    // cleanup any outstanding search timer will be handled in the final cleanup below

    // Simplified geolocation: single fetch on page load, and recenter on demand.
    const locateOnce = (options?: PositionOptions) => {
      setStatus('Locating...')
      if (!('geolocation' in navigator)) {
        console.warn('Geolocation API not available in this browser')
        setStatus('Geolocation not available — defaulting to UNE')
        // center on UNE when geolocation is unavailable; do NOT create a marker
        try {
          const m = mapRef.current
          if (m) m.setView(UNE_COORD, 12)
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
              const m = mapRef.current
              if (m) m.flyTo([lat, lon], 14, { animate: true })
            } catch (e) {
              console.warn('[MapView] flyTo failed', e)
              const m2 = mapRef.current
              if (m2) try { m2.setView([lat, lon], 14) } catch (e2) {}
            }

            setTimeout(() => { const m3 = mapRef.current; if (m3) m3.invalidateSize() }, 300)

            // Show a small solid blue dot plus a subtle pulsing halo
            if (userMarkerRef.current) {
              try { userMarkerRef.current.setLatLng([lat, lon]) } catch (e) { /* ignore */ }
            } else {
              const m4 = mapRef.current
              if (m4) userMarkerRef.current = L.circleMarker([lat, lon], { radius: 4, color: '#0B61FF', fillColor: '#0B61FF', fillOpacity: 1, weight: 0, className: 'user-dot' }).addTo(m4)
            }
            if (userPulseRef.current) {
              try { userPulseRef.current.setLatLng([lat, lon]) } catch (e) { /* ignore */ }
            } else {
              const m5 = mapRef.current
              if (m5) userPulseRef.current = L.circleMarker([lat, lon], { radius: 14, color: '#0B61FF', fillColor: '#0B61FF', fillOpacity: 0.12, weight: 0, className: 'user-dot-pulse' }).addTo(m5)
            }
          },
          (err) => {
            console.warn('[MapView] Geolocation error', err)
            setStatus('Location unavailable — defaulting to UNE')
            // center on UNE as fallback; do NOT create a marker
            try {
              const m6 = mapRef.current
              if (m6) m6.setView(UNE_COORD, 12)
            } catch (e) {
              console.warn('[MapView] setting default UNE failed', e)
            }
          },
          options || { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
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
      try { if (searchTimeout.current) window.clearTimeout(searchTimeout.current) } catch (e) {}
       try { window.removeEventListener('storage', onStorage) } catch (e) {}
       try { window.removeEventListener('demo1_events_updated', onEventsUpdated) } catch (e) {}
       try { clusterGroup.clearLayers && clusterGroup.clearLayers() } catch (e) {}
       try { for (const m of markers) m.remove() } catch (e) {}
      if (userMarkerRef.current) {
        userMarkerRef.current.remove()
        userMarkerRef.current = null
      }
      if (userPulseRef.current) {
        userPulseRef.current.remove()
        userPulseRef.current = null
      }
      if (searchMarkerRef.current) {
        searchMarkerRef.current.remove()
        searchMarkerRef.current = null
      }
      try { document.removeEventListener('click', onDocClick) } catch (e) {}
      try { map.remove() } catch (e) {}
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
      // ensure the search marker also uses the explicit icon
      searchMarkerRef.current = L.marker([lat, lon], { icon: explicitDefaultIcon }).addTo(map).bindPopup(r.display_name).openPopup()
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

          // Update/create the small dot and pulsing halo for recenter
          if (userMarkerRef.current) {
            userMarkerRef.current.setLatLng([lat, lon])
          } else {
            userMarkerRef.current = L.circleMarker([lat, lon], { radius: 4, color: '#0B61FF', fillColor: '#0B61FF', fillOpacity: 1, weight: 0, className: 'user-dot' }).addTo(map)
          }
          if (userPulseRef.current) {
            userPulseRef.current.setLatLng([lat, lon])
          } else {
            userPulseRef.current = L.circleMarker([lat, lon], { radius: 14, color: '#0B61FF', fillColor: '#0B61FF', fillOpacity: 0.12, weight: 0, className: 'user-dot-pulse' }).addTo(map)
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
      <div className="map-search" style={{ position: 'absolute', top: 10, right: 10, zIndex: 900, width: '320px', maxWidth: 'calc(100% - 24px)' }}>
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

      {/* Recenter floating button inside map area */}
      <button
        aria-label="Recenter map"
        title="Recenter map"
        className="recenter-btn"
        onClick={recenter}
        type="button"
      >
        {/* simple crosshair SVG */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <circle cx="12" cy="12" r="7" stroke="#0B61FF" strokeWidth="1.6" />
          <path d="M12 3v3" stroke="#0B61FF" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M12 21v-3" stroke="#0B61FF" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M3 12h3" stroke="#0B61FF" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M21 12h-3" stroke="#0B61FF" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}

