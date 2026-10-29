import {
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Logger,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PrismaService } from '../../database/prisma.service';

/**
 * Rota de diagnóstico, pensada para ser lida de fora durante uma pane.
 *
 * Com o Prisma conectando preguiçosamente, esta rota responde mesmo com o banco
 * fora — que é o ponto: num incidente, a primeira pergunta é "a aplicação subiu
 * e o banco caiu, ou a aplicação nem subiu?". Antes as duas situações eram
 * indistinguíveis de fora, porque as duas davam erro em tudo.
 */
/**
 * Traduz a falha do banco numa causa acionável.
 *
 * `PrismaClientInitializationError` sozinho não serve: ele cobre tanto "o banco está
 * inalcançável" quanto "a senha está errada", e as duas pedem ações opostas — uma é
 * despausar/corrigir host, a outra é trocar credencial. Esta rota é pública, então a
 * mensagem crua do Prisma não pode ir junto: ela traz o host e a porta do banco. Daí a
 * classificação em rótulos fixos, com a mensagem inteira indo só para o log do servidor.
 */
function classificar(erro: unknown): { causa: string; dica: string } {
  const texto = erro instanceof Error ? erro.message : String(erro);
  const codigo = (erro as { errorCode?: string })?.errorCode;

  // P1001 / "can't reach": servidor não respondeu. Em Supabase no plano gratuito, a
  // causa mais comum é o projeto ter sido pausado por inatividade.
  if (codigo === 'P1001' || /can't reach database server/i.test(texto)) {
    return {
      causa: 'inalcancavel',
      dica: 'O banco não respondeu. Confira se o projeto não está pausado e se o host/porta da DATABASE_URL estão certos.',
    };
  }
  // P1000: o servidor respondeu e recusou as credenciais.
  if (codigo === 'P1000' || /authentication failed/i.test(texto)) {
    return {
      causa: 'credenciais',
      dica: 'O banco respondeu mas recusou usuário ou senha da DATABASE_URL.',
    };
  }
  if (codigo === 'P1003' || /does not exist/i.test(texto)) {
    return {
      causa: 'banco-inexistente',
      dica: 'Conectou no servidor, mas o banco indicado na DATABASE_URL não existe.',
    };
  }
  if (codigo === 'P1002' || /timed out/i.test(texto)) {
    return {
      causa: 'timeout',
      dica: 'A conexão estourou o tempo. Em serverless, costuma ser falta de pooler na DATABASE_URL.',
    };
  }
  return {
    causa: codigo ?? (erro instanceof Error ? erro.name : 'desconhecida'),
    dica: 'Veja o log do servidor para a mensagem completa.',
  };
}

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

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
      // A mensagem inteira só no log: ela traz host e porta do banco, e esta rota
      // é pública.
      this.logger.error(
        'Healthcheck não conseguiu falar com o banco',
        erro instanceof Error ? erro.stack : String(erro),
      );
      throw new HttpException(
        { ...base, status: 'error', database: 'down', ...classificar(erro) },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
  /**
   * Escrita periódica para o banco não ser pausado por inatividade.
   *
   * Rota separada do `GET /health` de propósito: healthcheck é leitura, e um GET que
   * escreve surpreende quem o chama — inclusive monitoradores externos, que costumam
   * bater de minuto em minuto.
   *
   * Sobrescreve sempre a mesma linha (`id: 1`), então a tabela nunca cresce e não há
   * registro fictício para limpar depois. Chamada pelo workflow
   * `manter-banco-ativo.yml`.
   *
   * Sem autenticação porque o agendador do GitHub não tem sessão; o dano possível é
   * reescrever um carimbo de data numa tabela que nenhuma tela lê. O throttle global
   * (60/min) já limita o abuso.
   */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('atividade')
  async registrarAtividade() {
    // Data explícita nos dois lados: é o que garante que uma escrita de verdade vá
    // ao banco. Ver o comentário em `AtividadeBanco` no schema.
    const agora = new Date();
    const marca = await this.prisma.atividadeBanco.upsert({
      where: { id: 1 },
      create: { id: 1, atualizadoEm: agora },
      update: { atualizadoEm: agora },
    });
    return { atualizadoEm: marca.atualizadoEm };
  }
}
