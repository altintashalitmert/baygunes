
import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const createPoleIcon = (status, selected, countdown = null) => {
  const fillColor = status === 'AVAILABLE' ? '#10b981' : 
                    status === 'OCCUPIED' ? '#ef4444' : '#64748b'
  const strokeColor = selected ? '#4f46e5' : '#ffffff' 
  const strokeWidth = selected ? 3 : 1.5
  
  // Canvas dimensions
  const w = 64
  const h = 80 // Increased height to accommodate badge
  
  // Pin geometry (centered at x=32)
  const pinTipX = 32
  const pinTipY = 70 
  
  const svgIcon = `
    <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#000" flood-opacity="0.3"/>
        </filter>
        <linearGradient id="grad-${status}" x1="0%" y1="0%" x2="100%" y2="100%">
           <stop offset="0%" style="stop-color:${fillColor};stop-opacity:1" />
           <stop offset="100%" style="stop-color:${status === 'AVAILABLE' ? '#059669' : (status === 'OCCUPIED' ? '#be123c' : '#475569')};stop-opacity:1" />
        </linearGradient>
      </defs>
      
      <!-- Countdown Badge (Top Floating) -->
       ${countdown ? `
        <g transform="translate(32, 12)" filter="url(#shadow)">
             <rect x="-18" y="-10" width="36" height="20" rx="6" fill="#1e293b" stroke="white" stroke-width="2"/>
             <text x="0" y="4" text-anchor="middle" fill="white" font-size="11" font-weight="900" font-family="system-ui, -apple-system, sans-serif">${countdown}</text>
        </g>
      ` : ''}

      <!-- Modern Pin Body -->
      <g filter="url(#shadow)">
        <path d="M32 24c-10.493 0-19 8.507-19 19 0 10.176 19 35.28 19 35.28s19-25.104 19-35.28c0-10.493-8.507-19-19-19z" 
          fill="url(#grad-${status})" 
          stroke="${strokeColor}" 
          stroke-width="${strokeWidth}"
        />
        <!-- Inner White Ring -->
        <circle cx="32" cy="43" r="7" fill="white"/>
        <!-- Inner Status Dot -->
        <circle cx="32" cy="43" r="3" fill="${fillColor}"/>
      </g>
    </svg>
  `

  return L.icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgIcon))),
    iconSize: [42, 53], // Scaled down 1.5x from 64x80 roughly
    iconAnchor: [21, 52], // Tip location scaled
    popupAnchor: [0, -52], 
  })
}

// ... existing helper ...
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
    if (onMapClick) {
      map.on('click', (e) => onMapClick(e.latlng))
    }
    return () => map.off('click')
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

// NOTE: added isMultiSelect and selectedPoleIds to props
function MapView({ poles = [], onPoleClick, onMapClick, center = [40.3167, 36.5500], zoom = 13, selectedPoleId, selectedPoleIds = [] }) {
  const mapRef = useRef(null)
  const [, forceUpdate] = useState(0)

  // Determine effective center only if SINGLE selection
  const selectedPole = selectedPoleId ? poles.find(p => p.id === selectedPoleId) : null
  const effectiveCenter = selectedPole ? [selectedPole.latitude, selectedPole.longitude] : center
  const effectiveZoom = selectedPole ? 15 : zoom

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
        
        {poles.map((pole) => {
          const countdown = pole.end_date ? getCountdownText(pole.end_date) : null
          const isSelected = selectedPoleIds.includes(pole.id) || pole.id === selectedPoleId
          
          return (
            <Marker
              key={pole.id}
              position={[pole.latitude, pole.longitude]}
              icon={createPoleIcon(pole.status, isSelected, countdown)}
              eventHandlers={{
                click: () => onPoleClick && onPoleClick(pole),
              }}
            >
               {/* Show Popup only on single selection or hover? Let's keep it simple for now, maybe disable popup on multi-select? */}
               {/* Doing nice detailed popup */}
               {!selectedPoleIds.length && (
                  <Popup>
                    <div className="p-2 min-w-[150px]">
                      <h3 className="font-bold text-lg mb-1">{pole.pole_code}</h3>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          pole.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-600' : 
                          pole.status === 'OCCUPIED' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {pole.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mb-1">{pole.district}</p>
                      
                      {pole.active_order_id && (
                        <div className="mt-2 pt-2 border-t border-slate-100">
                           <p className="text-[10px] font-bold text-slate-400 uppercase">YAYINDA</p>
                           <p className="text-xs font-bold text-indigo-600">{pole.client_name}</p>
                           {countdown && <p className="text-[10px] font-black text-rose-500 bg-rose-50 px-1 rounded w-fit mt-1">{countdown} kaldı</p>}
                        </div>
                      )}
                    </div>
                  </Popup>
               )}
            </Marker>
          )
        })}

        {onMapClick && <MapClickHandler onMapClick={onMapClick} />}
        <MapCenterUpdater center={selectedPole ? [selectedPole.latitude, selectedPole.longitude] : null} zoom={effectiveZoom} />
      </MapContainer>
    </div>
  )
}

export default MapView
