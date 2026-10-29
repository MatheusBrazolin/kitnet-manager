import type { QueryClient } from '@tanstack/react-query';

/**
 * Todas as chaves que carregam dado de negócio. Elas se cruzam muito mais do que
 * parece: o backend usa `include` em quase toda listagem, então o nome do imóvel e o
 * número da unidade ficam duplicados dentro de `pagamentos`, `moradores` e `gastos`;
 * criar um morador gera parcelas retroativas e muda o status da kitnet; excluir uma
 * unidade cascateia moradores, gastos e pagamentos; e qualquer uma dessas coisas move
 * os números do dashboard.
 *
 * Tentar acertar caso a caso quais chaves cada mutação afeta já falhou na prática (o
 * dashboard, por exemplo, nunca era invalidado por ninguém). Invalidar o conjunto
 * inteiro é barato: o react-query só refaz a request das queries *ativas* — as demais
 * ficam apenas marcadas como stale e só recarregam quando a tela for aberta.
 */
const CHAVES_DE_NEGOCIO = [
  'dashboard',
  'pagamentos',
  'moradores',
  'morador',
  'gastos',
  'kitnets',
  'kitnet',
  'imoveis',
  // A taxa padrão da administradora entra no líquido das unidades e nos números do
  // dashboard, então mexer nela invalida o mesmo conjunto que as demais entidades.
  'imobiliarias',
] as const;

export function invalidarDadosDoNegocio(queryClient: QueryClient) {
  for (const chave of CHAVES_DE_NEGOCIO) {
    queryClient.invalidateQueries({ queryKey: [chave] });
  }
}

/**
 * Descarta todo o cache. Usado no logout e quando a sessão é invalidada: o
 * QueryClient vive fora do ciclo de vida da sessão (é criado uma vez em `main.tsx`),
 * então sem isso o próximo login — em um computador compartilhado, por exemplo —
 * enxerga os dados da conta anterior enquanto o `staleTime` não expira.
 */
export function limparCacheDeDados(queryClient: QueryClient) {
  queryClient.clear();
}
