import {
  normalizarDatabaseUrl,
  normalizarDatabaseUrlNoAmbiente,
} from './normalizar-database-url';

const URL_BOA =
  'postgresql://postgres.abc123:SenhaForte1@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

describe('normalizarDatabaseUrl', () => {
  it('não mexe numa URL já correta', () => {
    expect(normalizarDatabaseUrl(URL_BOA)).toBe(URL_BOA);
  });

  // Este é o caso que derrubou produção de verdade: o espaço veio junto na
  // seleção do mouse, o banco recusou a senha, e o erro dizia "credenciais" —
  // mandando procurar no lugar errado.
  it.each([
    ['espaço na frente', ` ${URL_BOA}`],
    ['espaço atrás', `${URL_BOA} `],
    ['quebra de linha', `${URL_BOA}\n`],
    ['tabulação e quebra', `\t${URL_BOA}\r\n`],
  ])('tira %s', (_caso, sujo) => {
    expect(normalizarDatabaseUrl(sujo)).toBe(URL_BOA);
  });

  it.each([
    ['aspas duplas', `"${URL_BOA}"`],
    ['aspas simples', `'${URL_BOA}'`],
    ['crases', `\`${URL_BOA}\``],
    ['sinais de modelo', `<${URL_BOA}>`],
  ])('tira %s das pontas', (_caso, sujo) => {
    expect(normalizarDatabaseUrl(sujo)).toBe(URL_BOA);
  });

  it('tira o nome da variável quando a linha inteira do .env foi colada', () => {
    expect(normalizarDatabaseUrl(`DATABASE_URL="${URL_BOA}"`)).toBe(URL_BOA);
    expect(normalizarDatabaseUrl(`DATABASE_URL=${URL_BOA}`)).toBe(URL_BOA);
  });

  it('desembrulha mais de uma camada', () => {
    expect(normalizarDatabaseUrl(`  "<${URL_BOA}>"  `)).toBe(URL_BOA);
  });

  // O que NÃO pode acontecer: mexer no meio da string. Senha com aspas ou com
  // sinal de maior é legítima, e mutilá-la trocaria um erro por outro.
  it('não toca em aspas ou sinais no meio da senha', () => {
    const comSinais =
      'postgresql://postgres.abc:a"b<c>d@aws-0-us-east-1.pooler.supabase.com:6543/postgres';
    expect(normalizarDatabaseUrl(comSinais)).toBe(comSinais);
  });

  it('não inventa conteúdo a partir de string vazia', () => {
    expect(normalizarDatabaseUrl('   ')).toBe('');
  });
});

describe('normalizarDatabaseUrlNoAmbiente', () => {
  it('corrige no ambiente e avisa que mudou', () => {
    const env = { DATABASE_URL: ` "${URL_BOA}" ` } as NodeJS.ProcessEnv;

    expect(normalizarDatabaseUrlNoAmbiente(env)).toBe(true);
    expect(env.DATABASE_URL).toBe(URL_BOA);
  });

  it('não avisa quando não havia nada para corrigir', () => {
    const env = { DATABASE_URL: URL_BOA } as NodeJS.ProcessEnv;

    expect(normalizarDatabaseUrlNoAmbiente(env)).toBe(false);
    expect(env.DATABASE_URL).toBe(URL_BOA);
  });

  it('não quebra quando a variável não existe', () => {
    const env = {} as NodeJS.ProcessEnv;

    expect(normalizarDatabaseUrlNoAmbiente(env)).toBe(false);
    expect(env.DATABASE_URL).toBeUndefined();
  });
});
