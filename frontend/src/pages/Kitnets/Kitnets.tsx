import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, getApiErrorMessage } from '../../services/api';
import type { Imovel, Kitnet } from '../../types';
import { Card } from '../../components/Card/Card';
import { Table } from '../../components/Table/Table';
import { TableSkeleton } from '../../components/Table/TableSkeleton';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal/Modal';
import { Header } from '../../components/Header/Header';
import { KitnetDetailModal } from '../../components/KitnetDetailModal/KitnetDetailModal';
import { formatCurrency } from '../../utils/currency';

export function Kitnets() {
  const queryClient = useQueryClient();
  const {
    data: kitnets = [],
    error: queryError,
    isLoading,
  } = useQuery({
    queryKey: ['kitnets'],
    queryFn: () => api.get<Kitnet[]>('/kitnets').then((response) => response.data),
  });
  const { data: imoveis = [], error: imoveisQueryError } = useQuery({
    queryKey: ['imoveis'],
    queryFn: () => api.get<Imovel[]>('/imoveis').then((response) => response.data),
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [numero, setNumero] = useState('');
  const [valor, setValor] = useState('');
  const [imovelId, setImovelId] = useState('');
  const [selectedKitnetId, setSelectedKitnetId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const displayedError =
    listError ??
    (queryError
      ? getApiErrorMessage(queryError, 'Não foi possível carregar as unidades.')
      : imoveisQueryError
        ? getApiErrorMessage(imoveisQueryError, 'Não foi possível carregar os imóveis.')
        : null);

  function openModal() {
    setNumero('');
    setValor('');
    setImovelId(imoveis[0] ? String(imoveis[0].id) : '');
    setError(null);
    setIsModalOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post('/kitnets', { numero, valor: Number(valor), imovelId: Number(imovelId) });
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['kitnets'] });
      queryClient.invalidateQueries({ queryKey: ['imoveis'] });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Não foi possível criar a unidade.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Remover esta unidade? Todos os moradores e pagamentos vinculados também serão removidos.')) {
      return;
    }
    setListError(null);
    try {
      await api.delete(`/kitnets/${id}`);
      queryClient.invalidateQueries({ queryKey: ['kitnets'] });
      queryClient.invalidateQueries({ queryKey: ['imoveis'] });
    } catch (err) {
      setListError(getApiErrorMessage(err, 'Não foi possível remover a unidade.'));
    }
  }

  return (
    <div>
      <Header
        title="Unidades"
        subtitle="Todas as unidades de todos os seus imóveis, em uma lista só."
        action={
          <button type="button" className="btn btn-primary" onClick={openModal} disabled={imoveis.length === 0}>
            + Nova unidade
          </button>
        }
      />

      {imoveis.length === 0 && <p className="form-error">Cadastre um imóvel antes de adicionar unidades.</p>}
      {displayedError && <p className="form-error">{displayedError}</p>}

      <Card>
        {isLoading ? (
          <TableSkeleton />
        ) : (
        <Table
          rows={kitnets}
          rowKey={(row) => row.id}
          emptyMessage="Nenhuma unidade cadastrada ainda."
          onRowClick={(row) => setSelectedKitnetId(row.id)}
          columns={[
            { header: 'Imóvel', render: (row) => row.imovel?.nome ?? '—' },
            { header: 'Número', render: (row) => row.numero },
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
                    handleDelete(row.id);
                  }}
                >
                  Remover
                </button>
              ),
            },
          ]}
        />
        )}
      </Card>

      {selectedKitnetId && (
        <KitnetDetailModal kitnetId={selectedKitnetId} onClose={() => setSelectedKitnetId(null)} />
      )}

      {isModalOpen && (
        <Modal title="Nova unidade" onClose={() => setIsModalOpen(false)}>
          <form onSubmit={handleSubmit} className="field-group">
            {error && <p className="form-error">{error}</p>}
            <div className="field">
              <label htmlFor="imovelId">Imóvel</label>
              <select id="imovelId" value={imovelId} onChange={(event) => setImovelId(event.target.value)}>
                {imoveis.map((imovel) => (
                  <option key={imovel.id} value={imovel.id}>
                    {imovel.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="numero">Número</label>
              <input id="numero" required value={numero} onChange={(event) => setNumero(event.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="valor">Valor do aluguel</label>
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
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
