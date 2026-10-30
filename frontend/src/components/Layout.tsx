import { Suspense, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { precarregarRotas } from '../pages/paginas';
import { Sidebar } from './Sidebar/Sidebar';
import { NotificationBell } from './NotificationBell/NotificationBell';
import { ConviteBanner } from './ConviteBanner/ConviteBanner';
import { SairDaContaButton } from './ConviteBanner/SairDaContaButton';
import './layout.css';

// Mesmo visual do loading de autenticação logo abaixo (classes já existentes em
// layout.css) — o usuário vê o mesmo spinner tanto esperando a sessão quanto esperando o
// chunk de uma página carregar, em vez de dois padrões de loading diferentes.
function RouteFallback() {
  return (
    <div className="layout-loading" aria-live="polite" aria-busy="true">
      <span className="layout-loading-spinner" aria-hidden="true" />
      Carregando...
    </div>
  );
}

export function Layout() {
  const { user, isLoading } = useAuth();
  const autenticado = Boolean(user);

  // Com a sessão de pé, as outras telas são baixadas em segundo plano. Fica aqui, e não
  // no login, porque também vale para quem já chega autenticado (sessão restaurada, aba
  // nova, atalho na tela inicial do celular).
  useEffect(() => {
    if (autenticado) {
      precarregarRotas();
    }
  }, [autenticado]);

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
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
