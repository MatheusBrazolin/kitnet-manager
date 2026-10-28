import { useQuery } from '@tanstack/react-query';
import { api, getApiErrorMessage } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import type { DashboardSummary } from '../../types';
import { Card, StatCard } from '../../components/Card/Card';
import { Table } from '../../components/Table/Table';
import { ErrorBanner } from '../../components/ErrorBanner/ErrorBanner';
import { Header } from '../../components/Header/Header';
import { BarChart } from '../../components/charts/BarChart';
import { DonutChart } from '../../components/charts/DonutChart';
import { formatDate, formatVencimentoLabel } from '../../utils/dates';
import { formatCurrency, formatCompactCurrency } from '../../utils/currency';
import { OnboardingEmptyState } from './OnboardingEmptyState';
import './dashboard.css';

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
  const isEmpty = summary?.totalKitnets === 0;

  return (
    <div className="dashboard">
      <Header
        title={`Olá, ${user?.name.split(' ')[0]}`}
        subtitle={isEmpty ? 'Falta pouco para o seu painel ganhar vida.' : 'Aqui está o resumo dos seus imóveis hoje.'}
      />

      <ErrorBanner message={error} />

      {!summary && !error && (
        <div className="dashboard-stats">
          <div className="skeleton dashboard-skeleton-stat" />
          <div className="skeleton dashboard-skeleton-stat" />
          <div className="skeleton dashboard-skeleton-stat" />
          <div className="skeleton dashboard-skeleton-stat" />
          <div className="skeleton dashboard-skeleton-stat" />
          <div className="skeleton dashboard-skeleton-stat" />
          <div className="skeleton dashboard-skeleton-stat" />
          <div className="skeleton dashboard-skeleton-stat" />
        </div>
      )}

      {summary && isEmpty && <OnboardingEmptyState />}

      {summary && !isEmpty && (
        <>
          <div className="dashboard-stats">
            <StatCard label="Unidades cadastradas" value={String(summary.totalKitnets)} />
            <StatCard
              label="Ocupadas"
              value={String(summary.ocupadas)}
              hint={`${summary.vagas} vagas`}
              tone="success"
            />
            {/* Projeção: o que as unidades valem se tudo estiver ocupado e em dia. */}
            <StatCard
              label="Valor mensal previsto"
              value={formatCurrency(summary.valorMensal)}
              hint={
                summary.totalImobiliaria > 0
                  ? `dos quais ${formatCurrency(summary.totalImobiliaria)} vão pra imobiliária`
                  : undefined
              }
              tone="warning"
            />
            {/* Realizado: o que de fato entrou na conta no mês. */}
            <StatCard
              label="Recebido líquido"
              value={formatCurrency(summary.receitaLiquidaMensal)}
              hint={`de ${formatCurrency(summary.receitaMensal)} em aluguéis`}
              tone="success"
            />
            <StatCard
              label="Taxas às imobiliárias"
              value={formatCurrency(summary.taxasMensal)}
              hint="retido no mês"
              tone="warning"
            />
            <StatCard
              label="Gastos no mês"
              value={formatCurrency(summary.gastoMensal)}
              tone="danger"
            />
            <StatCard
              label="Lucro líquido"
              value={formatCurrency(summary.lucroLiquido)}
              hint="Recebido líquido - gastos do mês"
              tone={summary.lucroLiquido >= 0 ? 'success' : 'danger'}
            />
            <StatCard
              label="Repasses a receber"
              value={formatCurrency(summary.totalPendente)}
              hint={
                summary.totalEmAtraso > 0
                  ? `${formatCurrency(summary.totalEmAtraso)} já vencidos`
                  : `${summary.quantidadePendente} em aberto`
              }
              tone={summary.totalEmAtraso > 0 ? 'danger' : 'warning'}
            />
          </div>

          <div className="dashboard-grid">
            <Card title="Receita vs. gastos (12 meses)" className="dashboard-chart-card">
              <BarChart
                data={summary.historico.map((point) => ({ label: point.label, values: [point.receita, point.gasto] }))}
                series={[
                  { label: 'Receita', color: 'var(--color-success)' },
                  { label: 'Gastos', color: 'var(--color-danger)' },
                ]}
                formatValue={(value) => formatCompactCurrency(value)}
              />
            </Card>

            <Card title="Líquido vs. taxas (12 meses)" className="dashboard-chart-card">
              <BarChart
                data={summary.historico.map((point) => ({
                  label: point.label,
                  values: [point.liquido, point.taxa],
                }))}
                series={[
                  { label: 'Você recebeu', color: 'var(--color-brand)' },
                  { label: 'Ficou com a imobiliária', color: 'var(--color-ink-muted)' },
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

          <Card title="Por imobiliária (mês atual)" className="dashboard-upcoming">
            <Table
              rows={summary.porImobiliaria}
              // Unidades sem administradora vêm agrupadas numa linha com id nulo.
              rowKey={(row) => row.imobiliariaId ?? 'gestao-direta'}
              emptyMessage="Nenhuma unidade cadastrada ainda."
              columns={[
                { header: 'Imobiliária', render: (row) => row.nome },
                {
                  header: 'Unidades',
                  align: 'right' as const,
                  render: (row) => `${row.ocupadas}/${row.unidades}`,
                },
                {
                  header: 'Bruto',
                  align: 'right' as const,
                  render: (row) => formatCurrency(row.bruto),
                },
                {
                  header: 'Taxas',
                  align: 'right' as const,
                  render: (row) => formatCurrency(row.taxas),
                },
                {
                  header: 'Líquido',
                  align: 'right' as const,
                  render: (row) => formatCurrency(row.liquido),
                },
              ]}
            />
          </Card>

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
                      <span>{formatDate(row.vencimento)}</span>
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
