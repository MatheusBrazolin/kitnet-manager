import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateImovelDto } from './dto/create-imovel.dto';
import { UpdateImovelDto } from './dto/update-imovel.dto';
import { CreateUnidadesLoteDto } from './dto/create-unidades-lote.dto';

@Injectable()
export class ImoveisService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: number) {
    return this.prisma.imovel.findMany({
      where: { userId },
      include: {
        kitnets: { include: { moradores: true }, orderBy: { numero: 'asc' } },
      },
      orderBy: { nome: 'asc' },
    });
  }

  async findOwnedOrThrow(userId: number, id: number) {
    const imovel = await this.prisma.imovel.findUnique({
      where: { id },
      include: {
        kitnets: { include: { moradores: true }, orderBy: { numero: 'asc' } },
      },
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

  async createUnidadesLote(
    userId: number,
    imovelId: number,
    dto: CreateUnidadesLoteDto,
  ) {
    await this.findOwnedOrThrow(userId, imovelId);

    const novas = dto.unidades.map((unidade) => ({
      numero: unidade.numero,
      valor: unidade.valor,
      userId,
      imovelId,
    }));

    // Cada unidade precisa nascer com um ponto inicial no histórico de valor — é o que
    // KitnetsService.create já fazia, e o que o modelo assume ("criado uma vez na criação
    // da kitnet"). Sem isso, as unidades cadastradas em lote ficavam com histórico vazio e
    // o valor original se perdia na primeira edição; pior, as parcelas retroativas passavam
    // a ser geradas com o valor de hoje. Em transação para não deixar kitnet sem histórico
    // caso o segundo passo falhe.
    await this.prisma.$transaction(async (tx) => {
      await tx.kitnet.createMany({ data: novas });
      const criadas = await tx.kitnet.findMany({
        where: {
          imovelId,
          numero: { in: novas.map((unidade) => unidade.numero) },
        },
        select: { id: true, valor: true, createdAt: true },
      });
      await tx.kitnetValorHistorico.createMany({
        data: criadas.map((kitnet) => ({
          kitnetId: kitnet.id,
          valor: kitnet.valor,
          vigenteDesde: kitnet.createdAt,
        })),
      });
    });

    return this.prisma.kitnet.findMany({
      where: { imovelId },
      include: { moradores: true },
      orderBy: { numero: 'asc' },
    });
  }
}
