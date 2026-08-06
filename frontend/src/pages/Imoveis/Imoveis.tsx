import { useState, type FormEvent } from 'react';
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
  const [loteValor, setLoteValor] = useState('');
  const [lotePrefixo, setLotePrefixo] = useState('');
  const [loteError, setLoteError] = useState<string | null>(null);
  const [isLoteSubmitting, setIsLoteSubmitting] = useState(false);

  const [selectedKitnetId, setSelectedKitnetId] = useState<number | null>(null);
  const [listError, setListError] = useState<string | null>(null);

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
    setLoteValor('');
    setLotePrefixo('');
    setLoteError(null);
  }

  async function handleCreateLote(event: FormEvent) {
    event.preventDefault();
    if (loteImovelId === null) {
      return;
    }
    setLoteError(null);
    setIsLoteSubmitting(true);
    try {
      await api.post(`/imoveis/${loteImovelId}/unidades-lote`, {
        quantidade: Number(loteQuantidade),
        valor: Number(loteValor),
        prefixo: lotePrefixo || undefined,
      });
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
          {imoveis.map((imovel) => (
            <Card
              key={imovel.id}
              title={imovel.nome}
              action={
                <div className="imovel-card-actions">
                  <span className="imovel-card-endereco">{imovel.endereco}</span>
                  <button type="button" className="btn btn-ghost" onClick={() => openLoteModal(imovel)}>
                    + Unidades
                  </button>
                  <button type="button" className="btn btn-danger" onClick={() => handleDeleteImovel(imovel.id)}>
                    Remover
                  </button>
                </div>
              }
            >
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
            </Card>
          ))}
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
        <Modal title={`Adicionar unidades · ${loteImovel.nome}`} onClose={() => setLoteImovelId(null)}>
          <form onSubmit={handleCreateLote} className="field-group">
            {loteError && <p className="form-error">{loteError}</p>}
            <p className="imovel-lote-hint">
              Use quantidade 1 para uma casa/unidade única, ou mais para cadastrar de uma vez todos os quartos de
              uma kitnet (ex.: 10 unidades numeradas automaticamente).
            </p>
            <div className="field">
              <label htmlFor="quantidade">Quantidade de unidades</label>
              <input
                id="quantidade"
                type="number"
                min={1}
                max={50}
                required
                value={loteQuantidade}
                onChange={(event) => setLoteQuantidade(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="loteValor">Valor do aluguel (por unidade)</label>
              <input
                id="loteValor"
                type="number"
                min={0}
                step="0.01"
                required
                value={loteValor}
                onChange={(event) => setLoteValor(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="lotePrefixo">Prefixo do número (opcional)</label>
              <input
                id="lotePrefixo"
                placeholder="Ex.: Quarto "
                value={lotePrefixo}
                onChange={(event) => setLotePrefixo(event.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={isLoteSubmitting}>
              {isLoteSubmitting ? 'Salvando...' : 'Salvar'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
