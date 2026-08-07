import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { BuildingIcon, HomeIcon, LogoutIcon, UserPlusIcon, UsersIcon, WalletIcon, WrenchIcon } from '../icons';
import './sidebar.css';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', end: true, icon: HomeIcon },
  { to: '/imoveis', label: 'Imóveis', icon: BuildingIcon },
  { to: '/moradores', label: 'Moradores', icon: UsersIcon },
  { to: '/pagamentos', label: 'Pagamentos', icon: WalletIcon },
  { to: '/gastos', label: 'Gastos', icon: WrenchIcon },
];

const PAPEL_LABEL: Record<string, string> = {
  OWNER: 'Dono da conta',
  GERENTE: 'Gerente',
  VISUALIZADOR: 'Só leitura',
};

export function Sidebar() {
  const { user, logout } = useAuth();
  const navItems = user?.papel === 'OWNER' ? [...NAV_ITEMS, { to: '/equipe', label: 'Equipe', icon: UserPlusIcon }] : NAV_ITEMS;

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-brand-mark">K</span>
        <span className="sidebar-brand-name">KitManager</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `sidebar-link${isActive ? ' sidebar-link-active' : ''}`}
            >
              <Icon className="sidebar-link-icon" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{user?.name.charAt(0).toUpperCase()}</div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{user?.name}</span>
            {user?.papel && <span className="sidebar-user-papel">{PAPEL_LABEL[user.papel]}</span>}
          </div>
        </div>
        <button type="button" className="btn btn-ghost sidebar-logout" onClick={logout}>
          <LogoutIcon className="sidebar-link-icon" />
          Sair
        </button>
      </div>
    </aside>
  );
}
