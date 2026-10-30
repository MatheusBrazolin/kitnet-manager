import { tipoDaImagem, TAMANHO_MAXIMO_FOTO } from './foto';

/** Cabeçalho mínimo de cada formato, seguido de lixo — é só a assinatura que importa. */
function comAssinatura(bytes: number[]): Buffer {
  return Buffer.concat([Buffer.from(bytes), Buffer.alloc(32)]);
}

const JPEG = comAssinatura([0xff, 0xd8, 0xff, 0xe0]);
const PNG = comAssinatura([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const WEBP = Buffer.concat([
  Buffer.from('RIFF', 'ascii'),
  Buffer.from([0x24, 0x00, 0x00, 0x00]),
  Buffer.from('WEBP', 'ascii'),
  Buffer.alloc(32),
]);

describe('tipoDaImagem', () => {
  it('reconhece JPEG, PNG e WebP pelos primeiros bytes', () => {
    expect(tipoDaImagem(JPEG)).toBe('image/jpeg');
    expect(tipoDaImagem(PNG)).toBe('image/png');
    expect(tipoDaImagem(WEBP)).toBe('image/webp');
  });

  it('recusa arquivo curto demais para ter assinatura', () => {
    expect(tipoDaImagem(Buffer.from([0xff, 0xd8]))).toBeNull();
    expect(tipoDaImagem(Buffer.alloc(0))).toBeNull();
  });

  // O ponto de conferir os bytes em vez do `mimetype`: o cabeçalho enviado pelo
  // cliente é um palpite que o próprio remetente escolhe.
  it('recusa um executável, por mais que ele se anuncie como imagem', () => {
    // "MZ", o cabeçalho de um .exe.
    expect(tipoDaImagem(comAssinatura([0x4d, 0x5a, 0x90, 0x00]))).toBeNull();
  });

  it('recusa SVG — é XML, e XML carrega script', () => {
    expect(
      tipoDaImagem(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg">')),
    ).toBeNull();
  });

  it('recusa GIF, que não está na lista', () => {
    expect(
      tipoDaImagem(Buffer.from('GIF89a........................')),
    ).toBeNull();
  });

  // RIFF sozinho é contêiner de WAV e AVI também; sem conferir "WEBP" no byte 8,
  // um áudio passaria por imagem.
  it('não aceita um RIFF que não seja WebP', () => {
    const wav = Buffer.concat([
      Buffer.from('RIFF', 'ascii'),
      Buffer.from([0x24, 0x00, 0x00, 0x00]),
      Buffer.from('WAVE', 'ascii'),
      Buffer.alloc(32),
    ]);
    expect(tipoDaImagem(wav)).toBeNull();
  });
});

describe('TAMANHO_MAXIMO_FOTO', () => {
  // O navegador manda ~15 KB (256x256 WebP). O teto é folgado de propósito, para o
  // navegador sem WebP que cai para JPEG — mas não tão folgado que vire anexo.
  it('é folgado para o que a tela envia, sem virar depósito de arquivo', () => {
    expect(TAMANHO_MAXIMO_FOTO).toBeGreaterThan(100 * 1024);
    expect(TAMANHO_MAXIMO_FOTO).toBeLessThanOrEqual(1024 * 1024);
  });
});
