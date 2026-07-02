import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

const PROXIMOS_VENCIMENTOS_LIMIT = 5;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(userId: number) {
    const kitnets = await this.prisma.kitnet.findMany({ where: { userId } });
    const totalKitnets = kitnets.length;
    const ocupadas = kitnets.filter((kitnet) => kitnet.status === 'ocupada').length;
    const valorMensal = kitnets.reduce((total, kitnet) => total + kitnet.valor, 0);

    const proximosVencimentos = await this.prisma.pagamento.findMany({
      where: { pago: false, morador: { kitnet: { userId } } },
      include: { morador: true },
      orderBy: { vencimento: 'asc' },
      take: PROXIMOS_VENCIMENTOS_LIMIT,
    });

    return {
      totalKitnets,
      ocupadas,
      vagas: totalKitnets - ocupadas,
      valorMensal,
      proximosVencimentos: proximosVencimentos.map((pagamento) => ({
        id: pagamento.id,
        morador: pagamento.morador.nome,
        vencimento: pagamento.vencimento,
        valor: pagamento.valor,
      })),
    };
  }
}
