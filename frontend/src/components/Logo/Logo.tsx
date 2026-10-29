import { useId } from 'react';

interface LogoProps {
  className?: string;
  /** Lado do quadrado, em px. O desenho é vetorial e escala sem perda. */
  size?: number;
}

/**
 * Marca do KitManager: quatro unidades sob um teto só — que é literalmente o
 * produto (as kitnets de um mesmo imóvel). Uma janela fica acesa: a unidade
 * ocupada, o aluguel que entra.
 *
 * Fica inline em vez de <img src="/logo.svg"> para herdar o tamanho do contexto
 * e não custar uma requisição a cada tela. O gradiente precisa de id único
 * porque a marca aparece mais de uma vez na mesma página (sidebar + tab bar), e
 * ids repetidos fazem o Safari pintar as duas com a mesma referência.
 *
 * A versão de 16–32px (aba do navegador) é outra: public/favicon.svg, com duas
 * janelas maiores, porque nesse tamanho as quatro empastelam.
 */
export function Logo({ className, size = 32 }: LogoProps) {
  const gradientId = useId();

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label="KitManager"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b05c2e" />
          <stop offset="1" stopColor="#8a3f16" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="7.5" fill={`url(#${gradientId})`} />
      <path
        d="M6 14.6 16 5.6l10 9V25a1.8 1.8 0 0 1-1.8 1.8H7.8A1.8 1.8 0 0 1 6 25z"
        fill="#fff"
      />
      <g fill="#8a3f16">
        <rect x="9.5" y="16.4" width="5.2" height="4.4" rx="1.3" />
        <rect x="17.3" y="16.4" width="5.2" height="4.4" rx="1.3" fill="#e8913f" />
        <rect x="9.5" y="22.4" width="5.2" height="4.4" rx="1.3" />
        <rect x="17.3" y="22.4" width="5.2" height="4.4" rx="1.3" />
      </g>
    </svg>
  );
}
