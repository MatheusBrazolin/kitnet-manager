import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateImobiliariaDto } from './dto/create-imobiliaria.dto';
import { UpdateImobiliariaDto } from './dto/update-imobiliaria.dto';

@Injectable()
export class ImobiliariasService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: number) {
    return this.prisma.imobiliaria.findMany({
      where: { userId },
      // A tela lista quantas unidades cada administradora cuida; sem o _count seria uma
      // consulta por linha.
      include: { _count: { select: { kitnets: true } } },
      orderBy: { nome: 'asc' },
    });
  }

  async findOwnedOrThrow(userId: number, id: number) {
    const imobiliaria = await this.prisma.imobiliaria.findUnique({
      where: { id },
      include: { _count: { select: { kitnets: true } } },
    });
    if (!imobiliaria) {
      throw new NotFoundException('Imobiliária não encontrada');
    }
    if (imobiliaria.userId !== userId) {
      throw new ForbiddenException('Você não tem acesso a esta imobiliária');
    }
    return imobiliaria;
  }

  create(userId: number, dto: CreateImobiliariaDto) {
    return this.prisma.imobiliaria.create({
      data: { ...dto, userId },
      include: { _count: { select: { kitnets: true } } },
    });
  }

  async update(userId: number, id: number, dto: UpdateImobiliariaDto) {
    await this.findOwnedOrThrow(userId, id);
    return this.prisma.imobiliaria.update({
      where: { id },
      data: dto,
      include: { _count: { select: { kitnets: true } } },
    });
  }

  async remove(userId: number, id: number) {
    const imobiliaria = await this.findOwnedOrThrow(userId, id);

    // A FK é SetNull, então o banco deixaria apagar e as unidades virariam "gestão
    // direta" silenciosamente — o proprietário perderia a informação de quem administra
    // cada uma sem nenhum aviso. Bloqueamos e dizemos o que fazer antes, no mesmo
    // espírito de ImoveisService.remove com imóveis que ainda têm unidades.
    if (imobiliaria._count.kitnets > 0) {
      throw new ConflictException(
        'Desvincule as unidades desta imobiliária antes de excluí-la.',
      );
    }

    await this.prisma.imobiliaria.delete({ where: { id } });
  }
}
