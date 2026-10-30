import { describe, expect, it } from 'vitest';
import { formatCompactCurrency, formatCurrency } from './currency';

/**
 * O espaço entre "R$" e o número é inteiriço (U+00A0), vindo do próprio Intl.
 *
 * Estes testes exigiam o contrário: que ele virasse espaço comum, "porque quebra o
 * layout em cards estreitos". O efeito disso era "R$" numa linha e "1.200,00" na outra
 * — que se lê como dois números, e numa coluna de valores o olho perde qual cifrão
 * pertence a qual quantia. Aperto em tela estreita se resolve no container (coluna mais
 * larga, fonte que encolhe), não partindo o valor ao meio.
 */
const ESPACO_INTEIRICO = '\u00A0';

/** Troca os espaços inteiriços por comuns, só para a asserção ficar legível. */
const legivel = (valor: string) => valor.replace(/\u00A0/g, ' ');

describe('formatCurrency', () => {
  it('formats a whole number as BRL with two decimal places', () => {
    expect(legivel(formatCurrency(1400))).toBe('R$ 1.400,00');
  });

  it('formats a decimal value', () => {
    expect(legivel(formatCurrency(168.45))).toBe('R$ 168,45');
  });

  it('formats zero', () => {
    expect(legivel(formatCurrency(0))).toBe('R$ 0,00');
  });

  it('formats a negative value', () => {
    expect(legivel(formatCurrency(-150))).toBe('-R$ 150,00');
  });

  it('separa "R$" do número com espaço inteiriço, para o valor nunca quebrar em duas linhas', () => {
    expect(formatCurrency(1400)).toContain(ESPACO_INTEIRICO);
    expect(formatCurrency(1400)).not.toMatch(/R\$ \d/);
  });
});

describe('formatCompactCurrency', () => {
  it('formats large values compactly', () => {
    expect(legivel(formatCompactCurrency(15500))).toBe('R$ 15,5 mil');
  });

  it('também usa espaço inteiriço', () => {
    expect(formatCompactCurrency(15500)).toContain(ESPACO_INTEIRICO);
  });
});

// Um campo que o backend ainda não devolve, um null de registro antigo ou uma conta
// que deu NaN apareciam como "R$ NaN" na tela — indistinguível, para quem usa, de um
// bug no próprio saldo.
describe('valores ausentes ou inválidos', () => {
  it.each([
    [undefined, `R$${ESPACO_INTEIRICO}0,00`],
    [null, `R$${ESPACO_INTEIRICO}0,00`],
    [NaN, `R$${ESPACO_INTEIRICO}0,00`],
    [Infinity, `R$${ESPACO_INTEIRICO}0,00`],
  ])('formata %s como %s em vez de NaN', (entrada, esperado) => {
    expect(formatCurrency(entrada as number)).toBe(esperado);
  });

  // Sem fixar a string exata: a notação compacta do Intl varia com a versão do ICU
  // (o mesmo zero sai como "R$ 0" aqui e "R$ 0,0" no runner do CI). O que precisa
  // valer é a ausência de NaN, não a grafia.
  it('o formato compacto também não produz NaN', () => {
    const formatado = formatCompactCurrency(undefined as unknown as number);
    expect(formatado).not.toContain('NaN');
    expect(formatado).toMatch(/^R\$\u00A00/);
  });
});
