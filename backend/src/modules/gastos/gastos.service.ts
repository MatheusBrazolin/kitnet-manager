import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateGastoDto } from './dto/create-gasto.dto';
import { UpdateGastoDto } from './dto/update-gasto.dto';

@Injectable()
export class GastosService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: number) {
    return this.prisma.gasto.findMany({
      where: { kitnet: { userId } },
      include: { kitnet: true },
      orderBy: { data: 'desc' },
    });
  }

  async findOwnedOrThrow(userId: number, id: number) {
    const gasto = await this.prisma.gasto.findUnique({ where: { id }, include: { kitnet: true } });
    if (!gasto) {
      throw new NotFoundException('Gasto não encontrado');
    }
    if (gasto.kitnet.userId !== userId) {
      throw new ForbiddenException('Você não tem acesso a este gasto');
    }
    return gasto;
  }

  private async assertKitnetOwnership(userId: number, kitnetId: number) {
    const kitnet = await this.prisma.kitnet.findUnique({ where: { id: kitnetId } });
    if (!kitnet) {
      throw new NotFoundException('Kitnet não encontrada');
    }
    if (kitnet.userId !== userId) {
      throw new ForbiddenException('Você não tem acesso a esta kitnet');
    }
  }

  async create(userId: number, dto: CreateGastoDto) {
    await this.assertKitnetOwnership(userId, dto.kitnetId);
    return this.prisma.gasto.create({
      data: {
        descricao: dto.descricao,
        valor: dto.valor,
        data: new Date(dto.data),
        kitnetId: dto.kitnetId,
      },
    });
  }

  async update(userId: number, id: number, dto: UpdateGastoDto) {
    await this.findOwnedOrThrow(userId, id);
    return this.prisma.gasto.update({
      where: { id },
      data: {
        ...dto,
        data: dto.data ? new Date(dto.data) : undefined,
      },
    });
  }

  async remove(userId: number, id: number) {
    await this.findOwnedOrThrow(userId, id);
    await this.prisma.gasto.delete({ where: { id } });
  }
}
