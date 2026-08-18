import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MoradoresService } from './moradores.service';
import { PrismaService } from '../../database/prisma.service';
import { PagamentosService } from '../pagamentos/pagamentos.service';

type PrismaMock = {
  morador: { findMany: jest.Mock; findUnique: jest.Mock; create: jest.Mock; update: jest.Mock; delete: jest.Mock; count: jest.Mock };
  kitnet: { findUnique: jest.Mock; update: jest.Mock };
};

describe('MoradoresService', () => {
  let service: MoradoresService;
  let prisma: PrismaMock;
  let pagamentosService: { ensurePagamentosParaMorador: jest.Mock };

  const ownerId = 1;
  const kitnet = { id: 10, userId: ownerId, status: 'vaga', valor: 900 };
  const morador = {
    id: 20,
    nome: 'João',
    telefone: '11999990000',
    kitnetId: kitnet.id,
    kitnet,
    dataEntrada: new Date('2026-07-01'),
    diaVencimento: 10,
  };

  beforeEach(() => {
    prisma = {
      morador: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      kitnet: { findUnique: jest.fn(), update: jest.fn() },
    };
    pagamentosService = { ensurePagamentosParaMorador: jest.fn() };

    service = new MoradoresService(prisma as unknown as PrismaService, pagamentosService as unknown as PagamentosService);
  });

  describe('create', () => {
    it('throws NotFoundException when the kitnet does not exist', async () => {
      prisma.kitnet.findUnique.mockResolvedValue(null);

      await expect(
        service.create(ownerId, { nome: 'João', telefone: '11999990000', kitnetId: 999 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException when the kitnet belongs to another user', async () => {
      prisma.kitnet.findUnique.mockResolvedValue({ ...kitnet, userId: 2 });

      await expect(
        service.create(ownerId, { nome: 'João', telefone: '11999990000', kitnetId: kitnet.id }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('creates the morador, marks the kitnet as ocupada and backfills its pagamentos', async () => {
      prisma.kitnet.findUnique.mockResolvedValue(kitnet);
      prisma.morador.create.mockResolvedValue(morador);

      const result = await service.create(ownerId, { nome: 'João', telefone: '11999990000', kitnetId: kitnet.id });

      expect(prisma.kitnet.update).toHaveBeenCalledWith({ where: { id: kitnet.id }, data: { status: 'ocupada' } });
      expect(pagamentosService.ensurePagamentosParaMorador).toHaveBeenCalledWith({
        id: morador.id,
        dataEntrada: morador.dataEntrada,
        diaVencimento: morador.diaVencimento,
        kitnet: { valor: kitnet.valor },
      });
      expect(result).toEqual(morador);
    });
  });

  describe('remove', () => {
    it('sets the kitnet back to vaga when it has no remaining moradores', async () => {
      prisma.morador.findUnique.mockResolvedValue(morador);
      prisma.morador.count.mockResolvedValue(0);

      await service.remove(ownerId, morador.id);

      expect(prisma.morador.delete).toHaveBeenCalledWith({ where: { id: morador.id } });
      expect(prisma.kitnet.update).toHaveBeenCalledWith({ where: { id: kitnet.id }, data: { status: 'vaga' } });
    });

    it('keeps the kitnet ocupada when other moradores remain', async () => {
      prisma.morador.findUnique.mockResolvedValue(morador);
      prisma.morador.count.mockResolvedValue(1);

      await service.remove(ownerId, morador.id);

      expect(prisma.kitnet.update).not.toHaveBeenCalled();
    });
  });
});
