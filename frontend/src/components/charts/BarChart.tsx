import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import './charts.css';

interface BarChartSeries {
  label: string;
  color: string;
}

interface BarChartProps {
  data: Array<{ label: string; values: number[] }>;
  series: BarChartSeries[];
  formatValue: (value: number) => string;
}

/**
 * O gráfico desenhava num `viewBox` fixo de 640x260 com `width: 100%`, ou seja: o SVG
 * inteiro era *escalado* para a largura do container. Num celular de 360px isso
 * significava fator 0,56 — 24 barras de ~1,5px e rótulos de 11px renderizados a 6px —,
 * e de quebra a altura caía junto para ~146px, achatando o gráfico justamente onde há
 * menos espaço horizontal.
 *
 * A saída foi deixar de escalar: o SVG é desenhado em pixels reais (viewBox igual às
 * dimensões renderizadas) e recebe uma largura mínima por grupo de barras. Quando a
 * largura mínima não cabe, o container rola na horizontal.
 *
 * Por que rolagem e não "mostrar rótulo a cada 2 ou 3 meses": rarear rótulos resolveria
 * só metade do problema — as barras continuariam com 1,5px, ilegíveis e impossíveis de
 * acertar com o dedo. A rolagem preserva a densidade de informação e é um gesto que o
 * público já conhece; o custo é não ver os 12 meses de uma vez, mitigado abaixo pelo
 * posicionamento inicial no mês mais recente.
 */
const HEIGHT = 260;
const PADDING_LEFT = 8;
const PADDING_RIGHT = 8;
const PADDING_BOTTOM = 28;
const PADDING_TOP = 16;

/** Largura mínima por mês: o suficiente para duas barras com ~15px e o rótulo inteiro. */
const MIN_GROUP_WIDTH = 48;
const BAR_GAP = 6;

export function BarChart({ data, series, formatValue }: BarChartProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Medir o container (em vez de container query no CSS) porque quem precisa da medida
  // é a geometria do SVG, não só um breakpoint visual: a largura real decide se o
  // gráfico estica para preencher o card ou se vira conteúdo rolável.
  useEffect(() => {
    const node = scrollRef.current;
    if (!node || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // O mês mais recente é o que a pessoa abre o painel para ver; com rolagem ele fica
  // fora da tela por padrão. Atribuição direta de `scrollLeft` (e não `scrollTo` com
  // `behavior: 'smooth'`) para não animar nada em quem pediu menos movimento.
  //
  // Em layout effect e repetido no frame seguinte: na primeira passagem o SVG ainda
  // pode estar com a largura antiga (o ResizeObserver dispara depois da pintura), e
  // `scrollWidth` lido cedo demais deixava o gráfico aberto em nov/25 — justamente o
  // mês que ninguém quer ver.
  useLayoutEffect(() => {
    const node = scrollRef.current;
    if (!node) return;

    const irParaOFim = () => {
      node.scrollLeft = node.scrollWidth;
    };
    irParaOFim();
    const frame = requestAnimationFrame(irParaOFim);
    return () => cancelAnimationFrame(frame);
  }, [data.length, containerWidth]);

  if (data.length === 0) {
    return <p className="bar-chart-empty">Sem dados no período.</p>;
  }

  const minWidth = PADDING_LEFT + PADDING_RIGHT + data.length * MIN_GROUP_WIDTH;
  const width = Math.max(containerWidth, minWidth);
  // `Math.max(1, ...)` cobre o mês sem lançamento nenhum: sem isso, uma série toda
  // zerada daria max = 0 e todas as alturas virariam NaN.
  const max = Math.max(1, ...data.flatMap((point) => point.values));
  const plotHeight = HEIGHT - PADDING_BOTTOM - PADDING_TOP;
  const groupWidth = (width - PADDING_LEFT - PADDING_RIGHT) / data.length;
  const barWidth = Math.max((groupWidth - BAR_GAP * (series.length + 1)) / series.length, 1);

  const activeIndex = selectedIndex ?? data.length - 1;
  const activePoint = data[activeIndex];

  return (
    <div className="bar-chart">
      <div className="bar-chart-scroll" ref={scrollRef}>
        <svg
          width={width}
          height={HEIGHT}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          className="bar-chart-svg"
          role="img"
          aria-label="Receita versus gastos por mês"
        >
          <line
            x1={PADDING_LEFT}
            y1={HEIGHT - PADDING_BOTTOM}
            x2={width - PADDING_RIGHT}
            y2={HEIGHT - PADDING_BOTTOM}
            className="bar-chart-axis"
          />
          {data.map((point, groupIndex) => {
            const groupX = PADDING_LEFT + groupIndex * groupWidth;
            const isActive = groupIndex === activeIndex;
            return (
              <g key={point.label} className={isActive ? 'bar-chart-group is-active' : 'bar-chart-group'}>
                {series.map((serie, serieIndex) => {
                  const value = point.values[serieIndex] ?? 0;
                  const barHeight = Math.max((value / max) * plotHeight, 0);
                  const x = groupX + BAR_GAP + serieIndex * (barWidth + BAR_GAP);
                  return (
                    <rect
                      key={serie.label}
                      x={x}
                      y={HEIGHT - PADDING_BOTTOM - barHeight}
                      width={barWidth}
                      height={barHeight}
                      fill={serie.color}
                      className="bar-chart-bar"
                    />
                  );
                })}
                <text x={groupX + groupWidth / 2} y={HEIGHT - PADDING_BOTTOM + 18} className="bar-chart-label">
                  {point.label}
                </text>
                {/*
                  Alvo de toque do grupo inteiro: no celular não existe hover, então o
                  `<title>` por barra nunca aparecia. Tocar aqui joga os valores do mês
                  na legenda abaixo. O retângulo cobre toda a altura porque mirar numa
                  barra de 15px com o dedo (alvo recomendado: 44px) não é realista.
                */}
                <rect
                  x={groupX}
                  y={0}
                  width={groupWidth}
                  height={HEIGHT}
                  className="bar-chart-hit"
                  onClick={() => setSelectedIndex(groupIndex)}
                >
                  <title>
                    {point.label}:{' '}
                    {series
                      .map((serie, i) => `${serie.label} ${formatValue(point.values[i] ?? 0)}`)
                      .join(', ')}
                  </title>
                </rect>
              </g>
            );
          })}
        </svg>
      </div>

      {/*
        A legenda deixou de ser só o decodificador de cores e passou a carregar os
        números do mês em foco (o mais recente, até que se toque em outro). É o que
        garante que no celular a pessoa extraia um valor sem hover e sem zoom.
      */}
      <div className="bar-chart-legend">
        <span className="bar-chart-legend-month">{activePoint.label}</span>
        {series.map((serie, serieIndex) => (
          <span key={serie.label} className="bar-chart-legend-item">
            <span className="bar-chart-legend-swatch" style={{ background: serie.color }} />
            {serie.label}
            <strong>{formatValue(activePoint.values[serieIndex] ?? 0)}</strong>
          </span>
        ))}
      </div>

      {/*
        Um SVG com `role="img"` é opaco para leitor de tela: o conteúdo interno não entra
        na árvore de acessibilidade, e o `aria-label` sozinho não diz nenhum número.
        A tabela oculta é a versão navegável dos mesmos dados — e serve também a quem usa
        teclado, que não tem como "tocar" numa barra.
      */}
      <table className="bar-chart-table">
        <caption>Receita versus gastos por mês</caption>
        <thead>
          <tr>
            <th scope="col">Mês</th>
            {series.map((serie) => (
              <th key={serie.label} scope="col">
                {serie.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((point) => (
            <tr key={point.label}>
              <th scope="row">{point.label}</th>
              {series.map((serie, serieIndex) => (
                <td key={serie.label}>{formatValue(point.values[serieIndex] ?? 0)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
