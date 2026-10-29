import { validarEnv } from './env.validation';

const VALIDO = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  JWT_SECRET: 'um-segredo-bem-longo-pra-valer',
};

describe('validarEnv', () => {
  it('deixa passar uma configuração completa', () => {
    expect(() => validarEnv({ ...VALIDO })).not.toThrow();
  });

  it('devolve a própria config, pro ConfigModule seguir em frente', () => {
    expect(validarEnv({ ...VALIDO, OUTRA: 'x' })).toEqual({
      ...VALIDO,
      OUTRA: 'x',
    });
  });

  it('reclama de DATABASE_URL ausente dizendo pra que ela serve', () => {
    expect(() => validarEnv({ JWT_SECRET: VALIDO.JWT_SECRET })).toThrow(
      /DATABASE_URL.*PostgreSQL/s,
    );
  });

  // O caso real: `JWT_SECRET=` no painel da Vercel passa por "definida" em
  // qualquer checagem de existência. O app morria lá dentro do passport-jwt
  // com "requires a secret or key", sem dizer a quem lia qual variável faltava.
  it('trata string vazia como ausente', () => {
    expect(() => validarEnv({ ...VALIDO, JWT_SECRET: '' })).toThrow(
      /JWT_SECRET não está definida/,
    );
  });

  it('trata string só de espaços como ausente', () => {
    expect(() => validarEnv({ ...VALIDO, JWT_SECRET: '   ' })).toThrow(
      /JWT_SECRET não está definida/,
    );
  });

  // Morrer na primeira faria o dono arrumar uma, fazer deploy, e descobrir a
  // próxima só no deploy seguinte.
  it('lista todas as pendências de uma vez, não só a primeira', () => {
    try {
      validarEnv({});
      fail('era pra ter lançado');
    } catch (erro) {
      const msg = (erro as Error).message;
      expect(msg).toContain('DATABASE_URL');
      expect(msg).toContain('JWT_SECRET');
    }
  });

  it('recusa um JWT_SECRET curto demais pra assinar token', () => {
    expect(() => validarEnv({ ...VALIDO, JWT_SECRET: 'curto' })).toThrow(
      /pelo menos 16/,
    );
  });

  it('diz onde arrumar, local e na Vercel', () => {
    try {
      validarEnv({});
      fail('era pra ter lançado');
    } catch (erro) {
      const msg = (erro as Error).message;
      expect(msg).toContain('backend/.env');
      expect(msg).toContain('Environment Variables');
    }
  });
});
