import type { ImobiliariaResumo, Kitnet, TaxaTipo } from '../types';

export interface Repasse {
  /** Quanto a imobiliária retém. */
  taxa: number;
  /** Quanto sobra para o proprietário. */
  liquido: number;
}

function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/**
 * Espelho de `calcularRepasse` do backend (`common/repasse/repasse.ts`).
 *
 * A duplicação é proposital: o backend é a autoridade — é ele que grava o snapshot no
 * pagamento — mas a tela precisa do mesmo número antes de salvar, para mostrar o líquido
 * no modal de "marcar pago" e na coluna de unidades. Pedir o cálculo ao servidor a cada
 * tecla digitada seria pior. Os dois lados têm teste cobrindo os mesmos casos de borda.
 */
export function calcularRepasse(
  valorBruto: number,
  taxaTipo: TaxaTipo,
  taxaValor: number | null | undefined,
): Repasse {
  const bruto = Math.max(0, valorBruto);
  const valor = Math.max(0, taxaValor ?? 0);

  const taxaCrua = taxaTipo === 'PERCENTUAL' ? (bruto * valor) / 100 : valor;
  const taxa = arredondar(Math.min(taxaCrua, bruto));

  return { taxa, liquido: arredondar(bruto - taxa) };
}

/**
 * A taxa que vale para uma unidade: a dela, se tiver; senão a padrão da imobiliária;
 * senão nenhuma (gestão direta).
 *
 * Taxa zero é uma escolha (isenção negociada), diferente de não ter taxa — por isso a
 * checagem é contra null/undefined e não contra valor falsy.
 */
export function resolverTaxaDaUnidade(
  kitnet: Pick<Kitnet, 'taxaImobiliaria' | 'taxaTipo'> & {
    imobiliaria?: ImobiliariaResumo | null;
  },
): { taxaTipo: TaxaTipo; taxaValor: number } {
  if (kitnet.taxaImobiliaria !== null && kitnet.taxaImobiliaria !== undefined) {
    return { taxaTipo: kitnet.taxaTipo, taxaValor: kitnet.taxaImobiliaria };
  }
  if (kitnet.imobiliaria) {
    return {
      taxaTipo: kitnet.imobiliaria.taxaPadraoTipo,
      taxaValor: kitnet.imobiliaria.taxaPadraoValor,
    };
  }
  return { taxaTipo: 'FIXA', taxaValor: 0 };
}

/** Repasse de um aluguel pela taxa aplicável à unidade. */
export function calcularRepasseDaUnidade(
  valorBruto: number,
  kitnet: Pick<Kitnet, 'taxaImobiliaria' | 'taxaTipo'> & {
    imobiliaria?: ImobiliariaResumo | null;
  },
): Repasse {
  const { taxaTipo, taxaValor } = resolverTaxaDaUnidade(kitnet);
  return calcularRepasse(valorBruto, taxaTipo, taxaValor);
}

/** "10%" ou "R$ 100" — como a taxa é descrita nas telas. */
export function formatTaxaLabel(
  taxaTipo: TaxaTipo,
  taxaValor: number,
  formatCurrency: (valor: number) => string,
): string {
  return taxaTipo === 'PERCENTUAL'
    ? `${taxaValor.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`
    : formatCurrency(taxaValor);
}
