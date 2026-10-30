import type { ReactNode } from 'react';
import './card.css';

interface CardProps {
  title?: string;
  /** Linha de apoio sob o título, para o que o card responde não precisar ser deduzido. */
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Card({ title, subtitle, action, children, className }: CardProps) {
  return (
    <section className={`card${className ? ` ${className}` : ''}`}>
      {(title || action) && (
        <header className="card-header">
          <div className="card-heading">
            {title && <h2 className="card-title">{title}</h2>}
            {subtitle && <p className="card-subtitle">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className="card-body">{children}</div>
    </section>
  );
}

type Tone = 'neutral' | 'brand' | 'positive' | 'negative' | 'warning';

interface StatCardProps {
  label: string;
  value: string;
  hint?: ReactNode;
  tone?: Tone;
  /** Ícone opcional à esquerda do rótulo — ajuda a escanear uma fileira de números. */
  icon?: ReactNode;
}

/**
 * Número secundário.
 *
 * Deliberadamente discreto: antes todos os cards tinham borda preta, sombra forte e uma
 * tarja colorida, então oito números disputavam atenção em pé de igualdade e o que
 * importava se perdia. Aqui o destaque fica por conta do `HeroStat`; estes dão o
 * contexto em volta.
 */
export function StatCard({ label, value, hint, tone = 'neutral', icon }: StatCardProps) {
  return (
    <div className={`stat-card stat-card-${tone}`}>
      <span className="stat-card-label">
        {icon && <span className="stat-card-icon">{icon}</span>}
        {label}
      </span>
      <span className="stat-card-value numero">{value}</span>
      {hint && <span className="stat-card-hint">{hint}</span>}
    </div>
  );
}

interface HeroStatProps {
  /** A pergunta que o número responde, em linguagem de gente. */
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  /** Barra de progresso 0–1, quando o número faz parte de um total esperado. */
  progress?: { atual: number; total: number; legenda: ReactNode };
  action?: ReactNode;
}

/**
 * O número dominante da tela.
 *
 * Um por página, em corpo ~3x o texto normal. É a diferença entre um painel que o
 * usuário precisa interpretar e uma tela que já responde a pergunta dele na primeira
 * olhada.
 */
/**
 * A partir de quantos caracteres o valor não cabe mais em uma linha.
 *
 * "R$ 45.594,00" tem 12 e ocupa a coluna inteira no tamanho cheio; de 13 em diante
 * ("R$ 345.678,90") o número quebrava em duas linhas, o que se lê como dois números.
 * Encolher a fonte é melhor que partir o valor.
 */
const MAXIMO_CARACTERES_TAMANHO_CHEIO = 12;

export function HeroStat({ label, value, hint, progress, action }: HeroStatProps) {
  const pct =
    progress && progress.total > 0
      ? Math.min(100, Math.round((progress.atual / progress.total) * 100))
      : 0;

  // Só dá para medir quando o valor é texto. Sendo outra coisa, fica no tamanho cheio —
  // o mesmo comportamento de antes.
  const valorLongo =
    typeof value === 'string' && value.length > MAXIMO_CARACTERES_TAMANHO_CHEIO;

  return (
    <section className="hero-stat">
      <div className="hero-stat-main">
        <p className="hero-stat-label">{label}</p>
        <p className={`hero-stat-value numero${valorLongo ? ' hero-stat-value-longo' : ''}`}>
          {value}
        </p>
        {hint && <p className="hero-stat-hint">{hint}</p>}
      </div>

      {progress && (
        <div className="hero-stat-progress">
          <div
            className="hero-stat-track"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Quanto do esperado do mês já foi recebido"
          >
            <div className="hero-stat-fill" style={{ width: `${pct}%` }} />
          </div>
          <p className="hero-stat-legenda">{progress.legenda}</p>
        </div>
      )}

      {action && <div className="hero-stat-action">{action}</div>}
    </section>
  );
}
