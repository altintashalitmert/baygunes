import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { pricingApi } from '../api/pricingApi'
import { Save, RefreshCw, DollarSign, Settings2, Info, Loader2 } from 'lucide-react'

function PricingPage() {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    print_price_sqm: 0,
    mount_price: 0,
    dismount_price: 0
  })

  // Fetch Pricing
  const { data, isLoading, isError } = useQuery({
    queryKey: ['pricing'],
    queryFn: pricingApi.getPricing,
  })

  useEffect(() => {
    if (data?.data?.data) {
      const p = data.data.data
      setFormData({
        print_price_sqm: p.print_price_sqm?.value || 0,
        mount_price: p.mount_price?.value || 0,
        dismount_price: p.dismount_price?.value || 0
      })
    }
  }, [data])

  // Update Pricing
  const updateMutation = useMutation({
    mutationFn: pricingApi.updatePricing,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing'] })
      alert('Fiyatlar başarıyla güncellendi!')
    },
    onError: (err) => {
      alert(`Güncelleme hatası: ${err.response?.data?.error || err.message}`)
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    updateMutation.mutate({
      print_price_sqm: parseFloat(formData.print_price_sqm),
      mount_price: parseFloat(formData.mount_price),
      dismount_price: parseFloat(formData.dismount_price)
    })
  }

  if (isLoading) return (
    <div className="flex justify-center items-center h-[60vh]">
      <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
    </div>
  )

  if (isError) return (
    <div className="p-8 text-center text-red-500 bg-red-50 rounded-2xl border border-red-100 max-w-lg mx-auto mt-10">
      Fiyat bilgileri alınamadı. Lütfen daha sonra tekrar deneyin.
    </div>
  )

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-xl">
             <Settings2 className="w-6 h-6 text-indigo-600" />
          </div>
          Birim Fiyat Ayarları
        </h1>
        <p className="text-gray-500 text-sm pl-11">Sistemdeki otomatik maliyet hesaplamaları için baz alınan birim fiyatlar</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 bg-gray-50/50 border-b border-gray-100">
               <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  Fiyatlandırma Formu
               </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {/* Print Price */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">
                  Baskı Birim Fiyatı (m²)
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <span className="text-gray-400 group-focus-within:text-indigo-500 transition-colors font-bold">₺</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.print_price_sqm}
                    onChange={(e) => setFormData({ ...formData, print_price_sqm: e.target.value })}
                    className="block w-full rounded-xl border-gray-200 py-3 pl-10 pr-24 text-gray-900 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                    placeholder="0.00"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">TL / m²</span>
                  </div>
                </div>
                <p className="text-xs text-gray-400">Metrekare başına hesaplanan baskı birim maliyeti.</p>
              </div>

              {/* Mount Price */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">
                  Montaj (Asma) Ücreti
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <span className="text-gray-400 group-focus-within:text-indigo-500 transition-colors font-bold">₺</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.mount_price}
                    onChange={(e) => setFormData({ ...formData, mount_price: e.target.value })}
                    className="block w-full rounded-xl border-gray-200 py-3 pl-10 pr-24 text-gray-900 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                    placeholder="0.00"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">TL / Adet</span>
                  </div>
                </div>
                <p className="text-xs text-gray-400">Her bir direk için uygulanan montaj işçilik ücreti.</p>
              </div>

              {/* Dismount Price */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">
                  Söküm (İndirme) Ücreti
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <span className="text-gray-400 group-focus-within:text-indigo-500 transition-colors font-bold">₺</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.dismount_price}
                    onChange={(e) => setFormData({ ...formData, dismount_price: e.target.value })}
                    className="block w-full rounded-xl border-gray-200 py-3 pl-10 pr-24 text-gray-900 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                    placeholder="0.00"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">TL / Adet</span>
                  </div>
                </div>
                <p className="text-xs text-gray-400">Her bir direk için uygulanan söküm işçilik ücreti.</p>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="flex items-center justify-center gap-3 bg-indigo-600 text-white px-8 py-3.5 rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition-all w-full font-bold shadow-lg shadow-indigo-100 disabled:opacity-50"
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Kaydediliyor...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Ayarları Güncelle
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-amber-700">
               <Info className="w-5 h-5" />
               <h3 className="font-bold">Önemli Bilgi</h3>
            </div>
            <p className="text-sm text-amber-800 leading-relaxed">
              Burada yapacağınız değişiklikler sistemdeki <strong>Baskı</strong>, <strong>Montaj</strong> ve <strong>Söküm</strong> maliyet hesaplamalarını doğrudan etkiler.
            </p>
            <p className="text-sm text-amber-800 leading-relaxed">
              Mevcut reklamların fiyatları etkilenmez, ancak yeni oluşturulacak tüm reklamlarda bu yeni birim fiyatlar kullanılacaktır.
            </p>
          </div>

          <div className="bg-indigo-900 rounded-2xl p-6 text-white space-y-2">
             <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest">Son Güncelleme</p>
             <p className="text-sm font-medium">Fiyatlar en son sistem üzerinden otomatik olarak yönetilmektedir.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PricingPage
