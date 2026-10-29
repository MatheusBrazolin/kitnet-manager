import { createContext, useContext } from 'react';

export type Tema = 'claro' | 'escuro' | 'sistema';

export interface ThemeApi {
  tema: Tema;
  /** O tema que está de fato aplicado agora ('sistema' já resolvido). */
  temaEfetivo: 'claro' | 'escuro';
  setTema: (tema: Tema) => void;
}

export const ThemeContext = createContext<ThemeApi | undefined>(undefined);

/**
 * Separado do ThemeProvider por causa do Fast Refresh: um arquivo que exporta
 * componente e não-componente perde a atualização em tempo real no desenvolvimento.
 */
export function useTema(): ThemeApi {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTema deve ser usado dentro de um ThemeProvider');
  }
  return context;
}
