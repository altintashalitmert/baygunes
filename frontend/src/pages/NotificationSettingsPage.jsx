
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationApi } from '../api/notificationApi'
import { BellRing, Mail, MessageSquare, Smartphone, Check, AlertTriangle, Shield, Save, Play } from 'lucide-react'

function NotificationSettingsPage() {
  const queryClient = useQueryClient()
  const [testResult, setTestResult] = useState(null)

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['notificationSettings'],
    queryFn: notificationApi.getSettings
  })

  // Group settings by provider type if needed, or simple list
  const settings = settingsData?.data?.data?.settings || []

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => notificationApi.updateSettings(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationSettings'] })
      alert('Ayarlar güncellendi')
    }
  })

  const testMutation = useMutation({
    mutationFn: notificationApi.testConnection,
    onSuccess: (res) => {
        setTestResult({ success: true, message: res.data.message })
    },
    onError: (err) => {
        setTestResult({ success: false, message: 'Bağlantı başarısız' })
    }
  })

  const handleToggleActive = (setting) => {
      updateMutation.mutate({ id: setting.id, data: { ...setting, is_active: !setting.is_active } })
  }

  const handleToggleDemo = (setting) => {
      updateMutation.mutate({ id: setting.id, data: { ...setting, is_demo: !setting.is_demo } })
  }

  const handleSaveConfig = (setting, newConfig) => {
      updateMutation.mutate({ id: setting.id, data: { ...setting, config: newConfig } })
  }

  if (isLoading) return <div>Yükleniyor...</div>

  return (
    <div className="flex flex-col h-full gap-6 max-w-5xl mx-auto w-full p-4">
       <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
             <BellRing className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Bildirim Ayarları</h1>
            <p className="text-sm font-bold text-slate-400">SMTP Server, SMS ve WhatsApp Entegrasyonları</p>
          </div>
       </div>

       {testResult && (
          <div className={`p-4 rounded-xl flex items-center gap-3 ${testResult.success ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              {testResult.success ? <Check className="w-5 h-5"/> : <AlertTriangle className="w-5 h-5"/>}
              <span className="font-bold text-sm">{testResult.message}</span>
              <button onClick={() => setTestResult(null)} className="ml-auto text-xs hover:underline">Kapat</button>
          </div>
       )}

       <div className="grid grid-cols-1 gap-6">
          {settings.map(setting => (
             <div key={setting.id} className={`glass-panel bg-white border rounded-[24px] overflow-hidden transition-all ${setting.is_active ? 'border-indigo-100 shadow-sm' : 'border-slate-100 opacity-70 grayscale-[0.5]'}`}>
                 {/* Header */}
                 <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${setting.provider === 'SMTP' ? 'bg-indigo-100 text-indigo-600' : setting.provider === 'TWILIO' ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'}`}>
                           {setting.provider === 'SMTP' ? <Mail className="w-6 h-6" /> : setting.provider === 'TWILIO' ? <Smartphone className="w-6 h-6"/> : <MessageSquare className="w-6 h-6"/>}
                        </div>
                        <div>
                           <h3 className="text-lg font-black text-slate-800">{setting.provider}</h3>
                           <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                              {setting.provider === 'SMTP' ? 'E-Posta Servisi' : setting.provider === 'TWILIO' ? 'SMS Gateway' : 'WhatsApp API'}
                           </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                       {/* Demo Toggle */}
                       <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg">
                          <Shield className={`w-4 h-4 ${setting.is_demo ? 'text-amber-500' : 'text-slate-300'}`} />
                          <label className="text-xs font-bold text-slate-600 cursor-pointer select-none">
                             <input type="checkbox" className="mr-2" checked={setting.is_demo} onChange={() => handleToggleDemo(setting)} />
                             DEMO MODU
                          </label>
                       </div>

                       {/* Active Toggle */}
                       <div className="flex items-center gap-2">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={setting.is_active} onChange={() => handleToggleActive(setting)} />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            <span className="ml-3 text-sm font-bold text-slate-700">{setting.is_active ? 'AKTİF' : 'PASİF'}</span>
                          </label>
                       </div>
                    </div>
                 </div>

                 {/* Body / Config Form */}
                 {setting.is_active && (
                     <div className="p-6">
                        <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 mb-6 text-xs text-amber-800 font-medium flex gap-2">
                           <AlertTriangle className="w-4 h-4 shrink-0" />
                           {setting.is_demo 
                             ? 'Şu an DEMO modundasınız. Sistem gerçek gönderim yapmaz, sanal sunucular veya log kaydı kullanır.' 
                             : '⚠️ CANLI MOD: Dikkat, bu ayarlar ile gerçek kullanıcılara mesaj gönderilecektir.'}
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            {/* Render inputs dynamically based on config keys */}
                            {Object.keys(setting.config || {}).map(key => (
                               <div key={key}>
                                  <label className="block text-xs font-black uppercase text-slate-400 mb-1">{key}</label>
                                  <input 
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    type={key.includes('pass') || key.includes('Token') || key.includes('Key') ? 'password' : 'text'}
                                    defaultValue={setting.config[key]}
                                    onBlur={(e) => {
                                        const newConfig = { ...setting.config, [key]: e.target.value }
                                        // Only save on blur to avoid too many requests
                                        handleSaveConfig(setting, newConfig)
                                    }}
                                  />
                               </div>
                            ))}
                        </div>

                        <div className="mt-6 flex justify-end">
                           <button 
                             onClick={() => testMutation.mutate({ provider: setting.provider })}
                             className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-black uppercase hover:bg-slate-900 flex items-center gap-2"
                           >
                              <Play className="w-3 h-3" /> Test Et
                           </button>
                        </div>
                     </div>
                 )}
             </div>
          ))}
       </div>
    </div>
  )
}

export default NotificationSettingsPage
