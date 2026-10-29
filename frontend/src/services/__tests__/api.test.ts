import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';
import { getApiErrorMessage } from '../api';

const FALLBACK = 'Não foi possível entrar. Verifique suas credenciais.';

function erroComResposta(status: number, data: unknown): AxiosError {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError('falhou', String(status), config, null, {
    status,
    statusText: '',
    data,
    headers: {},
    config,
  } as never);
}

function erroSemResposta(): AxiosError {
  return new AxiosError('Network Error', AxiosError.ERR_NETWORK, {
    headers: new AxiosHeaders(),
  });
}

describe('getApiErrorMessage', () => {
  it('usa a mensagem do backend quando ele recusou de verdade', () => {
    const msg = getApiErrorMessage(
      erroComResposta(401, { message: 'E-mail ou senha inválidos' }),
      FALLBACK,
    );
    expect(msg).toBe('E-mail ou senha inválidos');
  });

  it('junta as mensagens quando o ValidationPipe devolve uma lista', () => {
    const msg = getApiErrorMessage(
      erroComResposta(400, { message: ['email inválido', 'senha curta'] }),
      FALLBACK,
    );
    expect(msg).toBe('email inválido, senha curta');
  });

  it('cai no fallback da tela num 4xx sem mensagem utilizável', () => {
    expect(getApiErrorMessage(erroComResposta(403, {}), FALLBACK)).toBe(FALLBACK);
  });

  // O caso que aconteceu em produção: a função do backend caiu na Vercel e
  // devolveu texto puro ("A server error has occurred"), sem `message`. A tela
  // de login mostrava "Verifique suas credenciais" e mandava o usuário
  // desconfiar da própria senha, que estava certa.
  it('não acusa o usuário quando a função do servidor cai (500 em texto puro)', () => {
    const msg = getApiErrorMessage(
      erroComResposta(500, 'A server error has occurred\n\nFUNCTION_INVOCATION_FAILED'),
      FALLBACK,
    );
    expect(msg).not.toBe(FALLBACK);
    expect(msg).not.toMatch(/credenciais|senha/i);
    expect(msg).toMatch(/servidor/i);
  });

  it('ignora o "Internal server error" genérico do NestJS num 500', () => {
    const msg = getApiErrorMessage(
      erroComResposta(500, { message: 'Internal server error' }),
      FALLBACK,
    );
    expect(msg).not.toBe('Internal server error');
    expect(msg).toMatch(/servidor/i);
  });

  it('aponta a conexão quando não houve resposta nenhuma (rede/CORS)', () => {
    const msg = getApiErrorMessage(erroSemResposta(), FALLBACK);
    expect(msg).not.toBe(FALLBACK);
    expect(msg).toMatch(/conex|servidor/i);
  });

  it('usa o fallback quando o erro nem é do axios', () => {
    expect(getApiErrorMessage(new Error('qualquer'), FALLBACK)).toBe(FALLBACK);
  });
});
