/**
 * Include padrão do imóvel nas listagens que mostram "nome do imóvel · número da unidade".
 *
 * O `_count.kitnets` existe porque a tela só quer mostrar o número da unidade quando o
 * imóvel tem mais de uma — e essas listagens (moradores, gastos, pagamentos) incluem o
 * imóvel sem as unidades. Antes, o frontend testava `imovel.kitnets.length > 1` sobre um
 * campo que nunca vinha: em runtime era `undefined`, a comparação dava sempre false e o
 * número da unidade nunca aparecia num prédio com 10 kitnets.
 */
export const IMOVEL_COM_TOTAL_UNIDADES = {
  include: { _count: { select: { kitnets: true } } },
} as const;

export const KITNET_COM_IMOVEL = {
  include: { imovel: IMOVEL_COM_TOTAL_UNIDADES },
} as const;

/**
 * Dados da administradora necessários para resolver a taxa de uma unidade.
 *
 * Vem junto sempre que o líquido precisa ser calculado: a unidade pode não ter taxa
 * própria, e nesse caso quem manda é a taxa padrão da imobiliária (ver
 * `resolverTaxaDaUnidade`).
 */
export const IMOBILIARIA_PARA_TAXA = {
  select: {
    id: true,
    nome: true,
    taxaPadraoTipo: true,
    taxaPadraoValor: true,
  },
} as const;

/**
 * Unidade com imóvel **e** administradora.
 *
 * Existe porque `KITNET_COM_IMOVEL` não traz a imobiliária, e a tela de pagamentos
 * precisa dela: a unidade costuma não ter taxa própria (`taxaImobiliaria: null`) e
 * herdar a padrão da administradora. Sem o objeto, o frontend resolvia a taxa como
 * zero e o modal de "marcar pago" anunciava "Taxa da imobiliária — R$ 0,00 / Você
 * recebe R$ 1.200,00" numa unidade de 10%, enquanto o backend gravava o correto
 * (R$ 120 / R$ 1.080). O número exibido na hora de confirmar não era o número
 * registrado — justamente na tela em que a conta precisa bater.
 */
export const KITNET_COM_IMOVEL_E_IMOBILIARIA = {
  include: {
    imovel: IMOVEL_COM_TOTAL_UNIDADES,
    imobiliaria: IMOBILIARIA_PARA_TAXA,
  },
} as const;
