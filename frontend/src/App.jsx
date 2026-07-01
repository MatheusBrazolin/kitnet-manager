import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Kitnets from './pages/Kitnets'
import Pagamentos from './pages/Pagamentos'
import Inquilinos from './pages/Inquilinos'
import Alertas from './pages/Alertas'
import Login from './pages/Login'

function isAuthenticated() {
  return Boolean(localStorage.getItem('token'))
}

function PrivateLayout({ children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="w-60 shrink-0" />
      <main className="flex-1 px-8 py-8 min-w-0">{children}</main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateLayout><Dashboard /></PrivateLayout>} />
        <Route path="/kitnets" element={<PrivateLayout><Kitnets /></PrivateLayout>} />
        <Route path="/pagamentos" element={<PrivateLayout><Pagamentos /></PrivateLayout>} />
        <Route path="/inquilinos" element={<PrivateLayout><Inquilinos /></PrivateLayout>} />
        <Route path="/alertas" element={<PrivateLayout><Alertas /></PrivateLayout>} />
      </Routes>
    </BrowserRouter>
  )
}
