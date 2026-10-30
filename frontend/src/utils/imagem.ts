/** Lado do quadrado final. 256px cobre o maior avatar da tela (72px) em telas 3x. */
const LADO = 256;

/** Teto do arquivo de entrada, antes de redimensionar. */
export const TAMANHO_MAXIMO_ENTRADA = 10 * 1024 * 1024;

export class ImagemInvalida extends Error {}

/**
 * Transforma o arquivo escolhido num quadrado de 256x256 pronto para enviar.
 *
 * O recorte é central e proporcional: a foto é ampliada até cobrir o quadrado e o
 * excesso sai pelas bordas. Deformar para caber (o que `drawImage` faz sozinho se a
 * gente não calcular nada) espicharia o rosto, que é pior que cortar o ombro.
 *
 * Redimensionar aqui, e não no servidor, evita duas coisas: subir 4 MB de foto de
 * celular por uma conexão móvel, e precisar de uma biblioteca de processamento de
 * imagem no backend. Sai com ~15 KB.
 *
 * WebP quando o navegador sabe gerar, JPEG quando não — Safari antigo só tem JPEG,
 * e `toBlob` com um tipo desconhecido cai silenciosamente para PNG, que num rosto
 * fica dez vezes maior. Daí a conferência explícita.
 */
export async function prepararFoto(arquivo: File): Promise<Blob> {
  if (!arquivo.type.startsWith('image/')) {
    throw new ImagemInvalida('Escolha um arquivo de imagem.');
  }
  if (arquivo.size > TAMANHO_MAXIMO_ENTRADA) {
    throw new ImagemInvalida('A imagem é grande demais. O limite é 10 MB.');
  }

  const bitmap = await carregar(arquivo);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = LADO;
    canvas.height = LADO;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new ImagemInvalida('Não foi possível processar a imagem.');
    }

    // Cobrir, não caber: escala pelo MENOR lado, e o que sobra é cortado.
    const lado = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - lado) / 2;
    const sy = (bitmap.height - lado) / 2;
    ctx.drawImage(bitmap, sx, sy, lado, lado, 0, 0, LADO, LADO);

    return await paraBlob(canvas);
  } finally {
    // `createImageBitmap` segura memória de decodificação até ser fechado.
    bitmap.close?.();
  }
}

async function carregar(arquivo: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(arquivo);
  } catch {
    // Arquivo corrompido, ou com extensão de imagem e conteúdo de outra coisa.
    throw new ImagemInvalida('Não foi possível ler essa imagem.');
  }
}

function paraBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const tipo = canvas
      .toDataURL('image/webp')
      .startsWith('data:image/webp')
      ? 'image/webp'
      : 'image/jpeg';

    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new ImagemInvalida('Não foi possível processar a imagem.'));
        }
      },
      tipo,
      0.85,
    );
  });
}
