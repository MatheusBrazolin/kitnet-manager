import { PrismaClient } from '@prisma/client';

/**
 * Apaga as contas `@example.com` deixadas pelas execuções antigas dos testes e2e,
 * de antes de os specs passarem a limpar o que criam (ver `test/usuarios-criados.ts`).
 *
 * É um `deleteMany` por padrão de e-mail, que é justamente o que os testes NÃO fazem:
 * aqui vale porque é uma faxina manual, feita uma vez, com a pessoa olhando — e não
 * algo que roda junto com outra execução de teste. Rode com o banco parado de testes.
 *
 * Duas travas, nesta ordem:
 *  1. recusa qualquer DATABASE_URL que não seja localhost/127.0.0.1;
 *  2. por padrão só conta o que apagaria. Para apagar de verdade é preciso `--confirmar`.
 *
 *   npm run db:limpar-residuo-testes              # só mostra o que seria apagado
 *   npm run db:limpar-residuo-testes -- --confirmar
 */

const HOSTS_PERMITIDOS = new Set(['localhost', '127.0.0.1', '::1']);
const PADRAO_EMAIL = '@example.com';

function exigirBancoLocal(url: string | undefined) {
  if (!url) {
    throw new Error('DATABASE_URL não está definida — nada a fazer.');
  }

  // `URL.hostname` devolve endereço IPv6 entre colchetes (`[::1]`), e ainda normaliza
  // a forma longa: `[0:0:0:0:0:0:0:1]` também vira `[::1]`. Sem tirar os colchetes, a
  // allowlist nunca casa e o script recusa um banco local legítimo.
  const host = new URL(url).hostname.replace(/^\[(.+)\]$/, '$1');
  if (!HOSTS_PERMITIDOS.has(host)) {
    throw new Error(
      `Recusando rodar: DATABASE_URL aponta para "${host}", que não é um banco local. ` +
        'Este script só existe para o banco de desenvolvimento.',
    );
  }
  return host;
}

async function main() {
  // Sem Nest aqui, então ninguém carregou o .env por nós.
  try {
    process.loadEnvFile('.env');
  } catch {
    // Sem arquivo .env: seguimos com o que já estiver no ambiente.
  }

  const host = exigirBancoLocal(process.env.DATABASE_URL);
  const confirmado = process.argv.includes('--confirmar');

  const prisma = new PrismaClient();
  try {
    const where = { email: { endsWith: PADRAO_EMAIL } };
    const usuarios = await prisma.user.count({ where });

    // Contados antes de apagar só para a pessoa ver o tamanho do estrago; a exclusão
    // em si é só do User — o resto some por cascata (ver test/usuarios-criados.ts).
    const alvos = await prisma.user.findMany({ where, select: { id: true } });
    const ids = alvos.map((u) => u.id);
    const [imoveis, kitnets, imobiliarias] = await Promise.all([
      prisma.imovel.count({ where: { userId: { in: ids } } }),
      prisma.kitnet.count({ where: { userId: { in: ids } } }),
      prisma.imobiliaria.count({ where: { userId: { in: ids } } }),
    ]);

    console.log(`Banco: ${host} (${PADRAO_EMAIL})`);
    console.log(
      `  ${usuarios} usuários, ${imoveis} imóveis, ${kitnets} kitnets, ${imobiliarias} imobiliárias`,
    );

    if (usuarios === 0) {
      console.log('Nada a limpar.');
      return;
    }

    if (!confirmado) {
      console.log(
        '\nNada foi apagado. Para apagar de verdade:\n' +
          '  npm run db:limpar-residuo-testes -- --confirmar',
      );
      return;
    }

    const { count } = await prisma.user.deleteMany({ where });
    console.log(`\n${count} usuários apagados (e tudo que pendurava neles).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((erro: unknown) => {
  console.error(erro instanceof Error ? erro.message : erro);
  process.exitCode = 1;
});
