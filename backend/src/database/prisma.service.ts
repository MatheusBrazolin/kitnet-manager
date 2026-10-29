import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Cliente do Prisma como provider do Nest.
 *
 * Repare que **não** há `$connect()` no boot, e isso é de propósito. Tinha um
 * `onModuleInit` que conectava de cara; quando o banco não respondia, ele
 * lançava `P1001` durante a inicialização e derrubava o processo inteiro. Na
 * Vercel isso vira `FUNCTION_INVOCATION_FAILED` em *todas* as rotas — inclusive
 * `/api/health`, justamente a que serviria para descobrir que o problema era o
 * banco. O diagnóstico ficava impossível pelo lado de fora.
 *
 * O Prisma conecta sozinho na primeira query. Sem o connect adiantado, um banco
 * fora do ar passa a ser um 503 nas rotas que precisam dele, enquanto o resto
 * da aplicação continua de pé e o healthcheck consegue dizer o que houve.
 *
 * Em serverless isso ainda evita abrir conexão em requisição que nem toca o
 * banco, o que é o comportamento certo para função de vida curta.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
