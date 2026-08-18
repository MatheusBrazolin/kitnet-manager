import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PagamentosService } from '../pagamentos/pagamentos.service';
import { CreateMoradorDto } from './dto/create-morador.dto';
import { UpdateMoradorDto } from './dto/update-morador.dto';

@Injectable()
export class MoradoresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pagamentosService: PagamentosService,
  ) {}

  findAll(userId: number) {
    return this.prisma.morador.findMany({
      where: { kitnet: { userId } },
      include: { kitnet: { include: { imovel: true } } },
      orderBy: { nome: 'asc' },
    });
  }

  async findOwnedOrThrow(userId: number, id: number) {
    const morador = await this.prisma.morador.findUnique({
      where: { id },
      include: { kitnet: { include: { imovel: true } } },
    });
    if (!morador) {
      throw new NotFoundException('Morador não encontrado');
    }
    if (morador.kitnet.userId !== userId) {
      throw new ForbiddenException('Você não tem acesso a este morador');
    }
    return morador;
  }

  async findDetail(userId: number, id: number) {
    const morador = await this.findOwnedOrThrow(userId, id);
    const pagamentos = await this.pagamentosService.listarPorMorador(id);
    return { ...morador, pagamentos };
  }

  private async assertKitnetOwnership(userId: number, kitnetId: number) {
    const kitnet = await this.prisma.kitnet.findUnique({ where: { id: kitnetId } });
    if (!kitnet) {
      throw new NotFoundException('Kitnet não encontrada');
    }
    if (kitnet.userId !== userId) {
      throw new ForbiddenException('Você não tem acesso a esta kitnet');
    }
    return kitnet;
  }

  async create(userId: number, dto: CreateMoradorDto) {
    const kitnet = await this.assertKitnetOwnership(userId, dto.kitnetId);

    const dataEntrada = dto.dataEntrada ? new Date(dto.dataEntrada) : new Date();
    const diaVencimento = dto.diaVencimento ?? dataEntrada.getDate();

    const morador = await this.prisma.morador.create({
      data: {
        nome: dto.nome,
        telefone: dto.telefone,
        kitnetId: dto.kitnetId,
        dataEntrada,
        diaVencimento,
      },
    });
    await this.prisma.kitnet.update({
      where: { id: dto.kitnetId },
      data: { status: 'ocupada' },
    });

    // Gera já a(s) parcela(s) retroativa(s) até o mês atual, sem esperar o próximo GET
    // em /pagamentos — evita o morador ficar sem nenhuma parcela lançada até alguém abrir
    // a tela de Pagamentos.
    await this.pagamentosService.ensurePagamentosParaMorador({
      id: morador.id,
      dataEntrada: morador.dataEntrada,
      diaVencimento: morador.diaVencimento,
      kitnet: { valor: kitnet.valor },
    });

    return morador;
  }

  async update(userId: number, id: number, dto: UpdateMoradorDto) {
    await this.findOwnedOrThrow(userId, id);
    return this.prisma.morador.update({
      where: { id },
      data: {
        ...dto,
        dataEntrada: dto.dataEntrada ? new Date(dto.dataEntrada) : undefined,
      },
    });
  }

  async remove(userId: number, id: number) {
    const morador = await this.findOwnedOrThrow(userId, id);
    await this.prisma.morador.delete({ where: { id } });

    const remaining = await this.prisma.morador.count({ where: { kitnetId: morador.kitnetId } });
    if (remaining === 0) {
      await this.prisma.kitnet.update({ where: { id: morador.kitnetId }, data: { status: 'vaga' } });
    }
  }
}
