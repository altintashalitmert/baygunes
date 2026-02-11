import { X, AlertTriangle } from 'lucide-react'

function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = 'Onayla', cancelText = 'Vazgeç', type = 'danger' }) {
  if (!isOpen) return null

  const typeConfig = {
    danger: 'bg-rose-500 hover:bg-rose-600 shadow-rose-200',
    primary: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200',
    success: 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200',
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl animate-in zoom-in duration-300">
        <div className="flex flex-col items-center text-center gap-6">
          <div className={`w-16 h-16 rounded-3xl flex items-center justify-center ${type === 'danger' ? 'bg-rose-50 text-rose-500' : 'bg-indigo-50 text-indigo-500'}`}>
            <AlertTriangle className="w-8 h-8" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{title}</h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">{message}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 w-full">
            <button 
              onClick={onClose}
              className="px-6 py-4 bg-slate-50 text-slate-500 rounded-3xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 transition-all"
            >
              {cancelText}
            </button>
            <button 
              onClick={() => {
                onConfirm()
                onClose()
              }}
              className={`px-6 py-4 text-white rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all active:scale-95 ${typeConfig[type]}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal
