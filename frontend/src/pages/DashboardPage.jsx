
import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { poleApi } from '../api/poleApi'
import { orderApi } from '../api/orderApi'
import { accountApi } from '../api/accountApi'
import { 

  Layers, 
  CheckCircle2, 
  Globe, 
  TrendingUp, 
  ArrowUpRight,
  Wallet,
  Clock,
  Activity,
  AlertCircle
} from 'lucide-react'
import { 
  PieChart, Pie, Cell, 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts'

function DashboardPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (user?.role === 'FIELD') navigate('/field-tasks')
    if (user?.role === 'PRINTER') navigate('/print-tasks')
  }, [user, navigate])

  // Queries
  const { data: polesData, isLoading: polesLoading } = useQuery({
    queryKey: ['poles'],
    queryFn: () => poleApi.getAll(),
    enabled: !['FIELD', 'PRINTER'].includes(user?.role)
  })

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => orderApi.getOrders(),
    enabled: !['FIELD', 'PRINTER'].includes(user?.role)
  })


  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountApi.getAll(),
    enabled: !['FIELD', 'PRINTER'].includes(user?.role)
  })

  const poles = polesData?.data?.data?.poles || []
  const orders = ordersData?.data?.data?.orders || []


  // --- STATS CALCULATION ---
  const stats = useMemo(() => {
    const totalPoles = poles.length
    const occupied = poles.filter(p => p.status === 'OCCUPIED').length
    const available = poles.filter(p => p.status === 'AVAILABLE').length
    const maintenance = poles.filter(p => p.status === 'MAINTENANCE').length
    const occupancyRate = totalPoles > 0 ? Math.round((occupied / totalPoles) * 100) : 0

    const activeOrders = orders.filter(o => ['LIVE', 'PRINTING', 'AWAITING_MOUNT'].includes(o.status)).length
    
    // Revenue (Mocking trends based on real sum)
    const totalRevenue = orders.reduce((sum, o) => sum + (parseFloat(o.price) || 0), 0)

    // Operational Choke Points
    const pending = orders.filter(o => o.status === 'PENDING').length
    const printing = orders.filter(o => o.status === 'PRINTING').length
    const mounting = orders.filter(o => o.status === 'AWAITING_MOUNT').length

    return { totalPoles, occupied, available, maintenance, occupancyRate, activeOrders, totalRevenue, pending, printing, mounting }
  }, [poles, orders])

  // --- CHART DATA PREP ---
  
  // 1. Occupancy Donut
  const occupancyData = [
    { name: 'Dolu', value: stats.occupied, color: '#6366f1' }, // Indigo-500
    { name: 'Müsait', value: stats.available, color: '#10b981' }, // Emerald-500
    { name: 'Bakım/Diğer', value: stats.totalPoles - (stats.occupied + stats.available), color: '#cbd5e1' } // Slate-300
  ]

  // 2. Operational Pipeline (Bar Chart)
  const opsData = [
    { name: 'Onay Bekleyen', value: stats.pending, fill: '#f59e0b' },
    { name: 'Baskıda', value: stats.printing, fill: '#8b5cf6' },
    { name: 'Montajda', value: stats.mounting, fill: '#ec4899' },
  ]

  // 3. Revenue Trend (Mocked for Visuals, distributing total revenue)
  const revenueData = [
    { name: 'Oca', value: stats.totalRevenue * 0.1 },
    { name: 'Şub', value: stats.totalRevenue * 0.15 },
    { name: 'Mar', value: stats.totalRevenue * 0.12 },
    { name: 'Nis', value: stats.totalRevenue * 0.2 },
    { name: 'May', value: stats.totalRevenue * 0.18 },
    { name: 'Haz', value: stats.totalRevenue * 0.25 },
  ]

  if (user?.role === 'FIELD' || user?.role === 'PRINTER') return null

  return (
    <div className="h-full flex flex-col gap-6 overflow-hidden animate-in fade-in duration-500">
      
      {/* 1. TOP STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
         {/* Card 1: Total Poles */}
         <div className="bg-white rounded-[24px] p-5 border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
               <Layers className="w-6 h-6" />
            </div>
            <div>
               <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Toplam Envanter</p>
               <h3 className="text-2xl font-black text-slate-900">{stats.totalPoles} <span className="text-xs text-slate-400 font-bold">Direk</span></h3>
            </div>
         </div>

         {/* Card 2: Occupancy Rate */}
         <div className="bg-white rounded-[24px] p-5 border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
               <Activity className="w-6 h-6" />
            </div>
            <div>
               <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Doluluk Oranı</p>
               <h3 className="text-2xl font-black text-slate-900">%{stats.occupancyRate}</h3>
            </div>
         </div>

         {/* Card 3: Revenue */}
         <div className="bg-white rounded-[24px] p-5 border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
               <Wallet className="w-6 h-6" />
            </div>
            <div>
               <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Tahmini Ciro</p>
               <h3 className="text-2xl font-black text-slate-900">₺{stats.totalRevenue.toLocaleString()}</h3>
            </div>
         </div>

         {/* Card 4: Pending Ops */}
         <div className="bg-white rounded-[24px] p-5 border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600">
               <AlertCircle className="w-6 h-6" />
            </div>
            <div>
               <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Bekleyen İşler</p>
               <h3 className="text-2xl font-black text-slate-900">{stats.pending + stats.printing + stats.mounting} <span className="text-xs text-slate-400 font-bold">Adet</span></h3>
            </div>
         </div>
      </div>

      {/* 2. MAIN CHARTS SECTION (Split) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
          
          {/* Revenue Area Chart (Large) */}
          <div className="lg:col-span-2 bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm flex flex-col">
             <div className="flex justify-between items-center mb-6">
                <div>
                   <h3 className="text-lg font-black text-slate-800">Finansal Genel Bakış</h3>
                   <p className="text-xs text-slate-400 font-bold">Son 6 aylık gelir projeksiyonu</p>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl">
                   <TrendingUp className="w-5 h-5 text-indigo-600" />
                </div>
             </div>
             <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={revenueData}>
                      <defs>
                         <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                         </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} tickFormatter={(value) => `₺${value/1000}k`} />
                      <Tooltip 
                         contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)'}}
                         formatter={(value) => [`₺${value.toLocaleString()}`, 'Gelir']}
                      />
                      <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
                   </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>

          {/* Occupancy Donut Chart (Medium) */}
          <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm flex flex-col">
             <h3 className="text-lg font-black text-slate-800 mb-2">Doluluk Durumu</h3>
             <p className="text-xs text-slate-400 font-bold mb-6">Envanter kullanım analizi</p>
             
             <div className="flex-1 min-h-0 relative">
                <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                      <Pie
                         data={occupancyData}
                         cx="50%"
                         cy="50%"
                         innerRadius={60}
                         outerRadius={80}
                         paddingAngle={5}
                         dataKey="value"
                      >
                         {occupancyData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                         ))}
                      </Pie>
                      <Tooltip />
                   </PieChart>
                </ResponsiveContainer>
                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                   <p className="text-3xl font-black text-slate-800">%{stats.occupancyRate}</p>
                   <p className="text-[10px] font-bold text-slate-400 uppercase">Dolu</p>
                </div>
             </div>
             
             {/* Custom Legend */}
             <div className="flex justify-center gap-4 mt-4">
                {occupancyData.map((item) => (
                   <div key={item.name} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-xs font-bold text-slate-600">{item.name}</span>
                   </div>
                ))}
             </div>
          </div>
      </div>

      {/* 3. OPERATIONAL PIPELINE (Bottom) */}
      <div className="h-1/3 bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm flex flex-col shrink-0">
          <div className="flex justify-between items-start mb-4">
             <div>
                <h3 className="text-lg font-black text-slate-800">Operasyonel İş Hattı</h3>
                <p className="text-xs text-slate-400 font-bold">Departman bazlı bekleyen iş yükü</p>
             </div>
             <button onClick={() => navigate('/orders')} className="text-xs font-black text-indigo-600 hover:text-indigo-700 uppercase flex items-center gap-1">
                Tümünü Gör <ArrowUpRight className="w-3 h-3" />
             </button>
          </div>

          <div className="flex-1 w-full min-h-0">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={opsData} layout="vertical" margin={{ left: 20 }}>
                   <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                   <XAxis type="number" hide />
                   <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11, fontWeight: 700}} width={100} />
                   <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px'}} />
                   <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
             </ResponsiveContainer>
          </div>
      </div>

    </div>
  )
}

export default DashboardPage
