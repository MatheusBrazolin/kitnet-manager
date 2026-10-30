import { afterEach, describe, expect, it, vi } from 'vitest';
import { esquecerPerfilLembrado, guardarPerfilLembrado, lerPerfilLembrado } from './perfilLembrado';

const CHAVE = 'kitmanager.perfil';

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('perfilLembrado', () => {
  it('guarda e devolve nome e e-mail', () => {
    guardarPerfilLembrado({ nome: 'Ana Souza', email: 'ana@exemplo.com' });
    expect(lerPerfilLembrado()).toEqual({
      nome: 'Ana Souza',
      email: 'ana@exemplo.com',
    });
  });

  it('devolve null quando nunca ninguém entrou', () => {
    expect(lerPerfilLembrado()).toBeNull();
  });

  it('esquece quando pedido', () => {
    guardarPerfilLembrado({ nome: 'Ana', email: 'ana@exemplo.com' });
    esquecerPerfilLembrado();
    expect(lerPerfilLembrado()).toBeNull();
  });

  // Nunca a senha, nunca o token: sozinho, o que fica guardado não dá acesso a nada.
  it('não guarda nada além de nome e e-mail', () => {
    guardarPerfilLembrado({ nome: 'Ana', email: 'ana@exemplo.com' });
    const bruto = JSON.parse(localStorage.getItem(CHAVE) as string) as object;
    expect(Object.keys(bruto).sort()).toEqual(['email', 'nome']);
  });

  // O formato pode mudar entre versões do app. Um objeto pela metade derrubaria a tela
  // de login com "cannot read property of undefined" — e sem tela de login não há
  // como entrar para corrigir.
  it('ignora conteúdo quebrado em vez de derrubar a tela', () => {
    localStorage.setItem(CHAVE, 'isto não é json');
    expect(lerPerfilLembrado()).toBeNull();

    localStorage.setItem(CHAVE, JSON.stringify({ nome: 'Ana' }));
    expect(lerPerfilLembrado()).toBeNull();

    localStorage.setItem(CHAVE, JSON.stringify({ nome: 1, email: 2 }));
    expect(lerPerfilLembrado()).toBeNull();
  });

  // Em janela anônima e com cookies bloqueados o localStorage lança. Não poder lembrar
  // é um detalhe de conforto; quebrar o login por isso seria trocar incômodo por pane.
  it('sobrevive a um localStorage que lança', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });

    expect(lerPerfilLembrado()).toBeNull();
    expect(() => guardarPerfilLembrado({ nome: 'Ana', email: 'ana@exemplo.com' })).not.toThrow();
  });
});
