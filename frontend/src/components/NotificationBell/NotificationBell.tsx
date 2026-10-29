import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, getApiErrorMessage } from '../../services/api';
import type { PagamentoAlerta } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { diasParaVencimento } from '../../utils/dates';
import { ErrorBanner } from '../ErrorBanner/ErrorBanner';
import { BellIcon } from '../icons';
import { useAuth } from '../../hooks/useAuth';
import './notification-bell.css';
import { invalidarDadosDoNegocio } from '../../services/invalidate';
import { useToast } from '../Toast/toast-context';

const REFRESH_MS = 60_000;

function alertaLabel(alerta: PagamentoAlerta): string {
  if (alerta.venceHoje) {
    return 'Vence hoje';
  }
  const atraso = Math.abs(diasParaVencimento(alerta.vencimento));
  return `Atrasado há ${atraso} dia${atraso > 1 ? 's' : ''}`;
}

export function NotificationBell() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { user } = useAuth();
  const isViewer = user?.papel === 'VISUALIZADOR';
  const [isOpen, setIsOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  // Id do alerta sendo confirmado — desabilita só aquele botão, evitando o duplo
  // clique que dispararia dois PATCH em conexão lenta.
  const [confirmandoId, setConfirmandoId] = useState<number | null>(null);
  const [isConfirmandoTodos, setIsConfirmandoTodos] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: alertas = [] } = useQuery({
    queryKey: ['pagamentos', 'alertas'],
    queryFn: () => api.get<PagamentoAlerta[]>('/pagamentos/alertas').then((response) => response.data),
    refetchInterval: REFRESH_MS,
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * Confirma todos os repasses listados de uma vez.
   *
   * A imobiliária costuma avisar o mês inteiro junto ("caiu o repasse de setembro"), e
   * confirmar um por um custava um toque por morador. Cada parcela grava o próprio
   * líquido, calculado pela taxa da unidade dela — o mesmo valor mostrado ao lado.
   */
  async function marcarTodosPagos() {
    setActionError(null);
    setIsConfirmandoTodos(true);
    try {
      // Sequencial, e não em paralelo: cada confirmação dispara a geração de parcelas
      // no backend, e requests simultâneas competiriam pela mesma unique constraint.
      for (const alerta of alertas) {
        await api.patch(`/pagamentos/${alerta.id}/marcar-pago`, {});
      }
      invalidarDadosDoNegocio(queryClient);
      toast.sucesso(
        alertas.length === 1
          ? 'Pagamento confirmado'
          : `${alertas.length} pagamentos confirmados`,
      );
      setIsOpen(false);
    } catch (err) {
      // Parcial: o que já passou continua confirmado, e a lista recarregada mostra o
      // que sobrou — por isso invalida mesmo no erro.
      invalidarDadosDoNegocio(queryClient);
      setActionError(
        getApiErrorMessage(err, 'Não foi possível confirmar todos os pagamentos.'),
      );
    } finally {
      setIsConfirmandoTodos(false);
    }
  }

  async function marcarPago(id: number) {
    setActionError(null);
    setConfirmandoId(id);
    try {
      // Rota dedicada: o PATCH genérico /pagamentos/:id só aceita valor, vencimento e
      // observacao (UpdatePagamentoDto), e o ValidationPipe roda com forbidNonWhitelisted
      // — qualquer outro campo derruba a request com 400. `dataPagamento` é opcional e o
      // backend assume hoje quando não vem.
      await api.patch(`/pagamentos/${id}/marcar-pago`, {});
      invalidarDadosDoNegocio(queryClient);
      toast.sucesso('Pagamento confirmado');
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Não foi possível confirmar o pagamento.'));
    } finally {
      setConfirmandoId(null);
    }
  }

  const temAlertaHoje = alertas.some((alerta) => alerta.venceHoje);

  return (
    <div className="notification-bell" ref={containerRef}>
      <button
        type="button"
        className={`notification-bell-trigger${alertas.length > 0 ? ' notification-bell-trigger-active' : ''}`}
        onClick={() => setIsOpen((open) => !open)}
        aria-label="Notificações de pagamento"
      >
        <BellIcon className="notification-bell-icon" />
        {alertas.length > 0 && (
          <span className={`notification-bell-badge${temAlertaHoje ? ' notification-bell-badge-today' : ''}`}>
            {alertas.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-bell-panel">
          <header className="notification-bell-panel-header">
            <strong>Pagamentos para conferir</strong>
            <span>{alertas.length === 0 ? 'Tudo em dia' : `${alertas.length} pendente${alertas.length > 1 ? 's' : ''}`}</span>
          </header>

          <ErrorBanner message={actionError} />

          {!isViewer && alertas.length > 1 && (
            <button
              type="button"
              className="btn btn-primary btn-sm notification-bell-confirmar-todos"
              onClick={marcarTodosPagos}
              disabled={isConfirmandoTodos}
            >
              {isConfirmandoTodos
                ? 'Confirmando...'
                : `Confirmar todos (${alertas.length})`}
            </button>
          )}

          {alertas.length === 0 ? (
            <p className="notification-bell-empty">Nenhum aluguel vencendo hoje ou atrasado. 🎉</p>
          ) : (
            <ul className="notification-bell-list">
              {alertas.map((alerta) => (
                <li key={alerta.id} className="notification-bell-item">
                  <div className="notification-bell-item-info">
                    <span className="notification-bell-item-title" title={`${alerta.morador} · ${alerta.imovel} ${alerta.kitnet}`}>
                      {alerta.morador} · {alerta.imovel} {alerta.kitnet}
                    </span>
                    <span
                      className={`notification-bell-item-tag${alerta.venceHoje ? '' : ' notification-bell-item-tag-danger'}`}
                    >
                      {alertaLabel(alerta)}
                    </span>
                    <span className="notification-bell-item-valor">
                      <strong className="numero">{formatCurrency(alerta.valorLiquido)}</strong>
                      {alerta.valorLiquido !== alerta.valor && (
                        <small className="numero">
                          {' '}
                          de {formatCurrency(alerta.valor)}
                        </small>
                      )}
                    </span>
                  </div>
                  {!isViewer && (
                    <button
                      type="button"
                      className="btn btn-primary notification-bell-item-action"
                      onClick={() => marcarPago(alerta.id)}
                      disabled={confirmandoId === alerta.id || isConfirmandoTodos}
                    >
                      {confirmandoId === alerta.id ? 'Confirmando...' : 'Confirmar'}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          <Link to="/pagamentos" className="notification-bell-link" onClick={() => setIsOpen(false)}>
            Ver todos os pagamentos →
          </Link>
        </div>
      )}
    </div>
  );
}
