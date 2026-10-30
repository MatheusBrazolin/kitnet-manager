import { PrismaClient } from '@prisma/client';

/**
 * Faxina dos dados que os testes e2e criam.
 *
 * Os e2e rodam contra um banco de verdade e cadastram usuários a cada execução. Sem
 * limpar, o banco de desenvolvimento vai juntando centenas de contas `@example.com`
 * (com os imóveis, unidades e pagamentos pendurados nelas) até ninguém mais conseguir
 * olhar uma tabela e entender o que é dado real.
 *
 * Apagar o `User` basta: no schema, tudo que pendura nele é `onDelete: Cascade`
 * (Imovel, Kitnet, Imobiliaria, Membro, TokenRecuperacao) e a cascata segue descendo
 * — Kitnet leva Morador, Gasto e KitnetValorHistorico; Morador leva Pagamento. Um
 * `deleteMany` só de `User` derruba a árvore inteira.
 *
 * Guardamos os ids em vez de varrer por `email like '%@example.com'` de propósito: o
 * padrão de e-mail pegaria também as contas de uma execução em paralelo (outra
 * máquina, outro worktree, CI) que ainda estivesse no meio dos testes, e o teste do
 * vizinho quebraria com 404 sem explicação nenhuma. Cada execução só apaga o que ela
 * mesma criou.
 */
const idsCriados = new Set<number>();

export function anotarUsuarioCriado(id: number) {
  idsCriados.add(id);
}

export async function limparUsuariosCriados() {
  if (idsCriados.size === 0) return;

  // Cliente próprio, e não o `PrismaService` do app: na hora em que isto roda o app
  // do último teste já foi fechado, e fechar o app desconecta o Prisma dele.
  const prisma = new PrismaClient();
  try {
    await prisma.user.deleteMany({ where: { id: { in: [...idsCriados] } } });
    idsCriados.clear();
  } finally {
    await prisma.$disconnect();
  }
}
