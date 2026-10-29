import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Login } from './pages/Login/Login';
import { Register } from './pages/Login/Register';

// As páginas autenticadas ficam em chunks separados do bundle de Login/Register — assim quem
// ainda não entrou não baixa o código de Dashboard/Imóveis/Pagamentos/etc., e o carregamento
// de cada uma acontece sob demanda (o `Suspense` abaixo cobre a espera do chunk).
const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard').then((m) => ({ default: m.Dashboard })));
const Imoveis = lazy(() => import('./pages/Imoveis/Imoveis').then((m) => ({ default: m.Imoveis })));
const Moradores = lazy(() => import('./pages/Moradores/Moradores').then((m) => ({ default: m.Moradores })));
const Pagamentos = lazy(() => import('./pages/Pagamentos/Pagamentos').then((m) => ({ default: m.Pagamentos })));
const Gastos = lazy(() => import('./pages/Gastos/Gastos').then((m) => ({ default: m.Gastos })));
const Equipe = lazy(() => import('./pages/Equipe/Equipe').then((m) => ({ default: m.Equipe })));
const NaoEncontrado = lazy(() =>
  import('./pages/NaoEncontrado/NaoEncontrado').then((m) => ({ default: m.NaoEncontrado })),
);
const Configuracoes = lazy(() =>
  import('./pages/Configuracoes/Configuracoes').then((m) => ({ default: m.Configuracoes })),
);
const Imobiliarias = lazy(() =>
  import('./pages/Imobiliarias/Imobiliarias').then((m) => ({ default: m.Imobiliarias })),
);

// Mesmo visual do loading de autenticação em Layout.tsx (classes já existentes em
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

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<Layout />}>
        <Route
          path="/"
          element={
            <Suspense fallback={<RouteFallback />}>
              <Dashboard />
            </Suspense>
          }
        />
        <Route
          path="/imoveis"
          element={
            <Suspense fallback={<RouteFallback />}>
              <Imoveis />
            </Suspense>
          }
        />
        <Route
          path="/moradores"
          element={
            <Suspense fallback={<RouteFallback />}>
              <Moradores />
            </Suspense>
          }
        />
        <Route
          path="/pagamentos"
          element={
            <Suspense fallback={<RouteFallback />}>
              <Pagamentos />
            </Suspense>
          }
        />
        <Route
          path="/gastos"
          element={
            <Suspense fallback={<RouteFallback />}>
              <Gastos />
            </Suspense>
          }
        />
        <Route
          path="/imobiliarias"
          element={
            <Suspense fallback={<RouteFallback />}>
              <Imobiliarias />
            </Suspense>
          }
        />
        <Route
          path="/configuracoes"
          element={
            <Suspense fallback={<RouteFallback />}>
              <Configuracoes />
            </Suspense>
          }
        />
        <Route
          path="/equipe"
          element={
            <Suspense fallback={<RouteFallback />}>
              <Equipe />
            </Suspense>
          }
        />
        {/* Dentro do Layout de propósito: quem erra a URL continua logado e com a
            navegação à mão, em vez de cair numa página solta. */}
        <Route
          path="*"
          element={
            <Suspense fallback={<RouteFallback />}>
              <NaoEncontrado />
            </Suspense>
          }
        />
      </Route>
    </Routes>
  );
}

export default App;
