import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { firstErrorMessage } from '../../utils/queryError';
import type { RelatorioAnual } from '../../types';
import { Card, HeroStat, StatCard } from '../../components/Card/Card';
import { Table } from '../../components/Table/Table';
import { TableSkeleton } from '../../components/Table/TableSkeleton';
import { ErrorBanner } from '../../components/ErrorBanner/ErrorBanner';
import { Header } from '../../components/Header/Header';
import { formatCurrency } from '../../utils/currency';
import './relatorios.css';

const ANO_CORRENTE = new Date().getFullYear();

/**
 * Número como o Excel em português espera: vírgula decimal e sem separador de milhar.
 * Com ponto decimal o Excel pt-BR lê "1234.56" como texto (ou, pior, como data), e a
 * planilha chega ao contador sem somar nada.
 */
function numeroParaPlanilha(valor: number): string {
  return valor.toFixed(2).replace('.', ',');
}

/** Aspas só quando preciso — nome de imóvel pode conter o próprio separador. */
function campoCsv(valor: string): string {
  if (/[";\n]/.test(valor)) {
    return `"${valor.replace(/"/g, '""')}"`;
  }
  return valor;
}

function linhaCsv(campos: Array<string | number>): string {
  return campos
    .map((campo) =>
      typeof campo === 'number' ? numeroParaPlanilha(campo) : campoCsv(campo),
    )
    .join(';');
}

/**
 * As três tabelas da tela numa planilha só, na mesma ordem em que aparecem aqui — o
 * arquivo tem que ser reconhecível por quem acabou de olhar o relatório.
 */
function montarCsv(relatorio: RelatorioAnual): string {
  const linhas: string[] = [
    linhaCsv([`Relatório de ${relatorio.ano}`]),
    '',
    linhaCsv([
      'Mês',
      'Você recebeu',
      'Ficou com a imobiliária',
      'Chegou até você',
      'Gastos',
    ]),
    ...relatorio.porMes.map((mes) =>
      linhaCsv([mes.label, mes.bruto, mes.taxas, mes.liquido, mes.gastos]),
    ),
    linhaCsv([
      'Total do ano',
      relatorio.bruto,
      relatorio.taxas,
      relatorio.liquido,
      relatorio.gastos,
    ]),
    '',
    linhaCsv([
      'Imóvel',
      'Você recebeu',
      'Ficou com a imobiliária',
      'Chegou até você',
      'Gastos',
    ]),
    ...relatorio.porImovel.map((imovel) =>
      linhaCsv([
        imovel.nome,
        imovel.bruto,
        imovel.taxas,
        imovel.liquido,
        imovel.gastos,
      ]),
    ),
    '',
    linhaCsv([
      'Quem administra',
      'Você recebeu',
      'Ficou com a imobiliária',
      'Chegou até você',
    ]),
    ...relatorio.porImobiliaria.map((linha) =>
      linhaCsv([linha.nome, linha.bruto, linha.taxas, linha.liquido]),
    ),
    '',
    linhaCsv(['O que sobrou no ano', relatorio.sobrou]),
  ];

  // CRLF: é o fim de linha que o Excel assume em CSV, e sem ele o arquivo abre numa
  // célula só em algumas versões no Windows.
  return linhas.join('\r\n');
}

function baixarCsv(relatorio: RelatorioAnual) {
  // O BOM (﻿) é o que faz o Excel reconhecer o arquivo como UTF-8. Sem ele o Excel
  // assume a codificação regional do Windows e "Imobiliária"/"Março" chegam ilegíveis —
  // e o usuário conclui que o sistema exportou errado.
  const blob = new Blob(['﻿', montarCsv(relatorio)], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `kitmanager-${relatorio.ano}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function Relatorios() {
  const [ano, setAno] = useState(ANO_CORRENTE);

  const {
    data: relatorio,
    error: queryError,
    isLoading,
  } = useQuery({
    // O ano entra na chave: trocar de ano é uma busca nova, e o react-query guarda cada
    // ano separado em vez de refazer a request ao voltar para um já visto.
    queryKey: ['relatorios', 'anual', ano],
    queryFn: () =>
      api
        .get<RelatorioAnual>('/relatorios/anual', { params: { ano } })
        .then((response) => response.data),
  });

  const error = firstErrorMessage({
    error: queryError,
    fallback: 'Não foi possível carregar o relatório deste ano.',
  });

  // O backend só lista anos com movimento. Se o ano escolhido não estiver entre eles
  // (o corrente, antes do primeiro recebimento), ele ainda assim precisa aparecer no
  // seletor — senão o campo fica mostrando outro ano que não é o do relatório na tela.
  const anosDoSeletor = relatorio
    ? Array.from(new Set([...relatorio.anosDisponiveis, ano])).sort(
        (a, b) => b - a,
      )
    : [ano];

  const semMovimento =
    relatorio !== undefined &&
    relatorio.bruto === 0 &&
    relatorio.gastos === 0;

  return (
    <div className="relatorios">
      <Header
        title="Relatório do ano"
        subtitle="Tudo o que entrou e saiu no ano, para você conferir ou passar ao contador."
        action={
          <div className="relatorios-acoes">
            <select
              className="relatorios-ano"
              value={ano}
              onChange={(event) => setAno(Number(event.target.value))}
              aria-label="Ano do relatório"
            >
              {anosDoSeletor.map((opcao) => (
                <option key={opcao} value={opcao}>
                  {opcao}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-primary"
              // Sem nada no ano, a planilha sairia com três tabelas vazias.
              disabled={!relatorio || semMovimento}
              onClick={() => relatorio && baixarCsv(relatorio)}
            >
              Baixar planilha (CSV)
            </button>
          </div>
        }
      />

      <ErrorBanner message={error} />

      {isLoading && (
        <Card>
          <TableSkeleton />
        </Card>
      )}

      {relatorio && semMovimento && (
        <Card>
          <p className="relatorios-vazio">
            Nada foi recebido nem gasto em {relatorio.ano}. Escolha outro ano
            para ver os números.
          </p>
        </Card>
      )}

      {relatorio && !semMovimento && (
        <>
          <HeroStat
            label={`O que sobrou em ${relatorio.ano}`}
            value={formatCurrency(relatorio.sobrou)}
            hint={
              <>
                é o que chegou até você ({formatCurrency(relatorio.liquido)})
                menos o que você gastou ({formatCurrency(relatorio.gastos)})
              </>
            }
          />

          <div className="relatorios-stats">
            <StatCard
              label="Você recebeu"
              value={formatCurrency(relatorio.bruto)}
              hint="soma de todos os aluguéis do ano"
            />
            <StatCard
              label="Ficou com a imobiliária"
              value={formatCurrency(relatorio.taxas)}
              hint="o que foi retido antes de chegar até você"
              tone="negative"
            />
            <StatCard
              label="Chegou até você"
              value={formatCurrency(relatorio.liquido)}
              hint="o que caiu na sua conta"
              tone="positive"
            />
            <StatCard
              label="Você gastou"
              value={formatCurrency(relatorio.gastos)}
              hint="reformas, manutenção e demais despesas"
              tone="negative"
            />
          </div>

          <Card
            title="Mês a mês"
            subtitle="Meses sem movimento aparecem zerados."
          >
            <Table
              rows={relatorio.porMes}
              rowKey={(linha) => linha.mes}
              columns={[
                { header: 'Mês', render: (linha) => linha.label },
                {
                  header: 'Você recebeu',
                  align: 'right' as const,
                  render: (linha) => formatCurrency(linha.bruto),
                },
                {
                  header: 'Ficou com a imobiliária',
                  align: 'right' as const,
                  render: (linha) => formatCurrency(linha.taxas),
                },
                {
                  header: 'Chegou até você',
                  align: 'right' as const,
                  render: (linha) => formatCurrency(linha.liquido),
                },
                {
                  header: 'Você gastou',
                  align: 'right' as const,
                  render: (linha) => formatCurrency(linha.gastos),
                },
              ]}
            />
          </Card>

          <Card title="Por imóvel">
            <Table
              rows={relatorio.porImovel}
              rowKey={(linha) => linha.imovelId}
              emptyMessage="Nenhum imóvel teve movimento neste ano."
              columns={[
                { header: 'Imóvel', render: (linha) => linha.nome },
                {
                  header: 'Você recebeu',
                  align: 'right' as const,
                  render: (linha) => formatCurrency(linha.bruto),
                },
                {
                  header: 'Ficou com a imobiliária',
                  align: 'right' as const,
                  render: (linha) => formatCurrency(linha.taxas),
                },
                {
                  header: 'Chegou até você',
                  align: 'right' as const,
                  render: (linha) => formatCurrency(linha.liquido),
                },
                {
                  header: 'Você gastou',
                  align: 'right' as const,
                  render: (linha) => formatCurrency(linha.gastos),
                },
              ]}
            />
          </Card>

          <Card
            title="Por quem administra"
            subtitle="As unidades que você aluga sem administradora aparecem como gestão direta."
          >
            <Table
              rows={relatorio.porImobiliaria}
              // Gestão direta vem com id nulo; a chave precisa funcionar para ela também.
              rowKey={(linha) => linha.imobiliariaId ?? 'direta'}
              emptyMessage="Nenhuma unidade cadastrada."
              columns={[
                { header: 'Quem administra', render: (linha) => linha.nome },
                {
                  header: 'Você recebeu',
                  align: 'right' as const,
                  render: (linha) => formatCurrency(linha.bruto),
                },
                {
                  header: 'Ficou com a imobiliária',
                  align: 'right' as const,
                  render: (linha) => formatCurrency(linha.taxas),
                },
                {
                  header: 'Chegou até você',
                  align: 'right' as const,
                  render: (linha) => formatCurrency(linha.liquido),
                },
              ]}
            />
          </Card>
        </>
      )}
    </div>
  );
}
