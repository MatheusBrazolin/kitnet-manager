import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './AuthContext';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import type { User } from '../types';

// Nesse setup (Vitest + jsdom + Node 22+), `globalThis.localStorage` já existe como o stub
// experimental do próprio Node (não funcional sem a flag --localstorage-file), então o
// ambiente jsdom não instala sua própria implementação por cima. api.ts usa `localStorage`
// como identificador global — sem isso os testes quebram com "Cannot read properties of
// undefined" mesmo fora de qualquer asserção nossa.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  clear() {
    this.store.clear();
  }
  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
}

Object.defineProperty(globalThis, 'localStorage', {
  value: new MemoryStorage(),
  configurable: true,
  writable: true,
});

const TOKEN_KEY = 'kitmanager.token';

const FAKE_USER: User = {
  id: 1,
  name: 'Ana Souza',
  email: 'ana@exemplo.com',
  plano: 'PRO',
  contaId: 1,
  papel: 'OWNER',
};

function axiosError(status: number) {
  return { isAxiosError: true, response: { status } };
}

// Componente-sonda: só expõe o que o AuthProvider decidiu (carregando/logado/deslogado)
// pra podermos verificar sem depender de nenhuma tela real.
function Probe() {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return <span>carregando</span>;
  }
  return <span>{user ? `logado:${user.email}` : 'deslogado'}</span>;
}

function renderComProviders() {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

// Restauração de sessão (GET /auth/me no carregamento inicial, quando já existe um token
// guardado) — cobre o bug em que qualquer falha (rede, cold start, 5xx) derrubava a sessão
// e forçava a pessoa a logar de novo, mesmo com o token ainda válido.
describe('AuthProvider — restauração de sessão', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('mantém a sessão quando a 1ª tentativa falha por erro transitório e a 2ª dá certo', async () => {
    localStorage.setItem(TOKEN_KEY, 'token-valido');
    let chamadasAuthMe = 0;
    vi.spyOn(api, 'get').mockImplementation((url: string) => {
      if (url !== '/auth/me') {
        return Promise.resolve({ data: [] });
      }
      chamadasAuthMe += 1;
      return chamadasAuthMe === 1 ? Promise.reject(axiosError(500)) : Promise.resolve({ data: FAKE_USER });
    });

    renderComProviders();

    expect(screen.getByText('carregando')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('logado:ana@exemplo.com')).toBeInTheDocument(), { timeout: 3000 });
    expect(chamadasAuthMe).toBe(2);
    expect(localStorage.getItem(TOKEN_KEY)).toBe('token-valido');
  });

  it('não desloga quando as duas tentativas falham por erro transitório (mantém o token pra tentar de novo depois)', async () => {
    localStorage.setItem(TOKEN_KEY, 'token-valido');
    vi.spyOn(api, 'get').mockImplementation((url: string) =>
      url === '/auth/me' ? Promise.reject(axiosError(503)) : Promise.resolve({ data: [] }),
    );

    renderComProviders();

    await waitFor(() => expect(screen.getByText('deslogado')).toBeInTheDocument(), { timeout: 3000 });
    expect(localStorage.getItem(TOKEN_KEY)).toBe('token-valido');
  });

  it('desloga (limpa o token) quando /auth/me responde 401 — sessão de fato inválida/expirada', async () => {
    localStorage.setItem(TOKEN_KEY, 'token-invalido');
    vi.spyOn(api, 'get').mockImplementation((url: string) =>
      url === '/auth/me' ? Promise.reject(axiosError(401)) : Promise.resolve({ data: [] }),
    );

    renderComProviders();

    await waitFor(() => expect(screen.getByText('deslogado')).toBeInTheDocument());
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it('sem token guardado, não chama /auth/me e já mostra deslogado', async () => {
    const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ data: [] });

    renderComProviders();

    await waitFor(() => expect(screen.getByText('deslogado')).toBeInTheDocument());
    expect(getSpy).not.toHaveBeenCalledWith('/auth/me');
  });
});
