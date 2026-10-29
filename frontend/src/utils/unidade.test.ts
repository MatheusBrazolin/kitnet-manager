import { describe, expect, it } from 'vitest';
import { formatUnidadeLabel, linkWhatsApp } from './unidade';
import type { Kitnet } from '../types';

function kitnet(parcial: Partial<Kitnet>): Kitnet {
  return {
    id: 1,
    numero: '03',
    valor: 1200,
    taxaTipo: 'FIXA',
    status: 'ocupada',
    imovelId: 1,
    moradores: [],
    ...parcial,
  };
}

describe('formatUnidadeLabel', () => {
  it('mostra só o nome do imóvel quando ele tem uma unidade', () => {
    expect(
      formatUnidadeLabel(
        kitnet({ imovel: { id: 1, nome: 'Casa Vila Nova', _count: { kitnets: 1 } } }),
      ),
    ).toBe('Casa Vila Nova');
  });

  it('acrescenta o número quando o imóvel tem mais de uma unidade', () => {
    expect(
      formatUnidadeLabel(
        kitnet({ imovel: { id: 1, nome: 'Edifício Aurora', _count: { kitnets: 10 } } }),
      ),
    ).toBe('Edifício Aurora · 03');
  });

  // Regressão: o campo `kitnets` não vem nas listagens de moradores/gastos/pagamentos,
  // então o código antigo comparava `undefined > 1` e nunca mostrava o número — um
  // prédio com 10 unidades listava os 10 moradores com o mesmo rótulo.
  it('usa o tamanho da lista quando o _count não veio', () => {
    expect(
      formatUnidadeLabel(
        kitnet({
          imovel: {
            id: 1,
            nome: 'Edifício Aurora',
            kitnets: [kitnet({ id: 1 }), kitnet({ id: 2 })],
          },
        }),
      ),
    ).toBe('Edifício Aurora · 03');
  });

  it('cai no número da unidade quando o imóvel não veio junto', () => {
    expect(formatUnidadeLabel(kitnet({ imovel: undefined }))).toBe('03');
  });
});

// WhatsApp é como esse público cobra aluguel de verdade; `tel:` quase ninguém usa.
describe('linkWhatsApp', () => {
  it('acrescenta o DDI 55 a um celular com DDD', () => {
    expect(linkWhatsApp('11988887777', 'Oi')).toContain('wa.me/5511988887777');
  });

  it('ignora a formatação do telefone', () => {
    expect(linkWhatsApp('(11) 98888-7777', 'Oi')).toContain('wa.me/5511988887777');
  });

  // Quem já salvou o número com DDI não pode acabar com "5555...".
  it('não duplica o DDI quando ele já veio', () => {
    expect(linkWhatsApp('5511988887777', 'Oi')).toContain('wa.me/5511988887777');
  });

  it('escapa a mensagem para a URL', () => {
    expect(linkWhatsApp('11988887777', 'Olá, tudo bem?')).toContain(
      'text=Ol%C3%A1%2C%20tudo%20bem%3F',
    );
  });
});
