import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, getApiErrorMessage } from '../../services/api';
import type { PagamentoAlerta } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { diasParaVencimento } from '../../utils/dates';
import { BellIcon } from '../icons';
import './notification-bell.css';

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
  const [isOpen, setIsOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
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

  async function marcarPago(id: number) {
    setActionError(null);
    try {
      await api.patch(`/pagamentos/${id}`, { pago: true });
      queryClient.invalidateQueries({ queryKey: ['pagamentos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Não foi possível confirmar o pagamento.'));
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

          {actionError && <p className="form-error">{actionError}</p>}

          {alertas.length === 0 ? (
            <p className="notification-bell-empty">Nenhum aluguel vencendo hoje ou atrasado. 🎉</p>
          ) : (
            <ul className="notification-bell-list">
              {alertas.map((alerta) => (
                <li key={alerta.id} className="notification-bell-item">
                  <div className="notification-bell-item-info">
                    <span className="notification-bell-item-title">
                      {alerta.morador} · {alerta.imovel} {alerta.kitnet}
                    </span>
                    <span
                      className={`notification-bell-item-tag${alerta.venceHoje ? '' : ' notification-bell-item-tag-danger'}`}
                    >
                      {alertaLabel(alerta)} · {formatCurrency(alerta.valor)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary notification-bell-item-action"
                    onClick={() => marcarPago(alerta.id)}
                  >
                    Confirmar
                  </button>
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
