import { BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import { RecuperacaoService } from './recuperacao.service';
import { PrismaService } from '../../database/prisma.service';
import { EmailService } from '../../common/email/email.service';

const BASE_URL = 'https://app.exemplo.com';

function hashDoToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

describe('RecuperacaoService', () => {
  let service: RecuperacaoService;
  let prisma: {
    user: { findUnique: jest.Mock; update: jest.Mock };
    tokenRecuperacao: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let email: { enviar: jest.Mock };

  const user = { id: 1, nome: 'Ana', name: 'Ana', email: 'ana@exemplo.com' };

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn(), update: jest.fn() },
      tokenRecuperacao: {
        findUnique: jest.fn(),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      $transaction: jest.fn().mockResolvedValue([]),
    };
    email = { enviar: jest.fn().mockResolvedValue(true) };
    service = new RecuperacaoService(
      prisma as unknown as PrismaService,
      email as unknown as EmailService,
    );
  });

  describe('solicitar', () => {
    // Se esta rota se comportasse diferente para e-mail cadastrado e não cadastrado,
    // viraria um verificador de cadastro: dá pra descobrir quem tem conta testando
    // endereços. Por isso o silêncio quando não existe.
    it('não manda e-mail nem cria token para e-mail que não existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await service.solicitar('ninguem@exemplo.com', BASE_URL);

      expect(email.enviar).not.toHaveBeenCalled();
      expect(prisma.tokenRecuperacao.create).not.toHaveBeenCalled();
    });

    it('guarda o hash do token, nunca o token em claro', async () => {
      prisma.user.findUnique.mockResolvedValue(user);

      await service.solicitar(user.email, BASE_URL);

      const [[args]] = prisma.tokenRecuperacao.create.mock.calls as [
        [{ data: { tokenHash: string } }],
      ];
      const [[enviado]] = email.enviar.mock.calls as [[{ texto: string }]];
      const tokenDoLink = /token=([a-f0-9]+)/.exec(enviado.texto)?.[1];

      expect(tokenDoLink).toBeDefined();
      // O que foi para o banco é o hash do que foi para o e-mail — e não o próprio.
      expect(args.data.tokenHash).toBe(hashDoToken(tokenDoLink as string));
      expect(args.data.tokenHash).not.toBe(tokenDoLink);
    });

    // Com vários links válidos ao mesmo tempo, basta um e-mail antigo vazar para a
    // conta continuar aberta mesmo depois de a pessoa ter pedido um link novo.
    it('invalida os pedidos anteriores ao criar um novo', async () => {
      prisma.user.findUnique.mockResolvedValue(user);

      await service.solicitar(user.email, BASE_URL);

      expect(prisma.tokenRecuperacao.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: user.id, usadoEm: null },
        }),
      );
    });

    it('monta o link apontando para a URL do app recebida', async () => {
      prisma.user.findUnique.mockResolvedValue(user);

      await service.solicitar(user.email, BASE_URL);

      const [[enviado]] = email.enviar.mock.calls as [[{ texto: string }]];
      expect(enviado.texto).toContain(`${BASE_URL}/redefinir-senha?token=`);
    });

    // Sem provedor configurado o envio falha; o fluxo não pode explodir por isso, ou o
    // 500 revelaria que aquele e-mail existe.
    it('não lança quando o envio falha', async () => {
      prisma.user.findUnique.mockResolvedValue(user);
      email.enviar.mockResolvedValue(false);

      await expect(
        service.solicitar(user.email, BASE_URL),
      ).resolves.toBeUndefined();
    });
  });

  describe('redefinir', () => {
    const futuro = () => new Date(Date.now() + 60_000);
    const passado = () => new Date(Date.now() - 60_000);

    it('troca a senha e marca o token como usado, na mesma transação', async () => {
      prisma.tokenRecuperacao.findUnique.mockResolvedValue({
        id: 9,
        userId: user.id,
        usadoEm: null,
        expiraEm: futuro(),
        user,
      });

      await service.redefinir('qualquer', 'SenhaNova123');

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      const [[operacoes]] = prisma.$transaction.mock.calls as [[unknown[]]];
      expect(operacoes).toHaveLength(2);
    });

    it('grava hash e passwordChangedAt, nunca a senha em texto', async () => {
      prisma.tokenRecuperacao.findUnique.mockResolvedValue({
        id: 9,
        userId: user.id,
        usadoEm: null,
        expiraEm: futuro(),
        user,
      });

      await service.redefinir('qualquer', 'SenhaNova123');

      const [[args]] = prisma.user.update.mock.calls as [
        [{ data: { password: string; passwordChangedAt: Date } }],
      ];
      expect(args.data.password).not.toBe('SenhaNova123');
      await expect(
        bcrypt.compare('SenhaNova123', args.data.password),
      ).resolves.toBe(true);
      // Derruba as sessões abertas: se a conta foi invadida, redefinir a senha precisa
      // expulsar quem estava dentro.
      expect(args.data.passwordChangedAt).toBeInstanceOf(Date);
    });

    it('recusa token inexistente', async () => {
      prisma.tokenRecuperacao.findUnique.mockResolvedValue(null);
      await expect(
        service.redefinir('x', 'SenhaNova123'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('recusa token já usado', async () => {
      prisma.tokenRecuperacao.findUnique.mockResolvedValue({
        id: 9,
        userId: 1,
        usadoEm: new Date(),
        expiraEm: futuro(),
        user,
      });
      await expect(
        service.redefinir('x', 'SenhaNova123'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('recusa token vencido', async () => {
      prisma.tokenRecuperacao.findUnique.mockResolvedValue({
        id: 9,
        userId: 1,
        usadoEm: null,
        expiraEm: passado(),
        user,
      });
      await expect(
        service.redefinir('x', 'SenhaNova123'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    // Separar "não existe" de "já usado" de "vencido" diria a quem está tentando
    // adivinhar quais tokens chegaram a existir.
    it('usa a mesma mensagem para os três casos inválidos', async () => {
      const mensagens: string[] = [];
      for (const registro of [
        null,
        { id: 9, userId: 1, usadoEm: new Date(), expiraEm: futuro(), user },
        { id: 9, userId: 1, usadoEm: null, expiraEm: passado(), user },
      ]) {
        prisma.tokenRecuperacao.findUnique.mockResolvedValue(registro);
        await service.redefinir('x', 'SenhaNova123').catch((e: Error) => {
          mensagens.push(e.message);
        });
      }
      expect(new Set(mensagens).size).toBe(1);
    });
  });

  describe('conferir', () => {
    it('aceita token válido e recusa usado ou vencido', async () => {
      prisma.tokenRecuperacao.findUnique.mockResolvedValue({
        usadoEm: null,
        expiraEm: new Date(Date.now() + 60_000),
      });
      await expect(service.conferir('x')).resolves.toBe(true);

      prisma.tokenRecuperacao.findUnique.mockResolvedValue({
        usadoEm: new Date(),
        expiraEm: new Date(Date.now() + 60_000),
      });
      await expect(service.conferir('x')).resolves.toBe(false);

      prisma.tokenRecuperacao.findUnique.mockResolvedValue({
        usadoEm: null,
        expiraEm: new Date(Date.now() - 1),
      });
      await expect(service.conferir('x')).resolves.toBe(false);
    });
  });
});
