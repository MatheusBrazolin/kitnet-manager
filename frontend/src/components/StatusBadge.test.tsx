import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it.each([
    ['pago', 'Pago', 'status-badge-success'],
    ['pendente', 'Pendente', 'status-badge-warning'],
    ['atrasado', 'Atrasado', 'status-badge-danger'],
    ['anulado', 'Anulado', 'status-badge-neutral'],
    ['ocupada', 'Ocupada', 'status-badge-success'],
    ['vaga', 'Vaga', 'status-badge-warning'],
  ])('mapeia "%s" para o tom "%s"', (label, texto, toneClass) => {
    render(<StatusBadge label={label} />);
    expect(screen.getByText(texto)).toHaveClass(toneClass);
  });

  // Os rótulos chegam ora do enum do backend em caixa alta ("PAGO"), ora já em
  // minúsculas vindos do campo `status` da kitnet ("vaga"). O selo normaliza os dois
  // para a mesma forma — caixa alta era parte do visual antigo e cansa de ler.
  it('normaliza a caixa do rótulo, venha de onde vier', () => {
    render(<StatusBadge label="PAGO" />);
    expect(screen.getByText('Pago')).toBeInTheDocument();
    expect(screen.queryByText('PAGO')).not.toBeInTheDocument();
  });

  it('mapeia o tom sem depender da caixa do rótulo recebido', () => {
    render(<StatusBadge label="ATRASADO" />);
    expect(screen.getByText('Atrasado')).toHaveClass('status-badge-danger');
  });

  it('cai no tom de atenção para um rótulo desconhecido', () => {
    render(<StatusBadge label="algo-novo" />);
    expect(screen.getByText('Algo-novo')).toHaveClass('status-badge-warning');
  });
});
