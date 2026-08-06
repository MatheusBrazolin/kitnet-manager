import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateImovelDto } from './dto/create-imovel.dto';
import { UpdateImovelDto } from './dto/update-imovel.dto';
import { CreateUnidadesLoteDto } from './dto/create-unidades-lote.dto';
import { PLAN_KITNET_LIMITS } from '../../common/plan-limits';

@Injectable()
export class ImoveisService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: number) {
    return this.prisma.imovel.findMany({
      where: { userId },
      include: { kitnets: { include: { moradores: true }, orderBy: { numero: 'asc' } } },
      orderBy: { nome: 'asc' },
    });
  }

  async findOwnedOrThrow(userId: number, id: number) {
    const imovel = await this.prisma.imovel.findUnique({
      where: { id },
      include: { kitnets: { include: { moradores: true }, orderBy: { numero: 'asc' } } },
    });
    if (!imovel) {
      throw new NotFoundException('Imóvel não encontrado');
    }
    if (imovel.userId !== userId) {
      throw new ForbiddenException('Você não tem acesso a este imóvel');
    }
    return imovel;
  }

  create(userId: number, dto: CreateImovelDto) {
    return this.prisma.imovel.create({ data: { ...dto, userId } });
  }

  async update(userId: number, id: number, dto: UpdateImovelDto) {
    await this.findOwnedOrThrow(userId, id);
    return this.prisma.imovel.update({ where: { id }, data: dto });
  }

  async remove(userId: number, id: number) {
    const imovel = await this.findOwnedOrThrow(userId, id);
    if (imovel.kitnets.length > 0) {
      throw new ConflictException(
        'Remova ou mova as unidades deste imóvel antes de excluí-lo.',
      );
    }
    await this.prisma.imovel.delete({ where: { id } });
  }

  async createUnidadesLote(userId: number, imovelId: number, dto: CreateUnidadesLoteDto) {
    const imovel = await this.findOwnedOrThrow(userId, imovelId);

    return this.prisma.$transaction(
      async (tx) => {
        const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
        const total = await tx.kitnet.count({ where: { userId } });
        const limit = PLAN_KITNET_LIMITS[user.plano];

        if (total + dto.quantidade > limit) {
          throw new BadRequestException(
            `Limite de ${limit} unidades do plano ${user.plano} atingido. Faça upgrade para cadastrar mais.`,
          );
        }

        const existentes = imovel.kitnets.length;
        const prefixo = dto.prefixo ?? '';
        const novas = Array.from({ length: dto.quantidade }, (_, index) => ({
          numero: `${prefixo}${String(existentes + index + 1).padStart(2, '0')}`,
          valor: dto.valor,
          userId,
          imovelId,
        }));

        await tx.kitnet.createMany({ data: novas });
        return tx.kitnet.findMany({ where: { imovelId }, include: { moradores: true }, orderBy: { numero: 'asc' } });
      },
      { isolationLevel: 'Serializable' },
    );
  }
}
