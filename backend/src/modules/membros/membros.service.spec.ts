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
    create: jest.Mock;
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
        create: jest.fn(),
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
        data: { donoId, userId: alvo.id, papel: 'VISUALIZADOR' },
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
});
