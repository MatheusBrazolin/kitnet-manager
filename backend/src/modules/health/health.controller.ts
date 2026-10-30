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
function classificar(erro: unknown): {
  causa: string;
  dica: string;
  codigoPrisma?: string | null;
} {
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
  // P1013 / erro de parse: a string em si está malformada — nem chegou a haver
  // tentativa de conexão. Em troca de senha é o caso mais comum, e o mais fácil de
  // produzir: sobrou o `<` e o `>` do modelo que se copiou, a linha veio com
  // `DATABASE_URL="` na frente, ou a senha tem um caractere que precisa de
  // percent-encoding (@ : / ? # % quebram a URL no lugar errado).
  if (
    codigo === 'P1013' ||
    /provided database string is invalid|error parsing connection string|must start with the protocol/i.test(
      texto,
    )
  ) {
    return {
      causa: 'string-invalida',
      dica: 'A DATABASE_URL está malformada — o banco nem chegou a ser procurado. Confira se ela começa em "postgresql://", se não sobrou "<", ">" ou aspas do modelo copiado, e se a senha não tem @ : / ? # ou % (esses precisam ser percent-encoded).',
    };
  }
  // Rede fechada por IPv6: a conexão direta do Supabase (db.<ref>.supabase.co) só
  // atende IPv6 sem o add-on pago, e boa parte dos runtimes sai por IPv4.
  if (/ENETUNREACH|EAI_AGAIN|getaddrinfo/i.test(texto)) {
    return {
      causa: 'rede',
      dica: 'Não foi possível resolver ou alcançar o host. Se a URL aponta para db.<ref>.supabase.co, troque pelo pooler (.pooler.supabase.com), que atende IPv4.',
    };
  }
  return {
    // O código do Prisma vai junto mesmo quando não há rótulo: ele é curto, não
    // vaza host nem senha, e é o suficiente para procurar na documentação. Sem
    // isso a resposta dizia "veja o log do servidor" — e em plano sem retenção de
    // log de erro, não há log para ver.
    causa: codigo ?? (erro instanceof Error ? erro.name : 'desconhecida'),
    codigoPrisma: codigo ?? null,
    dica: 'Causa não reconhecida. O código do Prisma acima identifica o caso na documentação.',
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
      // Quais integrações opcionais estão ligadas neste deploy.
      //
      // Existe porque elas falham em silêncio por design: sem RESEND_API_KEY o
      // EmailService registra "não enviado" no log e devolve sucesso, então a
      // recuperação de senha fica quebrada em produção sem ninguém perceber — nem
      // quem perdeu a senha, nem quem mantém o app. Daí um lugar de fora para
      // conferir, sem abrir o painel da Vercel.
      //
      // Só booleanos: nenhum valor de chave, nem prefixo dela, sai por esta rota,
      // que é pública. Saber que o envio de e-mail está ligado não ajuda um
      // atacante; a chave, sim.
      integracoes: {
        email: Boolean(process.env.RESEND_API_KEY),
        sentry: Boolean(process.env.SENTRY_DSN),
      },
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
