import { createContext, useContext } from 'react';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

export type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>;

export const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * Separado do ConfirmProvider por causa do Fast Refresh: um arquivo que exporta
 * componente e não-componente perde a atualização em tempo real no desenvolvimento.
 */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm precisa ser usado dentro de um ConfirmProvider');
  }
  return ctx;
}
