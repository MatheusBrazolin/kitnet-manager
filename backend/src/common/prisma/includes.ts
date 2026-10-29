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
