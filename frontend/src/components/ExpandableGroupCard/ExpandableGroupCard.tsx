import type { ReactNode } from 'react';
import './expandable-group-card.css';

interface ExpandableGroupCardProps {
  isOpen: boolean;
  onToggle: () => void;
  title: string;
  subtitle?: string | null;
  stats: ReactNode;
  children: ReactNode;
}

// Card "resumo colapsado + detalhe expandido" usado pra listas agrupadas por imóvel — extraído
// porque Imoveis e Pagamentos reimplementavam exatamente essa mesma estrutura (estado, JSX e
// CSS) cada um do seu jeito. Só o "shell" mora aqui: cada tela decide o que vai no resumo
// (stats) e no corpo (children) quando expandido.
export function ExpandableGroupCard({ isOpen, onToggle, title, subtitle, stats, children }: ExpandableGroupCardProps) {
  return (
    <section className="imovel-card">
      <button type="button" className="imovel-card-summary-row" onClick={onToggle} aria-expanded={isOpen}>
        <div className="imovel-card-summary-main">
          <span className={`imovel-card-chevron${isOpen ? ' imovel-card-chevron-open' : ''}`} aria-hidden="true">
            ▾
          </span>
          <div className="imovel-card-summary-title">
            <span className="imovel-card-nome" title={title}>
              {title}
            </span>
            {subtitle && <span className="imovel-card-endereco">{subtitle}</span>}
          </div>
        </div>
        <div className="imovel-card-summary-stats">{stats}</div>
      </button>

      {isOpen && <div className="imovel-card-body">{children}</div>}
    </section>
  );
}
