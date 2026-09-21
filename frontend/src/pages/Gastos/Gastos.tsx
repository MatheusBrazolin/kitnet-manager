import { useEffect, useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, getApiErrorMessage } from '../../services/api';
import { firstErrorMessage } from '../../utils/queryError';
import type { Gasto, Kitnet, PaginatedResponse } from '../../types';
import { Card } from '../../components/Card/Card';
import { Table } from '../../components/Table/Table';
import { TableSkeleton } from '../../components/Table/TableSkeleton';
import { Pagination } from '../../components/Pagination/Pagination';
import { ErrorBanner } from '../../components/ErrorBanner/ErrorBanner';
import { Modal } from '../../components/Modal/Modal';
import { Header } from '../../components/Header/Header';
import { UnitPicker } from '../../components/UnitPicker/UnitPicker';
import { CurrencyInput } from '../../components/CurrencyInput';
import { useConfirm } from '../../components/ConfirmDialog/ConfirmProvider';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/dates';
import { invalidarDadosDoNegocio } from '../../services/invalidate';
import { formatUnidadeLabel } from '../../utils/unidade';

const PAGE_SIZE = 20;

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function Gastos() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { user } = useAuth();
  const isViewer = user?.papel === 'VISUALIZADOR';
  const [page, setPage] = useState(1);
  const {
    data: gastosPage,
    error: gastosQueryError,
    isLoading,
  } = useQuery({
    queryKey: ['gastos', page, PAGE_SIZE],
    queryFn: () =>
      api
        .get<PaginatedResponse<Gasto>>('/gastos', { params: { page, limit: PAGE_SIZE } })
        .then((response) => response.data),
    placeholderData: (previous) => previous,
  });
  const gastos = gastosPage?.data ?? [];

  useEffect(() => {
    if (gastosPage && page > gastosPage.totalPages) {
      setPage(gastosPage.totalPages);
    }
  }, [gastosPage, page]);

  const {
    data: kitnets = [],
    error: kitnetsQueryError,
    isLoading: isLoadingKitnets,
  } = useQuery({
    queryKey: ['kitnets'],
    queryFn: () => api.get<Kitnet[]>('/kitnets').then((response) => response.data),
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [data, setData] = useState(todayIsoDate());
  const [kitnetId, setKitnetId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const displayedError =
    listError ??
    firstErrorMessage(
      { error: gastosQueryError, fallback: 'Não foi possível carregar os gastos.' },
      { error: kitnetsQueryError, fallback: 'Não foi possível carregar as unidades.' },
    );

  function openModal() {
    setEditingId(null);
    setDescricao('');
    setValor('');
    setData(todayIsoDate());
    setKitnetId(kitnets[0]?.id ?? null);
    setError(null);
    setIsModalOpen(true);
  }

  function openEditModal(gasto: Gasto) {
    setEditingId(gasto.id);
    setDescricao(gasto.descricao);
    setValor(String(gasto.valor));
    setData(gasto.data.slice(0, 10));
    setKitnetId(gasto.kitnetId);
    setError(null);
    setIsModalOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (editingId === null && kitnetId === null) {
      setError('Selecione uma unidade.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      if (editingId !== null) {
        await api.patch(`/gastos/${editingId}`, { descricao, valor: Number(valor), data });
      } else {
        await api.post('/gastos', { descricao, valor: Number(valor), data, kitnetId });
      }
      setIsModalOpen(false);
      invalidarDadosDoNegocio(queryClient);
    } catch (err) {
      setError(getApiErrorMessage(err, `Não foi possível ${editingId !== null ? 'atualizar' : 'lançar'} o gasto.`));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    const ok = await confirm({
      title: 'Remover gasto',
      message: 'Remover este gasto? Essa ação não pode ser desfeita.',
      confirmLabel: 'Remover',
      danger: true,
    });
    if (!ok) {
      return;
    }
    setListError(null);
    try {
      await api.delete(`/gastos/${id}`);
      invalidarDadosDoNegocio(queryClient);
    } catch (err) {
      setListError(getApiErrorMessage(err, 'Não foi possível remover o gasto.'));
    }
  }

  return (
    <div>
      <Header
        title="Gastos"
        subtitle="Manutenção, reparos e outras despesas por unidade."
        action={
          !isViewer && (
            <button type="button" className="btn btn-primary" onClick={openModal} disabled={kitnets.length === 0}>
              + Novo gasto
            </button>
          )
        }
      />

      {!isLoadingKitnets && kitnets.length === 0 && (
        <p className="form-error">Cadastre um imóvel e uma unidade antes de lançar gastos.</p>
      )}
      <ErrorBanner message={displayedError} />

      <Card>
        {isLoading ? (
          <TableSkeleton />
        ) : (
        <Table
          rows={gastos}
          rowKey={(row) => row.id}
          emptyMessage="Nenhum gasto lançado ainda."
          columns={[
            { header: 'Descrição', render: (row) => row.descricao },
            {
              header: 'Unidade',
              render: (row) => formatUnidadeLabel(row.kitnet),
            },
            { header: 'Data', render: (row) => formatDate(row.data) },
            { header: 'Valor', align: 'right', render: (row) => formatCurrency(row.valor) },
            ...(isViewer
              ? []
              : [
                  {
                    header: '',
                    align: 'right' as const,
                    render: (row: Gasto) => (
                      <div className="table-row-actions">
                        <button type="button" className="btn btn-ghost" onClick={() => openEditModal(row)}>
                          Editar
                        </button>
                        <button type="button" className="btn btn-danger" onClick={() => handleDelete(row.id)}>
                          Remover
                        </button>
                      </div>
                    ),
                  },
                ]),
          ]}
        />
        )}
        {gastosPage && (
          <Pagination
            page={gastosPage.page}
            totalPages={gastosPage.totalPages}
            total={gastosPage.total}
            onPageChange={setPage}
          />
        )}
      </Card>

      {isModalOpen && (
        <Modal title={editingId !== null ? 'Editar gasto' : 'Novo gasto'} onClose={() => setIsModalOpen(false)}>
          <form onSubmit={handleSubmit} className="field-group">
            <ErrorBanner message={error} />
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
              <label htmlFor="kitnetId">Unidade</label>
              {editingId !== null ? (
                <p className="field-static-hint">
                  Não é possível trocar a unidade de um gasto já lançado — remova e lance de novo se precisar mudá-lo.
                </p>
              ) : (
                <UnitPicker id="kitnetId" kitnets={kitnets} value={kitnetId} onChange={setKitnetId} />
              )}
            </div>
            <div className="field">
              <label htmlFor="valor">Valor</label>
              <CurrencyInput id="valor" required value={valor} onChange={setValor} />
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
