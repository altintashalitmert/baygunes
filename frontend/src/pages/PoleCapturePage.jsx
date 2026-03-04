import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CircleMarker,
  MapContainer,
  Rectangle,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import {
  CheckCircle2,
  Crosshair,
  Loader2,
  LocateFixed,
  MapPinned,
  Save,
  UploadCloud,
} from 'lucide-react'
import { poleApi } from '../api/poleApi'
import { useAuthStore } from '../stores/authStore'

const TOKAT_CENTER = [40.3167, 36.55]
const TOKAT_BOUNDS = [
  [40.12, 36.25],
  [40.58, 36.86],
]

const directionOptions = [
  { value: 'TEK_YONLU', label: 'Tek yonlu' },
  { value: 'CIFT_YONLU', label: 'Cift yonlu' },
]

const armOptions = [
  { value: 'L', label: 'L' },
  { value: 'T', label: 'T' },
]

const lightingOptions = [
  { value: 'NORMAL', label: 'Normal direk' },
  { value: 'AYDINLATMALI', label: 'Aydinlatmali direk' },
]

const formatCoord = (value) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return ''
  return num.toFixed(6)
}

const parseCoord = (value) => {
  if (value === null || value === undefined) return null
  const raw = String(value).trim()
  if (!raw) return null
  const num = Number(raw)
  return Number.isFinite(num) ? num : null
}

const isPointInsideTokat = (lat, lng) =>
  lat >= TOKAT_BOUNDS[0][0] &&
  lat <= TOKAT_BOUNDS[1][0] &&
  lng >= TOKAT_BOUNDS[0][1] &&
  lng <= TOKAT_BOUNDS[1][1]

function MapClickHandler({ onSelect }) {
  useMapEvents({
    click: (event) => {
      onSelect(event.latlng)
    },
  })
  return null
}

function MapCenterUpdater({ center }) {
  const map = useMap()
  useEffect(() => {
    if (center?.length === 2) {
      map.flyTo(center, Math.max(map.getZoom(), 16), { duration: 0.6 })
    }
  }, [center, map])
  return null
}

const getAccuracyLabel = (accuracyM) => {
  if (!Number.isFinite(accuracyM)) return 'Bilinmiyor'
  if (accuracyM <= 10) return `Yuksek (${accuracyM.toFixed(1)}m)`
  if (accuracyM <= 25) return `Iyi (${accuracyM.toFixed(1)}m)`
  return `Dusuk (${accuracyM.toFixed(1)}m)`
}

function PoleCapturePage() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const geocodeRequestRef = useRef(0)

  const [selectedIds, setSelectedIds] = useState([])
  const [isLocating, setIsLocating] = useState(false)
  const [captureSource, setCaptureSource] = useState('MAP_TAP')
  const [gpsAccuracyM, setGpsAccuracyM] = useState(null)
  const [autoAddressNote, setAutoAddressNote] = useState('')
  const [autoFillEnabled, setAutoFillEnabled] = useState(true)

  const [form, setForm] = useState({
    latitude: '',
    longitude: '',
    city: 'Tokat',
    district: 'Merkez',
    neighborhood: '',
    street: '',
    directionType: 'TEK_YONLU',
    armType: 'T',
    lightingType: 'NORMAL',
    allowOutsideTokat: false,
    notes: '',
  })

  const selectedPoint = useMemo(() => {
    const lat = parseCoord(form.latitude)
    const lng = parseCoord(form.longitude)
    if (lat === null || lng === null) return null
    return [lat, lng]
  }, [form.latitude, form.longitude])

  const inTokatBounds = useMemo(() => {
    if (!selectedPoint) return null
    return isPointInsideTokat(selectedPoint[0], selectedPoint[1])
  }, [selectedPoint])

  const { data: capturesData, isLoading } = useQuery({
    queryKey: ['poleCaptureStaging', 'pending'],
    queryFn: () => poleApi.getStaging({ imported: 'false', limit: 80 }),
  })

  const captures = capturesData?.data?.data?.captures || []

  const createCaptureMutation = useMutation({
    mutationFn: poleApi.createStaging,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poleCaptureStaging'] })
      setForm((prev) => ({
        ...prev,
        neighborhood: prev.neighborhood,
        street: prev.street,
        notes: '',
      }))
      alert('Direk koordinati kaydedildi.')
    },
    onError: (error) => {
      alert(error?.response?.data?.error || error.message || 'Kayit basarisiz.')
    },
  })

  const importMutation = useMutation({
    mutationFn: (ids) => poleApi.importStaging(ids),
    onSuccess: (response) => {
      const importedCount = response?.data?.data?.importedCount || 0
      queryClient.invalidateQueries({ queryKey: ['poleCaptureStaging'] })
      queryClient.invalidateQueries({ queryKey: ['poles'] })
      setSelectedIds([])
      alert(`${importedCount} kayit direklere aktarildi.`)
    },
    onError: (error) => {
      alert(error?.response?.data?.error || error.message || 'Import basarisiz.')
    },
  })

  const reverseGeocodeMutation = useMutation({
    mutationFn: poleApi.reverseGeocode,
  })

  const autofillAddressFromCoordinates = async (lat, lng, { force = false } = {}) => {
    if (!force && !autoFillEnabled) return
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return

    const requestId = geocodeRequestRef.current + 1
    geocodeRequestRef.current = requestId
    setAutoAddressNote('Adres bilgileri getiriliyor...')

    try {
      const response = await reverseGeocodeMutation.mutateAsync({
        latitude: Number(formatCoord(lat)),
        longitude: Number(formatCoord(lng)),
      })

      if (requestId !== geocodeRequestRef.current) return

      const address = response?.data?.data?.address || {}
      setForm((prev) => ({
        ...prev,
        city: address.city?.trim() || prev.city || 'Tokat',
        district: address.district?.trim() || prev.district,
        neighborhood: address.neighborhood?.trim() || prev.neighborhood,
        street: address.street?.trim() || prev.street,
      }))

      if (address.fullAddress) {
        setAutoAddressNote(address.fullAddress)
      } else {
        setAutoAddressNote('Adres kismi bulundu. Gerekirse elle duzelt.')
      }
    } catch (error) {
      if (requestId !== geocodeRequestRef.current) return
      setAutoAddressNote(
        error?.response?.data?.error ||
          error?.message ||
          'Adres otomatik doldurulamadi. Elle giris yapabilirsin.'
      )
    }
  }

  const updateCoord = (lat, lng, source, accuracy = null) => {
    setForm((prev) => ({
      ...prev,
      latitude: formatCoord(lat),
      longitude: formatCoord(lng),
    }))
    setCaptureSource(source)
    setGpsAccuracyM(Number.isFinite(accuracy) ? accuracy : null)
    void autofillAddressFromCoordinates(lat, lng)
  }

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      alert('Tarayici konum servisini desteklemiyor.')
      return
    }

    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateCoord(
          position.coords.latitude,
          position.coords.longitude,
          'GPS',
          position.coords.accuracy
        )
        setIsLocating(false)
      },
      (error) => {
        setIsLocating(false)
        alert(error?.message || 'Konum alinamadi.')
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    )
  }

  const handleSave = () => {
    if (!form.latitude || !form.longitude) {
      alert('Haritadan bir nokta secmeden kayit yapamazsiniz.')
      return
    }
    if (!form.district || !form.neighborhood || !form.street) {
      alert('Ilce, mahalle ve cadde zorunludur.')
      return
    }

    createCaptureMutation.mutate({
      ...form,
      source: captureSource,
      gpsAccuracyM,
    })
  }

  const canImport = user?.role === 'SUPER_ADMIN' || user?.role === 'OPERATOR'

  return (
    <div className="grid h-[calc(100vh-140px)] min-h-[680px] grid-cols-1 gap-4 lg:grid-cols-[minmax(360px,430px)_minmax(0,1fr)]">
      <section className="flex min-h-0 flex-col gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h1 className="text-xl font-extrabold text-slate-900">Sahada Direk Topla</h1>
          <p className="mt-1 text-xs text-slate-500">
            Haritaya dokununca koordinat otomatik dolar. Kayitlar once gecici staging alana yazilir.
          </p>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={handleUseMyLocation}
              disabled={isLocating}
              className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LocateFixed className="h-4 w-4" />
              {isLocating ? 'Konum aliniyor...' : 'Konumumu Al'}
            </button>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Kaynak: <strong>{captureSource === 'GPS' ? 'GPS' : 'Harita Tiklama'}</strong>
              {captureSource === 'GPS' && (
                <span className="ml-2 text-[11px] text-slate-500">{getAccuracyLabel(gpsAccuracyM)}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                const lat = parseCoord(form.latitude)
                const lng = parseCoord(form.longitude)
                if (lat === null || lng === null) {
                  alert('Once koordinat secin.')
                  return
                }
                void autofillAddressFromCoordinates(lat, lng, { force: true })
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <MapPinned className="h-4 w-4" />
              Adresi Doldur
            </button>
          </div>

          <label className="mt-2 inline-flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={autoFillEnabled}
              onChange={(event) => setAutoFillEnabled(event.target.checked)}
              className="rounded border-slate-300"
            />
            Konum secince mahalle/caddeyi otomatik doldur
          </label>

          {inTokatBounds !== null && (
            <div
              className={`mt-2 rounded-lg border px-3 py-2 text-xs ${
                inTokatBounds
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-rose-200 bg-rose-50 text-rose-700'
              }`}
            >
              {inTokatBounds
                ? 'Koordinat Tokat operasyon siniri icinde.'
                : 'Koordinat Tokat siniri disinda. Yanlis secim/ters enlem-boylam olabilir.'}
            </div>
          )}

          {(reverseGeocodeMutation.isPending || autoAddressNote) && (
            <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
              <div className="flex items-center gap-2">
                {reverseGeocodeMutation.isPending && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                )}
                <span className="truncate">{autoAddressNote || 'Adres bilgisi sorgulaniyor...'}</span>
              </div>
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <input
              type="text"
              value={form.latitude}
              onChange={(event) => setForm((prev) => ({ ...prev, latitude: event.target.value }))}
              placeholder="Enlem"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={form.longitude}
              onChange={(event) => setForm((prev) => ({ ...prev, longitude: event.target.value }))}
              placeholder="Boylam"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              type="text"
              value={form.city}
              onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
              placeholder="Sehir"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={form.district}
              onChange={(event) => setForm((prev) => ({ ...prev, district: event.target.value }))}
              placeholder="Ilce"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={form.neighborhood}
              onChange={(event) => setForm((prev) => ({ ...prev, neighborhood: event.target.value }))}
              placeholder="Mahalle"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={form.street}
              onChange={(event) => setForm((prev) => ({ ...prev, street: event.target.value }))}
              placeholder="Cadde / Sokak"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <select
              value={form.directionType}
              onChange={(event) => setForm((prev) => ({ ...prev, directionType: event.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              {directionOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              value={form.armType}
              onChange={(event) => setForm((prev) => ({ ...prev, armType: event.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              {armOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              value={form.lightingType}
              onChange={(event) => setForm((prev) => ({ ...prev, lightingType: event.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm sm:col-span-2"
            >
              {lightingOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <textarea
            value={form.notes}
            onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            rows={2}
            placeholder="Not (opsiyonel)"
            className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />

          <label className="mt-3 inline-flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={form.allowOutsideTokat}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, allowOutsideTokat: event.target.checked }))
              }
              className="rounded border-slate-300"
            />
            Tokat siniri disina kayda izin ver
          </label>

          <button
            type="button"
            onClick={handleSave}
            disabled={createCaptureMutation.isPending}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {createCaptureMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Bekleyen staging kayitlari ({captures.length})</h2>
            {canImport && (
              <button
                type="button"
                disabled={selectedIds.length === 0 || importMutation.isPending}
                onClick={() => importMutation.mutate(selectedIds)}
                className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <UploadCloud className="h-4 w-4" />
                Secileni Import Et
              </button>
            )}
          </div>

          {isLoading && <p className="text-xs text-slate-500">Yukleniyor...</p>}
          {!isLoading && captures.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">
              Heniz bekleyen kayit yok.
            </div>
          )}

          <div className="space-y-2">
            {captures.map((capture) => {
              const checked = selectedIds.includes(capture.id)
              return (
                <label
                  key={capture.id}
                  className={`block rounded-xl border p-3 ${
                    checked ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {canImport && (
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => {
                          const isChecked = event.target.checked
                          setSelectedIds((prev) =>
                            isChecked ? [...prev, capture.id] : prev.filter((id) => id !== capture.id)
                          )
                        }}
                        className="mt-0.5 rounded border-slate-300"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-slate-900">{capture.generated_code}</p>
                      <p className="truncate text-[11px] text-slate-600">
                        {capture.district} / {capture.neighborhood} / {capture.street}
                      </p>
                      <p className="mt-1 text-[11px] font-mono text-slate-500">
                        {Number(capture.latitude).toFixed(6)}, {Number(capture.longitude).toFixed(6)}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                          {capture.direction_type}
                        </span>
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                          {capture.arm_type}
                        </span>
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                          {capture.lighting_type}
                        </span>
                      </div>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </div>
                </label>
              )
            })}
          </div>
        </div>
      </section>

      <section className="min-h-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="mb-2 flex items-center gap-2 px-2 py-1 text-xs text-slate-600">
          <Crosshair className="h-4 w-4 text-indigo-600" />
          Haritaya dokununca enlem / boylam otomatik set edilir.
        </div>
        <div className="h-[calc(100%-34px)] overflow-hidden rounded-xl border border-slate-200">
          <MapContainer center={TOKAT_CENTER} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Rectangle
              bounds={TOKAT_BOUNDS}
              pathOptions={{
                color: '#dc2626',
                weight: 2,
                fillColor: '#f87171',
                fillOpacity: 0.05,
                dashArray: '6 6',
              }}
            />
            {selectedPoint && (
              <CircleMarker
                center={selectedPoint}
                radius={10}
                pathOptions={{
                  color: '#1d4ed8',
                  weight: 3,
                  fillColor: '#60a5fa',
                  fillOpacity: 0.85,
                }}
              >
                <Tooltip direction="top" offset={[0, -10]} permanent>
                  {formatCoord(selectedPoint[0])}, {formatCoord(selectedPoint[1])}
                </Tooltip>
              </CircleMarker>
            )}
            <MapClickHandler onSelect={(latlng) => updateCoord(latlng.lat, latlng.lng, 'MAP_TAP')} />
            <MapCenterUpdater center={selectedPoint} />
          </MapContainer>
        </div>
      </section>
    </div>
  )
}

export default PoleCapturePage
