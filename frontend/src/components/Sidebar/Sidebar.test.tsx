import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '../Toast/ToastProvider';
import { Sidebar } from './Sidebar';
import { AuthContext } from '../../context/auth-context';
import type { User } from '../../types';

const DONO: User = {
  id: 1,
  name: 'Ana Souza',
  email: 'ana@exemplo.com',
  plano: 'FREE',
  contaId: 1,
  papel: 'OWNER',
};

function renderSidebar(user: User = DONO, logout = vi.fn()) {
  // O cabeçalho do celular traz o sino de notificações, que consulta a API e
  // dispara avisos — daí os dois provedores. É o custo de ter posto o sino
  // dentro do Sidebar: montar a navegação passou a exigir o contexto dele.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter>
          <AuthContext.Provider
            value={{
              user,
              isLoading: false,
              login: vi.fn(),
              register: vi.fn(),
              logout,
              recarregarSessao: vi.fn(),
            }}
          >
            <Sidebar />
          </AuthContext.Provider>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
  return { logout };
}

/** A barra de abas do celular, que convive no DOM com a lateral do desktop. */
function barraDeAbas() {
  return screen.getByRole('navigation', { name: 'Navegação principal' });
}

describe('Sidebar: navegação do celular', () => {
  /**
   * O contrato que importa. Oito destinos numa tela de 375px davam ~45px por aba, e
   * todo rótulo truncava — "Dashb…", "Morad…", "Pagam…". Este teste falha se alguém
   * acrescentar um sexto item à barra, que é como a regressão voltaria: sem erro de
   * compilação e sem teste quebrando, só a navegação ficando ilegível de novo.
   */
  it('mostra no máximo cinco abas', () => {
    renderSidebar();
    const barra = within(barraDeAbas());
    // Quatro links de destino mais o botão "Mais".
    const abas = [
      ...barra.queryAllByRole('link'),
      ...barra.queryAllByRole('button'),
    ];
    expect(abas).toHaveLength(5);
  });

  it('mantém na barra os quatro destinos do dia a dia, com o rótulo inteiro', () => {
    renderSidebar();
    const barra = barraDeAbas();
    for (const nome of ['Dashboard', 'Imóveis', 'Moradores', 'Pagamentos']) {
      expect(within(barra).getByText(nome)).toBeInTheDocument();
    }
    expect(within(barra).getByText('Mais')).toBeInTheDocument();
  });

  it('deixa os destinos ocasionais fora da barra, dentro de "Mais"', async () => {
    renderSidebar();
    const barra = barraDeAbas();
    expect(within(barra).queryByText('Relatórios')).not.toBeInTheDocument();
    expect(within(barra).queryByText('Gastos')).not.toBeInTheDocument();

    await userEvent.click(within(barra).getByRole('button', { name: /Mais/ }));

    const folha = screen.getByRole('dialog');
    for (const nome of [
      'Gastos',
      'Imobiliárias',
      'Relatórios',
      'Configurações',
    ]) {
      expect(within(folha).getByText(nome)).toBeInTheDocument();
    }
  });

  // Sair ocupava o canto mais valioso do cabeçalho sendo a ação menos usada do app.
  it('tira "Sair" do cabeçalho e põe dentro de "Mais"', async () => {
    const { logout } = renderSidebar();

    await userEvent.click(
      within(barraDeAbas()).getByRole('button', { name: /Mais/ }),
    );
    const folha = screen.getByRole('dialog');

    await userEvent.click(
      within(folha).getByRole('button', { name: /Sair da conta/ }),
    );
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('só mostra Equipe para quem é dono da conta', async () => {
    renderSidebar({ ...DONO, papel: 'VISUALIZADOR' });

    await userEvent.click(
      within(barraDeAbas()).getByRole('button', { name: /Mais/ }),
    );
    expect(
      within(screen.getByRole('dialog')).queryByText('Equipe'),
    ).not.toBeInTheDocument();
  });
});
