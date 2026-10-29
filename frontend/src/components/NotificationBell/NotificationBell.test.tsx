import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { NotificationBell } from './NotificationBell';
import { AuthContext } from '../../context/auth-context';
import { api } from '../../services/api';
import type { PagamentoAlerta, User } from '../../types';
import { ToastProvider } from '../Toast/ToastProvider';

const OWNER: User = {
  id: 1,
  name: 'Ana Souza',
  email: 'ana@exemplo.com',
  plano: 'PRO',
  contaId: 1,
  papel: 'OWNER',
};

const ALERTA: PagamentoAlerta = {
  id: 77,
  morador: 'Eulo Maroni',
  imovel: 'Kitnet Central',
  kitnet: '43',
  valor: 1400,
  valorLiquido: 1260,
  vencimento: '2026-09-21T00:00:00.000Z',
  venceHoje: true,
};

function renderBell() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider
          value={{ user: OWNER, isLoading: false, login: vi.fn(), register: vi.fn(), logout: vi.fn(), recarregarSessao: vi.fn() }}
        >
          <ToastProvider>
            <NotificationBell />
          </ToastProvider>
        </AuthContext.Provider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('NotificationBell', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Regressão: o botão mandava `{ pago: true }` para o PATCH genérico /pagamentos/:id,
  // que só aceita valor/vencimento/observacao. Com `forbidNonWhitelisted` no
  // ValidationPipe do backend, isso respondia 400 e o pagamento NUNCA era confirmado.
  it('confirma o pagamento pela rota dedicada /marcar-pago, sem campos extras', async () => {
    const user = userEvent.setup();
    vi.spyOn(api, 'get').mockResolvedValue({ data: [ALERTA] });
    const patchSpy = vi.spyOn(api, 'patch').mockResolvedValue({ data: {} });

    renderBell();

    await user.click(screen.getByRole('button', { name: 'Notificações de pagamento' }));
    await user.click(await screen.findByRole('button', { name: 'Confirmar' }));

    await waitFor(() => expect(patchSpy).toHaveBeenCalledTimes(1));
    expect(patchSpy).toHaveBeenCalledWith('/pagamentos/77/marcar-pago', {});
  });

  // Confirmar pelo sino grava o LÍQUIDO calculado pela taxa da unidade. Antes o alerta
  // exibia só o aluguel cheio, então a pessoa confirmava um número e outro era salvo.
  it('mostra o valor que vai cair na conta, com o aluguel cheio como referência', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: [ALERTA] });

    renderBell();

    await userEvent.click(screen.getByRole('button', { name: 'Notificações de pagamento' }));
    expect(await screen.findByText('R$ 1.260,00')).toBeInTheDocument();
    expect(screen.getByText(/de R\$ 1\.400,00/)).toBeInTheDocument();
  });

  it('mostra a mensagem de erro da API quando a confirmação falha', async () => {
    const user = userEvent.setup();
    vi.spyOn(api, 'get').mockResolvedValue({ data: [ALERTA] });
    vi.spyOn(api, 'patch').mockRejectedValue(new Error('boom'));

    renderBell();

    await user.click(screen.getByRole('button', { name: 'Notificações de pagamento' }));
    await user.click(await screen.findByRole('button', { name: 'Confirmar' }));

    expect(await screen.findByText('Não foi possível confirmar o pagamento.')).toBeInTheDocument();
  });

  it('não oferece a ação de confirmar para um VISUALIZADOR', async () => {
    const user = userEvent.setup();
    vi.spyOn(api, 'get').mockResolvedValue({ data: [ALERTA] });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <AuthContext.Provider
            value={{
              user: { ...OWNER, papel: 'VISUALIZADOR' },
              isLoading: false,
              login: vi.fn(),
              register: vi.fn(),
              logout: vi.fn(),
              recarregarSessao: vi.fn(),
            }}
          >
            <ToastProvider>
              <NotificationBell />
            </ToastProvider>
          </AuthContext.Provider>
        </QueryClientProvider>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Notificações de pagamento' }));
    expect(await screen.findByText(/Eulo Maroni/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirmar' })).not.toBeInTheDocument();
  });
});
