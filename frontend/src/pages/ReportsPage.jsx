import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { generatePDF } from '../utils/pdfGenerator'
import { FileText, Printer, Wrench, DollarSign, Loader2, Download, Search, Filter, Calendar } from 'lucide-react'
import { pricingApi } from '../api/pricingApi'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { orderApi } from '../api/orderApi'

const fetchOrders = async (status) => {
    const params = status ? { status } : undefined
    const res = await orderApi.getOrders(params)
    return res.data.data.orders
}

function ReportsPage() {
    const [filter, setFilter] = useState('ALL')

    // Fetch Orders
    const { data: orders = [], isLoading } = useQuery({
        queryKey: ['orders', filter],
        queryFn: () => fetchOrders(filter === 'ALL' ? '' : filter)
    })

    // Fetch Pricing for Financial Reports
    const { data: pricingData } = useQuery({
        queryKey: ['pricing'],
        queryFn: pricingApi.getPricing
    })
    const pricing = pricingData?.data?.data || {}

    const handleDownloadPrinting = () => {
        const printingOrders = orders.filter(o => o.status === 'PRINTING' || o.status === 'PENDING')
        generatePDF.printingReport(printingOrders)
    }

    const handleDownloadMounting = () => {
        const mountingOrders = orders.filter(o => o.status === 'AWAITING_MOUNT')
        generatePDF.mountingReport(mountingOrders)
    }

    const handleDownloadFinancial = () => {
        const completedOrders = orders.filter(o => o.status === 'LIVE' || o.status === 'COMPLETED')
        generatePDF.financialReport(completedOrders, pricing)
    }

    return (
        <div className="p-6 max-w-[1400px] mx-auto space-y-8">
            {/* Header */}
            <div className="space-y-1">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 rounded-xl">
                        <FileText className="w-6 h-6 text-indigo-600" />
                    </div>
                    Raporlar ve Analizler
                </h1>
                <p className="text-gray-500 text-sm pl-11">Sistem verilerini PDF formatında dışa aktarın ve iş akışını takip edin</p>
            </div>

            {/* Quick Actions (Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center space-y-4 hover:border-indigo-200 transition-colors group">
                    <div className="p-4 bg-purple-50 rounded-2xl group-hover:scale-110 transition-transform">
                        <Printer className="w-8 h-8 text-purple-600" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="font-bold text-gray-900">Baskı Emre Hazırlık</h3>
                        <p className="text-xs text-gray-400">Baskı bekleyen veya baskıda olan işlerin listesi</p>
                    </div>
                    <button 
                        onClick={handleDownloadPrinting}
                        className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white py-2.5 rounded-xl font-bold hover:bg-purple-700 transition-colors shadow-lg shadow-purple-100"
                    >
                        <Download className="w-4 h-4" /> PDF İndir
                    </button>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center space-y-4 hover:border-indigo-200 transition-colors group">
                    <div className="p-4 bg-amber-50 rounded-2xl group-hover:scale-110 transition-transform">
                        <Wrench className="w-8 h-8 text-amber-600" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="font-bold text-gray-900">Saha Montaj Emri</h3>
                        <p className="text-xs text-gray-400">Montaj aşamasında olan işlerin saha listesi</p>
                    </div>
                    <button 
                        onClick={handleDownloadMounting}
                        className="w-full flex items-center justify-center gap-2 bg-amber-600 text-white py-2.5 rounded-xl font-bold hover:bg-amber-700 transition-colors shadow-lg shadow-amber-100"
                    >
                        <Download className="w-4 h-4" /> PDF İndir
                    </button>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center space-y-4 hover:border-indigo-200 transition-colors group">
                    <div className="p-4 bg-emerald-50 rounded-2xl group-hover:scale-110 transition-transform">
                        <DollarSign className="w-8 h-8 text-emerald-600" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="font-bold text-gray-900">Hak Ediş Raporu</h3>
                        <p className="text-xs text-gray-400">Tamamlanan işlerin finansal dökümü</p>
                    </div>
                    <button 
                        onClick={handleDownloadFinancial}
                        className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-100"
                    >
                        <Download className="w-4 h-4" /> PDF İndir
                    </button>
                </div>
            </div>

            {/* Preview Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h3 className="font-bold text-gray-900">Son Reklamlar Önizleme</h3>
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-400" />
                        <select 
                            value={filter} 
                            onChange={(e) => setFilter(e.target.value)}
                            className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            <option value="ALL">Tümü</option>
                            <option value="PENDING">Beklemede</option>
                            <option value="PRINTING">Baskıda</option>
                            <option value="AWAITING_MOUNT">Montaj Bekliyor</option>
                            <option value="COMPLETED">Tamamlandı</option>
                        </select>
                    </div>
                </div>
                
                {isLoading ? (
                    <div className="p-20 flex justify-center items-center">
                        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-gray-900">Tarih</th>
                                    <th className="px-6 py-4 font-semibold text-gray-900">Müşteri</th>
                                    <th className="px-6 py-4 font-semibold text-gray-900">Direk Kodu</th>
                                    <th className="px-6 py-4 font-semibold text-gray-900">Durum</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {orders.slice(0, 10).map((order) => (
                                    <tr key={order.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4 text-gray-500 font-medium">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {format(new Date(order.created_at), 'd MMM y', { locale: tr })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-gray-900 uppercase">
                                            {order.client_name}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-gray-400">
                                            {order.pole_code}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border
                                                ${order.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                                                  order.status === 'PENDING' ? 'bg-slate-50 text-slate-700 border-slate-100' : 
                                                  'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {orders.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="p-12 text-center text-gray-500">
                                            Önizleme yapılacak veri bulunamadı.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

export default ReportsPage
