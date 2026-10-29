import { createContext, useContext } from 'react';

export interface ToastApi {
  /** Confirma que algo deu certo. Ex.: `sucesso('Pagamento confirmado')`. */
  sucesso: (mensagem: string) => void;
  erro: (mensagem: string) => void;
}

export const ToastContext = createContext<ToastApi | undefined>(undefined);

/**
 * Fica neste arquivo, e não junto do ToastProvider, por causa do Fast Refresh: um
 * arquivo que exporta componente e não-componente perde a atualização em tempo real
 * durante o desenvolvimento — ao salvar, o Vite recarrega a página inteira e o estado
 * do formulário aberto se perde.
 */
export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast deve ser usado dentro de um ToastProvider');
  }
  return context;
}
