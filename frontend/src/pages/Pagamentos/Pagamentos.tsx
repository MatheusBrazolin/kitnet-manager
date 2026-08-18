import { useMemo, useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, getApiErrorMessage } from '../../services/api';
import type { Morador, Pagamento } from '../../types';
import { Card } from '../../components/Card/Card';
import { Table } from '../../components/Table/Table';
import { TableSkeleton } from '../../components/Table/TableSkeleton';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal/Modal';
import { Header } from '../../components/Header/Header';
import { formatMesReferencia, formatVencimentoLabel } from '../../utils/dates';
import { formatCurrency } from '../../utils/currency';
import { useAuth } from '../../hooks/useAuth';
import '../Imoveis/imoveis.css';
import './pagamentos.css';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
});

function hojeIso() {
  return new Date().toISOString().slice(0, 10);
}

interface GrupoImovel {
  imovelId: number;
  nome: string;
  endereco?: string | null;
  pagamentos: Pagamento[];
  totalPendente: number;
  countAtrasado: number;
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

  const [expandidos, setExpandidos] = useState<Set<number>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [valor, setValor] = useState('');
  const [vencimento, setVencimento] = useState('');
  const [moradorId, setMoradorId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [marcandoPago, setMarcandoPago] = useState<Pagamento | null>(null);
  const [dataPagamento, setDataPagamento] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('');
  const [marcarPagoError, setMarcarPagoError] = useState<string | null>(null);
  const [isMarcandoPagoSubmitting, setIsMarcandoPagoSubmitting] = useState(false);

  const displayedError =
    listError ??
    (pagamentosQueryError
      ? getApiErrorMessage(pagamentosQueryError, 'Não foi possível carregar os pagamentos.')
      : moradoresQueryError
        ? getApiErrorMessage(moradoresQueryError, 'Não foi possível carregar os moradores.')
        : null);

  const grupos = useMemo<GrupoImovel[]>(() => {
    const porImovel = new Map<number, GrupoImovel>();
    for (const pagamento of pagamentos) {
      const imovel = pagamento.morador.kitnet.imovel;
      if (!imovel) {
        continue;
      }
      if (!porImovel.has(imovel.id)) {
        porImovel.set(imovel.id, {
          imovelId: imovel.id,
          nome: imovel.nome,
          endereco: imovel.endereco,
          pagamentos: [],
          totalPendente: 0,
          countAtrasado: 0,
        });
      }
      const grupo = porImovel.get(imovel.id)!;
      grupo.pagamentos.push(pagamento);
      if (pagamento.status !== 'PAGO') {
        grupo.totalPendente += pagamento.valor;
      }
      if (pagamento.status === 'ATRASADO') {
        grupo.countAtrasado += 1;
      }
    }

    for (const grupo of porImovel.values()) {
      grupo.pagamentos.sort((a, b) => {
        if (a.mesReferencia !== b.mesReferencia) {
          return b.mesReferencia.localeCompare(a.mesReferencia);
        }
        return a.morador.nome.localeCompare(b.morador.nome);
      });
    }

    return Array.from(porImovel.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [pagamentos]);

  function toggleExpandido(imovelId: number) {
    setExpandidos((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(imovelId)) {
        proximo.delete(imovelId);
      } else {
        proximo.add(imovelId);
      }
      return proximo;
    });
  }

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

  function openMarcarPagoModal(pagamento: Pagamento) {
    setMarcandoPago(pagamento);
    setDataPagamento(hojeIso());
    setFormaPagamento('');
    setMarcarPagoError(null);
  }

  async function handleMarcarPago(event: FormEvent) {
    event.preventDefault();
    if (!marcandoPago) {
      return;
    }
    setMarcarPagoError(null);
    setIsMarcandoPagoSubmitting(true);
    try {
      await api.patch(`/pagamentos/${marcandoPago.id}/marcar-pago`, {
        dataPagamento,
        formaPagamento: formaPagamento || undefined,
      });
      setMarcandoPago(null);
      queryClient.invalidateQueries({ queryKey: ['pagamentos'] });
    } catch (err) {
      setMarcarPagoError(getApiErrorMessage(err, 'Não foi possível confirmar o pagamento.'));
    } finally {
      setIsMarcandoPagoSubmitting(false);
    }
  }

  async function desfazerPagamento(pagamento: Pagamento) {
    setListError(null);
    try {
      await api.patch(`/pagamentos/${pagamento.id}/desfazer-pagamento`);
      queryClient.invalidateQueries({ queryKey: ['pagamentos'] });
    } catch (err) {
      setListError(getApiErrorMessage(err, 'Não foi possível desfazer o pagamento.'));
    }
  }

  return (
    <div>
      <Header
        title="Pagamentos"
        subtitle="Controle de aluguéis pagos e pendentes, organizados por imóvel."
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

      {isLoading ? (
        <Card>
          <TableSkeleton />
        </Card>
      ) : grupos.length === 0 ? (
        <Card>
          <p className="table-empty">Nenhum pagamento lançado ainda.</p>
        </Card>
      ) : (
        <div className="imoveis-list">
          {grupos.map((grupo) => {
            const aberto = expandidos.has(grupo.imovelId);
            return (
              <section className="imovel-card" key={grupo.imovelId}>
                <button
                  type="button"
                  className="imovel-card-summary-row"
                  onClick={() => toggleExpandido(grupo.imovelId)}
                  aria-expanded={aberto}
                >
                  <div className="imovel-card-summary-main">
                    <span className={`imovel-card-chevron${aberto ? ' imovel-card-chevron-open' : ''}`} aria-hidden="true">
                      ▾
                    </span>
                    <div className="imovel-card-summary-title">
                      <span className="imovel-card-nome">{grupo.nome}</span>
                      {grupo.endereco && <span className="imovel-card-endereco">{grupo.endereco}</span>}
                    </div>
                  </div>
                  <div className="imovel-card-summary-stats">
                    <span className="imovel-card-stat">
                      {grupo.pagamentos.length} parcela{grupo.pagamentos.length === 1 ? '' : 's'}
                    </span>
                    {grupo.countAtrasado > 0 && (
                      <span className="imovel-card-stat payment-status-days-danger">
                        {grupo.countAtrasado} atrasada{grupo.countAtrasado === 1 ? '' : 's'}
                      </span>
                    )}
                    <span className="imovel-card-stat imovel-card-stat-valor">
                      {formatCurrency(grupo.totalPendente)} em aberto
                    </span>
                  </div>
                </button>

                {aberto && (
                  <div className="imovel-card-body">
                    <Table
                      rows={grupo.pagamentos}
                      rowKey={(row) => row.id}
                      emptyMessage="Nenhum pagamento neste imóvel ainda."
                      columns={[
                        { header: 'Morador', render: (row) => row.morador.nome },
                        { header: 'Unidade', render: (row) => row.morador.kitnet.numero },
                        { header: 'Mês', render: (row) => formatMesReferencia(row.mesReferencia) },
                        { header: 'Vencimento', render: (row) => dateFormatter.format(new Date(row.vencimento)) },
                        { header: 'Valor', render: (row) => formatCurrency(row.valor) },
                        {
                          header: 'Status',
                          render: (row) => (
                            <div className="payment-status">
                              <StatusBadge label={row.status.toLowerCase()} />
                              {row.status === 'PAGO' && row.dataPagamento ? (
                                <span className="payment-status-days">
                                  Pago em {dateFormatter.format(new Date(row.dataPagamento))}
                                </span>
                              ) : (
                                <span
                                  className={`payment-status-days${row.status === 'ATRASADO' ? ' payment-status-days-danger' : ''}`}
                                >
                                  {formatVencimentoLabel(row.vencimento, false)}
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
                                render: (row: Pagamento) =>
                                  row.status === 'PAGO' ? (
                                    <button type="button" className="btn btn-ghost" onClick={() => desfazerPagamento(row)}>
                                      Desfazer
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      className="btn btn-ghost"
                                      onClick={() => openMarcarPagoModal(row)}
                                    >
                                      Marcar pago
                                    </button>
                                  ),
                              },
                            ]),
                      ]}
                    />
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

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

      {marcandoPago && (
        <Modal
          title={`Marcar pago · ${marcandoPago.morador.nome} · ${formatMesReferencia(marcandoPago.mesReferencia)}`}
          onClose={() => setMarcandoPago(null)}
        >
          <form onSubmit={handleMarcarPago} className="field-group">
            {marcarPagoError && <p className="form-error">{marcarPagoError}</p>}
            <div className="field">
              <label htmlFor="dataPagamento">Data em que o valor foi recebido</label>
              <input
                id="dataPagamento"
                type="date"
                required
                value={dataPagamento}
                onChange={(event) => setDataPagamento(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="formaPagamento">Forma de pagamento (opcional)</label>
              <input
                id="formaPagamento"
                placeholder="Ex.: Pix, dinheiro, transferência..."
                value={formaPagamento}
                onChange={(event) => setFormaPagamento(event.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={isMarcandoPagoSubmitting}>
              {isMarcandoPagoSubmitting ? 'Salvando...' : 'Confirmar pagamento'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
