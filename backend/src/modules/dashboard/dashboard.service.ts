import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PagamentosService } from '../pagamentos/pagamentos.service';
import { calcularRepasseDaUnidade } from '../../common/repasse/repasse';
import { IMOBILIARIA_PARA_TAXA } from '../../common/prisma/includes';

const PROXIMOS_VENCIMENTOS_LIMIT = 5;
const HISTORICO_MESES = 12;

/** Linha da tabela "por imobiliária" — uma administradora, ou as unidades sem nenhuma. */
export interface ResumoPorImobiliaria {
  imobiliariaId: number | null;
  nome: string;
  unidades: number;
  ocupadas: number;
  bruto: number;
  taxas: number;
  liquido: number;
}

/** Um mês do histórico, sempre com os quatro números (zero quando não houve movimento). */
export interface PontoHistorico {
  label: string;
  receita: number;
  gasto: number;
  liquido: number;
  taxa: number;
}

/** Chave estável de mês para casar o resultado do banco com a lista de meses esperada. */
function chaveMes(data: Date): string {
  return `${data.getUTCFullYear()}-${data.getUTCMonth()}`;
}

const MES_LABELS = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
];

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pagamentosService: PagamentosService,
  ) {}

  async getSummary(userId: number) {
    const [, kitnets, totalImoveis] = await Promise.all([
      this.pagamentosService.ensurePagamentosParaConta(userId),
      // A imobiliária entra aqui porque a projeção de taxa precisa dela: uma unidade
      // sem taxa própria segue a taxa padrão da administradora, e um percentual só pode
      // ser resolvido com o valor do aluguel em mãos.
      this.prisma.kitnet.findMany({
        where: { userId },
        select: {
          status: true,
          valor: true,
          taxaImobiliaria: true,
          taxaTipo: true,
          imobiliaria: IMOBILIARIA_PARA_TAXA,
        },
      }),
      // Usado só pelo passo-a-passo de boas-vindas, para saber se o primeiro imóvel
      // já existe mesmo quando ainda não há nenhuma unidade dentro dele.
      this.prisma.imovel.count({ where: { userId } }),
    ]);

    const totalKitnets = kitnets.length;
    const ocupadas = kitnets.filter(
      (kitnet) => kitnet.status === 'ocupada',
    ).length;
    const valorMensal = kitnets.reduce(
      (total, kitnet) => total + kitnet.valor,
      0,
    );
    // Quanto do valor mensal (projeção com todas as unidades ocupadas, mesma lógica de
    // `valorMensal`) ficaria retido com imobiliárias em vez de chegar ao dono.
    //
    // Passa por `calcularRepasseDaUnidade` em vez de somar o campo cru: com taxa
    // percentual, `taxaImobiliaria` guarda 10 (dez por cento), e somar esse 10 como se
    // fossem dez reais produziria um número sem sentido.
    const totalImobiliaria = kitnets.reduce(
      (total, kitnet) =>
        total +
        calcularRepasseDaUnidade(kitnet.valor, kitnet, kitnet.imobiliaria).taxa,
      0,
    );

    const now = new Date();
    // Meia-noite UTC de hoje. `vencimento` é gravado como data de calendário em UTC
    // (PagamentosService.vencimentoDoMes), então comparar com o instante atual fazia a
    // parcela que vence HOJE já contar como atrasada a partir das 00h — enquanto a
    // campainha, que usa o fim do dia, dizia "vence hoje". As duas telas discordavam no
    // dia do vencimento.
    const hojeInicioDoDia = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const periodStart = new Date(Date.UTC(year, month, 1));
    const periodEnd = new Date(Date.UTC(year, month + 1, 1));

    const [
      receitaAgg,
      gastoAgg,
      atrasoAgg,
      proximosVencimentos,
      gastosMesPorKitnet,
      historico,
      repasseMesAgg,
      pendenteAgg,
      porImobiliaria,
    ] = await Promise.all([
      // Receita "de caixa" do mês: soma pelo que foi de fato recebido dentro do período,
      // usando a data real do pagamento — não a data de vencimento da parcela.
      this.prisma.pagamento.aggregate({
        where: {
          status: 'PAGO',
          dataPagamento: { gte: periodStart, lt: periodEnd },
          morador: { kitnet: { userId } },
        },
        _sum: { valor: true },
      }),
      this.prisma.gasto.aggregate({
        where: {
          data: { gte: periodStart, lt: periodEnd },
          kitnet: { userId },
        },
        _sum: { valor: true },
      }),
      this.prisma.pagamento.aggregate({
        where: {
          status: 'PENDENTE',
          vencimento: { lt: hojeInicioDoDia },
          morador: { kitnet: { userId } },
        },
        _sum: { valor: true },
      }),
      this.prisma.pagamento.findMany({
        where: { status: 'PENDENTE', morador: { kitnet: { userId } } },
        select: {
          id: true,
          valor: true,
          vencimento: true,
          morador: { select: { nome: true } },
        },
        orderBy: { vencimento: 'asc' },
        take: PROXIMOS_VENCIMENTOS_LIMIT,
      }),
      // Agrupado por imóvel em JS, então basta o valor e a identificação do imóvel.
      this.prisma.gasto.findMany({
        where: {
          data: { gte: periodStart, lt: periodEnd },
          kitnet: { userId },
        },
        select: {
          valor: true,
          data: true,
          kitnet: {
            select: { imovelId: true, imovel: { select: { nome: true } } },
          },
        },
      }),
      this.getHistorico(userId, year, month),
      // Taxa e líquido REALIZADOS no mês: vêm do snapshot gravado em cada pagamento, não
      // de recalcular a taxa atual da unidade — é o que garante que o passado não mude
      // quando uma taxa é renegociada.
      this.prisma.pagamento.aggregate({
        where: {
          status: 'PAGO',
          dataPagamento: { gte: periodStart, lt: periodEnd },
          morador: { kitnet: { userId } },
        },
        _sum: { valorTaxa: true, valorLiquido: true },
      }),
      // Repasses ainda não recebidos, independentemente de já terem vencido. O recorte
      // "só os vencidos" continua em `totalEmAtraso`.
      this.prisma.pagamento.aggregate({
        where: { status: 'PENDENTE', morador: { kitnet: { userId } } },
        _sum: { valor: true },
        _count: { _all: true },
      }),
      this.getResumoPorImobiliaria(userId, periodStart, periodEnd),
    ]);

    const receitaMensal = receitaAgg._sum.valor ?? 0;
    const gastoMensal = gastoAgg._sum.valor ?? 0;
    const taxasMensal = repasseMesAgg._sum.valorTaxa ?? 0;
    const receitaLiquidaMensal = repasseMesAgg._sum.valorLiquido ?? 0;

    const gastosPorImovel = Object.values(
      gastosMesPorKitnet.reduce<
        Record<number, { imovel: string; total: number }>
      >((acc, gasto) => {
        const key = gasto.kitnet.imovelId;
        acc[key] = acc[key] ?? { imovel: gasto.kitnet.imovel.nome, total: 0 };
        acc[key].total += gasto.valor;
        return acc;
      }, {}),
    );

    return {
      totalImoveis,
      totalKitnets,
      ocupadas,
      vagas: totalKitnets - ocupadas,
      valorMensal,
      totalImobiliaria,
      receitaMensal,
      // O que de fato chegou ao proprietário no mês, já descontada a taxa retida.
      receitaLiquidaMensal,
      // Quanto ficou com as administradoras no mesmo período.
      taxasMensal,
      gastoMensal,
      // Passou a partir do líquido: com a taxa agora explícita, chamar de "lucro" um
      // número que ainda embute o repasse da imobiliária seria enganoso — o dinheiro
      // retido nunca chegou à conta do proprietário.
      lucroLiquido: receitaLiquidaMensal - gastoMensal,
      totalEmAtraso: atrasoAgg._sum.valor ?? 0,
      totalPendente: pendenteAgg._sum.valor ?? 0,
      quantidadePendente: pendenteAgg._count._all,
      gastosPorImovel,
      porImobiliaria,
      historico,
      proximosVencimentos: proximosVencimentos.map((pagamento) => ({
        id: pagamento.id,
        morador: pagamento.morador.nome,
        vencimento: pagamento.vencimento,
        valor: pagamento.valor,
      })),
    };
  }

  /**
   * Uma linha por administradora: quantas unidades ela cuida, quantas estão ocupadas, e
   * quanto passou por ela no mês (bruto, taxa retida, líquido repassado).
   *
   * SQL cru porque o `groupBy` do Prisma não agrupa por campo de relação — seria
   * necessário trazer todas as unidades e pagamentos do mês e agrupar em memória, que é
   * exatamente o que já pesava no dashboard antes.
   *
   * O LEFT JOIN em Imobiliaria é o que coloca as unidades sem administradora numa linha
   * própria ("Gestão direta") em vez de escondê-las. COUNT(DISTINCT k.id) é obrigatório:
   * os joins até Pagamento multiplicam a linha da unidade uma vez por parcela, então um
   * COUNT simples contaria a mesma unidade várias vezes.
   */
  private async getResumoPorImobiliaria(
    userId: number,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<ResumoPorImobiliaria[]> {
    return this.prisma.$queryRaw<ResumoPorImobiliaria[]>`
      SELECT
        i."id" AS "imobiliariaId",
        COALESCE(i."nome", 'Gestão direta') AS "nome",
        COUNT(DISTINCT k."id")::int AS "unidades",
        COUNT(DISTINCT k."id") FILTER (WHERE k."status" = 'ocupada')::int AS "ocupadas",
        COALESCE(SUM(p."valor"), 0)::float8 AS "bruto",
        COALESCE(SUM(p."valorTaxa"), 0)::float8 AS "taxas",
        COALESCE(SUM(p."valorLiquido"), 0)::float8 AS "liquido"
      FROM "Kitnet" k
      LEFT JOIN "Imobiliaria" i ON i."id" = k."imobiliariaId"
      LEFT JOIN "Morador" m ON m."kitnetId" = k."id"
      LEFT JOIN "Pagamento" p
        ON p."moradorId" = m."id"
        AND p."status" = 'PAGO'
        AND p."dataPagamento" >= ${periodStart}
        AND p."dataPagamento" < ${periodEnd}
      WHERE k."userId" = ${userId}
      GROUP BY i."id", i."nome"
      -- "Gestão direta" (imobiliária nula) sempre por último.
      ORDER BY i."nome" ASC NULLS LAST
    `;
  }

  /**
   * Os últimos 12 meses de receita, gasto, taxa e líquido — a série que alimenta os dois
   * gráficos do dashboard.
   *
   * Agregado no banco com date_trunc + GROUP BY, não em JS: a versão anterior trazia
   * cada pagamento e cada gasto da janela inteira para somar em memória, e esse custo
   * cresce com o histórico do proprietário a cada abertura da tela.
   *
   * Receita e líquido são agrupados por `dataPagamento` (regime de caixa — quando o
   * dinheiro entrou), não por vencimento: uma parcela de março recebida em maio pertence
   * a maio, senão o gráfico mostra receita num mês em que nada entrou.
   */
  private async getHistorico(
    userId: number,
    year: number,
    month: number,
  ): Promise<PontoHistorico[]> {
    const inicioJanela = new Date(
      Date.UTC(year, month - (HISTORICO_MESES - 1), 1),
    );
    const fimJanela = new Date(Date.UTC(year, month + 1, 1));

    const [recebidos, gastos] = await Promise.all([
      this.prisma.$queryRaw<
        Array<{ mes: Date; bruto: number; taxa: number; liquido: number }>
      >`
        SELECT
          date_trunc('month', p."dataPagamento") AS "mes",
          COALESCE(SUM(p."valor"), 0)::float8 AS "bruto",
          COALESCE(SUM(p."valorTaxa"), 0)::float8 AS "taxa",
          COALESCE(SUM(p."valorLiquido"), 0)::float8 AS "liquido"
        FROM "Pagamento" p
        JOIN "Morador" m ON m."id" = p."moradorId"
        JOIN "Kitnet" k ON k."id" = m."kitnetId"
        WHERE k."userId" = ${userId}
          AND p."status" = 'PAGO'
          AND p."dataPagamento" >= ${inicioJanela}
          AND p."dataPagamento" < ${fimJanela}
        GROUP BY 1
      `,
      this.prisma.$queryRaw<Array<{ mes: Date; gasto: number }>>`
        SELECT
          date_trunc('month', g."data") AS "mes",
          COALESCE(SUM(g."valor"), 0)::float8 AS "gasto"
        FROM "Gasto" g
        JOIN "Kitnet" k ON k."id" = g."kitnetId"
        WHERE k."userId" = ${userId}
          AND g."data" >= ${inicioJanela}
          AND g."data" < ${fimJanela}
        GROUP BY 1
      `,
    ]);

    // O banco só devolve os meses que tiveram movimento; o gráfico precisa dos 12,
    // inclusive os vazios, para não "pular" meses no eixo.
    const recebidosPorMes = new Map(recebidos.map((r) => [chaveMes(r.mes), r]));
    const gastosPorMes = new Map(gastos.map((g) => [chaveMes(g.mes), g.gasto]));

    return Array.from({ length: HISTORICO_MESES }, (_, index) => {
      const mesData = new Date(
        Date.UTC(year, month - (HISTORICO_MESES - 1 - index), 1),
      );
      const chave = chaveMes(mesData);
      const recebido = recebidosPorMes.get(chave);

      return {
        label: `${MES_LABELS[mesData.getUTCMonth()]}/${String(mesData.getUTCFullYear()).slice(2)}`,
        receita: recebido?.bruto ?? 0,
        gasto: gastosPorMes.get(chave) ?? 0,
        liquido: recebido?.liquido ?? 0,
        taxa: recebido?.taxa ?? 0,
      };
    });
  }
}
