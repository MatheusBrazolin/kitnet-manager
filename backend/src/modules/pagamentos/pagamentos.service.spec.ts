import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
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
  // Gestão direta por padrão: sem imobiliária e sem taxa, o líquido é o bruto. Os casos
  // que exercitam repasse sobrescrevem este fixture.
  const kitnet = {
    id: 10,
    userId: ownerId,
    valor: 900,
    taxaImobiliaria: null,
    taxaTipo: 'FIXA' as const,
    imobiliaria: null,
  };
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
        service.create(ownerId, {
          valor: 900,
          vencimento: '2026-07-10',
          moradorId: 999,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException when the morador belongs to another user', async () => {
      prisma.morador.findUnique.mockResolvedValue({
        ...morador,
        kitnet: { ...kitnet, userId: 2 },
      });

      await expect(
        service.create(ownerId, {
          valor: 900,
          vencimento: '2026-07-10',
          moradorId: morador.id,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('creates the pagamento with mesReferencia derived from vencimento and status PENDENTE', async () => {
      prisma.morador.findUnique.mockResolvedValue(morador);
      prisma.pagamento.create.mockResolvedValue(pagamento);

      await service.create(ownerId, {
        valor: 900,
        vencimento: '2026-07-10',
        moradorId: morador.id,
      });

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
        new Prisma.PrismaClientKnownRequestError('unique constraint', {
          code: 'P2002',
          clientVersion: '6.19.3',
        }),
      );

      await expect(
        service.create(ownerId, {
          valor: 900,
          vencimento: '2026-07-10',
          moradorId: morador.id,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('createComplementar', () => {
    it('throws NotFoundException when the morador does not exist', async () => {
      prisma.morador.findUnique.mockResolvedValue(null);

      await expect(
        service.createComplementar(ownerId, {
          valor: 200,
          moradorId: 999,
          origem: 'Ex-morador',
          dataPagamento: '2026-07-20',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException when the morador belongs to another user', async () => {
      prisma.morador.findUnique.mockResolvedValue({
        ...morador,
        kitnet: { ...kitnet, userId: 2 },
      });

      await expect(
        service.createComplementar(ownerId, {
          valor: 200,
          moradorId: morador.id,
          origem: 'Ex-morador',
          dataPagamento: '2026-07-20',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('creates the pagamento already as PAGO, with tipo COMPLEMENTAR and origem/observacao', async () => {
      prisma.morador.findUnique.mockResolvedValue(morador);
      prisma.pagamento.create.mockResolvedValue({
        ...pagamento,
        tipo: 'COMPLEMENTAR',
        status: 'PAGO',
      });

      await service.createComplementar(ownerId, {
        valor: 200,
        moradorId: morador.id,
        origem: 'Ex-morador',
        dataPagamento: '2026-07-20',
        formaPagamento: 'Pix',
        observacao: 'Acordo de rescisão',
      });

      expect(prisma.pagamento.create).toHaveBeenCalledWith({
        data: {
          valor: 200,
          vencimento: new Date('2026-07-20'),
          mesReferencia: new Date(Date.UTC(2026, 6, 1)),
          status: 'PAGO',
          dataPagamento: new Date('2026-07-20'),
          formaPagamento: 'Pix',
          moradorId: morador.id,
          tipo: 'COMPLEMENTAR',
          valorTaxa: 0,
          valorLiquido: 200,
          origem: 'Ex-morador',
          observacao: 'Acordo de rescisão',
        },
      });
    });

    it('creates the pagamento without origem/formaPagamento when the form omits them', async () => {
      prisma.morador.findUnique.mockResolvedValue(morador);
      prisma.pagamento.create.mockResolvedValue({
        ...pagamento,
        tipo: 'COMPLEMENTAR',
        status: 'PAGO',
      });

      await service.createComplementar(ownerId, {
        valor: 200,
        moradorId: morador.id,
        dataPagamento: '2026-07-20',
      });

      expect(prisma.pagamento.create).toHaveBeenCalledWith({
        data: {
          valor: 200,
          vencimento: new Date('2026-07-20'),
          mesReferencia: new Date(Date.UTC(2026, 6, 1)),
          status: 'PAGO',
          dataPagamento: new Date('2026-07-20'),
          formaPagamento: undefined,
          moradorId: morador.id,
          tipo: 'COMPLEMENTAR',
          valorTaxa: 0,
          valorLiquido: 200,
          origem: undefined,
          observacao: undefined,
        },
      });
    });

    it('translates a duplicate (moradorId, mesReferencia, tipo) into ConflictException', async () => {
      prisma.morador.findUnique.mockResolvedValue(morador);
      prisma.pagamento.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('unique constraint', {
          code: 'P2002',
          clientVersion: '6.19.3',
        }),
      );

      await expect(
        service.createComplementar(ownerId, {
          valor: 200,
          moradorId: morador.id,
          origem: 'Ex-morador',
          dataPagamento: '2026-07-20',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('ensurePagamentosParaMorador', () => {
    type ParcelaCriada = {
      valor: number;
      mesReferencia: Date;
      vencimento: Date;
    };

    /** Parcelas passadas ao createMany na única chamada esperada. */
    function parcelasCriadas(): ParcelaCriada[] {
      const [primeiraChamada] = prisma.pagamento.createMany.mock.calls as [
        [{ data: ParcelaCriada[] }],
      ];
      return primeiraChamada[0].data;
    }

    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date('2026-07-15T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('does nothing when every month already has a pagamento', async () => {
      prisma.pagamento.findMany.mockResolvedValue([
        { mesReferencia: new Date(Date.UTC(2026, 6, 1)) },
      ]);

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

    // Regressão: o backfill usava `kitnet.valor` (o valor de HOJE) para todos os meses
    // faltantes, ignorando KitnetValorHistorico — que existe exatamente pra isso e não
    // era lido por nenhum service. Um reajuste reescrevia retroativamente o valor de
    // todas as parcelas ainda não geradas.
    it('usa o valor vigente em cada mês, não o valor atual da kitnet', async () => {
      prisma.pagamento.findMany.mockResolvedValue([]);

      await service.ensurePagamentosParaMorador({
        id: morador.id,
        dataEntrada: new Date('2026-05-01'),
        diaVencimento: 10,
        kitnet: {
          valor: 1200,
          historicoValor: [
            { valor: 1000, vigenteDesde: new Date(Date.UTC(2026, 0, 1)) },
            { valor: 1200, vigenteDesde: new Date(Date.UTC(2026, 6, 1)) },
          ],
        },
      });

      expect(parcelasCriadas().map((parcela) => parcela.valor)).toEqual([
        1000, 1000, 1200,
      ]);
    });

    it('usa o valor mais antigo conhecido quando o mês é anterior ao primeiro registro', async () => {
      prisma.pagamento.findMany.mockResolvedValue([]);

      await service.ensurePagamentosParaMorador({
        id: morador.id,
        dataEntrada: new Date('2026-06-01'),
        diaVencimento: 10,
        kitnet: {
          valor: 1500,
          historicoValor: [
            { valor: 1000, vigenteDesde: new Date(Date.UTC(2026, 11, 1)) },
          ],
        },
      });

      expect(parcelasCriadas().every((parcela) => parcela.valor === 1000)).toBe(
        true,
      );
    });

    it('cai para o valor atual quando a kitnet não tem histórico (unidades antigas do cadastro em lote)', async () => {
      prisma.pagamento.findMany.mockResolvedValue([]);

      await service.ensurePagamentosParaMorador({
        id: morador.id,
        dataEntrada: new Date('2026-07-01'),
        diaVencimento: 10,
        kitnet: { valor: 900 },
      });

      expect(parcelasCriadas()[0].valor).toBe(900);
    });
  });

  describe('marcarPago', () => {
    it('sets status PAGO with the given dataPagamento/formaPagamento', async () => {
      prisma.pagamento.findUnique.mockResolvedValue(pagamento);
      prisma.pagamento.update.mockResolvedValue({
        ...pagamento,
        status: 'PAGO',
      });

      await service.marcarPago(ownerId, pagamento.id, {
        dataPagamento: '2026-07-27',
        formaPagamento: 'PIX',
      });

      expect(prisma.pagamento.update).toHaveBeenCalledWith({
        where: { id: pagamento.id },
        data: {
          status: 'PAGO',
          dataPagamento: new Date('2026-07-27'),
          formaPagamento: 'PIX',
          valorTaxa: 0,
          valorLiquido: 900,
        },
      });
    });

    it('defaults dataPagamento to today when not provided', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-07-27T10:00:00Z'));
      prisma.pagamento.findUnique.mockResolvedValue(pagamento);
      prisma.pagamento.update.mockResolvedValue({
        ...pagamento,
        status: 'PAGO',
      });

      await service.marcarPago(ownerId, pagamento.id, {});

      expect(prisma.pagamento.update).toHaveBeenCalledWith({
        where: { id: pagamento.id },
        data: {
          status: 'PAGO',
          dataPagamento: new Date('2026-07-27T10:00:00Z'),
          formaPagamento: null,
          valorTaxa: 0,
          valorLiquido: 900,
        },
      });
      jest.useRealTimers();
    });

    // O snapshot é o ponto da feature: taxa e líquido são GRAVADOS no momento do
    // pagamento. Recalcular na leitura faria um reajuste de taxa hoje reescrever
    // repasses de meses já fechados.
    describe('snapshot do repasse', () => {
      const comImobiliaria = {
        ...pagamento,
        valor: 1500,
        morador: {
          ...morador,
          kitnet: {
            ...kitnet,
            valor: 1500,
            taxaImobiliaria: null,
            imobiliaria: {
              id: 5,
              nome: 'Imobiliária Central',
              taxaPadraoTipo: 'PERCENTUAL' as const,
              taxaPadraoValor: 10,
            },
          },
        },
      };

      function snapshotGravado() {
        const [[args]] = prisma.pagamento.update.mock.calls as [
          [{ data: { valorTaxa: number | null; valorLiquido: number | null } }],
        ];
        return { taxa: args.data.valorTaxa, liquido: args.data.valorLiquido };
      }

      it('grava taxa e líquido usando a taxa padrão da imobiliária', async () => {
        prisma.pagamento.findUnique.mockResolvedValue(comImobiliaria);
        prisma.pagamento.update.mockResolvedValue(comImobiliaria);

        await service.marcarPago(ownerId, comImobiliaria.id, {});

        expect(snapshotGravado()).toEqual({ taxa: 150, liquido: 1350 });
      });

      it('a taxa própria da unidade vence a padrão da imobiliária', async () => {
        prisma.pagamento.findUnique.mockResolvedValue({
          ...comImobiliaria,
          morador: {
            ...comImobiliaria.morador,
            kitnet: {
              ...comImobiliaria.morador.kitnet,
              taxaImobiliaria: 200,
              taxaTipo: 'FIXA' as const,
            },
          },
        });
        prisma.pagamento.update.mockResolvedValue(comImobiliaria);

        await service.marcarPago(ownerId, comImobiliaria.id, {});

        expect(snapshotGravado()).toEqual({ taxa: 200, liquido: 1300 });
      });

      it('sem imobiliária, o líquido é o bruto', async () => {
        prisma.pagamento.findUnique.mockResolvedValue(pagamento);
        prisma.pagamento.update.mockResolvedValue(pagamento);

        await service.marcarPago(ownerId, pagamento.id, {});

        expect(snapshotGravado()).toEqual({ taxa: 0, liquido: 900 });
      });

      // O repasse real às vezes chega diferente do combinado; o que o proprietário
      // recebeu de fato é o dado verdadeiro, e a taxa vira a diferença.
      it('líquido informado à mão vence o cálculo, e a taxa vira a diferença', async () => {
        prisma.pagamento.findUnique.mockResolvedValue(comImobiliaria);
        prisma.pagamento.update.mockResolvedValue(comImobiliaria);

        await service.marcarPago(ownerId, comImobiliaria.id, {
          valorLiquido: 1320,
        });

        expect(snapshotGravado()).toEqual({ taxa: 180, liquido: 1320 });
      });

      it('não aceita líquido maior que o bruto', async () => {
        prisma.pagamento.findUnique.mockResolvedValue(comImobiliaria);
        prisma.pagamento.update.mockResolvedValue(comImobiliaria);

        await service.marcarPago(ownerId, comImobiliaria.id, {
          valorLiquido: 99999,
        });

        expect(snapshotGravado()).toEqual({ taxa: 0, liquido: 1500 });
      });

      it('bruto continua sendo taxa + líquido mesmo com percentual quebrado', async () => {
        prisma.pagamento.findUnique.mockResolvedValue({
          ...comImobiliaria,
          valor: 1234.56,
          morador: {
            ...comImobiliaria.morador,
            kitnet: {
              ...comImobiliaria.morador.kitnet,
              imobiliaria: {
                id: 5,
                nome: 'Imobiliária Central',
                taxaPadraoTipo: 'PERCENTUAL' as const,
                taxaPadraoValor: 8.33,
              },
            },
          },
        });
        prisma.pagamento.update.mockResolvedValue(comImobiliaria);

        await service.marcarPago(ownerId, comImobiliaria.id, {});

        const { taxa, liquido } = snapshotGravado();
        expect(taxa).toBe(102.84);
        expect(liquido).toBe(1131.72);
        expect(Math.round(((taxa ?? 0) + (liquido ?? 0)) * 100) / 100).toBe(
          1234.56,
        );
      });
    });
  });

  describe('desfazerPagamento', () => {
    it('resets status to PENDENTE and clears dataPagamento/formaPagamento', async () => {
      prisma.pagamento.findUnique.mockResolvedValue({
        ...pagamento,
        status: 'PAGO',
      });
      prisma.pagamento.update.mockResolvedValue(pagamento);

      await service.desfazerPagamento(ownerId, pagamento.id);

      expect(prisma.pagamento.update).toHaveBeenCalledWith({
        where: { id: pagamento.id },
        data: {
          status: 'PENDENTE',
          dataPagamento: null,
          formaPagamento: null,
          valorTaxa: null,
          valorLiquido: null,
        },
      });
    });
  });

  describe('anular', () => {
    it('sets status ANULADO, clears dataPagamento/formaPagamento and stores the observacao', async () => {
      prisma.pagamento.findUnique.mockResolvedValue(pagamento);
      prisma.pagamento.update.mockResolvedValue({
        ...pagamento,
        status: 'ANULADO',
      });

      await service.anular(ownerId, pagamento.id, {
        observacao: 'Repassado à imobiliária',
      });

      expect(prisma.pagamento.update).toHaveBeenCalledWith({
        where: { id: pagamento.id },
        data: {
          status: 'ANULADO',
          dataPagamento: null,
          formaPagamento: null,
          valorTaxa: null,
          valorLiquido: null,
          observacao: 'Repassado à imobiliária',
        },
      });
    });

    it('throws ForbiddenException when the pagamento belongs to another user', async () => {
      prisma.pagamento.findUnique.mockResolvedValue({
        ...pagamento,
        morador: { ...morador, kitnet: { ...kitnet, userId: 2 } },
      });

      await expect(
        service.anular(ownerId, pagamento.id, {}),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.pagamento.update).not.toHaveBeenCalled();
    });
  });

  describe('findOwnedOrThrow', () => {
    it('throws NotFoundException when the pagamento does not exist', async () => {
      prisma.pagamento.findUnique.mockResolvedValue(null);

      await expect(
        service.findOwnedOrThrow(ownerId, 999),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException when the pagamento belongs to another user', async () => {
      prisma.pagamento.findUnique.mockResolvedValue({
        ...pagamento,
        morador: { ...morador, kitnet: { ...kitnet, userId: 2 } },
      });

      await expect(
        service.findOwnedOrThrow(ownerId, pagamento.id),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('comStatusEfetivo', () => {
    it('rewrites an overdue PENDENTE as ATRASADO without touching the database', () => {
      const agora = new Date('2026-07-11T00:00:00Z');

      const resultado = service.comStatusEfetivo(
        {
          ...pagamento,
          status: 'PENDENTE',
          vencimento: new Date('2026-07-10'),
        },
        agora,
      );

      expect(resultado.status).toBe('ATRASADO');
    });

    it('keeps PENDENTE when the vencimento has not passed yet', () => {
      const agora = new Date('2026-07-09T00:00:00Z');

      const resultado = service.comStatusEfetivo(
        {
          ...pagamento,
          status: 'PENDENTE',
          vencimento: new Date('2026-07-10'),
        },
        agora,
      );

      expect(resultado.status).toBe('PENDENTE');
    });

    it('never downgrades a PAGO pagamento, even past its vencimento', () => {
      const agora = new Date('2026-08-01T00:00:00Z');

      const resultado = service.comStatusEfetivo(
        { ...pagamento, status: 'PAGO', vencimento: new Date('2026-07-10') },
        agora,
      );

      expect(resultado.status).toBe('PAGO');
    });

    it('never rewrites an ANULADO pagamento, even past its vencimento', () => {
      const agora = new Date('2026-08-01T00:00:00Z');

      const resultado = service.comStatusEfetivo(
        { ...pagamento, status: 'ANULADO', vencimento: new Date('2026-07-10') },
        agora,
      );

      expect(resultado.status).toBe('ANULADO');
    });
  });

  describe('getAlertas', () => {
    beforeEach(() => {
      // ensurePagamentosParaConta roda antes de todo getAlertas — sem moradores, é um no-op.
      (
        prisma as unknown as { morador: { findMany: jest.Mock } }
      ).morador.findMany = jest.fn().mockResolvedValue([]);
    });

    const moradorComImovel = {
      ...morador,
      nome: 'João',
      kitnet: { ...kitnet, numero: '01', imovel: { nome: 'Edifício Central' } },
    };

    it('marks venceHoje=true only for the pagamento that matches the current UTC date', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-07-10T15:00:00Z'));
      prisma.pagamento.findMany.mockResolvedValue([
        {
          ...pagamento,
          id: 1,
          vencimento: new Date('2026-07-10T00:00:00Z'),
          morador: moradorComImovel,
        },
        {
          ...pagamento,
          id: 2,
          vencimento: new Date('2026-07-05T00:00:00Z'),
          morador: moradorComImovel,
        },
      ]);

      const alertas = await service.getAlertas(ownerId);

      expect(alertas.find((a) => a.id === 1)?.venceHoje).toBe(true);
      expect(alertas.find((a) => a.id === 2)?.venceHoje).toBe(false);
      jest.useRealTimers();
    });

    it('exposes morador/kitnet/imovel names alongside each alerta', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-07-10T15:00:00Z'));
      const moradorComImovel = {
        ...morador,
        nome: 'João',
        kitnet: {
          ...kitnet,
          numero: '01',
          imovel: { nome: 'Edifício Central' },
        },
      };
      prisma.pagamento.findMany.mockResolvedValue([
        {
          ...pagamento,
          vencimento: new Date('2026-07-10T00:00:00Z'),
          morador: moradorComImovel,
        },
      ]);

      const [alerta] = await service.getAlertas(ownerId);

      expect(alerta).toMatchObject({
        morador: 'João',
        kitnet: '01',
        imovel: 'Edifício Central',
      });
      jest.useRealTimers();
    });
  });

  describe('update', () => {
    it('recalculates mesReferencia when vencimento changes', async () => {
      prisma.pagamento.findUnique.mockResolvedValue(pagamento);
      prisma.pagamento.update.mockResolvedValue(pagamento);

      await service.update(ownerId, pagamento.id, { vencimento: '2026-08-10' });

      expect(prisma.pagamento.update).toHaveBeenCalledWith({
        where: { id: pagamento.id },
        data: {
          vencimento: new Date('2026-08-10'),
          mesReferencia: new Date(Date.UTC(2026, 7, 1)),
        },
      });
    });

    it('translates a duplicate (moradorId, mesReferencia) into ConflictException', async () => {
      prisma.pagamento.findUnique.mockResolvedValue(pagamento);
      prisma.pagamento.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('unique constraint', {
          code: 'P2002',
          clientVersion: '6.19.3',
        }),
      );

      await expect(
        service.update(ownerId, pagamento.id, { vencimento: '2026-08-10' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws ForbiddenException before writing when the pagamento belongs to another user', async () => {
      prisma.pagamento.findUnique.mockResolvedValue({
        ...pagamento,
        morador: { ...morador, kitnet: { ...kitnet, userId: 2 } },
      });

      await expect(
        service.update(ownerId, pagamento.id, { valor: 1000 }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.pagamento.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes the pagamento once ownership is confirmed', async () => {
      prisma.pagamento.findUnique.mockResolvedValue(pagamento);

      await service.remove(ownerId, pagamento.id);

      expect(prisma.pagamento.delete).toHaveBeenCalledWith({
        where: { id: pagamento.id },
      });
    });

    it('throws ForbiddenException and does not delete when owned by another user', async () => {
      prisma.pagamento.findUnique.mockResolvedValue({
        ...pagamento,
        morador: { ...morador, kitnet: { ...kitnet, userId: 2 } },
      });

      await expect(
        service.remove(ownerId, pagamento.id),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.pagamento.delete).not.toHaveBeenCalled();
    });
  });
});
