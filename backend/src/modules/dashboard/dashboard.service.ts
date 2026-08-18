import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PagamentosService } from '../pagamentos/pagamentos.service';

const PROXIMOS_VENCIMENTOS_LIMIT = 5;
const HISTORICO_MESES = 6;

const MES_LABELS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pagamentosService: PagamentosService,
  ) {}

  async getSummary(userId: number) {
    const [, kitnets] = await Promise.all([
      this.pagamentosService.ensurePagamentosParaConta(userId),
      this.prisma.kitnet.findMany({ where: { userId } }),
    ]);

    const totalKitnets = kitnets.length;
    const ocupadas = kitnets.filter((kitnet) => kitnet.status === 'ocupada').length;
    const valorMensal = kitnets.reduce((total, kitnet) => total + kitnet.valor, 0);

    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const periodStart = new Date(Date.UTC(year, month, 1));
    const periodEnd = new Date(Date.UTC(year, month + 1, 1));

    const [receitaAgg, gastoAgg, atrasoAgg, proximosVencimentos, gastosMesPorKitnet, historico] = await Promise.all([
      // Receita "de caixa" do mês: soma pelo que foi de fato recebido dentro do período,
      // usando a data real do pagamento — não a data de vencimento da parcela.
      this.prisma.pagamento.aggregate({
        where: {
          status: 'PAGO',
          dataPagamento: { gte: periodStart, lt: periodEnd },
          morador: { kitnet: { userId } },
        },
        _sum: { valor: true },
      }),
      this.prisma.gasto.aggregate({
        where: { data: { gte: periodStart, lt: periodEnd }, kitnet: { userId } },
        _sum: { valor: true },
      }),
      this.prisma.pagamento.aggregate({
        where: { status: 'PENDENTE', vencimento: { lt: now }, morador: { kitnet: { userId } } },
        _sum: { valor: true },
      }),
      this.prisma.pagamento.findMany({
        where: { status: 'PENDENTE', morador: { kitnet: { userId } } },
        include: { morador: true },
        orderBy: { vencimento: 'asc' },
        take: PROXIMOS_VENCIMENTOS_LIMIT,
      }),
      this.prisma.gasto.findMany({
        where: { data: { gte: periodStart, lt: periodEnd }, kitnet: { userId } },
        include: { kitnet: { include: { imovel: true } } },
      }),
      this.getHistorico(userId, year, month),
    ]);

    const receitaMensal = receitaAgg._sum.valor ?? 0;
    const gastoMensal = gastoAgg._sum.valor ?? 0;

    const gastosPorImovel = Object.values(
      gastosMesPorKitnet.reduce<Record<number, { imovel: string; total: number }>>((acc, gasto) => {
        const key = gasto.kitnet.imovelId;
        acc[key] = acc[key] ?? { imovel: gasto.kitnet.imovel.nome, total: 0 };
        acc[key].total += gasto.valor;
        return acc;
      }, {}),
    );

    return {
      totalKitnets,
      ocupadas,
      vagas: totalKitnets - ocupadas,
      valorMensal,
      receitaMensal,
      gastoMensal,
      lucroLiquido: receitaMensal - gastoMensal,
      totalEmAtraso: atrasoAgg._sum.valor ?? 0,
      gastosPorImovel,
      historico,
      proximosVencimentos: proximosVencimentos.map((pagamento) => ({
        id: pagamento.id,
        morador: pagamento.morador.nome,
        vencimento: pagamento.vencimento,
        valor: pagamento.valor,
      })),
    };
  }

  private async getHistorico(userId: number, year: number, month: number) {
    const inicioJanela = new Date(Date.UTC(year, month - (HISTORICO_MESES - 1), 1));

    const [pagamentos, gastos] = await Promise.all([
      // Agrupado por dataPagamento (regime de caixa: quando o dinheiro entrou), não por
      // vencimento — senão um pagamento recebido fora do mês do vencimento distorce o mês
      // em que a receita aparece no histórico.
      this.prisma.pagamento.findMany({
        where: { status: 'PAGO', dataPagamento: { gte: inicioJanela }, morador: { kitnet: { userId } } },
      }),
      this.prisma.gasto.findMany({ where: { data: { gte: inicioJanela }, kitnet: { userId } } }),
    ]);

    const meses = Array.from({ length: HISTORICO_MESES }, (_, index) => {
      const offset = month - (HISTORICO_MESES - 1 - index);
      const mesData = new Date(Date.UTC(year, offset, 1));
      return { ano: mesData.getUTCFullYear(), mes: mesData.getUTCMonth() };
    });

    return meses.map(({ ano, mes }) => {
      const receita = pagamentos
        .filter((p) => p.dataPagamento && p.dataPagamento.getUTCFullYear() === ano && p.dataPagamento.getUTCMonth() === mes)
        .reduce((total, p) => total + p.valor, 0);

      const gastoTotal = gastos
        .filter((g) => g.data.getUTCFullYear() === ano && g.data.getUTCMonth() === mes)
        .reduce((total, g) => total + g.valor, 0);

      return { label: `${MES_LABELS[mes]}/${String(ano).slice(2)}`, receita, gasto: gastoTotal };
    });
  }
}
