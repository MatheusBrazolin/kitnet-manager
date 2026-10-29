import {  useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { api, clearStoredToken, getApiErrorMessage, getStoredToken, storeToken } from '../services/api';
import { prefetchCoreData } from '../services/prefetch';
import { limparCacheDeDados } from '../services/invalidate';
import type { User } from '../types';
import { AuthContext } from './auth-context';

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 401/403 = token inválido/expirado de verdade, aí sim precisa logar de novo. Qualquer
// outro erro (rede, timeout, 5xx — comum em cold start de função serverless) não diz nada
// sobre a sessão em si; tratar como "sessão inválida" só porque o /auth/me falhou uma vez
// era o que forçava login de novo toda hora, mesmo com o token ainda válido.
function isSessaoInvalida(error: unknown): boolean {
  return axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403);
}

interface AuthResponse {
  token: string;
  user: User;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    let cancelado = false;

    async function restaurarSessao() {
      // Uma retentativa antes de desistir: um cold start do backend ou uma instabilidade
      // passageira de rede não deve custar um logout — só tenta de novo depois de um
      // instante e, se persistir, mantém o token guardado (próxima visita tenta de novo).
      for (let tentativa = 0; tentativa < 2; tentativa++) {
        try {
          const response = await api.get<User>('/auth/me');
          if (cancelado) {
            return;
          }
          setUser(response.data);
          // Sessão restaurada (ex.: recarregou a página) — já dispara o carregamento das
          // telas principais em paralelo, pra elas estarem prontas quando o usuário navegar.
          prefetchCoreData(queryClient);
          return;
        } catch (error) {
          if (cancelado) {
            return;
          }
          if (isSessaoInvalida(error)) {
            clearStoredToken();
            limparCacheDeDados(queryClient);
            return;
          }
          if (tentativa === 0) {
            await delay(1500);
          }
        }
      }
    }

    restaurarSessao().finally(() => {
      if (!cancelado) {
        setIsLoading(false);
      }
    });

    return () => {
      cancelado = true;
    };
  }, [queryClient]);

  async function login(email: string, password: string) {
    try {
      const response = await api.post<AuthResponse>('/auth/login', { email, password });
      storeToken(response.data.token);
      setUser(response.data.user);
      prefetchCoreData(queryClient);
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Não foi possível entrar. Verifique suas credenciais.'));
    }
  }

  async function register(name: string, email: string, password: string) {
    try {
      const response = await api.post<AuthResponse>('/auth/register', { name, email, password });
      storeToken(response.data.token);
      setUser(response.data.user);
      prefetchCoreData(queryClient);
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Não foi possível criar sua conta.'));
    }
  }

  async function recarregarSessao() {
    const response = await api.get<User>('/auth/me');
    setUser(response.data);
  }

  function logout() {
    clearStoredToken();
    setUser(null);
    // O QueryClient é criado uma vez em main.tsx e sobrevive ao logout. Sem limpar,
    // o próximo login (num computador compartilhado, por exemplo) enxerga imóveis,
    // moradores e valores da conta anterior enquanto o staleTime não expira — o
    // prefetch do login nem chega a refazer as requests que ainda estão frescas.
    limparCacheDeDados(queryClient);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, recarregarSessao }}>{children}</AuthContext.Provider>
  );
}
