const CHAVE = 'kitmanager.perfil';

export interface PerfilLembrado {
  nome: string;
  email: string;
}

/**
 * Quem entrou por último neste navegador, para a tela de login pedir só a senha.
 *
 * Guarda **nome e e-mail, nada mais** — nunca a senha, nunca o token. O token tem a
 * chave própria e é apagado no logout; isto aqui é só o rótulo de quem é a conta, e
 * sozinho não dá acesso a nada.
 *
 * Tudo em try/catch porque `localStorage` lança em janela anônima e com cookies
 * bloqueados. Não poder lembrar o perfil é um detalhe de conforto; derrubar a tela de
 * login por causa disso seria trocar um incômodo por uma pane.
 */
export function lerPerfilLembrado(): PerfilLembrado | null {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) {
      return null;
    }
    const dados = JSON.parse(bruto) as Partial<PerfilLembrado>;
    // Confere os campos em vez de confiar no JSON: o formato pode mudar entre versões,
    // e um objeto pela metade quebraria a tela com "cannot read property of undefined".
    if (typeof dados.nome !== 'string' || typeof dados.email !== 'string') {
      return null;
    }
    return { nome: dados.nome, email: dados.email };
  } catch {
    return null;
  }
}

export function guardarPerfilLembrado(perfil: PerfilLembrado): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(perfil));
  } catch {
    // Sem lembrar o perfil a pessoa só digita o e-mail de novo. Seguir em frente.
  }
}

export function esquecerPerfilLembrado(): void {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    // idem
  }
}
