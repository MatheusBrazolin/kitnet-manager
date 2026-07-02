import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreatePagamentoDto } from './dto/create-pagamento.dto';
import { UpdatePagamentoDto } from './dto/update-pagamento.dto';

@Injectable()
export class PagamentosService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: number) {
    return this.prisma.pagamento.findMany({
      where: { morador: { kitnet: { userId } } },
      include: { morador: { include: { kitnet: true } } },
      orderBy: { vencimento: 'asc' },
    });
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
