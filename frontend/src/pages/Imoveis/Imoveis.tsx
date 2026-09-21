import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, getApiErrorMessage } from '../../services/api';
import { firstErrorMessage } from '../../utils/queryError';
import type { Imovel, Kitnet } from '../../types';
import { Card } from '../../components/Card/Card';
import { Table } from '../../components/Table/Table';
import { TableSkeleton } from '../../components/Table/TableSkeleton';
import { ErrorBanner } from '../../components/ErrorBanner/ErrorBanner';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal/Modal';
import { Header } from '../../components/Header/Header';
import { KitnetDetailModal } from '../../components/KitnetDetailModal/KitnetDetailModal';
import { ExpandableGroupCard } from '../../components/ExpandableGroupCard/ExpandableGroupCard';
import { CurrencyInput } from '../../components/CurrencyInput';
import { PencilIcon } from '../../components/icons';
import { useConfirm } from '../../components/ConfirmDialog/ConfirmProvider';
import { useAuth } from '../../hooks/useAuth';
import { useToggleSet } from '../../hooks/useToggleSet';
import { formatCurrency } from '../../utils/currency';
import './imoveis.css';
import { invalidarDadosDoNegocio } from '../../services/invalidate';

export function Imoveis() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { user } = useAuth();
  const isViewer = user?.papel === 'VISUALIZADOR';
  const {
    data: imoveis = [],
    error: queryError,
    isLoading,
  } = useQuery({
    queryKey: ['imoveis'],
    queryFn: () => api.get<Imovel[]>('/imoveis').then((response) => response.data),
  });

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingImovelId, setEditingImovelId] = useState<number | null>(null);
  const [nome, setNome] = useState('');
  const [endereco, setEndereco] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingKitnet, setEditingKitnet] = useState<Kitnet | null>(null);
  const [editNumero, setEditNumero] = useState('');
  const [editValor, setEditValor] = useState('');
  const [editTaxaImobiliaria, setEditTaxaImobiliaria] = useState('');
  const [editKitnetError, setEditKitnetError] = useState<string | null>(null);
  const [isEditKitnetSubmitting, setIsEditKitnetSubmitting] = useState(false);

  const [loteImovelId, setLoteImovelId] = useState<number | null>(null);
  const [loteQuantidade, setLoteQuantidade] = useState('1');
  const [lotePrefixo, setLotePrefixo] = useState('');
  const [loteLinhas, setLoteLinhas] = useState<Array<{ numero: string; valor: string }> | null>(null);
  const [loteValorPadrao, setLoteValorPadrao] = useState('');
  const [loteError, setLoteError] = useState<string | null>(null);
  const [isLoteSubmitting, setIsLoteSubmitting] = useState(false);

  const [selectedKitnetId, setSelectedKitnetId] = useState<number | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [expandidos, toggleExpandido] = useToggleSet<number>();
  const [menuImovelId, setMenuImovelId] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (menuImovelId === null) {
      return;
    }
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuImovelId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuImovelId]);

  const displayedError =
    listError ?? firstErrorMessage({ error: queryError, fallback: 'Não foi possível carregar os imóveis.' });

  function openCreateModal() {
    setEditingImovelId(null);
    setNome('');
    setEndereco('');
    setCreateError(null);
    setIsCreateOpen(true);
  }

  function openEditImovelModal(imovel: Imovel) {
    setEditingImovelId(imovel.id);
    setNome(imovel.nome);
    setEndereco(imovel.endereco ?? '');
    setCreateError(null);
    setIsCreateOpen(true);
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setCreateError(null);
    setIsSubmitting(true);
    try {
      if (editingImovelId !== null) {
        await api.patch(`/imoveis/${editingImovelId}`, { nome, endereco: endereco || undefined });
      } else {
        await api.post('/imoveis', { nome, endereco: endereco || undefined });
      }
      setIsCreateOpen(false);
      invalidarDadosDoNegocio(queryClient);
    } catch (err) {
      setCreateError(getApiErrorMessage(err, `Não foi possível ${editingImovelId !== null ? 'atualizar' : 'criar'} o imóvel.`));
    } finally {
      setIsSubmitting(false);
    }
  }

  function openEditKitnetModal(kitnet: Kitnet) {
    setEditingKitnet(kitnet);
    setEditNumero(kitnet.numero);
    setEditValor(String(kitnet.valor));
    setEditTaxaImobiliaria(kitnet.taxaImobiliaria ? String(kitnet.taxaImobiliaria) : '');
    setEditKitnetError(null);
  }

  async function handleEditKitnet(event: FormEvent) {
    event.preventDefault();
    if (!editingKitnet) {
      return;
    }
    setEditKitnetError(null);
    setIsEditKitnetSubmitting(true);
    try {
      await api.patch(`/kitnets/${editingKitnet.id}`, {
        numero: editNumero,
        valor: Number(editValor),
        taxaImobiliaria: editTaxaImobiliaria ? Number(editTaxaImobiliaria) : null,
      });
      setEditingKitnet(null);
      invalidarDadosDoNegocio(queryClient);
    } catch (err) {
      setEditKitnetError(getApiErrorMessage(err, 'Não foi possível atualizar a unidade.'));
    } finally {
      setIsEditKitnetSubmitting(false);
    }
  }

  async function handleDeleteImovel(id: number) {
    const ok = await confirm({
      title: 'Remover imóvel',
      message: 'Remover este imóvel? Essa ação não pode ser desfeita.',
      confirmLabel: 'Remover',
      danger: true,
    });
    if (!ok) {
      return;
    }
    setListError(null);
    try {
      await api.delete(`/imoveis/${id}`);
      invalidarDadosDoNegocio(queryClient);
    } catch (err) {
      setListError(getApiErrorMessage(err, 'Não foi possível remover o imóvel.'));
    }
  }

  async function handleDeleteKitnet(id: number) {
    const ok = await confirm({
      title: 'Remover unidade',
      message: 'Remover esta unidade? Moradores e pagamentos vinculados também serão removidos.',
      confirmLabel: 'Remover',
      danger: true,
    });
    if (!ok) {
      return;
    }
    setListError(null);
    try {
      await api.delete(`/kitnets/${id}`);
      invalidarDadosDoNegocio(queryClient);
    } catch (err) {
      setListError(getApiErrorMessage(err, 'Não foi possível remover a unidade.'));
    }
  }

  function openLoteModal(imovel: Imovel) {
    setLoteImovelId(imovel.id);
    setLoteQuantidade('1');
    setLotePrefixo('');
    setLoteLinhas(null);
    setLoteValorPadrao('');
    setLoteError(null);
  }

  function gerarLinhas(imovel: Imovel) {
    const quantidade = Math.max(1, Math.min(50, Number(loteQuantidade) || 1));
    const existentes = imovel.kitnets.length;
    setLoteLinhas(
      Array.from({ length: quantidade }, (_, index) => ({
        numero: `${lotePrefixo}${String(existentes + index + 1).padStart(2, '0')}`,
        valor: '',
      })),
    );
    setLoteError(null);
  }

  function atualizarLinha(index: number, campo: 'numero' | 'valor', valor: string) {
    setLoteLinhas((linhas) =>
      linhas ? linhas.map((linha, i) => (i === index ? { ...linha, [campo]: valor } : linha)) : linhas,
    );
  }

  function aplicarValorPadrao() {
    setLoteLinhas((linhas) => (linhas ? linhas.map((linha) => ({ ...linha, valor: loteValorPadrao })) : linhas));
  }

  async function handleCreateLote(event: FormEvent) {
    event.preventDefault();
    if (loteImovelId === null || !loteLinhas) {
      return;
    }
    setLoteError(null);

    const unidades = loteLinhas.map((linha) => ({ numero: linha.numero.trim(), valor: Number(linha.valor) }));
    if (unidades.some((unidade) => !unidade.numero || Number.isNaN(unidade.valor) || unidade.valor < 0)) {
      setLoteError('Preencha o número e o valor de cada unidade.');
      return;
    }

    setIsLoteSubmitting(true);
    try {
      await api.post(`/imoveis/${loteImovelId}/unidades-lote`, { unidades });
      setLoteImovelId(null);
      invalidarDadosDoNegocio(queryClient);
    } catch (err) {
      setLoteError(getApiErrorMessage(err, 'Não foi possível criar as unidades.'));
    } finally {
      setIsLoteSubmitting(false);
    }
  }

  const loteImovel = imoveis.find((imovel) => imovel.id === loteImovelId) ?? null;

  return (
    <div>
      <Header
        title="Imóveis"
        subtitle="Agrupe suas casas, apartamentos e kitnets. Cada imóvel pode ter uma ou várias unidades."
        action={
          !isViewer && (
            <button type="button" className="btn btn-primary" onClick={openCreateModal}>
              + Novo imóvel
            </button>
          )
        }
      />

      <ErrorBanner message={displayedError} />

      {isLoading ? (
        <Card>
          <TableSkeleton />
        </Card>
      ) : imoveis.length === 0 ? (
        <Card>
          <p className="table-empty">Nenhum imóvel cadastrado ainda. Crie o primeiro para começar a organizar suas unidades.</p>
        </Card>
      ) : (
        <div className="imoveis-list">
          {imoveis.map((imovel) => {
            const aberto = expandidos.has(imovel.id);
            const totalValor = imovel.kitnets.reduce((total, kitnet) => total + kitnet.valor, 0);
            const totalMoradores = imovel.kitnets.reduce((total, kitnet) => total + kitnet.moradores.length, 0);

            return (
              <ExpandableGroupCard
                key={imovel.id}
                isOpen={aberto}
                onToggle={() => toggleExpandido(imovel.id)}
                title={imovel.nome}
                subtitle={imovel.endereco}
                stats={
                  <>
                    <span className="imovel-card-stat">
                      {imovel.kitnets.length} unidade{imovel.kitnets.length === 1 ? '' : 's'}
                    </span>
                    <span className="imovel-card-stat">
                      {totalMoradores} morador{totalMoradores === 1 ? '' : 'es'}
                    </span>
                    <span className="imovel-card-stat imovel-card-stat-valor">{formatCurrency(totalValor)}</span>
                  </>
                }
              >
                {!isViewer && (
                  <div className="imovel-card-edit" ref={menuImovelId === imovel.id ? menuRef : undefined}>
                    <button
                      type="button"
                      className="imovel-card-edit-trigger"
                      aria-label={`Editar ${imovel.nome}`}
                      aria-haspopup="menu"
                      aria-expanded={menuImovelId === imovel.id}
                      onClick={() => setMenuImovelId((atual) => (atual === imovel.id ? null : imovel.id))}
                    >
                      <PencilIcon />
                    </button>

                    {menuImovelId === imovel.id && (
                      <div className="imovel-card-edit-menu" role="menu">
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setMenuImovelId(null);
                            openEditImovelModal(imovel);
                          }}
                        >
                          Editar imóvel
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setMenuImovelId(null);
                            openLoteModal(imovel);
                          }}
                        >
                          + Adicionar unidades
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          className="imovel-card-edit-menu-danger"
                          onClick={() => {
                            setMenuImovelId(null);
                            handleDeleteImovel(imovel.id);
                          }}
                        >
                          Remover imóvel
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <Table
                  rows={imovel.kitnets}
                  rowKey={(row) => row.id}
                  emptyMessage="Nenhuma unidade neste imóvel ainda. Use “+ Unidades” para cadastrar."
                  onRowClick={(row) => setSelectedKitnetId(row.id)}
                  columns={[
                    { header: 'Unidade', render: (row) => row.numero },
                    {
                      header: 'Valor',
                      render: (row) =>
                        row.taxaImobiliaria ? (
                          <span className="imovel-valor-com-imobiliaria">
                            {formatCurrency(row.valor)}
                            <small>líq. {formatCurrency(row.valor - row.taxaImobiliaria)}</small>
                          </span>
                        ) : (
                          formatCurrency(row.valor)
                        ),
                    },
                    { header: 'Status', render: (row) => <StatusBadge label={row.status} /> },
                    { header: 'Moradores', render: (row) => row.moradores.length },
                    ...(isViewer
                      ? []
                      : [
                          {
                            header: '',
                            align: 'right' as const,
                            render: (row: Kitnet) => (
                              <div className="table-row-actions">
                                <button
                                  type="button"
                                  className="btn btn-ghost"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openEditKitnetModal(row);
                                  }}
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-danger"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleDeleteKitnet(row.id);
                                  }}
                                >
                                  Remover
                                </button>
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

      {selectedKitnetId && (
        <KitnetDetailModal kitnetId={selectedKitnetId} onClose={() => setSelectedKitnetId(null)} />
      )}

      {isCreateOpen && (
        <Modal title={editingImovelId !== null ? 'Editar imóvel' : 'Novo imóvel'} onClose={() => setIsCreateOpen(false)}>
          <form onSubmit={handleCreate} className="field-group">
            <ErrorBanner message={createError} />
            <div className="field">
              <label htmlFor="nome">Nome</label>
              <input
                id="nome"
                required
                placeholder="Ex.: Casa da Rua X ou Kitnet Central"
                value={nome}
                onChange={(event) => setNome(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="endereco">Endereço (opcional)</label>
              <input id="endereco" value={endereco} onChange={(event) => setEndereco(event.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </button>
          </form>
        </Modal>
      )}

      {loteImovel && (
        <Modal title={`Adicionar unidades · ${loteImovel.nome}`} onClose={() => setLoteImovelId(null)} className="modal-wide">
          <form onSubmit={handleCreateLote} className="field-group">
            <ErrorBanner message={loteError} />
            <p className="imovel-lote-hint">
              Use quantidade 1 para uma casa/unidade única, ou mais para cadastrar de uma vez os quartos de uma
              kitnet — cada unidade pode ter um valor de aluguel diferente.
            </p>

            <div className="imovel-lote-config">
              <div className="field">
                <label htmlFor="quantidade">Quantidade</label>
                <input
                  id="quantidade"
                  type="number"
                  min={1}
                  max={50}
                  value={loteQuantidade}
                  onChange={(event) => setLoteQuantidade(event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="lotePrefixo">Prefixo (opcional)</label>
                <input
                  id="lotePrefixo"
                  placeholder="Ex.: Quarto "
                  value={lotePrefixo}
                  onChange={(event) => setLotePrefixo(event.target.value)}
                />
              </div>
              <button type="button" className="btn btn-ghost" onClick={() => gerarLinhas(loteImovel)}>
                Gerar campos
              </button>
            </div>

            {loteLinhas && (
              <>
                <div className="imovel-lote-valor-padrao">
                  <div className="field">
                    <label htmlFor="loteValorPadrao">Valor padrão (opcional)</label>
                    <CurrencyInput id="loteValorPadrao" value={loteValorPadrao} onChange={setLoteValorPadrao} />
                  </div>
                  <button type="button" className="btn btn-ghost" onClick={aplicarValorPadrao}>
                    Aplicar a todas
                  </button>
                </div>

                <div className="imovel-lote-linhas">
                  {loteLinhas.map((linha, index) => (
                    <div className="imovel-lote-linha" key={index}>
                      <input
                        aria-label={`Número da unidade ${index + 1}`}
                        required
                        value={linha.numero}
                        onChange={(event) => atualizarLinha(index, 'numero', event.target.value)}
                      />
                      <CurrencyInput
                        ariaLabel={`Valor da unidade ${index + 1}`}
                        required
                        placeholder="Valor"
                        value={linha.valor}
                        onChange={(value) => atualizarLinha(index, 'valor', value)}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            <button type="submit" className="btn btn-primary" disabled={isLoteSubmitting || !loteLinhas}>
              {isLoteSubmitting ? 'Salvando...' : 'Salvar'}
            </button>
          </form>
        </Modal>
      )}

      {editingKitnet && (
        <Modal title={`Editar unidade · ${editingKitnet.numero}`} onClose={() => setEditingKitnet(null)}>
          <form onSubmit={handleEditKitnet} className="field-group">
            <ErrorBanner message={editKitnetError} />
            <div className="field">
              <label htmlFor="editNumero">Número</label>
              <input id="editNumero" required value={editNumero} onChange={(event) => setEditNumero(event.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="editValor">Valor do aluguel</label>
              <CurrencyInput id="editValor" required value={editValor} onChange={setEditValor} />
            </div>
            <div className="field">
              <label htmlFor="editTaxaImobiliaria">Taxa da imobiliária (opcional)</label>
              <CurrencyInput
                id="editTaxaImobiliaria"
                placeholder="Ex.: R$ 100 — deixe em branco se o aluguel é direto"
                value={editTaxaImobiliaria}
                onChange={setEditTaxaImobiliaria}
              />
              <p className="field-static-hint">
                Preencha só se essa unidade é alugada por uma imobiliária que retém parte
                do aluguel. Ex.: aluguel de R$ 1.400, taxa de R$ 100 → você recebe
                R$ 1.300.
              </p>
            </div>
            <button type="submit" className="btn btn-primary" disabled={isEditKitnetSubmitting}>
              {isEditKitnetSubmitting ? 'Salvando...' : 'Salvar'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
