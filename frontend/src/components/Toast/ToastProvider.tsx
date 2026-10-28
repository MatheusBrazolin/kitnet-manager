import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import './toast.css';

type ToastTone = 'success' | 'error';

interface Toast {
  id: number;
  tone: ToastTone;
  mensagem: string;
}

interface ToastApi {
  /** Confirma que algo deu certo. Ex.: `sucesso('Pagamento confirmado')`. */
  sucesso: (mensagem: string) => void;
  erro: (mensagem: string) => void;
}

const ToastContext = createContext<ToastApi | undefined>(undefined);

const DURACAO_MS = 4000;

/**
 * Avisos de ação concluída.
 *
 * Existe porque o app inteiro terminava as ações em silêncio: o modal fechava, a lista
 * se atualizava, e o usuário ficava sem saber se salvou. Num produto sobre dinheiro
 * alheio, essa dúvida é cara — a pessoa clica de novo, duplica, ou abre outra tela só
 * para conferir.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const proximoId = useRef(0);

  const remover = useCallback((id: number) => {
    setToasts((atuais) => atuais.filter((t) => t.id !== id));
  }, []);

  const adicionar = useCallback((tone: ToastTone, mensagem: string) => {
    const id = proximoId.current++;
    setToasts((atuais) => [...atuais, { id, tone, mensagem }]);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      sucesso: (mensagem: string) => adicionar('success', mensagem),
      erro: (mensagem: string) => adicionar('error', mensagem),
    }),
    [adicionar],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* `polite` e não `assertive`: a confirmação não deve interromper quem está
          navegando por leitor de tela no meio de outra coisa. */}
      <div className="toast-viewport" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => remover(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [saindo, setSaindo] = useState(false);

  useEffect(() => {
    const some = setTimeout(() => setSaindo(true), DURACAO_MS);
    // Some sozinho, mas só é removido do DOM depois da animação de saída — senão
    // o aviso pisca e desaparece sem transição.
    const remove = setTimeout(onDismiss, DURACAO_MS + 200);
    return () => {
      clearTimeout(some);
      clearTimeout(remove);
    };
  }, [onDismiss]);

  return (
    <div className={`toast toast-${toast.tone}${saindo ? ' toast-saindo' : ''}`}>
      <span className="toast-icone" aria-hidden="true">
        {toast.tone === 'success' ? <IconeCheck /> : <IconeAlerta />}
      </span>
      <span className="toast-mensagem">{toast.mensagem}</span>
      <button type="button" className="toast-fechar" onClick={onDismiss} aria-label="Fechar aviso">
        <IconeX />
      </button>
    </div>
  );
}

function IconeCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function IconeAlerta() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16.5v.01" />
    </svg>
  );
}

function IconeX() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast deve ser usado dentro de um ToastProvider');
  }
  return context;
}
