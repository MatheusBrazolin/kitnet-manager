import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

const MESES_NO_ANO = 12;

/**
 * Taxa e líquido de uma parcela paga, com fallback para parcelas antigas.
 *
 * `valorTaxa`/`valorLiquido` são o snapshot do repasse, gravado quando a parcela é
 * marcada como paga. Pagamentos registrados ANTES de o snapshot existir têm as duas
 * colunas nulas, e sem o COALESCE eles entrariam no relatório como líquido zero — o ano
 * inteiro apareceria menor do que foi, justamente no número que vai para a declaração.
 * Nulo ali significa "ninguém reteve nada que a gente saiba", então o líquido é o bruto
 * e a taxa é zero.
 *
 * Fragmentos `Prisma.sql` e não string: assim continuam sendo SQL composto pelo próprio
 * Prisma (nada de `$queryRawUnsafe`) e a regra fica definida num lugar só, em vez de
 * repetida nas quatro consultas que precisam dela.
 */
const TAXA_COM_FALLBACK = Prisma.sql`COALESCE(p."valorTaxa", 0)`;
const LIQUIDO_COM_FALLBACK = Prisma.sql`COALESCE(p."valorLiquido", p."valor")`;

const MES_LABELS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

/** Centavos — todo valor monetário do sistema é arredondado para duas casas. */
function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/** Um mês do ano, sempre presente mesmo sem movimento (o relatório mostra os 12). */
export interface MesDoRelatorio {
  /** 1 a 12 — o número do mês, não o índice do array. */
  mes: number;
  label: string;
  bruto: number;
  taxas: number;
  liquido: number;
  gastos: number;
}

export interface LinhaPorImovel {
  imovelId: number;
  nome: string;
  bruto: number;
  taxas: number;
  liquido: number;
  gastos: number;
}

export interface LinhaPorImobiliaria {
  /** Nulo na linha de "Gestão direta" — unidades alugadas sem administradora. */
  imobiliariaId: number | null;
  nome: string;
  bruto: number;
  taxas: number;
  liquido: number;
}

export interface RelatorioAnual {
  ano: number;
  /** Anos com algum pagamento ou gasto — o seletor da tela não oferece ano vazio. */
  anosDisponiveis: number[];
  bruto: number;
  taxas: number;
  liquido: number;
  gastos: number;
  /** Líquido menos gastos: o que de fato sobrou para o proprietário no ano. */
  sobrou: number;
  porMes: MesDoRelatorio[];
  porImovel: LinhaPorImovel[];
  porImobiliaria: LinhaPorImobiliaria[];
}

interface RecebidoPorMes {
  mes: Date;
  bruto: number;
  taxas: number;
  liquido: number;
}

interface GastoPorMes {
  mes: Date;
  gastos: number;
}

interface RecebidoPorImovel {
  imovelId: number;
  nome: string;
  bruto: number;
  taxas: number;
  liquido: number;
}

interface GastoPorImovel {
  imovelId: number;
  nome: string;
  gastos: number;
}

/**
 * Relatório fechado de um ano inteiro — o recorte que o proprietário precisa para a
 * declaração de imposto de renda, que as telas de Pagamentos e Gastos (mês a mês e
 * paginadas) nunca conseguiram dar.
 *
 * Três decisões valem para todas as consultas daqui:
 *
 * 1. Regime de CAIXA: pagamentos entram pelo `dataPagamento` (quando o dinheiro de fato
 *    entrou), não pelo mês de competência. Uma parcela de dezembro recebida em janeiro é
 *    renda do ano em que foi recebida — é assim que ela aparece no extrato bancário.
 *
 * 2. Taxa e líquido vêm do SNAPSHOT gravado no pagamento (`valorTaxa`/`valorLiquido`), e
 *    não de recalcular a taxa atual da unidade: renegociar uma taxa hoje não pode
 *    reescrever um ano já declarado.
 *
 * 3. Tudo é agregado no banco (date_trunc + GROUP BY). Um ano inteiro de parcelas e
 *    gastos trazidos para somar em memória cresce sem limite com o histórico, e esta é
 *    exatamente a tela que o usuário abre para olhar os anos antigos.
 */
@Injectable()
export class RelatoriosService {
  constructor(private readonly prisma: PrismaService) {}

  async getAnual(userId: number, ano: number): Promise<RelatorioAnual> {
    const inicio = new Date(Date.UTC(ano, 0, 1));
    const fim = new Date(Date.UTC(ano + 1, 0, 1));

    const [
      anosDisponiveis,
      recebidosPorMes,
      gastosPorMes,
      recebidosPorImovel,
      gastosPorImovel,
      porImobiliaria,
    ] = await Promise.all([
      this.getAnosDisponiveis(userId),
      this.getRecebidosPorMes(userId, inicio, fim),
      this.getGastosPorMes(userId, inicio, fim),
      this.getRecebidosPorImovel(userId, inicio, fim),
      this.getGastosPorImovel(userId, inicio, fim),
      this.getPorImobiliaria(userId, inicio, fim),
    ]);

    const porMes = this.montarPorMes(recebidosPorMes, gastosPorMes);
    const porImovel = this.montarPorImovel(recebidosPorImovel, gastosPorImovel);

    // Os totais saem da série mensal em vez de uma consulta extra: é a mesma base, e
    // somar aqui garante que o rodapé do relatório nunca discorde das linhas acima dele.
    const bruto = arredondar(somar(porMes, 'bruto'));
    const taxas = arredondar(somar(porMes, 'taxas'));
    const liquido = arredondar(somar(porMes, 'liquido'));
    const gastos = arredondar(somar(porMes, 'gastos'));

    return {
      ano,
      anosDisponiveis,
      bruto,
      taxas,
      liquido,
      gastos,
      sobrou: arredondar(liquido - gastos),
      porMes,
      porImovel,
      porImobiliaria,
    };
  }

  /**
   * Os anos em que houve algum recebimento ou algum gasto, do mais recente para o mais
   * antigo. Alimenta só o seletor da tela: oferecer um ano sem nenhum movimento levaria
   * o usuário a um relatório todo zerado sem explicação.
   */
  private async getAnosDisponiveis(userId: number): Promise<number[]> {
    const linhas = await this.prisma.$queryRaw<Array<{ ano: number }>>`
      SELECT DISTINCT "ano" FROM (
        SELECT EXTRACT(YEAR FROM p."dataPagamento")::int AS "ano"
        FROM "Pagamento" p
        JOIN "Morador" m ON m."id" = p."moradorId"
        JOIN "Kitnet" k ON k."id" = m."kitnetId"
        WHERE k."userId" = ${userId}
          AND p."status" = 'PAGO'
          AND p."dataPagamento" IS NOT NULL
        UNION ALL
        SELECT EXTRACT(YEAR FROM g."data")::int AS "ano"
        FROM "Gasto" g
        JOIN "Kitnet" k ON k."id" = g."kitnetId"
        WHERE k."userId" = ${userId}
      ) anos
      ORDER BY "ano" DESC
    `;
    return linhas.map((linha) => linha.ano);
  }

  private getRecebidosPorMes(
    userId: number,
    inicio: Date,
    fim: Date,
  ): Promise<RecebidoPorMes[]> {
    return this.prisma.$queryRaw<RecebidoPorMes[]>`
      SELECT
        date_trunc('month', p."dataPagamento") AS "mes",
        COALESCE(SUM(p."valor"), 0)::float8 AS "bruto",
        COALESCE(SUM(${TAXA_COM_FALLBACK}), 0)::float8 AS "taxas",
        COALESCE(SUM(${LIQUIDO_COM_FALLBACK}), 0)::float8 AS "liquido"
      FROM "Pagamento" p
      JOIN "Morador" m ON m."id" = p."moradorId"
      JOIN "Kitnet" k ON k."id" = m."kitnetId"
      WHERE k."userId" = ${userId}
        AND p."status" = 'PAGO'
        AND p."dataPagamento" >= ${inicio}
        AND p."dataPagamento" < ${fim}
      GROUP BY 1
    `;
  }

  private getGastosPorMes(
    userId: number,
    inicio: Date,
    fim: Date,
  ): Promise<GastoPorMes[]> {
    return this.prisma.$queryRaw<GastoPorMes[]>`
      SELECT
        date_trunc('month', g."data") AS "mes",
        COALESCE(SUM(g."valor"), 0)::float8 AS "gastos"
      FROM "Gasto" g
      JOIN "Kitnet" k ON k."id" = g."kitnetId"
      WHERE k."userId" = ${userId}
        AND g."data" >= ${inicio}
        AND g."data" < ${fim}
      GROUP BY 1
    `;
  }

  /**
   * Recebimentos e gastos por imóvel saem em duas consultas e são cruzados em JS de
   * propósito: num único SELECT, juntar Pagamento e Gasto na mesma unidade produz um
   * produto cartesiano (cada gasto multiplicado por cada parcela) e os dois totais saem
   * inflados.
   */
  private getRecebidosPorImovel(
    userId: number,
    inicio: Date,
    fim: Date,
  ): Promise<RecebidoPorImovel[]> {
    return this.prisma.$queryRaw<RecebidoPorImovel[]>`
      SELECT
        im."id" AS "imovelId",
        im."nome" AS "nome",
        COALESCE(SUM(p."valor"), 0)::float8 AS "bruto",
        COALESCE(SUM(${TAXA_COM_FALLBACK}), 0)::float8 AS "taxas",
        COALESCE(SUM(${LIQUIDO_COM_FALLBACK}), 0)::float8 AS "liquido"
      FROM "Pagamento" p
      JOIN "Morador" m ON m."id" = p."moradorId"
      JOIN "Kitnet" k ON k."id" = m."kitnetId"
      JOIN "Imovel" im ON im."id" = k."imovelId"
      WHERE k."userId" = ${userId}
        AND p."status" = 'PAGO'
        AND p."dataPagamento" >= ${inicio}
        AND p."dataPagamento" < ${fim}
      GROUP BY im."id", im."nome"
    `;
  }

  private getGastosPorImovel(
    userId: number,
    inicio: Date,
    fim: Date,
  ): Promise<GastoPorImovel[]> {
    return this.prisma.$queryRaw<GastoPorImovel[]>`
      SELECT
        im."id" AS "imovelId",
        im."nome" AS "nome",
        COALESCE(SUM(g."valor"), 0)::float8 AS "gastos"
      FROM "Gasto" g
      JOIN "Kitnet" k ON k."id" = g."kitnetId"
      JOIN "Imovel" im ON im."id" = k."imovelId"
      WHERE k."userId" = ${userId}
        AND g."data" >= ${inicio}
        AND g."data" < ${fim}
      GROUP BY im."id", im."nome"
    `;
  }

  /**
   * Quanto passou por cada administradora no ano, e quanto dela ficou retido.
   *
   * Parte de Kitnet com LEFT JOIN em Imobiliaria (e não de Imobiliaria) porque é esse
   * join que coloca as unidades sem administradora numa linha própria — "Gestão direta",
   * onde o proprietário recebeu o aluguel cheio — em vez de simplesmente escondê-las do
   * relatório.
   */
  private getPorImobiliaria(
    userId: number,
    inicio: Date,
    fim: Date,
  ): Promise<LinhaPorImobiliaria[]> {
    return this.prisma.$queryRaw<LinhaPorImobiliaria[]>`
      SELECT
        i."id" AS "imobiliariaId",
        COALESCE(i."nome", 'Gestão direta') AS "nome",
        COALESCE(SUM(p."valor"), 0)::float8 AS "bruto",
        COALESCE(SUM(${TAXA_COM_FALLBACK}), 0)::float8 AS "taxas",
        COALESCE(SUM(${LIQUIDO_COM_FALLBACK}), 0)::float8 AS "liquido"
      FROM "Kitnet" k
      LEFT JOIN "Imobiliaria" i ON i."id" = k."imobiliariaId"
      LEFT JOIN "Morador" m ON m."kitnetId" = k."id"
      LEFT JOIN "Pagamento" p
        ON p."moradorId" = m."id"
        AND p."status" = 'PAGO'
        AND p."dataPagamento" >= ${inicio}
        AND p."dataPagamento" < ${fim}
      WHERE k."userId" = ${userId}
      GROUP BY i."id", i."nome"
      -- "Gestão direta" (imobiliária nula) sempre por último.
      ORDER BY i."nome" ASC NULLS LAST
    `;
  }

  /** O banco só devolve os meses com movimento; o relatório precisa dos 12, zerados. */
  private montarPorMes(
    recebidos: RecebidoPorMes[],
    gastos: GastoPorMes[],
  ): MesDoRelatorio[] {
    const recebidoPorIndice = new Map(
      recebidos.map((linha) => [linha.mes.getUTCMonth(), linha]),
    );
    const gastoPorIndice = new Map(
      gastos.map((linha) => [linha.mes.getUTCMonth(), linha.gastos]),
    );

    return Array.from({ length: MESES_NO_ANO }, (_, indice) => {
      const recebido = recebidoPorIndice.get(indice);
      return {
        mes: indice + 1,
        label: MES_LABELS[indice],
        bruto: arredondar(recebido?.bruto ?? 0),
        taxas: arredondar(recebido?.taxas ?? 0),
        liquido: arredondar(recebido?.liquido ?? 0),
        gastos: arredondar(gastoPorIndice.get(indice) ?? 0),
      };
    });
  }

  /**
   * Junta as duas consultas por imóvel. Um imóvel pode aparecer só numa delas (alugado o
   * ano inteiro sem nenhum gasto, ou em reforma sem nenhum inquilino), e nos dois casos
   * ele precisa estar na tabela — senão o proprietário procura um imóvel que sumiu.
   */
  private montarPorImovel(
    recebidos: RecebidoPorImovel[],
    gastos: GastoPorImovel[],
  ): LinhaPorImovel[] {
    const porId = new Map<number, LinhaPorImovel>();

    for (const linha of recebidos) {
      porId.set(linha.imovelId, {
        imovelId: linha.imovelId,
        nome: linha.nome,
        bruto: arredondar(linha.bruto),
        taxas: arredondar(linha.taxas),
        liquido: arredondar(linha.liquido),
        gastos: 0,
      });
    }

    for (const linha of gastos) {
      const existente = porId.get(linha.imovelId);
      if (existente) {
        existente.gastos = arredondar(linha.gastos);
        continue;
      }
      porId.set(linha.imovelId, {
        imovelId: linha.imovelId,
        nome: linha.nome,
        bruto: 0,
        taxas: 0,
        liquido: 0,
        gastos: arredondar(linha.gastos),
      });
    }

    return Array.from(porId.values()).sort((a, b) =>
      a.nome.localeCompare(b.nome, 'pt-BR'),
    );
  }
}

function somar(
  linhas: MesDoRelatorio[],
  campo: 'bruto' | 'taxas' | 'liquido' | 'gastos',
): number {
  return linhas.reduce((total, linha) => total + linha[campo], 0);
}
