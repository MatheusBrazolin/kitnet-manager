import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Configuracoes } from './Configuracoes';
import { AuthContext } from '../../context/auth-context';
import { ThemeContext } from '../../context/theme-context';
import { ConfirmProvider } from '../../components/ConfirmDialog/ConfirmProvider';
import { ToastProvider } from '../../components/Toast/ToastProvider';
import { api } from '../../services/api';
import type { User } from '../../types';

const USUARIO: User = {
  id: 1,
  name: 'Ana Souza',
  email: 'ana@exemplo.com',
  plano: 'FREE',
  contaId: 1,
  papel: 'OWNER',
};

function renderPagina(logout = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider
          value={{
            user: USUARIO,
            isLoading: false,
            login: vi.fn(),
            register: vi.fn(),
            logout,
            recarregarSessao: vi.fn(),
          }}
        >
          <ThemeContext.Provider value={{ tema: 'escuro', temaEfetivo: 'escuro', setTema: vi.fn() }}>
            <ToastProvider>
              <ConfirmProvider>
                <Configuracoes />
              </ConfirmProvider>
            </ToastProvider>
          </ThemeContext.Provider>
        </AuthContext.Provider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
  return { logout };
}

describe('Configurações: privacidade e seus dados', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('baixar meus dados', () => {
    it('pede a exportação à API e monta um arquivo para download', async () => {
      const user = userEvent.setup();
      const getSpy = vi
        .spyOn(api, 'get')
        .mockResolvedValue({ data: { perfil: USUARIO, imoveis: [] } });
      // jsdom não implementa nenhum dos dois; sem o stub o clique estoura.
      const criarUrl = vi.fn().mockReturnValue('blob:fake');
      const revogarUrl = vi.fn();
      vi.stubGlobal('URL', {
        ...URL,
        createObjectURL: criarUrl,
        revokeObjectURL: revogarUrl,
      });

      renderPagina();
      await user.click(screen.getByRole('button', { name: 'Baixar' }));

      await waitFor(() => expect(getSpy).toHaveBeenCalledWith('/perfil/exportar'));
      expect(criarUrl).toHaveBeenCalled();
      // Sem revogar, o blob fica na memória da aba até ela ser fechada.
      expect(revogarUrl).toHaveBeenCalledWith('blob:fake');
    });
  });

  describe('apagar minha conta', () => {
    it('não mostra o campo de senha antes de a pessoa pedir para apagar', () => {
      renderPagina();

      expect(screen.getByRole('button', { name: 'Apagar conta' })).toBeTruthy();
      expect(screen.queryByLabelText('Confirme sua senha')).toBeNull();
    });

    it('exige confirmação no diálogo antes de chamar a API', async () => {
      const user = userEvent.setup();
      const deleteSpy = vi.spyOn(api, 'delete').mockResolvedValue({ data: {} });

      renderPagina();
      await user.click(screen.getByRole('button', { name: 'Apagar conta' }));
      await user.type(screen.getByLabelText('Confirme sua senha'), 'senha123');
      await user.click(screen.getByRole('button', { name: 'Apagar minha conta' }));

      // O diálogo apareceu e ninguém confirmou ainda: nada foi apagado.
      await screen.findByRole('button', { name: 'Apagar tudo' });
      expect(deleteSpy).not.toHaveBeenCalled();

      await user.click(screen.getByRole('button', { name: 'Apagar tudo' }));
      await waitFor(() => expect(deleteSpy).toHaveBeenCalled());
    });

    it('manda a senha no corpo do DELETE, nunca na URL', async () => {
      const user = userEvent.setup();
      const deleteSpy = vi.spyOn(api, 'delete').mockResolvedValue({ data: {} });

      renderPagina();
      await user.click(screen.getByRole('button', { name: 'Apagar conta' }));
      await user.type(screen.getByLabelText('Confirme sua senha'), 'senha123');
      await user.click(screen.getByRole('button', { name: 'Apagar minha conta' }));
      await user.click(await screen.findByRole('button', { name: 'Apagar tudo' }));

      await waitFor(() =>
        expect(deleteSpy).toHaveBeenCalledWith('/perfil', {
          data: { senhaAtual: 'senha123' },
        }),
      );
      // Senha em query string acaba no histórico do navegador e no log do servidor.
      expect(deleteSpy.mock.calls[0][0]).not.toContain('senha123');
    });

    it('derruba a sessão depois de apagar — não há mais conta para onde voltar', async () => {
      const user = userEvent.setup();
      vi.spyOn(api, 'delete').mockResolvedValue({ data: {} });
      const logout = vi.fn();

      renderPagina(logout);
      await user.click(screen.getByRole('button', { name: 'Apagar conta' }));
      await user.type(screen.getByLabelText('Confirme sua senha'), 'senha123');
      await user.click(screen.getByRole('button', { name: 'Apagar minha conta' }));
      await user.click(await screen.findByRole('button', { name: 'Apagar tudo' }));

      await waitFor(() => expect(logout).toHaveBeenCalled());
    });

    it('mantém a pessoa na tela quando a senha está errada', async () => {
      const user = userEvent.setup();
      // `isAxiosError: true` é o que getApiErrorMessage checa; sem isso ele cai no
      // texto genérico de fallback e o teste não provaria nada.
      vi.spyOn(api, 'delete').mockRejectedValue({
        isAxiosError: true,
        response: { status: 401, data: { message: 'Senha atual incorreta.' } },
      });
      const logout = vi.fn();

      renderPagina(logout);
      await user.click(screen.getByRole('button', { name: 'Apagar conta' }));
      await user.type(screen.getByLabelText('Confirme sua senha'), 'errada');
      await user.click(screen.getByRole('button', { name: 'Apagar minha conta' }));
      await user.click(await screen.findByRole('button', { name: 'Apagar tudo' }));

      expect(await screen.findByText('Senha atual incorreta.')).toBeTruthy();
      expect(logout).not.toHaveBeenCalled();
    });
  });

  it('leva aos termos e à política de privacidade', () => {
    renderPagina();

    expect(
      screen.getByRole('link', { name: 'Termos de uso' }).getAttribute('href'),
    ).toBe('/termos');
    expect(
      screen
        .getByRole('link', { name: 'Política de privacidade' })
        .getAttribute('href'),
    ).toBe('/privacidade');
  });
});
