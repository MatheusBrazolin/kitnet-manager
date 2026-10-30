const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const compactCurrencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
});

/*
 * Sobre o espaço entre "R$" e o número: ele é inteiriço (U+00A0), e fica assim.
 *
 * Antes havia aqui uma função que o trocava por espaço comum, "pra permitir quebra num
 * ponto sensato" em telas estreitas. O problema é que não existe ponto sensato para
 * quebrar dinheiro: "R$" numa linha e "1.200,00" na outra se lê como dois números, e
 * numa coluna de valores o olho perde qual cifrão pertence a qual quantia. O
 * `Intl.NumberFormat` usa o espaço inteiriço justamente por isso.
 *
 * O aperto em telas estreitas é real, mas se resolve no container — coluna mais larga,
 * fonte que encolhe — e não partindo o valor ao meio.
 */

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
  return currencyFormatter.format(numeroSeguro(value));
}

export function formatCompactCurrency(value: number | null | undefined): string {
  return compactCurrencyFormatter.format(numeroSeguro(value));
}
