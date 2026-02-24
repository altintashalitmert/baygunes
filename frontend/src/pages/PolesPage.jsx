import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import {
  CheckCircle2,
  ChevronLeft,
  Layers,
  Loader2,
  MapPin,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { poleApi } from '../api/poleApi'
import { orderApi } from '../api/orderApi'
import MapView from '../components/MapView'
import ConfirmModal from '../components/ConfirmModal'
import BulkOperationsModal from '../components/BulkOperationsModal'
import CreateOrderModal from '../components/CreateOrderModal'
import OrderDetailsModal from '../components/OrderDetailsModal'

const statusFilters = [
  { label: 'Tumu', value: '' },
  { label: 'Musait', value: 'AVAILABLE' },
  { label: 'Dolu', value: 'OCCUPIED' },
]

const toReadableStatus = (status) => {
  if (status === 'AVAILABLE') return 'Musait'
  if (status === 'OCCUPIED') return 'Dolu'
  return status || '-'
}

function PolesPage() {
  const [selectedPoleId, setSelectedPoleId] = useState(null)
  const [selectedPoleIds, setSelectedPoleIds] = useState([])
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [viewMode, setViewMode] = useState('list')

  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [bulkStatus, setBulkStatus] = useState('')
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false)

  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    onConfirm: () => {},
    title: '',
    message: '',
  })

  const [newPole, setNewPole] = useState({
    latitude: '',
    longitude: '',
    city: 'Tokat',
    district: '',
    neighborhood: '',
    street: '',
    sequenceNo: 1,
  })
  const [editFormData, setEditFormData] = useState(null)

  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()

  const { data: polesData, isLoading } = useQuery({
    queryKey: ['poles'],
    queryFn: () => poleApi.getAll(),
  })
  const poles = polesData?.data?.data?.poles || []

  useEffect(() => {
    const poleCodeParam = searchParams.get('poleCode')
    if (!poleCodeParam || poles.length === 0) return

    const targetPole = poles.find((pole) => pole.pole_code === poleCodeParam)
    if (!targetPole) return

    setSelectedPoleId(targetPole.id)
    setViewMode('detail')
  }, [searchParams, poles])

  const selectedPole = poles.find((pole) => pole.id === selectedPoleId) || null

  const fallbackOrder = selectedPole?.active_order_id
    ? {
        id: selectedPole.active_order_id,
        status: selectedPole.order_status || 'PENDING',
        client_name: selectedPole.client_name,
        start_date: selectedPole.start_date,
        end_date: selectedPole.end_date,
        contract_file_url: selectedPole.contract_file_url,
        ad_image_url: selectedPole.ad_image_url,
        pole_code: selectedPole.pole_code,
        district: selectedPole.district,
      }
    : null

  const { data: orderDetailsData, refetch: refetchOrderDetails } = useQuery({
    queryKey: ['activeOrder', selectedPole?.active_order_id],
    queryFn: () => orderApi.getById(selectedPole.active_order_id),
    enabled: Boolean(selectedPole?.active_order_id),
  })

  const filteredPoles = poles.filter((pole) => {
    const matchesSearch =
      searchText === '' ||
      pole.pole_code.toLowerCase().includes(searchText.toLowerCase()) ||
      pole.district.toLowerCase().includes(searchText.toLowerCase())
    const matchesStatus = statusFilter === '' || pole.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const createOrderMutation = useMutation({
    mutationFn: orderApi.createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poles'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      setShowOrderModal(false)
      alert('Reklam siparisi olusturuldu.')
    },
    onError: (error) => {
      alert(error?.response?.data?.error || error.message || 'Siparis olusturulamadi.')
    },
  })

  const createMutation = useMutation({
    mutationFn: poleApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poles'] })
      setIsCreating(false)
      setViewMode('list')
      alert('Direk olusturuldu.')
    },
    onError: (error) => {
      alert(error?.response?.data?.error || error.message || 'Direk olusturulamadi.')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => poleApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poles'] })
      setIsEditing(false)
      setViewMode('detail')
    },
    onError: (error) => {
      alert(error?.response?.data?.error || error.message || 'Direk guncellenemedi.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: poleApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poles'] })
      setSelectedPoleId(null)
      setViewMode('list')
    },
    onError: (error) => {
      alert(error?.response?.data?.error || error.message || 'Direk silinemedi.')
    },
  })

  const bulkUpdateMutation = useMutation({
    mutationFn: (status) => {
      const ids = filteredPoles.map((pole) => pole.id)
      return poleApi.bulkUpdate(ids, status)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poles'] })
      setShowBulkModal(false)
    },
  })

  const updateOrderStatusMutation = useMutation({
    mutationFn: ({ id, newStatus }) => orderApi.updateStatus(id, { newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poles'] })
      queryClient.invalidateQueries({ queryKey: ['activeOrder'] })
      refetchOrderDetails()
    },
    onError: (error) => {
      alert(error?.response?.data?.error || error.message || 'Durum guncellenemedi.')
    },
  })

  const handleMapClick = (latlng) => {
    if (isCreating) {
      setNewPole((prev) => ({
        ...prev,
        latitude: latlng.lat.toFixed(6),
        longitude: latlng.lng.toFixed(6),
      }))
      return
    }

    if (isEditing) {
      setEditFormData((prev) => ({
        ...prev,
        latitude: latlng.lat.toFixed(6),
        longitude: latlng.lng.toFixed(6),
      }))
    }
  }

  const startCreating = () => {
    setIsCreating(true)
    setViewMode('form')
    setIsEditing(false)
    setSelectedPoleId(null)
    setSelectedPoleIds([])
    setNewPole((prev) => ({ ...prev, latitude: '', longitude: '' }))
  }

  const selectPole = (pole) => {
    if (isMultiSelectMode) {
      setSelectedPoleIds((prev) => {
        if (prev.includes(pole.id)) return prev.filter((id) => id !== pole.id)
        return [...prev, pole.id]
      })
      return
    }

    setSelectedPoleId(pole.id)
    setViewMode('detail')
    setIsCreating(false)
    setIsEditing(false)
  }

  const toggleMultiSelect = () => {
    setIsMultiSelectMode((prev) => !prev)
    setSelectedPoleIds([])
    setSelectedPoleId(null)
    setViewMode('list')
    setIsCreating(false)
    setIsEditing(false)
  }

  const handleBulkOrder = () => {
    if (selectedPoleIds.length === 0) return

    const hasOccupied = selectedPoleIds.some((id) => poles.find((pole) => pole.id === id)?.status === 'OCCUPIED')
    if (hasOccupied) {
      alert('Secilen direkler arasinda dolu olanlar var. Sadece musait direk secin.')
      return
    }

    setShowOrderModal(true)
  }

  const backToList = () => {
    setSelectedPoleId(null)
    setIsCreating(false)
    setIsEditing(false)
    setViewMode('list')
  }

  const openDeleteConfirm = () => {
    if (!selectedPole) return
    setConfirmConfig({
      isOpen: true,
      title: 'Diregi Sil',
      message: `${selectedPole.pole_code} kodlu diregi silmek istiyor musunuz?`,
      onConfirm: () => deleteMutation.mutate(selectedPole.id),
    })
  }

  const openBulkStatusConfirm = () => {
    if (!bulkStatus) {
      alert('Toplu islem icin once durum secin.')
      return
    }
    setConfirmConfig({
      isOpen: true,
      title: 'Toplu Guncelleme',
      message: 'Filtrelenen direklerin durumunu guncellemek istiyor musunuz?',
      onConfirm: () => bulkUpdateMutation.mutate(bulkStatus),
    })
  }

  const toEditFormPayload = (form) => ({
    latitude: form.latitude,
    longitude: form.longitude,
    city: form.city,
    district: form.district,
    neighborhood: form.neighborhood,
    street: form.street,
    status: form.status,
  })

  const selectedOrder = orderDetailsData?.data?.data?.order || fallbackOrder
  const selectedListPoles =
    selectedPoleIds.length > 0
      ? filteredPoles.filter((pole) => selectedPoleIds.includes(pole.id))
      : selectedPoleId
        ? [filteredPoles.find((pole) => pole.id === selectedPoleId)].filter(Boolean)
        : []

  const counts = {
    total: filteredPoles.length,
    available: filteredPoles.filter((pole) => pole.status === 'AVAILABLE').length,
    occupied: filteredPoles.filter((pole) => pole.status === 'OCCUPIED').length,
  }

  return (
    <div className="h-[calc(100vh-140px)] min-h-[680px]">
      <div className="grid h-full grid-cols-1 gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
        <section className="flex min-h-0 flex-col gap-4">
          <div className="glass-panel rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="inline-flex items-center gap-2 text-xl font-extrabold text-slate-900">
                  <span className="rounded-lg bg-indigo-600 p-1.5 text-white">
                    <Layers className="h-4 w-4" />
                  </span>
                  Direkler
                </h1>
                <p className="mt-1 text-xs text-slate-500">Listeyi yonetin, haritada secim yapin.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(true)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Toplu Durum
                </button>
                <button
                  type="button"
                  onClick={toggleMultiSelect}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                    isMultiSelectMode
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Coklu Secim
                </button>
                <button
                  type="button"
                  onClick={startCreating}
                  className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                >
                  <Plus className="h-4 w-4" />
                  Yeni
                </button>
              </div>
            </div>

            {viewMode === 'list' && (
              <div className="mt-4 space-y-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder="Direk kodu veya ilce ara..."
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm text-slate-700 outline-none focus:border-indigo-400"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {statusFilters.map((filter) => {
                    const isActive = statusFilter === filter.value
                    const count =
                      filter.value === ''
                        ? counts.total
                        : filter.value === 'AVAILABLE'
                          ? counts.available
                          : counts.occupied
                    return (
                      <button
                        key={filter.label}
                        type="button"
                        onClick={() => setStatusFilter(filter.value)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                          isActive
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {filter.label} ({count})
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="glass-panel relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {isLoading && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70 backdrop-blur-sm">
                <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4">
              {viewMode === 'list' && (
                <div className="space-y-3">
                  {filteredPoles.length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                      Filtreye uygun direk bulunamadi.
                    </div>
                  )}

                  {filteredPoles.map((pole) => {
                    const isActive = selectedPoleIds.includes(pole.id)
                    return (
                      <button
                        key={pole.id}
                        type="button"
                        onClick={() => selectPole(pole)}
                        className={`w-full rounded-xl border p-4 text-left transition ${
                          isActive
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-lg font-bold text-slate-900">{pole.pole_code}</p>
                            <p className="mt-1 text-xs text-slate-500">{pole.district}</p>
                          </div>
                          <span
                            className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
                              pole.status === 'AVAILABLE'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {toReadableStatus(pole.status)}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {viewMode === 'detail' && selectedPole && (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={backToList}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Listeye don
                  </button>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xl font-extrabold text-slate-900">{selectedPole.pole_code}</p>
                    <p className="mt-1 text-xs text-slate-600">
                      {selectedPole.city} / {selectedPole.district}
                    </p>
                    <span
                      className={`mt-3 inline-flex rounded-md px-2 py-1 text-[11px] font-semibold ${
                        selectedPole.status === 'AVAILABLE'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {toReadableStatus(selectedPole.status)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 p-3">
                      <p className="text-[11px] font-semibold uppercase text-slate-400">Mahalle</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{selectedPole.neighborhood || '-'}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-3">
                      <p className="text-[11px] font-semibold uppercase text-slate-400">Cadde</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{selectedPole.street || '-'}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-3 sm:col-span-2">
                      <p className="text-[11px] font-semibold uppercase text-slate-400">Koordinat</p>
                      <p className="mt-1 text-xs font-mono text-slate-700">
                        {selectedPole.latitude}, {selectedPole.longitude}
                      </p>
                    </div>
                  </div>

                  {selectedPole.active_order_id ? (
                    <div className="rounded-2xl bg-slate-900 p-4 text-white">
                      <p className="text-[11px] font-semibold uppercase text-indigo-300">Aktif reklam</p>
                      <p className="mt-1 text-lg font-bold">{selectedPole.client_name || 'Musteri'}</p>
                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => setShowOrderDetailsModal(true)}
                          className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold hover:bg-indigo-500"
                        >
                          Siparisi Yonet
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowOrderModal(true)}
                          className="rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20"
                        >
                          Siradaki Kampanya
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowOrderModal(true)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
                    >
                      <Plus className="h-4 w-4" />
                      Reklam Baslat
                    </button>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditFormData({
                          ...selectedPole,
                          sequenceNo: selectedPole.sequenceNo ?? selectedPole.sequence_no ?? 1,
                        })
                        setViewMode('form')
                        setIsEditing(true)
                        setIsCreating(false)
                      }}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Duzenle
                    </button>
                    <button
                      type="button"
                      onClick={openDeleteConfirm}
                      className="inline-flex items-center justify-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                    >
                      <Trash2 className="h-4 w-4" />
                      Sil
                    </button>
                  </div>
                </div>
              )}

              {viewMode === 'form' && (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => {
                      if (isEditing && selectedPole) {
                        setViewMode('detail')
                        setIsEditing(false)
                        return
                      }
                      backToList()
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Geri
                  </button>

                  <div className="rounded-xl border border-dashed border-indigo-300 bg-indigo-50 p-4 text-center">
                    <MapPin className="mx-auto h-6 w-6 text-indigo-600" />
                    <p className="mt-2 text-xs font-semibold text-indigo-700">
                      Haritadan konum secin. Secim yaptikca koordinat otomatik dolar.
                    </p>
                    <p className="mt-2 text-xs font-mono text-slate-600">
                      {(isEditing ? editFormData?.latitude : newPole.latitude) || '-'} ,{' '}
                      {(isEditing ? editFormData?.longitude : newPole.longitude) || '-'}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-500">Ilce / Bolge</label>
                      <input
                        type="text"
                        value={(isEditing ? editFormData?.district : newPole.district) || ''}
                        onChange={(event) => {
                          const value = event.target.value
                          if (isEditing) {
                            setEditFormData((prev) => ({ ...prev, district: value }))
                            return
                          }
                          setNewPole((prev) => ({ ...prev, district: value }))
                        }}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-500">Cadde / Sokak</label>
                      <input
                        type="text"
                        value={(isEditing ? editFormData?.street : newPole.street) || ''}
                        onChange={(event) => {
                          const value = event.target.value
                          if (isEditing) {
                            setEditFormData((prev) => ({ ...prev, street: value }))
                            return
                          }
                          setNewPole((prev) => ({ ...prev, street: value }))
                        }}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-500">Sira No</label>
                      <input
                        type="number"
                        min="1"
                        value={(isEditing ? editFormData?.sequenceNo : newPole.sequenceNo) || 1}
                        onChange={(event) => {
                          const value = Number(event.target.value || 1)
                          if (isEditing) {
                            setEditFormData((prev) => ({
                              ...prev,
                              sequenceNo: value,
                              sequence_no: value,
                            }))
                            return
                          }
                          setNewPole((prev) => ({ ...prev, sequenceNo: value }))
                        }}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (isEditing) {
                        updateMutation.mutate({
                          id: editFormData.id,
                          data: toEditFormPayload(editFormData),
                        })
                        return
                      }
                      createMutation.mutate(newPole)
                    }}
                    disabled={isEditing ? !editFormData?.latitude : !newPole.latitude}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isEditing ? 'Degisiklikleri Kaydet' : 'Diregi Olustur'}
                  </button>
                </div>
              )}
            </div>

            {isMultiSelectMode && selectedPoleIds.length > 0 && viewMode === 'list' && (
              <div className="border-t border-slate-200 bg-slate-50 p-3">
                <button
                  type="button"
                  onClick={handleBulkOrder}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  <Layers className="h-4 w-4" />
                  ({selectedPoleIds.length}) direk icin reklam olustur
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="relative min-h-[360px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <MapView
            poles={filteredPoles}
            onPoleClick={selectPole}
            onMapClick={isCreating || isEditing ? handleMapClick : null}
            selectedPoleId={selectedPoleId}
            selectedPoleIds={selectedPoleIds}
          />

          {(isCreating || isEditing) && (
            <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-indigo-200 bg-indigo-50/95 px-3 py-2 text-xs font-semibold text-indigo-700">
              Haritaya tiklayarak konum secimi yapin.
            </div>
          )}
        </section>
      </div>

      <BulkOperationsModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        filteredPoles={filteredPoles}
        bulkStatus={bulkStatus}
        setBulkStatus={setBulkStatus}
        onUpdate={openBulkStatusConfirm}
      />

      <CreateOrderModal
        isOpen={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        poles={selectedListPoles}
        onCreate={(data) => {
          createOrderMutation.mutate(data)
        }}
        isPending={createOrderMutation.isPending}
      />

      <OrderDetailsModal
        isOpen={showOrderDetailsModal}
        onClose={() => setShowOrderDetailsModal(false)}
        order={selectedOrder}
        onUpdateStatus={(orderId, newStatus) => {
          updateOrderStatusMutation.mutate({ id: orderId, newStatus })
        }}
        isUpdating={updateOrderStatusMutation.isPending}
      />

      <ConfirmModal
        {...confirmConfig}
        onClose={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  )
}

export default PolesPage
