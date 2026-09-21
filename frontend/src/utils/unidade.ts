import type { Kitnet } from '../types';

/**
 * Como identificar uma unidade numa lista: o nome do imóvel basta quando ele tem uma
 * única unidade; com mais de uma, o número precisa aparecer junto.
 *
 * Centralizado porque essa lógica estava copiada em Moradores, Gastos e no modal de
 * detalhe do morador — e nas três cópias ela testava `imovel.kitnets.length > 1` sobre
 * um campo que essas respostas não trazem. Em runtime `undefined > 1` é sempre false,
 * então um prédio com 10 kitnets listava os 10 moradores como "Kitnet Central", sem
 * nenhum número. O backend agora manda `_count.kitnets` nessas listagens.
 */
export function formatUnidadeLabel(kitnet: Kitnet): string {
  const imovel = kitnet.imovel;
  if (!imovel) {
    return kitnet.numero;
  }
  const totalUnidades = imovel._count?.kitnets ?? imovel.kitnets?.length ?? 1;
  return totalUnidades > 1 ? `${imovel.nome} · ${kitnet.numero}` : imovel.nome;
}
