import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Camera, CheckCircle2, Loader2, MapPin, Navigation, Phone, X } from 'lucide-react'
import { orderApi } from '../api/orderApi'
import ConfirmModal from '../components/ConfirmModal'
import { buildBackendUrl } from '../utils/url'
import { useAuthStore } from '../stores/authStore'

function FieldTasksPage() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  const [selectedOrder, setSelectedOrder] = useState(null)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    onConfirm: () => {},
    title: '',
    message: '',
  })

  const { data: ordersData = [], isLoading } = useQuery({
    queryKey: ['field-tasks', user?.role],
    queryFn: async () => {
      if (user?.role === 'FIELD') {
        const myTasks = await orderApi.getMyTasks()
        const assignedOrders = myTasks?.data?.data?.orders || []
        return assignedOrders.filter((order) => ['AWAITING_MOUNT', 'EXPIRED'].includes(order.status))
      }

      const [awaitingMountResponse, expiredResponse] = await Promise.all([
        orderApi.getOrders({ status: 'AWAITING_MOUNT' }),
        orderApi.getOrders({ status: 'EXPIRED' }),
      ])

      return [
        ...(awaitingMountResponse?.data?.data?.orders || []),
        ...(expiredResponse?.data?.data?.orders || []),
      ]
    },
    enabled: Boolean(user),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, newStatus }) => orderApi.updateStatus(id, { newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-tasks'] })
      setSelectedOrder(null)
    },
  })

  const handleFileUpload = async (event, order) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadLoading(true)
    const formData = new FormData()
    formData.append('proof', file)

    try {
      const response = await orderApi.uploadFile(order.id, 'proof', formData)
      const uploadedPath = response?.data?.data?.file

      setSelectedOrder((prev) => {
        if (!prev) return prev
        if (prev.status === 'AWAITING_MOUNT') {
          return {
            ...prev,
            has_mount_proof: true,
            mount_proof_url: uploadedPath || prev.mount_proof_url,
          }
        }
        return {
          ...prev,
          has_dismount_proof: true,
          dismount_proof_url: uploadedPath || prev.dismount_proof_url,
        }
      })

      queryClient.invalidateQueries({ queryKey: ['field-tasks'] })
    } catch (err) {
      alert(`Fotoğraf yüklenemedi: ${err.response?.data?.error || err.message}`)
    } finally {
      setUploadLoading(false)
    }
  }

  const openCompleteConfirm = (order) => {
    const isMountFlow = order.status === 'AWAITING_MOUNT'
    setConfirmConfig({
      isOpen: true,
      title: isMountFlow ? 'Montajı Tamamla' : 'Sökümü Tamamla',
      message: isMountFlow
        ? 'Montajın tamamlandığını onaylıyor musunuz?'
        : 'Sökümün tamamlandığını onaylıyor musunuz?',
      onConfirm: () =>
        statusMutation.mutate({
          id: order.id,
          newStatus: isMountFlow ? 'LIVE' : 'COMPLETED',
        }),
    })
  }

  const awaitingMountCount = ordersData.filter((order) => order.status === 'AWAITING_MOUNT').length
  const expiredCount = ordersData.filter((order) => order.status === 'EXPIRED').length

  const isMountFlow = selectedOrder?.status === 'AWAITING_MOUNT'
  const hasProof = isMountFlow ? selectedOrder?.has_mount_proof : selectedOrder?.has_dismount_proof
  const proofUrl = isMountFlow ? selectedOrder?.mount_proof_url : selectedOrder?.dismount_proof_url
  const proofTitle = isMountFlow ? 'Montaj Kanıtı' : 'Söküm Kanıtı'
  const completeLabel = isMountFlow ? 'Montajı Tamamla' : 'Sökümü Tamamla'
  const statusLabel = isMountFlow ? 'Montaj Bekliyor' : 'Söküm Bekliyor'

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="glass-panel rounded-lg p-4">
        <h1 className="text-xl font-semibold text-slate-900">Saha Görevleri</h1>
        <p className="mt-1 text-sm text-slate-600">Saha montaj ve söküm işlerini bu ekrandan yönetin.</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-700">Montaj: {awaitingMountCount}</span>
          <span className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-700">Söküm: {expiredCount}</span>
        </div>
      </div>

      {isLoading ? (
        <div className="glass-panel rounded-lg p-10 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-500" />
        </div>
      ) : (
        <div className="space-y-3">
          {ordersData.length === 0 && (
            <div className="glass-panel rounded-lg p-6 text-center text-sm text-slate-500">
              Açık saha görevi yok.
            </div>
          )}

          {ordersData.map((order) => (
            <button
              key={order.id}
              type="button"
              onClick={() => setSelectedOrder(order)}
              className="glass-panel w-full rounded-lg p-4 text-left hover:bg-slate-50"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{order.client_name}</p>
                  <p className="mt-1 text-xs text-slate-600">Direk: {order.pole_code}</p>
                  <span
                    className={`mt-2 inline-block rounded-md px-2 py-1 text-[11px] font-medium ${
                      order.status === 'AWAITING_MOUNT'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {order.status === 'AWAITING_MOUNT' ? 'Montaj Bekliyor' : 'Söküm Bekliyor'}
                  </span>
                </div>
                {order.ad_image_url && (
                  <img
                    src={buildBackendUrl(order.ad_image_url)}
                    alt="Reklam görseli"
                    className="h-12 w-12 rounded-md border border-slate-200 object-cover"
                  />
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{selectedOrder.client_name}</h2>
                <p className="text-xs text-slate-600">{statusLabel}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="rounded-md border border-slate-300 p-1.5 text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() =>
                  window.open(
                    `https://www.google.com/maps/dir/?api=1&destination=${selectedOrder.latitude},${selectedOrder.longitude}`,
                    '_blank'
                  )
                }
                className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <Navigation className="h-4 w-4" />
                Yol Tarifi
              </button>
              <a
                href={`tel:${selectedOrder.client_contact}`}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <Phone className="h-4 w-4" />
                Ara
              </a>
            </div>

            {selectedOrder.ad_image_url && (
              <div className="mb-4">
                <p className="mb-1 text-xs font-medium text-slate-600">Reklam Görseli</p>
                <img
                  src={buildBackendUrl(selectedOrder.ad_image_url)}
                  alt="Reklam"
                  className="h-44 w-full rounded-md border border-slate-200 object-cover"
                />
              </div>
            )}

            <div className="mb-4">
              <p className="mb-1 text-xs font-medium text-slate-600">{proofTitle}</p>
              {!hasProof ? (
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-600 hover:bg-slate-50">
                  {uploadLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Camera className="h-5 w-5" />
                  )}
                  Fotoğraf Yükle
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(event) => handleFileUpload(event, selectedOrder)}
                    disabled={uploadLoading}
                  />
                </label>
              ) : (
                <img
                  src={buildBackendUrl(proofUrl)}
                  alt="Kanıt"
                  className="h-44 w-full rounded-md border border-slate-200 object-cover"
                />
              )}
            </div>

            <button
              type="button"
              onClick={() => openCompleteConfirm(selectedOrder)}
              disabled={!hasProof || statusMutation.isPending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              {completeLabel}
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        {...confirmConfig}
        onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
      />
    </div>
  )
}

export default FieldTasksPage
