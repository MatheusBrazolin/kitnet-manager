import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * Rota de diagnóstico, pensada para ser lida de fora durante uma pane.
 *
 * Com o Prisma conectando preguiçosamente, esta rota responde mesmo com o banco
 * fora — que é o ponto: num incidente, a primeira pergunta é "a aplicação subiu
 * e o banco caiu, ou a aplicação nem subiu?". Antes as duas situações eram
 * indistinguíveis de fora, porque as duas davam erro em tudo.
 */
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    const base = {
      status: 'ok',
      // Ajuda a responder "o deploy novo subiu mesmo?" sem abrir o painel.
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local',
      ambiente: process.env.NODE_ENV ?? 'development',
    };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { ...base, database: 'up' };
    } catch (erro) {
      // A causa vai no corpo porque é o que distingue "senha do banco errada"
      // de "banco inalcançável" de "migration faltando" — sem ela, quem está
      // de fora só sabe que algo no banco falhou.
      const causa =
        erro instanceof Error
          ? ((erro as { errorCode?: string }).errorCode ?? erro.name)
          : 'desconhecida';

      throw new HttpException(
        { ...base, status: 'error', database: 'down', causa },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
