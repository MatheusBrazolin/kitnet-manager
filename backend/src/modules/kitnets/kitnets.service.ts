import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateKitnetDto } from './dto/create-kitnet.dto';
import { UpdateKitnetDto } from './dto/update-kitnet.dto';

@Injectable()
export class KitnetsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: number) {
    return this.prisma.kitnet.findMany({
      where: { userId },
      include: { moradores: true, imovel: true },
      orderBy: { numero: 'asc' },
    });
  }

  async findOwnedOrThrow(userId: number, id: number) {
    const kitnet = await this.prisma.kitnet.findUnique({
      where: { id },
      include: { moradores: true, imovel: true },
    });
    if (!kitnet) {
      throw new NotFoundException('Kitnet não encontrada');
    }
    if (kitnet.userId !== userId) {
      throw new ForbiddenException('Você não tem acesso a esta kitnet');
    }
    return kitnet;
  }

  async findDetail(userId: number, id: number) {
    const kitnet = await this.findOwnedOrThrow(userId, id);
    const gastos = await this.prisma.gasto.findMany({
      where: { kitnetId: id },
      orderBy: { data: 'desc' },
    });
    const totalGasto = gastos.reduce((total, gasto) => total + gasto.valor, 0);
    return { ...kitnet, gastos, totalGasto };
  }

  private async assertImovelOwnership(userId: number, imovelId: number) {
    const imovel = await this.prisma.imovel.findUnique({ where: { id: imovelId } });
    if (!imovel) {
      throw new NotFoundException('Imóvel não encontrado');
    }
    if (imovel.userId !== userId) {
      throw new ForbiddenException('Você não tem acesso a este imóvel');
    }
  }

  async create(userId: number, dto: CreateKitnetDto) {
    await this.assertImovelOwnership(userId, dto.imovelId);
    return this.prisma.kitnet.create({ data: { ...dto, userId } });
  }

  async update(userId: number, id: number, dto: UpdateKitnetDto) {
    await this.findOwnedOrThrow(userId, id);
    if (dto.imovelId !== undefined) {
      await this.assertImovelOwnership(userId, dto.imovelId);
    }
    return this.prisma.kitnet.update({ where: { id }, data: dto });
  }

  async remove(userId: number, id: number) {
    await this.findOwnedOrThrow(userId, id);
    await this.prisma.kitnet.delete({ where: { id } });
  }
}
