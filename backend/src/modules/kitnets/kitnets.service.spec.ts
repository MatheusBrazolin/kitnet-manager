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
  kitnetValorHistorico: { findMany: jest.Mock; create: jest.Mock };
  imovel: { findUnique: jest.Mock };
  gasto: { findMany: jest.Mock };
  $transaction: jest.Mock;
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
    createdAt: new Date('2026-01-01'),
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
      kitnetValorHistorico: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn() },
      imovel: { findUnique: jest.fn().mockResolvedValue({ id: imovelId, userId: ownerId }) },
      gasto: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn((operations: Promise<unknown>[]) => Promise.all(operations)),
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

    it('also creates the first historicoValor entry, vigente since the kitnet was created', async () => {
      prisma.kitnet.create.mockResolvedValue(kitnet);

      await service.create(ownerId, { numero: '01', valor: 900, imovelId });

      expect(prisma.kitnetValorHistorico.create).toHaveBeenCalledWith({
        data: { kitnetId: kitnet.id, valor: kitnet.valor, vigenteDesde: kitnet.createdAt },
      });
    });
  });

  describe('update', () => {
    it('creates a new historicoValor entry when valor changes', async () => {
      prisma.kitnet.findUnique.mockResolvedValue(kitnet);
      prisma.kitnet.update.mockResolvedValue({ ...kitnet, valor: 1000 });

      const result = await service.update(ownerId, kitnet.id, { valor: 1000 });

      expect(prisma.kitnetValorHistorico.create).toHaveBeenCalledWith({
        data: { kitnetId: kitnet.id, valor: 1000 },
      });
      expect(prisma.kitnet.update).toHaveBeenCalledWith({ where: { id: kitnet.id }, data: { valor: 1000 } });
      expect(result).toEqual({ ...kitnet, valor: 1000 });
    });

    it('does not touch historicoValor when valor is unchanged (e.g. only editing numero)', async () => {
      prisma.kitnet.findUnique.mockResolvedValue(kitnet);
      prisma.kitnet.update.mockResolvedValue({ ...kitnet, numero: '02' });

      await service.update(ownerId, kitnet.id, { numero: '02' });

      expect(prisma.kitnetValorHistorico.create).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('does not touch historicoValor when valor is sent but equal to the current one', async () => {
      prisma.kitnet.findUnique.mockResolvedValue(kitnet);
      prisma.kitnet.update.mockResolvedValue(kitnet);

      await service.update(ownerId, kitnet.id, { valor: kitnet.valor });

      expect(prisma.kitnetValorHistorico.create).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException before writing when the kitnet is not owned', async () => {
      prisma.kitnet.findUnique.mockResolvedValue({ ...kitnet, userId: 2 });

      await expect(service.update(ownerId, kitnet.id, { valor: 1000 })).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.kitnet.update).not.toHaveBeenCalled();
      expect(prisma.kitnetValorHistorico.create).not.toHaveBeenCalled();
    });
  });

  describe('findDetail', () => {
    it('includes historicoValor ordered by vigenteDesde desc, alongside gastos/totalGasto', async () => {
      prisma.kitnet.findUnique.mockResolvedValue(kitnet);
      prisma.gasto.findMany.mockResolvedValue([{ id: 1, valor: 50 }]);
      const historico = [
        { id: 2, valor: 1000, vigenteDesde: new Date('2026-06-01') },
        { id: 1, valor: 900, vigenteDesde: new Date('2026-01-01') },
      ];
      prisma.kitnetValorHistorico.findMany.mockResolvedValue(historico);

      const result = await service.findDetail(ownerId, kitnet.id);

      expect(prisma.kitnetValorHistorico.findMany).toHaveBeenCalledWith({
        where: { kitnetId: kitnet.id },
        orderBy: { vigenteDesde: 'desc' },
      });
      expect(result.historicoValor).toEqual(historico);
      expect(result.totalGasto).toBe(50);
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
