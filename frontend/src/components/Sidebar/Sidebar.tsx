import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  BuildingIcon,
  GridIcon,
  HomeIcon,
  GearIcon,
  LogoutIcon,
  UserPlusIcon,
  UsersIcon,
  WalletIcon,
  WrenchIcon,
} from '../icons';
import { PAPEL_LABEL } from '../../utils/papel';
import './sidebar.css';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', end: true, icon: HomeIcon },
  { to: '/imoveis', label: 'Imóveis', icon: BuildingIcon },
  { to: '/moradores', label: 'Moradores', icon: UsersIcon },
  { to: '/pagamentos', label: 'Pagamentos', icon: WalletIcon },
  { to: '/gastos', label: 'Gastos', icon: WrenchIcon },
  { to: '/imobiliarias', label: 'Imobiliárias', icon: GridIcon },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const navItems = user?.papel === 'OWNER' ? [...NAV_ITEMS, { to: '/equipe', label: 'Equipe', icon: UserPlusIcon }] : NAV_ITEMS;

  return (
    <>
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
          {/* O bloco do usuário vira o atalho para Configurações. Pôr "Configurações"
              como um sétimo item na navegação principal apertaria ainda mais a barra de
              abas do celular, onde os rótulos já truncam — e é onde as pessoas procuram
              as próprias configurações de qualquer forma. */}
          <NavLink
            to="/configuracoes"
            className={({ isActive }) =>
              `sidebar-user${isActive ? ' sidebar-user-active' : ''}`
            }
          >
            <div className="sidebar-avatar">{user?.name.charAt(0).toUpperCase()}</div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name" title={user?.name}>
                {user?.name}
              </span>
              {user?.papel && (
                <span className="sidebar-user-papel">{PAPEL_LABEL[user.papel]}</span>
              )}
            </div>
            <GearIcon className="sidebar-user-gear" />
          </NavLink>
          <button type="button" className="btn btn-ghost sidebar-logout" onClick={logout}>
            <LogoutIcon className="sidebar-link-icon" />
            Sair
          </button>
        </div>
      </aside>

      {/* Menu do celular: no lugar da fileira de nav com scroll horizontal (item some da
          tela sem indicação nenhuma de que dá pra arrastar), uma barra de abas fixa no
          rodapé — sempre com todos os destinos visíveis. Mesmos `navItems` do sidebar
          desktop, só a marcação/CSS mudam por breakpoint (ver sidebar.css). */}
      <nav className="mobile-tabbar" aria-label="Navegação principal">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `mobile-tab${isActive ? ' mobile-tab-active' : ''}`}
            >
              <Icon className="mobile-tab-icon" />
              <span className="mobile-tab-label">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </>
  );
}
