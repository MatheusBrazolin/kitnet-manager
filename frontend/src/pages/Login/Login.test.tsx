import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Login } from './Login';
import { AuthContext } from '../../context/auth-context';
import { guardarPerfilLembrado } from '../../utils/perfilLembrado';

function renderLogin(login = vi.fn().mockResolvedValue(undefined)) {
  render(
    <MemoryRouter>
      <AuthContext.Provider
        value={{
          user: null,
          isLoading: false,
          login,
          register: vi.fn(),
          logout: vi.fn(),
          recarregarSessao: vi.fn(),
        }}
      >
        <Login />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
  return { login };
}

describe('Login sem perfil lembrado', () => {
  it('pede e-mail e senha', () => {
    renderLogin();
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
    expect(screen.getByText('Entrar', { selector: 'h2' })).toBeInTheDocument();
  });
});

describe('Login com perfil lembrado', () => {
  const PERFIL = { nome: 'Ana Souza', email: 'ana@exemplo.com' };

  it('mostra quem é e esconde o campo de e-mail', () => {
    guardarPerfilLembrado(PERFIL);
    renderLogin();

    expect(screen.getByText('Ana Souza')).toBeInTheDocument();
    expect(screen.getByText('ana@exemplo.com')).toBeInTheDocument();
    // O ponto da funcionalidade: não digitar o e-mail de novo.
    expect(screen.queryByLabelText('E-mail')).not.toBeInTheDocument();
  });

  it('cumprimenta pelo primeiro nome', () => {
    guardarPerfilLembrado({ nome: 'Maria Clara dos Santos', email: 'm@e.com' });
    renderLogin();
    expect(screen.getByText('Olá de novo, Maria')).toBeInTheDocument();
  });

  /**
   * O e-mail lembrado precisa chegar ao `login` mesmo sem campo visível. Se isso
   * quebrar, a tela parece certa e o login falha com "credenciais inválidas" — o
   * usuário culparia a própria senha, que é exatamente o tipo de erro que já nos
   * custou caro neste app.
   */
  it('entra usando o e-mail lembrado e só a senha digitada', async () => {
    guardarPerfilLembrado(PERFIL);
    const { login } = renderLogin();

    await userEvent.type(screen.getByLabelText('Senha'), 'MinhaSenha123');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(login).toHaveBeenCalledWith('ana@exemplo.com', 'MinhaSenha123');
  });

  it('"Trocar" devolve o formulário completo e esquece o perfil', async () => {
    guardarPerfilLembrado(PERFIL);
    renderLogin();

    await userEvent.click(screen.getByRole('button', { name: 'Trocar' }));

    expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
    expect(screen.queryByText('ana@exemplo.com')).not.toBeInTheDocument();
    // Esquecer de verdade: senão o perfil volta no próximo carregamento e a pessoa
    // não consegue entrar com outra conta.
    expect(localStorage.getItem('kitmanager.perfil')).toBeNull();
  });

  it('o rodapé também oferece entrar com outra conta', async () => {
    guardarPerfilLembrado(PERFIL);
    renderLogin();

    await userEvent.click(screen.getByRole('button', { name: 'Entrar com outra conta' }));
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
  });

  // Guardar a senha seria o erro grave óbvio; este teste existe para que ninguém o
  // introduza por conveniência mais tarde.
  it('nunca guarda a senha', async () => {
    guardarPerfilLembrado(PERFIL);
    renderLogin();

    await userEvent.type(screen.getByLabelText('Senha'), 'MinhaSenha123');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    const tudo = JSON.stringify(localStorage);
    expect(tudo).not.toContain('MinhaSenha123');
  });
});
