import { DashboardService } from './dashboard.service';
import { PrismaService } from '../../database/prisma.service';
import { PagamentosService } from '../pagamentos/pagamentos.service';

type PrismaMock = {
  kitnet: { findMany: jest.Mock };
  pagamento: { aggregate: jest.Mock; findMany: jest.Mock };
  gasto: { aggregate: jest.Mock; findMany: jest.Mock };
  // Histórico e tabela por imobiliária são agregados no banco (date_trunc/GROUP BY),
  // porque groupBy do Prisma não agrupa por campo de relação.
  $queryRaw: jest.Mock;
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
        aggregate: jest.fn().mockResolvedValue({
          _sum: { valor: 0, valorTaxa: 0, valorLiquido: 0 },
          _count: { _all: 0 },
        }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      gasto: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { valor: 0 } }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
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

    // O lucro passou a partir do LÍQUIDO: com a taxa da imobiliária agora explícita,
    // chamar de lucro um número que ainda embute o repasse seria enganoso — esse
    // dinheiro nunca chegou à conta do proprietário.
    it('calcula lucro líquido a partir do recebido líquido, não do bruto', async () => {
      prisma.pagamento.aggregate.mockResolvedValue({
        _sum: { valor: 5000, valorTaxa: 500, valorLiquido: 4500 },
        _count: { _all: 3 },
      });
      prisma.gasto.aggregate.mockResolvedValue({ _sum: { valor: 1800 } });

      const resumo = await service.getSummary(ownerId);

      expect(resumo.receitaMensal).toBe(5000);
      expect(resumo.taxasMensal).toBe(500);
      expect(resumo.receitaLiquidaMensal).toBe(4500);
      expect(resumo.gastoMensal).toBe(1800);
      expect(resumo.lucroLiquido).toBe(2700);
    });

    it('expõe o total e a quantidade de repasses ainda pendentes', async () => {
      prisma.pagamento.aggregate.mockResolvedValue({
        _sum: { valor: 3200, valorTaxa: 0, valorLiquido: 0 },
        _count: { _all: 4 },
      });

      const resumo = await service.getSummary(ownerId);

      expect(resumo.totalPendente).toBe(3200);
      expect(resumo.quantidadePendente).toBe(4);
    });

    it('trata agregações vazias como zero em vez de null', async () => {
      prisma.pagamento.aggregate.mockResolvedValue({
        _sum: { valor: null, valorTaxa: null, valorLiquido: null },
        _count: { _all: 0 },
      });
      prisma.gasto.aggregate.mockResolvedValue({ _sum: { valor: null } });

      const resumo = await service.getSummary(ownerId);

      expect(resumo.receitaMensal).toBe(0);
      expect(resumo.gastoMensal).toBe(0);
      expect(resumo.totalEmAtraso).toBe(0);
      expect(resumo.taxasMensal).toBe(0);
      expect(resumo.receitaLiquidaMensal).toBe(0);
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

  describe('projeção de taxa', () => {
    // Regressão: a projeção somava o campo cru. Com taxa percentual, `taxaImobiliaria`
    // guarda 10 (dez por cento) — somar isso como se fossem dez reais dava um número
    // sem sentido na tela.
    it('resolve percentual sobre o aluguel em vez de somar o número cru', async () => {
      prisma.kitnet.findMany.mockResolvedValue([
        {
          status: 'ocupada',
          valor: 1500,
          taxaImobiliaria: null,
          taxaTipo: 'FIXA',
          imobiliaria: { taxaPadraoTipo: 'PERCENTUAL', taxaPadraoValor: 10 },
        },
        {
          status: 'ocupada',
          valor: 1000,
          taxaImobiliaria: 80,
          taxaTipo: 'FIXA',
          imobiliaria: { taxaPadraoTipo: 'PERCENTUAL', taxaPadraoValor: 10 },
        },
      ]);

      const resumo = await service.getSummary(ownerId);

      // 10% de 1500 = 150, mais a taxa fixa própria de 80.
      expect(resumo.totalImobiliaria).toBe(230);
      expect(resumo.valorMensal).toBe(2500);
    });

    it('unidade sem imobiliária não projeta taxa nenhuma', async () => {
      prisma.kitnet.findMany.mockResolvedValue([
        {
          status: 'ocupada',
          valor: 1200,
          taxaImobiliaria: null,
          taxaTipo: 'FIXA',
          imobiliaria: null,
        },
      ]);

      const resumo = await service.getSummary(ownerId);

      expect(resumo.totalImobiliaria).toBe(0);
    });
  });

  describe('histórico', () => {
    it('devolve 12 meses, preenchendo com zero os que não tiveram movimento', async () => {
      const resumo = await service.getSummary(ownerId);

      expect(resumo.historico).toHaveLength(12);
      expect(
        resumo.historico.every((p) => p.receita === 0 && p.taxa === 0),
      ).toBe(true);
      // Janela terminando no mês corrente (set/2026 no relógio fixado do teste).
      expect(resumo.historico[11].label).toBe('set/26');
      expect(resumo.historico[0].label).toBe('out/25');
    });

    it('casa cada mês agregado pelo banco com sua posição na série', async () => {
      prisma.$queryRaw.mockImplementation((strings: TemplateStringsArray) => {
        const sql = strings.join(' ');
        if (sql.includes('"Pagamento"')) {
          return Promise.resolve([
            {
              mes: new Date(Date.UTC(2026, 8, 1)),
              bruto: 5000,
              taxa: 500,
              liquido: 4500,
            },
          ]);
        }
        if (sql.includes('"Gasto"')) {
          return Promise.resolve([
            { mes: new Date(Date.UTC(2026, 8, 1)), gasto: 700 },
          ]);
        }
        return Promise.resolve([]);
      });

      const resumo = await service.getSummary(ownerId);

      expect(resumo.historico[11]).toEqual({
        label: 'set/26',
        receita: 5000,
        gasto: 700,
        liquido: 4500,
        taxa: 500,
      });
      expect(resumo.historico[10]).toEqual({
        label: 'ago/26',
        receita: 0,
        gasto: 0,
        liquido: 0,
        taxa: 0,
      });
    });
  });
});
