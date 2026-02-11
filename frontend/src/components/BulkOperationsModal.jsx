import { X } from 'lucide-react'

function BulkOperationsModal({ 
  isOpen, 
  onClose, 
  filteredPoles, 
  bulkStatus, 
  setBulkStatus, 
  onUpdate,
  isPending,
  cityFilter,
  districtFilter,
  streetFilter 
}) {
  if (!isOpen) return null

  const filterDesc = [
    cityFilter && `Şehir: ${cityFilter}`,
    districtFilter && `İlçe: ${districtFilter}`,
    streetFilter && `Cadde: ${streetFilter}`,
  ].filter(Boolean).join(', ')

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-[40px] shadow-2xl p-10 w-full max-w-md relative animate-in zoom-in duration-300" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
            🎯 Toplu İşlemler
          </h3>
          <button
            onClick={onClose}
            className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="bg-indigo-50/50 border border-indigo-100 p-6 rounded-[32px]">
            <p className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-1">Hedef Kitle</p>
            <p className="text-xl font-black text-slate-900 capitalize">
               {filteredPoles.length} Adet Direk
            </p>
            {filterDesc && (
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2 bg-white/50 px-3 py-1 rounded-full w-fit">
                {filterDesc}
              </p>
            )}
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest mb-2 block">
              Yeni Durum Seçin
            </label>
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              className="w-full bg-slate-50 px-6 py-4 rounded-2xl font-bold text-slate-900 border-none outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
            >
              <option value="">Seçim Yapın...</option>
              <option value="AVAILABLE">🟢 MÜSAİT</option>
              <option value="OCCUPIED">🔴 DOLU</option>
              <option value="MAINTENANCE">🟠 BAKIMDA</option>
              <option value="INACTIVE">⚫ PASİF</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-5 bg-slate-50 text-slate-500 rounded-[24px] font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 transition-all"
            >
              İptal
            </button>
            <button
              onClick={() => {
                if (!bulkStatus) {
                  alert('Lütfen bir durum seçin')
                  return
                }
                onUpdate() // Now parent handles the custom confirm modal
              }}
              disabled={!bulkStatus || isPending}
              className="flex-1 px-4 py-5 bg-indigo-600 text-white rounded-[24px] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 transition-all"
            >
              {isPending ? 'Güncelleniyor...' : `Değişimi Onayla`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BulkOperationsModal
