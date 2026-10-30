/**
 * Os 67 códigos de área em uso no Brasil.
 *
 * A faixa 11–99 tem buracos: 20, 23, 25, 26, 29, 30, 36, 39, 40, 50, 52, 56, 57, 58,
 * 59, 60, 70, 72, 76, 78, 80 e 90 nunca foram atribuídos. Vale conferir a lista contra
 * a Anatel antes de tratá-la como definitiva — códigos de área podem mudar —, mas o
 * ganho aqui não é jurídico: é pegar o dedo trocado na hora de digitar, que é de longe
 * o erro mais comum e o mais caro (telefone errado = morador que não se consegue
 * contatar, e ninguém descobre até precisar).
 */
export const DDDS_VALIDOS: ReadonlySet<number> = new Set([
  // SP
  11, 12, 13, 14, 15, 16, 17, 18, 19,
  // RJ, ES
  21, 22, 24, 27, 28,
  // MG (não existe 36)
  31, 32, 33, 34, 35, 37, 38,
  // PR, SC
  41, 42, 43, 44, 45, 46, 47, 48, 49,
  // RS
  51, 53, 54, 55,
  // DF, GO, TO, MT, MS, AC, RO
  61, 62, 63, 64, 65, 66, 67, 68, 69,
  // BA, SE
  71, 73, 74, 75, 77, 79,
  // PE, AL, PB, RN, CE, PI
  81, 82, 83, 84, 85, 86, 87, 88, 89,
  // PA, AM, RR, AP, MA
  91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

/**
 * Só os dígitos, já sem o DDI do Brasil.
 *
 * Número salvo por outro caminho (importado, copiado do WhatsApp) costuma vir como
 * "+55 16 99812-3344". Sem tirar o 55 da frente, o DDD lido seria "55" — que por azar
 * é um DDD válido (RS), então o erro passaria calado.
 */
export function soDigitos(valor: string): string {
  const digitos = valor.replace(/\D/g, '');
  if (digitos.length > 11 && digitos.startsWith('55')) {
    return digitos.slice(2);
  }
  return digitos;
}

/**
 * Formata para "(11) 98900-0155", inclusive pela metade enquanto a pessoa digita.
 *
 * Aceita o número cru: digitar 11989000155 direto já sai formatado, que era o pedido —
 * ninguém deveria ter que posicionar parênteses e hífen na mão.
 */
export function formatTelefone(valor: string): string {
  const digitos = soDigitos(valor).slice(0, 11);
  if (digitos.length === 0) {
    return '';
  }
  if (digitos.length <= 2) {
    return `(${digitos}`;
  }

  const ddd = digitos.slice(0, 2);
  const resto = digitos.slice(2);
  if (resto.length <= 4) {
    return `(${ddd}) ${resto}`;
  }

  // Fixo tem 8 dígitos depois do DDD e quebra 4-4; celular tem 9 e quebra 5-4. Enquanto
  // o número está incompleto seguimos a regra do fixo, então o hífen só "anda" no nono
  // dígito, em vez de pular de posição a cada tecla.
  const corte = resto.length <= 8 ? 4 : 5;
  return `(${ddd}) ${resto.slice(0, corte)}-${resto.slice(corte)}`;
}

/** O DDD digitado existe? `null` enquanto ainda não há dois dígitos para julgar. */
export function dddDigitado(valor: string): number | null {
  const digitos = soDigitos(valor);
  if (digitos.length < 2) {
    return null;
  }
  return Number(digitos.slice(0, 2));
}

/**
 * Por que o número está errado, em linguagem de gente — ou `null` se estiver certo.
 *
 * Devolve a mensagem em vez de um booleano porque "faltam dígitos" e "esse DDD não
 * existe" pedem correções diferentes, e um campo que só fica vermelho obriga a pessoa
 * a adivinhar qual dos dois é.
 */
export function erroDoTelefone(valor: string): string | null {
  const digitos = soDigitos(valor);
  if (digitos.length === 0) {
    return null;
  }

  const ddd = dddDigitado(valor);
  if (ddd !== null && !DDDS_VALIDOS.has(ddd)) {
    return `DDD ${String(ddd).padStart(2, '0')} não existe no Brasil.`;
  }
  if (digitos.length < 10) {
    return 'Faltam dígitos — informe DDD e número.';
  }
  // 10 = fixo, 11 = celular. Com 11, o nono dígito é sempre 9.
  if (digitos.length === 11 && digitos[2] !== '9') {
    return 'Celular com 11 dígitos começa com 9 depois do DDD.';
  }
  return null;
}
