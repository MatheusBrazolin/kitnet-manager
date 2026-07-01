import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import MobileHeader from './components/MobileHeader'
import Dashboard from './pages/Dashboard'
import Kitnets from './pages/Kitnets'
import Pagamentos from './pages/Pagamentos'
import Inquilinos from './pages/Inquilinos'
import Alertas from './pages/Alertas'
import Login from './pages/Login'

function isAuthenticated() {
  return Boolean(localStorage.getItem('token'))
}

function PrivateLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-60 flex flex-col min-h-screen">
        <MobileHeader onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<PrivateLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/kitnets" element={<Kitnets />} />
          <Route path="/pagamentos" element={<Pagamentos />} />
          <Route path="/inquilinos" element={<Inquilinos />} />
          <Route path="/alertas" element={<Alertas />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
