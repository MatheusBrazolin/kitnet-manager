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

/**
 * Um valor ausente ou inválido vira R$ 0,00, nunca "R$ NaN".
 *
 * Num app de dinheiro isso importa mais que a média: um campo novo que o backend
 * ainda não devolve, um `null` vindo de registro antigo ou uma conta que deu NaN
 * apareciam na tela como "R$ NaN" — o usuário não distingue isso de um bug grave
 * no saldo dele, e a tela inteira perde a credibilidade por um campo só.
 */
function numeroSeguro(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function formatCurrency(value: number | null | undefined): string {
  return stripNonBreakingSpace(currencyFormatter.format(numeroSeguro(value)));
}

export function formatCompactCurrency(value: number | null | undefined): string {
  return stripNonBreakingSpace(compactCurrencyFormatter.format(numeroSeguro(value)));
}
