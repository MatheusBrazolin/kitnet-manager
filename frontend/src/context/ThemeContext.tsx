import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type Tema = 'claro' | 'escuro' | 'sistema';

interface ThemeApi {
  tema: Tema;
  /** O tema que está de fato aplicado agora ('sistema' já resolvido). */
  temaEfetivo: 'claro' | 'escuro';
  setTema: (tema: Tema) => void;
}

const ThemeContext = createContext<ThemeApi | undefined>(undefined);

const CHAVE = 'kitmanager.tema';

function lerPreferencia(): Tema {
  try {
    const salvo = localStorage.getItem(CHAVE);
    if (salvo === 'claro' || salvo === 'escuro' || salvo === 'sistema') {
      return salvo;
    }
  } catch {
    // Modo privado ou armazenamento bloqueado: segue no padrão, sem quebrar a tela.
  }
  return 'sistema';
}

/**
 * Tema claro/escuro.
 *
 * O padrão é seguir o sistema operacional — quem já usa o celular no escuro à noite
 * espera que o app acompanhe sem precisar configurar nada. A escolha explícita fica
 * guardada só no navegador: é preferência de aparelho, não da conta (a mesma pessoa
 * pode querer claro no desktop e escuro no celular).
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [tema, setTemaEstado] = useState<Tema>(lerPreferencia);
  const [sistemaEscuro, setSistemaEscuro] = useState(
    () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false,
  );

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!query) {
      return;
    }
    const aoMudar = (evento: MediaQueryListEvent) => setSistemaEscuro(evento.matches);
    query.addEventListener('change', aoMudar);
    return () => query.removeEventListener('change', aoMudar);
  }, []);

  const temaEfetivo: 'claro' | 'escuro' =
    tema === 'sistema' ? (sistemaEscuro ? 'escuro' : 'claro') : tema;

  useEffect(() => {
    // O atributo no <html> é o que os tokens em tokens.css leem.
    document.documentElement.dataset.theme = temaEfetivo === 'escuro' ? 'dark' : 'light';
    // Mantém a cor da barra do navegador no celular em sintonia com a tela.
    const meta = document.querySelector('meta[name="theme-color"]:not([media])');
    meta?.setAttribute('content', temaEfetivo === 'escuro' ? '#111317' : '#f7f5f0');
  }, [temaEfetivo]);

  const setTema = useCallback((novo: Tema) => {
    setTemaEstado(novo);
    try {
      localStorage.setItem(CHAVE, novo);
    } catch {
      // Sem persistência, a escolha ainda vale para esta sessão.
    }
  }, []);

  const api = useMemo(() => ({ tema, temaEfetivo, setTema }), [tema, temaEfetivo, setTema]);

  return <ThemeContext.Provider value={api}>{children}</ThemeContext.Provider>;
}

export function useTema(): ThemeApi {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTema deve ser usado dentro de um ThemeProvider');
  }
  return context;
}
