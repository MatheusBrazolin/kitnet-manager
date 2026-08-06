import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Sidebar } from './Sidebar/Sidebar';
import { NotificationBell } from './NotificationBell/NotificationBell';
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
        <div className="layout-topbar">
          <NotificationBell />
        </div>
        <Outlet />
      </main>
    </div>
  );
}
