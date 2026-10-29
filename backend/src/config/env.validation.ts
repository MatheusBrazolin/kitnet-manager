/**
 * Confere as variáveis de ambiente antes de qualquer módulo subir.
 *
 * Motivo concreto: a API ficou fora do ar em produção e *toda* rota respondia
 * `FUNCTION_INVOCATION_FAILED` — inclusive rotas inexistentes, porque o processo
 * morria antes de rotear. O log trazia um `TypeError: JwtStrategy requires a
 * secret or key` vindo de dentro do passport-jwt: verdadeiro, mas não diz a quem
 * lê que faltava `JWT_SECRET` no painel da Vercel. Na tela, o usuário via
 * "verifique suas credenciais" e desconfiava da própria senha.
 *
 * Então a checagem acontece aqui, cedo e de uma vez só: lista tudo que falta
 * numa mensagem só (em vez de o app morrer na primeira), e diz onde arrumar.
 */

/** Curto demais para assinar JWT: trivial de quebrar por força bruta. */
const TAMANHO_MINIMO_SEGREDO = 16;

const OBRIGATORIAS: Array<{ nome: string; paraQue: string }> = [
  { nome: 'DATABASE_URL', paraQue: 'conexão com o PostgreSQL' },
  { nome: 'JWT_SECRET', paraQue: 'assinatura dos tokens de login' },
];

export function validarEnv(config: Record<string, unknown>) {
  const problemas: string[] = [];

  for (const { nome, paraQue } of OBRIGATORIAS) {
    const valor = config[nome];
    // String vazia conta como ausente: `JWT_SECRET=` no painel passa por
    // "definida" em qualquer checagem de existência, e foi assim que o app
    // morreu lá dentro do passport em vez de avisar aqui.
    if (typeof valor !== 'string' || valor.trim() === '') {
      problemas.push(`  - ${nome} não está definida (${paraQue})`);
    }
  }

  const segredo = config.JWT_SECRET;
  if (
    typeof segredo === 'string' &&
    segredo.trim() !== '' &&
    segredo.length < TAMANHO_MINIMO_SEGREDO
  ) {
    problemas.push(
      `  - JWT_SECRET tem ${segredo.length} caracteres; use pelo menos ${TAMANHO_MINIMO_SEGREDO}`,
    );
  }

  if (problemas.length > 0) {
    throw new Error(
      [
        '',
        'A API não pode subir por causa da configuração de ambiente:',
        '',
        ...problemas,
        '',
        'Onde arrumar:',
        '  - local: no arquivo backend/.env (veja backend/.env.example)',
        '  - Vercel: Settings -> Environment Variables, marcando o ambiente Production',
        '',
      ].join('\n'),
    );
  }

  return config;
}
