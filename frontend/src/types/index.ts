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
  diaVencimento: number;
}

export interface Kitnet {
  id: number;
  numero: string;
  valor: number;
  status: 'vaga' | 'ocupada';
  imovelId: number;
  moradores: Morador[];
  imovel?: Imovel;
}

export interface Imovel {
  id: number;
  nome: string;
  endereco?: string | null;
  kitnets: Kitnet[];
}

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
  vencimento: string;
  pago: boolean;
  moradorId: number;
  morador: Morador & { kitnet: Kitnet };
}

export interface PagamentoResumo {
  id: number;
  valor: number;
  vencimento: string;
  pago: boolean;
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

export interface KitnetDetail extends Kitnet {
  gastos: GastoResumo[];
  totalGasto: number;
}

export interface DashboardSummary {
  totalKitnets: number;
  ocupadas: number;
  vagas: number;
  valorMensal: number;
  receitaMensal: number;
  gastoMensal: number;
  lucroLiquido: number;
  totalEmAtraso: number;
  gastosPorImovel: Array<{ imovel: string; total: number }>;
  historico: Array<{ label: string; receita: number; gasto: number }>;
  proximosVencimentos: Array<{
    id: number;
    morador: string;
    vencimento: string;
    valor: number;
  }>;
}
