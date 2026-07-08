import type { ReactNode } from 'react';
import './modal.css';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export function Modal({ title, onClose, children, className }: ModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal${className ? ` ${className}` : ''}`} onClick={(event) => event.stopPropagation()}>
        <header className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
