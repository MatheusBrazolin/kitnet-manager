import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { firstErrorMessage } from '../../utils/queryError';
import type { MoradorDetail, PagamentoResumo } from '../../types';
import { Modal } from '../Modal/Modal';
import { StatusBadge } from '../StatusBadge';
import { Table } from '../Table/Table';
import { ErrorBanner } from '../ErrorBanner/ErrorBanner';
import { formatDate, formatMesReferencia, formatTempoLocacao, formatVencimentoLabel } from '../../utils/dates';
import { formatCurrency } from '../../utils/currency';
import './morador-detail-modal.css';

interface MoradorDetailModalProps {
  moradorId: number;
  onClose: () => void;
}

export function MoradorDetailModal({ moradorId, onClose }: MoradorDetailModalProps) {
  const {
    data: morador,
    error: queryError,
  } = useQuery({
    queryKey: ['morador', moradorId],
    queryFn: () => api.get<MoradorDetail>(`/moradores/${moradorId}`).then((response) => response.data),
  });
  const error = firstErrorMessage({ error: queryError, fallback: 'Não foi possível carregar os detalhes do morador.' });

  const pendente = morador?.pagamentos.find(
    (pagamento) => pagamento.status !== 'PAGO' && pagamento.status !== 'ANULADO',
  );

  return (
    <Modal title={morador?.nome ?? 'Morador'} onClose={onClose} className="modal-wide">
      <ErrorBanner message={error} />
      {!morador && !error && <div className="skeleton morador-detail-skeleton" />}

      {morador && (
        <div className="morador-detail">
          <dl className="morador-detail-grid">
            <div>
              <dt>Telefone</dt>
              <dd>{morador.telefone}</dd>
            </div>
            <div>
              <dt>Imóvel</dt>
              <dd>
                {morador.kitnet.imovel?.nome ?? '—'}
                {morador.kitnet.imovel?.kitnets && morador.kitnet.imovel.kitnets.length > 1
                  ? ` · ${morador.kitnet.numero}`
                  : ''}
              </dd>
            </div>
            <div>
              <dt>Morando há</dt>
              <dd>{formatTempoLocacao(morador.dataEntrada)}</dd>
            </div>
            <div>
              <dt>Vencimento</dt>
              <dd>Todo dia {morador.diaVencimento}</dd>
            </div>
            <div>
              <dt>Situação</dt>
              <dd>
                {morador.pagamentos.length === 0 ? (
                  <span className="morador-detail-hint">Nenhum pagamento registrado ainda.</span>
                ) : (
                  <>
                    <StatusBadge label={pendente ? pendente.status.toLowerCase() : 'pago'} />
                    {pendente && (
                      <span className="morador-detail-hint">
                        {formatVencimentoLabel(pendente.vencimento, false)}
                      </span>
                    )}
                  </>
                )}
              </dd>
            </div>
          </dl>

          <h3 className="morador-detail-subtitle">Histórico de pagamentos</h3>
          <Table
            rows={morador.pagamentos}
            rowKey={(row) => row.id}
            emptyMessage="Nenhum pagamento lançado ainda."
            columns={[
              {
                header: 'Mês',
                render: (row) => (
                  <div className="payment-morador-cell">
                    <span>{formatMesReferencia(row.mesReferencia)}</span>
                    {row.tipo === 'COMPLEMENTAR' && (
                      <span className="payment-tipo-tag">
                        Complementar{row.origem ? ` · de ${row.origem}` : ''}
                      </span>
                    )}
                    {row.observacao && <span className="payment-observacao" title={row.observacao}>ℹ︎ {row.observacao}</span>}
                  </div>
                ),
              },
              { header: 'Vencimento', render: (row) => formatDate(row.vencimento) },
              { header: 'Valor', render: (row) => formatCurrency(row.valor) },
              {
                header: 'Status',
                render: (row) => <StatusBadge label={row.status.toLowerCase()} />,
              },
              {
                header: 'Pago em',
                render: (row: PagamentoResumo) =>
                  row.dataPagamento ? formatDate(row.dataPagamento) : '—',
              },
            ]}
          />
        </div>
      )}
    </Modal>
  );
}
