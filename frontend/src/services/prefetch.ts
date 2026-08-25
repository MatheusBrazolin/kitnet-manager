import type { QueryClient } from '@tanstack/react-query';
import { api } from './api';
import type {
  DashboardSummary,
  Gasto,
  Imovel,
  Kitnet,
  Morador,
  PaginatedResponse,
} from '../types';

const LIST_PAGE_SIZE = 20;

/**
 * Dispara em paralelo, sem bloquear a navegação, o carregamento dos dados que as
 * telas principais precisam — chamado assim que sabemos quem é o usuário (login bem
 * sucedido ou sessão restaurada via /auth/me). Sem isso, cada página só começa a buscar
 * seus próprios dados quando é montada, e nesse intervalo listas ainda vazias (`[]`) fazem
 * telas como Moradores/Gastos piscarem um aviso de "cadastre algo antes" antes dos dados
 * reais chegarem. Cada prefetch respeita o cache (staleTime do QueryClient) — se a tela já
 * tiver sido visitada há pouco, isso não gera uma request nova.
 */
export function prefetchCoreData(queryClient: QueryClient) {
  const prefetches: Array<Promise<unknown>> = [
    queryClient.prefetchQuery({
      queryKey: ['dashboard'],
      queryFn: () => api.get<DashboardSummary>('/dashboard').then((response) => response.data),
    }),
    queryClient.prefetchQuery({
      queryKey: ['kitnets'],
      queryFn: () => api.get<Kitnet[]>('/kitnets').then((response) => response.data),
    }),
    queryClient.prefetchQuery({
      queryKey: ['imoveis'],
      queryFn: () => api.get<Imovel[]>('/imoveis').then((response) => response.data),
    }),
    // Pagamentos.tsx usa a lista de moradores sem paginação...
    queryClient.prefetchQuery({
      queryKey: ['moradores'],
      queryFn: () => api.get<Morador[]>('/moradores').then((response) => response.data),
    }),
    // ...e Moradores.tsx usa a versão paginada — chaves de cache diferentes, então
    // pré-carregamos as duas.
    queryClient.prefetchQuery({
      queryKey: ['moradores', 1, LIST_PAGE_SIZE],
      queryFn: () =>
        api
          .get<PaginatedResponse<Morador>>('/moradores', { params: { page: 1, limit: LIST_PAGE_SIZE } })
          .then((response) => response.data),
    }),
    queryClient.prefetchQuery({
      queryKey: ['pagamentos'],
      queryFn: () => api.get('/pagamentos').then((response) => response.data),
    }),
    queryClient.prefetchQuery({
      queryKey: ['gastos', 1, LIST_PAGE_SIZE],
      queryFn: () =>
        api
          .get<PaginatedResponse<Gasto>>('/gastos', { params: { page: 1, limit: LIST_PAGE_SIZE } })
          .then((response) => response.data),
    }),
  ];

  // Erros aqui não devem quebrar nada (login/restauração de sessão já terminaram) — a
  // própria tela, quando montada, vai tentar de novo e mostrar seu próprio erro se preciso.
  Promise.all(prefetches).catch(() => {});
}
