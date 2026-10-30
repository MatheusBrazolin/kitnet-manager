import type { ReactElement } from 'react';
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Logo } from '../Logo/Logo';
import { useAuth } from '../../hooks/useAuth';
import {
  BuildingIcon,
  GridIcon,
  HomeIcon,
  ChartIcon,
  GearIcon,
  LogoutIcon,
  UserPlusIcon,
  UsersIcon,
  WalletIcon,
  WrenchIcon,
  MenuIcon,
} from '../icons';
import { Modal } from '../Modal/Modal';
import { NotificationBell } from '../NotificationBell/NotificationBell';
import { PAPEL_LABEL } from '../../utils/papel';
import './sidebar.css';
import { Avatar } from '../Avatar/Avatar';
import { useFotoDePerfil } from '../../hooks/useFotoDePerfil';

interface ItemNav {
  to: string;
  label: string;
  icon: (props: { className?: string }) => ReactElement;
  /** Só o Dashboard precisa: sem isso "/" casaria com todas as rotas. */
  end?: boolean;
}

/**
 * Os quatro destinos do dia a dia. São os que ficam na barra de abas do celular.
 *
 * Quatro, não oito: numa tela de 375px, oito abas dão ~45px cada e todo rótulo vira
 * "Dashb…", "Morad…", "Pagam…". A navegação principal do app ficava ilegível. Com
 * quatro mais o "Mais", sobram ~75px por aba e os nomes cabem inteiros.
 */
const NAV_PRINCIPAIS: ItemNav[] = [
  { to: '/', label: 'Dashboard', end: true, icon: HomeIcon },
  { to: '/imoveis', label: 'Imóveis', icon: BuildingIcon },
  { to: '/moradores', label: 'Moradores', icon: UsersIcon },
  { to: '/pagamentos', label: 'Pagamentos', icon: WalletIcon },
];

/** O resto: consultado de vez em quando, não todo dia. Vai para a folha "Mais". */
const NAV_SECUNDARIOS: ItemNav[] = [
  { to: '/gastos', label: 'Gastos', icon: WrenchIcon },
  { to: '/imobiliarias', label: 'Imobiliárias', icon: GridIcon },
  { to: '/relatorios', label: 'Relatórios', icon: ChartIcon },
];

/* No desktop a barra lateral é alta e cabe tudo — lá a divisão não existe. */
const NAV_ITEMS: ItemNav[] = [...NAV_PRINCIPAIS, ...NAV_SECUNDARIOS];

export function Sidebar() {
  const { user, logout } = useAuth();
  const foto = useFotoDePerfil();
  const [menuAberto, setMenuAberto] = useState(false);
  const equipe: ItemNav = {
    to: '/equipe',
    label: 'Equipe',
    icon: UserPlusIcon,
  };
  const navItems = user?.papel === 'OWNER' ? [...NAV_ITEMS, equipe] : NAV_ITEMS;
  const menuItems =
    user?.papel === 'OWNER' ? [...NAV_SECUNDARIOS, equipe] : NAV_SECUNDARIOS;

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Logo className="sidebar-brand-mark" size={34} />
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
                className={({ isActive }) =>
                  `sidebar-link${isActive ? ' sidebar-link-active' : ''}`
                }
              >
                <Icon className="sidebar-link-icon" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/*
          O sino no cabeçalho, só no celular (ver sidebar.css). No desktop ele vive
          na barra de conteúdo, onde há espaço de sobra; no celular aquela barra
          custava uma linha inteira de ~60px só para um ícone, e sem ela o sino
          passava a flutuar sobre o canto dos cartões. Aqui ele fica onde as pessoas
          procuram notificação: ao lado do avatar.

          As duas instâncias usam a mesma queryKey, então o React Query faz uma
          requisição só; a que não pertence ao breakpoint sai do DOM acessível com
          `display: none`.
        */}
        <div className="sidebar-sino-mobile">
          <NotificationBell />
        </div>

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
            <Avatar
              nome={user?.name ?? ''}
              cor={user?.avatarCor}
              foto={foto}
              tamanho="sm"
            />
            <div className="sidebar-user-info">
              <span className="sidebar-user-name" title={user?.name}>
                {user?.name}
              </span>
              {user?.papel && (
                <span className="sidebar-user-papel">
                  {PAPEL_LABEL[user.papel]}
                </span>
              )}
            </div>
            <GearIcon className="sidebar-user-gear" />
          </NavLink>
          <button
            type="button"
            className="btn btn-ghost sidebar-logout"
            onClick={logout}
          >
            <LogoutIcon className="sidebar-link-icon" />
            Sair
          </button>
        </div>
      </aside>

      {/*
        Barra de abas do celular: quatro destinos do dia a dia mais o "Mais".

        A versão anterior punha os oito num único rodapé. Em 375px isso dá ~45px por
        aba, e todo rótulo truncava — abaixo de 360px o CSS chegava a esconder os
        rótulos e deixar só ícones. Era a navegação principal do app ilegível.
      */}
      <nav className="mobile-tabbar" aria-label="Navegação principal">
        {NAV_PRINCIPAIS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `mobile-tab${isActive ? ' mobile-tab-active' : ''}`
              }
            >
              <Icon className="mobile-tab-icon" />
              <span className="mobile-tab-label">{item.label}</span>
            </NavLink>
          );
        })}

        <button
          type="button"
          className={`mobile-tab${menuAberto ? ' mobile-tab-active' : ''}`}
          onClick={() => setMenuAberto(true)}
          aria-haspopup="dialog"
          aria-expanded={menuAberto}
        >
          <MenuIcon className="mobile-tab-icon" />
          <span className="mobile-tab-label">Mais</span>
        </button>
      </nav>

      {menuAberto && (
        <Modal
          title="Mais"
          onClose={() => setMenuAberto(false)}
          className="menu-mais"
        >
          <nav className="menu-mais-lista" aria-label="Mais destinos">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMenuAberto(false)}
                  className={({ isActive }) =>
                    `menu-mais-item${isActive ? ' menu-mais-item-ativo' : ''}`
                  }
                >
                  <Icon className="menu-mais-icone" />
                  {item.label}
                </NavLink>
              );
            })}

            <NavLink
              to="/configuracoes"
              onClick={() => setMenuAberto(false)}
              className={({ isActive }) =>
                `menu-mais-item${isActive ? ' menu-mais-item-ativo' : ''}`
              }
            >
              <GearIcon className="menu-mais-icone" />
              Configurações
            </NavLink>

            {/* Sair fica aqui, separado: é a ação mais destrutiva do menu e a menos
                usada. No cabeçalho ela ocupava o canto mais valioso da tela. */}
            <button
              type="button"
              className="menu-mais-item menu-mais-sair"
              onClick={() => {
                setMenuAberto(false);
                logout();
              }}
            >
              <LogoutIcon className="menu-mais-icone" />
              Sair da conta
            </button>
          </nav>
        </Modal>
      )}
    </>
  );
}
