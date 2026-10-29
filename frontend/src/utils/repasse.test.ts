import { describe, expect, it } from 'vitest';
import {
  calcularRepasse,
  calcularRepasseDaUnidade,
  formatTaxaLabel,
  resolverTaxaDaUnidade,
} from './repasse';
import { formatCurrency } from './currency';

// Estes casos são deliberadamente os mesmos de backend/src/common/repasse/repasse.spec.ts:
// os dois lados calculam o repasse (a tela para pré-visualizar, o servidor para gravar o
// snapshot) e precisam concordar número a número.
describe('calcularRepasse', () => {
  it('aplica a taxa percentual sobre o bruto', () => {
    expect(calcularRepasse(1500, 'PERCENTUAL', 10)).toEqual({
      taxa: 150,
      liquido: 1350,
    });
  });

  it('subtrai a taxa fixa do bruto', () => {
    expect(calcularRepasse(1400, 'FIXA', 100)).toEqual({ taxa: 100, liquido: 1300 });
  });

  it('arredonda para centavos quando o percentual não é exato', () => {
    expect(calcularRepasse(1234.56, 'PERCENTUAL', 8.33)).toEqual({
      taxa: 102.84,
      liquido: 1131.72,
    });
  });

  it('trata taxa ausente como gestão direta', () => {
    expect(calcularRepasse(1000, 'FIXA', null)).toEqual({ taxa: 0, liquido: 1000 });
  });

  it('não devolve líquido negativo quando a taxa fixa passa do aluguel', () => {
    expect(calcularRepasse(800, 'FIXA', 1000)).toEqual({ taxa: 800, liquido: 0 });
  });

  it('trata percentual acima de 100% como 100%', () => {
    expect(calcularRepasse(1000, 'PERCENTUAL', 150)).toEqual({ taxa: 1000, liquido: 0 });
  });
});

describe('resolverTaxaDaUnidade', () => {
  const imobiliaria = {
    id: 1,
    nome: 'Central',
    taxaPadraoTipo: 'PERCENTUAL' as const,
    taxaPadraoValor: 10,
  };

  it('prefere a taxa própria da unidade', () => {
    expect(
      resolverTaxaDaUnidade({ taxaImobiliaria: 120, taxaTipo: 'FIXA', imobiliaria }),
    ).toEqual({ taxaTipo: 'FIXA', taxaValor: 120 });
  });

  it('cai para o padrão da imobiliária quando a unidade não define a sua', () => {
    expect(
      resolverTaxaDaUnidade({ taxaImobiliaria: null, taxaTipo: 'FIXA', imobiliaria }),
    ).toEqual({ taxaTipo: 'PERCENTUAL', taxaValor: 10 });
  });

  // Zero é isenção negociada, não "não informado".
  it('respeita taxa zero da unidade em vez de cair no padrão', () => {
    expect(
      resolverTaxaDaUnidade({ taxaImobiliaria: 0, taxaTipo: 'FIXA', imobiliaria }),
    ).toEqual({ taxaTipo: 'FIXA', taxaValor: 0 });
  });

  it('sem imobiliária, não há taxa', () => {
    expect(
      resolverTaxaDaUnidade({ taxaImobiliaria: null, taxaTipo: 'FIXA', imobiliaria: null }),
    ).toEqual({ taxaTipo: 'FIXA', taxaValor: 0 });
  });
});

describe('calcularRepasseDaUnidade', () => {
  it('usa o padrão percentual da imobiliária', () => {
    expect(
      calcularRepasseDaUnidade(2000, {
        taxaImobiliaria: null,
        taxaTipo: 'FIXA',
        imobiliaria: {
          id: 1,
          nome: 'Central',
          taxaPadraoTipo: 'PERCENTUAL',
          taxaPadraoValor: 8,
        },
      }),
    ).toEqual({ taxa: 160, liquido: 1840 });
  });

  it('sem imobiliária, o proprietário recebe o aluguel cheio', () => {
    expect(
      calcularRepasseDaUnidade(1700, {
        taxaImobiliaria: null,
        taxaTipo: 'FIXA',
        imobiliaria: null,
      }),
    ).toEqual({ taxa: 0, liquido: 1700 });
  });
});

describe('formatTaxaLabel', () => {
  it('mostra percentual com o símbolo', () => {
    expect(formatTaxaLabel('PERCENTUAL', 10, formatCurrency)).toBe('10%');
  });

  it('mostra valor fixo como moeda', () => {
    expect(formatTaxaLabel('FIXA', 100, formatCurrency)).toBe('R$ 100,00');
  });

  it('não arrasta casas decimais desnecessárias no percentual', () => {
    expect(formatTaxaLabel('PERCENTUAL', 8.5, formatCurrency)).toBe('8,5%');
  });
});
