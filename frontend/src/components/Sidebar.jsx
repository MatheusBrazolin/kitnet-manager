import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Home, CreditCard, Users, Bell, Settings, LogOut, X } from 'lucide-react'
import { logout } from '../api'

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/kitnets', icon: Home, label: 'Kitnets' },
  { to: '/pagamentos', icon: CreditCard, label: 'Pagamentos' },
  { to: '/inquilinos', icon: Users, label: 'Inquilinos' },
  { to: '/alertas', icon: Bell, label: 'Alertas' },
]

export default function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate()

  async function handleLogout() {
    try {
      await logout()
    } catch {
      // segue para limpar a sessão local mesmo se a chamada falhar
    }
    localStorage.removeItem('token')
    navigate('/login', { replace: true })
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-20 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-screen w-60 bg-slate-900 text-white flex flex-col z-30 transition-transform duration-200 lg:[transform:translateX(0)] ${
          isOpen ? '[transform:translateX(0)]' : '[transform:translateX(-100%)]'
        }`}
      >
        <div className="px-6 py-5 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">Gestor de Kitnets</h1>
            <p className="text-xs text-slate-400 mt-0.5">Painel de controle</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1 text-slate-400 hover:text-white"
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-6 py-4 border-t border-slate-700 space-y-2">
          <a
            href="/admin/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <Settings size={14} />
            Painel Administrativo
          </a>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <LogOut size={14} />
            Sair
          </button>
        </div>
      </aside>
    </>
  )
}
