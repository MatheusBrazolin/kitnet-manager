#!/usr/bin/env node
/**
 * Confere (e opcionalmente conserta) as somas de verificação das migrações.
 *
 * O Prisma guarda em `_prisma_migrations` o SHA-256 de cada arquivo no momento em que
 * o aplicou. Se o arquivo mudar depois — editado antes de commitar, recriado, ou
 * inserido à mão no SQL editor sem a soma certa — `migrate dev` e `migrate deploy`
 * passam a recusar a rodar.
 *
 * Isso importa porque a saída que o Prisma oferece nessa hora é
 * `prisma migrate reset`, que **apaga o banco inteiro**. Num banco de
 * desenvolvimento com dados semeados isso é um prejuízo; apontado para produção por
 * engano, é um desastre. Quando o esquema do banco já corresponde ao que as migrações
 * produzem, o conserto certo é só atualizar a soma — e é o que `--corrigir` faz.
 *
 * A trava que torna isso seguro: antes de corrigir qualquer coisa, o script confirma
 * que o banco bate com `schema.prisma`. Se não bater, a divergência pode ser real
 * (DDL que nunca foi aplicada), e aí reescrever a soma esconderia o problema em vez
 * de resolvê-lo — então ele se recusa e explica.
 *
 *   node scripts/conferir-migracoes.js              # só relata
 *   node scripts/conferir-migracoes.js --corrigir   # relata e conserta
 *
 * Para olhar produção, passe a URL na frente:
 *   DATABASE_URL="<url>" node scripts/conferir-migracoes.js
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');

const PASTA = path.join(__dirname, '..', 'prisma', 'migrations');
const SCHEMA = path.join(__dirname, '..', 'prisma', 'schema.prisma');
const corrigir = process.argv.includes('--corrigir');

function somaDoArquivo(nome) {
  const caminho = path.join(PASTA, nome, 'migration.sql');
  if (!fs.existsSync(caminho)) {
    return null;
  }
  return crypto.createHash('sha256').update(fs.readFileSync(caminho)).digest('hex');
}

/** O banco está exatamente como `schema.prisma` manda? */
function bancoBateComOSchema() {
  const saida = execFileSync(
    'npx',
    [
      'prisma',
      'migrate',
      'diff',
      '--from-schema-datasource',
      SCHEMA,
      '--to-schema-datamodel',
      SCHEMA,
      '--script',
    ],
    { encoding: 'utf8', cwd: path.join(__dirname, '..') },
  );
  return saida.includes('empty migration');
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const aplicadas = await prisma.$queryRawUnsafe(
      'SELECT migration_name, checksum, rolled_back_at FROM _prisma_migrations ORDER BY started_at',
    );

    const divergentes = [];
    const semArquivo = [];

    for (const m of aplicadas) {
      if (m.rolled_back_at) {
        continue;
      }
      const soma = somaDoArquivo(m.migration_name);
      if (soma === null) {
        semArquivo.push(m.migration_name);
      } else if (soma !== m.checksum) {
        divergentes.push({ nome: m.migration_name, soma });
      }
    }

    const noDisco = fs
      .readdirSync(PASTA, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
    const naoAplicadas = noDisco.filter(
      (nome) => !aplicadas.some((m) => m.migration_name === nome),
    );

    console.log(`${aplicadas.length} aplicadas, ${noDisco.length} no disco.`);

    if (semArquivo.length > 0) {
      // Não é o problema que este script resolve: o banco diz ter aplicado algo que
      // não existe mais no repositório, o que costuma ser branch trocada.
      console.log(
        `\n⚠ ${semArquivo.length} aplicada(s) sem arquivo correspondente:`,
      );
      semArquivo.forEach((n) => console.log(`  ${n}`));
    }

    if (naoAplicadas.length > 0) {
      console.log(`\n⚠ ${naoAplicadas.length} no disco ainda não aplicada(s):`);
      naoAplicadas.forEach((n) => console.log(`  ${n}`));
      console.log('  Rode `npx prisma migrate deploy`.');
    }

    if (divergentes.length === 0) {
      console.log('\n✅ Todas as somas de verificação conferem.');
      return;
    }

    console.log(`\n❌ ${divergentes.length} com soma divergente:`);
    divergentes.forEach((d) => console.log(`  ${d.nome}`));

    if (!corrigir) {
      console.log(
        '\nRode de novo com --corrigir para atualizar as somas, se o banco já estiver',
        '\ncom o esquema certo (o script confere isso antes de mexer em qualquer coisa).',
      );
      process.exitCode = 1;
      return;
    }

    if (!bancoBateComOSchema()) {
      console.error(
        '\n⛔ O banco NÃO corresponde ao schema.prisma, então a divergência pode ser real:',
        '\n   alguma DDL do arquivo talvez nunca tenha sido aplicada. Atualizar a soma',
        '\n   aqui esconderia isso. Investigue com:',
        '\n',
        '\n   npx prisma migrate diff --from-schema-datasource prisma/schema.prisma \\',
        '\n     --to-schema-datamodel prisma/schema.prisma --script',
      );
      process.exitCode = 1;
      return;
    }

    for (const d of divergentes) {
      await prisma.$executeRawUnsafe(
        'UPDATE _prisma_migrations SET checksum = $1 WHERE migration_name = $2',
        d.soma,
        d.nome,
      );
      console.log(`  corrigida: ${d.nome}`);
    }
    console.log('\n✅ Pronto. O banco não foi tocado — só o registro das somas.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
