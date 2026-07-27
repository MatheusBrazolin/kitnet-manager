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

const WIDTH = 640;
const HEIGHT = 260;
const PADDING_LEFT = 8;
const PADDING_BOTTOM = 28;
const PADDING_TOP = 16;

export function BarChart({ data, series, formatValue }: BarChartProps) {
  const max = Math.max(1, ...data.flatMap((point) => point.values));
  const plotHeight = HEIGHT - PADDING_BOTTOM - PADDING_TOP;
  const groupWidth = (WIDTH - PADDING_LEFT) / data.length;
  const barGap = 6;
  const barWidth = (groupWidth - barGap * (series.length + 1)) / series.length;

  return (
    <div className="bar-chart">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="bar-chart-svg" role="img" aria-label="Receita versus gastos por mês">
        <line
          x1={PADDING_LEFT}
          y1={HEIGHT - PADDING_BOTTOM}
          x2={WIDTH}
          y2={HEIGHT - PADDING_BOTTOM}
          className="bar-chart-axis"
        />
        {data.map((point, groupIndex) => {
          const groupX = PADDING_LEFT + groupIndex * groupWidth;
          return (
            <g key={point.label}>
              {series.map((serie, serieIndex) => {
                const value = point.values[serieIndex] ?? 0;
                const barHeight = (value / max) * plotHeight;
                const x = groupX + barGap + serieIndex * (barWidth + barGap);
                const y = HEIGHT - PADDING_BOTTOM - barHeight;
                return (
                  <rect
                    key={serie.label}
                    x={x}
                    y={y}
                    width={Math.max(barWidth, 0)}
                    height={Math.max(barHeight, 0)}
                    fill={serie.color}
                    className="bar-chart-bar"
                  >
                    <title>
                      {point.label} · {serie.label}: {formatValue(value)}
                    </title>
                  </rect>
                );
              })}
              <text x={groupX + groupWidth / 2} y={HEIGHT - PADDING_BOTTOM + 18} className="bar-chart-label">
                {point.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="bar-chart-legend">
        {series.map((serie) => (
          <span key={serie.label} className="bar-chart-legend-item">
            <span className="bar-chart-legend-swatch" style={{ background: serie.color }} />
            {serie.label}
          </span>
        ))}
      </div>
    </div>
  );
}
