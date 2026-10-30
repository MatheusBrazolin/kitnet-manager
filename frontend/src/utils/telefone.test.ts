import { describe, expect, it } from 'vitest';
import {
  DDDS_VALIDOS,
  dddDigitado,
  erroDoTelefone,
  formatTelefone,
  soDigitos,
} from './telefone';

describe('formatTelefone', () => {
  it('formata o número cru digitado de uma vez — o caso que motivou tudo isto', () => {
    expect(formatTelefone('11989000155')).toBe('(11) 98900-0155');
  });

  it('formata fixo de 10 dígitos com a quebra 4-4', () => {
    expect(formatTelefone('1636214400')).toBe('(16) 3621-4400');
  });

  it('não mexe num número que já estava formatado', () => {
    expect(formatTelefone('(16) 99812-3344')).toBe('(16) 99812-3344');
  });

  it('ignora o DDI quando o número vem do WhatsApp', () => {
    expect(formatTelefone('+55 16 99812-3344')).toBe('(16) 99812-3344');
  });

  it('descarta dígito além do décimo primeiro em vez de desalinhar a máscara', () => {
    expect(formatTelefone('119890001556789')).toBe('(11) 98900-0155');
  });

  describe('enquanto a pessoa ainda está digitando', () => {
    // O hífen fica parado na posição do fixo até o nono dígito aparecer: assim ele não
    // pula de lugar a cada tecla, que é o que deixa máscara de telefone irritante.
    const passos: [string, string][] = [
      ['', ''],
      ['1', '(1'],
      ['11', '(11'],
      ['119', '(11) 9'],
      ['11989', '(11) 989'],
      ['1198900', '(11) 9890-0'],
      ['119890001', '(11) 9890-001'],
      ['11989000155', '(11) 98900-0155'],
    ];

    it.each(passos)('%s vira %s', (digitado, esperado) => {
      expect(formatTelefone(digitado)).toBe(esperado);
    });
  });
});

describe('soDigitos', () => {
  it('tira o DDI só quando sobra número demais para ser nacional', () => {
    expect(soDigitos('5516998123344')).toBe('16998123344');
    // 55 aqui é o DDD do RS, não o DDI: o número tem 11 dígitos, está completo.
    expect(soDigitos('55998123344')).toBe('55998123344');
  });
});

describe('DDDS_VALIDOS', () => {
  it('tem os 67 códigos em uso no Brasil', () => {
    expect(DDDS_VALIDOS.size).toBe(67);
  });

  it('não inclui os números que nunca foram atribuídos', () => {
    const inexistentes = [
      20, 23, 25, 26, 29, 30, 36, 39, 40, 50, 52, 56, 57, 58, 59, 60, 70, 72, 76,
      78, 80, 90,
    ];
    for (const ddd of inexistentes) {
      expect(DDDS_VALIDOS.has(ddd)).toBe(false);
    }
  });
});

describe('dddDigitado', () => {
  it('espera dois dígitos antes de julgar', () => {
    expect(dddDigitado('1')).toBeNull();
    expect(dddDigitado('16')).toBe(16);
  });
});

describe('erroDoTelefone', () => {
  it('não reclama de campo vazio — quem ainda não digitou não errou', () => {
    expect(erroDoTelefone('')).toBeNull();
  });

  it('aceita celular e fixo completos', () => {
    expect(erroDoTelefone('(11) 98900-0155')).toBeNull();
    expect(erroDoTelefone('(16) 3621-4400')).toBeNull();
  });

  it('aponta o DDD inexistente, que é o dedo trocado mais comum', () => {
    expect(erroDoTelefone('36998123344')).toBe('DDD 36 não existe no Brasil.');
  });

  it('cobra os dígitos que faltam', () => {
    expect(erroDoTelefone('1198')).toMatch(/faltam d/i);
  });

  it('pega o celular de 11 dígitos sem o nono dígito', () => {
    expect(erroDoTelefone('11389000155')).toMatch(/come[çc]a com 9/i);
  });

  // O DDD é checado antes do tamanho: com os dois errados, a pessoa precisa saber do
  // DDD primeiro, senão corrige o tamanho e o campo continua recusando sem explicar.
  it('prioriza o DDD inexistente sobre o número curto', () => {
    expect(erroDoTelefone('3698')).toBe('DDD 36 não existe no Brasil.');
  });
});
