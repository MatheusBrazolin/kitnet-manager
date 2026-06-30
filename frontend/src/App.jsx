import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Kitnets from './pages/Kitnets'
import Pagamentos from './pages/Pagamentos'
import Inquilinos from './pages/Inquilinos'
import Alertas from './pages/Alertas'

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <div className="w-60 shrink-0" />
        <main className="flex-1 px-8 py-8 min-w-0">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/kitnets" element={<Kitnets />} />
            <Route path="/pagamentos" element={<Pagamentos />} />
            <Route path="/inquilinos" element={<Inquilinos />} />
            <Route path="/alertas" element={<Alertas />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
