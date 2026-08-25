import { createContext, useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, clearStoredToken, getApiErrorMessage, getStoredToken, storeToken } from '../services/api';
import { prefetchCoreData } from '../services/prefetch';
import type { User } from '../types';

interface AuthResponse {
  token: string;
  user: User;
}

export interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

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

    api
      .get<User>('/auth/me')
      .then((response) => {
        setUser(response.data);
        // Sessão restaurada (ex.: recarregou a página) — já dispara o carregamento das
        // telas principais em paralelo, pra elas estarem prontas quando o usuário navegar.
        prefetchCoreData(queryClient);
      })
      .catch(() => clearStoredToken())
      .finally(() => setIsLoading(false));
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

  function logout() {
    clearStoredToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>{children}</AuthContext.Provider>
  );
}
