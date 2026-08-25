import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it.each([
    ['pago', 'status-badge-success'],
    ['pendente', 'status-badge-warning'],
    ['atrasado', 'status-badge-danger'],
    ['anulado', 'status-badge-neutral'],
    ['ocupada', 'status-badge-success'],
    ['vaga', 'status-badge-warning'],
  ])('maps label "%s" to tone class "%s"', (label, toneClass) => {
    render(<StatusBadge label={label} />);
    expect(screen.getByText(label)).toHaveClass(toneClass);
  });

  it('is case-insensitive when mapping the tone', () => {
    render(<StatusBadge label="PAGO" />);
    expect(screen.getByText('PAGO')).toHaveClass('status-badge-success');
  });

  it('falls back to the warning tone for an unknown label', () => {
    render(<StatusBadge label="algo-novo" />);
    expect(screen.getByText('algo-novo')).toHaveClass('status-badge-warning');
  });
});
