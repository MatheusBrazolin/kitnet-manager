import { useEffect, useId, useRef, type ReactNode } from 'react';
import './modal.css';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Diálogo modal — base de todos os formulários do app e do ConfirmProvider.
 *
 * Cuida de quatro coisas que faltavam e que, juntas, deixavam o modal inutilizável no
 * teclado: anunciar-se como diálogo para leitores de tela, fechar no ESC, mover o foco
 * para dentro ao abrir (devolvendo-o ao fechar) e impedir que o Tab escape para a página
 * atrás do overlay.
 */
export function Modal({ title, onClose, children, className }: ModalProps) {
  const tituloId = useId();
  const modalRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  // Guardado no primeiro render: ao fechar, o foco volta pro botão que abriu o modal,
  // em vez de cair no início da página.
  const focoAnteriorRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    focoAnteriorRef.current = document.activeElement as HTMLElement | null;
    // Procura no corpo primeiro: em ordem de DOM o primeiro focável é o × do cabeçalho,
    // e num formulário faz muito mais sentido o cursor já estar no primeiro campo.
    const primeiro =
      bodyRef.current?.querySelector<HTMLElement>(FOCAVEIS) ??
      modalRef.current?.querySelector<HTMLElement>(FOCAVEIS);
    (primeiro ?? modalRef.current)?.focus();

    return () => focoAnteriorRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab') {
        return;
      }

      // Prende o Tab dentro do modal: sem isso o foco continua percorrendo a sidebar e a
      // tabela por baixo do overlay, sem nenhuma indicação visual de onde está.
      const focaveis = Array.from(modalRef.current?.querySelectorAll<HTMLElement>(FOCAVEIS) ?? []);
      if (focaveis.length === 0) {
        return;
      }
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (event.shiftKey && document.activeElement === primeiro) {
        event.preventDefault();
        ultimo.focus();
      } else if (!event.shiftKey && document.activeElement === ultimo) {
        event.preventDefault();
        primeiro.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    // onMouseDown, não onClick: com onClick, começar a selecionar texto dentro do modal e
    // soltar o mouse fora fechava o formulário e perdia tudo que tinha sido digitado.
    <div
      className="modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        className={`modal${className ? ` ${className}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
      >
        <header className="modal-header">
          <h2 id={tituloId}>{title}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </header>
        <div className="modal-body" ref={bodyRef}>
          {children}
        </div>
      </div>
    </div>
  );
}
