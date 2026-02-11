
import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { poleApi } from '../api/poleApi'
import { orderApi } from '../api/orderApi'
import MapView from '../components/MapView'
import ConfirmModal from '../components/ConfirmModal'
import { 
  MapPin, 
  Plus, 
  Trash2, 
  Search, 
  ChevronLeft,
  X, 
  Loader2,
  Navigation,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowUpRight
} from 'lucide-react'
import BulkOperationsModal from '../components/BulkOperationsModal'
import CreateOrderModal from '../components/CreateOrderModal'
import OrderDetailsModal from '../components/OrderDetailsModal'

function PolesPage() {
  const [selectedPoleId, setSelectedPoleId] = useState(null)
  const [selectedPoleIds, setSelectedPoleIds] = useState([]) // For multi-select
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false) // Toggle mode

  const [isCreating, setIsCreating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [viewMode, setViewMode] = useState('list') // 'list' or 'detail' or 'form'
  
  // Filters
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Modals
  const [bulkStatus, setBulkStatus] = useState('')
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false)
  
  const queryClient = useQueryClient()
  const { data: polesData, isLoading } = useQuery({ queryKey: ['poles'], queryFn: () => poleApi.getAll() })
  const poles = polesData?.data?.data?.poles || []
  
  const [searchParams] = useSearchParams()

  // Effect to handle navigation from other pages (clicking a pole code)
  useEffect(() => {
    const poleCodeParam = searchParams.get('poleCode')
    if (poleCodeParam && poles.length > 0) {
       const targetPole = poles.find(p => p.pole_code === poleCodeParam)
       if (targetPole) {
          setSelectedPoleId(targetPole.id)
          setViewMode('detail')
       }
    }
  }, [searchParams, poles])

  // Derived state: activePole
  // Always derive the selected pole from the fresh list of poles
  const selectedPole = poles.find(p => p.id === selectedPoleId) || null


  const fallbackOrder = selectedPole?.active_order_id ? {
      id: selectedPole.active_order_id,
      status: selectedPole.order_status || 'PENDING',
      client_name: selectedPole.client_name,
      start_date: selectedPole.start_date,
      end_date: selectedPole.end_date,
      contract_file_url: selectedPole.contract_file_url,
      ad_image_url: selectedPole.ad_image_url,
      pole_code: selectedPole.pole_code, // Add context
      district: selectedPole.district
  } : null;

  // Need to fetch order details when managing
  const { data: orderDetailsData, refetch: refetchOrderDetails, isLoading: isOrderLoading } = useQuery({
     queryKey: ['activeOrder', selectedPole?.active_order_id],
     queryFn: () => orderApi.getById(selectedPole.active_order_id),
     enabled: !!selectedPole?.active_order_id
  })
  
  // Confirm Modal
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, onConfirm: () => {}, title: '', message: '' })

  const [newPole, setNewPole] = useState({
    latitude: '',
    longitude: '',
    city: 'Tokat',
    district: '',
    neighborhood: '',
    street: '',
    sequenceNo: 1,
  })

  // Edit State
  const [editFormData, setEditFormData] = useState(null)

  // Filter Logic
  const filteredPoles = poles.filter((pole) => {
    const matchesSearch = searchText === '' || 
      pole.pole_code.toLowerCase().includes(searchText.toLowerCase()) || 
      pole.district.toLowerCase().includes(searchText.toLowerCase())
    const matchesStatus = statusFilter === '' || pole.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Mutations
  const createOrderMutation = useMutation({
    mutationFn: orderApi.createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poles'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      setShowOrderModal(false)
      alert('Reklam siparişi oluşturuldu.')
      // No need to manually update selectedPole, it will auto-update because it's derived from poles
    },
    onError: (e) => alert(e.message)
  })

  const createMutation = useMutation({
    mutationFn: poleApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poles'] })
      setIsCreating(false); setViewMode('list');
      alert('Direk oluşturuldu.'); 
    },
    onError: (e) => alert(e.message)
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => poleApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poles'] })
      setIsEditing(false); setViewMode('detail');
    },
    onError: (e) => alert(e.message)
  }) 

  const deleteMutation = useMutation({
    mutationFn: poleApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poles'] })
      setSelectedPoleId(null); setViewMode('list');
    }
  })

  const bulkUpdateMutation = useMutation({
    mutationFn: (status) => {
       const ids = filteredPoles.map(p => p.id)
       return poleApi.bulkUpdate(ids, status)
    },
    onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['poles'] })
       setShowBulkModal(false)
    }
  })

  const updateOrderStatusMutation = useMutation({
    mutationFn: ({ id, newStatus }) => orderApi.updateStatus(id, { newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poles'] })
      queryClient.invalidateQueries({ queryKey: ['activeOrder'] })
      if (refetchOrderDetails) refetchOrderDetails()
    },
  })

  // Handlers
  const handleMapClick = (latlng) => {
    if (isCreating) {
      setNewPole(prev => ({ ...prev, latitude: latlng.lat.toFixed(6), longitude: latlng.lng.toFixed(6) }))
    } else if (isEditing) {
      setEditFormData(prev => ({ ...prev, latitude: latlng.lat.toFixed(6), longitude: latlng.lng.toFixed(6) }))
    }
  }

  const startCreating = () => {
    setIsCreating(true)
    setViewMode('form')
    setSelectedPoleId(null)
    setNewPole({ ...newPole, latitude: '', longitude: '' })
  }

  const selectPole = (pole) => {
    if (isMultiSelectMode) {
       // Toggle selection
       setSelectedPoleIds(prev => {
         if (prev.includes(pole.id)) return prev.filter(id => id !== pole.id)
         return [...prev, pole.id]
       })
    } else {
       setSelectedPoleId(pole.id)
       setViewMode('detail')
       setIsCreating(false)
       setIsEditing(false)
    }
  }

  const toggleMultiSelect = () => {
     setIsMultiSelectMode(!isMultiSelectMode)
     setSelectedPoleIds([]) // Clear selection when toggling
     setSelectedPoleId(null)
     setViewMode('list')
  }


  const handleBulkOrder = () => {
     if (selectedPoleIds.length === 0) return
     
     // Check if any status is occupied
     const hasOccupied = selectedPoleIds.some(id => poles.find(p => p.id === id)?.status === 'OCCUPIED')
     if (hasOccupied) {
        alert('Seçilen direkler arasında DOLU olanlar var. Lütfen sadece MÜSAİT olanları seçin.')
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


  return (
    // FULL SCREEN MAP LAYOUT
    <div className="relative h-full w-full overflow-hidden bg-slate-100 font-sans">
      
      {/* 1. BACKGROUND MAP (Full Coverage) */}
      <div className="absolute inset-0 z-0">
          <MapView 
             poles={filteredPoles} 
             onPoleClick={selectPole}
             onMapClick={(isCreating || isEditing) ? handleMapClick : null}
             selectedPoleId={selectedPoleId}
             selectedPoleIds={selectedPoleIds} 
          />
      </div>

      {/* 2. FLOATING SIDEBAR (Glass Panel) */}
      <div className="absolute left-6 top-6 bottom-6 w-[380px] z-10 flex flex-col gap-4 pointer-events-none">
          
          {/* HEADER & FILTERS */}
          <div className="glass-panel p-5 rounded-[32px] bg-white/90 backdrop-blur-xl shadow-2xl border border-white/40 pointer-events-auto">
             <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase flex items-center gap-2">
                   <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200"><Layers className="w-5 h-5" /></div>
                   Direkler
                </h1>
                <div className="flex items-center gap-2">
                   <button onClick={toggleMultiSelect} className={`p-2 rounded-xl transition-all ${isMultiSelectMode ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
                      <CheckCircle2 className="w-5 h-5" />
                   </button>
                   <button onClick={startCreating} className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"><Plus className="w-5 h-5" /></button>
                </div>
             </div>

             {/* Search Bar */}
             {viewMode === 'list' && (
                <div className="space-y-3">
                   <div className="relative group">
                      <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                      <input 
                        type="text" 
                        placeholder="Direk kodu veya bölge ara..." 
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:border-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-400"
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                      />
                   </div>
                   <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                      {['Tümü', 'Müsait', 'Dolu'].map((status) => (
                         <button 
                            key={status} 
                            onClick={() => setStatusFilter(status === 'Tümü' ? '' : (status === 'Müsait' ? 'AVAILABLE' : 'OCCUPIED'))}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wide whitespace-nowrap transition-all border
                               ${(statusFilter === '' && status === 'Tümü') || (statusFilter === 'AVAILABLE' && status === 'Müsait') || (statusFilter === 'OCCUPIED' && status === 'Dolu') 
                                  ? 'bg-slate-800 text-white border-slate-800 shadow-lg shadow-slate-200' 
                                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                               }
                            `}
                         >
                            {status}
                         </button>
                      ))}
                   </div>
                </div>
             )}
          </div>

          {/* LIST / DETAIL CONTENT */}
          <div className="flex-1 glass-panel rounded-[32px] bg-white/80 backdrop-blur-xl shadow-2xl border border-white/40 overflow-hidden pointer-events-auto relative flex flex-col min-h-0">
             
             {/* Loading Overlay */}
             {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-50">
                   <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                </div>
             )}

             <div className="flex-1 overflow-y-auto p-4 scrollbar-thin space-y-3">
                {viewMode === 'list' ? (
                   filteredPoles.length > 0 ? (
                      filteredPoles.map(pole => (
                         <div 
                            key={pole.id}
                            onClick={() => selectPole(pole)}
                            className={`p-4 rounded-[24px] border-2 cursor-pointer transition-all group relative overflow-hidden
                               ${selectedPoleIds.includes(pole.id) 
                                  ? 'bg-indigo-50 border-indigo-500 shadow-xl' 
                                  : 'bg-white border-transparent hover:border-indigo-100 hover:shadow-lg'
                               }
                            `}
                         >
                            <div className="flex justify-between items-start relative z-10">
                               <div className="flex items-center gap-4">
                                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0 ${pole.status === 'AVAILABLE' ? 'bg-emerald-500 shadow-emerald-200' : 'bg-rose-500 shadow-rose-200'}`}>
                                     <MapPin className="w-6 h-6" />
                                  </div>
                                  <div>
                                     <h3 className="text-lg font-black text-slate-800 leading-none mb-1 group-hover:text-indigo-600 transition-colors">{pole.pole_code}</h3>
                                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{pole.district}</p>
                                  </div>
                               </div>
                               <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide ${pole.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                  {pole.status === 'AVAILABLE' ? 'Müsait' : 'Dolu'}
                               </div>
                            </div>
                            {/* Decorative Pattern */}
                            <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-slate-50 rounded-full z-0 group-hover:scale-150 transition-transform duration-500" />
                         </div>
                      ))
                   ) : (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400 py-10">
                         <Search className="w-12 h-12 mb-4 opacity-20" />
                         <p className="font-bold">Sonuç bulunamadı</p>
                      </div>
                   )
                ) : viewMode === 'detail' && selectedPole ? (
                   // ... Detail View (Keep mostly same but style up) ...
                   <div className="space-y-6 animate-in slide-in-from-right-10 duration-300">
                      
                      {/* Nav Back */}
                      <button onClick={backToList} className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase hover:text-slate-800 transition-colors">
                         <div className="p-1 rounded-full bg-slate-100"><ChevronLeft className="w-4 h-4" /></div> Listeye Dön
                      </button>

                      {/* Cover Image / Status Header */}
                      <div className="relative h-32 bg-slate-100 rounded-[24px] overflow-hidden flex items-center justify-center group">
                         {selectedPole.status === 'AVAILABLE' ? (
                            <div className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center">
                               <CheckCircle2 className="w-12 h-12 text-emerald-500 opacity-50" />
                            </div>
                         ) : (
                            <div className="absolute inset-0 bg-rose-500/10 flex items-center justify-center">
                               <MapPin className="w-12 h-12 text-rose-500 opacity-50" />
                            </div>
                         )}
                         <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur px-4 py-2 rounded-xl border border-white/50 shadow-sm">
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">{selectedPole.pole_code}</h2>
                         </div>
                      </div>

                      {/* Info Grid */}
                      <div className="grid grid-cols-2 gap-3">
                         <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <p className="text-[10px] uppercase font-black text-slate-400 mb-1">Bölge</p>
                            <p className="font-bold text-slate-800">{selectedPole.district}</p>
                         </div>
                         <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <p className="text-[10px] uppercase font-black text-slate-400 mb-1">Koordinat</p>
                            <p className="font-bold text-slate-800 text-xs font-mono">{selectedPole.latitude}, {selectedPole.longitude}</p>
                         </div>
                      </div>

                      {/* Order Action Card */}
                       {selectedPole.active_order_id ? (
                          <div className="bg-slate-900 text-white p-6 rounded-[28px] relative overflow-hidden group hover:shadow-2xl hover:shadow-indigo-500/30 transition-all">
                             <div className="relative z-10 space-y-4">
                                <div>
                                   <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"/> Yayında</p>
                                   <h3 className="text-xl font-black">{selectedPole.client_name}</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                   <button onClick={() => setShowOrderDetailsModal(true)} className="py-3 bg-indigo-600 rounded-xl text-[10px] font-black uppercase hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-900/50">Yönet</button>
                                   <button onClick={() => setShowOrderModal(true)} className="py-3 bg-white/10 rounded-xl text-[10px] font-black uppercase hover:bg-white/20 transition-colors text-indigo-200">Sıradaki</button>
                                </div>
                             </div>
                             {/* Background Glow */}
                             <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500/20 blur-3xl rounded-full pointer-events-none" />
                          </div>
                       ) : (
                          <button 
                            onClick={() => setShowOrderModal(true)} 
                            className="w-full py-6 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-[28px] font-black text-sm uppercase shadow-xl hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 group"
                          >
                             <div className="p-1 bg-white/20 rounded-full"><Plus className="w-4 h-4" /></div> Reklam Başlat
                          </button>
                       )}

                       {/* Edit/Delete Actions */}
                       <div className="flex gap-2 pt-4 border-t border-slate-100">
                          <button onClick={() => { setEditFormData({...selectedPole}); setViewMode('form'); setIsEditing(true); }} className="flex-1 py-3 bg-white border-2 border-slate-100 rounded-xl text-[10px] font-black text-slate-600 uppercase hover:bg-slate-50 hover:border-slate-200 transition-all">Düzenle</button>
                          <button 
                            onClick={() => setConfirmConfig({ isOpen: true, title: 'Sil', message: 'Bu direği silmek istediğinize emin misiniz?', onConfirm: () => deleteMutation.mutate(selectedPole.id) })} 
                            className="w-12 h-12 flex items-center justify-center bg-rose-50 text-rose-500 border border-rose-100 rounded-xl hover:bg-rose-100 hover:shadow-lg hover:shadow-rose-100 transition-all"
                          >
                             <Trash2 className="w-5 h-5" />
                          </button>
                       </div>

                   </div>
                ) : (
                   // FORM VIEW (Create/Edit) - Simplified for brevity in this massive replace
                   <div className="space-y-6 animate-in slide-in-from-bottom-10">
                      <div className="flex items-center gap-2 mb-2">
                         <button onClick={() => isEditing ? setViewMode('detail') : backToList()} className="p-2 hover:bg-slate-100 rounded-lg"><ChevronLeft className="w-5 h-5 text-slate-600" /></button>
                         <h3 className="font-black text-lg text-slate-900">{isEditing ? 'Direği Düzenle' : 'Yeni Direk Ekle'}</h3>
                      </div>
                      
                      <div className={`p-6 rounded-3xl border-2 border-dashed text-center cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${((isEditing ? editFormData.latitude : newPole.latitude)) ? 'border-emerald-400 bg-emerald-50' : 'border-indigo-300 bg-indigo-50/50'}`}>
                         <MapPin className={`w-8 h-8 mx-auto mb-2 ${((isEditing ? editFormData.latitude : newPole.latitude)) ? 'text-emerald-500' : 'text-indigo-400 animate-bounce'}`} />
                         <p className="text-xs font-black uppercase text-slate-600">{((isEditing ? editFormData.latitude : newPole.latitude)) ? 'Konum Başarıyla Seçildi' : 'Haritadan Konum Seç'}</p>
                         {((isEditing ? editFormData.latitude : newPole.latitude)) && <p className="text-[10px] font-mono text-slate-400 mt-1">{(isEditing ? editFormData.latitude : newPole.latitude)}, {(isEditing ? editFormData.longitude : newPole.longitude)}</p>}
                      </div>

                      <div className="space-y-4">
                         {/* Inputs... reusing logic but better styling */}
                         <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">İlçe / Bölge</label>
                            <input type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-black transition-all" value={(isEditing ? editFormData.district : newPole.district) || ''} onChange={e => isEditing ? setEditFormData({...editFormData, district: e.target.value}) : setNewPole({...newPole, district: e.target.value})} />
                         </div>
                         <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Cadde / Sokak</label>
                            <input type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-black transition-all" value={(isEditing ? editFormData.street : newPole.street) || ''} onChange={e => isEditing ? setEditFormData({...editFormData, street: e.target.value}) : setNewPole({...newPole, street: e.target.value})} />
                         </div>
                         <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Sıra No</label>
                            <input type="number" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-black transition-all" value={(isEditing ? editFormData.sequenceNo : newPole.sequenceNo) || ''} onChange={e => isEditing ? setEditFormData({...editFormData, sequenceNo: e.target.value}) : setNewPole({...newPole, sequenceNo: e.target.value})} />
                         </div>
                      </div>

                      <button 
                         onClick={() => isEditing ? updateMutation.mutate({id: editFormData.id, data: editFormData}) : createMutation.mutate(newPole)}
                         disabled={isEditing ? !editFormData.latitude : !newPole.latitude}
                         className="w-full py-4 bg-black text-white rounded-2xl text-xs font-black uppercase hover:bg-slate-800 disabled:opacity-50 shadow-xl transition-all"
                      >
                         {isEditing ? 'Değişiklikleri Kaydet' : 'Direği Oluştur'}
                      </button>
                   </div>
                )}
             </div>

             {/* Footer Actions (Bulk) */}
             {isMultiSelectMode && selectedPoleIds.length > 0 && viewMode === 'list' && (
                <div className="p-4 bg-slate-50 border-t border-slate-200 pointer-events-auto">
                   <button 
                      onClick={handleBulkOrder}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                   >
                      <Layers className="w-4 h-4" /> ({selectedPoleIds.length}) Reklam Oluştur
                   </button>
                </div>
             )}
          </div>
      </div>

      {/* Modals are unaffected by layout */}
      <BulkOperationsModal 
         isOpen={showBulkModal} 
         onClose={() => setShowBulkModal(false)}
         filteredPoles={filteredPoles}
         bulkStatus={bulkStatus}
         setBulkStatus={setBulkStatus}
         onUpdate={() => setConfirmConfig({
            isOpen: true, title: 'Toplu Güncelleme', message: 'Onaylıyor musunuz?', onConfirm: () => bulkUpdateMutation.mutate(bulkStatus)
         })}
      />
      <CreateOrderModal 
         isOpen={showOrderModal} 
         onClose={() => setShowOrderModal(false)} 
         poles={selectedPoleIds.length > 0 ? filteredPoles.filter(p => selectedPoleIds.includes(p.id)) : (selectedPoleId ? [filteredPoles.find(p => p.id === selectedPoleId)].filter(Boolean) : [])} 
         onCreate={(data) => {
            createOrderMutation.mutate(data, {
               onError: (error) => {
                  alert(error.response?.data?.error || 'Sipariş oluşturulurken bir hata oluştu.')
               }
            })
         }}
         isPending={createOrderMutation.isPending}
      />

      <OrderDetailsModal 
         isOpen={showOrderDetailsModal} 
         onClose={() => setShowOrderDetailsModal(false)} 
         // Use fallback if real data isn't ready
         order={orderDetailsData?.data?.data?.order || fallbackOrder} 
         onUpdateStatus={(orderId, newStatus) => {
            updateOrderStatusMutation.mutate({ id: orderId, newStatus })
         }}
         isUpdating={updateOrderStatusMutation.isPending}
      />
      <ConfirmModal {...confirmConfig} onClose={() => setConfirmConfig({...confirmConfig, isOpen: false})} />

    </div>
  )
}

export default PolesPage
