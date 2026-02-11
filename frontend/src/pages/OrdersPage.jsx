import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { 
  Package, 
  Search, 
  Loader2, 
  Filter, 
  ChevronRight, 
  Sparkles,
  ArrowUpDown,
  Calendar,
  MoreHorizontal
} from 'lucide-react'

import { orderApi } from '../api/orderApi'
import OrderDetailsModal from '../components/OrderDetailsModal'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import api from '../api/client'

const fetchOrders = async (status) => {
  const url = status 
      ? `/orders?status=${status}`
      : `/orders`
  const res = await api.get(url)
  return res.data.data.orders
}


function OrdersPage() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const queryClient = useQueryClient()


  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', filter],
    queryFn: () => fetchOrders(filter)
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => orderApi.updateStatus(id, { newStatus: status }),
    onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['orders'] })
       toast.success('Sipariş durumu güncellendi')
       setSelectedOrder(null)
    },
    onError: (error) => {
       toast.error(error.response?.data?.error || 'Güncelleme başarısız')
    }
  })

  const filteredOrders = orders.filter(order => 
    order.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.pole_code?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusStyles = (status) => {
    switch (status) {
      case 'COMPLETED': return 'bg-emerald-100 text-emerald-700'
      case 'LIVE': return 'bg-indigo-100 text-indigo-700'
      case 'PRINTING': return 'bg-purple-100 text-purple-700'
      case 'AWAITING_MOUNT': return 'bg-amber-100 text-amber-700'
      case 'PENDING': return 'bg-slate-100 text-slate-700'
      case 'EXPIRED': return 'bg-rose-100 text-rose-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'PENDING': return 'Beklemede'
      case 'PRINTING': return 'Baskıda'
      case 'AWAITING_MOUNT': return 'Montaj Bekliyor'
      case 'LIVE': return 'Yayında'
      case 'EXPIRED': return 'Süre Doldu'
      case 'COMPLETED': return 'Tamamlandı'
      default: return status
    }
  }

  return (
    <div className="flex flex-col h-full gap-4">
      
      {/* 1. COMPACT HEADER & FILTERS */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-1 shrink-0">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-xl">
                <Package className="w-5 h-5 text-indigo-600" />
             </div>
             <h1 className="text-lg font-black text-slate-800 tracking-tight uppercase">Reklam Yönetimi</h1>
             <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black uppercase text-slate-500">{filteredOrders.length} SİPARİŞ</span>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
             <div className="relative flex-1 md:w-80">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Müşteri veya Direk kodu ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                />
             </div>
             <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl">
               <Filter className="w-4 h-4 text-slate-400" />
               <select 
                 value={filter} 
                 onChange={(e) => setFilter(e.target.value)}
                 className="bg-transparent border-none outline-none text-[10px] font-black uppercase text-slate-600 cursor-pointer"
               >
                 <option value="">Tüm Durumlar</option>
                 <option value="PENDING">Beklemede</option>
                 <option value="PRINTING">Baskıda</option>
                 <option value="AWAITING_MOUNT">Montajda</option>
                 <option value="LIVE">Yayında</option>
                 <option value="COMPLETED">Tamamlandı</option>
               </select>
             </div>
          </div>
      </div>

      {/* 2. TABLE VIEW CONTAINER */}
      <div className="flex-1 bg-white border border-slate-200 rounded-[20px] overflow-hidden flex flex-col shadow-sm">
         
         {/* Table Header */}
         <div className="grid grid-cols-12 gap-4 p-4 border-b border-slate-100 bg-slate-50/50 text-[10px] font-black uppercase tracking-widest text-slate-400 select-none">
            <div className="col-span-3 flex items-center gap-2 cursor-pointer hover:text-indigo-600">Müşteri <ArrowUpDown className="w-3 h-3" /></div>
            <div className="col-span-2">Direk Kodu</div>
            <div className="col-span-2">Durum</div>
            <div className="col-span-2">Başlangıç</div>
            <div className="col-span-2">Bitiş</div>
            <div className="col-span-1 text-right">İşlem</div>
         </div>

         {/* Table Content */}
         <div className="flex-1 overflow-y-auto">
            {isLoading ? (
               <div className="flex items-center justify-center h-40 gap-3">
                  <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                  <p className="text-xs font-bold text-slate-400 uppercase">Yükleniyor...</p>
               </div>
            ) : filteredOrders.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
                  <Package className="w-12 h-12 opacity-20" />
                  <p className="text-sm font-bold uppercase">Sipariş Bulunamadı</p>
               </div>
            ) : (
               <div className="divide-y divide-slate-50">
                  {filteredOrders.map((order) => (
                     <div 
                        key={order.id}
                        onClick={() => setSelectedOrder(order)}
                        className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50 cursor-pointer group transition-colors"
                     >
                        <div className="col-span-3">
                           <p className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{order.client_name}</p>
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">ID: {order.id.slice(0, 8)}</p>
                        </div>
                        <div className="col-span-2">
                           <span 
                              onClick={(e) => {
                                 e.stopPropagation()
                                 navigate(`/poles?poleCode=${order.pole_code}`)
                              }}
                              className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg hover:bg-indigo-100 hover:text-indigo-600 cursor-pointer transition-colors"
                           >
                              {order.pole_code}
                           </span>
                        </div>
                        <div className="col-span-2">
                           <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide inline-flex items-center gap-1.5 ${getStatusStyles(order.status)}`}>
                             <div className="w-1.5 h-1.5 rounded-full bg-current" />
                             {getStatusLabel(order.status)}
                           </span>
                        </div>
                        <div className="col-span-2 flex items-center gap-2 text-xs font-bold text-slate-600">
                           <Calendar className="w-3.5 h-3.5 text-slate-300" />
                           {format(new Date(order.start_date), 'd MMM yyyy', { locale: tr })}
                        </div>
                        <div className="col-span-2 flex items-center gap-2 text-xs font-bold text-slate-600">
                           <Calendar className="w-3.5 h-3.5 text-slate-300" />
                           {format(new Date(order.end_date), 'd MMM yyyy', { locale: tr })}
                        </div>
                        <div className="col-span-1 flex justify-end">
                           <button className="p-2 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors">
                              <ChevronRight className="w-5 h-5" />
                           </button>
                        </div>
                     </div>
                  ))}
               </div>
            )}
         </div>
      </div>

      {selectedOrder && (

        <OrderDetailsModal 
          isOpen={!!selectedOrder}
          order={selectedOrder} 
          onClose={() => setSelectedOrder(null)} 

          onUpdateStatus={(orderId, newStatus) => {
             updateStatusMutation.mutate({ id: orderId, status: newStatus })
          }}
          isUpdating={updateStatusMutation.isPending}
        />
      )}
    </div>
  )
}

export default OrdersPage
