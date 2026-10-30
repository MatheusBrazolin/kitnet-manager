import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HeroStat } from './Card';

/**
 * O número dominante da tela é o que o app promete responder na primeira olhada.
 * Quebrado em duas linhas — "R$" em cima e "45.594,00" embaixo — ele se lê como dois
 * números. Estes testes travam a regra que evita isso.
 */
describe('HeroStat', () => {
  it('mantém o tamanho cheio em valores que cabem numa linha', () => {
    render(<HeroStat label="Você recebeu" value="R$ 45.594,00" />);

    expect(screen.getByText('R$ 45.594,00')).not.toHaveClass('hero-stat-value-longo');
  });

  it('encolhe o valor a partir de 13 caracteres, em vez de deixá-lo quebrar', () => {
    render(<HeroStat label="Você recebeu" value="R$ 345.678,90" />);

    expect(screen.getByText('R$ 345.678,90')).toHaveClass('hero-stat-value-longo');
  });

  it('não tenta medir um valor que não é texto', () => {
    render(<HeroStat label="Você recebeu" value={<em>sem dados</em>} />);

    expect(screen.getByText('sem dados').parentElement).not.toHaveClass(
      'hero-stat-value-longo',
    );
  });
});
