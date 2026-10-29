import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BarChart } from './BarChart';

const SERIES = [
  { label: 'Você recebeu', color: 'var(--color-positive)' },
  { label: 'Ficou com a imobiliária', color: 'var(--color-negative)' },
];

const formatValue = (value: number) => `R$ ${value}`;

function renderChart(data: Array<{ label: string; values: number[] }>) {
  const { container } = render(<BarChart data={data} series={SERIES} formatValue={formatValue} />);
  return container;
}

const DOIS_MESES = [
  { label: 'jan', values: [1000, 100] },
  { label: 'fev', values: [2000, 200] },
];

describe('BarChart', () => {
  it('desenha uma barra por valor de cada mês', () => {
    const container = renderChart(DOIS_MESES);
    expect(container.querySelectorAll('.bar-chart-bar')).toHaveLength(4);
  });

  it('rotula cada mês no eixo', () => {
    const container = renderChart(DOIS_MESES);
    const rotulos = Array.from(container.querySelectorAll('.bar-chart-label')).map(
      (node) => node.textContent,
    );
    expect(rotulos).toEqual(['jan', 'fev']);
  });

  // O SVG tem role="img": seu conteúdo não chega ao leitor de tela, então os números
  // precisam existir em algum lugar navegável.
  it('expõe todos os valores numa tabela equivalente', () => {
    renderChart(DOIS_MESES);

    const tabela = screen.getByRole('table');
    expect(tabela).toHaveAccessibleName('Receita versus gastos por mês');
    for (const texto of ['jan', 'fev', 'R$ 1000', 'R$ 100', 'R$ 2000', 'R$ 200']) {
      expect(screen.getAllByText(texto, { selector: 'th, td' }).length).toBeGreaterThan(0);
    }
  });

  it('mantém o rótulo do gráfico como imagem', () => {
    renderChart(DOIS_MESES);
    expect(screen.getByRole('img', { name: 'Receita versus gastos por mês' })).toBeInTheDocument();
  });

  // Sem hover no celular, a legenda é o único canal para ler um número; ela começa no
  // mês mais recente, que é o motivo de abrir o painel.
  it('mostra na legenda os valores do mês mais recente', () => {
    const container = renderChart(DOIS_MESES);

    const legenda = container.querySelector('.bar-chart-legend')!;
    expect(legenda).toHaveTextContent('fev');
    expect(legenda).toHaveTextContent('R$ 2000');
    expect(legenda).toHaveTextContent('R$ 200');
    expect(legenda).not.toHaveTextContent('R$ 1000');
  });

  it('troca os valores da legenda ao tocar em outro mês', async () => {
    const user = userEvent.setup();
    const container = renderChart(DOIS_MESES);

    await user.click(container.querySelectorAll('.bar-chart-hit')[0]);

    const legenda = container.querySelector('.bar-chart-legend')!;
    expect(legenda).toHaveTextContent('jan');
    expect(legenda).toHaveTextContent('R$ 1000');
    expect(legenda).not.toHaveTextContent('R$ 2000');
  });

  it('não quebra com lista vazia', () => {
    const container = renderChart([]);
    expect(screen.getByText('Sem dados no período.')).toBeInTheDocument();
    expect(container.querySelectorAll('.bar-chart-bar')).toHaveLength(0);
  });

  // Risco real de divisão por zero: o máximo da escala vinha de Math.max dos valores.
  it('lida com todos os valores zerados sem gerar geometria inválida', () => {
    const container = renderChart([
      { label: 'jan', values: [0, 0] },
      { label: 'fev', values: [0, 0] },
    ]);

    const barras = Array.from(container.querySelectorAll('.bar-chart-bar'));
    expect(barras).toHaveLength(4);
    for (const barra of barras) {
      expect(barra.getAttribute('height')).toBe('0');
      expect(barra.getAttribute('y')).not.toContain('NaN');
    }
  });

  // A série pode ter menos valores que o número de séries declaradas (mês parcial).
  it('trata valor ausente como zero', () => {
    const container = renderChart([{ label: 'jan', values: [500] }]);

    expect(container.querySelector('.bar-chart-legend')).toHaveTextContent('R$ 0');
  });

  // A largura mínima por mês é o que impede as barras de 1,5px no celular: o SVG cresce
  // com a quantidade de meses em vez de encolher junto com a tela.
  it('cresce em largura conforme o número de meses, em vez de comprimir as barras', () => {
    const doze = Array.from({ length: 12 }, (_, index) => ({
      label: `m${index}`,
      values: [100 + index, 10 + index],
    }));
    const container = renderChart(doze);

    const svg = container.querySelector('.bar-chart-svg')!;
    const largura = Number(svg.getAttribute('width'));
    expect(largura).toBeGreaterThanOrEqual(12 * 48);
    expect(svg.getAttribute('viewBox')).toBe(`0 0 ${largura} 260`);

    const primeiraBarra = container.querySelector('.bar-chart-bar')!;
    expect(Number(primeiraBarra.getAttribute('width'))).toBeGreaterThan(8);
  });
});
