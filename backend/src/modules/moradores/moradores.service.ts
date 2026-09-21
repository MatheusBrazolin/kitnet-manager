import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PagamentosService } from '../pagamentos/pagamentos.service';
import {
  buildPaginatedResult,
  isPaginationRequested,
  type PaginationQueryDto,
} from '../../common/dto/pagination-query.dto';
import { CreateMoradorDto } from './dto/create-morador.dto';
import { UpdateMoradorDto } from './dto/update-morador.dto';

@Injectable()
export class MoradoresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pagamentosService: PagamentosService,
  ) {}

  async findAll(userId: number, pagination: PaginationQueryDto = {}) {
    const where = { kitnet: { userId } };
    const include = { kitnet: { include: { imovel: true } } };
    const orderBy = { nome: 'asc' as const };

    if (!isPaginationRequested(pagination)) {
      return this.prisma.morador.findMany({ where, include, orderBy });
    }

    const limit = pagination.limit ?? 20;
    const page = pagination.page ?? 1;
    const [data, total] = await Promise.all([
      this.prisma.morador.findMany({
        where,
        include,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.morador.count({ where }),
    ]);
    return buildPaginatedResult(data, total, pagination);
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
    const kitnet = await this.prisma.kitnet.findUnique({
      where: { id: kitnetId },
      // O histórico de valor vem junto porque quem cria um morador precisa gerar as
      // parcelas retroativas com o valor vigente em cada mês, não com o valor de hoje.
      include: {
        historicoValor: { select: { valor: true, vigenteDesde: true } },
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

  async create(userId: number, dto: CreateMoradorDto) {
    const kitnet = await this.assertKitnetOwnership(userId, dto.kitnetId);

    const dataEntrada = dto.dataEntrada
      ? new Date(dto.dataEntrada)
      : new Date();
    // getUTCDate, não getDate: `dataEntrada` vem de new Date('2026-03-01') = meia-noite
    // UTC, e o resto do módulo de pagamentos trabalha em UTC por decisão explícita. Em
    // America/Sao_Paulo (UTC-3), getDate() devolveria 28/fev para uma entrada em 01/03 —
    // o morador passaria a vencer todo dia 28, três dias antes do combinado.
    const diaVencimento = dto.diaVencimento ?? dataEntrada.getUTCDate();

    // Transação: criar o morador e marcar a unidade como ocupada é uma coisa só. Se o
    // update falhasse no meio, sobraria um morador dentro de uma kitnet ainda marcada
    // como "vaga" — e é esse campo que o dashboard usa pra contar unidades ocupadas.
    const morador = await this.prisma.$transaction(async (tx) => {
      const criado = await tx.morador.create({
        data: {
          nome: dto.nome,
          telefone: dto.telefone,
          kitnetId: dto.kitnetId,
          dataEntrada,
          diaVencimento,
        },
      });
      await tx.kitnet.update({
        where: { id: dto.kitnetId },
        data: { status: 'ocupada' },
      });
      return criado;
    });

    // Gera já a(s) parcela(s) retroativa(s) até o mês atual, sem esperar o próximo GET
    // em /pagamentos — evita o morador ficar sem nenhuma parcela lançada até alguém abrir
    // a tela de Pagamentos.
    await this.pagamentosService.ensurePagamentosParaMorador({
      id: morador.id,
      dataEntrada: morador.dataEntrada,
      diaVencimento: morador.diaVencimento,
      kitnet: { valor: kitnet.valor, historicoValor: kitnet.historicoValor },
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

    // Mesma razão do create: excluir e liberar a unidade é uma operação só. Antes, uma
    // falha entre os dois passos deixava a kitnet "ocupada" para sempre, sem ninguém
    // dentro, e só dava pra corrigir no banco.
    await this.prisma.$transaction(async (tx) => {
      await tx.morador.delete({ where: { id } });
      const remaining = await tx.morador.count({
        where: { kitnetId: morador.kitnetId },
      });
      if (remaining === 0) {
        await tx.kitnet.update({
          where: { id: morador.kitnetId },
          data: { status: 'vaga' },
        });
      }
    });
  }
}
