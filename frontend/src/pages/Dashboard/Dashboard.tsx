import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, getApiErrorMessage } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import type { DashboardSummary } from '../../types';
import { Card, HeroStat, StatCard } from '../../components/Card/Card';
import { Table } from '../../components/Table/Table';
import { ErrorBanner } from '../../components/ErrorBanner/ErrorBanner';
import { BarChart } from '../../components/charts/BarChart';
import { DonutChart } from '../../components/charts/DonutChart';
import { formatDate, formatVencimentoLabel } from '../../utils/dates';
import { formatCurrency, formatCompactCurrency } from '../../utils/currency';
import { OnboardingEmptyState } from './OnboardingEmptyState';
import './dashboard.css';

const CORES_GASTOS = [
  'var(--color-brand)',
  'var(--color-positive)',
  'var(--color-warning)',
  'var(--color-negative)',
  'var(--color-ink-muted)',
];

const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

export function Dashboard() {
  const { user } = useAuth();
  const { data: summary, error: queryError } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardSummary>('/dashboard').then((response) => response.data),
  });

  const error = queryError
    ? getApiErrorMessage(queryError, 'Não foi possível carregar o painel.')
    : null;
  // O onboarding durava só até a primeira unidade ser cadastrada (`totalKitnets === 0`),
  // e sumia levando junto o passo 3 — justamente o que faz o painel ganhar números.
  // Agora ele fica até existir o primeiro morador.
  const configurando = summary !== undefined && summary.ocupadas === 0;
  const mesAtual = MESES[new Date().getMonth()];
  const primeiroNome = user?.name.split(' ')[0] ?? '';

  return (
    <div className="dashboard">
      <ErrorBanner message={error} />

      {!summary && !error && (
        <div className="dashboard-carregando">
          <div className="skeleton dashboard-skeleton-hero" />
          <div className="dashboard-stats">
            <div className="skeleton dashboard-skeleton-stat" />
            <div className="skeleton dashboard-skeleton-stat" />
            <div className="skeleton dashboard-skeleton-stat" />
            <div className="skeleton dashboard-skeleton-stat" />
          </div>
        </div>
      )}

      {summary && configurando && (
        <>
          <h1 className="dashboard-saudacao">Olá, {primeiroNome}</h1>
          <OnboardingEmptyState
            totalImoveis={summary.totalImoveis}
            totalUnidades={summary.totalKitnets}
          />
        </>
      )}

      {summary && !configurando && (
        <>
          {/*
            Uma pergunta, uma resposta. Antes havia oito cards idênticos e o número que
            importa — quanto entrou — competia em igualdade com "unidades cadastradas",
            que muda uma vez por ano.
          */}
          <HeroStat
            label={`Olá, ${primeiroNome}. Você recebeu em ${mesAtual}`}
            value={formatCurrency(summary.receitaLiquidaMensal)}
            hint={
              summary.taxasMensal > 0 ? (
                <>
                  já descontados{' '}
                  <strong className="numero">{formatCurrency(summary.taxasMensal)}</strong> de
                  taxa das imobiliárias
                </>
              ) : undefined
            }
            progress={
              summary.totalPendente > 0
                ? {
                    atual: summary.receitaMensal,
                    total: summary.receitaMensal + summary.totalPendente,
                    // Quando tudo que falta já venceu, os dois valores são iguais e
                    // repeti-los lado a lado só confunde: diz "em atraso" uma vez só.
                    legenda:
                      summary.totalEmAtraso >= summary.totalPendente ? (
                        <span className="dashboard-atrasado">
                          Falta receber{' '}
                          <strong className="numero">
                            {formatCurrency(summary.totalPendente)}
                          </strong>
                          , já vencidos
                        </span>
                      ) : (
                        <>
                          Ainda falta receber{' '}
                          <strong className="numero">
                            {formatCurrency(summary.totalPendente)}
                          </strong>
                          {summary.totalEmAtraso > 0 && (
                            <>
                              {', dos quais '}
                              <span className="dashboard-atrasado numero">
                                {formatCurrency(summary.totalEmAtraso)} em atraso
                              </span>
                            </>
                          )}
                        </>
                      ),
                  }
                : undefined
            }
            action={
              summary.totalPendente > 0 ? (
                <Link to="/pagamentos" className="btn btn-primary">
                  Conferir recebimentos
                </Link>
              ) : (
                <span className="dashboard-tudo-em-dia">Tudo recebido neste mês</span>
              )
            }
          />

          <div className="dashboard-stats">
            <StatCard
              label="O que sobrou"
              value={formatCurrency(summary.lucroLiquido)}
              hint={`depois de ${formatCurrency(summary.gastoMensal)} em gastos`}
              tone={summary.lucroLiquido >= 0 ? 'positive' : 'negative'}
            />
            <StatCard
              label="Se todos pagarem"
              value={formatCurrency(summary.valorMensal)}
              hint="soma dos aluguéis das suas unidades"
            />
            <StatCard
              label="Unidades ocupadas"
              value={`${summary.ocupadas} de ${summary.totalKitnets}`}
              hint={summary.vagas > 0 ? `${summary.vagas} à espera de morador` : 'nenhuma vaga'}
              tone={summary.vagas > 0 ? 'warning' : 'positive'}
            />
            <StatCard
              label="Ficou com as imobiliárias"
              value={formatCurrency(summary.taxasMensal)}
              hint="taxa retida neste mês"
              tone="negative"
            />
          </div>

          <div className="dashboard-grid">
            <Card
              title="Quanto ficou com você"
              subtitle="Últimos 12 meses, mês a mês"
              className="dashboard-chart-card"
            >
              <BarChart
                data={summary.historico.map((point) => ({
                  label: point.label,
                  values: [point.liquido, point.taxa],
                }))}
                series={[
                  { label: 'Você recebeu', color: 'var(--color-positive)' },
                  { label: 'Ficou com a imobiliária', color: 'var(--color-negative)' },
                ]}
                formatValue={(value) => formatCompactCurrency(value)}
              />
            </Card>

            <Card
              title="Onde foi o dinheiro"
              subtitle={`Gastos de ${mesAtual}, por imóvel`}
              className="dashboard-chart-card"
            >
              <DonutChart
                data={summary.gastosPorImovel.map((item, index) => ({
                  label: item.imovel,
                  value: item.total,
                  color: CORES_GASTOS[index % CORES_GASTOS.length],
                }))}
                formatValue={(value) => formatCurrency(value)}
                emptyMessage="Nenhum gasto lançado neste mês."
              />
            </Card>
          </div>

          <Card
            title="Quem administra o quê"
            subtitle={`Movimento de ${mesAtual} por imobiliária`}
            action={
              <Link to="/imobiliarias" className="btn btn-quiet btn-sm">
                Gerenciar
              </Link>
            }
          >
            <Table
              rows={summary.porImobiliaria}
              rowKey={(row) => row.imobiliariaId ?? 'gestao-direta'}
              emptyMessage="Nenhuma unidade cadastrada ainda."
              columns={[
                { header: 'Imobiliária', render: (row) => row.nome },
                {
                  header: 'Ocupadas',
                  align: 'right' as const,
                  render: (row) => (
                    <span className="numero">
                      {row.ocupadas} de {row.unidades}
                    </span>
                  ),
                },
                {
                  header: 'Aluguel',
                  align: 'right' as const,
                  render: (row) => <span className="numero">{formatCurrency(row.bruto)}</span>,
                },
                {
                  header: 'Taxa',
                  align: 'right' as const,
                  // Sinal explícito, não só a cor: daltonismo e impressão em
                  // preto e branco continuam legíveis.
                  render: (row) => (
                    <span className="numero dashboard-saida">
                      {row.taxas > 0 ? `− ${formatCurrency(row.taxas)}` : formatCurrency(0)}
                    </span>
                  ),
                },
                {
                  header: 'Você recebeu',
                  align: 'right' as const,
                  render: (row) => (
                    <strong className="numero">{formatCurrency(row.liquido)}</strong>
                  ),
                },
              ]}
            />
          </Card>

          <Card
            title="Próximos vencimentos"
            subtitle="Os aluguéis mais perto de vencer"
            action={
              <Link to="/pagamentos" className="btn btn-quiet btn-sm">
                Ver todos
              </Link>
            }
          >
            <Table
              rows={summary.proximosVencimentos}
              rowKey={(row) => row.id}
              emptyMessage="Nenhum aluguel pendente — está tudo em dia."
              columns={[
                { header: 'Morador', render: (row) => row.morador },
                {
                  header: 'Vencimento',
                  render: (row) => (
                    <div className="dashboard-vencimento">
                      <span className="numero">{formatDate(row.vencimento)}</span>
                      <span className="dashboard-vencimento-hint">
                        {formatVencimentoLabel(row.vencimento, false)}
                      </span>
                    </div>
                  ),
                },
                {
                  header: 'Valor',
                  align: 'right' as const,
                  render: (row) => <span className="numero">{formatCurrency(row.valor)}</span>,
                },
              ]}
            />
          </Card>
        </>
      )}
    </div>
  );
}
