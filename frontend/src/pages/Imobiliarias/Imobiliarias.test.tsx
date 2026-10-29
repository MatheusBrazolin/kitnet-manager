import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Imobiliarias } from './Imobiliarias';
import { AuthContext } from '../../context/AuthContext';
import { ConfirmProvider } from '../../components/ConfirmDialog/ConfirmProvider';
import { api } from '../../services/api';
import type { Imobiliaria, Papel, User } from '../../types';

// O componente Table renderiza DUAS representações da mesma linha — uma <table> para
// desktop e uma lista de cartões para mobile, alternadas por CSS. Toda consulta por
// conteúdo de linha encontra os dois, daí os helpers no plural.

const CENTRAL: Imobiliaria = {
  id: 1,
  nome: 'Imobiliária Central',
  telefone: '11999990000',
  contato: 'Marina',
  taxaPadraoTipo: 'PERCENTUAL',
  taxaPadraoValor: 10,
  _count: { kitnets: 3 },
};

function usuario(papel: Papel): User {
  return {
    id: 1,
    name: 'Ana Souza',
    email: 'ana@exemplo.com',
    plano: 'PRO',
    contaId: 1,
    papel,
  };
}

function renderPagina(papel: Papel = 'OWNER') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{
          user: usuario(papel),
          isLoading: false,
          login: vi.fn(),
          register: vi.fn(),
          logout: vi.fn(),
          recarregarSessao: vi.fn(),
        }}
      >
        <ConfirmProvider>
          <Imobiliarias />
        </ConfirmProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('Imobiliarias', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lista as imobiliárias com a taxa padrão formatada conforme o tipo', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({
      data: [
        CENTRAL,
        {
          ...CENTRAL,
          id: 2,
          nome: 'Imobiliária Fixa',
          taxaPadraoTipo: 'FIXA',
          taxaPadraoValor: 100,
        },
      ],
    });

    renderPagina();

    expect((await screen.findAllByText('Imobiliária Central')).length).toBeGreaterThan(0);
    // Percentual não pode ser exibido como moeda, e vice-versa.
    expect(screen.getAllByText('10%').length).toBeGreaterThan(0);
    expect(screen.getAllByText('R$ 100,00').length).toBeGreaterThan(0);
  });

  it('cria uma imobiliária com taxa percentual', async () => {
    const user = userEvent.setup();
    vi.spyOn(api, 'get').mockResolvedValue({ data: [] });
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ data: CENTRAL });

    renderPagina();

    await user.click(
      await screen.findByRole('button', { name: '+ Nova imobiliária' }),
    );
    await user.type(screen.getByLabelText('Nome'), 'Imobiliária Central');
    await user.type(screen.getByLabelText('Telefone'), '11999990000');
    await user.type(screen.getByLabelText('Percentual da taxa padrão'), '10');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(postSpy).toHaveBeenCalledWith('/imobiliarias', {
        nome: 'Imobiliária Central',
        telefone: '11999990000',
        contato: null,
        taxaPadraoTipo: 'PERCENTUAL',
        taxaPadraoValor: 10,
      }),
    );
  });

  // O número muda de unidade (10% vs R$ 10): manter o valor anterior criaria uma taxa
  // errada sem o usuário perceber.
  it('limpa o valor ao trocar o tipo da taxa', async () => {
    const user = userEvent.setup();
    vi.spyOn(api, 'get').mockResolvedValue({ data: [] });

    renderPagina();

    await user.click(
      await screen.findByRole('button', { name: '+ Nova imobiliária' }),
    );
    const percentual = screen.getByLabelText('Percentual da taxa padrão');
    await user.type(percentual, '10');
    expect(percentual).toHaveValue(10);

    await user.selectOptions(
      screen.getByLabelText('Taxa padrão'),
      'Valor fixo em reais',
    );

    expect(screen.getByLabelText('Valor fixo da taxa padrão')).toHaveValue('');
  });

  it('mostra a mensagem do backend quando a exclusão é bloqueada', async () => {
    const user = userEvent.setup();
    vi.spyOn(api, 'get').mockResolvedValue({ data: [CENTRAL] });
    vi.spyOn(api, 'delete').mockRejectedValue({
      isAxiosError: true,
      response: {
        data: {
          message: 'Desvincule as unidades desta imobiliária antes de excluí-la.',
        },
      },
    });

    renderPagina();

    const [removerNaLinha] = await screen.findAllByRole('button', {
      name: 'Remover',
    });
    await user.click(removerNaLinha);
    // O diálogo de confirmação acrescenta mais um botão "Remover"; o dele é o último.
    const botoesRemover = screen.getAllByRole('button', { name: 'Remover' });
    await user.click(botoesRemover[botoesRemover.length - 1]);

    expect(
      await screen.findByText(
        'Desvincule as unidades desta imobiliária antes de excluí-la.',
      ),
    ).toBeInTheDocument();
  });

  it('não oferece ações de escrita para um VISUALIZADOR', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: [CENTRAL] });

    renderPagina('VISUALIZADOR');

    expect((await screen.findAllByText('Imobiliária Central')).length).toBeGreaterThan(0);
    expect(
      screen.queryByRole('button', { name: '+ Nova imobiliária' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remover' })).not.toBeInTheDocument();
  });
});
