import { describe, expect, it } from 'vitest';
import { formatCompactCurrency, formatCurrency } from './currency';

const NON_BREAKING_SPACE = ' ';

describe('formatCurrency', () => {
  it('formats a whole number as BRL with two decimal places', () => {
    expect(formatCurrency(1400)).toBe('R$ 1.400,00');
  });

  it('formats a decimal value', () => {
    expect(formatCurrency(168.45)).toBe('R$ 168,45');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('R$ 0,00');
  });

  it('formats a negative value', () => {
    expect(formatCurrency(-150)).toBe('-R$ 150,00');
  });

  it('never contains a non-breaking space between "R$" and the number', () => {
    // O Intl.NumberFormat pt-BR insere U+00A0 (nbsp) por padrão — isso quebra o layout em
    // cards estreitos, então formatCurrency troca por um espaço normal.
    expect(formatCurrency(1400)).not.toContain(NON_BREAKING_SPACE);
  });
});

describe('formatCompactCurrency', () => {
  it('formats large values compactly', () => {
    expect(formatCompactCurrency(15500)).toBe('R$ 15,5 mil');
  });

  it('never contains a non-breaking space', () => {
    expect(formatCompactCurrency(15500)).not.toContain(NON_BREAKING_SPACE);
  });
});
