import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, getApiErrorMessage } from '../../services/api';
import type { Morador, Pagamento } from '../../types';
import { Card } from '../../components/Card/Card';
import { Table } from '../../components/Table/Table';
import { TableSkeleton } from '../../components/Table/TableSkeleton';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal/Modal';
import { Header } from '../../components/Header/Header';
import { formatVencimentoLabel } from '../../utils/dates';
import { formatCurrency } from '../../utils/currency';
import { useAuth } from '../../hooks/useAuth';
import './pagamentos.css';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
});

function isAtrasado(pagamento: Pagamento) {
  return !pagamento.pago && new Date(pagamento.vencimento) < new Date();
}

export function Pagamentos() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isViewer = user?.papel === 'VISUALIZADOR';
  const { data: pagamentos = [], error: pagamentosQueryError, isLoading } = useQuery({
    queryKey: ['pagamentos'],
    queryFn: () => api.get<Pagamento[]>('/pagamentos').then((response) => response.data),
  });
  const { data: moradores = [], error: moradoresQueryError } = useQuery({
    queryKey: ['moradores'],
    queryFn: () => api.get<Morador[]>('/moradores').then((response) => response.data),
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [valor, setValor] = useState('');
  const [vencimento, setVencimento] = useState('');
  const [moradorId, setMoradorId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const displayedError =
    listError ??
    (pagamentosQueryError
      ? getApiErrorMessage(pagamentosQueryError, 'Não foi possível carregar os pagamentos.')
      : moradoresQueryError
        ? getApiErrorMessage(moradoresQueryError, 'Não foi possível carregar os moradores.')
        : null);

  function openModal() {
    setValor('');
    setVencimento('');
    setMoradorId(moradores[0] ? String(moradores[0].id) : '');
    setError(null);
    setIsModalOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post('/pagamentos', { valor: Number(valor), vencimento, moradorId: Number(moradorId) });
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['pagamentos'] });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Não foi possível lançar o pagamento.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function togglePago(pagamento: Pagamento) {
    setListError(null);
    try {
      await api.patch(`/pagamentos/${pagamento.id}`, { pago: !pagamento.pago });
      queryClient.invalidateQueries({ queryKey: ['pagamentos'] });
    } catch (err) {
      setListError(getApiErrorMessage(err, 'Não foi possível atualizar o pagamento.'));
    }
  }

  return (
    <div>
      <Header
        title="Pagamentos"
        subtitle="Controle de aluguéis pagos e pendentes."
        action={
          !isViewer && (
            <button type="button" className="btn btn-primary" onClick={openModal} disabled={moradores.length === 0}>
              + Novo pagamento
            </button>
          )
        }
      />

      {moradores.length === 0 && <p className="form-error">Cadastre um morador antes de lançar pagamentos.</p>}
      {displayedError && <p className="form-error">{displayedError}</p>}

      <Card>
        {isLoading ? (
          <TableSkeleton />
        ) : (
        <Table
          rows={pagamentos}
          rowKey={(row) => row.id}
          emptyMessage="Nenhum pagamento lançado ainda."
          columns={[
            { header: 'Morador', render: (row) => row.morador.nome },
            {
              header: 'Unidade',
              render: (row) =>
                row.morador.kitnet.imovel
                  ? `${row.morador.kitnet.imovel.nome}${
                      row.morador.kitnet.imovel.kitnets?.length > 1 ? ` · ${row.morador.kitnet.numero}` : ''
                    }`
                  : row.morador.kitnet.numero,
            },
            { header: 'Vencimento', render: (row) => dateFormatter.format(new Date(row.vencimento)) },
            { header: 'Valor', render: (row) => formatCurrency(row.valor) },
            {
              header: 'Status',
              render: (row) => (
                <div className="payment-status">
                  <StatusBadge label={row.pago ? 'pago' : isAtrasado(row) ? 'atrasado' : 'pendente'} />
                  {!row.pago && (
                    <span
                      className={`payment-status-days${isAtrasado(row) ? ' payment-status-days-danger' : ''}`}
                    >
                      {formatVencimentoLabel(row.vencimento, row.pago)}
                    </span>
                  )}
                </div>
              ),
            },
            ...(isViewer
              ? []
              : [
                  {
                    header: '',
                    align: 'right' as const,
                    render: (row: Pagamento) => (
                      <button type="button" className="btn btn-ghost" onClick={() => togglePago(row)}>
                        {row.pago ? 'Marcar pendente' : 'Marcar pago'}
                      </button>
                    ),
                  },
                ]),
          ]}
        />
        )}
      </Card>

      {isModalOpen && (
        <Modal title="Novo pagamento" onClose={() => setIsModalOpen(false)}>
          <form onSubmit={handleSubmit} className="field-group">
            {error && <p className="form-error">{error}</p>}
            <div className="field">
              <label htmlFor="moradorId">Morador</label>
              <select id="moradorId" value={moradorId} onChange={(event) => setMoradorId(event.target.value)}>
                {moradores.map((morador) => (
                  <option key={morador.id} value={morador.id}>
                    {morador.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="valor">Valor</label>
              <input
                id="valor"
                type="number"
                min={0}
                step="0.01"
                required
                value={valor}
                onChange={(event) => setValor(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="vencimento">Vencimento</label>
              <input
                id="vencimento"
                type="date"
                required
                value={vencimento}
                onChange={(event) => setVencimento(event.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
