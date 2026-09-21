import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Sidebar } from './Sidebar/Sidebar';
import { NotificationBell } from './NotificationBell/NotificationBell';
import { ConviteBanner } from './ConviteBanner/ConviteBanner';
import { SairDaContaButton } from './ConviteBanner/SairDaContaButton';
import './layout.css';

export function Layout() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="layout-loading">
        <span className="layout-loading-spinner" aria-hidden="true" />
        Carregando...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="layout">
      <Sidebar />
      <main className="layout-content">
        <ConviteBanner />
        {user.papel !== 'OWNER' && (
          <div className="layout-membro-banner">
            Você está {user.papel === 'VISUALIZADOR' ? 'visualizando' : 'gerenciando'} os dados de{' '}
            <strong>{user.donoNome}</strong>
            {user.papel === 'VISUALIZADOR' && ' — acesso somente leitura.'}
            <SairDaContaButton />
          </div>
        )}
        <div className="layout-topbar">
          <NotificationBell />
        </div>
        <Outlet />
      </main>
    </div>
  );
}
