
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accountApi } from '../api/accountApi'
import { Plus, Search, ChevronRight, User, Building2, Phone, Mail, FileText, CreditCard, Banknote, History, Wallet, Check } from 'lucide-react'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'

function AccountsPage() {
  const [selectedAccountId, setSelectedAccountId] = useState(null)
  const [isCreating, setIsCreating] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [viewMode, setViewMode] = useState('list') // 'list', 'detail', 'form'
  const [showPaymentForm, setShowPaymentForm] = useState(false)

  const queryClient = useQueryClient()
  const { data: accountsData } = useQuery({ 
      queryKey: ['accounts', searchText],
      queryFn: () => accountApi.getAll({ search: searchText })
  })
  const accounts = accountsData?.data?.data?.accounts || []

  // Derived (Detail view now includes transactions and balances)
  const selectedAccountQuery = useQuery({
      queryKey: ['account', selectedAccountId],
      queryFn: () => accountApi.getById(selectedAccountId),
      enabled: !!selectedAccountId
  })
  const accountDetail = selectedAccountQuery.data?.data?.data
  
  // Payment Form State
  const [paymentData, setPaymentData] = useState({ amount: '', type: 'CASH', description: '' })

  // Account Form State
  const [formData, setFormData] = useState({
     type: 'CORPORATE',
     company_name: '',
     contact_name: '',
     email: '',
     phone: '',
     tax_no: '',
     tax_office: '',
     address: ''
  })

  // Mutations
  const createMutation = useMutation({
     mutationFn: accountApi.create,
     onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['accounts'] })
        setIsCreating(false)
        setViewMode('list')
        setFormData({ type: 'CORPORATE', company_name: '', contact_name: '', email: '', phone: '', tax_no: '', tax_office: '', address: '' })
     }
  })

  const paymentMutation = useMutation({
     mutationFn: (data) => accountApi.addTransaction({ ...data, accountId: selectedAccountId }),
     onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['account', selectedAccountId] }) // Refresh detail to update balance
        queryClient.invalidateQueries({ queryKey: ['accounts'] }) // Refresh list to update totals
        setShowPaymentForm(false)
        setPaymentData({ amount: '', type: 'CASH', description: '' })
     }
  })

  const handleCreate = () => {
    setViewMode('form')
    setIsCreating(true)
    setSelectedAccountId(null)
  }

  const handleSelect = (id) => {
    setSelectedAccountId(id)
    setViewMode('detail')
    setIsCreating(false)
    setShowPaymentForm(false)
  }

  const handleSave = () => {
     createMutation.mutate(formData)
  }
  
  const handlePaymentSubmit = (e) => {
     e.preventDefault()
     paymentMutation.mutate(paymentData)
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex justify-between items-center px-1 shrink-0 h-8">
         <h1 className="text-xl font-black text-slate-800 tracking-tight uppercase flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-600" /> Müşteriler (Cari)
         </h1>
      </div>

      <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
         {/* Left List */}
         <div className="w-[380px] flex flex-col glass-panel rounded-[24px] bg-white border border-slate-200 overflow-hidden shrink-0 h-full shadow-sm">
             <div className="p-4 border-b border-slate-100 bg-white z-10 space-y-3 shrink-0">
                  <div className="relative">
                     <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                     <input 
                       type="text" 
                       placeholder="Müşteri Ara..." 
                       className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                       value={searchText}
                       onChange={e => setSearchText(e.target.value)}
                     />
                  </div>
             </div>
             
             <div className="flex-1 overflow-y-auto p-2 scrollbar-thin space-y-1">
                {accounts.map(acc => (
                   <div 
                      key={acc.id}
                      onClick={() => handleSelect(acc.id)}
                      className={`p-4 rounded-xl cursor-pointer transition-all border group flex items-start gap-3
                        ${selectedAccountId === acc.id ? 'bg-indigo-50 border-indigo-200' : 'hover:bg-slate-50 border-transparent hover:border-slate-100'}
                      `}
                   >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-white shrink-0 shadow-lg ${acc.type === 'CORPORATE' ? 'bg-indigo-500' : 'bg-emerald-500'}`}>
                         {acc.company_name?.[0] || acc.contact_name?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                         <h4 className="font-bold text-slate-900 text-sm truncate">{acc.company_name || acc.contact_name}</h4>
                         <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">{acc.type === 'CORPORATE' ? 'Kurumsal' : 'Bireysel'}</p>
                         
                         {/* Balance indicator in list */}
                         {acc.total_debt > acc.total_paid && (
                            <div className="flex items-center gap-1 mt-1 text-rose-500">
                               <Wallet className="w-3 h-3" />
                               <span className="text-[10px] font-black">-{acc.total_debt - acc.total_paid} TL</span>
                            </div>
                         )}
                      </div>
                      <div className="text-right">
                         <span className="text-xs font-black text-slate-800">{acc.total_orders || 0}</span>
                         <p className="text-[9px] font-bold text-slate-400 uppercase">Sipariş</p>
                      </div>
                   </div>
                ))}
             </div>

             <div className="p-3 border-t border-slate-100 bg-white shrink-0">
                  <button onClick={handleCreate} className="w-full py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase hover:bg-indigo-700 shadow-lg shadow-indigo-100 flex items-center justify-center gap-2">
                     <Plus className="w-4 h-4" /> Yeni Müşteri Ekle
                  </button>
             </div>
         </div>

         {/* Right Detail/Form Area */}
         <div className="flex-1 glass-panel rounded-[24px] bg-white border border-slate-200 overflow-hidden relative shadow-sm h-full flex flex-col">
             {viewMode === 'form' ? (
                // FORM VIEW
                <div className="p-8 max-w-2xl mx-auto w-full overflow-y-auto">
                    <h2 className="text-2xl font-black text-slate-900 mb-6">Yeni Müşteri Kartı</h2>
                    <div className="space-y-4">
                       <div className="grid grid-cols-2 gap-4">
                          <div>
                             <label className="block text-xs font-black text-slate-500 uppercase mb-1">Hesap Türü</label>
                             <select 
                                className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm border-none focus:ring-2 focus:ring-indigo-500"
                                value={formData.type}
                                onChange={e => setFormData({...formData, type: e.target.value})}
                             >
                                <option value="CORPORATE">Kurumsal Şirket</option>
                                <option value="INDIVIDUAL">Bireysel Şahıs</option>
                             </select>
                          </div>
                       </div>
                       
                       <div>
                          <label className="block text-xs font-black text-slate-500 uppercase mb-1">{formData.type === 'CORPORATE' ? 'Şirket Ünvanı' : 'Ad Soyad'}</label>
                          <input 
                             className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm border-none focus:ring-2 focus:ring-indigo-500"
                             value={formData.type === 'CORPORATE' ? formData.company_name : formData.contact_name}
                             onChange={e => formData.type === 'CORPORATE' ? setFormData({...formData, company_name: e.target.value}) : setFormData({...formData, contact_name: e.target.value})}
                          />
                       </div>

                       {formData.type === 'CORPORATE' && (
                          <div>
                            <label className="block text-xs font-black text-slate-500 uppercase mb-1">Yetkili Kişi</label>
                            <input 
                                className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm border-none focus:ring-2 focus:ring-indigo-500"
                                value={formData.contact_name}
                                onChange={e => setFormData({...formData, contact_name: e.target.value})}
                            />
                          </div>
                       )}

                       <div className="grid grid-cols-2 gap-4">
                          <div>
                             <label className="block text-xs font-black text-slate-500 uppercase mb-1">E-Posta</label>
                             <input 
                                className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm border-none focus:ring-2 focus:ring-indigo-500"
                                value={formData.email}
                                onChange={e => setFormData({...formData, email: e.target.value})}
                             />
                          </div>
                          <div>
                             <label className="block text-xs font-black text-slate-500 uppercase mb-1">Telefon</label>
                             <input 
                                className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm border-none focus:ring-2 focus:ring-indigo-500"
                                value={formData.phone}
                                onChange={e => setFormData({...formData, phone: e.target.value})}
                             />
                          </div>
                       </div>

                       {formData.type === 'CORPORATE' && (
                          <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-xs font-black text-slate-500 uppercase mb-1">Vergi Dairesi</label>
                                <input 
                                    className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm border-none focus:ring-2 focus:ring-indigo-500"
                                    value={formData.tax_office}
                                    onChange={e => setFormData({...formData, tax_office: e.target.value})}
                                />
                             </div>
                             <div>
                                <label className="block text-xs font-black text-slate-500 uppercase mb-1">Vergi No</label>
                                <input 
                                    className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm border-none focus:ring-2 focus:ring-indigo-500"
                                    value={formData.tax_no}
                                    onChange={e => setFormData({...formData, tax_no: e.target.value})}
                                />
                             </div>
                          </div>
                       )}

                       <div>
                          <label className="block text-xs font-black text-slate-500 uppercase mb-1">Adres</label>
                          <textarea 
                             className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm border-none focus:ring-2 focus:ring-indigo-500 h-24 resize-none"
                             value={formData.address}
                             onChange={e => setFormData({...formData, address: e.target.value})}
                          />
                       </div>

                       <div className="pt-4 flex gap-3">
                          <button onClick={() => setViewMode('list')} className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase hover:bg-slate-50">İptal</button>
                          <button onClick={handleSave} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase hover:bg-indigo-700 shadow-lg shadow-indigo-100">Kaydet</button>
                       </div>
                    </div>
                </div>
             ) : viewMode === 'detail' && accountDetail ? (
                // DETAIL VIEW
                <div className="flex flex-col h-full">
                    {/* Detail Header */}
                    <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                        <div className="flex items-center justify-between mb-6">
                           <div className="flex items-center gap-4">
                              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl text-white shadow-xl ${accountDetail.account.type === 'CORPORATE' ? 'bg-indigo-500' : 'bg-emerald-500'}`}>
                                {accountDetail.account.company_name?.[0] || accountDetail.account.contact_name?.[0]}
                              </div>
                              <div>
                                 <h2 className="text-2xl font-black text-slate-900">{accountDetail.account.company_name || accountDetail.account.contact_name}</h2>
                                 <div className="flex items-center gap-2 mt-1">
                                    <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-black uppercase text-slate-500">
                                       {accountDetail.account.type === 'CORPORATE' ? 'Kurumsal' : 'Bireysel'}
                                    </span>
                                    <span className="text-xs text-slate-500">{accountDetail.account.city || 'Tokat'}</span>
                                 </div>
                              </div>
                           </div>
                           
                           <div className="text-right">
                              <p className="text-xs font-black text-slate-400 uppercase">Güncel Bakiye</p>
                              <div className={`text-3xl font-black ${accountDetail.account.balance > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                 {accountDetail.account.balance > 0 ? '-' : ''}₺{Math.abs(accountDetail.account.balance).toLocaleString('tr-TR')}
                              </div>
                              <button onClick={() => setShowPaymentForm(!showPaymentForm)} className="mt-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-black uppercase shadow-lg shadow-emerald-200 flex items-center gap-2 ml-auto">
                                 <Banknote className="w-4 h-4" /> Tahsilat Gir
                              </button>
                           </div>
                        </div>

                        {/* Payment Form (Collapsible) */}
                        {showPaymentForm && (
                           <div className="mb-6 bg-emerald-50 border border-emerald-100 p-4 rounded-xl animate-in slide-in-from-top-4">
                              <h4 className="font-black text-emerald-800 text-sm mb-3 flex items-center gap-2"><CreditCard className="w-4 h-4"/> Ödeme Alınıyor</h4>
                              <form onSubmit={handlePaymentSubmit} className="flex gap-4 items-end">
                                 <div className="flex-1">
                                    <label className="text-[10px] font-black uppercase text-emerald-700">Tutar (TL)</label>
                                    <input autoFocus required type="number" className="w-full p-2 rounded-lg border-emerald-200 text-sm font-bold" value={paymentData.amount} onChange={e => setPaymentData({...paymentData, amount: e.target.value})} placeholder="0.00" />
                                 </div>
                                 <div className="w-40">
                                    <label className="text-[10px] font-black uppercase text-emerald-700">Ödeme Yöntemi</label>
                                    <select className="w-full p-2 rounded-lg border-emerald-200 text-sm font-bold bg-white" value={paymentData.type} onChange={e => setPaymentData({...paymentData, type: e.target.value})}>
                                       <option value="CASH">Nakit</option>
                                       <option value="BANK_TRANSFER">Havale / EFT</option>
                                       <option value="CREDIT_CARD">Kredi Kartı</option>
                                       <option value="CHECK">Çek</option>
                                    </select>
                                 </div>
                                 <div className="flex-[2]">
                                    <label className="text-[10px] font-black uppercase text-emerald-700">Açıklama</label>
                                    <input className="w-full p-2 rounded-lg border-emerald-200 text-sm font-bold" value={paymentData.description} onChange={e => setPaymentData({...paymentData, description: e.target.value})} placeholder="Örn: Şubat ayı ödemesi" />
                                 </div>
                                 <button disabled={paymentMutation.isPending} className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-black uppercase text-xs hover:bg-emerald-700 h-[38px]">
                                    {paymentMutation.isPending ? 'Kaydediliyor...' : 'Onayla'}
                                 </button>
                              </form>
                           </div>
                        )}

                        <div className="grid grid-cols-3 gap-4">
                           <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
                              <div>
                                 <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Toplam Alacak</p>
                                 <p className="text-lg font-black text-slate-800">₺{Number(accountDetail.account.total_debt).toLocaleString('tr-TR')}</p>
                              </div>
                              <Wallet className="w-8 h-8 text-slate-100" />
                           </div>
                           <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
                              <div>
                                 <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Toplam Tahsilat</p>
                                 <p className="text-lg font-black text-emerald-600">₺{Number(accountDetail.account.total_paid).toLocaleString('tr-TR')}</p>
                              </div>
                              <Check className="w-8 h-8 text-emerald-100" />
                           </div>
                           <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                              <p className="text-[10px] font-black text-slate-400 uppercase mb-1">İletişim</p>
                              <div className="flex flex-col gap-1 text-xs font-bold text-slate-700">
                                 <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {accountDetail.account.email || '-'}</span>
                                 <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {accountDetail.account.phone || '-'}</span>
                              </div>
                           </div>
                        </div>
                    </div>

                    {/* Content Tabs (Orders & Transactions) */}
                    <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                       {/* Left: Orders */}
                       <div>
                          <h3 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2 uppercase tracking-wide border-b border-slate-100 pb-2">
                             <FileText className="w-4 h-4 text-indigo-500" /> Sipariş Geçmişi
                          </h3>
                          <div className="space-y-3">
                             {accountDetail.orders.length === 0 && <p className="text-slate-400 text-xs italic">Henüz sipariş yok.</p>}
                             {accountDetail.orders.map(order => (
                                <div key={order.id} className="p-3 rounded-xl border border-slate-100 bg-white hover:border-indigo-100 transition-all flex items-center justify-between group">
                                   <div className="flex items-center gap-3">
                                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${order.status === 'LIVE' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400'}`}>
                                         <Building2 className="w-4 h-4" />
                                      </div>
                                      <div>
                                         <p className="font-bold text-slate-900 text-xs group-hover:text-indigo-600 transition-colors">{order.pole_code}</p>
                                         <p className="text-[10px] text-slate-400">
                                            {format(new Date(order.start_date), 'd MMM', { locale: tr })} - {format(new Date(order.end_date), 'd MMM yyyy', { locale: tr })}
                                         </p>
                                      </div>
                                   </div>
                                   <div className="text-right">
                                      <p className="font-black text-slate-800 text-sm">₺{order.price || 0}</p>
                                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase ${order.status === 'LIVE' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>{order.status}</span>
                                   </div>
                                </div>
                             ))}
                          </div>
                       </div>

                       {/* Right: Transactions */}
                       <div>
                          <h3 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2 uppercase tracking-wide border-b border-slate-100 pb-2">
                             <History className="w-4 h-4 text-emerald-500" /> Ödeme Hareketleri
                          </h3>
                           <div className="space-y-3">
                             {(!accountDetail.transactions || accountDetail.transactions.length === 0) && <p className="text-slate-400 text-xs italic">Henüz ödeme yok.</p>}
                             {accountDetail.transactions?.map(tx => (
                                <div key={tx.id} className="p-3 rounded-xl border border-slate-100 bg-emerald-50/30 flex items-center justify-between">
                                   <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                         {tx.type === 'CASH' ? <Banknote className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                                      </div>
                                      <div>
                                         <p className="font-bold text-slate-900 text-xs">{tx.description || 'Ödeme'}</p>
                                         <p className="text-[10px] text-slate-400">
                                            {format(new Date(tx.transaction_date), 'd MMMM HH:mm', { locale: tr })}
                                         </p>
                                      </div>
                                   </div>
                                   <div className="text-right">
                                      <p className="font-black text-emerald-600 text-sm">+₺{Number(tx.amount).toLocaleString('tr-TR')}</p>
                                      <p className="text-[9px] font-bold text-slate-400 uppercase">{tx.type === 'BANK_TRANSFER' ? 'HAVALE' : tx.type === 'CREDIT_CARD' ? 'K. KARTI' : tx.type === 'CHECK' ? 'ÇEK' : 'NAKİT'}</p>
                                   </div>
                                </div>
                             ))}
                          </div>
                       </div>
                    </div>
                </div>
             ) : (
                <div className="flex items-center justify-center h-full text-slate-300 flex-col gap-4">
                   <User className="w-16 h-16 opacity-20" />
                   <p className="text-sm font-bold uppercase tracking-widest">Müşteri Seçin veya Oluşturun</p>
                </div>
             )}
         </div>
      </div>
    </div>
  )
}

export default AccountsPage
