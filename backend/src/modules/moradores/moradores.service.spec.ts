import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { MoradoresService } from './moradores.service';
import { PrismaService } from '../../database/prisma.service';
import { PagamentosService } from '../pagamentos/pagamentos.service';

type PrismaMock = {
  morador: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    count: jest.Mock;
  };
  kitnet: { findUnique: jest.Mock; update: jest.Mock };
  pagamento: { count: jest.Mock };
  $transaction: jest.Mock;
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
      // `remove` agora recusa excluir um morador com pagamentos confirmados.
      pagamento: { count: jest.fn().mockResolvedValue(0) },
      // create/remove agora rodam dentro de $transaction — criar o morador e marcar a
      // unidade como ocupada (ou o inverso) precisa ser atômico. O mock entrega o próprio
      // client como `tx`, então as asserções sobre prisma.kitnet.update seguem valendo.
      $transaction: jest.fn((callback: (tx: unknown) => Promise<unknown>) =>
        callback(prisma),
      ),
    };
    pagamentosService = { ensurePagamentosParaMorador: jest.fn() };

    service = new MoradoresService(
      prisma as unknown as PrismaService,
      pagamentosService as unknown as PagamentosService,
    );
  });

  describe('findAll', () => {
    it('returns the plain array when no pagination params are given', async () => {
      prisma.morador.findMany.mockResolvedValue([morador]);

      const result = await service.findAll(ownerId);

      const [callArgs] = prisma.morador.findMany.mock.calls[0] as [
        Record<string, unknown>,
      ];
      expect(callArgs).not.toHaveProperty('skip');
      expect(callArgs).not.toHaveProperty('take');
      expect(prisma.morador.count).not.toHaveBeenCalled();
      expect(result).toEqual([morador]);
    });

    it('returns a paginated envelope when page/limit are given', async () => {
      prisma.morador.findMany.mockResolvedValue([morador]);
      prisma.morador.count.mockResolvedValue(37);

      const result = await service.findAll(ownerId, { page: 2, limit: 10 });

      expect(prisma.morador.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
      expect(result).toEqual({
        data: [morador],
        total: 37,
        page: 2,
        limit: 10,
        totalPages: 4,
      });
    });
  });

  describe('create', () => {
    it('throws NotFoundException when the kitnet does not exist', async () => {
      prisma.kitnet.findUnique.mockResolvedValue(null);

      await expect(
        service.create(ownerId, {
          nome: 'João',
          telefone: '11999990000',
          kitnetId: 999,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException when the kitnet belongs to another user', async () => {
      prisma.kitnet.findUnique.mockResolvedValue({ ...kitnet, userId: 2 });

      await expect(
        service.create(ownerId, {
          nome: 'João',
          telefone: '11999990000',
          kitnetId: kitnet.id,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('creates the morador, marks the kitnet as ocupada and backfills its pagamentos', async () => {
      prisma.kitnet.findUnique.mockResolvedValue(kitnet);
      prisma.morador.create.mockResolvedValue(morador);

      const result = await service.create(ownerId, {
        nome: 'João',
        telefone: '11999990000',
        kitnetId: kitnet.id,
      });

      expect(prisma.kitnet.update).toHaveBeenCalledWith({
        where: { id: kitnet.id },
        data: { status: 'ocupada' },
      });
      expect(
        pagamentosService.ensurePagamentosParaMorador,
      ).toHaveBeenCalledWith({
        id: morador.id,
        dataEntrada: morador.dataEntrada,
        diaVencimento: morador.diaVencimento,
        kitnet: { valor: kitnet.valor, historicoValor: undefined },
      });
      expect(result).toEqual(morador);
    });
  });

  // registrarSaida é a alternativa ao DELETE destrutivo: encerra a locação sem apagar
  // nenhum lançamento financeiro.
  describe('registrarSaida', () => {
    it('grava a data de saída e devolve a unidade para vaga quando ninguém mais fica', async () => {
      prisma.morador.findUnique.mockResolvedValue(morador);
      prisma.morador.count.mockResolvedValue(0);
      prisma.morador.update.mockResolvedValue({
        ...morador,
        dataSaida: new Date('2026-09-30'),
      });

      await service.registrarSaida(ownerId, morador.id, '2026-09-30');

      expect(prisma.morador.update).toHaveBeenCalledWith({
        where: { id: morador.id },
        data: { dataSaida: new Date('2026-09-30') },
      });
      expect(prisma.kitnet.update).toHaveBeenCalledWith({
        where: { id: morador.kitnetId },
        data: { status: 'vaga' },
      });
    });

    it('mantém a unidade ocupada quando ainda há outro morador ativo', async () => {
      prisma.morador.findUnique.mockResolvedValue(morador);
      prisma.morador.count.mockResolvedValue(1);
      prisma.morador.update.mockResolvedValue(morador);

      await service.registrarSaida(ownerId, morador.id);

      expect(prisma.kitnet.update).not.toHaveBeenCalled();
    });

    it('recusa registrar a saída duas vezes', async () => {
      prisma.morador.findUnique.mockResolvedValue({
        ...morador,
        dataSaida: new Date('2026-08-01'),
      });

      await expect(
        service.registrarSaida(ownerId, morador.id),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('recusa uma data de saída anterior à entrada', async () => {
      prisma.morador.findUnique.mockResolvedValue(morador);

      await expect(
        service.registrarSaida(ownerId, morador.id, '2026-01-01'),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('remove', () => {
    // Excluir cascateia em Pagamento e apaga o histórico financeiro junto, mudando
    // retroativamente a receita de meses já fechados.
    it('recusa excluir um morador que já tem pagamentos confirmados', async () => {
      prisma.morador.findUnique.mockResolvedValue(morador);
      prisma.pagamento.count.mockResolvedValue(3);

      await expect(service.remove(ownerId, morador.id)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.morador.delete).not.toHaveBeenCalled();
    });

    it('sets the kitnet back to vaga when it has no remaining moradores', async () => {
      prisma.morador.findUnique.mockResolvedValue(morador);
      prisma.morador.count.mockResolvedValue(0);

      await service.remove(ownerId, morador.id);

      expect(prisma.morador.delete).toHaveBeenCalledWith({
        where: { id: morador.id },
      });
      expect(prisma.kitnet.update).toHaveBeenCalledWith({
        where: { id: kitnet.id },
        data: { status: 'vaga' },
      });
    });

    it('keeps the kitnet ocupada when other moradores remain', async () => {
      prisma.morador.findUnique.mockResolvedValue(morador);
      prisma.morador.count.mockResolvedValue(1);

      await service.remove(ownerId, morador.id);

      expect(prisma.kitnet.update).not.toHaveBeenCalled();
    });
  });
});
