import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { GastosService } from './gastos.service';
import { PrismaService } from '../../database/prisma.service';

type PrismaMock = {
  gasto: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    count: jest.Mock;
  };
  kitnet: { findUnique: jest.Mock };
};

describe('GastosService', () => {
  let service: GastosService;
  let prisma: PrismaMock;

  const ownerId = 1;
  const kitnet = { id: 10, userId: ownerId };
  const gasto = {
    id: 30,
    descricao: 'Pintura',
    valor: 300,
    data: new Date('2026-08-01'),
    kitnetId: kitnet.id,
    kitnet,
  };

  beforeEach(() => {
    prisma = {
      gasto: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      kitnet: { findUnique: jest.fn() },
    };

    service = new GastosService(prisma as unknown as PrismaService);
  });

  describe('findAll', () => {
    it('returns the plain array when no pagination params are given', async () => {
      prisma.gasto.findMany.mockResolvedValue([gasto]);

      const result = await service.findAll(ownerId);

      const [callArgs] = prisma.gasto.findMany.mock.calls[0] as [
        Record<string, unknown>,
      ];
      expect(callArgs).not.toHaveProperty('skip');
      expect(callArgs).not.toHaveProperty('take');
      expect(prisma.gasto.count).not.toHaveBeenCalled();
      expect(result).toEqual([gasto]);
    });

    it('returns a paginated envelope when page/limit are given', async () => {
      prisma.gasto.findMany.mockResolvedValue([gasto]);
      prisma.gasto.count.mockResolvedValue(5);

      const result = await service.findAll(ownerId, { page: 1, limit: 20 });

      expect(prisma.gasto.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
      expect(result).toEqual({
        data: [gasto],
        total: 5,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });
  });

  describe('create', () => {
    it('throws NotFoundException when the kitnet does not exist', async () => {
      prisma.kitnet.findUnique.mockResolvedValue(null);

      await expect(
        service.create(ownerId, {
          descricao: 'Pintura',
          valor: 300,
          data: '2026-08-01',
          kitnetId: 999,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException when the kitnet belongs to another user', async () => {
      prisma.kitnet.findUnique.mockResolvedValue({ ...kitnet, userId: 2 });

      await expect(
        service.create(ownerId, {
          descricao: 'Pintura',
          valor: 300,
          data: '2026-08-01',
          kitnetId: kitnet.id,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('creates the gasto when the kitnet belongs to the user', async () => {
      prisma.kitnet.findUnique.mockResolvedValue(kitnet);
      prisma.gasto.create.mockResolvedValue(gasto);

      const result = await service.create(ownerId, {
        descricao: 'Pintura',
        valor: 300,
        data: '2026-08-01',
        kitnetId: kitnet.id,
      });

      expect(result).toEqual(gasto);
    });
  });

  describe('remove', () => {
    it('throws ForbiddenException and does not delete when the gasto belongs to another user', async () => {
      prisma.gasto.findUnique.mockResolvedValue({
        ...gasto,
        kitnet: { ...kitnet, userId: 2 },
      });

      await expect(service.remove(ownerId, gasto.id)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.gasto.delete).not.toHaveBeenCalled();
    });

    it('deletes the gasto when it belongs to the user', async () => {
      prisma.gasto.findUnique.mockResolvedValue(gasto);

      await service.remove(ownerId, gasto.id);

      expect(prisma.gasto.delete).toHaveBeenCalledWith({
        where: { id: gasto.id },
      });
    });
  });
});
