import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { firstErrorMessage } from '../../utils/queryError';
import type { KitnetDetail } from '../../types';
import { Modal } from '../Modal/Modal';
import { StatusBadge } from '../StatusBadge';
import { Table } from '../Table/Table';
import { ErrorBanner } from '../ErrorBanner/ErrorBanner';
import { formatCurrency } from '../../utils/currency';
import {
  calcularRepasseDaUnidade,
  formatTaxaLabel,
  resolverTaxaDaUnidade,
} from '../../utils/repasse';
import { formatDate } from '../../utils/dates';
import './kitnet-detail-modal.css';
import { formatTelefone } from '../../utils/telefone';

interface KitnetDetailModalProps {
  kitnetId: number;
  onClose: () => void;
}

export function KitnetDetailModal({ kitnetId, onClose }: KitnetDetailModalProps) {
  const {
    data: kitnet,
    error: queryError,
  } = useQuery({
    queryKey: ['kitnet', kitnetId],
    queryFn: () => api.get<KitnetDetail>(`/kitnets/${kitnetId}`).then((response) => response.data),
  });
  const error = firstErrorMessage({ error: queryError, fallback: 'Não foi possível carregar os detalhes da kitnet.' });

  const morador = kitnet?.moradores[0];

  // Taxa efetivamente aplicada a esta unidade (a própria, ou a padrão da administradora)
  // e o que ela significa em reais sobre o aluguel atual.
  const taxaAplicada = kitnet
    ? resolverTaxaDaUnidade(kitnet)
    : { taxaTipo: 'FIXA' as const, taxaValor: 0 };
  const repasse = kitnet
    ? calcularRepasseDaUnidade(kitnet.valor, kitnet)
    : { taxa: 0, liquido: 0 };

  // O histórico já vem do backend ordenado do mais recente pro mais antigo — a variação de
  // cada linha é a diferença pro registro logo abaixo dela (o valor anterior).
  const historicoComVariacao =
    kitnet?.historicoValor.map((item, index) => ({
      ...item,
      variacao: index < kitnet.historicoValor.length - 1 ? item.valor - kitnet.historicoValor[index + 1].valor : null,
    })) ?? [];

  return (
    <Modal
      title={kitnet ? `${kitnet.imovel?.nome ?? 'Unidade'} · ${kitnet.numero}` : 'Unidade'}
      onClose={onClose}
      className="modal-wide"
    >
      <ErrorBanner message={error} />
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
              <dt>Administração</dt>
              <dd>{kitnet.imobiliaria ? kitnet.imobiliaria.nome : 'Gestão direta'}</dd>
            </div>
            {repasse.taxa > 0 ? (
              <div>
                <dt>Taxa da imobiliária</dt>
                {/* `valor - taxaImobiliaria` quebraria com taxa percentual, em que o
                    campo guarda 10 (dez por cento) e não dez reais. */}
                <dd>
                  {formatTaxaLabel(taxaAplicada.taxaTipo, taxaAplicada.taxaValor, formatCurrency)}
                  {' = '}
                  {formatCurrency(repasse.taxa)} · você recebe{' '}
                  {formatCurrency(repasse.liquido)}
                </dd>
              </div>
            ) : null}
            <div>
              <dt>Status</dt>
              <dd>
                <StatusBadge label={kitnet.status} />
              </dd>
            </div>
            <div>
              <dt>Morador atual</dt>
              <dd>{morador ? `${morador.nome} · ${formatTelefone(morador.telefone)}` : 'Nenhum morador'}</dd>
            </div>
            <div>
              <dt>Total gasto</dt>
              <dd className="kitnet-detail-total-gasto">{formatCurrency(kitnet.totalGasto)}</dd>
            </div>
          </dl>

          <h3 className="kitnet-detail-subtitle">Histórico de valor do aluguel</h3>
          <Table
            rows={historicoComVariacao}
            rowKey={(row) => row.id}
            emptyMessage="Sem histórico de valor ainda."
            columns={[
              { header: 'Vigente desde', render: (row) => formatDate(row.vigenteDesde) },
              { header: 'Valor', align: 'right', render: (row) => formatCurrency(row.valor) },
              {
                header: 'Variação',
                align: 'right',
                render: (row) =>
                  row.variacao === null ? (
                    '—'
                  ) : (
                    <span className={row.variacao >= 0 ? 'kitnet-historico-alta' : 'kitnet-historico-baixa'}>
                      {row.variacao >= 0 ? '+' : ''}
                      {formatCurrency(row.variacao)}
                    </span>
                  ),
              },
            ]}
          />

          <h3 className="kitnet-detail-subtitle">Histórico de gastos</h3>
          <Table
            rows={kitnet.gastos}
            rowKey={(row) => row.id}
            emptyMessage="Nenhum gasto lançado nesta kitnet ainda."
            columns={[
              { header: 'Descrição', render: (row) => row.descricao },
              { header: 'Data', render: (row) => formatDate(row.data) },
              { header: 'Valor', align: 'right', render: (row) => formatCurrency(row.valor) },
            ]}
          />
        </div>
      )}
    </Modal>
  );
}
