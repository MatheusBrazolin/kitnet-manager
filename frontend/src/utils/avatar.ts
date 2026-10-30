/**
 * Tons do avatar de iniciais.
 *
 * A mesma lista existe em `backend/src/common/avatar/cores.ts`, que recusa um valor
 * fora dela antes de gravar. Deliberadamente duplicada: se divergir, o backend aceita
 * uma cor que esta tela não sabe desenhar. Mexer aqui pede mexer lá.
 *
 * O banco guarda o NOME do tom e não o hexadecimal, então ajustar a paleta aqui
 * atualiza os avatares de todo mundo em vez de congelar a cor escolhida em 2026.
 */
export const AVATAR_CORES = [
  { nome: 'terracota', rotulo: 'Terracota', fundo: '#9a4b1e' },
  { nome: 'musgo', rotulo: 'Musgo', fundo: '#3f6b43' },
  { nome: 'indigo', rotulo: 'Índigo', fundo: '#3b4a8c' },
  { nome: 'ameixa', rotulo: 'Ameixa', fundo: '#6d3b63' },
  { nome: 'oceano', rotulo: 'Oceano', fundo: '#1f5f6b' },
  { nome: 'ocre', rotulo: 'Ocre', fundo: '#8a6a1f' },
  { nome: 'carmim', rotulo: 'Carmim', fundo: '#a63a5c' },
  { nome: 'grafite', rotulo: 'Grafite', fundo: '#4a4740' },
] as const;

export type AvatarCorNome = (typeof AVATAR_CORES)[number]['nome'];

const COR_PADRAO = AVATAR_CORES[0];

/**
 * A cor de quem ainda não escolheu, derivada do nome.
 *
 * Não é aleatória: a mesma pessoa tem sempre a mesma cor, em qualquer aparelho, sem
 * precisar guardar nada. Avatar que muda de cor a cada visita parece defeito.
 */
export function corDoAvatar(nome: string, escolhida?: string | null) {
  const porNome = AVATAR_CORES.find((cor) => cor.nome === escolhida);
  if (porNome) {
    return porNome;
  }
  if (!nome) {
    return COR_PADRAO;
  }
  let soma = 0;
  for (let i = 0; i < nome.length; i++) {
    soma += nome.charCodeAt(i);
  }
  return AVATAR_CORES[soma % AVATAR_CORES.length];
}

/**
 * Até duas iniciais: primeiro e último nome.
 *
 * Partículas ("de", "da", "dos") são ignoradas — "Marcos Vinícius de Albuquerque"
 * daria "MD" se contassem, que não identifica ninguém.
 */
const PARTICULAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);

export function iniciais(nome: string): string {
  const partes = nome
    .trim()
    .split(/\s+/)
    .filter((parte) => parte.length > 0 && !PARTICULAS.has(parte.toLowerCase()));

  if (partes.length === 0) {
    return '?';
  }
  if (partes.length === 1) {
    return partes[0].charAt(0).toUpperCase();
  }
  return (
    partes[0].charAt(0) + partes[partes.length - 1].charAt(0)
  ).toUpperCase();
}
