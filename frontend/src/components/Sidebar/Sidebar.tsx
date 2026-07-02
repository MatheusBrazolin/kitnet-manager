import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './sidebar.css';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/kitnets', label: 'Kitnets' },
  { to: '/moradores', label: 'Moradores' },
  { to: '/pagamentos', label: 'Pagamentos' },
];

export function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-brand-mark">K</span>
        <span className="sidebar-brand-name">KitManager</span>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `sidebar-link${isActive ? ' sidebar-link-active' : ''}`}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{user?.name.charAt(0).toUpperCase()}</div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{user?.name}</span>
            <span className="sidebar-user-plan">Plano {user?.plano}</span>
          </div>
        </div>
        <button type="button" className="btn btn-ghost sidebar-logout" onClick={logout}>
          Sair
        </button>
      </div>
    </aside>
  );
}
