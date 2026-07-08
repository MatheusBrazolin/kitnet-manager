import type { ReactNode } from 'react';
import './card.css';

interface CardProps {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Card({ title, action, children, className }: CardProps) {
  return (
    <section className={`card${className ? ` ${className}` : ''}`}>
      {(title || action) && (
        <header className="card-header">
          {title && <h2 className="card-title">{title}</h2>}
          {action}
        </header>
      )}
      <div className="card-body">{children}</div>
    </section>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  tone?: 'brand' | 'success' | 'warning' | 'danger';
}

export function StatCard({ label, value, hint, tone = 'brand' }: StatCardProps) {
  return (
    <div className={`stat-card stat-card-${tone}`}>
      <span className="stat-card-label">{label}</span>
      <span className="stat-card-value">{value}</span>
      {hint && <span className="stat-card-hint">{hint}</span>}
    </div>
  );
}
