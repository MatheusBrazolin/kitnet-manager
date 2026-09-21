import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { MembrosService } from './membros.service';
import { PrismaService } from '../../database/prisma.service';

type PrismaMock = {
  membro: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  user: { findUnique: jest.Mock };
  imovel: { count: jest.Mock };
};

describe('MembrosService', () => {
  let service: MembrosService;
  let prisma: PrismaMock;

  const donoId = 1;
  const alvo = { id: 2, name: 'Ana', email: 'ana@example.com' };

  beforeEach(() => {
    prisma = {
      membro: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      user: { findUnique: jest.fn() },
      imovel: { count: jest.fn() },
    };
    service = new MembrosService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('throws BadRequestException when the e-mail does not match any user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.create(donoId, { email: 'nope@example.com', papel: 'GERENTE' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequestException when adding yourself', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: donoId });

      await expect(
        service.create(donoId, { email: 'me@example.com', papel: 'GERENTE' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws ConflictException when the target is already a member of another account', async () => {
      prisma.user.findUnique.mockResolvedValue(alvo);
      prisma.membro.findUnique.mockResolvedValue({
        donoId: 99,
        userId: alvo.id,
      });

      await expect(
        service.create(donoId, { email: alvo.email, papel: 'GERENTE' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws BadRequestException when the target already owns their own data', async () => {
      prisma.user.findUnique.mockResolvedValue(alvo);
      prisma.membro.findUnique.mockResolvedValue(null);
      prisma.imovel.count.mockResolvedValue(2);

      await expect(
        service.create(donoId, { email: alvo.email, papel: 'GERENTE' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.membro.create).not.toHaveBeenCalled();
    });

    it('creates the membership when everything checks out', async () => {
      prisma.user.findUnique.mockResolvedValue(alvo);
      prisma.membro.findUnique.mockResolvedValue(null);
      prisma.imovel.count.mockResolvedValue(0);
      prisma.membro.create.mockResolvedValue({
        id: 10,
        donoId,
        userId: alvo.id,
        papel: 'VISUALIZADOR',
      });

      const result = await service.create(donoId, {
        email: alvo.email,
        papel: 'VISUALIZADOR',
      });

      expect(prisma.membro.create).toHaveBeenCalledWith({
        data: {
          donoId,
          userId: alvo.id,
          papel: 'VISUALIZADOR',
          status: 'PENDENTE',
        },
        include: { user: { select: { id: true, name: true, email: true } } },
      });
      expect(result).toEqual({
        id: 10,
        donoId,
        userId: alvo.id,
        papel: 'VISUALIZADOR',
      });
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when the membership does not exist', async () => {
      prisma.membro.findUnique.mockResolvedValue(null);

      await expect(service.remove(donoId, 999)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when the membership belongs to another account', async () => {
      prisma.membro.findUnique.mockResolvedValue({ id: 10, donoId: 99 });

      await expect(service.remove(donoId, 10)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.membro.delete).not.toHaveBeenCalled();
    });

    it('removes the membership when owned by this account', async () => {
      prisma.membro.findUnique.mockResolvedValue({ id: 10, donoId });

      await service.remove(donoId, 10);

      expect(prisma.membro.delete).toHaveBeenCalledWith({ where: { id: 10 } });
    });
  });

  // O convite só passa a valer quando a pessoa aceita — ver ContaService.resolve.
  describe('fluxo de convite', () => {
    it('aceita o convite pendente, marcando status e data', async () => {
      prisma.membro.findFirst.mockResolvedValue({ id: 7, userId: alvo.id });
      prisma.imovel.count.mockResolvedValue(0);
      prisma.membro.update.mockResolvedValue({ id: 7, status: 'ACEITO' });

      await service.aceitarConvite(alvo.id);

      const [args] = prisma.membro.update.mock.calls as [
        [{ where: { id: number }; data: { status: string; aceitoEm: Date } }],
      ];
      expect(args[0].where).toEqual({ id: 7 });
      expect(args[0].data.status).toBe('ACEITO');
      expect(args[0].data.aceitoEm).toBeInstanceOf(Date);
    });

    it('recusa o aceite quando a pessoa já tem imóveis próprios', async () => {
      prisma.membro.findFirst.mockResolvedValue({ id: 7, userId: alvo.id });
      prisma.imovel.count.mockResolvedValue(2);

      await expect(service.aceitarConvite(alvo.id)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.membro.update).not.toHaveBeenCalled();
    });

    it('falha ao aceitar quando não há convite pendente', async () => {
      prisma.membro.findFirst.mockResolvedValue(null);

      await expect(service.aceitarConvite(alvo.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('recusar apaga a filiação pendente', async () => {
      prisma.membro.findFirst.mockResolvedValue({ id: 7 });

      await service.recusarConvite(alvo.id);

      expect(prisma.membro.delete).toHaveBeenCalledWith({ where: { id: 7 } });
    });

    // Antes só o dono podia desfazer a filiação — quem fosse adicionado ficava preso à
    // conta de outra pessoa, sem nenhuma saída.
    it('permite o próprio membro sair da conta', async () => {
      prisma.membro.findUnique.mockResolvedValue({ id: 9, userId: alvo.id });

      await service.sairDaConta(alvo.id);

      expect(prisma.membro.delete).toHaveBeenCalledWith({ where: { id: 9 } });
    });

    it('falha ao sair quando o usuário não é membro de ninguém', async () => {
      prisma.membro.findUnique.mockResolvedValue(null);

      await expect(service.sairDaConta(alvo.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
