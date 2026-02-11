import { useEffect, useMemo, useState } from 'react'
import { X, CheckCircle, Clock, AlertTriangle, Play, Settings, Upload, FileText, Image as ImageIcon } from 'lucide-react'
import { orderApi } from '../api/orderApi'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { buildBackendUrl } from '../utils/url'
import { userApi } from '../api/userApi'
import { useAuthStore } from '../stores/authStore'

const STATUS_CONFIG = {
  PENDING: { color: 'bg-gray-100 text-gray-800', label: 'Beklemede', icon: Clock },
  PRINTING: { color: 'bg-blue-100 text-blue-800', label: 'Baskıda', icon: Settings },
  AWAITING_MOUNT: { color: 'bg-yellow-100 text-yellow-800', label: 'Asılmayı Bekliyor', icon: AlertTriangle },
  LIVE: { color: 'bg-green-100 text-green-800', label: 'Yayında', icon: Play },
  EXPIRED: { color: 'bg-red-100 text-red-800', label: 'Süresi Doldu', icon: Clock },
  COMPLETED: { color: 'bg-gray-200 text-gray-600', label: 'Tamamlandı', icon: CheckCircle },
  CANCELLED: { color: 'bg-red-200 text-red-900', label: 'İptal Edildi', icon: X },
}

const NEXT_ACTIONS = {
  PENDING: { next: 'PRINTING', label: 'Baskıya Gönder', role: 'OPERATOR' },
  PRINTING: { next: 'AWAITING_MOUNT', label: 'Baskı Tamamlandı', role: 'PRINTER' },
  AWAITING_MOUNT: { next: 'LIVE', label: 'Asma Tamamlandı (Yayına Al)', role: 'FIELD' },
  LIVE: { next: 'EXPIRED', label: 'Süreyi Bitir', role: 'SYSTEM' }, 
  EXPIRED: { next: 'COMPLETED', label: 'Sökme Tamamlandı', role: 'FIELD' },
}

function OrderDetailsModal({ isOpen, onClose, order, onUpdateStatus, isUpdating }) {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const [selectedPrinter, setSelectedPrinter] = useState('')
  const [selectedField, setSelectedField] = useState('')
  const canManageAssignments = ['SUPER_ADMIN', 'OPERATOR'].includes(user?.role)

  useEffect(() => {
    if (!order) return
    setSelectedPrinter(order.assigned_printer || '')
    setSelectedField(order.assigned_field || '')
  }, [order?.id, order?.assigned_printer, order?.assigned_field])

  const statusConfig = STATUS_CONFIG[order?.status] || STATUS_CONFIG.PENDING
  const StatusIcon = statusConfig.icon

  const nextAction = NEXT_ACTIONS[order?.status]

  const { data: printersData } = useQuery({
    queryKey: ['printers'],
    queryFn: userApi.getPrinters,
    enabled: isOpen && !!order?.id && canManageAssignments,
  })
  const { data: fieldTeamsData } = useQuery({
    queryKey: ['field-teams'],
    queryFn: userApi.getFieldTeams,
    enabled: isOpen && !!order?.id && canManageAssignments,
  })

  const printers = printersData?.data?.data?.printers || []
  const fieldTeams = fieldTeamsData?.data?.data?.fieldTeams || []

  const assignPrinterMutation = useMutation({
    mutationFn: (printerId) => orderApi.assignPrinter(order.id, printerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['activeOrder'] })
      queryClient.invalidateQueries({ queryKey: ['print-tasks'] })
      alert('Baskı sorumlusu atandı')
    },
    onError: (err) => alert(err?.response?.data?.error || 'Atama başarısız'),
  })

  const assignFieldMutation = useMutation({
    mutationFn: (fieldId) => orderApi.assignField(order.id, fieldId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['activeOrder'] })
      queryClient.invalidateQueries({ queryKey: ['field-tasks'] })
      alert('Saha ekibi atandı')
    },
    onError: (err) => alert(err?.response?.data?.error || 'Atama başarısız'),
  })

  const actionAccess = useMemo(() => {
    if (!order) {
      return { allowed: false, reason: '' }
    }

    if (!nextAction) {
      return { allowed: false, reason: 'Son aşama' }
    }

    if (user?.role === 'SUPER_ADMIN') {
      return { allowed: true, reason: '' }
    }

    const allowedByStatus = {
      PENDING: ['OPERATOR'],
      PRINTING: ['OPERATOR', 'PRINTER'],
      AWAITING_MOUNT: ['OPERATOR', 'FIELD'],
      LIVE: [],
      EXPIRED: ['OPERATOR', 'FIELD'],
    }

    const permittedRoles = allowedByStatus[order.status] || []
    if (!permittedRoles.includes(user?.role)) {
      return { allowed: false, reason: 'Bu aksiyon için yetkiniz yok' }
    }

    if (order.status === 'PENDING' && !order.assigned_printer) {
      return { allowed: false, reason: 'Önce baskı sorumlusu atanmalı' }
    }
    if (order.status === 'PRINTING' && !order.assigned_field) {
      return { allowed: false, reason: 'Önce saha ekibi atanmalı' }
    }
    if (order.status === 'AWAITING_MOUNT' && !order.has_mount_proof) {
      return { allowed: false, reason: 'Montaj kanıtı yüklenmeli' }
    }
    if (order.status === 'EXPIRED' && !order.has_dismount_proof) {
      return { allowed: false, reason: 'Söküm kanıtı yüklenmeli' }
    }

    return { allowed: true, reason: '' }
  }, [nextAction, order?.status, order?.assigned_printer, order?.assigned_field, order?.has_mount_proof, order?.has_dismount_proof, user?.role])

  if (!isOpen || !order) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
       <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg relative" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">Reklam Detayları</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Banner */}
        <div className={`flex items-center gap-3 p-4 rounded-lg mb-6 ${statusConfig.color}`}>
          <StatusIcon className="w-6 h-6" />
          <div>
            <p className="text-xs font-bold uppercase opacity-75">Mevcut Durum</p>
            <p className="text-lg font-bold">{statusConfig.label}</p>
          </div>
        </div>

        {/* Order Info Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <p className="text-gray-500 mb-1">Müşteri</p>
            <p className="font-medium text-gray-900">{order.client_name}</p>
          </div>
          <div>
            <p className="text-gray-500 mb-1">İletişim</p>
            <p className="font-medium text-gray-900">{order.client_contact || '-'}</p>
          </div>
          <div>
            <p className="text-gray-500 mb-1">Başlangıç Tarihi</p>
            <p className="font-medium text-gray-900">
              {new Date(order.start_date).toLocaleDateString('tr-TR')}
            </p>
          </div>
          <div>
            <p className="text-gray-500 mb-1">Bitiş Tarihi</p>
            <p className="font-medium text-gray-900">
              {new Date(order.end_date).toLocaleDateString('tr-TR')}
            </p>
          </div>
        </div>

        {/* Assignment Section */}
        {canManageAssignments && (
          <div className="mb-6 border-t pt-4">
            <h4 className="text-sm font-bold text-gray-900 mb-3">Atamalar</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="border rounded-lg p-3 bg-gray-50">
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Baskı Sorumlusu</p>
                <select
                  value={selectedPrinter}
                  onChange={(e) => setSelectedPrinter(e.target.value)}
                  className="w-full px-2 py-2 text-xs font-medium border rounded-md bg-white mb-2"
                >
                  <option value="">Seçiniz</option>
                  {printers.map((printer) => (
                    <option key={printer.id} value={printer.id}>
                      {printer.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!selectedPrinter || assignPrinterMutation.isPending}
                  onClick={() => assignPrinterMutation.mutate(selectedPrinter)}
                  className="w-full px-2 py-2 text-xs font-bold bg-indigo-600 text-white rounded-md disabled:opacity-50"
                >
                  {assignPrinterMutation.isPending ? 'Atanıyor...' : 'Baskıcı Ata'}
                </button>
              </div>

              <div className="border rounded-lg p-3 bg-gray-50">
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Saha Ekibi</p>
                <select
                  value={selectedField}
                  onChange={(e) => setSelectedField(e.target.value)}
                  className="w-full px-2 py-2 text-xs font-medium border rounded-md bg-white mb-2"
                >
                  <option value="">Seçiniz</option>
                  {fieldTeams.map((fieldUser) => (
                    <option key={fieldUser.id} value={fieldUser.id}>
                      {fieldUser.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!selectedField || assignFieldMutation.isPending}
                  onClick={() => assignFieldMutation.mutate(selectedField)}
                  className="w-full px-2 py-2 text-xs font-bold bg-indigo-600 text-white rounded-md disabled:opacity-50"
                >
                  {assignFieldMutation.isPending ? 'Atanıyor...' : 'Saha Ekibi Ata'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* File Management Section */}
        <div className="mb-6 border-t pt-4">
          <h4 className="text-sm font-bold text-gray-900 mb-3">Dosyalar ve Sözleşmeler</h4>
          <div className="grid grid-cols-2 gap-4">
            
            {/* Contract Upload */}
            <div className="border rounded-lg p-3 bg-gray-50">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium">Sözleşme (PDF)</span>
              </div>
              {order.contract_file_url ? (
                <div className="text-xs">
                  <a 
                    href={buildBackendUrl(order.contract_file_url)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:align-top hover:underline break-all"
                  >
                    Sözleşmeyi Görüntüle
                  </a>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <div className="flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded hover:bg-white transition-colors text-xs text-gray-600">
                    <Upload className="w-3 h-3" />
                    <span>PDF Yükle</span>
                  </div>
                  <input 
                    type="file" 
                    accept="application/pdf"
                    capture="environment"
                    className="hidden" 
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if(!file) return;
                      try {
                        const formData = new FormData();
                        formData.append('contract', file);

                        await orderApi.uploadFile(order.id, 'contract', formData);
                        queryClient.invalidateQueries({ queryKey: ['activeOrder'] });
                        queryClient.invalidateQueries({ queryKey: ['poles'] }); // Update pole list if needed
                        // Ideally use toast here
                        // if(onClose) onClose(); // Don't close, let them see the result
                      } catch(err) {
                        alert('Yükleme başarısız');
                      }
                    }}
                  />
                </label>
              )}
            </div>

            {/* Image Upload */}
            <div className="border rounded-lg p-3 bg-gray-50">
              <div className="flex items-center gap-2 mb-2">
                <ImageIcon className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium">Reklam Görseli</span>
              </div>
              {order.ad_image_url ? (
                <div className="text-xs">
                   <a 
                    href={buildBackendUrl(order.ad_image_url)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline break-all"
                  >
                    Görseli Görüntüle
                  </a>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <div className="flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded hover:bg-white transition-colors text-xs text-gray-600">
                    <Upload className="w-3 h-3" />
                    <span>Görsel Yükle</span>
                  </div>
                  <input 
                    type="file" 
                    accept="image/*"
                    capture="environment"
                    className="hidden" 
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if(!file) return;
                      try {
                        const formData = new FormData();
                        formData.append('image', file);

                        await orderApi.uploadFile(order.id, 'image', formData);
                        queryClient.invalidateQueries({ queryKey: ['activeOrder'] });
                        queryClient.invalidateQueries({ queryKey: ['poles'] });
                        // Ideally use toast here
                      } catch(err) {
                        alert('Yükleme başarısız');
                      }
                    }}
                  />
                </label>
              )}
            </div>

          </div>
        </div>


        {/* Actions */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
             <h4 className="text-sm font-bold text-gray-900">İş Akışı İşlemleri</h4>
             <button title="Sipariş Formunu İndir" onClick={() => orderApi.downloadPdf(order.id)} className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded">
                <FileText className="w-3 h-3" /> PDF İndir
             </button>
          </div>
          
          <div className="flex gap-3">
            {nextAction ? (
              <button
                onClick={() => onUpdateStatus(order.id, nextAction.next)}
                disabled={isUpdating || !actionAccess.allowed}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
              >
                {isUpdating ? 'Güncelleniyor...' : nextAction.label}
                <Play className="w-4 h-4 ml-1 fill-current" />
              </button>
            ) : (
              <div className="flex-1 px-4 py-2 bg-gray-100 text-gray-500 rounded-lg text-center font-medium">
                İşlem mevcut değil (Son Aşama)
              </div>
            )}
            
            {(order.status === 'PENDING' || order.status === 'PRINTING' || order.status === 'AWAITING_MOUNT') && (
               <button
                 onClick={() => {
                   if(confirm('Bu reklamı iptal etmek istediğinize emin misiniz? Direk tekrar boşa çıkacak.')) {
                     onUpdateStatus(order.id, 'CANCELLED')
                   }
                 }}
                 disabled={isUpdating}
                 className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 font-medium"
               >
                 Reklamı İptal Et
               </button>
            )}
          </div>
          {nextAction && !actionAccess.allowed && (
            <p className="mt-2 text-xs text-amber-600 font-semibold">{actionAccess.reason}</p>
          )}
        </div>

      </div>
    </div>
  )
}

export default OrderDetailsModal
