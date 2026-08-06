import { useEffect, useState } from 'react';
import { api, getApiErrorMessage } from '../../services/api';
import type { KitnetDetail } from '../../types';
import { Modal } from '../Modal/Modal';
import { StatusBadge } from '../StatusBadge';
import { Table } from '../Table/Table';
import { formatCurrency } from '../../utils/currency';
import './kitnet-detail-modal.css';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
});

interface KitnetDetailModalProps {
  kitnetId: number;
  onClose: () => void;
}

export function KitnetDetailModal({ kitnetId, onClose }: KitnetDetailModalProps) {
  const [kitnet, setKitnet] = useState<KitnetDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setKitnet(null);
    setError(null);
    api
      .get<KitnetDetail>(`/kitnets/${kitnetId}`)
      .then((response) => setKitnet(response.data))
      .catch((err) => setError(getApiErrorMessage(err, 'Não foi possível carregar os detalhes da kitnet.')));
  }, [kitnetId]);

  const morador = kitnet?.moradores[0];

  return (
    <Modal title={kitnet ? `Kitnet ${kitnet.numero}` : 'Kitnet'} onClose={onClose} className="modal-wide">
      {error && <p className="form-error">{error}</p>}
      {!kitnet && !error && <div className="skeleton kitnet-detail-skeleton" />}

      {kitnet && (
        <div className="kitnet-detail">
          <dl className="kitnet-detail-grid">
            <div>
              <dt>Imóvel</dt>
              <dd>{kitnet.imovel?.nome ?? '—'}</dd>
            </div>
            <div>
              <dt>Aluguel</dt>
              <dd>{formatCurrency(kitnet.valor)}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <StatusBadge label={kitnet.status} />
              </dd>
            </div>
            <div>
              <dt>Morador atual</dt>
              <dd>{morador ? `${morador.nome} · ${morador.telefone}` : 'Nenhum morador'}</dd>
            </div>
            <div>
              <dt>Total gasto</dt>
              <dd className="kitnet-detail-total-gasto">{formatCurrency(kitnet.totalGasto)}</dd>
            </div>
          </dl>

          <h3 className="kitnet-detail-subtitle">Histórico de gastos</h3>
          <Table
            rows={kitnet.gastos}
            rowKey={(row) => row.id}
            emptyMessage="Nenhum gasto lançado nesta kitnet ainda."
            columns={[
              { header: 'Descrição', render: (row) => row.descricao },
              { header: 'Data', render: (row) => dateFormatter.format(new Date(row.data)) },
              { header: 'Valor', align: 'right', render: (row) => formatCurrency(row.valor) },
            ]}
          />
        </div>
      )}
    </Modal>
  );
}
