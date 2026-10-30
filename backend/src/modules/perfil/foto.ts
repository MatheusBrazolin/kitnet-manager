/**
 * O que a rota precisa de um arquivo enviado.
 *
 * Declarado aqui em vez de puxar `@types/multer`: a rota usa um campo só, e uma
 * dependência de desenvolvimento inteira para tipar `buffer` não se paga.
 */
export interface ArquivoEnviado {
  buffer: Buffer;
}

/**
 * Quanto a foto pode pesar depois de pronta.
 *
 * O navegador redimensiona para 256x256 WebP antes de enviar, o que dá ~15 KB. O teto
 * é folgado em relação a isso porque um navegador sem suporte a WebP cai para JPEG, e
 * porque o cliente não é fonte confiável de nada — quem define o limite é o servidor.
 */
export const TAMANHO_MAXIMO_FOTO = 512 * 1024;

/**
 * Formatos aceitos, reconhecidos pelos primeiros bytes do arquivo.
 *
 * O `mimetype` que o multer entrega vem do cabeçalho enviado pelo cliente: é um
 * palpite, e um palpite que o remetente escolhe. Conferir a assinatura real impede
 * que alguém grave um executável, um SVG com script ou um arquivo gigante de outro
 * tipo sob o rótulo de "image/webp".
 */
const ASSINATURAS: Array<{ tipo: string; confere: (b: Buffer) => boolean }> = [
  {
    tipo: 'image/jpeg',
    confere: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    tipo: 'image/png',
    confere: (b) =>
      b[0] === 0x89 &&
      b[1] === 0x50 &&
      b[2] === 0x4e &&
      b[3] === 0x47 &&
      b[4] === 0x0d &&
      b[5] === 0x0a &&
      b[6] === 0x1a &&
      b[7] === 0x0a,
  },
  {
    // "RIFF" nos bytes 0-3 e "WEBP" nos bytes 8-11; o meio é o tamanho do arquivo.
    tipo: 'image/webp',
    confere: (b) =>
      b.toString('ascii', 0, 4) === 'RIFF' &&
      b.toString('ascii', 8, 12) === 'WEBP',
  },
];

/** O tipo real do arquivo, ou `null` se não for uma imagem que aceitamos. */
export function tipoDaImagem(buffer: Buffer): string | null {
  if (buffer.length < 12) {
    return null;
  }
  return ASSINATURAS.find(({ confere }) => confere(buffer))?.tipo ?? null;
}
