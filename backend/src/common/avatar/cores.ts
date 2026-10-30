/**
 * Tons que o avatar de iniciais pode ter.
 *
 * O banco guarda o NOME do tom, não o hexadecimal: assim ajustar a paleta do app
 * atualiza os avatares de todo mundo, em vez de congelar a cor escolhida em 2026.
 * Os valores em si vivem no frontend (`src/utils/avatar.ts`), que é quem pinta —
 * aqui só existe a lista, para recusar um valor inventado antes de gravar.
 *
 * A lista é deliberadamente a mesma nos dois lados: se divergir, o backend aceita
 * uma cor que a tela não sabe desenhar. Mexer aqui pede mexer lá.
 */
export const AVATAR_CORES = [
  'terracota',
  'musgo',
  'indigo',
  'ameixa',
  'oceano',
  'ocre',
  'carmim',
  'grafite',
] as const;

export type AvatarCor = (typeof AVATAR_CORES)[number];
