
import { useState } from 'react'
import { X, Calendar, User, Phone, Check, ArrowRight, Layers } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { accountApi } from '../api/accountApi'
import { orderApi } from '../api/orderApi'

function CreateOrderModal({ isOpen, onClose, poles = [], onCreate, isPending }) {
  const [formData, setFormData] = useState({
    accountId: '',
    clientName: '',
    clientContact: '',
    startDate: '',
    endDate: '',
    price: ''
  })
  
  const [searchTerm, setSearchTerm] = useState('')

  // Fetch Accounts for dropdown
  const { data: accountsData } = useQuery({ 
      queryKey: ['accounts', searchTerm],
      queryFn: () => accountApi.getAll({ search: searchTerm }),
      enabled: isOpen // Only fetch when modal is open
  })
  const accounts = accountsData?.data?.data?.accounts || []

  const { data: existingOrdersData } = useQuery({
      queryKey: ['activeOrders', poles?.[0]?.id],
      queryFn: () => orderApi.getOrders({ poleId: poles[0].id }),
      enabled: isOpen && poles.length === 1 // Only for single pole selection
  });

  const activeOrders = existingOrdersData?.data?.data?.orders || [];
  
  // Find the latest end date among active orders to set minDate
  const maxEndDate = activeOrders
      .filter(o => ['PENDING', 'PRINTING', 'AWAITING_MOUNT', 'LIVE', 'SCHEDULED'].includes(o.status))
      .reduce((max, order) => {
          const end = new Date(order.end_date);
          return end > max ? end : max;
      }, new Date());
      
  // Add 1 day to the max end date for the next available start date
  const minStartDate = new Date(maxEndDate);
  minStartDate.setDate(minStartDate.getDate() + 1);
  const minDateStr = minStartDate.toISOString().split('T')[0];

  if (!isOpen || poles.length === 0) return null

  const isBulk = poles.length > 1

  const handleAccountSelect = (e) => {
     const accId = e.target.value
     const acc = accounts.find(a => a.id === accId)
     if (acc) {
        setFormData({ 
            ...formData, 
            accountId: accId,
            clientName: acc.company_name || acc.contact_name,
            clientContact: acc.email || acc.phone || ''
        })
     } else {
        setFormData({ ...formData, accountId: '', clientName: '', clientContact: '' })
     }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    // Pass array of IDs
    onCreate({
       poleIds: poles.map(p => p.id),
       ...formData
    })
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-lg relative animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Reklam Oluştur</h3>
            <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-wide flex items-center gap-2">
               {isBulk ? (
                  <>
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span className="text-indigo-600">{poles.length} Direk Seçildi</span>
                  </>
               ) : (
                  <>
                    Direk: <span className="text-indigo-600">{poles[0]?.pole_code}</span>
                  </>
               )}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors group">
            <X className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          

          {/* Account Search & Selection */}
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase mb-2">Müşteri Seçimi *</label>
            <div className="relative group">
               <div className="relative z-20">
                  <User className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Müşteri Ara..."
                    value={searchTerm}
                    onChange={(e) => {
                       setSearchTerm(e.target.value);
                       if(formData.accountId) setFormData({...formData, accountId: '', clientName: '', clientContact: ''}); // clear selection on type
                    }}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none focus:rounded-b-none transition-all"
                  />
                  {formData.accountId && (
                      <Check className="absolute right-4 top-3.5 w-5 h-5 text-emerald-500" />
                  )}
               </div>
               
               {/* Dropdown - Show only when searching or list available and not selected yet? 
                   Actually let's show it when there are results and input has focus (simulated). 
                   For simplicity: Show if !formData.accountId or searchTerm is typed.
               */}
               {(!formData.accountId || searchTerm) && (
                   <div className="absolute top-full left-0 w-full max-h-48 overflow-y-auto bg-white border border-slate-200 border-t-0 rounded-b-xl shadow-xl z-20">
                      {accounts.length > 0 ? accounts.map(acc => (
                         <div 
                            key={acc.id}
                            onClick={() => {
                               setFormData({ 
                                   ...formData, 
                                   accountId: acc.id,
                                   clientName: acc.company_name || acc.contact_name,
                                   clientContact: acc.email || acc.phone || ''
                               })
                               setSearchTerm(acc.company_name || acc.contact_name)
                            }}
                            className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm font-bold text-slate-700 border-b border-slate-50 last:border-none flex justify-between items-center"
                         >
                            <span>{acc.company_name || acc.contact_name}</span>
                            <span className="text-[10px] uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{acc.type === 'CORPORATE' ? 'Kurumsal' : 'Bireysel'}</span>
                         </div>
                      )) : (
                         <div className="p-4 text-center text-xs text-slate-400">Sonuç bulunamadı</div>
                      )}
                   </div>
               )}
            </div>
            {/* Helper text */}
            {!formData.accountId && <p className="text-[10px] text-slate-400 mt-1 font-bold ml-1">* Listeden seçim yapın veya arayın</p>}
          </div>

          {/* Auto-filled Info (Read Only) */}
          {formData.accountId && (
             <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                   <User className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                   <p className="text-xs font-black text-indigo-400 uppercase">Seçilen Müşteri</p>
                   <p className="font-bold text-slate-900 text-sm">{formData.clientName}</p>
                   <p className="text-xs text-slate-500">{formData.clientContact}</p>
                </div>
             </div>
          )}


          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase mb-2">Başlangıç Tarihi *</label>
              {poles.length === 1 && activeOrders.length > 0 && (
                  <span className="text-[10px] text-amber-600 font-bold block mb-1">En erken: {new Date(minDateStr).toLocaleDateString('tr-TR')}</span>
              )}
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                <input
                  type="date"
                  required
                  min={minDateStr} // Use dynamic min date
                  className="w-full pl-10 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={formData.startDate}
                  onChange={e => setFormData({...formData, startDate: e.target.value})}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase mb-2">Bitiş Tarihi *</label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                <input
                  type="date"
                  required
                  min={formData.startDate || new Date().toISOString().split('T')[0]}
                  className="w-full pl-10 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={formData.endDate}
                  onChange={e => setFormData({...formData, endDate: e.target.value})}
                />
              </div>
            </div>
          </div>
          
          {/* Price */}
          <div>
              <label className="block text-xs font-black text-slate-500 uppercase mb-2">Fiyat (Opsiyonel)</label>
              <input
                 type="number"
                 placeholder="0.00"
                 className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                 value={formData.price}
                 onChange={e => setFormData({...formData, price: e.target.value})}
              />
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-black uppercase hover:bg-slate-50 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isPending || !formData.accountId}
              className="flex-1 py-3.5 bg-indigo-600 text-white rounded-xl text-sm font-black uppercase hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
            >
              {isPending && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {isPending ? 'İşleniyor...' : `Reklam Oluştur ${isBulk ? `(${poles.length})` : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateOrderModal
