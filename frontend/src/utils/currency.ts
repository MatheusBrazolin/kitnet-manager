const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const compactCurrencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
});

const NON_BREAKING_SPACE = String.fromCharCode(160);

// Intl.NumberFormat insere um espaco nao-quebravel entre "R$" e o valor, o que
// impede a quebra de linha em cards estreitos e faz o texto vazar. Trocamos por
// um espaco normal pra permitir quebra num ponto sensato.
function stripNonBreakingSpace(value: string): string {
  return value.split(NON_BREAKING_SPACE).join(' ');
}

export function formatCurrency(value: number): string {
  return stripNonBreakingSpace(currencyFormatter.format(value));
}

export function formatCompactCurrency(value: number): string {
  return stripNonBreakingSpace(compactCurrencyFormatter.format(value));
}
