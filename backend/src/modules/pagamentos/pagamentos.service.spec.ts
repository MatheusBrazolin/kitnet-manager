import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
  const kitnet = { id: 10, userId: ownerId, valor: 900 };
  const morador = { id: 20, kitnetId: kitnet.id, kitnet };
  const pagamento = {
    id: 30,
    valor: 900,
    mesReferencia: new Date(Date.UTC(2026, 6, 1)),
    vencimento: new Date('2026-07-10'),
    status: 'PENDENTE',
    dataPagamento: null,
    formaPagamento: null,
    moradorId: morador.id,
    morador,
  };

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

    it('creates the pagamento with mesReferencia derived from vencimento and status PENDENTE', async () => {
      prisma.morador.findUnique.mockResolvedValue(morador);
      prisma.pagamento.create.mockResolvedValue(pagamento);

      await service.create(ownerId, { valor: 900, vencimento: '2026-07-10', moradorId: morador.id });

      expect(prisma.pagamento.create).toHaveBeenCalledWith({
        data: {
          valor: 900,
          vencimento: new Date('2026-07-10'),
          mesReferencia: new Date(Date.UTC(2026, 6, 1)),
          status: 'PENDENTE',
          moradorId: morador.id,
        },
      });
    });

    it('translates a duplicate (moradorId, mesReferencia) into ConflictException', async () => {
      prisma.morador.findUnique.mockResolvedValue(morador);
      prisma.pagamento.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('unique constraint', { code: 'P2002', clientVersion: '6.19.3' }),
      );

      await expect(
        service.create(ownerId, { valor: 900, vencimento: '2026-07-10', moradorId: morador.id }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('ensurePagamentosParaMorador', () => {
    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date('2026-07-15T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('does nothing when every month already has a pagamento', async () => {
      prisma.pagamento.findMany.mockResolvedValue([{ mesReferencia: new Date(Date.UTC(2026, 6, 1)) }]);

      await service.ensurePagamentosParaMorador({
        id: morador.id,
        dataEntrada: new Date('2026-07-01'),
        diaVencimento: 10,
        kitnet: { valor: 900 },
      });

      expect(prisma.pagamento.createMany).not.toHaveBeenCalled();
    });

    it('backfills every missing month between dataEntrada and the current month', async () => {
      prisma.pagamento.findMany.mockResolvedValue([]);

      await service.ensurePagamentosParaMorador({
        id: morador.id,
        dataEntrada: new Date('2026-05-27'),
        diaVencimento: 27,
        kitnet: { valor: 900 },
      });

      expect(prisma.pagamento.createMany).toHaveBeenCalledWith({
        data: [
          {
            moradorId: morador.id,
            valor: 900,
            mesReferencia: new Date(Date.UTC(2026, 4, 1)),
            vencimento: new Date(Date.UTC(2026, 4, 27)),
            status: 'PENDENTE',
          },
          {
            moradorId: morador.id,
            valor: 900,
            mesReferencia: new Date(Date.UTC(2026, 5, 1)),
            vencimento: new Date(Date.UTC(2026, 5, 27)),
            status: 'PENDENTE',
          },
          {
            moradorId: morador.id,
            valor: 900,
            mesReferencia: new Date(Date.UTC(2026, 6, 1)),
            vencimento: new Date(Date.UTC(2026, 6, 27)),
            status: 'PENDENTE',
          },
        ],
        skipDuplicates: true,
      });
    });

    it('clamps diaVencimento to the last day of short months (e.g. 31 in February)', async () => {
      jest.setSystemTime(new Date('2026-02-15T12:00:00Z'));
      prisma.pagamento.findMany.mockResolvedValue([]);

      await service.ensurePagamentosParaMorador({
        id: morador.id,
        dataEntrada: new Date('2026-02-01'),
        diaVencimento: 31,
        kitnet: { valor: 900 },
      });

      expect(prisma.pagamento.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            mesReferencia: new Date(Date.UTC(2026, 1, 1)),
            vencimento: new Date(Date.UTC(2026, 1, 28)),
          }),
        ],
        skipDuplicates: true,
      });
    });
  });

  describe('marcarPago', () => {
    it('sets status PAGO with the given dataPagamento/formaPagamento', async () => {
      prisma.pagamento.findUnique.mockResolvedValue(pagamento);
      prisma.pagamento.update.mockResolvedValue({ ...pagamento, status: 'PAGO' });

      await service.marcarPago(ownerId, pagamento.id, { dataPagamento: '2026-07-27', formaPagamento: 'PIX' });

      expect(prisma.pagamento.update).toHaveBeenCalledWith({
        where: { id: pagamento.id },
        data: { status: 'PAGO', dataPagamento: new Date('2026-07-27'), formaPagamento: 'PIX' },
      });
    });

    it('defaults dataPagamento to today when not provided', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-07-27T10:00:00Z'));
      prisma.pagamento.findUnique.mockResolvedValue(pagamento);
      prisma.pagamento.update.mockResolvedValue({ ...pagamento, status: 'PAGO' });

      await service.marcarPago(ownerId, pagamento.id, {});

      expect(prisma.pagamento.update).toHaveBeenCalledWith({
        where: { id: pagamento.id },
        data: { status: 'PAGO', dataPagamento: new Date('2026-07-27T10:00:00Z'), formaPagamento: null },
      });
      jest.useRealTimers();
    });
  });

  describe('desfazerPagamento', () => {
    it('resets status to PENDENTE and clears dataPagamento/formaPagamento', async () => {
      prisma.pagamento.findUnique.mockResolvedValue({ ...pagamento, status: 'PAGO' });
      prisma.pagamento.update.mockResolvedValue(pagamento);

      await service.desfazerPagamento(ownerId, pagamento.id);

      expect(prisma.pagamento.update).toHaveBeenCalledWith({
        where: { id: pagamento.id },
        data: { status: 'PENDENTE', dataPagamento: null, formaPagamento: null },
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
