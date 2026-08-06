import { useQuery } from '@tanstack/react-query';
import { api, getApiErrorMessage } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import type { DashboardSummary } from '../../types';
import { Card, StatCard } from '../../components/Card/Card';
import { Table } from '../../components/Table/Table';
import { Header } from '../../components/Header/Header';
import { BarChart } from '../../components/charts/BarChart';
import { DonutChart } from '../../components/charts/DonutChart';
import { formatVencimentoLabel } from '../../utils/dates';
import { formatCurrency, formatCompactCurrency } from '../../utils/currency';
import './dashboard.css';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', timeZone: 'UTC' });

const KITNET_COLORS = ['var(--color-brand)', 'var(--color-success)', 'var(--color-warning)', 'var(--color-danger)', 'var(--color-ink-muted)'];

export function Dashboard() {
  const { user } = useAuth();
  const {
    data: summary,
    error: queryError,
  } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardSummary>('/dashboard').then((response) => response.data),
  });

  const error = queryError ? getApiErrorMessage(queryError, 'Não foi possível carregar o dashboard.') : null;

  return (
    <div className="dashboard">
      <Header title={`Olá, ${user?.name.split(' ')[0]}`} subtitle="Aqui está o resumo dos seus imóveis hoje." />

      {error && <p className="form-error">{error}</p>}

      {!summary && !error && (
        <div className="dashboard-stats">
          <div className="skeleton dashboard-skeleton-stat" />
          <div className="skeleton dashboard-skeleton-stat" />
          <div className="skeleton dashboard-skeleton-stat" />
          <div className="skeleton dashboard-skeleton-stat" />
          <div className="skeleton dashboard-skeleton-stat" />
          <div className="skeleton dashboard-skeleton-stat" />
        </div>
      )}

      {summary && (
        <>
          <div className="dashboard-stats">
            <StatCard label="Unidades cadastradas" value={String(summary.totalKitnets)} />
            <StatCard
              label="Ocupadas"
              value={String(summary.ocupadas)}
              hint={`${summary.vagas} vagas`}
              tone="success"
            />
            <StatCard label="Valor mensal" value={formatCurrency(summary.valorMensal)} tone="warning" />
            <StatCard
              label="Gastos no mês"
              value={formatCurrency(summary.gastoMensal)}
              tone="danger"
            />
            <StatCard
              label="Lucro líquido"
              value={formatCurrency(summary.lucroLiquido)}
              hint="Recebido - gastos do mês"
              tone={summary.lucroLiquido >= 0 ? 'success' : 'danger'}
            />
            <StatCard
              label="Total em atraso"
              value={formatCurrency(summary.totalEmAtraso)}
              tone={summary.totalEmAtraso > 0 ? 'danger' : 'success'}
            />
          </div>

          <div className="dashboard-grid">
            <Card title="Receita vs. gastos (6 meses)" className="dashboard-chart-card">
              <BarChart
                data={summary.historico.map((point) => ({ label: point.label, values: [point.receita, point.gasto] }))}
                series={[
                  { label: 'Receita', color: 'var(--color-success)' },
                  { label: 'Gastos', color: 'var(--color-danger)' },
                ]}
                formatValue={(value) => formatCompactCurrency(value)}
              />
            </Card>

            <Card title="Gastos por imóvel (mês atual)" className="dashboard-chart-card">
              <DonutChart
                data={summary.gastosPorImovel.map((item, index) => ({
                  label: item.imovel,
                  value: item.total,
                  color: KITNET_COLORS[index % KITNET_COLORS.length],
                }))}
                formatValue={(value) => formatCurrency(value)}
                emptyMessage="Nenhum gasto lançado neste mês."
              />
            </Card>
          </div>

          <Card title="Próximos vencimentos" className="dashboard-upcoming">
            <Table
              rows={summary.proximosVencimentos}
              rowKey={(row) => row.id}
              emptyMessage="Nenhum pagamento pendente por aqui."
              columns={[
                { header: 'Morador', render: (row) => row.morador },
                {
                  header: 'Vencimento',
                  render: (row) => (
                    <div className="dashboard-vencimento">
                      <span>{dateFormatter.format(new Date(row.vencimento))}</span>
                      <span className="dashboard-vencimento-hint">{formatVencimentoLabel(row.vencimento, false)}</span>
                    </div>
                  ),
                },
                {
                  header: 'Valor',
                  align: 'right',
                  render: (row) => formatCurrency(row.valor),
                },
              ]}
            />
          </Card>
        </>
      )}
    </div>
  );
}
