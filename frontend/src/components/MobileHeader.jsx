import { Menu } from 'lucide-react'

export default function MobileHeader({ onMenuClick }) {
  return (
    <header className="lg:hidden sticky top-0 z-10 flex items-center gap-3 bg-white border-b border-slate-100 px-4 py-3">
      <button
        type="button"
        onClick={onMenuClick}
        className="p-2 -ml-2 text-slate-600 hover:text-indigo-600"
        aria-label="Abrir menu"
      >
        <Menu size={22} />
      </button>
      <span className="font-semibold text-slate-800">Gestor de Kitnets</span>
    </header>
  )
}
