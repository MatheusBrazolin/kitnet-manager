import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StatusPagamento } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreatePagamentoDto } from './dto/create-pagamento.dto';
import { CreatePagamentoComplementarDto } from './dto/create-pagamento-complementar.dto';
import { UpdatePagamentoDto } from './dto/update-pagamento.dto';
import { MarcarPagoDto } from './dto/marcar-pago.dto';
import { AnularPagamentoDto } from './dto/anular-pagamento.dto';

type ValorHistorico = { valor: number; vigenteDesde: Date };

type MoradorParaGeracao = {
  id: number;
  dataEntrada: Date;
  diaVencimento: number;
  kitnet: { valor: number; historicoValor?: ValorHistorico[] };
};

// `include` usado sempre que vamos gerar parcelas: sem o histórico, o backfill de meses
// passados cobraria o valor de hoje (ver `valorVigenteEm`).
const KITNET_COM_HISTORICO = {
  include: { historicoValor: { select: { valor: true, vigenteDesde: true } } },
} as const;

// Todas as datas de pagamento são "só calendário" (sem hora) e tratadas em UTC — pra não
// depender do timezone de onde o processo Node roda (dev local vs. função na Vercel).
function truncarMes(data: Date) {
  return new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), 1));
}

function diasNoMes(mesReferencia: Date) {
  return new Date(
    Date.UTC(
      mesReferencia.getUTCFullYear(),
      mesReferencia.getUTCMonth() + 1,
      0,
    ),
  ).getUTCDate();
}

function vencimentoDoMes(mesReferencia: Date, diaVencimento: number) {
  const dia = Math.min(diaVencimento, diasNoMes(mesReferencia));
  return new Date(
    Date.UTC(mesReferencia.getUTCFullYear(), mesReferencia.getUTCMonth(), dia),
  );
}

/**
 * Quanto a unidade custava numa data específica, segundo o histórico append-only de
 * `KitnetValorHistorico`.
 *
 * Isso importa porque as parcelas são geradas sob demanda, inclusive retroativamente: um
 * morador que entrou em janeiro e só teve a tela de Pagamentos aberta em março ganha as
 * parcelas de jan/fev criadas em março. Usar `kitnet.valor` (o valor de hoje) nesse
 * momento reescreve o passado — se houve reajuste em fevereiro, janeiro passa a constar
 * com o valor novo, inflando o total em atraso e todo o histórico de receita.
 *
 * Fallback para `valorAtual` quando não há histórico: unidades criadas pelo cadastro em
 * lote não tinham registro inicial (corrigido em ImoveisService, mas as antigas seguem
 * sem), e nesse caso o valor corrente é o melhor palpite disponível.
 */
function valorVigenteEm(
  historico: ValorHistorico[] | undefined,
  data: Date,
  valorAtual: number,
): number {
  if (!historico || historico.length === 0) {
    return valorAtual;
  }
  const ordenado = [...historico].sort(
    (a, b) => a.vigenteDesde.getTime() - b.vigenteDesde.getTime(),
  );
  let vigente: number | undefined;
  for (const ponto of ordenado) {
    if (ponto.vigenteDesde.getTime() <= data.getTime()) {
      vigente = ponto.valor;
    }
  }
  // Data anterior ao primeiro registro (ex.: morador com entrada anterior ao cadastro da
  // unidade no sistema) — usa o valor mais antigo conhecido, não o mais recente.
  return vigente ?? ordenado[0].valor;
}

function enumerarMeses(inicio: Date, fim: Date) {
  const meses: Date[] = [];
  const cursor = new Date(inicio);
  while (cursor.getTime() <= fim.getTime()) {
    meses.push(new Date(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return meses;
}

@Injectable()
export class PagamentosService {
  constructor(private readonly prisma: PrismaService) {}

  // Um pagamento "PENDENTE" cujo vencimento já passou é exibido como "ATRASADO" — esse
  // estado não é gravado no banco (evita write amplification / cron), é resolvido na leitura.
  // Público porque outros módulos (ex.: MoradoresService) também exibem pagamentos e
  // precisam aplicar a mesma regra, em vez de duplicá-la.
  comStatusEfetivo<T extends { status: StatusPagamento; vencimento: Date }>(
    pagamento: T,
    agora: Date = new Date(),
  ): T {
    if (pagamento.status === 'PENDENTE' && pagamento.vencimento < agora) {
      return { ...pagamento, status: 'ATRASADO' };
    }
    return pagamento;
  }

  /** Pagamentos de um único morador, já com o status ATRASADO resolvido — usado pelo histórico. */
  async listarPorMorador(moradorId: number) {
    const now = new Date();
    const pagamentos = await this.prisma.pagamento.findMany({
      where: { moradorId },
      orderBy: { mesReferencia: 'desc' },
    });
    return pagamentos.map((pagamento) => this.comStatusEfetivo(pagamento, now));
  }

  /**
   * Garante que exista uma parcela (registro de Pagamento) para cada mês de competência
   * entre o mês de entrada do morador e o mês atual — inclusive os meses "esquecidos"
   * (ex.: morador cadastrado essa semana mas que já morava há 2 meses). Nunca duplica um
   * mês já existente (protegido pela unique constraint [moradorId, mesReferencia]).
   */
  async ensurePagamentosParaMorador(morador: MoradorParaGeracao) {
    const mesEntrada = truncarMes(morador.dataEntrada);
    const mesAtual = truncarMes(new Date());
    const meses = enumerarMeses(mesEntrada, mesAtual);

    const existentes = await this.prisma.pagamento.findMany({
      where: { moradorId: morador.id, mesReferencia: { in: meses } },
      select: { mesReferencia: true },
    });
    const jaExistem = new Set(existentes.map((p) => p.mesReferencia.getTime()));
    const faltantes = meses.filter((mes) => !jaExistem.has(mes.getTime()));
    if (faltantes.length === 0) {
      return;
    }

    await this.prisma.pagamento.createMany({
      data: faltantes.map((mesReferencia) => {
        const vencimento = vencimentoDoMes(
          mesReferencia,
          morador.diaVencimento,
        );
        return {
          moradorId: morador.id,
          valor: valorVigenteEm(
            morador.kitnet.historicoValor,
            vencimento,
            morador.kitnet.valor,
          ),
          mesReferencia,
          vencimento,
          status: StatusPagamento.PENDENTE,
        };
      }),
      skipDuplicates: true,
    });
  }

  /**
   * Mesma garantia de `ensurePagamentosParaMorador`, mas para todos os moradores da conta de
   * uma vez — usado em todo GET /pagamentos e GET /dashboard, então batching aqui importa:
   * em vez de 1 SELECT + 1 INSERT por morador (N+1), faz 1 SELECT com todos os meses já
   * lançados de todos os moradores e 1 único createMany com o que falta.
   */
  async ensurePagamentosParaConta(userId: number) {
    const moradores = await this.prisma.morador.findMany({
      where: { kitnet: { userId } },
      include: { kitnet: KITNET_COM_HISTORICO },
    });
    if (moradores.length === 0) {
      return;
    }

    const mesAtual = truncarMes(new Date());
    const porMorador = moradores.map((morador) => ({
      morador,
      meses: enumerarMeses(truncarMes(morador.dataEntrada), mesAtual),
    }));

    const existentes = await this.prisma.pagamento.findMany({
      where: { moradorId: { in: moradores.map((morador) => morador.id) } },
      select: { moradorId: true, mesReferencia: true },
    });
    const jaExistem = new Set(
      existentes.map((p) => `${p.moradorId}:${p.mesReferencia.getTime()}`),
    );

    const faltantes = porMorador.flatMap(({ morador, meses }) =>
      meses
        .filter(
          (mesReferencia) =>
            !jaExistem.has(`${morador.id}:${mesReferencia.getTime()}`),
        )
        .map((mesReferencia) => {
          const vencimento = vencimentoDoMes(
            mesReferencia,
            morador.diaVencimento,
          );
          return {
            moradorId: morador.id,
            valor: valorVigenteEm(
              morador.kitnet.historicoValor,
              vencimento,
              morador.kitnet.valor,
            ),
            mesReferencia,
            vencimento,
            status: StatusPagamento.PENDENTE,
          };
        }),
    );

    if (faltantes.length > 0) {
      await this.prisma.pagamento.createMany({
        data: faltantes,
        skipDuplicates: true,
      });
    }
  }

  async findAll(userId: number) {
    await this.ensurePagamentosParaConta(userId);
    const now = new Date();
    const pagamentos = await this.prisma.pagamento.findMany({
      where: { morador: { kitnet: { userId } } },
      include: {
        morador: { include: { kitnet: { include: { imovel: true } } } },
      },
      orderBy: [{ mesReferencia: 'desc' }, { vencimento: 'asc' }],
    });
    return pagamentos.map((pagamento) => this.comStatusEfetivo(pagamento, now));
  }

  async getAlertas(userId: number) {
    await this.ensurePagamentosParaConta(userId);

    // "Vencendo hoje ou já vencido e ainda não confirmado como pago" — calendário em UTC,
    // igual ao resto do módulo, pra não variar com o timezone do processo.
    const now = new Date();
    const hojeFimDoDia = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
    );

    const pendentes = await this.prisma.pagamento.findMany({
      where: {
        status: StatusPagamento.PENDENTE,
        vencimento: { lt: hojeFimDoDia },
        morador: { kitnet: { userId } },
      },
      include: {
        morador: { include: { kitnet: { include: { imovel: true } } } },
      },
      orderBy: { vencimento: 'asc' },
    });

    return pendentes.map((pagamento) => ({
      id: pagamento.id,
      valor: pagamento.valor,
      vencimento: pagamento.vencimento,
      morador: pagamento.morador.nome,
      kitnet: pagamento.morador.kitnet.numero,
      imovel: pagamento.morador.kitnet.imovel.nome,
      venceHoje:
        pagamento.vencimento.getUTCFullYear() === now.getUTCFullYear() &&
        pagamento.vencimento.getUTCMonth() === now.getUTCMonth() &&
        pagamento.vencimento.getUTCDate() === now.getUTCDate(),
    }));
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
    const morador = await this.prisma.morador.findUnique({
      where: { id: moradorId },
      include: { kitnet: true },
    });
    if (!morador) {
      throw new NotFoundException('Morador não encontrado');
    }
    if (morador.kitnet.userId !== userId) {
      throw new ForbiddenException('Você não tem acesso a este morador');
    }
  }

  async create(userId: number, dto: CreatePagamentoDto) {
    await this.assertMoradorOwnership(userId, dto.moradorId);
    const vencimento = new Date(dto.vencimento);
    try {
      return await this.prisma.pagamento.create({
        data: {
          valor: dto.valor,
          vencimento,
          mesReferencia: truncarMes(vencimento),
          status: StatusPagamento.PENDENTE,
          moradorId: dto.moradorId,
          observacao: dto.observacao,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          'Este morador já tem um pagamento lançado para esse mês.',
        );
      }
      throw err;
    }
  }

  /**
   * Lançamento extra fora do aluguel do mês (ex.: valor recebido de um ex-morador, multa,
   * taxa). Diferente da parcela de ALUGUEL, já nasce como PAGO — é um registro do que já
   * foi recebido, não uma cobrança pendente. Coexiste com a parcela de ALUGUEL do mesmo mês
   * (unique constraint é por [moradorId, mesReferencia, tipo]).
   */
  async createComplementar(
    userId: number,
    dto: CreatePagamentoComplementarDto,
  ) {
    await this.assertMoradorOwnership(userId, dto.moradorId);
    const dataPagamento = new Date(dto.dataPagamento);
    try {
      return await this.prisma.pagamento.create({
        data: {
          valor: dto.valor,
          vencimento: dataPagamento,
          mesReferencia: truncarMes(dataPagamento),
          status: StatusPagamento.PAGO,
          dataPagamento,
          formaPagamento: dto.formaPagamento,
          moradorId: dto.moradorId,
          tipo: 'COMPLEMENTAR',
          origem: dto.origem,
          observacao: dto.observacao,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          'Este morador já tem um pagamento complementar lançado para esse mês.',
        );
      }
      throw err;
    }
  }

  async update(userId: number, id: number, dto: UpdatePagamentoDto) {
    await this.findOwnedOrThrow(userId, id);
    const vencimento = dto.vencimento ? new Date(dto.vencimento) : undefined;
    try {
      return await this.prisma.pagamento.update({
        where: { id },
        data: {
          ...dto,
          vencimento,
          mesReferencia: vencimento ? truncarMes(vencimento) : undefined,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          'Este morador já tem um pagamento lançado para esse mês.',
        );
      }
      throw err;
    }
  }

  async marcarPago(userId: number, id: number, dto: MarcarPagoDto) {
    await this.findOwnedOrThrow(userId, id);
    return this.prisma.pagamento.update({
      where: { id },
      data: {
        status: StatusPagamento.PAGO,
        dataPagamento: dto.dataPagamento
          ? new Date(dto.dataPagamento)
          : new Date(),
        formaPagamento: dto.formaPagamento ?? null,
      },
    });
  }

  async desfazerPagamento(userId: number, id: number) {
    await this.findOwnedOrThrow(userId, id);
    return this.prisma.pagamento.update({
      where: { id },
      data: {
        status: StatusPagamento.PENDENTE,
        dataPagamento: null,
        formaPagamento: null,
      },
    });
  }

  /**
   * Anula uma parcela específica — usado quando ela não vai ser recebida (ex.: 1º mês
   * repassado à imobiliária, morador saiu antes do fim do contrato). Diferente de marcar
   * como paga: não entra como receita, e sai de "total em atraso"/"próximos vencimentos"
   * (essas consultas filtram por PENDENTE/PAGO, então ANULADO já fica de fora). Reversível
   * pelo mesmo endpoint de "desfazer" usado para PAGO.
   */
  async anular(userId: number, id: number, dto: AnularPagamentoDto) {
    await this.findOwnedOrThrow(userId, id);
    return this.prisma.pagamento.update({
      where: { id },
      data: {
        status: StatusPagamento.ANULADO,
        dataPagamento: null,
        formaPagamento: null,
        observacao: dto.observacao,
      },
    });
  }

  async remove(userId: number, id: number) {
    await this.findOwnedOrThrow(userId, id);
    await this.prisma.pagamento.delete({ where: { id } });
  }
}
