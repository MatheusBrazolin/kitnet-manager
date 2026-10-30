import { afterEach, describe, expect, it, vi } from 'vitest';
import { ImagemInvalida, prepararFoto, TAMANHO_MAXIMO_ENTRADA } from './imagem';

function arquivo(tipo: string, tamanho = 1024): File {
  const f = new File([new Uint8Array(1)], 'foto.png', { type: tipo });
  // jsdom não deixa construir um File gigante; o tamanho é só um número lido.
  Object.defineProperty(f, 'size', { value: tamanho });
  return f;
}

describe('prepararFoto: o que recusa antes de tentar processar', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('recusa arquivo que não é imagem', async () => {
    await expect(prepararFoto(arquivo('application/pdf'))).rejects.toBeInstanceOf(
      ImagemInvalida,
    );
  });

  it('recusa imagem acima do teto de entrada', async () => {
    await expect(
      prepararFoto(arquivo('image/png', TAMANHO_MAXIMO_ENTRADA + 1)),
    ).rejects.toThrow(/10 MB/);
  });

  it('aceita até o teto exato', async () => {
    // Só prova que passou da validação de tamanho: o processamento falha depois,
    // porque jsdom não tem canvas de verdade.
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockRejectedValue(new Error('sem canvas')),
    );

    await expect(
      prepararFoto(arquivo('image/png', TAMANHO_MAXIMO_ENTRADA)),
    ).rejects.toThrow(/ler essa imagem/);
  });

  it('traduz arquivo corrompido em mensagem de gente, não em erro cru', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockRejectedValue(new Error('The source image could not be decoded')),
    );

    await expect(prepararFoto(arquivo('image/png'))).rejects.toThrow(
      'Não foi possível ler essa imagem.',
    );
  });
});

describe('prepararFoto: o recorte', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('recorta o quadrado do centro em vez de deformar a imagem', async () => {
    const close = vi.fn();
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockResolvedValue({ width: 400, height: 300, close }),
    );

    const drawImage = vi.fn();
    const toBlob = vi.fn((cb: (b: Blob) => void) => cb(new Blob(['x'])));
    vi.spyOn(document, 'createElement').mockReturnValue({
      width: 0,
      height: 0,
      getContext: () => ({ drawImage }),
      toDataURL: () => 'data:image/webp;base64,xx',
      toBlob,
    } as unknown as HTMLCanvasElement);

    await prepararFoto(arquivo('image/png'));

    // Numa imagem 400x300, o quadrado é 300x300 começando em x=50 — metade dos
    // 100px que sobram na largura. Esticar para 256x256 espicharia o rosto.
    expect(drawImage).toHaveBeenCalledWith(
      expect.anything(),
      50,
      0,
      300,
      300,
      0,
      0,
      256,
      256,
    );
    // `createImageBitmap` segura memória de decodificação até ser fechado.
    expect(close).toHaveBeenCalled();
  });

  it('cai para JPEG quando o navegador não sabe gerar WebP', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockResolvedValue({ width: 100, height: 100, close: vi.fn() }),
    );

    const toBlob = vi.fn(
      (cb: (b: Blob) => void) => cb(new Blob(['x'])),
    );
    vi.spyOn(document, 'createElement').mockReturnValue({
      width: 0,
      height: 0,
      getContext: () => ({ drawImage: vi.fn() }),
      // Safari antigo devolve PNG quando não conhece o tipo pedido.
      toDataURL: () => 'data:image/png;base64,xx',
      toBlob,
    } as unknown as HTMLCanvasElement);

    await prepararFoto(arquivo('image/png'));

    // Sem esta conferência, `toBlob('image/webp')` cairia para PNG sozinho — que
    // num rosto fica dez vezes maior que JPEG.
    expect(toBlob).toHaveBeenCalledWith(
      expect.any(Function),
      'image/jpeg',
      0.85,
    );
  });
});
