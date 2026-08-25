import type { Papel } from '../types';

// Label única pro papel do usuário, usada tanto na Sidebar (o próprio usuário logado) quanto
// na tela Equipe (membros da conta) — evita o mesmo papel aparecer escrito de formas
// diferentes dependendo de onde é exibido.
export const PAPEL_LABEL: Record<Papel, string> = {
  OWNER: 'Dono da conta',
  GERENTE: 'Gerente',
  VISUALIZADOR: 'Visualizador',
};
