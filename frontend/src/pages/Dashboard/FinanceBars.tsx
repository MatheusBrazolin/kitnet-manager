const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

interface FinanceBarsProps {
  receita: number;
  gasto: number;
}

export function FinanceBars({ receita, gasto }: FinanceBarsProps) {
  const maior = Math.max(receita, gasto, 1);
  const pctReceita = Math.min(100, (receita / maior) * 100);
  const pctGasto = Math.min(100, (gasto / maior) * 100);

  return (
    <div className="finance-bars">
      <div className="finance-bar-row">
        <span className="finance-bar-label">Recebido</span>
        <div className="finance-bar-track">
          <div
            className="finance-bar-fill finance-bar-fill-success"
            style={{ width: `${pctReceita}%` }}
          />
        </div>
        <span className="finance-bar-value">{currencyFormatter.format(receita)}</span>
      </div>
      <div className="finance-bar-row">
        <span className="finance-bar-label">Gastos</span>
        <div className="finance-bar-track">
          <div className="finance-bar-fill finance-bar-fill-danger" style={{ width: `${pctGasto}%` }} />
        </div>
        <span className="finance-bar-value">{currencyFormatter.format(gasto)}</span>
      </div>
    </div>
  );
}
