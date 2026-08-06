import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { KitnetsService } from './kitnets.service';
import { PrismaService } from '../../database/prisma.service';

type PrismaMock = {
  kitnet: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    count: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  imovel: { findUnique: jest.Mock };
};

describe('KitnetsService', () => {
  let service: KitnetsService;
  let prisma: PrismaMock;

  const ownerId = 1;
  const imovelId = 100;
  const kitnet = {
    id: 10,
    numero: '01',
    valor: 900,
    status: 'vaga',
    userId: ownerId,
    imovelId,
    moradores: [],
  };

  beforeEach(() => {
    prisma = {
      kitnet: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      imovel: { findUnique: jest.fn().mockResolvedValue({ id: imovelId, userId: ownerId }) },
    };

    service = new KitnetsService(prisma as unknown as PrismaService);
  });

  describe('findOwnedOrThrow', () => {
    it('throws NotFoundException when the kitnet does not exist', async () => {
      prisma.kitnet.findUnique.mockResolvedValue(null);

      await expect(service.findOwnedOrThrow(ownerId, 999)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException when the kitnet belongs to another user', async () => {
      prisma.kitnet.findUnique.mockResolvedValue({ ...kitnet, userId: 2 });

      await expect(service.findOwnedOrThrow(ownerId, kitnet.id)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('returns the kitnet when owned by the user', async () => {
      prisma.kitnet.findUnique.mockResolvedValue(kitnet);

      await expect(service.findOwnedOrThrow(ownerId, kitnet.id)).resolves.toEqual(kitnet);
    });
  });

  describe('create', () => {
    it('throws ForbiddenException when the imóvel does not belong to the user', async () => {
      prisma.imovel.findUnique.mockResolvedValue({ id: imovelId, userId: 2 });

      await expect(service.create(ownerId, { numero: '04', valor: 900, imovelId })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.kitnet.create).not.toHaveBeenCalled();
    });

    it('creates the kitnet when the imóvel belongs to the user', async () => {
      prisma.kitnet.create.mockResolvedValue(kitnet);

      const result = await service.create(ownerId, { numero: '01', valor: 900, imovelId });

      expect(prisma.kitnet.create).toHaveBeenCalledWith({
        data: { numero: '01', valor: 900, imovelId, userId: ownerId },
      });
      expect(result).toEqual(kitnet);
    });
  });

  describe('remove', () => {
    it('throws ForbiddenException instead of deleting when not owned', async () => {
      prisma.kitnet.findUnique.mockResolvedValue({ ...kitnet, userId: 2 });

      await expect(service.remove(ownerId, kitnet.id)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.kitnet.delete).not.toHaveBeenCalled();
    });
  });
});
