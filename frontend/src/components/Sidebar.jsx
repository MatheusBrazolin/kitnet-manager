import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Home, CreditCard, Users, Bell, Settings } from 'lucide-react'

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/kitnets', icon: Home, label: 'Kitnets' },
  { to: '/pagamentos', icon: CreditCard, label: 'Pagamentos' },
  { to: '/inquilinos', icon: Users, label: 'Inquilinos' },
  { to: '/alertas', icon: Bell, label: 'Alertas' },
]

export default function Sidebar() {
  return (
    <aside className="fixed top-0 left-0 h-screen w-60 bg-slate-900 text-white flex flex-col z-10">
      <div className="px-6 py-5 border-b border-slate-700">
        <h1 className="text-lg font-bold text-white">Gestor de Kitnets</h1>
        <p className="text-xs text-slate-400 mt-0.5">Painel de controle</p>
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

      <div className="px-6 py-4 border-t border-slate-700">
        <a
          href="/admin/"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <Settings size={14} />
          Painel Administrativo
        </a>
      </div>
    </aside>
  )
}
