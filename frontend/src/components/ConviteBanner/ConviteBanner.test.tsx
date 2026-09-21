import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConviteBanner } from './ConviteBanner';
import { AuthContext } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { User } from '../../types';

const USER: User = {
  id: 2,
  name: 'Ana Souza',
  email: 'ana@exemplo.com',
  plano: 'PRO',
  contaId: 2,
  papel: 'OWNER',
};

const CONVITE = {
  id: 7,
  papel: 'GERENTE' as const,
  dono: { id: 1, name: 'Carlos Dono', email: 'carlos@exemplo.com' },
};

function renderBanner(recarregarSessao = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{
          user: USER,
          isLoading: false,
          login: vi.fn(),
          register: vi.fn(),
          logout: vi.fn(),
          recarregarSessao,
        }}
      >
        <ConviteBanner />
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
  return { queryClient, recarregarSessao };
}

describe('ConviteBanner', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('não renderiza nada quando não há convite pendente', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: null });

    renderBanner();

    await waitFor(() => expect(screen.queryByRole('region', { name: 'Convite pendente' })).not.toBeInTheDocument());
  });

  it('mostra quem convidou e o que o papel permite', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: CONVITE });

    renderBanner();

    expect(await screen.findByText(/Carlos Dono/)).toBeInTheDocument();
    expect(screen.getByText(/gerenciar os imóveis, moradores e pagamentos/)).toBeInTheDocument();
  });

  // O aceite é o que faz o ContaService passar a resolver a conta do dono para este
  // usuário — antes disso o convite não tem nenhum efeito.
  it('aceita o convite e recarrega a sessão', async () => {
    const user = userEvent.setup();
    vi.spyOn(api, 'get').mockResolvedValue({ data: CONVITE });
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ data: {} });
    const recarregar = vi.fn();

    renderBanner(recarregar);
    await user.click(await screen.findByRole('button', { name: 'Aceitar' }));

    await waitFor(() => expect(postSpy).toHaveBeenCalledWith('/membros/convite/aceitar', {}));
    await waitFor(() => expect(recarregar).toHaveBeenCalled());
  });

  it('recusa o convite pelo endpoint de recusa', async () => {
    const user = userEvent.setup();
    vi.spyOn(api, 'get').mockResolvedValue({ data: CONVITE });
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ data: {} });

    renderBanner();
    await user.click(await screen.findByRole('button', { name: 'Recusar' }));

    await waitFor(() => expect(postSpy).toHaveBeenCalledWith('/membros/convite/recusar', {}));
  });

  it('mostra a mensagem de erro da API quando responder falha', async () => {
    const user = userEvent.setup();
    vi.spyOn(api, 'get').mockResolvedValue({ data: CONVITE });
    vi.spyOn(api, 'post').mockRejectedValue(new Error('boom'));

    renderBanner();
    await user.click(await screen.findByRole('button', { name: 'Aceitar' }));

    expect(await screen.findByText('Não foi possível responder ao convite.')).toBeInTheDocument();
  });
});
