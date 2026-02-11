import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Clock, Loader2, Play, Printer } from 'lucide-react'
import { orderApi } from '../api/orderApi'
import ConfirmModal from '../components/ConfirmModal'
import { buildBackendUrl } from '../utils/url'
import { useAuthStore } from '../stores/authStore'

function PrintTasksPage() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    onConfirm: () => {},
    title: '',
    message: '',
  })

  const { data: ordersData = [], isLoading } = useQuery({
    queryKey: ['print-tasks', user?.role],
    queryFn: async () => {
      if (user?.role === 'PRINTER') {
        const myTasks = await orderApi.getMyTasks()
        const assignedOrders = myTasks?.data?.data?.orders || []
        return assignedOrders.filter((order) => ['PENDING', 'PRINTING'].includes(order.status))
      }

      const [pending, printing] = await Promise.all([
        orderApi.getOrders({ status: 'PENDING' }),
        orderApi.getOrders({ status: 'PRINTING' }),
      ])
      return [...(pending?.data?.data?.orders || []), ...(printing?.data?.data?.orders || [])]
    },
    enabled: Boolean(user),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, newStatus }) => orderApi.updateStatus(id, { newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['print-tasks'] })
    },
  })

  const pendingOrders = ordersData.filter((order) => order.status === 'PENDING')
  const printingOrders = ordersData.filter((order) => order.status === 'PRINTING')

  const openStatusConfirm = (orderId, newStatus) => {
    const isStarting = newStatus === 'PRINTING'
    setConfirmConfig({
      isOpen: true,
      title: isStarting ? 'Baskıyı Başlat' : 'Baskıyı Tamamla',
      message: isStarting
        ? 'Bu iş emri için baskı sürecini başlatmak istiyor musunuz?'
        : 'Baskının tamamlandığını onaylıyor musunuz?',
      onConfirm: () => statusMutation.mutate({ id: orderId, newStatus }),
    })
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="glass-panel rounded-lg p-4">
        <h1 className="text-xl font-semibold text-slate-900">Baskı İşleri</h1>
        <p className="mt-1 text-sm text-slate-600">Sadece baskı sürecindeki işleri takip edin ve güncelleyin.</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-700">Bekleyen: {pendingOrders.length}</span>
          <span className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-700">Baskıda: {printingOrders.length}</span>
        </div>
      </div>

      {isLoading ? (
        <div className="glass-panel rounded-lg p-10 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="glass-panel rounded-lg p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Clock className="h-4 w-4" />
                Bekleyen İşler
              </h2>
              <span className="text-xs text-slate-500">{pendingOrders.length} kayıt</span>
            </div>

            <div className="space-y-3">
              {pendingOrders.length === 0 && (
                <p className="rounded-md border border-dashed border-slate-300 p-3 text-center text-sm text-slate-500">
                  Bekleyen baskı işi yok.
                </p>
              )}

              {pendingOrders.map((order) => (
                <div key={order.id} className="rounded-md border border-slate-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{order.client_name}</p>
                      <p className="text-xs text-slate-500">Direk: {order.pole_code}</p>
                    </div>
                    {order.ad_image_url && (
                      <img
                        src={buildBackendUrl(order.ad_image_url)}
                        alt="Reklam görseli"
                        className="h-12 w-12 rounded-md border border-slate-200 object-cover"
                      />
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => openStatusConfirm(order.id, 'PRINTING')}
                    className="mt-3 inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
                  >
                    <Play className="h-4 w-4" />
                    Baskıyı Başlat
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="glass-panel rounded-lg p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Printer className="h-4 w-4" />
                Baskıda Olanlar
              </h2>
              <span className="text-xs text-slate-500">{printingOrders.length} kayıt</span>
            </div>

            <div className="space-y-3">
              {printingOrders.length === 0 && (
                <p className="rounded-md border border-dashed border-slate-300 p-3 text-center text-sm text-slate-500">
                  Aktif baskı işi yok.
                </p>
              )}

              {printingOrders.map((order) => (
                <div key={order.id} className="rounded-md border border-slate-200 bg-white p-3">
                  <p className="text-sm font-semibold text-slate-900">{order.client_name}</p>
                  <p className="text-xs text-slate-500">Direk: {order.pole_code}</p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (order.ad_image_url) {
                          window.open(buildBackendUrl(order.ad_image_url), '_blank')
                        }
                      }}
                      className="rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Görseli Aç
                    </button>

                    <button
                      type="button"
                      onClick={() => openStatusConfirm(order.id, 'AWAITING_MOUNT')}
                      className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Baskı Tamamlandı
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      <ConfirmModal
        {...confirmConfig}
        onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
      />
    </div>
  )
}

export default PrintTasksPage
