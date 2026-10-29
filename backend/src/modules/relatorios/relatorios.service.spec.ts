import { Prisma } from '@prisma/client';
import { RelatoriosService } from './relatorios.service';
import { PrismaService } from '../../database/prisma.service';

type PrismaMock = {
  // Tudo neste service é agregado no banco (date_trunc/GROUP BY), então o único ponto
  // de contato com o Prisma é o $queryRaw.
  $queryRaw: jest.Mock;
};

/**
 * Trechos que identificam cada consulta. São combinações (e não um trecho só) porque as
 * consultas se parecem de propósito: as duas por imóvel só diferem na tabela de origem.
 */
const CONSULTAS = {
  anos: ['UNION ALL'],
  recebidosPorMes: [`date_trunc('month', p."dataPagamento")`],
  gastosPorMes: [`date_trunc('month', g."data")`],
  porImobiliaria: ['Gestão direta'],
  recebidosPorImovel: ['"imovelId"', 'FROM "Pagamento" p'],
  gastosPorImovel: ['"imovelId"', 'FROM "Gasto" g'],
} as const;

type Consulta = keyof typeof CONSULTAS;

/**
 * Remonta a consulta como o Prisma a montaria. Os argumentos chegam ao mock crus (as
 * partes fixas do template e os valores), e os fragmentos reaproveitados — o COALESCE do
 * repasse — são valores, não texto: só depois de recompor dá para ler o SQL final e os
 * parâmetros de verdade.
 */
function recompor(args: unknown[]): Prisma.Sql {
  const [strings, ...valores] = args as [readonly string[], ...never[]];
  return Prisma.sql(strings, ...valores);
}

describe('RelatoriosService', () => {
  let service: RelatoriosService;
  let prisma: PrismaMock;
  let respostas: Partial<Record<Consulta, unknown[]>>;

  const ownerId = 1;

  function consultaDe(sql: string): Consulta {
    // A ordem importa: 'FROM "Gasto" g' também aparece na consulta de gastos por mês,
    // que é reconhecida antes pelo date_trunc dela.
    const ordem = Object.keys(CONSULTAS) as Consulta[];
    const encontrada = ordem.find((chave) =>
      CONSULTAS[chave].every((trecho) => sql.includes(trecho)),
    );
    if (!encontrada) {
      throw new Error(`Consulta não reconhecida pelo mock:\n${sql}`);
    }
    return encontrada;
  }

  beforeEach(() => {
    respostas = {};
    prisma = {
      // O service dispara as seis consultas em paralelo, então o mock não pode responder
      // por ordem de chamada — identifica cada uma pelo SQL.
      $queryRaw: jest.fn((...args: unknown[]) =>
        Promise.resolve(respostas[consultaDe(recompor(args).sql)] ?? []),
      ),
    };
    service = new RelatoriosService(prisma as unknown as PrismaService);
  });

  /** Todas as consultas disparadas, já recompostas. */
  function consultas(): Prisma.Sql[] {
    return (prisma.$queryRaw.mock.calls as unknown[][]).map(recompor);
  }

  it('devolve zeros e os 12 meses quando o ano não teve nenhum movimento', async () => {
    const relatorio = await service.getAnual(ownerId, 2026);

    expect(relatorio.ano).toBe(2026);
    expect(relatorio.bruto).toBe(0);
    expect(relatorio.taxas).toBe(0);
    expect(relatorio.liquido).toBe(0);
    expect(relatorio.gastos).toBe(0);
    expect(relatorio.sobrou).toBe(0);
    expect(relatorio.porImovel).toEqual([]);
    expect(relatorio.porMes).toHaveLength(12);
    expect(relatorio.porMes[0]).toEqual({
      mes: 1,
      label: 'Janeiro',
      bruto: 0,
      taxas: 0,
      liquido: 0,
      gastos: 0,
    });
    expect(relatorio.porMes[11].label).toBe('Dezembro');
    expect(relatorio.porMes.every((mes) => mes.bruto === 0)).toBe(true);
  });

  it('soma os totais do ano e posiciona cada mês com movimento', async () => {
    respostas.recebidosPorMes = [
      {
        mes: new Date(Date.UTC(2026, 1, 1)),
        bruto: 1000,
        taxas: 100,
        liquido: 900,
      },
      {
        mes: new Date(Date.UTC(2026, 6, 1)),
        bruto: 2000,
        taxas: 200,
        liquido: 1800,
      },
    ];
    respostas.gastosPorMes = [
      { mes: new Date(Date.UTC(2026, 6, 1)), gastos: 300 },
    ];

    const relatorio = await service.getAnual(ownerId, 2026);

    expect(relatorio.bruto).toBe(3000);
    expect(relatorio.taxas).toBe(300);
    expect(relatorio.liquido).toBe(2700);
    expect(relatorio.gastos).toBe(300);
    // O que sobrou parte do LÍQUIDO, nunca do bruto: a taxa retida pela imobiliária
    // jamais chegou à conta do proprietário.
    expect(relatorio.sobrou).toBe(2400);

    expect(relatorio.porMes[1]).toMatchObject({
      mes: 2,
      bruto: 1000,
      gastos: 0,
    });
    expect(relatorio.porMes[6]).toMatchObject({
      mes: 7,
      liquido: 1800,
      gastos: 300,
    });
    expect(relatorio.porMes[2]).toMatchObject({
      bruto: 0,
      liquido: 0,
      gastos: 0,
    });
  });

  // Pagamentos antigos (anteriores ao snapshot de repasse) têm valorTaxa/valorLiquido
  // nulos. Sem o COALESCE no SQL eles entrariam como líquido zero e o ano declarado
  // sairia menor do que foi.
  it('usa o bruto como líquido quando o snapshot do repasse é nulo', async () => {
    await service.getAnual(ownerId, 2026);

    const sqls = consultas().map((consulta) => consulta.sql);
    const comLiquido = sqls.filter((sql) =>
      sql.includes('COALESCE(p."valorLiquido", p."valor")'),
    );
    const comTaxa = sqls.filter((sql) =>
      sql.includes('COALESCE(p."valorTaxa", 0)'),
    );

    // As três consultas que leem repasse: por mês, por imóvel e por imobiliária.
    expect(comLiquido).toHaveLength(3);
    expect(comTaxa).toHaveLength(3);
    // Nenhuma soma o `valorLiquido` cru, que zeraria essas parcelas.
    expect(sqls.some((sql) => /SUM\(\s*p\."valorLiquido"\s*\)/.test(sql))).toBe(
      false,
    );
  });

  it('agrupa as unidades sem administradora como "Gestão direta"', async () => {
    respostas.porImobiliaria = [
      {
        imobiliariaId: 7,
        nome: 'Imobiliária Central',
        bruto: 1200,
        taxas: 120,
        liquido: 1080,
      },
      {
        imobiliariaId: null,
        nome: 'Gestão direta',
        bruto: 800,
        taxas: 0,
        liquido: 800,
      },
    ];

    const relatorio = await service.getAnual(ownerId, 2026);

    expect(relatorio.porImobiliaria).toHaveLength(2);
    expect(
      relatorio.porImobiliaria.find((linha) => linha.imobiliariaId === null),
    ).toMatchObject({ nome: 'Gestão direta', taxas: 0, liquido: 800 });

    // O LEFT JOIN em Imobiliaria é o que cria essa linha; sem ele as unidades sem
    // administradora sumiriam do relatório.
    const sqlImobiliaria = consultas()
      .map((consulta) => consulta.sql)
      .find((sql) => sql.includes('Gestão direta'));
    expect(sqlImobiliaria).toContain('LEFT JOIN "Imobiliaria"');
  });

  it('não oferece em anosDisponiveis um ano sem pagamento nem gasto', async () => {
    // O banco só devolve anos que aparecem em algum pagamento pago ou gasto — 2024 ficou
    // de fora porque nada foi movimentado nele.
    respostas.anos = [{ ano: 2026 }, { ano: 2025 }, { ano: 2023 }];

    const relatorio = await service.getAnual(ownerId, 2026);

    expect(relatorio.anosDisponiveis).toEqual([2026, 2025, 2023]);
    expect(relatorio.anosDisponiveis).not.toContain(2024);
  });

  it('inclui no relatório por imóvel quem só teve gasto no ano', async () => {
    respostas.recebidosPorImovel = [
      {
        imovelId: 1,
        nome: 'Edifício Aurora',
        bruto: 2400,
        taxas: 240,
        liquido: 2160,
      },
    ];
    respostas.gastosPorImovel = [
      { imovelId: 1, nome: 'Edifício Aurora', gastos: 500 },
      // Imóvel em reforma: nenhum inquilino no ano, só despesa.
      { imovelId: 2, nome: 'Casa do Beco', gastos: 900 },
    ];

    const relatorio = await service.getAnual(ownerId, 2026);

    expect(relatorio.porImovel).toEqual([
      {
        imovelId: 2,
        nome: 'Casa do Beco',
        bruto: 0,
        taxas: 0,
        liquido: 0,
        gastos: 900,
      },
      {
        imovelId: 1,
        nome: 'Edifício Aurora',
        bruto: 2400,
        taxas: 240,
        liquido: 2160,
        gastos: 500,
      },
    ]);
  });

  it('escopa todas as consultas pela conta e pelos limites do ano pedido', async () => {
    await service.getAnual(42, 2025);

    const valores = consultas().flatMap((consulta) => consulta.values);
    // Janela semiaberta [1º de janeiro, 1º de janeiro do ano seguinte).
    expect(valores).toContainEqual(new Date(Date.UTC(2025, 0, 1)));
    expect(valores).toContainEqual(new Date(Date.UTC(2026, 0, 1)));
    // Todas as consultas filtram pela conta; nenhuma varre o banco inteiro.
    for (const consulta of consultas()) {
      expect(consulta.values).toContain(42);
    }
  });
});
