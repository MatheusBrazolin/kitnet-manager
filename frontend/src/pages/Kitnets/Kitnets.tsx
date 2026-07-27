import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, getApiErrorMessage } from '../../services/api';
import type { Kitnet } from '../../types';
import { Card } from '../../components/Card/Card';
import { Table } from '../../components/Table/Table';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal/Modal';
import { Header } from '../../components/Header/Header';
import { KitnetDetailModal } from '../../components/KitnetDetailModal/KitnetDetailModal';

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function Kitnets() {
  const queryClient = useQueryClient();
  const {
    data: kitnets = [],
    error: queryError,
  } = useQuery({
    queryKey: ['kitnets'],
    queryFn: () => api.get<Kitnet[]>('/kitnets').then((response) => response.data),
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [numero, setNumero] = useState('');
  const [valor, setValor] = useState('');
  const [selectedKitnetId, setSelectedKitnetId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const displayedError = listError ?? (queryError ? getApiErrorMessage(queryError, 'Não foi possível carregar as kitnets.') : null);

  function openModal() {
    setNumero('');
    setValor('');
    setError(null);
    setIsModalOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post('/kitnets', { numero, valor: Number(valor) });
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['kitnets'] });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Não foi possível criar a kitnet.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Remover esta kitnet? Todos os moradores e pagamentos vinculados também serão removidos.')) {
      return;
    }
    setListError(null);
    try {
      await api.delete(`/kitnets/${id}`);
      queryClient.invalidateQueries({ queryKey: ['kitnets'] });
    } catch (err) {
      setListError(getApiErrorMessage(err, 'Não foi possível remover a kitnet.'));
    }
  }

  return (
    <div>
      <Header
        title="Kitnets"
        subtitle="Gerencie os imóveis cadastrados."
        action={
          <button type="button" className="btn btn-primary" onClick={openModal}>
            + Nova kitnet
          </button>
        }
      />

      {displayedError && <p className="form-error">{displayedError}</p>}

      <Card>
        <Table
          rows={kitnets}
          rowKey={(row) => row.id}
          emptyMessage="Nenhuma kitnet cadastrada ainda."
          onRowClick={(row) => setSelectedKitnetId(row.id)}
          columns={[
            { header: 'Número', render: (row) => row.numero },
            { header: 'Valor', render: (row) => currencyFormatter.format(row.valor) },
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
      </Card>

      {selectedKitnetId && (
        <KitnetDetailModal kitnetId={selectedKitnetId} onClose={() => setSelectedKitnetId(null)} />
      )}

      {isModalOpen && (
        <Modal title="Nova kitnet" onClose={() => setIsModalOpen(false)}>
          <form onSubmit={handleSubmit} className="field-group">
            {error && <p className="form-error">{error}</p>}
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
