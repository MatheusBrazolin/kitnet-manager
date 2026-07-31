import { useEffect, useState } from 'react';
import { api, getApiErrorMessage } from '../../services/api';
import type { MoradorDetail, PagamentoResumo } from '../../types';
import { Modal } from '../Modal/Modal';
import { StatusBadge } from '../StatusBadge';
import { Table } from '../Table/Table';
import { formatTempoLocacao, formatVencimentoLabel } from '../../utils/dates';
import { formatCurrency } from '../../utils/currency';
import './morador-detail-modal.css';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
});

function isAtrasado(pagamento: PagamentoResumo) {
  return !pagamento.pago && new Date(pagamento.vencimento) < new Date();
}

interface MoradorDetailModalProps {
  moradorId: number;
  onClose: () => void;
}

export function MoradorDetailModal({ moradorId, onClose }: MoradorDetailModalProps) {
  const [morador, setMorador] = useState<MoradorDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMorador(null);
    setError(null);
    api
      .get<MoradorDetail>(`/moradores/${moradorId}`)
      .then((response) => setMorador(response.data))
      .catch((err) => setError(getApiErrorMessage(err, 'Não foi possível carregar os detalhes do morador.')));
  }, [moradorId]);

  const pendente = morador?.pagamentos.find((pagamento) => !pagamento.pago);

  return (
    <Modal title={morador?.nome ?? 'Morador'} onClose={onClose} className="modal-wide">
      {error && <p className="form-error">{error}</p>}
      {!morador && !error && <div className="skeleton morador-detail-skeleton" />}

      {morador && (
        <div className="morador-detail">
          <dl className="morador-detail-grid">
            <div>
              <dt>Telefone</dt>
              <dd>{morador.telefone}</dd>
            </div>
            <div>
              <dt>Kitnet</dt>
              <dd>{morador.kitnet.numero}</dd>
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
                    <StatusBadge label={pendente ? (isAtrasado(pendente) ? 'atrasado' : 'pendente') : 'pago'} />
                    {pendente && (
                      <span className="morador-detail-hint">{formatVencimentoLabel(pendente.vencimento, false)}</span>
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
              { header: 'Vencimento', render: (row) => dateFormatter.format(new Date(row.vencimento)) },
              { header: 'Valor', render: (row) => formatCurrency(row.valor) },
              {
                header: 'Status',
                render: (row) => <StatusBadge label={row.pago ? 'pago' : isAtrasado(row) ? 'atrasado' : 'pendente'} />,
              },
            ]}
          />
        </div>
      )}
    </Modal>
  );
}
