import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Relatorios } from './Relatorios';
import { api } from '../../services/api';
import type { RelatorioAnual } from '../../types';

// O componente Table renderiza DUAS representações da mesma linha — uma <table> para
// desktop e uma lista de cartões para mobile, alternadas por CSS. Toda consulta por
// conteúdo de linha encontra as duas, daí os helpers no plural.

function mesesZerados(): RelatorioAnual['porMes'] {
  const labels = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];
  return labels.map((label, indice) => ({
    mes: indice + 1,
    label,
    bruto: 0,
    taxas: 0,
    liquido: 0,
    gastos: 0,
  }));
}

function relatorio(parcial: Partial<RelatorioAnual> = {}): RelatorioAnual {
  return {
    ano: 2026,
    anosDisponiveis: [2026, 2025],
    bruto: 0,
    taxas: 0,
    liquido: 0,
    gastos: 0,
    sobrou: 0,
    porMes: mesesZerados(),
    porImovel: [],
    porImobiliaria: [],
    ...parcial,
  };
}

const COM_MOVIMENTO = relatorio({
  bruto: 36000,
  taxas: 3600,
  liquido: 32400,
  gastos: 4400,
  sobrou: 28000,
  porMes: mesesZerados().map((mes) =>
    mes.mes === 1
      ? { ...mes, bruto: 3000, taxas: 300, liquido: 2700, gastos: 500 }
      : mes,
  ),
  porImovel: [
    {
      imovelId: 1,
      nome: 'Edifício Aurora',
      bruto: 36000,
      taxas: 3600,
      liquido: 32400,
      gastos: 4400,
    },
  ],
  porImobiliaria: [
    {
      imobiliariaId: 7,
      nome: 'Imobiliária Central',
      bruto: 24000,
      taxas: 3600,
      liquido: 20400,
    },
    {
      imobiliariaId: null,
      nome: 'Gestão direta',
      bruto: 12000,
      taxas: 0,
      liquido: 12000,
    },
  ],
});

function renderPagina() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <Relatorios />
    </QueryClientProvider>,
  );
}

describe('Relatorios', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('mostra os totais do ano em linguagem de proprietário', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: COM_MOVIMENTO });

    renderPagina();

    // O número dominante é o que sobrou — é a pergunta que a tela responde.
    expect(await screen.findByText('R$ 28.000,00')).toBeInTheDocument();
    // Os rótulos repetem entre os cards e os cabeçalhos das tabelas, de propósito: é a
    // mesma pergunta respondida em dois níveis de detalhe.
    expect(screen.getAllByText('Você recebeu').length).toBeGreaterThan(0);
    expect(screen.getAllByText('R$ 36.000,00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Ficou com a imobiliária').length).toBeGreaterThan(0);
    expect(screen.getAllByText('R$ 3.600,00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Chegou até você').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Você gastou').length).toBeGreaterThan(0);

    // As três tabelas: mês a mês, por imóvel e por administradora.
    expect((await screen.findAllByText('Janeiro')).length).toBeGreaterThan(0);
    expect(
      (await screen.findAllByText('Edifício Aurora')).length,
    ).toBeGreaterThan(0);
    expect((await screen.findAllByText('Gestão direta')).length).toBeGreaterThan(
      0,
    );
  });

  it('refaz a busca com o ano escolhido no seletor', async () => {
    const user = userEvent.setup();
    const getSpy = vi.spyOn(api, 'get').mockResolvedValue({
      data: COM_MOVIMENTO,
    });

    renderPagina();

    await screen.findByText('R$ 28.000,00');
    expect(getSpy).toHaveBeenCalledWith('/relatorios/anual', {
      params: { ano: 2026 },
    });

    getSpy.mockResolvedValue({
      data: relatorio({ ano: 2025, bruto: 1000, liquido: 900, sobrou: 900 }),
    });
    await user.selectOptions(
      screen.getByLabelText('Ano do relatório'),
      '2025',
    );

    await waitFor(() =>
      expect(getSpy).toHaveBeenCalledWith('/relatorios/anual', {
        params: { ano: 2025 },
      }),
    );
    expect((await screen.findAllByText('R$ 900,00')).length).toBeGreaterThan(0);
  });

  it('avisa quando o ano não teve nenhum movimento e não oferece a planilha', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: relatorio() });

    renderPagina();

    expect(
      await screen.findByText(
        'Nada foi recebido nem gasto em 2026. Escolha outro ano para ver os números.',
      ),
    ).toBeInTheDocument();
    // Baixar três tabelas vazias não ajudaria ninguém.
    expect(
      screen.getByRole('button', { name: 'Baixar planilha (CSV)' }),
    ).toBeDisabled();
    expect(screen.queryByText('Mês a mês')).not.toBeInTheDocument();
  });
});
