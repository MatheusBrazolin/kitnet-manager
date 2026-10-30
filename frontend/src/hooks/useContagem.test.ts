import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useContagem } from './useContagem';

/** Finge a resposta do sistema para `prefers-reduced-motion`. */
function comPreferenciaDeMovimento(reduzido: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: reduzido && query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

describe('useContagem', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  // A garantia de acessibilidade: quem pediu menos movimento no sistema recebe o
  // número pronto, sem nenhum quadro de animação. Isso quebra silenciosamente se
  // alguém mexer no hook, porque visualmente "funciona" dos dois jeitos.
  it('entrega o valor final de imediato quando o sistema pede menos movimento', () => {
    comPreferenciaDeMovimento(true);
    const raf = vi.spyOn(globalThis, 'requestAnimationFrame');

    const { result } = renderHook(() => useContagem(6380));

    expect(result.current).toBe(6380);
    expect(raf).not.toHaveBeenCalled();
    raf.mockRestore();
  });

  it('começa em zero e termina no destino exato', async () => {
    comPreferenciaDeMovimento(false);

    const { result } = renderHook(() => useContagem(6380, 50));
    expect(result.current).toBe(0);

    // O easing é exponencial e nunca alcança 1 por arredondamento; o hook crava o
    // destino no último quadro. Num app de dinheiro, "quase o valor" não serve.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 150));
    });
    expect(result.current).toBe(6380);
  });

  it('cancela a animação ao desmontar, sem vazar quadro', () => {
    comPreferenciaDeMovimento(false);
    const cancel = vi.spyOn(globalThis, 'cancelAnimationFrame');

    const { unmount } = renderHook(() => useContagem(100));
    unmount();

    expect(cancel).toHaveBeenCalled();
    cancel.mockRestore();
  });
});
