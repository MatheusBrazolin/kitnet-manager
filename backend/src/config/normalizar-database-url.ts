/**
 * Limpa a DATABASE_URL de restos de copiar-e-colar antes de qualquer um usá-la.
 *
 * A URL do banco é digitada à mão num painel web, em geral por alguém no meio de
 * uma troca de senha, com o app fora do ar e pressa. Os erros são sempre os
 * mesmos quatro, e todos produzem falhas que não se parecem em nada com a causa:
 *
 *   - espaço ou quebra de linha nas pontas, que o navegador leva junto na seleção
 *     — o banco recusa a senha e a mensagem diz "credenciais", mandando a pessoa
 *     procurar no lugar errado;
 *   - aspas nas pontas, porque o valor foi copiado de uma linha de `.env`;
 *   - `DATABASE_URL=` na frente, pelo mesmo motivo;
 *   - `<` e `>` sobrando de um modelo tipo `<SENHA>`.
 *
 * Nada disso é ambíguo: uma connection string válida nunca começa com aspas, com
 * `<`, nem com o próprio nome da variável. Então dá para corrigir em silêncio, em
 * vez de deixar o deploy falhar e a pessoa adivinhar qual dos quatro foi.
 *
 * Não valida a URL nem conserta senha errada — para isso existe o erro do Prisma,
 * já traduzido em `health.controller.ts`.
 */

/** Pares de delimitadores que nunca fazem parte de uma connection string. */
const ENVOLTORIOS: Array<[string, string]> = [
  ['"', '"'],
  ["'", "'"],
  ['<', '>'],
  ['`', '`'],
];

export function normalizarDatabaseUrl(bruto: string): string {
  let valor = bruto.trim();

  // `DATABASE_URL=...` colado inteiro, com ou sem aspas em volta depois.
  valor = valor.replace(/^DATABASE_URL\s*=\s*/i, '').trim();

  // Em laço: `"<url>"` tem duas camadas, e uma passada só deixaria a de dentro.
  let mudou = true;
  while (mudou) {
    mudou = false;
    for (const [abre, fecha] of ENVOLTORIOS) {
      if (
        valor.length >= 2 &&
        valor.startsWith(abre) &&
        valor.endsWith(fecha)
      ) {
        valor = valor.slice(1, -1).trim();
        mudou = true;
      }
    }
  }

  return valor;
}

/**
 * Aplica a limpeza em `process.env`, porque é de lá que o Prisma lê.
 *
 * Devolve `true` quando mudou alguma coisa, para quem chama poder registrar o
 * aviso. O valor em si nunca é registrado: ele contém a senha do banco.
 */
export function normalizarDatabaseUrlNoAmbiente(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const bruto = env.DATABASE_URL;
  if (typeof bruto !== 'string' || bruto === '') {
    return false;
  }

  const limpo = normalizarDatabaseUrl(bruto);
  if (limpo === bruto) {
    return false;
  }

  env.DATABASE_URL = limpo;
  return true;
}
