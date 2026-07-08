import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PagamentosService } from '../pagamentos/pagamentos.service';

const PROXIMOS_VENCIMENTOS_LIMIT = 5;

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pagamentosService: PagamentosService,
  ) {}

  async getSummary(userId: number) {
    await this.pagamentosService.ensureCurrentMonthPagamentos(userId);

    const kitnets = await this.prisma.kitnet.findMany({ where: { userId } });
    const totalKitnets = kitnets.length;
    const ocupadas = kitnets.filter((kitnet) => kitnet.status === 'ocupada').length;
    const valorMensal = kitnets.reduce((total, kitnet) => total + kitnet.valor, 0);

    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const periodStart = new Date(Date.UTC(year, month, 1));
    const periodEnd = new Date(Date.UTC(year, month + 1, 1));

    const [receitaAgg, gastoAgg, atrasoAgg, proximosVencimentos] = await Promise.all([
      this.prisma.pagamento.aggregate({
        where: {
          pago: true,
          vencimento: { gte: periodStart, lt: periodEnd },
          morador: { kitnet: { userId } },
        },
        _sum: { valor: true },
      }),
      this.prisma.gasto.aggregate({
        where: { data: { gte: periodStart, lt: periodEnd }, kitnet: { userId } },
        _sum: { valor: true },
      }),
      this.prisma.pagamento.aggregate({
        where: { pago: false, vencimento: { lt: now }, morador: { kitnet: { userId } } },
        _sum: { valor: true },
      }),
      this.prisma.pagamento.findMany({
        where: { pago: false, morador: { kitnet: { userId } } },
        include: { morador: true },
        orderBy: { vencimento: 'asc' },
        take: PROXIMOS_VENCIMENTOS_LIMIT,
      }),
    ]);

    const receitaMensal = receitaAgg._sum.valor ?? 0;
    const gastoMensal = gastoAgg._sum.valor ?? 0;

    return {
      totalKitnets,
      ocupadas,
      vagas: totalKitnets - ocupadas,
      valorMensal,
      receitaMensal,
      gastoMensal,
      lucroLiquido: receitaMensal - gastoMensal,
      totalEmAtraso: atrasoAgg._sum.valor ?? 0,
      proximosVencimentos: proximosVencimentos.map((pagamento) => ({
        id: pagamento.id,
        morador: pagamento.morador.nome,
        vencimento: pagamento.vencimento,
        valor: pagamento.valor,
      })),
    };
  }
}
