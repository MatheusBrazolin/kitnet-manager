import { HttpException } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaService } from '../../database/prisma.service';

/** Erro do Prisma como ele chega na prática: código numa propriedade do objeto. */
function erroPrisma(errorCode: string, message: string) {
  return Object.assign(new Error(message), {
    name: 'PrismaClientInitializationError',
    errorCode,
  });
}

function controllerComUpsert(upsert: jest.Mock) {
  const prisma = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    atividadeBanco: { upsert },
  };
  return new HealthController(prisma as unknown as PrismaService);
}

function controllerQueFalhaCom(erro: unknown) {
  const prisma = { $queryRaw: jest.fn().mockRejectedValue(erro) };
  return new HealthController(prisma as unknown as PrismaService);
}

async function corpoDoErro(controller: HealthController) {
  try {
    await controller.check();
    throw new Error('era pra ter lançado');
  } catch (erro) {
    return (erro as HttpException).getResponse() as Record<string, string>;
  }
}

describe('HealthController', () => {
  it('responde ok quando o banco atende', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    };
    const controller = new HealthController(prisma as unknown as PrismaService);

    await expect(controller.check()).resolves.toMatchObject({
      status: 'ok',
      database: 'up',
    });
  });

  // "PrismaClientInitializationError" cobre tanto banco pausado quanto senha errada, e
  // as duas pedem ações opostas: despausar o projeto ou trocar a credencial. Sem
  // distinguir, quem lê o /health fica tão sem saber quanto antes.
  it('distingue banco inalcançável de credencial recusada', async () => {
    const inalcancavel = await corpoDoErro(
      controllerQueFalhaCom(
        erroPrisma(
          'P1001',
          "Can't reach database server at `db.x.supabase.co:5432`",
        ),
      ),
    );
    expect(inalcancavel.causa).toBe('inalcancavel');
    expect(inalcancavel.dica).toMatch(/pausado|host/i);

    const credenciais = await corpoDoErro(
      controllerQueFalhaCom(
        erroPrisma('P1000', 'Authentication failed against database server'),
      ),
    );
    expect(credenciais.causa).toBe('credenciais');
  });

  it('reconhece a causa pela mensagem quando não vem código', async () => {
    const corpo = await corpoDoErro(
      controllerQueFalhaCom(
        new Error("Can't reach database server at `host:5432`"),
      ),
    );
    expect(corpo.causa).toBe('inalcancavel');
  });

  // A rota é pública: a mensagem do Prisma traz host e porta do banco, e isso não pode
  // sair na resposta. Fica só no log do servidor.
  it('não vaza host nem porta do banco na resposta', async () => {
    const corpo = await corpoDoErro(
      controllerQueFalhaCom(
        erroPrisma(
          'P1001',
          "Can't reach database server at `db.segredo123.supabase.co:5432`",
        ),
      ),
    );
    const serializado = JSON.stringify(corpo);
    expect(serializado).not.toContain('segredo123');
    expect(serializado).not.toContain('supabase.co');
    expect(serializado).not.toContain('5432');
  });

  it('não inventa causa para erro desconhecido', async () => {
    const corpo = await corpoDoErro(controllerQueFalhaCom(new Error('vish')));
    expect(corpo.causa).toBe('Error');
    expect(corpo.database).toBe('down');
  });
});

describe('HealthController: marca de atividade', () => {
  /**
   * O bug que este teste existe para impedir: com `@updatedAt` no schema e um
   * `update: {}` vazio, o Prisma não emite escrita nenhuma — o endpoint respondia 200
   * e o carimbo ficava parado. Tudo "funcionava", e o banco seria pausado do mesmo
   * jeito, que é justamente o que esta rota existe para evitar.
   */
  it('manda uma data explícita no update, não um objeto vazio', async () => {
    const upsert = jest
      .fn()
      .mockResolvedValue({ id: 1, atualizadoEm: new Date() });
    const controller = controllerComUpsert(upsert);

    await controller.registrarAtividade();

    const [[args]] = upsert.mock.calls as [
      [{ update: { atualizadoEm?: Date }; create: { atualizadoEm?: Date } }],
    ];
    expect(args.update.atualizadoEm).toBeInstanceOf(Date);
    expect(args.create.atualizadoEm).toBeInstanceOf(Date);
  });

  // Sempre a mesma linha: a tabela não pode crescer a cada ping, nem deixar registro
  // fictício para limpar depois.
  it('sobrescreve sempre a linha de id 1', async () => {
    const upsert = jest
      .fn()
      .mockResolvedValue({ id: 1, atualizadoEm: new Date() });
    await controllerComUpsert(upsert).registrarAtividade();

    const [[args]] = upsert.mock.calls as [[{ where: { id: number } }]];
    expect(args.where).toEqual({ id: 1 });
  });
});

describe('HealthController: integrações configuradas', () => {
  const ambienteOriginal = { ...process.env };

  afterEach(() => {
    process.env = { ...ambienteOriginal };
  });

  function controllerSaudavel() {
    const prisma = { $queryRaw: jest.fn().mockResolvedValue([]) };
    return new HealthController(prisma as unknown as PrismaService);
  }

  it('diz que o e-mail está desligado quando falta a chave', async () => {
    delete process.env.RESEND_API_KEY;

    const resposta = (await controllerSaudavel().check()) as {
      integracoes: { email: boolean };
    };

    expect(resposta.integracoes.email).toBe(false);
  });

  it('diz que o e-mail está ligado quando a chave existe', async () => {
    process.env.RESEND_API_KEY = 're_chave_de_teste_123';

    const resposta = (await controllerSaudavel().check()) as {
      integracoes: { email: boolean };
    };

    expect(resposta.integracoes.email).toBe(true);
  });

  // A rota é pública: um booleano não ajuda ninguém a invadir nada, a chave sim.
  it('nunca devolve o valor da chave, nem um pedaço dele', async () => {
    process.env.RESEND_API_KEY = 're_chave_de_teste_123';
    process.env.SENTRY_DSN = 'https://abc123@o999.ingest.sentry.io/1';

    const resposta = await controllerSaudavel().check();

    const serializado = JSON.stringify(resposta);
    expect(serializado).not.toContain('re_chave_de_teste_123');
    expect(serializado).not.toContain('o999.ingest.sentry.io');
    expect(serializado).not.toContain('abc123');
  });
});
