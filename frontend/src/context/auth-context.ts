import { createContext } from 'react';
import type { User } from '../types';

export interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  /**
   * Relê /auth/me. Necessário quando algo muda a conta que a sessão enxerga sem passar
   * por login — hoje, aceitar ou recusar um convite de membro, que altera contaId e
   * papel para o mesmo token.
   */
  recarregarSessao: () => Promise<void>;
}

/**
 * Separado do AuthProvider por causa do Fast Refresh: um arquivo que exporta componente
 * e não-componente perde a atualização em tempo real no desenvolvimento — ao salvar, o
 * Vite recarrega a página inteira em vez de trocar só o componente.
 */
export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
