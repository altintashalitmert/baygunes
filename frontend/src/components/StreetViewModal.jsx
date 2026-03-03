import { ExternalLink, MapPin, X } from 'lucide-react'
import { useMemo } from 'react'

const toNumber = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function StreetViewModal({ isOpen, onClose, pole, apiKey }) {
  const streetViewData = useMemo(() => {
    if (!pole) return null
    const lat = toNumber(pole.latitude)
    const lng = toNumber(pole.longitude)
    const hasCoordinates = lat !== null && lng !== null

    const embedUrl =
      hasCoordinates && apiKey
        ? `https://www.google.com/maps/embed/v1/streetview?key=${encodeURIComponent(apiKey)}&location=${lat},${lng}&fov=80&heading=0&pitch=0`
        : null

    const mapsUrl = hasCoordinates
      ? `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`
      : null

    return { lat, lng, hasCoordinates, embedUrl, mapsUrl }
  }, [apiKey, pole])

  if (!isOpen || !pole) return null

  const noKey = !apiKey
  const noCoordinates = !streetViewData?.hasCoordinates
  const cannotEmbed = noKey || noCoordinates

  return (
    <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Sokak Gorunumu</p>
            <p className="text-sm font-bold text-slate-900">{pole.pole_code}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-0 lg:grid-cols-[1fr_280px]">
          <div className="min-h-[360px] bg-slate-100">
            {cannotEmbed ? (
              <div className="flex h-full min-h-[360px] items-center justify-center p-6">
                <div className="max-w-md rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  {noKey && (
                    <p>
                      Google Maps Embed API anahtari tanimli degil. Frontend ortam degiskenine
                      `VITE_GOOGLE_MAPS_EMBED_API_KEY` ekleyin.
                    </p>
                  )}
                  {noCoordinates && (
                    <p>
                      Bu direk icin gecerli koordinat bulunamadi.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <iframe
                title={`Street View ${pole.pole_code}`}
                src={streetViewData.embedUrl}
                className="h-[70vh] min-h-[360px] w-full border-0"
                loading="lazy"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            )}
          </div>

          <aside className="space-y-4 border-t border-slate-200 bg-white p-4 lg:border-l lg:border-t-0">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Konum</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {pole.city || '-'} / {pole.district || '-'}
              </p>
              <p className="mt-1 text-xs text-slate-500">{pole.street || '-'}</p>
              <p className="mt-1 text-xs font-mono text-slate-600">
                {streetViewData?.lat ?? '-'}, {streetViewData?.lng ?? '-'}
              </p>
            </div>

            {streetViewData?.mapsUrl && (
              <a
                href={streetViewData.mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
              >
                <MapPin className="h-4 w-4" />
                Google Maps'te Ac
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}

            <p className="text-[11px] text-slate-500">
              Not: Street View goruntusu Google kapsamasina baglidir; her noktada pano olmayabilir.
            </p>
          </aside>
        </div>
      </div>
    </div>
  )
}

export default StreetViewModal
