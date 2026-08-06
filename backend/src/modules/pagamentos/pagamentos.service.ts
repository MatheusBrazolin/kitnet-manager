import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreatePagamentoDto } from './dto/create-pagamento.dto';
import { UpdatePagamentoDto } from './dto/update-pagamento.dto';

@Injectable()
export class PagamentosService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: number) {
    await this.ensureCurrentMonthPagamentos(userId);
    return this.prisma.pagamento.findMany({
      where: { morador: { kitnet: { userId } } },
      include: { morador: { include: { kitnet: { include: { imovel: true } } } } },
      orderBy: { vencimento: 'asc' },
    });
  }

  async ensureCurrentMonthPagamentos(userId: number) {
    // Datas de vencimento são "só calendário" (sem hora) — tudo calculado em UTC pra não
    // depender do timezone de onde o processo Node roda (dev local vs. função na Vercel).
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const periodStart = new Date(Date.UTC(year, month, 1));
    const periodEnd = new Date(Date.UTC(year, month + 1, 1));

    const moradores = await this.prisma.morador.findMany({
      where: { kitnet: { userId } },
      include: {
        kitnet: true,
        pagamentos: { where: { vencimento: { gte: periodStart, lt: periodEnd } }, select: { id: true } },
      },
    });
    if (moradores.length === 0) {
      return;
    }

    const pendentes = moradores.filter((morador) => morador.pagamentos.length === 0);
    if (pendentes.length === 0) {
      return;
    }

    const diasNoMes = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    await this.prisma.pagamento.createMany({
      data: pendentes.map((morador) => ({
        moradorId: morador.id,
        valor: morador.kitnet.valor,
        vencimento: new Date(Date.UTC(year, month, Math.min(morador.diaVencimento, diasNoMes))),
      })),
    });
  }

  async getAlertas(userId: number) {
    await this.ensureCurrentMonthPagamentos(userId);

    // "Vencendo hoje ou já vencido e ainda não confirmado como pago" — calendário em UTC,
    // igual ao resto do módulo, pra não variar com o timezone do processo.
    const now = new Date();
    const hojeFimDoDia = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));

    const pendentes = await this.prisma.pagamento.findMany({
      where: {
        pago: false,
        vencimento: { lt: hojeFimDoDia },
        morador: { kitnet: { userId } },
      },
      include: { morador: { include: { kitnet: { include: { imovel: true } } } } },
      orderBy: { vencimento: 'asc' },
    });

    return pendentes.map((pagamento) => ({
      id: pagamento.id,
      valor: pagamento.valor,
      vencimento: pagamento.vencimento,
      morador: pagamento.morador.nome,
      kitnet: pagamento.morador.kitnet.numero,
      imovel: pagamento.morador.kitnet.imovel.nome,
      venceHoje:
        pagamento.vencimento.getUTCFullYear() === now.getUTCFullYear() &&
        pagamento.vencimento.getUTCMonth() === now.getUTCMonth() &&
        pagamento.vencimento.getUTCDate() === now.getUTCDate(),
    }));
  }

  async findOwnedOrThrow(userId: number, id: number) {
    const pagamento = await this.prisma.pagamento.findUnique({
      where: { id },
      include: { morador: { include: { kitnet: true } } },
    });
    if (!pagamento) {
      throw new NotFoundException('Pagamento não encontrado');
    }
    if (pagamento.morador.kitnet.userId !== userId) {
      throw new ForbiddenException('Você não tem acesso a este pagamento');
    }
    return pagamento;
  }

  private async assertMoradorOwnership(userId: number, moradorId: number) {
    const morador = await this.prisma.morador.findUnique({ where: { id: moradorId }, include: { kitnet: true } });
    if (!morador) {
      throw new NotFoundException('Morador não encontrado');
    }
    if (morador.kitnet.userId !== userId) {
      throw new ForbiddenException('Você não tem acesso a este morador');
    }
  }

  async create(userId: number, dto: CreatePagamentoDto) {
    await this.assertMoradorOwnership(userId, dto.moradorId);
    return this.prisma.pagamento.create({
      data: {
        valor: dto.valor,
        vencimento: new Date(dto.vencimento),
        pago: dto.pago ?? false,
        moradorId: dto.moradorId,
      },
    });
  }

  async update(userId: number, id: number, dto: UpdatePagamentoDto) {
    await this.findOwnedOrThrow(userId, id);
    return this.prisma.pagamento.update({
      where: { id },
      data: {
        ...dto,
        vencimento: dto.vencimento ? new Date(dto.vencimento) : undefined,
      },
    });
  }

  async remove(userId: number, id: number) {
    await this.findOwnedOrThrow(userId, id);
    await this.prisma.pagamento.delete({ where: { id } });
  }
}
