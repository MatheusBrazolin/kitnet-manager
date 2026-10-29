import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
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
import { useConfirm } from '../../components/ConfirmDialog/confirm-context';
import { useAuth } from '../../hooks/useAuth';
import { invalidarDadosDoNegocio } from '../../services/invalidate';
import { formatUnidadeLabel, linkWhatsApp } from '../../utils/unidade';
import { StatusBadge } from '../../components/StatusBadge';
import './moradores.css';
import { hojeIsoLocal } from '../../utils/dates';
import { useToast } from '../../components/Toast/toast-context';

type MoradorRow = Morador & { kitnet: Kitnet };

const PAGE_SIZE = 20;

export function Moradores() {
  const queryClient = useQueryClient();
  const toast = useToast();
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
  const moradoresDaPagina = moradoresPage?.data ?? [];

  // Se a página atual ficou "fora do range" (ex.: apagou o último morador da última
  // página), volta pra última página válida em vez de mostrar uma lista vazia confusa.
  useEffect(() => {
    if (moradoresPage && page > moradoresPage.totalPages) {
      setPage(moradoresPage.totalPages);
    }
  }, [moradoresPage, page]);

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
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [kitnetId, setKitnetId] = useState<number | null>(null);
  const [dataEntrada, setDataEntrada] = useState(hojeIsoLocal());
  const [diaVencimento, setDiaVencimento] = useState('10');
  const [selectedMoradorId, setSelectedMoradorId] = useState<number | null>(null);
  const [busca, setBusca] = useState('');

  // Filtro local sobre a página carregada. Não existia busca nenhuma, e com 20 por
  // página achar um morador entre 40 obrigava a paginar até dar sorte.
  const buscaNormalizada = busca.trim().toLowerCase();
  const moradores = buscaNormalizada
    ? moradoresDaPagina.filter(
        (morador) =>
          morador.nome.toLowerCase().includes(buscaNormalizada) ||
          morador.telefone.includes(buscaNormalizada) ||
          morador.kitnet.numero.toLowerCase().includes(buscaNormalizada),
      )
    : moradoresDaPagina;
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
    setDataEntrada(hojeIsoLocal());
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
    if (kitnetId === null) {
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
          // Mudar de unidade passou a ser possível: antes a tela mandava remover e
          // cadastrar de novo, o que apagava todo o histórico de pagamentos.
          kitnetId,
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
      invalidarDadosDoNegocio(queryClient);
      toast.sucesso(editingId !== null ? 'Morador atualizado' : 'Morador cadastrado');
    } catch (err) {
      setError(getApiErrorMessage(err, `Não foi possível ${editingId !== null ? 'atualizar' : 'cadastrar'} o morador.`));
    } finally {
      setIsSubmitting(false);
    }
  }

  /**
   * Encerra a locação preservando o histórico. É o caminho certo para quem foi embora:
   * excluir apagaria junto todos os pagamentos da pessoa, mudando retroativamente a
   * receita de meses já fechados — e quem fica cadastrado sem saída continua recebendo
   * uma parcela nova todo mês.
   */
  async function handleRegistrarSaida(morador: MoradorRow) {
    const ok = await confirm({
      title: 'Registrar saída',
      message: `Encerrar a locação de ${morador.nome}? O histórico de pagamentos é mantido e a unidade fica disponível.`,
      confirmLabel: 'Registrar saída',
    });
    if (!ok) {
      return;
    }
    setListError(null);
    try {
      await api.patch(`/moradores/${morador.id}/registrar-saida`, {});
      invalidarDadosDoNegocio(queryClient);
      toast.sucesso(`Saída de ${morador.nome} registrada`);
    } catch (err) {
      setListError(getApiErrorMessage(err, 'Não foi possível registrar a saída.'));
    }
  }

  async function handleDelete(id: number) {
    const ok = await confirm({
      title: 'Remover morador',
      message:
        'Remover este morador? Os pagamentos dele são apagados junto. Se a pessoa apenas foi embora, use “Registrar saída” para manter o histórico.',
      confirmLabel: 'Remover',
      danger: true,
    });
    if (!ok) {
      return;
    }
    setListError(null);
    try {
      await api.delete(`/moradores/${id}`);
      invalidarDadosDoNegocio(queryClient);
      toast.sucesso('Morador removido');
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

      {!isLoadingKitnets && kitnets.length === 0 && (
        <div className="pre-requisito">
          <p>Para cadastrar um morador, primeiro crie o imóvel e as unidades dele.</p>
          <Link to="/imoveis" className="btn btn-ghost btn-sm">
            Ir para Imóveis
          </Link>
        </div>
      )}
      <ErrorBanner message={displayedError} />

      <Card
        action={
          moradoresDaPagina.length > 0 ? (
            <input
              type="search"
              className="lista-busca"
              placeholder="Buscar por nome, telefone ou unidade"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              aria-label="Buscar morador"
            />
          ) : undefined
        }
      >
        {isLoading ? (
          <TableSkeleton />
        ) : moradoresDaPagina.length === 0 ? (
          <div className="estado-vazio">
            <h3>Nenhum morador cadastrado</h3>
            <p>
              Ao cadastrar um morador, o KitManager já cria as parcelas do aluguel dele
              mês a mês — inclusive as que ficaram para trás.
            </p>
            {!isViewer && kitnets.length > 0 && (
              <button type="button" className="btn btn-primary" onClick={openModal}>
                + Novo morador
              </button>
            )}
          </div>
        ) : (
        <Table
          rows={moradores}
          rowKey={(row) => row.id}
          emptyMessage={`Ninguém encontrado para “${busca}”.`}
          onRowClick={(row) => setSelectedMoradorId(row.id)}
          columns={[
            {
              header: 'Nome',
              render: (row) =>
                row.dataSaida ? (
                  <span className="morador-saiu">
                    {row.nome} <StatusBadge label="Saiu" />
                  </span>
                ) : (
                  row.nome
                ),
            },
            {
              header: 'Telefone',
              // Link `tel:` porque cobrar aluguel por telefone/WhatsApp é o fluxo real
              // desse público — antes era texto puro, que obrigava a copiar à mão.
              render: (row) => (
                <span className="lista-contato">
                  <a
                    className="lista-telefone numero"
                    href={`tel:${row.telefone.replace(/\D/g, '')}`}
                    onClick={(event) => event.stopPropagation()}
                  >
                    {row.telefone}
                  </a>
                  {/* WhatsApp é o canal real de cobrança desse público. A mensagem
                      já vai pronta para a pessoa só revisar e enviar. */}
                  <a
                    className="lista-whatsapp"
                    href={linkWhatsApp(
                      row.telefone,
                      `Olá, ${row.nome.split(' ')[0]}! Tudo bem? Passando para falar do aluguel.`,
                    )}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(event) => event.stopPropagation()}
                    aria-label={`Falar com ${row.nome} no WhatsApp`}
                    title="Falar no WhatsApp"
                  >
                    WhatsApp
                  </a>
                </span>
              ),
            },
            {
              header: 'Unidade',
              render: (row) => formatUnidadeLabel(row.kitnet),
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
                        {!row.dataSaida && (
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleRegistrarSaida(row);
                            }}
                          >
                            Registrar saída
                          </button>
                        )}
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
              <UnitPicker id="kitnetId" kitnets={kitnets} value={kitnetId} onChange={setKitnetId} />
              {editingId !== null && (
                <p className="field-static-hint">
                  Pode mudar de unidade à vontade: o histórico de pagamentos vai junto
                  com o morador.
                </p>
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
