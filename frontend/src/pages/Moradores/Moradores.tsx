import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, getApiErrorMessage } from '../../services/api';
import type { Kitnet, Morador } from '../../types';
import { Card } from '../../components/Card/Card';
import { Table } from '../../components/Table/Table';
import { Modal } from '../../components/Modal/Modal';
import { Header } from '../../components/Header/Header';
import { MoradorDetailModal } from '../../components/MoradorDetailModal/MoradorDetailModal';

type MoradorRow = Morador & { kitnet: Kitnet };

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function Moradores() {
  const queryClient = useQueryClient();
  const { data: moradores = [], error: moradoresQueryError } = useQuery({
    queryKey: ['moradores'],
    queryFn: () => api.get<MoradorRow[]>('/moradores').then((response) => response.data),
  });
  const { data: kitnets = [], error: kitnetsQueryError } = useQuery({
    queryKey: ['kitnets'],
    queryFn: () => api.get<Kitnet[]>('/kitnets').then((response) => response.data),
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [kitnetId, setKitnetId] = useState('');
  const [dataEntrada, setDataEntrada] = useState(todayIsoDate());
  const [diaVencimento, setDiaVencimento] = useState('10');
  const [selectedMoradorId, setSelectedMoradorId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const displayedError =
    listError ??
    (moradoresQueryError
      ? getApiErrorMessage(moradoresQueryError, 'Não foi possível carregar os moradores.')
      : kitnetsQueryError
        ? getApiErrorMessage(kitnetsQueryError, 'Não foi possível carregar as kitnets.')
        : null);

  function openModal() {
    setNome('');
    setTelefone('');
    setKitnetId(kitnets[0] ? String(kitnets[0].id) : '');
    setDataEntrada(todayIsoDate());
    setDiaVencimento('10');
    setError(null);
    setIsModalOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post('/moradores', {
        nome,
        telefone,
        kitnetId: Number(kitnetId),
        dataEntrada,
        diaVencimento: Number(diaVencimento),
      });
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['moradores'] });
      queryClient.invalidateQueries({ queryKey: ['kitnets'] });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Não foi possível cadastrar o morador.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Remover este morador?')) {
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
        subtitle="Quem está morando em cada kitnet."
        action={
          <button type="button" className="btn btn-primary" onClick={openModal} disabled={kitnets.length === 0}>
            + Novo morador
          </button>
        }
      />

      {kitnets.length === 0 && <p className="form-error">Cadastre uma kitnet antes de adicionar moradores.</p>}
      {displayedError && <p className="form-error">{displayedError}</p>}

      <Card>
        <Table
          rows={moradores}
          rowKey={(row) => row.id}
          emptyMessage="Nenhum morador cadastrado ainda."
          onRowClick={(row) => setSelectedMoradorId(row.id)}
          columns={[
            { header: 'Nome', render: (row) => row.nome },
            { header: 'Telefone', render: (row) => row.telefone },
            { header: 'Kitnet', render: (row) => row.kitnet.numero },
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

      {selectedMoradorId && (
        <MoradorDetailModal moradorId={selectedMoradorId} onClose={() => setSelectedMoradorId(null)} />
      )}

      {isModalOpen && (
        <Modal title="Novo morador" onClose={() => setIsModalOpen(false)}>
          <form onSubmit={handleSubmit} className="field-group">
            {error && <p className="form-error">{error}</p>}
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
