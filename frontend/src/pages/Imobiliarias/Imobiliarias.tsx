import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, getApiErrorMessage } from '../../services/api';
import { firstErrorMessage } from '../../utils/queryError';
import type { Imobiliaria, TaxaTipo } from '../../types';
import { Card } from '../../components/Card/Card';
import { Table } from '../../components/Table/Table';
import { TableSkeleton } from '../../components/Table/TableSkeleton';
import { ErrorBanner } from '../../components/ErrorBanner/ErrorBanner';
import { Modal } from '../../components/Modal/Modal';
import { Header } from '../../components/Header/Header';
import { CurrencyInput } from '../../components/CurrencyInput';
import { useConfirm } from '../../components/ConfirmDialog/confirm-context';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency } from '../../utils/currency';
import { formatTaxaLabel } from '../../utils/repasse';
import { invalidarDadosDoNegocio } from '../../services/invalidate';
import './imobiliarias.css';
import { useToast } from '../../components/Toast/toast-context';

export function Imobiliarias() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { user } = useAuth();
  // Mesma regra dos outros cadastros: VISUALIZADOR só lê (ViewerReadOnlyGuard no
  // backend), então nem mostramos as ações para ele.
  const isViewer = user?.papel === 'VISUALIZADOR';
  const confirm = useConfirm();

  const {
    data: imobiliarias = [],
    error: queryError,
    isLoading,
  } = useQuery({
    queryKey: ['imobiliarias'],
    queryFn: () => api.get<Imobiliaria[]>('/imobiliarias').then((r) => r.data),
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [contato, setContato] = useState('');
  const [taxaTipo, setTaxaTipo] = useState<TaxaTipo>('PERCENTUAL');
  // Percentual é digitado direto ("10"); valor fixo usa CurrencyInput, que já trabalha
  // com string em reais.
  const [taxaValor, setTaxaValor] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const displayedError =
    listError ??
    firstErrorMessage({
      error: queryError,
      fallback: 'Não foi possível carregar as imobiliárias.',
    });

  function openCreateModal() {
    setEditandoId(null);
    setNome('');
    setTelefone('');
    setContato('');
    setTaxaTipo('PERCENTUAL');
    setTaxaValor('');
    setError(null);
    setIsModalOpen(true);
  }

  function openEditModal(imobiliaria: Imobiliaria) {
    setEditandoId(imobiliaria.id);
    setNome(imobiliaria.nome);
    setTelefone(imobiliaria.telefone);
    setContato(imobiliaria.contato ?? '');
    setTaxaTipo(imobiliaria.taxaPadraoTipo);
    setTaxaValor(String(imobiliaria.taxaPadraoValor));
    setError(null);
    setIsModalOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const payload = {
      nome,
      telefone,
      contato: contato || null,
      taxaPadraoTipo: taxaTipo,
      taxaPadraoValor: Number(taxaValor) || 0,
    };
    try {
      if (editandoId !== null) {
        await api.patch(`/imobiliarias/${editandoId}`, payload);
      } else {
        await api.post('/imobiliarias', payload);
      }
      setIsModalOpen(false);
      // A taxa padrão entra no cálculo do líquido das unidades e nos números do
      // dashboard, então não basta invalidar a lista desta tela.
      invalidarDadosDoNegocio(queryClient);
      toast.sucesso(editandoId !== null ? 'Imobiliária atualizada' : 'Imobiliária cadastrada');
      queryClient.invalidateQueries({ queryKey: ['imobiliarias'] });
    } catch (err) {
      setError(
        getApiErrorMessage(err, 'Não foi possível salvar esta imobiliária.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemove(imobiliaria: Imobiliaria) {
    const ok = await confirm({
      title: 'Remover imobiliária',
      message: `Remover ${imobiliaria.nome}? As unidades administradas por ela precisam ser desvinculadas antes.`,
      confirmLabel: 'Remover',
      danger: true,
    });
    if (!ok) {
      return;
    }
    setListError(null);
    try {
      await api.delete(`/imobiliarias/${imobiliaria.id}`);
      invalidarDadosDoNegocio(queryClient);
      toast.sucesso('Imobiliária removida');
      queryClient.invalidateQueries({ queryKey: ['imobiliarias'] });
    } catch (err) {
      setListError(
        getApiErrorMessage(err, 'Não foi possível remover esta imobiliária.'),
      );
    }
  }

  return (
    <div>
      <Header
        title="Imobiliárias"
        subtitle="Quem administra suas unidades e quanto cada uma retém do aluguel."
        action={
          isViewer ? undefined : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={openCreateModal}
            >
              + Nova imobiliária
            </button>
          )
        }
      />

      <ErrorBanner message={displayedError} />

      <Card>
        {isLoading ? (
          <TableSkeleton />
        ) : (
          <Table
            rows={imobiliarias}
            rowKey={(row) => row.id}
            emptyMessage="Nenhuma imobiliária cadastrada. Unidades sem imobiliária contam como gestão direta."
            columns={[
              { header: 'Nome', render: (row) => row.nome },
              { header: 'Telefone', render: (row) => row.telefone },
              { header: 'Contato', render: (row) => row.contato || '—' },
              {
                header: 'Taxa padrão',
                render: (row) =>
                  formatTaxaLabel(
                    row.taxaPadraoTipo,
                    row.taxaPadraoValor,
                    formatCurrency,
                  ),
              },
              {
                header: 'Unidades',
                align: 'right' as const,
                render: (row) => row._count?.kitnets ?? 0,
              },
              ...(isViewer
                ? []
                : [
                    {
                      header: '',
                      align: 'right' as const,
                      render: (row: Imobiliaria) => (
                        <div className="table-row-actions">
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => openEditModal(row)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger"
                            onClick={() => handleRemove(row)}
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
      </Card>

      {isModalOpen && (
        <Modal
          title={editandoId !== null ? 'Editar imobiliária' : 'Nova imobiliária'}
          onClose={() => setIsModalOpen(false)}
        >
          <form onSubmit={handleSubmit} className="field-group">
            <ErrorBanner message={error} />

            <div className="field">
              <label htmlFor="imobiliariaNome">Nome</label>
              <input
                id="imobiliariaNome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="imobiliariaTelefone">Telefone</label>
              <input
                id="imobiliariaTelefone"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="imobiliariaContato">
                Corretor responsável (opcional)
              </label>
              <input
                id="imobiliariaContato"
                value={contato}
                onChange={(e) => setContato(e.target.value)}
                placeholder="Ex.: Marina, do comercial"
              />
            </div>

            <div className="field">
              <label htmlFor="imobiliariaTaxaTipo">Taxa padrão</label>
              <div className="imobiliaria-taxa-campos">
                <select
                  id="imobiliariaTaxaTipo"
                  value={taxaTipo}
                  onChange={(e) => {
                    // O número muda de unidade (10% vs R$ 10), então manter o valor
                    // anterior ao trocar o tipo criaria uma taxa errada sem o usuário
                    // perceber.
                    setTaxaTipo(e.target.value as TaxaTipo);
                    setTaxaValor('');
                  }}
                >
                  <option value="PERCENTUAL">Percentual do aluguel</option>
                  <option value="FIXA">Valor fixo em reais</option>
                </select>

                {taxaTipo === 'PERCENTUAL' ? (
                  <div className="imobiliaria-taxa-percentual">
                    <input
                      id="imobiliariaTaxaValor"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      inputMode="decimal"
                      value={taxaValor}
                      onChange={(e) => setTaxaValor(e.target.value)}
                      aria-label="Percentual da taxa padrão"
                      required
                    />
                    <span aria-hidden="true">%</span>
                  </div>
                ) : (
                  <CurrencyInput
                    id="imobiliariaTaxaValor"
                    ariaLabel="Valor fixo da taxa padrão"
                    value={taxaValor}
                    onChange={setTaxaValor}
                    required
                  />
                )}
              </div>
              <p className="field-static-hint">
                Vale para as unidades desta imobiliária que não tiverem uma taxa
                própria.
              </p>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
