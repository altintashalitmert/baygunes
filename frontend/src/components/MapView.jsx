
import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Rectangle, useMap } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-markercluster'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'react-leaflet-markercluster/styles'

const POLE_ICON_CACHE = new Map()

const getPoleType = (pole) => pole.pole_type || pole.poleType || 'NORMAL'

const getStatusColor = (status) => {
  if (status === 'AVAILABLE') {
    return {
      base: '#10b981',
      dark: '#047857',
      badge: '#064e3b',
    }
  }
  if (status === 'OCCUPIED') {
    return {
      base: '#ef4444',
      dark: '#b91c1c',
      badge: '#7f1d1d',
    }
  }
  return {
    base: '#64748b',
    dark: '#334155',
    badge: '#0f172a',
  }
}

const createPoleIcon = (status, poleType, selected) => {
  const cacheKey = `${status}-${poleType}-${selected ? 'selected' : 'normal'}`
  if (POLE_ICON_CACHE.has(cacheKey)) {
    return POLE_ICON_CACHE.get(cacheKey)
  }

  const palette = getStatusColor(status)
  const isAydinlatmali = poleType === 'AYDINLATMALI'
  const outline = selected ? '#4338ca' : '#ffffff'
  const outlineWidth = selected ? 2.8 : 2

  const svgIcon = `
    <svg width="52" height="72" viewBox="0 0 52 72" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="pole-shadow-${cacheKey}" x="-60%" y="-50%" width="220%" height="220%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.4" flood-color="#020617" flood-opacity="0.32"/>
        </filter>
        <linearGradient id="pole-gradient-${cacheKey}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="${palette.base}" />
          <stop offset="100%" stop-color="${palette.dark}" />
        </linearGradient>
        ${isAydinlatmali ? `
          <radialGradient id="lamp-glow-${cacheKey}" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#fde68a" stop-opacity="0.9"/>
            <stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/>
          </radialGradient>
        ` : ''}
      </defs>

      ${selected ? '<circle cx="26" cy="35" r="21" fill="#eef2ff" opacity="0.65"/>' : ''}
      <g filter="url(#pole-shadow-${cacheKey})">
        <rect x="22" y="12" width="8" height="43" rx="3.5" fill="url(#pole-gradient-${cacheKey})" stroke="${outline}" stroke-width="${outlineWidth}"/>
        <rect x="16" y="10" width="20" height="5.5" rx="2.5" fill="${palette.dark}" stroke="${outline}" stroke-width="${outlineWidth * 0.75}"/>
        ${isAydinlatmali ? `
          <circle cx="38.5" cy="12.7" r="3.8" fill="#fbbf24" stroke="#fef3c7" stroke-width="1.4"/>
          <circle cx="38.5" cy="12.7" r="8.5" fill="url(#lamp-glow-${cacheKey})"/>
        ` : ''}
        <rect x="18" y="55.2" width="16" height="7" rx="3" fill="${palette.badge}" stroke="${outline}" stroke-width="${outlineWidth * 0.75}"/>
        <circle cx="26" cy="58.8" r="2.1" fill="${status === 'AVAILABLE' ? '#6ee7b7' : status === 'OCCUPIED' ? '#fca5a5' : '#cbd5e1'}"/>
      </g>
    </svg>
  `

  const icon = L.icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgIcon)))}`,
    iconSize: [30, 42],
    iconAnchor: [15, 41],
    popupAnchor: [0, -36],
  })
  POLE_ICON_CACHE.set(cacheKey, icon)
  return icon
}

const createClusterIcon = (cluster) => {
  const count = cluster.getChildCount()
  const size = count < 10 ? 38 : count < 50 ? 44 : 50
  const background = count < 10 ? '#0ea5e9' : count < 50 ? '#2563eb' : '#1e1b4b'
  return L.icon({
    iconUrl:
      'data:image/svg+xml;base64,' +
      btoa(
        unescape(
          encodeURIComponent(`
            <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
              <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 1}" fill="${background}" opacity="0.95"/>
              <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 6}" fill="#ffffff" opacity="0.14"/>
              <text x="50%" y="55%" text-anchor="middle" font-size="${count < 100 ? 14 : 12}" font-family="Inter, system-ui, sans-serif" font-weight="800" fill="#ffffff">${count}</text>
            </svg>
          `)
        )
      ),
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

const getCountdownText = (endDate) => {
  if (!endDate) return null
  const now = new Date()
  const end = new Date(endDate)
  const diff = end - now
  if (diff <= 0) return 'EXP'
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  if (days > 0) return `${days}d${hours}h`
  if (hours > 0) return `${hours}h${minutes}m`
  return `${minutes}m`
}

function MapClickHandler({ onMapClick }) {
  const map = useMap()
  useEffect(() => {
    if (!onMapClick) return undefined
    const handleMapClick = (event) => onMapClick(event.latlng)
    map.on('click', handleMapClick)
    return () => map.off('click', handleMapClick)
  }, [map, onMapClick])
  return null
}

function MapCenterUpdater({ center, zoom }) {
  const map = useMap()
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || map.getZoom(), { duration: 1 })
    }
  }, [center, zoom, map])
  return null
}

function MapBoundsUpdater({ bounds, boundsKey, enabled }) {
  const map = useMap()
  useEffect(() => {
    if (!enabled || !bounds || !boundsKey) return
    map.fitBounds(bounds, {
      padding: [38, 38],
      animate: true,
      duration: 0.8,
      maxZoom: 15,
    })
  }, [map, bounds, boundsKey, enabled])
  return null
}

function BoxZoomSelectHandler({ enabled, onBoundsSelect }) {
  const map = useMap()
  const previousViewRef = useRef(null)

  useEffect(() => {
    const container = map.getContainer()
    if (enabled) {
      map.boxZoom.enable()
    } else {
      map.boxZoom.disable()
      container.style.cursor = ''
      return undefined
    }

    const handleBoxZoomStart = () => {
      previousViewRef.current = {
        center: map.getCenter(),
        zoom: map.getZoom(),
      }
      container.style.cursor = 'crosshair'
    }

    const handleBoxZoomEnd = (event) => {
      const bounds = event?.boxZoomBounds
      if (!bounds) return
      onBoundsSelect(bounds)

      const previousView = previousViewRef.current
      if (previousView) {
        map.setView(previousView.center, previousView.zoom, { animate: false })
      }
      container.style.cursor = ''
    }

    map.on('boxzoomstart', handleBoxZoomStart)
    map.on('boxzoomend', handleBoxZoomEnd)

    return () => {
      map.off('boxzoomstart', handleBoxZoomStart)
      map.off('boxzoomend', handleBoxZoomEnd)
      container.style.cursor = ''
    }
  }, [enabled, map, onBoundsSelect])

  return null
}

const getBoundsForPoles = (poles) => {
  if (!poles.length) return null

  let minLat = Number.POSITIVE_INFINITY
  let maxLat = Number.NEGATIVE_INFINITY
  let minLng = Number.POSITIVE_INFINITY
  let maxLng = Number.NEGATIVE_INFINITY

  poles.forEach((pole) => {
    const lat = Number(pole.latitude)
    const lng = Number(pole.longitude)
    if (Number.isNaN(lat) || Number.isNaN(lng)) return
    minLat = Math.min(minLat, lat)
    maxLat = Math.max(maxLat, lat)
    minLng = Math.min(minLng, lng)
    maxLng = Math.max(maxLng, lng)
  })

  if (!Number.isFinite(minLat) || !Number.isFinite(minLng)) {
    return null
  }

  const minDelta = 0.0018
  if (Math.abs(maxLat - minLat) < minDelta) {
    const offset = minDelta / 2
    minLat -= offset
    maxLat += offset
  }
  if (Math.abs(maxLng - minLng) < minDelta) {
    const offset = minDelta / 2
    minLng -= offset
    maxLng += offset
  }

  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ]
}

const getClusterPoleIds = (clusterLayer) => {
  if (!clusterLayer?.getAllChildMarkers) return []

  return Array.from(
    new Set(
      clusterLayer
        .getAllChildMarkers()
        .map((marker) => String(marker?.options?.poleId || '').trim())
        .filter(Boolean)
    )
  )
}

// NOTE: added isMultiSelect and selectedPoleIds to props
function MapView({
  poles = [],
  onPoleClick,
  onMapClick,
  center = [40.3167, 36.5500],
  zoom = 13,
  selectedPoleId,
  selectedPoleIds = [],
  highlightPoles = [],
  multiSelectEnabled = false,
  onAreaSelect,
  onClusterSelect,
}) {
  const mapRef = useRef(null)
  const multiSelectEnabledRef = useRef(multiSelectEnabled)
  const onClusterSelectRef = useRef(onClusterSelect)
  const [, forceUpdate] = useState(0)

  // Determine effective center only if SINGLE selection
  const selectedPole = selectedPoleId ? poles.find(p => p.id === selectedPoleId) : null
  const effectiveCenter = selectedPole ? [selectedPole.latitude, selectedPole.longitude] : center
  const effectiveZoom = selectedPole ? 17 : zoom
  const highlightBounds = useMemo(() => getBoundsForPoles(highlightPoles), [highlightPoles])
  const highlightBoundsKey = useMemo(() => {
    if (!highlightBounds) return ''
    const [southWest, northEast] = highlightBounds
    return `${southWest[0].toFixed(6)}-${southWest[1].toFixed(6)}-${northEast[0].toFixed(6)}-${northEast[1].toFixed(6)}`
  }, [highlightBounds])
  const isBoxMultiSelectActive = Boolean(multiSelectEnabled && onAreaSelect)

  useEffect(() => {
    multiSelectEnabledRef.current = multiSelectEnabled
  }, [multiSelectEnabled])

  useEffect(() => {
    onClusterSelectRef.current = onClusterSelect
  }, [onClusterSelect])

  const handleAreaSelect = (bounds) => {
    if (!onAreaSelect) return
    const selectedIds = poles
      .filter((pole) => {
        const lat = Number(pole.latitude)
        const lng = Number(pole.longitude)
        if (Number.isNaN(lat) || Number.isNaN(lng)) return false
        return bounds.contains([lat, lng])
      })
      .map((pole) => pole.id)

    if (selectedIds.length > 0) {
      onAreaSelect(selectedIds)
    }
  }

  const handleClusterClick = (event) => {
    if (!multiSelectEnabledRef.current || !onClusterSelectRef.current) return

    event?.originalEvent?.preventDefault?.()
    event?.originalEvent?.stopPropagation?.()

    const clusterPoleIds = getClusterPoleIds(event?.layer)
    if (clusterPoleIds.length > 0) {
      onClusterSelectRef.current(clusterPoleIds)
    }
  }

  useEffect(() => {
    const interval = setInterval(() => forceUpdate(n => n + 1), 60000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="w-full h-full rounded-lg overflow-hidden shadow-lg border border-slate-200">
      <MapContainer 
        center={effectiveCenter} 
        zoom={effectiveZoom} 
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MarkerClusterGroup
          key={`cluster-mode-${multiSelectEnabled ? 'multi' : 'single'}`}
          chunkedLoading
          maxClusterRadius={40}
          showCoverageOnHover={false}
          zoomToBoundsOnClick={!multiSelectEnabled}
          spiderfyOnMaxZoom={!multiSelectEnabled}
          disableClusteringAtZoom={16}
          iconCreateFunction={createClusterIcon}
          onClick={handleClusterClick}
        >
          {poles.map((pole) => {
            const countdown = pole.end_date ? getCountdownText(pole.end_date) : null
            const isSelected = selectedPoleIds.includes(pole.id) || pole.id === selectedPoleId
            const poleType = getPoleType(pole)

            return (
              <Marker
                key={pole.id}
                position={[pole.latitude, pole.longitude]}
                icon={createPoleIcon(pole.status, poleType, isSelected)}
                poleId={pole.id}
                zIndexOffset={isSelected ? 2000 : 0}
                eventHandlers={{
                  click: () => onPoleClick && onPoleClick(pole),
                }}
              >
                {!selectedPoleIds.length && (
                  <Popup>
                    <div className="p-2 min-w-[150px]">
                      <h3 className="mb-1 text-lg font-bold">{pole.pole_code}</h3>
                      <div className="mb-2 flex items-center gap-2">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-black uppercase ${
                            pole.status === 'AVAILABLE'
                              ? 'bg-emerald-100 text-emerald-600'
                              : pole.status === 'OCCUPIED'
                                ? 'bg-rose-100 text-rose-600'
                                : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {pole.status}
                        </span>
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-black uppercase ${
                            poleType === 'AYDINLATMALI'
                              ? 'bg-amber-100 text-amber-600'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {poleType}
                        </span>
                      </div>
                      <p className="mb-1 text-xs text-slate-500">{pole.district}</p>

                      {pole.active_order_id && (
                        <div className="mt-2 border-t border-slate-100 pt-2">
                          <p className="text-[10px] font-bold uppercase text-slate-400">YAYINDA</p>
                          <p className="text-xs font-bold text-indigo-600">{pole.client_name}</p>
                          {countdown && (
                            <p className="mt-1 w-fit rounded bg-rose-50 px-1 text-[10px] font-black text-rose-500">
                              {countdown} kaldi
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </Popup>
                )}
              </Marker>
            )
          })}
        </MarkerClusterGroup>
        {highlightBounds && (
          <Rectangle
            bounds={highlightBounds}
            pathOptions={{
              color: '#dc2626',
              weight: 3,
              fillColor: '#fca5a5',
              fillOpacity: 0.08,
              dashArray: '8 6',
            }}
          />
        )}
        {onMapClick && <MapClickHandler onMapClick={onMapClick} />}
        <BoxZoomSelectHandler
          enabled={isBoxMultiSelectActive}
          onBoundsSelect={handleAreaSelect}
        />
        <MapCenterUpdater center={selectedPole ? [selectedPole.latitude, selectedPole.longitude] : null} zoom={effectiveZoom} />
        <MapBoundsUpdater bounds={highlightBounds} boundsKey={highlightBoundsKey} enabled={Boolean(highlightBounds && !selectedPole)} />
      </MapContainer>
    </div>
  )
}

export default MapView
