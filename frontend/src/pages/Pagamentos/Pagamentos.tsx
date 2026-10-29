import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, getApiErrorMessage } from '../../services/api';
import { firstErrorMessage } from '../../utils/queryError';
import type { Morador, Pagamento } from '../../types';
import { Card } from '../../components/Card/Card';
import { Table } from '../../components/Table/Table';
import { TableSkeleton } from '../../components/Table/TableSkeleton';
import { ErrorBanner } from '../../components/ErrorBanner/ErrorBanner';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal/Modal';
import { Header } from '../../components/Header/Header';
import { ExpandableGroupCard } from '../../components/ExpandableGroupCard/ExpandableGroupCard';
import { CurrencyInput } from '../../components/CurrencyInput';
import { formatDate, formatMesReferencia, formatVencimentoLabel, hojeIsoLocal } from '../../utils/dates';
import { formatCurrency } from '../../utils/currency';
import { calcularRepasseDaUnidade } from '../../utils/repasse';
import { useAuth } from '../../hooks/useAuth';
import { useToggleSet } from '../../hooks/useToggleSet';
import './pagamentos.css';
import { invalidarDadosDoNegocio } from '../../services/invalidate';
import { useToast } from '../../components/Toast/ToastProvider';

interface GrupoImovel {
  imovelId: number;
  nome: string;
  endereco?: string | null;
  pagamentos: Pagamento[];
  totalPendente: number;
  countAtrasado: number;
  totalRecebido: number;
  countAnulado: number;
}

function agruparPorImovel(pagamentos: Pagamento[]): GrupoImovel[] {
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
        totalRecebido: 0,
        countAnulado: 0,
      });
    }
    const grupo = porImovel.get(imovel.id)!;
    grupo.pagamentos.push(pagamento);
    if (pagamento.status !== 'PAGO' && pagamento.status !== 'ANULADO') {
      grupo.totalPendente += pagamento.valor;
    }
    if (pagamento.status === 'ATRASADO') {
      grupo.countAtrasado += 1;
    }
    if (pagamento.status === 'PAGO') {
      // Líquido, para bater com o "você recebeu" do painel. `valorLiquido` é nulo em
      // parcelas pagas antes de existir o snapshot, e aí o bruto é o melhor dado.
      grupo.totalRecebido += pagamento.valorLiquido ?? pagamento.valor;
    }
    if (pagamento.status === 'ANULADO') {
      grupo.countAnulado += 1;
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
}

function filtrarPorBusca(pagamentos: Pagamento[], buscaNormalizada: string): Pagamento[] {
  if (!buscaNormalizada) {
    return pagamentos;
  }
  return pagamentos.filter(
    (p) =>
      p.morador.nome.toLowerCase().includes(buscaNormalizada) ||
      p.morador.kitnet.numero.toLowerCase().includes(buscaNormalizada),
  );
}

export function Pagamentos() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { user } = useAuth();
  const isViewer = user?.papel === 'VISUALIZADOR';
  const { data: pagamentos = [], error: pagamentosQueryError, isLoading } = useQuery({
    queryKey: ['pagamentos'],
    queryFn: () => api.get<Pagamento[]>('/pagamentos').then((response) => response.data),
  });
  const {
    data: moradores = [],
    error: moradoresQueryError,
    isLoading: isLoadingMoradores,
  } = useQuery({
    queryKey: ['moradores'],
    queryFn: () => api.get<Morador[]>('/moradores').then((response) => response.data),
  });

  const [aba, setAba] = useState<'aberto' | 'historico'>('aberto');
  const [mesFiltro, setMesFiltro] = useState('todos');
  const [busca, setBusca] = useState('');
  const [expandidos, toggleExpandido] = useToggleSet<number>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [valor, setValor] = useState('');
  const [vencimento, setVencimento] = useState('');
  const [moradorId, setMoradorId] = useState('');
  const [observacao, setObservacao] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  // Id do pagamento em processamento — desabilita só aquele botão, evitando dois
  // PATCH /desfazer-pagamento em voo num duplo clique.
  const [desfazendoId, setDesfazendoId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [marcandoPago, setMarcandoPago] = useState<Pagamento | null>(null);
  // Líquido efetivamente recebido. Começa no valor calculado e pode ser corrigido à mão.
  const [valorLiquido, setValorLiquido] = useState('');
  const [dataPagamento, setDataPagamento] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('');
  const [marcarPagoError, setMarcarPagoError] = useState<string | null>(null);
  const [isMarcandoPagoSubmitting, setIsMarcandoPagoSubmitting] = useState(false);

  const [isComplementarModalOpen, setIsComplementarModalOpen] = useState(false);
  const [complementarValor, setComplementarValor] = useState('');
  const [complementarMoradorId, setComplementarMoradorId] = useState('');
  const [complementarData, setComplementarData] = useState('');
  const [complementarObservacao, setComplementarObservacao] = useState('');
  const [complementarError, setComplementarError] = useState<string | null>(null);
  const [isComplementarSubmitting, setIsComplementarSubmitting] = useState(false);

  const [editando, setEditando] = useState<Pagamento | null>(null);
  const [editValor, setEditValor] = useState('');
  const [editVencimento, setEditVencimento] = useState('');
  const [editObservacao, setEditObservacao] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  const [anulando, setAnulando] = useState<Pagamento | null>(null);
  const [anularObservacao, setAnularObservacao] = useState('');
  const [anularError, setAnularError] = useState<string | null>(null);
  const [isAnularSubmitting, setIsAnularSubmitting] = useState(false);

  const moradorSelecionado = moradores.find((morador) => String(morador.id) === moradorId);
  const valorReferencia = moradorSelecionado?.kitnet?.valor;

  const displayedError =
    listError ??
    firstErrorMessage(
      { error: pagamentosQueryError, fallback: 'Não foi possível carregar os pagamentos.' },
      { error: moradoresQueryError, fallback: 'Não foi possível carregar os moradores.' },
    );

  // "Em aberto" = precisa da sua atenção (cobrar ou confirmar). "Histórico" = já resolvido
  // (recebido ou anulado) — fica fora da tela principal pra ela não virar uma lista infinita
  // de meses já passados, mas nada é perdido: continua uma aba de distância, filtrável por mês.
  const pagamentosAberto = useMemo(
    () => pagamentos.filter((p) => p.status === 'PENDENTE' || p.status === 'ATRASADO'),
    [pagamentos],
  );
  const pagamentosHistorico = useMemo(
    () => pagamentos.filter((p) => p.status === 'PAGO' || p.status === 'ANULADO'),
    [pagamentos],
  );

  const mesesDisponiveis = useMemo(() => {
    const vistos = new Map<string, string>();
    for (const p of pagamentosHistorico) {
      const chave = p.mesReferencia.slice(0, 7);
      if (!vistos.has(chave)) {
        vistos.set(chave, formatMesReferencia(p.mesReferencia));
      }
    }
    return Array.from(vistos.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([chave, label]) => ({ chave, label }));
  }, [pagamentosHistorico]);

  const pagamentosHistoricoFiltrado = useMemo(() => {
    if (mesFiltro === 'todos') {
      return pagamentosHistorico;
    }
    return pagamentosHistorico.filter((p) => p.mesReferencia.slice(0, 7) === mesFiltro);
  }, [pagamentosHistorico, mesFiltro]);

  // Busca por morador ou unidade, aplicada por cima do que já estiver filtrado por
  // aba/mês — não dispara request nova, é só um filtro sobre o que já foi carregado.
  const buscaNormalizada = busca.trim().toLowerCase();
  const pagamentosAbertoFiltrado = useMemo(
    () => filtrarPorBusca(pagamentosAberto, buscaNormalizada),
    [pagamentosAberto, buscaNormalizada],
  );
  const pagamentosHistoricoFiltradoPorBusca = useMemo(
    () => filtrarPorBusca(pagamentosHistoricoFiltrado, buscaNormalizada),
    [pagamentosHistoricoFiltrado, buscaNormalizada],
  );

  const gruposAberto = useMemo(() => agruparPorImovel(pagamentosAbertoFiltrado), [pagamentosAbertoFiltrado]);
  const gruposHistorico = useMemo(
    () => agruparPorImovel(pagamentosHistoricoFiltradoPorBusca),
    [pagamentosHistoricoFiltradoPorBusca],
  );
  const grupos = aba === 'aberto' ? gruposAberto : gruposHistorico;

  function openModal() {
    setValor('');
    setVencimento('');
    setMoradorId(moradores[0] ? String(moradores[0].id) : '');
    setObservacao('');
    setError(null);
    setIsModalOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post('/pagamentos', {
        valor: Number(valor),
        vencimento,
        moradorId: Number(moradorId),
        observacao: observacao.trim() || undefined,
      });
      setIsModalOpen(false);
      invalidarDadosDoNegocio(queryClient);
      toast.sucesso('Pagamento lançado');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Não foi possível lançar o pagamento.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  function openComplementarModal() {
    setComplementarValor('');
    setComplementarMoradorId(moradores[0] ? String(moradores[0].id) : '');
    setComplementarData(hojeIsoLocal());
    setComplementarObservacao('');
    setComplementarError(null);
    setIsComplementarModalOpen(true);
  }

  async function handleComplementarSubmit(event: FormEvent) {
    event.preventDefault();
    setComplementarError(null);
    setIsComplementarSubmitting(true);
    try {
      await api.post('/pagamentos/complementar', {
        valor: Number(complementarValor),
        moradorId: Number(complementarMoradorId),
        dataPagamento: complementarData,
        observacao: complementarObservacao.trim() || undefined,
      });
      setIsComplementarModalOpen(false);
      invalidarDadosDoNegocio(queryClient);
      toast.sucesso('Valor extra registrado');
    } catch (err) {
      setComplementarError(getApiErrorMessage(err, 'Não foi possível lançar o pagamento complementar.'));
    } finally {
      setIsComplementarSubmitting(false);
    }
  }

  function openMarcarPagoModal(pagamento: Pagamento) {
    setMarcandoPago(pagamento);
    setDataPagamento(hojeIsoLocal());
    setFormaPagamento('');
    // Pré-preenchido com o cálculo da taxa da unidade; o usuário ajusta se o repasse
    // real veio diferente.
    setValorLiquido(
      String(
        calcularRepasseDaUnidade(pagamento.valor, pagamento.morador.kitnet)
          .liquido,
      ),
    );
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
        // Só envia quando difere do cálculo: assim o backend grava o snapshot pela
        // regra da unidade no caso normal, e respeita o ajuste manual quando houver.
        valorLiquido: liquidoFoiAjustado ? Number(valorLiquido) : undefined,
      });
      setMarcandoPago(null);
      invalidarDadosDoNegocio(queryClient);
      toast.sucesso('Pagamento confirmado');
    } catch (err) {
      setMarcarPagoError(getApiErrorMessage(err, 'Não foi possível confirmar o pagamento.'));
    } finally {
      setIsMarcandoPagoSubmitting(false);
    }
  }

  // Repasse previsto para a parcela aberta no modal, pela mesma conta que o backend
  // usará ao gravar o snapshot.
  const repassePrevisto = marcandoPago
    ? calcularRepasseDaUnidade(marcandoPago.valor, marcandoPago.morador.kitnet)
    : { taxa: 0, liquido: 0 };
  const liquidoInformado = Number(valorLiquido) || 0;
  const liquidoFoiAjustado =
    marcandoPago !== null && liquidoInformado !== repassePrevisto.liquido;
  // Quando o líquido é corrigido, a taxa passa a ser a diferença — é o que de fato
  // ficou retido, e mantém bruto = taxa + líquido.
  const taxaEfetiva = liquidoFoiAjustado
    ? Math.round(((marcandoPago?.valor ?? 0) - liquidoInformado) * 100) / 100
    : repassePrevisto.taxa;

  async function desfazerPagamento(pagamento: Pagamento) {
    setListError(null);
    setDesfazendoId(pagamento.id);
    try {
      await api.patch(`/pagamentos/${pagamento.id}/desfazer-pagamento`);
      invalidarDadosDoNegocio(queryClient);
      toast.sucesso(pagamento.status === 'ANULADO' ? 'Parcela reativada' : 'Pagamento desfeito');
    } catch (err) {
      setListError(
        getApiErrorMessage(
          err,
          pagamento.status === 'ANULADO' ? 'Não foi possível reverter o pagamento.' : 'Não foi possível desfazer o pagamento.',
        ),
      );
    } finally {
      setDesfazendoId(null);
    }
  }

  function openEditModal(pagamento: Pagamento) {
    setEditando(pagamento);
    setEditValor(String(pagamento.valor));
    setEditVencimento(pagamento.vencimento.slice(0, 10));
    setEditObservacao(pagamento.observacao ?? '');
    setEditError(null);
  }

  async function handleEditSubmit(event: FormEvent) {
    event.preventDefault();
    if (!editando) {
      return;
    }
    setEditError(null);
    setIsEditSubmitting(true);
    try {
      await api.patch(`/pagamentos/${editando.id}`, {
        valor: Number(editValor),
        vencimento: editVencimento,
        // Sempre manda a string (mesmo vazia) — diferente do formulário de criação, aqui
        // pode já existir uma observação salva, e "undefined" faria o axios omitir a chave
        // do corpo da requisição, deixando o valor antigo intacto em vez de limpar.
        observacao: editObservacao.trim(),
      });
      setEditando(null);
      invalidarDadosDoNegocio(queryClient);
      toast.sucesso('Pagamento atualizado');
    } catch (err) {
      setEditError(getApiErrorMessage(err, 'Não foi possível salvar as alterações.'));
    } finally {
      setIsEditSubmitting(false);
    }
  }

  function openAnularModal(pagamento: Pagamento) {
    setAnulando(pagamento);
    setAnularObservacao('');
    setAnularError(null);
  }

  async function handleAnularSubmit(event: FormEvent) {
    event.preventDefault();
    if (!anulando) {
      return;
    }
    setAnularError(null);
    setIsAnularSubmitting(true);
    try {
      await api.patch(`/pagamentos/${anulando.id}/anular`, {
        // Idem ao Editar: string vazia explícita, não "undefined" (que faria o axios omitir
        // a chave e manter uma observação antiga de uma anulação anterior).
        observacao: anularObservacao.trim(),
      });
      setAnulando(null);
      invalidarDadosDoNegocio(queryClient);
      toast.sucesso('Parcela marcada como não recebida');
    } catch (err) {
      setAnularError(getApiErrorMessage(err, 'Não foi possível anular o pagamento.'));
    } finally {
      setIsAnularSubmitting(false);
    }
  }

  return (
    <div>
      <Header
        title="Pagamentos"
        subtitle="Controle de aluguéis pagos e pendentes, organizados por imóvel."
        action={
          !isViewer && (
            <div className="pagamentos-header-actions">
              <button type="button" className="btn btn-ghost" onClick={openComplementarModal} disabled={moradores.length === 0}>
                + Complementar
              </button>
              <button type="button" className="btn btn-primary" onClick={openModal} disabled={moradores.length === 0}>
                + Novo pagamento
              </button>
            </div>
          )
        }
      />

      {!isLoadingMoradores && moradores.length === 0 && (
        <div className="pre-requisito">
          <p>
            Os aluguéis aparecem aqui sozinhos assim que você cadastrar um morador numa
            unidade.
          </p>
          <Link to="/moradores" className="btn btn-ghost btn-sm">
            Cadastrar morador
          </Link>
        </div>
      )}
      <ErrorBanner message={displayedError} />

      <div className="pagamentos-tabs">
        <div className="pagamentos-tabs-grupo" role="tablist" aria-label="Filtrar pagamentos">
          <button
            type="button"
            role="tab"
            aria-selected={aba === 'aberto'}
            className={`pagamentos-tab${aba === 'aberto' ? ' pagamentos-tab-ativa' : ''}`}
            onClick={() => setAba('aberto')}
          >
            Em aberto
            {pagamentosAberto.length > 0 && (
              <span className="pagamentos-tab-count numero">{pagamentosAberto.length}</span>
            )}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={aba === 'historico'}
            className={`pagamentos-tab${aba === 'historico' ? ' pagamentos-tab-ativa' : ''}`}
            onClick={() => setAba('historico')}
          >
            Histórico
          </button>
        </div>
        {aba === 'historico' && mesesDisponiveis.length > 0 && (
          <select
            className="pagamentos-tab-filtro"
            value={mesFiltro}
            onChange={(event) => setMesFiltro(event.target.value)}
            aria-label="Filtrar histórico por mês"
          >
            <option value="todos">Todos os meses</option>
            {mesesDisponiveis.map((mes) => (
              <option key={mes.chave} value={mes.chave}>
                {mes.label}
              </option>
            ))}
          </select>
        )}
        <input
          type="search"
          className="pagamentos-busca"
          placeholder="Buscar por morador ou unidade..."
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
          aria-label="Buscar por morador ou unidade"
        />
      </div>

      {isLoading ? (
        <Card>
          <TableSkeleton />
        </Card>
      ) : grupos.length === 0 ? (
        <Card>
          <p className="table-empty">
            {busca.trim()
              ? 'Nenhum pagamento encontrado para essa busca.'
              : aba === 'aberto'
                ? 'Nenhum pagamento em aberto — tudo em dia.'
                : 'Nenhum pagamento nesse histórico ainda.'}
          </p>
        </Card>
      ) : (
        <div className="imoveis-list">
          {grupos.map((grupo) => {
            const aberto = expandidos.has(grupo.imovelId);
            return (
              <ExpandableGroupCard
                key={grupo.imovelId}
                isOpen={aberto}
                onToggle={() => toggleExpandido(grupo.imovelId)}
                title={grupo.nome}
                subtitle={grupo.endereco}
                stats={
                  <>
                    <span className="imovel-card-stat">
                      {grupo.pagamentos.length} parcela{grupo.pagamentos.length === 1 ? '' : 's'}
                    </span>
                    {aba === 'aberto' ? (
                      <>
                        {grupo.countAtrasado > 0 && (
                          <span className="imovel-card-stat payment-status-days-danger">
                            {grupo.countAtrasado} atrasada{grupo.countAtrasado === 1 ? '' : 's'}
                          </span>
                        )}
                        <span className="imovel-card-stat imovel-card-stat-valor">
                          {formatCurrency(grupo.totalPendente)} em aberto
                        </span>
                      </>
                    ) : (
                      <>
                        {grupo.countAnulado > 0 && (
                          <span className="imovel-card-stat">
                            {grupo.countAnulado} anulada{grupo.countAnulado === 1 ? '' : 's'}
                          </span>
                        )}
                        <span className="imovel-card-stat imovel-card-stat-valor">
                          {formatCurrency(grupo.totalRecebido)} recebido
                        </span>
                      </>
                    )}
                  </>
                }
              >
                    <Table
                      rows={grupo.pagamentos}
                      rowKey={(row) => row.id}
                      emptyMessage="Nenhum pagamento neste imóvel ainda."
                      columns={[
                        {
                          header: 'Morador',
                          render: (row) => (
                            <div className="payment-morador-cell">
                              <span>{row.morador.nome}</span>
                              {row.tipo === 'COMPLEMENTAR' && (
                                <span className="payment-tipo-tag">
                                  Complementar{row.origem ? ` · de ${row.origem}` : ''}
                                </span>
                              )}
                              {row.observacao && row.status !== 'ANULADO' && (
                                <span className="payment-observacao" title={row.observacao}>ℹ︎ {row.observacao}</span>
                              )}
                            </div>
                          ),
                        },
                        { header: 'Unidade', render: (row) => row.morador.kitnet.numero },
                        { header: 'Mês', render: (row) => formatMesReferencia(row.mesReferencia) },
                        {
                          header: 'Vencimento',
                          render: (row) =>
                            row.tipo === 'COMPLEMENTAR'
                              ? `Recebido em ${formatDate(row.vencimento)}`
                              : formatDate(row.vencimento),
                        },
                        {
                          header: 'Valor',
                          align: 'right' as const,
                          // Parcela paga mostra o LÍQUIDO em destaque, com o bruto
                          // embaixo. O painel diz "você recebeu R$ X" (líquido) e esta
                          // lista dizia R$ Y (bruto): dois números diferentes para a
                          // mesma coisa, sem nada explicando a diferença.
                          render: (row) =>
                            row.status === 'PAGO' && row.valorLiquido !== null ? (
                              <span className="payment-valor">
                                <strong className="numero">
                                  {formatCurrency(row.valorLiquido)}
                                </strong>
                                {row.valorTaxa !== null && row.valorTaxa > 0 && (
                                  <small className="payment-valor-referencia numero">
                                    de {formatCurrency(row.valor)} − {formatCurrency(row.valorTaxa)} de taxa
                                  </small>
                                )}
                              </span>
                            ) : (
                              <span className="numero">{formatCurrency(row.valor)}</span>
                            ),
                        },
                        {
                          header: 'Status',
                          render: (row) => (
                            <div className="payment-status">
                              <StatusBadge label={row.status.toLowerCase()} />
                              {row.status === 'PAGO' && row.dataPagamento ? (
                                <span className="payment-status-days">
                                  Pago em {formatDate(row.dataPagamento)}
                                </span>
                              ) : row.status === 'ANULADO' ? (
                                row.observacao && <span className="payment-status-days">{row.observacao}</span>
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
                                render: (row: Pagamento) => (
                                  <div className="table-row-actions">
                                    <button type="button" className="btn btn-ghost" onClick={() => openEditModal(row)}>
                                      Editar
                                    </button>
                                    {row.status === 'PAGO' && (
                                      <button
                                        type="button"
                                        className="btn btn-ghost"
                                        onClick={() => desfazerPagamento(row)}
                                        disabled={desfazendoId === row.id}
                                      >
                                        {desfazendoId === row.id ? 'Desfazendo...' : 'Desfazer'}
                                      </button>
                                    )}
                                    {row.status === 'ANULADO' && (
                                      <button
                                        type="button"
                                        className="btn btn-ghost"
                                        onClick={() => desfazerPagamento(row)}
                                        disabled={desfazendoId === row.id}
                                      >
                                        {desfazendoId === row.id ? 'Revertendo...' : 'Reverter'}
                                      </button>
                                    )}
                                    {(row.status === 'PENDENTE' || row.status === 'ATRASADO') && (
                                      <>
                                        <button
                                          type="button"
                                          className="btn btn-ghost"
                                          onClick={() => openMarcarPagoModal(row)}
                                        >
                                          Marcar pago
                                        </button>
                                        <button type="button" className="btn btn-ghost" onClick={() => openAnularModal(row)}>
                                          Anular
                                        </button>
                                      </>
                                    )}
                                  </div>
                                ),
                              },
                            ]),
                      ]}
                    />
              </ExpandableGroupCard>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <Modal title="Novo pagamento" onClose={() => setIsModalOpen(false)}>
          <form onSubmit={handleSubmit} className="field-group">
            <ErrorBanner message={error} />
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
              <CurrencyInput id="valor" required value={valor} onChange={setValor} />
              {valorReferencia !== undefined && (
                <span className="payment-valor-referencia">
                  Valor combinado na kitnet: {formatCurrency(valorReferencia)}
                  {Number(valor) > 0 && Number(valor) !== valorReferencia ? ' · diferente do padrão' : ''}
                </span>
              )}
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
            <div className="field">
              <label htmlFor="observacao">Motivo do ajuste (opcional)</label>
              <input
                id="observacao"
                placeholder="Ex.: Proporcional a 19 dias, 1º mês repassado à imobiliária..."
                value={observacao}
                onChange={(event) => setObservacao(event.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </button>
          </form>
        </Modal>
      )}

      {isComplementarModalOpen && (
        <Modal title="Pagamento complementar" onClose={() => setIsComplementarModalOpen(false)}>
          <form onSubmit={handleComplementarSubmit} className="field-group">
            <ErrorBanner message={complementarError} />
            <p className="field-static-hint">
              Use para um valor recebido fora do aluguel do mês — ex.: valor combinado com um ex-morador, multa,
              taxa extra.
            </p>
            <div className="field">
              <label htmlFor="complementarMoradorId">Morador</label>
              <select
                id="complementarMoradorId"
                value={complementarMoradorId}
                onChange={(event) => setComplementarMoradorId(event.target.value)}
              >
                {moradores.map((morador) => (
                  <option key={morador.id} value={morador.id}>
                    {morador.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="complementarValor">Valor</label>
              <CurrencyInput id="complementarValor" required value={complementarValor} onChange={setComplementarValor} />
            </div>
            <div className="field">
              <label htmlFor="complementarData">Data de recebimento</label>
              <input
                id="complementarData"
                type="date"
                required
                value={complementarData}
                onChange={(event) => setComplementarData(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="complementarObservacao">Observação (opcional)</label>
              <input
                id="complementarObservacao"
                value={complementarObservacao}
                onChange={(event) => setComplementarObservacao(event.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={isComplementarSubmitting}>
              {isComplementarSubmitting ? 'Salvando...' : 'Salvar'}
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
            <ErrorBanner message={marcarPagoError} />
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

            <div className="field">
              <label htmlFor="valorLiquido">Valor que você recebeu</label>
              <CurrencyInput
                id="valorLiquido"
                required
                value={valorLiquido}
                onChange={setValorLiquido}
              />
              <dl className="pagamento-repasse">
                <div>
                  <dt>Aluguel</dt>
                  <dd>{formatCurrency(marcandoPago.valor)}</dd>
                </div>
                <div>
                  <dt>Taxa da imobiliária</dt>
                  <dd>− {formatCurrency(taxaEfetiva)}</dd>
                </div>
                <div className="pagamento-repasse-total">
                  <dt>Você recebe</dt>
                  <dd>{formatCurrency(liquidoInformado)}</dd>
                </div>
              </dl>
              <p className="field-static-hint">
                {liquidoFoiAjustado
                  ? `Ajustado: o cálculo pela taxa da unidade daria ${formatCurrency(repassePrevisto.liquido)}. Vale o valor informado.`
                  : 'Corrija aqui se o repasse veio diferente do combinado.'}
              </p>
            </div>

            <button type="submit" className="btn btn-primary" disabled={isMarcandoPagoSubmitting}>
              {isMarcandoPagoSubmitting ? 'Salvando...' : 'Confirmar pagamento'}
            </button>
          </form>
        </Modal>
      )}

      {editando && (
        <Modal
          title={`Editar · ${editando.morador.nome} · ${formatMesReferencia(editando.mesReferencia)}`}
          onClose={() => setEditando(null)}
        >
          <form onSubmit={handleEditSubmit} className="field-group">
            <ErrorBanner message={editError} />
            <div className="field">
              <label htmlFor="editValor">Valor</label>
              <CurrencyInput id="editValor" required value={editValor} onChange={setEditValor} />
            </div>
            <div className="field">
              <label htmlFor="editVencimento">
                {editando.tipo === 'COMPLEMENTAR' ? 'Data de recebimento' : 'Vencimento'}
              </label>
              <input
                id="editVencimento"
                type="date"
                required
                value={editVencimento}
                onChange={(event) => setEditVencimento(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="editObservacao">Observação (opcional)</label>
              <input
                id="editObservacao"
                placeholder="Ex.: Proporcional a 19 dias, 1º mês repassado à imobiliária..."
                value={editObservacao}
                onChange={(event) => setEditObservacao(event.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={isEditSubmitting}>
              {isEditSubmitting ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </form>
        </Modal>
      )}

      {anulando && (
        <Modal
          title={`Anular · ${anulando.morador.nome} · ${formatMesReferencia(anulando.mesReferencia)}`}
          onClose={() => setAnulando(null)}
        >
          <form onSubmit={handleAnularSubmit} className="field-group">
            <ErrorBanner message={anularError} />
            <p className="field-static-hint">
              Use quando essa parcela não vai ser recebida — ex.: 1º mês repassado à imobiliária, morador saiu
              antes do fim do contrato. Ela deixa de contar como pendência ou receita, mas continua no histórico.
            </p>
            <div className="field">
              <label htmlFor="anularObservacao">Motivo (opcional)</label>
              <input
                id="anularObservacao"
                placeholder="Ex.: Repassado à imobiliária"
                value={anularObservacao}
                onChange={(event) => setAnularObservacao(event.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-danger" disabled={isAnularSubmitting}>
              {isAnularSubmitting ? 'Salvando...' : 'Anular pagamento'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
