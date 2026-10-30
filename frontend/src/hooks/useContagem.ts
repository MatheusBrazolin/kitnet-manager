import { useEffect, useRef, useState } from 'react';

/**
 * Anima um número de 0 até `destino`.
 *
 * Existe para a primeira tela do produto: o valor recebido subindo diz "este app conta
 * dinheiro pra você" antes de qualquer texto explicar. Num app de aluguel, é a
 * promessa inteira em um gesto.
 *
 * `easeOutExpo` em vez de linear: a contagem dispara e desacelera, o que faz o número
 * final parecer que "assentou" em vez de ter sido interrompido.
 *
 * Quem pediu menos movimento recebe o valor final direto, sem animação nenhuma — a
 * informação é a mesma, só não se mexe.
 */
export function useContagem(destino: number, duracaoMs = 1400): number {
  const prefereParado =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const [valor, setValor] = useState(prefereParado ? destino : 0);
  const frameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (prefereParado) {
      setValor(destino);
      return;
    }

    // O instante inicial vem do PRIMEIRO quadro, não de `performance.now()`.
    // Os dois relógios não têm garantia de compartilhar a mesma origem de tempo
    // — no jsdom não compartilham, e a conta dava um número absurdo. Medir
    // quadro contra quadro é consistente em qualquer ambiente.
    let inicio: number | undefined;

    function passo(agora: number) {
      inicio ??= agora;
      const t = Math.min(Math.max((agora - inicio) / duracaoMs, 0), 1);
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setValor(destino * eased);

      if (t < 1) {
        frameRef.current = requestAnimationFrame(passo);
      } else {
        // Crava o destino: o easing nunca chega exatamente em 1 por arredondamento,
        // e um valor quase certo numa tela de dinheiro é pior que nenhum.
        setValor(destino);
      }
    }

    frameRef.current = requestAnimationFrame(passo);
    return () => {
      if (frameRef.current !== undefined) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [destino, duracaoMs, prefereParado]);

  return valor;
}
