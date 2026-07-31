import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PagamentosService } from './pagamentos.service';
import { PrismaService } from '../../database/prisma.service';

type PrismaMock = {
  pagamento: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    createMany: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  morador: { findUnique: jest.Mock; findMany: jest.Mock };
};

describe('PagamentosService', () => {
  let service: PagamentosService;
  let prisma: PrismaMock;

  const ownerId = 1;
  const kitnet = { id: 10, userId: ownerId };
  const morador = { id: 20, kitnetId: kitnet.id, kitnet };
  const pagamento = { id: 30, valor: 900, vencimento: new Date('2026-07-10'), pago: false, moradorId: morador.id, morador };

  beforeEach(() => {
    prisma = {
      pagamento: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        createMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      morador: { findUnique: jest.fn(), findMany: jest.fn() },
    };

    service = new PagamentosService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('throws NotFoundException when the morador does not exist', async () => {
      prisma.morador.findUnique.mockResolvedValue(null);

      await expect(
        service.create(ownerId, { valor: 900, vencimento: '2026-07-10', moradorId: 999 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException when the morador belongs to another user', async () => {
      prisma.morador.findUnique.mockResolvedValue({ ...morador, kitnet: { ...kitnet, userId: 2 } });

      await expect(
        service.create(ownerId, { valor: 900, vencimento: '2026-07-10', moradorId: morador.id }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('creates the pagamento converting vencimento to a Date', async () => {
      prisma.morador.findUnique.mockResolvedValue(morador);
      prisma.pagamento.create.mockResolvedValue(pagamento);

      await service.create(ownerId, { valor: 900, vencimento: '2026-07-10', moradorId: morador.id });

      expect(prisma.pagamento.create).toHaveBeenCalledWith({
        data: { valor: 900, vencimento: new Date('2026-07-10'), pago: false, moradorId: morador.id },
      });
    });
  });

  describe('ensureCurrentMonthPagamentos', () => {
    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date('2026-07-15T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('does nothing when the user has no moradores', async () => {
      prisma.morador.findMany.mockResolvedValue([]);

      await service.ensureCurrentMonthPagamentos(ownerId);

      expect(prisma.pagamento.createMany).not.toHaveBeenCalled();
    });

    it('skips moradores that already have a pagamento this month (single query, no separate lookup)', async () => {
      prisma.morador.findMany.mockResolvedValue([
        { id: morador.id, kitnetId: kitnet.id, kitnet, diaVencimento: 10, pagamentos: [{ id: 99 }] },
      ]);

      await service.ensureCurrentMonthPagamentos(ownerId);

      expect(prisma.morador.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.pagamento.findMany).not.toHaveBeenCalled();
      expect(prisma.pagamento.createMany).not.toHaveBeenCalled();
    });

    it('creates a pagamento for moradores without one this month', async () => {
      prisma.morador.findMany.mockResolvedValue([
        { id: morador.id, kitnetId: kitnet.id, kitnet: { ...kitnet, valor: 900 }, diaVencimento: 10, pagamentos: [] },
      ]);

      await service.ensureCurrentMonthPagamentos(ownerId);

      expect(prisma.pagamento.createMany).toHaveBeenCalledWith({
        data: [{ moradorId: morador.id, valor: 900, vencimento: new Date(Date.UTC(2026, 6, 10)) }],
      });
    });
  });

  describe('findOwnedOrThrow', () => {
    it('throws NotFoundException when the pagamento does not exist', async () => {
      prisma.pagamento.findUnique.mockResolvedValue(null);

      await expect(service.findOwnedOrThrow(ownerId, 999)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException when the pagamento belongs to another user', async () => {
      prisma.pagamento.findUnique.mockResolvedValue({ ...pagamento, morador: { ...morador, kitnet: { ...kitnet, userId: 2 } } });

      await expect(service.findOwnedOrThrow(ownerId, pagamento.id)).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
