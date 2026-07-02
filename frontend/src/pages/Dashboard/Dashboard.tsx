import { useEffect, useState } from 'react';
import { api, getApiErrorMessage } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import type { DashboardSummary } from '../../types';
import { Card, StatCard } from '../../components/Card/Card';
import { Table } from '../../components/Table/Table';
import { Header } from '../../components/Header/Header';
import './dashboard.css';

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long' });

export function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<DashboardSummary>('/dashboard')
      .then((response) => setSummary(response.data))
      .catch((err) => setError(getApiErrorMessage(err, 'Não foi possível carregar o dashboard.')));
  }, []);

  return (
    <div>
      <Header title={`Olá, ${user?.name.split(' ')[0]}`} subtitle="Aqui está o resumo das suas kitnets hoje." />

      {error && <p className="form-error">{error}</p>}

      {summary && (
        <>
          <div className="dashboard-stats">
            <StatCard label="Kitnets cadastradas" value={String(summary.totalKitnets)} />
            <StatCard
              label="Ocupadas"
              value={String(summary.ocupadas)}
              hint={`${summary.vagas} vagas`}
              tone="success"
            />
            <StatCard
              label="Valor mensal"
              value={currencyFormatter.format(summary.valorMensal)}
              tone="warning"
            />
          </div>

          <Card title="Próximos vencimentos" className="dashboard-upcoming">
            <Table
              rows={summary.proximosVencimentos}
              rowKey={(row) => row.id}
              emptyMessage="Nenhum pagamento pendente por aqui."
              columns={[
                { header: 'Morador', render: (row) => row.morador },
                { header: 'Vencimento', render: (row) => dateFormatter.format(new Date(row.vencimento)) },
                {
                  header: 'Valor',
                  align: 'right',
                  render: (row) => currencyFormatter.format(row.valor),
                },
              ]}
            />
          </Card>
        </>
      )}
    </div>
  );
}
