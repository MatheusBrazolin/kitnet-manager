import './status-badge.css';

type Tone = 'success' | 'warning' | 'danger' | 'neutral';

const TONE_BY_LABEL: Record<string, Tone> = {
  ocupada: 'success',
  vaga: 'warning',
  pago: 'success',
  pendente: 'warning',
  atrasado: 'danger',
  anulado: 'neutral',
  saiu: 'neutral',
};

export function StatusBadge({ label }: { label: string }) {
  const tone = TONE_BY_LABEL[label.toLowerCase()] ?? 'warning';
  return <span className={`status-badge status-badge-${tone}`}>{label}</span>;
}
