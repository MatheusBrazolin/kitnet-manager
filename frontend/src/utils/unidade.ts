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

/**
 * Link do WhatsApp com mensagem pronta para cobrar o aluguel.
 *
 * WhatsApp é o canal real desse público — o telefone já era clicável como `tel:`, mas
 * praticamente ninguém liga para cobrar aluguel. O número vai só com dígitos e com o
 * DDI 55 na frente, que é o formato que o wa.me exige; sem ele o link abre uma conversa
 * vazia em vez da do morador.
 */
export function linkWhatsApp(telefone: string, mensagem: string): string {
  const digitos = telefone.replace(/\D/g, '');
  // Números brasileiros com DDD têm 10 ou 11 dígitos; acima disso o DDI já veio junto.
  const comDdi = digitos.length <= 11 ? `55${digitos}` : digitos;
  return `https://wa.me/${comDdi}?text=${encodeURIComponent(mensagem)}`;
}
