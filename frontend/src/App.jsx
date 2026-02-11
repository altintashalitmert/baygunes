import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { Toaster } from 'react-hot-toast'
import React, { lazy, Suspense } from 'react'

const LandingPage = lazy(() => import('./pages/LandingPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const DashboardLayout = lazy(() => import('./components/DashboardLayout'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const UsersPage = lazy(() => import('./pages/UsersPage'))
const PolesPage = lazy(() => import('./pages/PolesPage'))
const OrdersPage = lazy(() => import('./pages/OrdersPage'))
const AccountsPage = lazy(() => import('./pages/AccountsPage'))
const FieldTasksPage = lazy(() => import('./pages/FieldTasksPage'))
const PrintTasksPage = lazy(() => import('./pages/PrintTasksPage'))
const PricingPage = lazy(() => import('./pages/PricingPage'))
const ReportsPage = lazy(() => import('./pages/ReportsPage'))
const NotificationSettingsPage = lazy(() => import('./pages/NotificationSettingsPage'))

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
    <div className="h-full min-h-[200px] flex items-center justify-center">
      <div className="w-7 h-7 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
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
    <>
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
      </Route>


      {/* Fallback */}
      <Route path="*" element={<Navigate to={defaultRoute} />} />
    </Routes>
    </>
  )
}

export default App
