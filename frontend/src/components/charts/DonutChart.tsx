import './charts.css';

interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutSlice[];
  formatValue: (value: number) => string;
  emptyMessage?: string;
}

const SIZE = 180;
const RADIUS = 70;
const STROKE = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function DonutChart({ data, formatValue, emptyMessage = 'Sem dados no período.' }: DonutChartProps) {
  const total = data.reduce((sum, slice) => sum + slice.value, 0);

  if (total <= 0) {
    return <p className="donut-chart-empty">{emptyMessage}</p>;
  }

  let offset = 0;

  return (
    <div className="donut-chart">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="donut-chart-svg" role="img" aria-label="Distribuição de gastos por kitnet">
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--color-border-strong)"
          strokeWidth={STROKE}
        />
        {data.map((slice) => {
          const fraction = slice.value / total;
          const dash = fraction * CIRCUMFERENCE;
          const dashArray = `${dash} ${CIRCUMFERENCE - dash}`;
          const dashOffset = -offset;
          offset += dash;
          return (
            <circle
              key={slice.label}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={slice.color}
              strokeWidth={STROKE}
              strokeDasharray={dashArray}
              strokeDashoffset={dashOffset}
              transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
              className="donut-chart-slice"
            >
              <title>
                {slice.label}: {formatValue(slice.value)}
              </title>
            </circle>
          );
        })}
        <text x={SIZE / 2} y={SIZE / 2 - 4} textAnchor="middle" className="donut-chart-total-label">
          Total
        </text>
        <text x={SIZE / 2} y={SIZE / 2 + 16} textAnchor="middle" className="donut-chart-total-value">
          {formatValue(total)}
        </text>
      </svg>
      <ul className="donut-chart-legend">
        {data.map((slice) => (
          <li key={slice.label} className="donut-chart-legend-item">
            <span className="donut-chart-legend-swatch" style={{ background: slice.color }} />
            {slice.label}
            <strong>{formatValue(slice.value)}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
