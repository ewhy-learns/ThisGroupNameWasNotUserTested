import React, { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { getEventEndTimestamp, getProfile, getLoggedInUser, getPublicIdentityLabel, getSessionRecommendation, listEvents, parseEventCostValue } from './AuthService'
import MapSearchFiltersModal, { MapSearchFilters } from './MapSearchFiltersModal'
import { EventAvatar } from './AvatarUtils'
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
  const searchTimeout = useRef<number | null>(null)
  const mapInvalidateTimeout = useRef<number | null>(null)
  const locateInvalidateTimeout = useRef<number | null>(null)
  const refreshMarkersRef = useRef<(() => void) | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState(0)
  const [filteredEvents, setFilteredEvents] = useState<any[]>([])
  const [resultsMode, setResultsMode] = useState<'map' | 'list'>('map')
  const [appliedFilters, setAppliedFilters] = useState<MapSearchFilters>({ dateAfter: new Date().toISOString().slice(0, 10) })
  const filtersRef = useRef<MapSearchFilters>(appliedFilters)

  const activeFilterCount = React.useMemo(() => {
    let count = 0
    if (appliedFilters.keyword) count++
    if (appliedFilters.centerCoords) count++
    if (appliedFilters.radiusKm) count++
    if (appliedFilters.timeAfter || appliedFilters.timeBefore) count++
    if (appliedFilters.dateBefore) count++
    if (appliedFilters.maxCost !== undefined) count++
    if (appliedFilters.minHostRating !== undefined) count++
    return count
  }, [appliedFilters])

  const filterSummary = React.useMemo(() => {
    const parts: string[] = []
    if (appliedFilters.keyword) parts.push(`keyword: ${appliedFilters.keyword}`)
    if (appliedFilters.radiusKm) parts.push(`${appliedFilters.radiusKm} km radius`)
    if (appliedFilters.maxCost !== undefined) parts.push(`max $${appliedFilters.maxCost}`)
    if (appliedFilters.minHostRating !== undefined) parts.push(`${appliedFilters.minHostRating}+★ host`)
    return parts.join(' · ')
  }, [appliedFilters])

  function parseTimeToMinutes(value?: string) {
    if (!value || !/^\d{2}:\d{2}$/.test(value)) return null
    const [hh, mm] = value.split(':').map(Number)
    if (Number.isNaN(hh) || Number.isNaN(mm)) return null
    return hh * 60 + mm
  }

  function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number) {
    const toRad = (deg: number) => deg * (Math.PI / 180)
    const earthRadiusKm = 6371
    const dLat = toRad(bLat - aLat)
    const dLon = toRad(bLon - aLon)
    const lat1 = toRad(aLat)
    const lat2 = toRad(bLat)
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
    return 2 * earthRadiusKm * Math.asin(Math.sqrt(h))
  }

  function isUpcomingEvent(event: any) {
    const end = getEventEndTimestamp(event)
    return !!end && end >= Date.now()
  }

  function getEventSortTime(event: any) {
    try {
      const timestamp = new Date(`${event?.date || ''}T${event?.startTime || '00:00'}`).getTime()
      return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp
    } catch {
      return Number.MAX_SAFE_INTEGER
    }
  }

  function getKeywordScore(event: any, keyword?: string) {
    const query = String(keyword || '').trim().toLowerCase()
    if (!query) return 0
    const tokens = query.split(/\s+/).filter(Boolean)
    const title = String(event.title || '').toLowerCase()
    const activity = String(event.activity || '').toLowerCase()
    const vibes = (Array.isArray(event.vibes) ? event.vibes.map((value: string) => String(value).toLowerCase()) : []).join(' ')
    const description = String(event.description || '').toLowerCase()
    let score = 0
    for (const token of tokens) {
      if (activity === token) score += 10
      else if (activity.startsWith(token)) score += 8
      else if (activity.includes(token)) score += 6

      if (title === token) score += 8
      else if (title.startsWith(token)) score += 6
      else if (title.includes(token)) score += 4

      if (vibes.split(' ').includes(token)) score += 5
      else if (vibes.includes(token)) score += 3

      if (description.includes(token)) score += 2
    }
    return score
  }

  function renderEventAvatar(event: any, size = 72) {
    return <EventAvatar event={event} size={size} />
  }

  function eventMatchesFilters(event: any, filters: MapSearchFilters, mapCenter?: L.LatLng | null) {
    if (!isUpcomingEvent(event)) return false
    if (filters.dateAfter && event.date && String(event.date) < String(filters.dateAfter)) return false
    if (filters.dateBefore && event.date && String(event.date) > String(filters.dateBefore)) return false
    if (filters.keyword) {
      if (getKeywordScore(event, filters.keyword) <= 0) return false
    }
    const eventTimeMinutes = parseTimeToMinutes(event.startTime)
    const timeAfterMinutes = parseTimeToMinutes(filters.timeAfter)
    const timeBeforeMinutes = parseTimeToMinutes(filters.timeBefore)
    if (timeAfterMinutes !== null && (eventTimeMinutes === null || eventTimeMinutes < timeAfterMinutes)) return false
    if (timeBeforeMinutes !== null && (eventTimeMinutes === null || eventTimeMinutes > timeBeforeMinutes)) return false
    const costValue = typeof event.costValue === 'number' ? event.costValue : parseEventCostValue(event.cost)
    if (filters.maxCost !== undefined && (costValue === undefined || costValue > filters.maxCost)) return false
    const hostRating = Number(getProfile(event.host || '')?.rating || 0)
    if (filters.minHostRating !== undefined && hostRating < filters.minHostRating) return false
    if (filters.radiusKm !== undefined) {
      const center = filters.centerCoords || (mapCenter ? { lat: mapCenter.lat, lon: mapCenter.lng } : undefined)
      const coords = event.locationCoords
      if (!center || !coords || typeof coords.lat !== 'number' || typeof coords.lon !== 'number') return false
      if (haversineKm(center.lat, center.lon, coords.lat, coords.lon) > filters.radiusKm) return false
    }
    return true
  }

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
    mapInvalidateTimeout.current = window.setTimeout(() => {
      try {
        if (mapRef.current === map) map.invalidateSize()
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
      const recommendation = getSessionRecommendation(getLoggedInUser(), e)
      const parts = []
      parts.push(`<div class="map-popup-card" style="padding:4px;min-width:180px">`)
      parts.push(`<div style="font-weight:700;font-size:15px;margin-bottom:6px">${escapeHtml(title)}</div>`)
      if (dt) parts.push(`<div style="font-size:12px;color:#6b7280;margin-bottom:4px">${escapeHtml(dt)}</div>`)
      const hostToShow = host || fallbackHost
      if (hostToShow) parts.push(`<div style="margin-top:8px;font-size:13px">Host: <strong>${escapeHtml(hostToShow)}${escapeHtml(rating)}</strong></div>`)
      if (recommendation.badgeCount > 0) parts.push(`<div style="margin-top:8px;font-size:13px;color:#2563eb;font-weight:700">${escapeHtml(recommendation.badge)} Recommended</div>`)
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
        const evts = listEvents()
          .filter(event => eventMatchesFilters(event, filtersRef.current, mapRef.current?.getCenter() || null))
          .sort((a, b) => {
            const keywordDelta = getKeywordScore(b, filtersRef.current.keyword) - getKeywordScore(a, filtersRef.current.keyword)
            if (keywordDelta !== 0) return keywordDelta
            const recommendationDelta = getSessionRecommendation(getLoggedInUser(), b).score - getSessionRecommendation(getLoggedInUser(), a).score
            if (recommendationDelta !== 0) return recommendationDelta
            return getEventSortTime(a) - getEventSortTime(b)
          })
        setVisibleCount(evts.length)
        setFilteredEvents(evts)
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
    refreshMarkersRef.current = loadEventMarkers

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

            locateInvalidateTimeout.current = window.setTimeout(() => {
              const m3 = mapRef.current
              if (m3) {
                try { m3.invalidateSize() } catch (e) { console.warn('[MapView] locate invalidateSize failed', e) }
              }
            }, 300)

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
      try { if (mapInvalidateTimeout.current) window.clearTimeout(mapInvalidateTimeout.current) } catch (e) {}
      try { if (locateInvalidateTimeout.current) window.clearTimeout(locateInvalidateTimeout.current) } catch (e) {}
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

  useEffect(() => {
    filtersRef.current = appliedFilters
    const map = mapRef.current
    if (map && appliedFilters.centerCoords) {
      try { map.flyTo([appliedFilters.centerCoords.lat, appliedFilters.centerCoords.lon], 13, { animate: true }) } catch { try { map.setView([appliedFilters.centerCoords.lat, appliedFilters.centerCoords.lon], 13) } catch {} }
    }
    if (refreshMarkersRef.current) refreshMarkersRef.current()
  }, [appliedFilters])

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
      <div className="map-search" style={{ padding: '10px 12px 0 12px' }}>
        <div style={{ background: 'white', borderRadius: 16, boxShadow: '0 8px 24px rgba(2,6,23,0.08)', padding: 12, border: '1px solid rgba(15,23,32,0.06)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Upcoming sessions</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{visibleCount} result{visibleCount === 1 ? '' : 's'}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <button type="button" className="btn ghost" style={{ flex: '0 0 auto', minWidth: 64, fontWeight: resultsMode === 'map' ? 800 : 600, borderColor: resultsMode === 'map' ? 'rgba(var(--secondary-rgb),0.35)' : undefined }} onClick={() => setResultsMode('map')}>
                Map
              </button>
              <button type="button" className="btn ghost" style={{ flex: '0 0 auto', minWidth: 64, fontWeight: resultsMode === 'list' ? 800 : 600, borderColor: resultsMode === 'list' ? 'rgba(var(--secondary-rgb),0.35)' : undefined }} onClick={() => setResultsMode('list')}>
                List
              </button>
              <button type="button" className="btn" style={{ flex: '0 0 auto' }} onClick={() => setFiltersOpen(true)}>
                Search{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
              </button>
            </div>
          </div>
          {filterSummary && (
            <div style={{ fontSize: 12, color: '#6b7280' }}>
              {filterSummary}
            </div>
          )}
          {activeFilterCount > 0 && (
            <button type="button" className="btn ghost" style={{ flex: '0 0 auto', alignSelf: 'flex-start' }} onClick={() => setAppliedFilters({ dateAfter: new Date().toISOString().slice(0, 10) })}>
              Clear
            </button>
          )}
        </div>
      </div>

      <div ref={mapEl} className="map-container" style={{ flex: 1, minHeight: 300 }} />

      {resultsMode === 'list' && (
        <div style={{ position: 'absolute', left: 12, right: 12, top: 12, bottom: 20, zIndex: 1800, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ width: '100%', maxWidth: 860, background: 'rgba(255,255,255,0.98)', borderRadius: 20, boxShadow: '0 24px 48px rgba(2,6,23,0.22)', border: '1px solid rgba(15,23,32,0.06)', overflow: 'hidden', display: 'flex', flexDirection: 'column', pointerEvents: 'auto' }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid #e5e7eb', fontSize: 13, color: '#6b7280', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 700, color: '#111827' }}>List view of filtered upcoming sessions</div>
                <div style={{ marginTop: 2 }}>{filteredEvents.length} result{filteredEvents.length === 1 ? '' : 's'}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" className="btn ghost" style={{ flex: '0 0 auto' }} onClick={() => setFiltersOpen(true)}>Search</button>
                <button type="button" className="btn ghost" style={{ flex: '0 0 auto' }} onClick={() => setResultsMode('map')}>Back to map</button>
              </div>
            </div>
            <div style={{ overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredEvents.length === 0 ? (
                <div style={{ color: '#6b7280', padding: 12 }}>No sessions match the current filters.</div>
              ) : filteredEvents.map((event, index) => {
              const hostProfile = event.host ? getProfile(event.host) : null
              const hostName = event.host ? getPublicIdentityLabel(event.host, hostProfile || undefined) : (event.organiserName || 'Unknown host')
              const recommendation = getSessionRecommendation(getLoggedInUser(), event)
              const costValue = typeof event.costValue === 'number' ? event.costValue : parseEventCostValue(event.cost)
              return (
                <div key={event.id} style={{ background: 'white', borderRadius: 14, border: '1px solid rgba(15,23,32,0.06)', padding: 12, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  {renderEventAvatar(event, 84)}
                  <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{event.title || event.activity || 'Session'}</div>
                        <div style={{ marginTop: 4, fontSize: 12, color: '#6b7280' }}>{event.date} {event.startTime ? `· ${event.startTime}` : ''}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {appliedFilters.keyword && <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 700 }}>#{index + 1} best match</div>}
                        {recommendation.badgeCount > 0 && <div style={{ fontSize: 18, lineHeight: 1 }}>{recommendation.badge}</div>}
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: '#374151' }}>{event.location || 'Location not specified'}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: 12, color: '#6b7280' }}>
                      <span>Host: {hostName}{typeof hostProfile?.rating === 'number' ? ` (${hostProfile.rating}★)` : ''}</span>
                      <span>Cost: {costValue !== undefined ? `$${costValue}` : (event.cost || 'Unknown')}</span>
                    </div>
                    {recommendation.reasons.length > 0 && <div style={{ fontSize: 12, color: '#1d4ed8' }}>{recommendation.reasons.join(' · ')}</div>}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button type="button" className="btn" onClick={() => window.dispatchEvent(new CustomEvent('demo1_open_event', { detail: { id: event.id } }))}>View session</button>
                      {event.locationCoords && <button type="button" className="btn ghost" onClick={() => {
                        const map = mapRef.current
                        if (!map) return
                        try { map.flyTo([event.locationCoords.lat, event.locationCoords.lon], 15, { animate: true }) } catch { try { map.setView([event.locationCoords.lat, event.locationCoords.lon], 15) } catch {} }
                        setResultsMode('map')
                      }}>Show on map</button>}
                    </div>
                  </div>
                </div>
              )
              })}
            </div>
          </div>
        </div>
      )}

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
          <circle cx="12" cy="12" r="7" stroke="var(--secondary)" strokeWidth="1.6" />
          <path d="M12 3v3" stroke="var(--secondary)" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M12 21v-3" stroke="var(--secondary)" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M3 12h3" stroke="var(--secondary)" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M21 12h-3" stroke="var(--secondary)" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      <MapSearchFiltersModal
        open={filtersOpen}
        filters={appliedFilters}
        onApply={setAppliedFilters}
        onClose={() => setFiltersOpen(false)}
      />
    </div>
  )
}

