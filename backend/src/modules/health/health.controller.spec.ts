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
