import { createContext, useEffect, useState, type ReactNode } from 'react';
import { api, clearStoredToken, getApiErrorMessage, getStoredToken, storeToken } from '../services/api';
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
      .then((response) => setUser(response.data))
      .catch(() => clearStoredToken())
      .finally(() => setIsLoading(false));
  }, []);

  async function login(email: string, password: string) {
    try {
      const response = await api.post<AuthResponse>('/auth/login', { email, password });
      storeToken(response.data.token);
      setUser(response.data.user);
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Não foi possível entrar. Verifique suas credenciais.'));
    }
  }

  async function register(name: string, email: string, password: string) {
    try {
      const response = await api.post<AuthResponse>('/auth/register', { name, email, password });
      storeToken(response.data.token);
      setUser(response.data.user);
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
