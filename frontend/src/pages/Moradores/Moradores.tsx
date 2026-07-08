import { useEffect, useState, type FormEvent } from 'react';
import { api, getApiErrorMessage } from '../../services/api';
import type { Kitnet, Morador } from '../../types';
import { Card } from '../../components/Card/Card';
import { Table } from '../../components/Table/Table';
import { Modal } from '../../components/Modal/Modal';
import { Header } from '../../components/Header/Header';

type MoradorRow = Morador & { kitnet: Kitnet };

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function Moradores() {
  const [moradores, setMoradores] = useState<MoradorRow[]>([]);
  const [kitnets, setKitnets] = useState<Kitnet[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [kitnetId, setKitnetId] = useState('');
  const [dataEntrada, setDataEntrada] = useState(todayIsoDate());
  const [diaVencimento, setDiaVencimento] = useState('10');
  const [error, setError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function loadMoradores() {
    api
      .get<MoradorRow[]>('/moradores')
      .then((response) => setMoradores(response.data))
      .catch((err) => setListError(getApiErrorMessage(err, 'Não foi possível carregar os moradores.')));
  }

  useEffect(loadMoradores, []);
  useEffect(() => {
    api
      .get<Kitnet[]>('/kitnets')
      .then((response) => setKitnets(response.data))
      .catch((err) => setListError(getApiErrorMessage(err, 'Não foi possível carregar as kitnets.')));
  }, []);

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
      loadMoradores();
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
      loadMoradores();
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
      {listError && <p className="form-error">{listError}</p>}

      <Card>
        <Table
          rows={moradores}
          rowKey={(row) => row.id}
          emptyMessage="Nenhum morador cadastrado ainda."
          columns={[
            { header: 'Nome', render: (row) => row.nome },
            { header: 'Telefone', render: (row) => row.telefone },
            { header: 'Kitnet', render: (row) => row.kitnet.numero },
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
