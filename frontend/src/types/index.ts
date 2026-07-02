export type Plano = 'FREE' | 'PRO';

export interface User {
  id: number;
  name: string;
  email: string;
  plano: Plano;
}

export interface Morador {
  id: number;
  nome: string;
  telefone: string;
  kitnetId: number;
}

export interface Kitnet {
  id: number;
  numero: string;
  valor: number;
  status: 'vaga' | 'ocupada';
  moradores: Morador[];
}

export interface Pagamento {
  id: number;
  valor: number;
  vencimento: string;
  pago: boolean;
  moradorId: number;
  morador: Morador & { kitnet: Kitnet };
}

export interface DashboardSummary {
  totalKitnets: number;
  ocupadas: number;
  vagas: number;
  valorMensal: number;
  proximosVencimentos: Array<{
    id: number;
    morador: string;
    vencimento: string;
    valor: number;
  }>;
}
