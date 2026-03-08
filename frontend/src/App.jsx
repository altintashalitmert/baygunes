import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { Toaster } from 'react-hot-toast'
import React, { lazy, Suspense } from 'react'
import ErrorBoundary from './components/ErrorBoundary'
import LoadingSpinner from './components/LoadingSpinner'

const CHUNK_RELOAD_KEY = 'pbms:chunk-reload'

const isChunkLoadError = (error) =>
  /Failed to fetch dynamically imported module|Importing a module script failed|Failed to load module script/i.test(
    String(error?.message || error || '')
  )

const lazyWithRecovery = (importer) =>
  lazy(async () => {
    try {
      const module = await importer()
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(CHUNK_RELOAD_KEY)
      }
      return module
    } catch (error) {
      if (typeof window !== 'undefined' && isChunkLoadError(error)) {
        const hasReloaded = sessionStorage.getItem(CHUNK_RELOAD_KEY) === '1'
        if (!hasReloaded) {
          sessionStorage.setItem(CHUNK_RELOAD_KEY, '1')
          window.location.reload()
          return new Promise(() => {})
        }
      }
      throw error
    }
  })

const LandingPage = lazyWithRecovery(() => import('./pages/LandingPage'))
const LoginPage = lazyWithRecovery(() => import('./pages/LoginPage'))
const DashboardLayout = lazyWithRecovery(() => import('./components/DashboardLayout'))
const DashboardPage = lazyWithRecovery(() => import('./pages/DashboardPage'))
const UsersPage = lazyWithRecovery(() => import('./pages/UsersPage'))
const PolesPage = lazyWithRecovery(() => import('./pages/PolesPage'))
const OrdersPage = lazyWithRecovery(() => import('./pages/OrdersPage'))
const AccountsPage = lazyWithRecovery(() => import('./pages/AccountsPage'))
const FieldTasksPage = lazyWithRecovery(() => import('./pages/FieldTasksPage'))
const PrintTasksPage = lazyWithRecovery(() => import('./pages/PrintTasksPage'))
const PricingPage = lazyWithRecovery(() => import('./pages/PricingPage'))
const ReportsPage = lazyWithRecovery(() => import('./pages/ReportsPage'))
const NotificationSettingsPage = lazyWithRecovery(() => import('./pages/NotificationSettingsPage'))
const HowToUsePage = lazyWithRecovery(() => import('./pages/HowToUsePage'))
const PoleCapturePage = lazyWithRecovery(() => import('./pages/PoleCapturePage'))
const NotFoundPage = lazyWithRecovery(() => import('./pages/NotFoundPage'))

function getDefaultRoute(user) {
  if (user?.role === 'PRINTER') return '/print-tasks'
  if (user?.role === 'FIELD') return '/field-tasks'
  return '/dashboard'
}

function RoleRoute({ user, roles, children }) {
  if (!user || !roles.includes(user.role)) {
    return <Navigate to={getDefaultRoute(user)} replace />
  }
  return children
}

function PageLoader() {
  return (
    <div className="h-screen flex items-center justify-center">
      <LoadingSpinner size="lg" message="Sayfa yükleniyor..." />
    </div>
  )
}

function lazyElement(Component) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  )
}

function App() {
  const { token, user } = useAuthStore()
  const defaultRoute = getDefaultRoute(user)

  return (
    <ErrorBoundary>
      <Toaster position="top-right" />
      <Routes>
      {/* Public routes */}
      <Route path="/" element={!token ? lazyElement(LandingPage) : <Navigate to={defaultRoute} />} />
      <Route path="/login" element={!token ? lazyElement(LoginPage) : <Navigate to={defaultRoute} />} />
      
      {/* Protected routes */}
      <Route
        path="/"
        element={token ? lazyElement(DashboardLayout) : <Navigate to="/login" />}
      >
        <Route index element={<Navigate to={defaultRoute} />} />
        <Route path="dashboard" element={
          <RoleRoute user={user} roles={['SUPER_ADMIN', 'OPERATOR']}>
            {lazyElement(DashboardPage)}
          </RoleRoute>
        } />
        <Route path="users" element={
          <RoleRoute user={user} roles={['SUPER_ADMIN']}>
            {lazyElement(UsersPage)}
          </RoleRoute>
        } />
        <Route path="poles" element={
          <RoleRoute user={user} roles={['SUPER_ADMIN', 'OPERATOR', 'FIELD']}>
            {lazyElement(PolesPage)}
          </RoleRoute>
        } />
        <Route path="pole-capture" element={
          <RoleRoute user={user} roles={['SUPER_ADMIN', 'OPERATOR', 'FIELD']}>
            {lazyElement(PoleCapturePage)}
          </RoleRoute>
        } />
        <Route path="orders" element={
          <RoleRoute user={user} roles={['SUPER_ADMIN', 'OPERATOR']}>
            {lazyElement(OrdersPage)}
          </RoleRoute>
        } />
        <Route path="accounts" element={
          <RoleRoute user={user} roles={['SUPER_ADMIN', 'OPERATOR']}>
            {lazyElement(AccountsPage)}
          </RoleRoute>
        } />
        <Route path="field-tasks" element={
          <RoleRoute user={user} roles={['SUPER_ADMIN', 'FIELD']}>
            {lazyElement(FieldTasksPage)}
          </RoleRoute>
        } />
        <Route path="print-tasks" element={
          <RoleRoute user={user} roles={['SUPER_ADMIN', 'PRINTER']}>
            {lazyElement(PrintTasksPage)}
          </RoleRoute>
        } />
        <Route path="pricing" element={
          <RoleRoute user={user} roles={['SUPER_ADMIN']}>
            {lazyElement(PricingPage)}
          </RoleRoute>
        } />
        <Route path="reports" element={
          <RoleRoute user={user} roles={['SUPER_ADMIN']}>
            {lazyElement(ReportsPage)}
          </RoleRoute>
        } />
        <Route path="settings/notifications" element={
          <RoleRoute user={user} roles={['SUPER_ADMIN']}>
            {lazyElement(NotificationSettingsPage)}
          </RoleRoute>
        } />
        <Route path="how-to-use" element={lazyElement(HowToUsePage)} />
      </Route>


      {/* 404 Not Found */}
      <Route path="*" element={
        <Suspense fallback={<PageLoader />}>
          <NotFoundPage />
        </Suspense>
      } />
    </Routes>
    </ErrorBoundary>
  )
}

export default App
