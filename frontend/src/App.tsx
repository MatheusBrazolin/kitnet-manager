import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Login } from './pages/Login/Login';
import { Register } from './pages/Login/Register';
import { EsqueciSenha } from './pages/Login/EsqueciSenha';
import { RedefinirSenha } from './pages/Login/RedefinirSenha';

// As telas autenticadas ficam em chunks separados do bundle de Login/Register — quem
// ainda não entrou não baixa o código de Dashboard/Imóveis/Pagamentos/etc. O `Suspense`
// que cobre a espera vive no Layout, em volta do `Outlet`: um só, no lugar exato onde a
// página entra.
import { Suspense } from 'react';
import {
  Configuracoes,
  Dashboard,
  Equipe,
  Gastos,
  Imobiliarias,
  Imoveis,
  Moradores,
  NaoEncontrado,
  Pagamentos,
  Privacidade,
  Relatorios,
  Termos,
} from './pages/paginas';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/esqueci-senha" element={<EsqueciSenha />} />
      <Route path="/redefinir-senha" element={<RedefinirSenha />} />
      {/* Fora do Layout: Termos e Privacidade precisam abrir para quem ainda não tem
          conta — é onde a pessoa decide se cria uma —, então não podem depender de
          sessão, e por isso não herdam o Suspense que o Layout monta. */}
      <Route
        path="/termos"
        element={
          <Suspense fallback={null}>
            <Termos />
          </Suspense>
        }
      />
      <Route
        path="/privacidade"
        element={
          <Suspense fallback={null}>
            <Privacidade />
          </Suspense>
        }
      />

      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/imoveis" element={<Imoveis />} />
        <Route path="/moradores" element={<Moradores />} />
        <Route path="/pagamentos" element={<Pagamentos />} />
        <Route path="/gastos" element={<Gastos />} />
        <Route path="/imobiliarias" element={<Imobiliarias />} />
        <Route path="/relatorios" element={<Relatorios />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
        <Route path="/equipe" element={<Equipe />} />
        {/* Dentro do Layout de propósito: quem erra a URL continua logado e com a
            navegação à mão, em vez de cair numa página solta. */}
        <Route path="*" element={<NaoEncontrado />} />
      </Route>
    </Routes>
  );
}

export default App;
