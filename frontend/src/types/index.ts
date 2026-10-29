export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type Plano = 'FREE' | 'PRO';
export type Papel = 'OWNER' | 'GERENTE' | 'VISUALIZADOR';

export interface User {
  id: number;
  name: string;
  email: string;
  plano: Plano;
  contaId: number;
  papel: Papel;
  donoNome?: string;
}

export interface Membro {
  id: number;
  papel: 'GERENTE' | 'VISUALIZADOR';
  createdAt: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
}

export interface Morador {
  id: number;
  nome: string;
  telefone: string;
  kitnetId: number;
  dataEntrada: string;
  // Preenchida quando a locação foi encerrada — a pessoa deixa de ocupar a unidade e
  // não recebe mais parcelas novas. É a alternativa a excluir o morador, que apagaria
  // todo o histórico financeiro dele.
  dataSaida?: string | null;
  diaVencimento: number;
  // Presente quando o endpoint inclui a kitnet (ex.: GET /moradores) — ausente em respostas
  // que não fazem esse include.
  kitnet?: Kitnet;
}

export interface Kitnet {
  id: number;
  numero: string;
  valor: number;
  // Taxa desta unidade especificamente. null/undefined = segue a taxa padrão da
  // imobiliária vinculada; sem imobiliária, é aluguel direto e não há taxa.
  taxaImobiliaria?: number | null;
  // Diz se o número acima é um percentual do aluguel ou um valor fixo em reais.
  taxaTipo: TaxaTipo;
  status: 'vaga' | 'ocupada';
  imovelId: number;
  imobiliariaId?: number | null;
  imobiliaria?: ImobiliariaResumo | null;
  moradores: Morador[];
  imovel?: Imovel;
}

export interface Imovel {
  id: number;
  nome: string;
  endereco?: string | null;
  // Só vem quando o endpoint faz o include (GET /imoveis). As listagens de moradores,
  // gastos e pagamentos incluem o imóvel sem as unidades — por isso é opcional, e
  // tratá-lo como obrigatório escondia que `imovel.kitnets` é undefined nessas telas.
  kitnets?: Kitnet[];
  // Quantas unidades o imóvel tem, independente de `kitnets` ter vindo ou não. É o que
  // permite decidir se vale mostrar o número da unidade ao lado do nome do imóvel.
  _count?: { kitnets: number };
}

export type TaxaTipo = 'PERCENTUAL' | 'FIXA';

/** O que vem embutido na unidade — o bastante para resolver a taxa e exibir o nome. */
export type ImobiliariaResumo = Pick<
  Imobiliaria,
  'id' | 'nome' | 'taxaPadraoTipo' | 'taxaPadraoValor'
>;

export interface Imobiliaria {
  id: number;
  nome: string;
  telefone: string;
  contato?: string | null;
  // Taxa aplicada às unidades desta imobiliária que não definirem uma taxa própria.
  taxaPadraoTipo: TaxaTipo;
  taxaPadraoValor: number;
  _count?: { kitnets: number };
}

export type StatusPagamento = 'PENDENTE' | 'PAGO' | 'ATRASADO' | 'ANULADO';
export type TipoPagamento = 'ALUGUEL' | 'COMPLEMENTAR';

export interface PagamentoAlerta {
  id: number;
  valor: number;
  vencimento: string;
  morador: string;
  kitnet: string;
  imovel: string;
  venceHoje: boolean;
}

export interface Pagamento {
  id: number;
  valor: number;
  mesReferencia: string;
  vencimento: string;
  status: StatusPagamento;
  dataPagamento: string | null;
  formaPagamento: string | null;
  tipo: TipoPagamento;
  origem: string | null;
  observacao: string | null;
  // Snapshot do repasse, gravado ao marcar como pago e nunca recalculado depois — é o
  // que impede que mudar a taxa hoje reescreva repasses de meses já fechados. Nulos
  // enquanto a parcela não foi paga.
  valorTaxa: number | null;
  valorLiquido: number | null;
  moradorId: number;
  morador: Morador & { kitnet: Kitnet };
}

export interface PagamentoResumo {
  id: number;
  valor: number;
  mesReferencia: string;
  vencimento: string;
  status: StatusPagamento;
  dataPagamento: string | null;
  formaPagamento: string | null;
  tipo: TipoPagamento;
  origem: string | null;
  observacao: string | null;
  valorTaxa: number | null;
  valorLiquido: number | null;
}

export interface MoradorDetail extends Morador {
  kitnet: Kitnet;
  pagamentos: PagamentoResumo[];
}

export interface Gasto {
  id: number;
  descricao: string;
  valor: number;
  data: string;
  kitnetId: number;
  kitnet: Kitnet;
}

export interface GastoResumo {
  id: number;
  descricao: string;
  valor: number;
  data: string;
}

export interface KitnetValorHistoricoResumo {
  id: number;
  valor: number;
  vigenteDesde: string;
}

export interface KitnetDetail extends Kitnet {
  gastos: GastoResumo[];
  totalGasto: number;
  historicoValor: KitnetValorHistoricoResumo[];
}

export interface DashboardSummary {
  totalKitnets: number;
  ocupadas: number;
  vagas: number;
  // Projeção: quanto as unidades valem por mês e quanto disso ficaria com as
  // administradoras se todas estivessem ocupadas e em dia.
  valorMensal: number;
  totalImobiliaria: number;
  receitaMensal: number;
  // Realizado: o que de fato chegou ao proprietário no mês, já descontada a taxa, e
  // quanto ficou com as administradoras no mesmo período.
  receitaLiquidaMensal: number;
  taxasMensal: number;
  gastoMensal: number;
  lucroLiquido: number;
  totalEmAtraso: number;
  // Repasses ainda não recebidos, tenham vencido ou não.
  totalPendente: number;
  quantidadePendente: number;
  gastosPorImovel: Array<{ imovel: string; total: number }>;
  // Uma linha por administradora; as unidades sem nenhuma aparecem como "Gestão direta".
  porImobiliaria: Array<{
    imobiliariaId: number | null;
    nome: string;
    unidades: number;
    ocupadas: number;
    bruto: number;
    taxas: number;
    liquido: number;
  }>;
  historico: Array<{
    label: string;
    receita: number;
    gasto: number;
    liquido: number;
    taxa: number;
  }>;
  proximosVencimentos: Array<{
    id: number;
    morador: string;
    vencimento: string;
    valor: number;
  }>;
}
