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
  // Primeira letra maiúscula e o resto minúsculo: os dados chegam ora em caixa
  // alta do enum do backend ("PAGO"), ora já formatados ("vaga").
  const texto = label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
  return <span className={`status-badge status-badge-${tone}`}>{texto}</span>;
}
