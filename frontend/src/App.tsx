import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Login } from './pages/Login/Login';
import { Register } from './pages/Login/Register';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { Imoveis } from './pages/Imoveis/Imoveis';
import { Moradores } from './pages/Moradores/Moradores';
import { Pagamentos } from './pages/Pagamentos/Pagamentos';
import { Gastos } from './pages/Gastos/Gastos';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/imoveis" element={<Imoveis />} />
        <Route path="/moradores" element={<Moradores />} />
        <Route path="/pagamentos" element={<Pagamentos />} />
        <Route path="/gastos" element={<Gastos />} />
      </Route>
    </Routes>
  );
}

export default App;
