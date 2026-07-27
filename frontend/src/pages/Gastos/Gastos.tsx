import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, getApiErrorMessage } from '../../services/api';
import type { Gasto, Kitnet } from '../../types';
import { Card } from '../../components/Card/Card';
import { Table } from '../../components/Table/Table';
import { Modal } from '../../components/Modal/Modal';
import { Header } from '../../components/Header/Header';

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
});

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function Gastos() {
  const queryClient = useQueryClient();
  const { data: gastos = [], error: gastosQueryError } = useQuery({
    queryKey: ['gastos'],
    queryFn: () => api.get<Gasto[]>('/gastos').then((response) => response.data),
  });
  const { data: kitnets = [], error: kitnetsQueryError } = useQuery({
    queryKey: ['kitnets'],
    queryFn: () => api.get<Kitnet[]>('/kitnets').then((response) => response.data),
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [data, setData] = useState(todayIsoDate());
  const [kitnetId, setKitnetId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const displayedError =
    listError ??
    (gastosQueryError
      ? getApiErrorMessage(gastosQueryError, 'Não foi possível carregar os gastos.')
      : kitnetsQueryError
        ? getApiErrorMessage(kitnetsQueryError, 'Não foi possível carregar as kitnets.')
        : null);

  function openModal() {
    setDescricao('');
    setValor('');
    setData(todayIsoDate());
    setKitnetId(kitnets[0] ? String(kitnets[0].id) : '');
    setError(null);
    setIsModalOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post('/gastos', { descricao, valor: Number(valor), data, kitnetId: Number(kitnetId) });
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['gastos'] });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Não foi possível lançar o gasto.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Remover este gasto?')) {
      return;
    }
    setListError(null);
    try {
      await api.delete(`/gastos/${id}`);
      queryClient.invalidateQueries({ queryKey: ['gastos'] });
    } catch (err) {
      setListError(getApiErrorMessage(err, 'Não foi possível remover o gasto.'));
    }
  }

  return (
    <div>
      <Header
        title="Gastos"
        subtitle="Manutenção, reparos e outras despesas por kitnet."
        action={
          <button type="button" className="btn btn-primary" onClick={openModal} disabled={kitnets.length === 0}>
            + Novo gasto
          </button>
        }
      />

      {kitnets.length === 0 && <p className="form-error">Cadastre uma kitnet antes de lançar gastos.</p>}
      {displayedError && <p className="form-error">{displayedError}</p>}

      <Card>
        <Table
          rows={gastos}
          rowKey={(row) => row.id}
          emptyMessage="Nenhum gasto lançado ainda."
          columns={[
            { header: 'Descrição', render: (row) => row.descricao },
            { header: 'Kitnet', render: (row) => row.kitnet.numero },
            { header: 'Data', render: (row) => dateFormatter.format(new Date(row.data)) },
            { header: 'Valor', align: 'right', render: (row) => currencyFormatter.format(row.valor) },
            {
              header: '',
              align: 'right',
              render: (row) => (
                <button type="button" className="btn btn-danger" onClick={() => handleDelete(row.id)}>
                  Remover
                </button>
              ),
            },
          ]}
        />
      </Card>

      {isModalOpen && (
        <Modal title="Novo gasto" onClose={() => setIsModalOpen(false)}>
          <form onSubmit={handleSubmit} className="field-group">
            {error && <p className="form-error">{error}</p>}
            <div className="field">
              <label htmlFor="descricao">Descrição</label>
              <input
                id="descricao"
                required
                value={descricao}
                onChange={(event) => setDescricao(event.target.value)}
                placeholder="Ex: Troca de torneira"
              />
            </div>
            <div className="field">
              <label htmlFor="kitnetId">Kitnet</label>
              <select id="kitnetId" value={kitnetId} onChange={(event) => setKitnetId(event.target.value)}>
                {kitnets.map((kitnet) => (
                  <option key={kitnet.id} value={kitnet.id}>
                    Kitnet {kitnet.numero}
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
              <label htmlFor="data">Data</label>
              <input id="data" type="date" required value={data} onChange={(event) => setData(event.target.value)} />
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
