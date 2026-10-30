import { describe, expect, it } from 'vitest';
import { AVATAR_CORES, corDoAvatar, iniciais } from './avatar';

describe('iniciais', () => {
  it('usa o primeiro e o último nome', () => {
    expect(iniciais('Juliana Prado')).toBe('JP');
  });

  it('ignora partículas — senão "de Albuquerque" viraria "MD"', () => {
    expect(iniciais('Marcos Vinícius de Albuquerque')).toBe('MA');
    expect(iniciais('Maria das Graças')).toBe('MG');
  });

  it('aceita um nome só', () => {
    expect(iniciais('Madonna')).toBe('M');
  });

  it('não quebra com nome vazio ou só espaços', () => {
    expect(iniciais('')).toBe('?');
    expect(iniciais('   ')).toBe('?');
  });

  it('devolve sempre em maiúsculas', () => {
    expect(iniciais('ana souza')).toBe('AS');
  });
});

describe('corDoAvatar', () => {
  it('respeita o tom escolhido', () => {
    expect(corDoAvatar('Qualquer Nome', 'oceano').nome).toBe('oceano');
  });

  // Avatar que muda de cor a cada visita parece defeito.
  it('dá sempre a mesma cor ao mesmo nome quando ninguém escolheu', () => {
    const primeira = corDoAvatar('Edson Tanaka');
    const segunda = corDoAvatar('Edson Tanaka');
    expect(primeira.nome).toBe(segunda.nome);
  });

  it('ignora um tom que não existe na paleta, em vez de ficar sem cor', () => {
    const cor = corDoAvatar('Rita Camargo', 'turquesa-inventada');
    expect(AVATAR_CORES.some((c) => c.nome === cor.nome)).toBe(true);
  });

  it('devolve um tom válido mesmo sem nome', () => {
    expect(AVATAR_CORES.some((c) => c.nome === corDoAvatar('').nome)).toBe(true);
  });

  it('espalha os nomes por mais de um tom', () => {
    const nomes = [
      'Juliana Prado',
      'Edson Tanaka',
      'Rita Camargo',
      'Wellington Áureo',
      'Marcos Albuquerque',
    ];
    const tons = new Set(nomes.map((n) => corDoAvatar(n).nome));
    expect(tons.size).toBeGreaterThan(1);
  });
});
