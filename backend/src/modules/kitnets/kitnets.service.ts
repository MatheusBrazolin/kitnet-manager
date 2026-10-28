import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateKitnetDto } from './dto/create-kitnet.dto';
import { UpdateKitnetDto } from './dto/update-kitnet.dto';
import {
  IMOBILIARIA_PARA_TAXA,
  IMOVEL_COM_TOTAL_UNIDADES,
} from '../../common/prisma/includes';

@Injectable()
export class KitnetsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: number) {
    return this.prisma.kitnet.findMany({
      where: { userId },
      include: {
        moradores: true,
        imovel: IMOVEL_COM_TOTAL_UNIDADES,
        imobiliaria: IMOBILIARIA_PARA_TAXA,
      },
      orderBy: { numero: 'asc' },
    });
  }

  async findOwnedOrThrow(userId: number, id: number) {
    const kitnet = await this.prisma.kitnet.findUnique({
      where: { id },
      include: {
        moradores: true,
        imovel: IMOVEL_COM_TOTAL_UNIDADES,
        imobiliaria: IMOBILIARIA_PARA_TAXA,
      },
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
    const [gastos, historicoValor] = await Promise.all([
      this.prisma.gasto.findMany({
        where: { kitnetId: id },
        orderBy: { data: 'desc' },
      }),
      this.prisma.kitnetValorHistorico.findMany({
        where: { kitnetId: id },
        orderBy: { vigenteDesde: 'desc' },
      }),
    ]);
    const totalGasto = gastos.reduce((total, gasto) => total + gasto.valor, 0);
    return { ...kitnet, gastos, totalGasto, historicoValor };
  }

  /**
   * Uma unidade só pode apontar para uma administradora da MESMA conta — senão bastaria
   * mandar um id qualquer no corpo para descobrir (e usar) a taxa de outro proprietário.
   */
  private async assertImobiliariaOwnership(
    userId: number,
    imobiliariaId: number,
  ) {
    const imobiliaria = await this.prisma.imobiliaria.findUnique({
      where: { id: imobiliariaId },
    });
    if (!imobiliaria) {
      throw new NotFoundException('Imobiliária não encontrada');
    }
    if (imobiliaria.userId !== userId) {
      throw new ForbiddenException('Você não tem acesso a esta imobiliária');
    }
  }

  private async assertImovelOwnership(userId: number, imovelId: number) {
    const imovel = await this.prisma.imovel.findUnique({
      where: { id: imovelId },
    });
    if (!imovel) {
      throw new NotFoundException('Imóvel não encontrado');
    }
    if (imovel.userId !== userId) {
      throw new ForbiddenException('Você não tem acesso a este imóvel');
    }
  }

  async create(userId: number, dto: CreateKitnetDto) {
    await this.assertImovelOwnership(userId, dto.imovelId);
    if (dto.imobiliariaId !== undefined && dto.imobiliariaId !== null) {
      await this.assertImobiliariaOwnership(userId, dto.imobiliariaId);
    }
    // Em transação: uma kitnet sem o primeiro ponto de histórico quebra a invariante do
    // modelo e faz as parcelas retroativas serem geradas com o valor de hoje.
    return this.prisma.$transaction(async (tx) => {
      const kitnet = await tx.kitnet.create({ data: { ...dto, userId } });
      // Primeiro registro do histórico de valor — vigente desde a criação da unidade.
      await tx.kitnetValorHistorico.create({
        data: {
          kitnetId: kitnet.id,
          valor: kitnet.valor,
          vigenteDesde: kitnet.createdAt,
        },
      });
      return kitnet;
    });
  }

  async update(userId: number, id: number, dto: UpdateKitnetDto) {
    const atual = await this.findOwnedOrThrow(userId, id);
    if (dto.imovelId !== undefined) {
      await this.assertImovelOwnership(userId, dto.imovelId);
    }
    if (dto.imobiliariaId !== undefined && dto.imobiliariaId !== null) {
      await this.assertImobiliariaOwnership(userId, dto.imobiliariaId);
    }

    // Só registra um novo ponto no histórico quando o valor realmente muda — editar só o
    // número da unidade ou a taxa da imobiliária não é um "reajuste".
    if (dto.valor !== undefined && dto.valor !== atual.valor) {
      const [, kitnetAtualizada] = await this.prisma.$transaction([
        this.prisma.kitnetValorHistorico.create({
          data: { kitnetId: id, valor: dto.valor },
        }),
        this.prisma.kitnet.update({ where: { id }, data: dto }),
      ]);
      return kitnetAtualizada;
    }

    return this.prisma.kitnet.update({ where: { id }, data: dto });
  }

  async remove(userId: number, id: number) {
    await this.findOwnedOrThrow(userId, id);
    await this.prisma.kitnet.delete({ where: { id } });
  }
}
