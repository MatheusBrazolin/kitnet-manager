import { useEffect, useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, getApiErrorMessage } from '../../services/api';
import { firstErrorMessage } from '../../utils/queryError';
import type { Kitnet, Morador, PaginatedResponse } from '../../types';
import { Card } from '../../components/Card/Card';
import { Table } from '../../components/Table/Table';
import { TableSkeleton } from '../../components/Table/TableSkeleton';
import { Pagination } from '../../components/Pagination/Pagination';
import { ErrorBanner } from '../../components/ErrorBanner/ErrorBanner';
import { Modal } from '../../components/Modal/Modal';
import { Header } from '../../components/Header/Header';
import { MoradorDetailModal } from '../../components/MoradorDetailModal/MoradorDetailModal';
import { UnitPicker } from '../../components/UnitPicker/UnitPicker';
import { useConfirm } from '../../components/ConfirmDialog/ConfirmProvider';
import { useAuth } from '../../hooks/useAuth';

type MoradorRow = Morador & { kitnet: Kitnet };

const PAGE_SIZE = 20;

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function Moradores() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { user } = useAuth();
  const isViewer = user?.papel === 'VISUALIZADOR';
  const [page, setPage] = useState(1);
  const {
    data: moradoresPage,
    error: moradoresQueryError,
    isLoading,
  } = useQuery({
    queryKey: ['moradores', page, PAGE_SIZE],
    queryFn: () =>
      api
        .get<PaginatedResponse<MoradorRow>>('/moradores', { params: { page, limit: PAGE_SIZE } })
        .then((response) => response.data),
    placeholderData: (previous) => previous,
  });
  const moradores = moradoresPage?.data ?? [];

  // Se a página atual ficou "fora do range" (ex.: apagou o último morador da última
  // página), volta pra última página válida em vez de mostrar uma lista vazia confusa.
  useEffect(() => {
    if (moradoresPage && page > moradoresPage.totalPages) {
      setPage(moradoresPage.totalPages);
    }
  }, [moradoresPage, page]);

  const { data: kitnets = [], error: kitnetsQueryError } = useQuery({
    queryKey: ['kitnets'],
    queryFn: () => api.get<Kitnet[]>('/kitnets').then((response) => response.data),
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [kitnetId, setKitnetId] = useState<number | null>(null);
  const [dataEntrada, setDataEntrada] = useState(todayIsoDate());
  const [diaVencimento, setDiaVencimento] = useState('10');
  const [selectedMoradorId, setSelectedMoradorId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const displayedError =
    listError ??
    firstErrorMessage(
      { error: moradoresQueryError, fallback: 'Não foi possível carregar os moradores.' },
      { error: kitnetsQueryError, fallback: 'Não foi possível carregar as unidades.' },
    );

  function openModal() {
    setEditingId(null);
    setNome('');
    setTelefone('');
    setKitnetId(kitnets[0]?.id ?? null);
    setDataEntrada(todayIsoDate());
    setDiaVencimento('10');
    setError(null);
    setIsModalOpen(true);
  }

  function openEditModal(morador: MoradorRow) {
    setEditingId(morador.id);
    setNome(morador.nome);
    setTelefone(morador.telefone);
    setKitnetId(morador.kitnetId);
    setDataEntrada(morador.dataEntrada.slice(0, 10));
    setDiaVencimento(String(morador.diaVencimento));
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
        await api.patch(`/moradores/${editingId}`, {
          nome,
          telefone,
          dataEntrada,
          diaVencimento: Number(diaVencimento),
        });
      } else {
        await api.post('/moradores', {
          nome,
          telefone,
          kitnetId,
          dataEntrada,
          diaVencimento: Number(diaVencimento),
        });
      }
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['moradores'] });
      queryClient.invalidateQueries({ queryKey: ['kitnets'] });
    } catch (err) {
      setError(getApiErrorMessage(err, `Não foi possível ${editingId !== null ? 'atualizar' : 'cadastrar'} o morador.`));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    const ok = await confirm({
      title: 'Remover morador',
      message: 'Remover este morador? Essa ação não pode ser desfeita.',
      confirmLabel: 'Remover',
      danger: true,
    });
    if (!ok) {
      return;
    }
    setListError(null);
    try {
      await api.delete(`/moradores/${id}`);
      queryClient.invalidateQueries({ queryKey: ['moradores'] });
      queryClient.invalidateQueries({ queryKey: ['kitnets'] });
    } catch (err) {
      setListError(getApiErrorMessage(err, 'Não foi possível remover o morador.'));
    }
  }

  return (
    <div>
      <Header
        title="Moradores"
        subtitle="Quem está morando em cada unidade."
        action={
          !isViewer && (
            <button type="button" className="btn btn-primary" onClick={openModal} disabled={kitnets.length === 0}>
              + Novo morador
            </button>
          )
        }
      />

      {kitnets.length === 0 && <p className="form-error">Cadastre um imóvel e uma unidade antes de adicionar moradores.</p>}
      <ErrorBanner message={displayedError} />

      <Card>
        {isLoading ? (
          <TableSkeleton />
        ) : (
        <Table
          rows={moradores}
          rowKey={(row) => row.id}
          emptyMessage="Nenhum morador cadastrado ainda."
          onRowClick={(row) => setSelectedMoradorId(row.id)}
          columns={[
            { header: 'Nome', render: (row) => row.nome },
            { header: 'Telefone', render: (row) => row.telefone },
            {
              header: 'Unidade',
              render: (row) =>
                row.kitnet.imovel
                  ? `${row.kitnet.imovel.nome}${row.kitnet.imovel.kitnets?.length > 1 ? ` · ${row.kitnet.numero}` : ''}`
                  : row.kitnet.numero,
            },
            ...(isViewer
              ? []
              : [
                  {
                    header: '',
                    align: 'right' as const,
                    render: (row: MoradorRow) => (
                      <div className="table-row-actions">
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={(event) => {
                            event.stopPropagation();
                            openEditModal(row);
                          }}
                        >
                          Editar
                        </button>
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
                      </div>
                    ),
                  },
                ]),
          ]}
        />
        )}
        {moradoresPage && (
          <Pagination
            page={moradoresPage.page}
            totalPages={moradoresPage.totalPages}
            total={moradoresPage.total}
            onPageChange={setPage}
          />
        )}
      </Card>

      {selectedMoradorId && (
        <MoradorDetailModal moradorId={selectedMoradorId} onClose={() => setSelectedMoradorId(null)} />
      )}

      {isModalOpen && (
        <Modal title={editingId !== null ? 'Editar morador' : 'Novo morador'} onClose={() => setIsModalOpen(false)}>
          <form onSubmit={handleSubmit} className="field-group">
            <ErrorBanner message={error} />
            <div className="field">
              <label htmlFor="nome">Nome</label>
              <input id="nome" required value={nome} onChange={(event) => setNome(event.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="telefone">Telefone</label>
              <input
                id="telefone"
                required
                minLength={8}
                value={telefone}
                onChange={(event) => setTelefone(event.target.value)}
                placeholder="(11) 99999-0000"
              />
            </div>
            <div className="field">
              <label htmlFor="kitnetId">Unidade</label>
              {editingId !== null ? (
                <p className="field-static-hint">
                  Não é possível trocar a unidade de um morador já cadastrado — remova e cadastre de novo se precisar mudá-lo.
                </p>
              ) : (
                <UnitPicker id="kitnetId" kitnets={kitnets} value={kitnetId} onChange={setKitnetId} />
              )}
            </div>
            <div className="field">
              <label htmlFor="dataEntrada">Data de entrada</label>
              <input
                id="dataEntrada"
                type="date"
                required
                value={dataEntrada}
                onChange={(event) => setDataEntrada(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="diaVencimento">Dia de vencimento do aluguel</label>
              <input
                id="diaVencimento"
                type="number"
                min={1}
                max={31}
                required
                value={diaVencimento}
                onChange={(event) => setDiaVencimento(event.target.value)}
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
