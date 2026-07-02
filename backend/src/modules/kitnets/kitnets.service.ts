import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateKitnetDto } from './dto/create-kitnet.dto';
import { UpdateKitnetDto } from './dto/update-kitnet.dto';
import { PLAN_KITNET_LIMITS } from '../../common/plan-limits';

@Injectable()
export class KitnetsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: number) {
    return this.prisma.kitnet.findMany({
      where: { userId },
      include: { moradores: true },
      orderBy: { numero: 'asc' },
    });
  }

  async findOwnedOrThrow(userId: number, id: number) {
    const kitnet = await this.prisma.kitnet.findUnique({ where: { id }, include: { moradores: true } });
    if (!kitnet) {
      throw new NotFoundException('Kitnet não encontrada');
    }
    if (kitnet.userId !== userId) {
      throw new ForbiddenException('Você não tem acesso a esta kitnet');
    }
    return kitnet;
  }

  async create(userId: number, dto: CreateKitnetDto) {
    return this.prisma.$transaction(
      async (tx) => {
        const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
        const total = await tx.kitnet.count({ where: { userId } });
        const limit = PLAN_KITNET_LIMITS[user.plano];

        if (total >= limit) {
          throw new BadRequestException(
            `Limite de ${limit} kitnets do plano ${user.plano} atingido. Faça upgrade para cadastrar mais.`,
          );
        }

        return tx.kitnet.create({ data: { ...dto, userId } });
      },
      { isolationLevel: 'Serializable' },
    );
  }

  async update(userId: number, id: number, dto: UpdateKitnetDto) {
    await this.findOwnedOrThrow(userId, id);
    return this.prisma.kitnet.update({ where: { id }, data: dto });
  }

  async remove(userId: number, id: number) {
    await this.findOwnedOrThrow(userId, id);
    await this.prisma.kitnet.delete({ where: { id } });
  }
}
