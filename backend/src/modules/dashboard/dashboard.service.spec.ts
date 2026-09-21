import { DashboardService } from './dashboard.service';
import { PrismaService } from '../../database/prisma.service';
import { PagamentosService } from '../pagamentos/pagamentos.service';

type PrismaMock = {
  kitnet: { findMany: jest.Mock };
  pagamento: { aggregate: jest.Mock; findMany: jest.Mock };
  gasto: { aggregate: jest.Mock; findMany: jest.Mock };
};

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: PrismaMock;

  const ownerId = 1;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-10T09:00:00Z'));

    prisma = {
      kitnet: { findMany: jest.fn().mockResolvedValue([]) },
      pagamento: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { valor: 0 } }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      gasto: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { valor: 0 } }),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    service = new DashboardService(
      prisma as unknown as PrismaService,
      { ensurePagamentosParaConta: jest.fn() } as unknown as PagamentosService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  type WhereDePagamento = {
    vencimento?: { lt: Date };
    dataPagamento?: { gte: Date; lt: Date };
  };

  /** O `where` do aggregate de pagamentos que usa o campo indicado. */
  function whereDoAggregate(campo: keyof WhereDePagamento): WhereDePagamento {
    const chamadas = prisma.pagamento.aggregate.mock.calls as [
      { where: WhereDePagamento },
    ][];
    const chamada = chamadas.find((args) => args[0].where[campo] !== undefined);
    if (!chamada) {
      throw new Error(`Nenhum aggregate de pagamento filtrou por ${campo}`);
    }
    return chamada[0].where;
  }

  describe('getSummary', () => {
    it('conta ocupadas/vagas e soma valor mensal e taxa da imobiliária', async () => {
      prisma.kitnet.findMany.mockResolvedValue([
        { status: 'ocupada', valor: 1000, taxaImobiliaria: 100 },
        { status: 'ocupada', valor: 1200, taxaImobiliaria: null },
        { status: 'vaga', valor: 800, taxaImobiliaria: 80 },
      ]);

      const resumo = await service.getSummary(ownerId);

      expect(resumo.totalKitnets).toBe(3);
      expect(resumo.ocupadas).toBe(2);
      expect(resumo.vagas).toBe(1);
      expect(resumo.valorMensal).toBe(3000);
      expect(resumo.totalImobiliaria).toBe(180);
    });

    it('calcula lucro líquido como receita recebida menos gastos do mês', async () => {
      prisma.pagamento.aggregate.mockResolvedValue({ _sum: { valor: 5000 } });
      prisma.gasto.aggregate.mockResolvedValue({ _sum: { valor: 1800 } });

      const resumo = await service.getSummary(ownerId);

      expect(resumo.receitaMensal).toBe(5000);
      expect(resumo.gastoMensal).toBe(1800);
      expect(resumo.lucroLiquido).toBe(3200);
    });

    it('trata agregações vazias como zero em vez de null', async () => {
      prisma.pagamento.aggregate.mockResolvedValue({ _sum: { valor: null } });
      prisma.gasto.aggregate.mockResolvedValue({ _sum: { valor: null } });

      const resumo = await service.getSummary(ownerId);

      expect(resumo.receitaMensal).toBe(0);
      expect(resumo.gastoMensal).toBe(0);
      expect(resumo.totalEmAtraso).toBe(0);
      expect(resumo.lucroLiquido).toBe(0);
    });

    // Regressão: o filtro era `vencimento < agora` (o instante atual). Como `vencimento` é
    // gravado à meia-noite UTC, às 09h do dia 10 uma parcela que vence NO dia 10 já entrava
    // no total em atraso — enquanto a campainha, que compara com o fim do dia, dizia
    // "vence hoje". As duas telas discordavam no dia do vencimento.
    it('não conta como atrasada a parcela que vence hoje', async () => {
      await service.getSummary(ownerId);

      expect(whereDoAggregate('vencimento').vencimento?.lt).toEqual(
        new Date(Date.UTC(2026, 8, 10)),
      );
    });

    it('agrupa os gastos do mês por imóvel, somando as kitnets do mesmo prédio', async () => {
      // `data` é exigida por getHistorico, que reusa o mesmo findMany mockado.
      const noMes = new Date(Date.UTC(2026, 8, 5));
      prisma.gasto.findMany.mockResolvedValue([
        {
          valor: 200,
          data: noMes,
          kitnet: { imovelId: 1, imovel: { nome: 'Kitnet Central' } },
        },
        {
          valor: 150,
          data: noMes,
          kitnet: { imovelId: 1, imovel: { nome: 'Kitnet Central' } },
        },
        {
          valor: 90,
          data: noMes,
          kitnet: { imovelId: 2, imovel: { nome: 'Casa Rua X' } },
        },
      ]);

      const resumo = await service.getSummary(ownerId);

      expect(resumo.gastosPorImovel).toEqual([
        { imovel: 'Kitnet Central', total: 350 },
        { imovel: 'Casa Rua X', total: 90 },
      ]);
    });

    it('recorta a receita e os gastos pelo mês corrente, em UTC', async () => {
      await service.getSummary(ownerId);

      const receita = whereDoAggregate('dataPagamento').dataPagamento!;

      expect(receita.gte).toEqual(new Date(Date.UTC(2026, 8, 1)));
      expect(receita.lt).toEqual(new Date(Date.UTC(2026, 9, 1)));
    });
  });
});
