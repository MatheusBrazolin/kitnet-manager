import { TaxaTipo } from '@prisma/client';

export interface Repasse {
  /** Quanto a imobiliária retém. */
  taxa: number;
  /** Quanto sobra para o proprietário. */
  liquido: number;
}

/** Centavos — todo valor monetário do sistema é arredondado para duas casas. */
function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/**
 * Quanto a imobiliária retém de um aluguel e quanto sobra para o proprietário.
 *
 * Fonte única da verdade do cálculo: é usada ao marcar um pagamento como pago (onde o
 * resultado vira snapshot no próprio registro), na projeção mensal do dashboard e na
 * exibição do líquido por unidade. Qualquer uma dessas calculando por conta própria
 * acabaria divergindo das outras na primeira mudança de regra.
 *
 * Regras de contorno, todas pensadas para nunca produzir um número que não faça sentido
 * numa tela de dinheiro:
 * - taxa nunca é negativa (um valor negativo cadastrado por engano vira zero);
 * - taxa nunca passa do bruto, então o líquido nunca fica negativo;
 * - percentual acima de 100% é tratado como 100% (líquido zero), não como dívida.
 */
export function calcularRepasse(
  valorBruto: number,
  taxaTipo: TaxaTipo,
  taxaValor: number | null | undefined,
): Repasse {
  const bruto = Math.max(0, valorBruto);
  const valor = Math.max(0, taxaValor ?? 0);

  const taxaCrua =
    taxaTipo === TaxaTipo.PERCENTUAL ? (bruto * valor) / 100 : valor;
  const taxa = arredondar(Math.min(taxaCrua, bruto));

  return { taxa, liquido: arredondar(bruto - taxa) };
}

/**
 * A taxa que vale para uma unidade: a dela, se tiver uma definida; senão a padrão da
 * imobiliária vinculada; senão nada (gestão direta, o proprietário recebe o aluguel
 * cheio).
 *
 * `taxaImobiliaria` nula é o que distingue "esta unidade tem acordo próprio" de "segue o
 * padrão da administradora" — por isso a checagem é contra null/undefined e não contra
 * zero: taxa zero é uma escolha válida (isenção), diferente de não ter taxa.
 */
export function resolverTaxaDaUnidade(
  kitnet: { taxaImobiliaria?: number | null; taxaTipo: TaxaTipo },
  imobiliaria?: { taxaPadraoTipo: TaxaTipo; taxaPadraoValor: number } | null,
): { taxaTipo: TaxaTipo; taxaValor: number } {
  if (kitnet.taxaImobiliaria !== null && kitnet.taxaImobiliaria !== undefined) {
    return { taxaTipo: kitnet.taxaTipo, taxaValor: kitnet.taxaImobiliaria };
  }

  if (imobiliaria) {
    return {
      taxaTipo: imobiliaria.taxaPadraoTipo,
      taxaValor: imobiliaria.taxaPadraoValor,
    };
  }

  return { taxaTipo: TaxaTipo.FIXA, taxaValor: 0 };
}

/** Atalho que junta as duas etapas: resolve a taxa aplicável e calcula o repasse. */
export function calcularRepasseDaUnidade(
  valorBruto: number,
  kitnet: { taxaImobiliaria?: number | null; taxaTipo: TaxaTipo },
  imobiliaria?: { taxaPadraoTipo: TaxaTipo; taxaPadraoValor: number } | null,
): Repasse {
  const { taxaTipo, taxaValor } = resolverTaxaDaUnidade(kitnet, imobiliaria);
  return calcularRepasse(valorBruto, taxaTipo, taxaValor);
}
