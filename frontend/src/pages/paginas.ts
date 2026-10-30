import { lazy } from 'react';

/**
 * As telas autenticadas, carregadas sob demanda — e o pré-carregamento delas.
 *
 * Mora num módulo separado de `App.tsx` porque o `Layout` precisa de
 * `precarregarRotas()`: importar isso de `App` fecharia o ciclo App → Layout → App.
 *
 * Cada import fica numa função nomeada em vez de inline porque é chamado de dois lugares:
 * pelo `lazy` (quando a rota é aberta) e por `precarregarRotas` (quando o app fica
 * ocioso). As duas chamadas devolvem a MESMA promessa — o import dinâmico é memoizado
 * pelo módulo —, então pré-carregar não gera download repetido.
 */
const importarDashboard = () => import('./Dashboard/Dashboard');
const importarImoveis = () => import('./Imoveis/Imoveis');
const importarMoradores = () => import('./Moradores/Moradores');
const importarPagamentos = () => import('./Pagamentos/Pagamentos');
const importarGastos = () => import('./Gastos/Gastos');
const importarEquipe = () => import('./Equipe/Equipe');
const importarRelatorios = () => import('./Relatorios/Relatorios');
const importarConfiguracoes = () => import('./Configuracoes/Configuracoes');
const importarImobiliarias = () => import('./Imobiliarias/Imobiliarias');
const importarNaoEncontrado = () => import('./NaoEncontrado/NaoEncontrado');

export const Dashboard = lazy(() => importarDashboard().then((m) => ({ default: m.Dashboard })));
export const Imoveis = lazy(() => importarImoveis().then((m) => ({ default: m.Imoveis })));
export const Moradores = lazy(() => importarMoradores().then((m) => ({ default: m.Moradores })));
export const Pagamentos = lazy(() =>
  importarPagamentos().then((m) => ({ default: m.Pagamentos })),
);
export const Gastos = lazy(() => importarGastos().then((m) => ({ default: m.Gastos })));
export const Equipe = lazy(() => importarEquipe().then((m) => ({ default: m.Equipe })));
export const Relatorios = lazy(() => importarRelatorios().then((m) => ({ default: m.Relatorios })));
export const Configuracoes = lazy(() =>
  importarConfiguracoes().then((m) => ({ default: m.Configuracoes })),
);
export const Imobiliarias = lazy(() =>
  importarImobiliarias().then((m) => ({ default: m.Imobiliarias })),
);
export const NaoEncontrado = lazy(() =>
  importarNaoEncontrado().then((m) => ({ default: m.NaoEncontrado })),
);

/**
 * Baixa o código de todas as telas autenticadas enquanto o app está ocioso.
 *
 * Sem isso, cada troca de aba abre uma rodada de requisições ANTES de qualquer pixel
 * aparecer: medido no build de produção, abrir "Imóveis" pedia 13 arquivos (6 de script e
 * 7 de estilo), além dos dados. Na rede local isso some; num celular em 4G cada rodada
 * custa o tempo de ida e volta até o servidor, e é exatamente a "demora para trocar de
 * página" que se sente no telefone.
 *
 * Tudo somado são ~25 kB comprimidos — menos de um quinto do bundle principal —, baixados
 * uma vez, fora do caminho crítico, depois que a primeira tela já está na frente do
 * usuário. "NaoEncontrado" fica de fora de propósito: é a única que ninguém abre de
 * propósito.
 */
export function precarregarRotas(): void {
  const importadores = [
    importarDashboard,
    importarImoveis,
    importarMoradores,
    importarPagamentos,
    importarGastos,
    importarImobiliarias,
    importarRelatorios,
    importarConfiguracoes,
    importarEquipe,
  ];

  // Falha aqui não é erro: a rota continua carregando sob demanda, como antes.
  const precarregar = () => importadores.forEach((importar) => void importar().catch(() => {}));

  // `requestIdleCallback` espera o navegador terminar o que importa (render da primeira
  // tela, requisições dos dados). O Safari só passou a suportá-lo há pouco, daí o
  // fallback por tempo.
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(precarregar, { timeout: 3_000 });
  } else {
    setTimeout(precarregar, 1_500);
  }
}
