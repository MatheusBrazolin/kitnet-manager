import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, getApiErrorMessage } from '../../services/api';
import { firstErrorMessage } from '../../utils/queryError';
import type { Membro } from '../../types';
import { Card } from '../../components/Card/Card';
import { Table } from '../../components/Table/Table';
import { TableSkeleton } from '../../components/Table/TableSkeleton';
import { ErrorBanner } from '../../components/ErrorBanner/ErrorBanner';
import { Modal } from '../../components/Modal/Modal';
import { Header } from '../../components/Header/Header';
import { StatusBadge } from '../../components/StatusBadge';
import { useConfirm } from '../../components/ConfirmDialog/confirm-context';
import { PAPEL_LABEL } from '../../utils/papel';
import { useAuth } from '../../hooks/useAuth';
import './equipe.css';
import { useToast } from '../../components/Toast/toast-context';

export function Equipe() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { user } = useAuth();
  // O backend só deixa o OWNER convidar e remover membros (membros.controller.ts).
  // Um GERENTE consegue listar a equipe, então mostrar os botões pra ele só produz
  // um erro depois que o formulário já foi preenchido.
  const isOwner = user?.papel === 'OWNER';
  const confirm = useConfirm();
  const {
    data: membros = [],
    error: queryError,
    isLoading,
  } = useQuery({
    queryKey: ['membros'],
    queryFn: () => api.get<Membro[]>('/membros').then((response) => response.data),
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [papel, setPapel] = useState<'GERENTE' | 'VISUALIZADOR'>('GERENTE');
  const [error, setError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const displayedError =
    listError ?? firstErrorMessage({ error: queryError, fallback: 'Não foi possível carregar a equipe.' });

  function openModal() {
    setEmail('');
    setPapel('GERENTE');
    setError(null);
    setIsModalOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post('/membros', { email, papel });
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['membros'] });
      toast.sucesso('Convite enviado');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Não foi possível adicionar essa pessoa.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemove(membro: Membro) {
    const ok = await confirm({
      title: 'Remover acesso',
      message: `Remover o acesso de ${membro.user.name}? A pessoa deixa de ver os dados desta conta imediatamente.`,
      confirmLabel: 'Remover acesso',
      danger: true,
    });
    if (!ok) {
      return;
    }
    setListError(null);
    try {
      await api.delete(`/membros/${membro.id}`);
      queryClient.invalidateQueries({ queryKey: ['membros'] });
      toast.sucesso('Acesso removido');
    } catch (err) {
      setListError(getApiErrorMessage(err, 'Não foi possível remover o acesso.'));
    }
  }

  return (
    <div>
      <Header
        title="Equipe"
        subtitle="Dê acesso aos seus imóveis para sócios, gerentes ou contadores."
        action={
          isOwner ? (
            <button type="button" className="btn btn-primary" onClick={openModal}>
              + Convidar
            </button>
          ) : undefined
        }
      />

      <ErrorBanner message={displayedError} />

      <Card>
        {isLoading ? (
          <TableSkeleton />
        ) : (
          <Table
            rows={membros}
            rowKey={(row) => row.id}
            emptyMessage="Ninguém além de você tem acesso a esta conta ainda."
            columns={[
              { header: 'Nome', render: (row) => row.user.name },
              { header: 'E-mail', render: (row) => row.user.email },
              { header: 'Acesso', render: (row) => <StatusBadge label={PAPEL_LABEL[row.papel]} /> },
              ...(isOwner
                ? [
                    {
                      header: '',
                      align: 'right' as const,
                      render: (row: Membro) => (
                        <button type="button" className="btn btn-danger" onClick={() => handleRemove(row)}>
                          Remover
                        </button>
                      ),
                    },
                  ]
                : []),
            ]}
          />
        )}
      </Card>

      {isModalOpen && (
        <Modal title="Convidar para a equipe" onClose={() => setIsModalOpen(false)}>
          <form onSubmit={handleSubmit} className="field-group">
            <ErrorBanner message={error} />
            <p className="equipe-hint">
              A pessoa precisa já ter uma conta no KitManager com esse e-mail — peça pra ela se cadastrar antes,
              se ainda não tiver.
            </p>
            <div className="field">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="pessoa@exemplo.com"
              />
            </div>
            <div className="field">
              <label htmlFor="papel">Nível de acesso</label>
              <select id="papel" value={papel} onChange={(event) => setPapel(event.target.value as 'GERENTE' | 'VISUALIZADOR')}>
                <option value="GERENTE">Gerente — pode criar, editar e remover</option>
                <option value="VISUALIZADOR">Visualizador — só pode ver, sem editar</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Enviando...' : 'Adicionar'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
