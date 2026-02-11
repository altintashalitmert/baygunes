
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import api from '../api/client'
import { AlertCircle, Lock, Mail, Loader2, ArrowRight, ShieldCheck, Zap } from 'lucide-react'

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const setAuth = useAuthStore((state) => state.setAuth)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await api.post('/auth/login', { email, password })
      const { token, user } = response.data.data
      setAuth(token, user)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Giriş yapılamadı. Lütfen bilgilerinizi kontrol edin.')
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 overflow-hidden bg-white">
      
      {/* 1. LEFT SIDE - Clean Form */}
      <div className="flex flex-col justify-center items-center p-8 lg:p-20 relative animate-in slide-in-from-left-4 duration-1000">
         <div className="w-full max-w-md space-y-12">
            
            {/* Header */}
            <div>
               <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center mb-8 shadow-2xl">
                  <ShieldCheck className="w-6 h-6 text-white" />
               </div>
               <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-3">Tekrar Hoşgeldiniz.</h1>
               <p className="text-slate-500 font-medium text-lg">Hesabınıza giriş yaparak operasyonu yönetin.</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-900 uppercase tracking-widest ml-1">E-Posta Adresi</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                  placeholder="admin@baygunes.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-900 uppercase tracking-widest ml-1">Şifre</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>

              {error && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 font-bold text-sm animate-in shake duration-300">
                  <Zap className="w-5 h-5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-5 bg-black hover:bg-slate-800 text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed group mt-4 h-16"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Giriş Yap <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-8 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-400">
               <span>© 2026 Baygüneş v2.0</span>
               <a href="#" className="hover:text-black transition-colors">Yardım Merkezi</a>
            </div>

         </div>
      </div>

      {/* 2. RIGHT SIDE - Visual Impact */}
      <div className="hidden lg:block relative bg-slate-900 overflow-hidden">
         {/* Background Image with Overlay */}
         <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542744173-8e7e5341c404?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-60 mix-blend-overlay" />
         <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
         
         <div className="absolute inset-0 flex flex-col justify-end p-20 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-200">
            <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full w-fit">
               <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
               <span className="text-white text-xs font-bold tracking-widest uppercase">Sistem Aktif</span>
            </div>
            <h2 className="text-6xl font-black text-white tracking-tighter leading-tight mb-6">
              Şehrin Ritmini <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Yönetin.</span>
            </h2>
            <p className="text-slate-300 text-lg font-medium max-w-xl leading-relaxed">
              Baygüneş Açık Hava Reklamcılığı yönetim paneli ile tüm envanterinizi, operasyonel süreçlerinizi ve finansal akışınızı tek merkezden kontrol edin.
            </p>
         </div>
      </div>

    </div>
  )
}

export default LoginPage
