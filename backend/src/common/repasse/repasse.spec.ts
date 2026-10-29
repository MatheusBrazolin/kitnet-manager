import { TaxaTipo } from '@prisma/client';
import {
  calcularRepasse,
  calcularRepasseDaUnidade,
  resolverTaxaDaUnidade,
} from './repasse';

describe('calcularRepasse', () => {
  it('aplica a taxa percentual sobre o bruto', () => {
    expect(calcularRepasse(1500, TaxaTipo.PERCENTUAL, 10)).toEqual({
      taxa: 150,
      liquido: 1350,
    });
  });

  it('subtrai a taxa fixa do bruto', () => {
    expect(calcularRepasse(1400, TaxaTipo.FIXA, 100)).toEqual({
      taxa: 100,
      liquido: 1300,
    });
  });

  it('arredonda para centavos quando o percentual não é exato', () => {
    // 8,33% de 1234,56 = 102,838... — não pode vazar dízima para a tela nem para o banco.
    expect(calcularRepasse(1234.56, TaxaTipo.PERCENTUAL, 8.33)).toEqual({
      taxa: 102.84,
      liquido: 1131.72,
    });
  });

  it('trata taxa ausente como gestão direta (líquido = bruto)', () => {
    expect(calcularRepasse(1000, TaxaTipo.FIXA, null)).toEqual({
      taxa: 0,
      liquido: 1000,
    });
    expect(calcularRepasse(1000, TaxaTipo.PERCENTUAL, undefined)).toEqual({
      taxa: 0,
      liquido: 1000,
    });
  });

  it('não devolve líquido negativo quando a taxa fixa passa do aluguel', () => {
    expect(calcularRepasse(800, TaxaTipo.FIXA, 1000)).toEqual({
      taxa: 800,
      liquido: 0,
    });
  });

  it('trata percentual acima de 100% como 100%, não como dívida', () => {
    expect(calcularRepasse(1000, TaxaTipo.PERCENTUAL, 150)).toEqual({
      taxa: 1000,
      liquido: 0,
    });
  });

  it('ignora taxa negativa cadastrada por engano', () => {
    expect(calcularRepasse(1000, TaxaTipo.FIXA, -50)).toEqual({
      taxa: 0,
      liquido: 1000,
    });
  });

  it('devolve zeros para um bruto zerado', () => {
    expect(calcularRepasse(0, TaxaTipo.PERCENTUAL, 10)).toEqual({
      taxa: 0,
      liquido: 0,
    });
  });
});

describe('resolverTaxaDaUnidade', () => {
  const imobiliaria = {
    taxaPadraoTipo: TaxaTipo.PERCENTUAL,
    taxaPadraoValor: 10,
  };

  it('prefere a taxa própria da unidade quando ela existe', () => {
    expect(
      resolverTaxaDaUnidade(
        { taxaImobiliaria: 120, taxaTipo: TaxaTipo.FIXA },
        imobiliaria,
      ),
    ).toEqual({ taxaTipo: TaxaTipo.FIXA, taxaValor: 120 });
  });

  it('cai para a taxa padrão da imobiliária quando a unidade não define a sua', () => {
    expect(
      resolverTaxaDaUnidade(
        { taxaImobiliaria: null, taxaTipo: TaxaTipo.FIXA },
        imobiliaria,
      ),
    ).toEqual({ taxaTipo: TaxaTipo.PERCENTUAL, taxaValor: 10 });
  });

  // Zero é uma escolha (isenção negociada), não "não informado" — por isso a checagem é
  // contra null e não contra valor falsy.
  it('respeita taxa zero da unidade em vez de cair no padrão da imobiliária', () => {
    expect(
      resolverTaxaDaUnidade(
        { taxaImobiliaria: 0, taxaTipo: TaxaTipo.FIXA },
        imobiliaria,
      ),
    ).toEqual({ taxaTipo: TaxaTipo.FIXA, taxaValor: 0 });
  });

  it('devolve taxa zero quando não há imobiliária (gestão direta)', () => {
    expect(
      resolverTaxaDaUnidade(
        { taxaImobiliaria: null, taxaTipo: TaxaTipo.FIXA },
        null,
      ),
    ).toEqual({ taxaTipo: TaxaTipo.FIXA, taxaValor: 0 });
  });
});

describe('calcularRepasseDaUnidade', () => {
  it('usa o padrão percentual da imobiliária quando a unidade não tem taxa própria', () => {
    expect(
      calcularRepasseDaUnidade(
        2000,
        { taxaImobiliaria: null, taxaTipo: TaxaTipo.FIXA },
        { taxaPadraoTipo: TaxaTipo.PERCENTUAL, taxaPadraoValor: 8 },
      ),
    ).toEqual({ taxa: 160, liquido: 1840 });
  });

  it('a taxa própria da unidade vence o padrão da imobiliária', () => {
    expect(
      calcularRepasseDaUnidade(
        2000,
        { taxaImobiliaria: 50, taxaTipo: TaxaTipo.FIXA },
        { taxaPadraoTipo: TaxaTipo.PERCENTUAL, taxaPadraoValor: 8 },
      ),
    ).toEqual({ taxa: 50, liquido: 1950 });
  });

  it('sem imobiliária, o proprietário recebe o aluguel cheio', () => {
    expect(
      calcularRepasseDaUnidade(
        1700,
        { taxaImobiliaria: null, taxaTipo: TaxaTipo.FIXA },
        null,
      ),
    ).toEqual({ taxa: 0, liquido: 1700 });
  });
});
