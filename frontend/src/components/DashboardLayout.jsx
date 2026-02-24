import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import {
  BellRing,
  DollarSign as DollarSign2,
  FileText,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Navigation,
  Package,
  Printer,
  Users,
  X,
  BookOpen,
} from 'lucide-react'
import { useState } from 'react'

function DashboardLayout() {
  const { user, logout } = useAuthStore()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    setIsSidebarOpen(false)
    logout()
    navigate('/login')
  }

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Panel', roles: ['SUPER_ADMIN', 'OPERATOR'] },
    { path: '/poles', icon: MapPin, label: 'Direkler', roles: ['SUPER_ADMIN', 'OPERATOR', 'FIELD'] },
    { path: '/orders', icon: Package, label: 'Reklamlar', roles: ['SUPER_ADMIN', 'OPERATOR'] },
    { path: '/accounts', icon: Users, label: 'Müşteriler', roles: ['SUPER_ADMIN', 'OPERATOR'] },
    { path: '/print-tasks', icon: Printer, label: 'Baskı İşleri', roles: ['SUPER_ADMIN', 'PRINTER'] },
    { path: '/field-tasks', icon: Navigation, label: 'Saha Görevleri', roles: ['SUPER_ADMIN', 'FIELD'] },
    { path: '/users', icon: Users, label: 'Kullanıcılar', roles: ['SUPER_ADMIN'] },
    { path: '/pricing', icon: DollarSign2, label: 'Fiyat Ayarları', roles: ['SUPER_ADMIN'] },
    { path: '/reports', icon: FileText, label: 'Raporlar', roles: ['SUPER_ADMIN'] },
    { path: '/settings/notifications', icon: BellRing, label: 'Bildirimler', roles: ['SUPER_ADMIN'] },
    { path: '/how-to-use', icon: BookOpen, label: 'Nasıl Kullanılır', roles: ['SUPER_ADMIN', 'OPERATOR', 'PRINTER', 'FIELD'] },
  ].filter((item) => item.roles.includes(user?.role))

  const activePageLabel = navItems.find((item) => location.pathname === item.path)?.label || 'Panel'

  const SidebarContent = ({ showProfile = true }) => (
    <div className="flex h-full min-h-0 flex-col">
      {showProfile && (
        <div className="border-b border-slate-200 px-5 py-4">
          <p className="text-base font-bold text-slate-900">Baygunes PBMS</p>
          <p className="text-xs text-slate-500">{user?.name} ({user?.role})</p>
        </div>
      )}

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => setIsSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${
                isActive
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-200 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          <LogOut className="h-4 w-4" />
          Çıkış Yap
        </button>
      </div>
    </div>
  )

  return (
    <div className="h-screen bg-slate-100 lg:flex">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:block">
        <SidebarContent />
      </aside>

      <div className="flex h-full min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="rounded-md border border-slate-300 p-2 text-slate-700 lg:hidden"
              aria-label="Menüyü Aç"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <p className="text-sm font-semibold text-slate-900">{activePageLabel}</p>
              <p className="text-xs text-slate-500">Operasyon Paneli</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden text-xs text-emerald-700 sm:block">Sistem Aktif</div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 lg:hidden"
              aria-label="Çıkış Yap"
            >
              <LogOut className="h-4 w-4" />
              Çıkış
            </button>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setIsSidebarOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Menü</p>
                <p className="text-[11px] text-slate-500">{user?.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="rounded-md border border-slate-300 p-1.5 text-slate-700"
                aria-label="Menüyü Kapat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <SidebarContent showProfile={false} />
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}

export default DashboardLayout
