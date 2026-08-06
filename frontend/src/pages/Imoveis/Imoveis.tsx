import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, getApiErrorMessage } from '../../services/api';
import type { Imovel } from '../../types';
import { Card } from '../../components/Card/Card';
import { Table } from '../../components/Table/Table';
import { TableSkeleton } from '../../components/Table/TableSkeleton';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal/Modal';
import { Header } from '../../components/Header/Header';
import { KitnetDetailModal } from '../../components/KitnetDetailModal/KitnetDetailModal';
import { PencilIcon } from '../../components/icons';
import { formatCurrency } from '../../utils/currency';
import './imoveis.css';

export function Imoveis() {
  const queryClient = useQueryClient();
  const {
    data: imoveis = [],
    error: queryError,
    isLoading,
  } = useQuery({
    queryKey: ['imoveis'],
    queryFn: () => api.get<Imovel[]>('/imoveis').then((response) => response.data),
  });

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [endereco, setEndereco] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [loteImovelId, setLoteImovelId] = useState<number | null>(null);
  const [loteQuantidade, setLoteQuantidade] = useState('1');
  const [lotePrefixo, setLotePrefixo] = useState('');
  const [loteLinhas, setLoteLinhas] = useState<Array<{ numero: string; valor: string }> | null>(null);
  const [loteValorPadrao, setLoteValorPadrao] = useState('');
  const [loteError, setLoteError] = useState<string | null>(null);
  const [isLoteSubmitting, setIsLoteSubmitting] = useState(false);

  const [selectedKitnetId, setSelectedKitnetId] = useState<number | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [expandidos, setExpandidos] = useState<Set<number>>(new Set());
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

  const displayedError = listError ?? (queryError ? getApiErrorMessage(queryError, 'Não foi possível carregar os imóveis.') : null);

  function openCreateModal() {
    setNome('');
    setEndereco('');
    setCreateError(null);
    setIsCreateOpen(true);
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setCreateError(null);
    setIsSubmitting(true);
    try {
      await api.post('/imoveis', { nome, endereco: endereco || undefined });
      setIsCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['imoveis'] });
    } catch (err) {
      setCreateError(getApiErrorMessage(err, 'Não foi possível criar o imóvel.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteImovel(id: number) {
    if (!confirm('Remover este imóvel?')) {
      return;
    }
    setListError(null);
    try {
      await api.delete(`/imoveis/${id}`);
      queryClient.invalidateQueries({ queryKey: ['imoveis'] });
    } catch (err) {
      setListError(getApiErrorMessage(err, 'Não foi possível remover o imóvel.'));
    }
  }

  async function handleDeleteKitnet(id: number) {
    if (!confirm('Remover esta unidade? Moradores e pagamentos vinculados também serão removidos.')) {
      return;
    }
    setListError(null);
    try {
      await api.delete(`/kitnets/${id}`);
      queryClient.invalidateQueries({ queryKey: ['imoveis'] });
      queryClient.invalidateQueries({ queryKey: ['kitnets'] });
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
      queryClient.invalidateQueries({ queryKey: ['imoveis'] });
      queryClient.invalidateQueries({ queryKey: ['kitnets'] });
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
          <button type="button" className="btn btn-primary" onClick={openCreateModal}>
            + Novo imóvel
          </button>
        }
      />

      {displayedError && <p className="form-error">{displayedError}</p>}

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
              <section className="imovel-card" key={imovel.id}>
                <button
                  type="button"
                  className="imovel-card-summary-row"
                  onClick={() => toggleExpandido(imovel.id)}
                  aria-expanded={aberto}
                >
                  <div className="imovel-card-summary-main">
                    <span className={`imovel-card-chevron${aberto ? ' imovel-card-chevron-open' : ''}`} aria-hidden="true">
                      ▾
                    </span>
                    <div className="imovel-card-summary-title">
                      <span className="imovel-card-nome">{imovel.nome}</span>
                      {imovel.endereco && <span className="imovel-card-endereco">{imovel.endereco}</span>}
                    </div>
                  </div>
                  <div className="imovel-card-summary-stats">
                    <span className="imovel-card-stat">
                      {imovel.kitnets.length} unidade{imovel.kitnets.length === 1 ? '' : 's'}
                    </span>
                    <span className="imovel-card-stat">
                      {totalMoradores} morador{totalMoradores === 1 ? '' : 'es'}
                    </span>
                    <span className="imovel-card-stat imovel-card-stat-valor">{formatCurrency(totalValor)}</span>
                  </div>
                </button>

                {aberto && (
                  <div className="imovel-card-body">
                    <div
                      className="imovel-card-edit"
                      ref={menuImovelId === imovel.id ? menuRef : undefined}
                    >
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

                    <Table
                      rows={imovel.kitnets}
                      rowKey={(row) => row.id}
                      emptyMessage="Nenhuma unidade neste imóvel ainda. Use “+ Unidades” para cadastrar."
                      onRowClick={(row) => setSelectedKitnetId(row.id)}
                      columns={[
                        { header: 'Unidade', render: (row) => row.numero },
                        { header: 'Valor', render: (row) => formatCurrency(row.valor) },
                        { header: 'Status', render: (row) => <StatusBadge label={row.status} /> },
                        { header: 'Moradores', render: (row) => row.moradores.length },
                        {
                          header: '',
                          align: 'right',
                          render: (row) => (
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
                          ),
                        },
                      ]}
                    />
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {selectedKitnetId && (
        <KitnetDetailModal kitnetId={selectedKitnetId} onClose={() => setSelectedKitnetId(null)} />
      )}

      {isCreateOpen && (
        <Modal title="Novo imóvel" onClose={() => setIsCreateOpen(false)}>
          <form onSubmit={handleCreate} className="field-group">
            {createError && <p className="form-error">{createError}</p>}
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
            {loteError && <p className="form-error">{loteError}</p>}
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
                    <input
                      id="loteValorPadrao"
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="Ex.: 650"
                      value={loteValorPadrao}
                      onChange={(event) => setLoteValorPadrao(event.target.value)}
                    />
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
                      <input
                        aria-label={`Valor da unidade ${index + 1}`}
                        type="number"
                        min={0}
                        step="0.01"
                        required
                        placeholder="Valor"
                        value={linha.valor}
                        onChange={(event) => atualizarLinha(index, 'valor', event.target.value)}
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
    </div>
  );
}
