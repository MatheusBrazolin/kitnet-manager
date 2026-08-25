const MS_PER_DAY = 86_400_000;

// Datas "só calendário" (vencimento, data de entrada, data de gasto) são tratadas como
// dia em UTC, tanto no backend quanto aqui — evita o famoso bug de "um dia a menos/a mais"
// causado por misturar data local com exibição/parse em UTC.
function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
});

// Formatter único pra "dd/mm/aaaa" — usado por toda tela que exibe uma data de calendário
// (vencimento, data de pagamento, data de gasto, vigência). Evita cada tela redefinir o
// próprio Intl.DateTimeFormat e acabar divergindo no formato exibido.
export function formatDate(date: string | Date): string {
  return dateFormatter.format(new Date(date));
}

export function diasParaVencimento(vencimento: string | Date): number {
  const hoje = startOfUtcDay(new Date());
  const data = startOfUtcDay(new Date(vencimento));
  return Math.round((data.getTime() - hoje.getTime()) / MS_PER_DAY);
}

export function formatVencimentoLabel(vencimento: string | Date, pago: boolean): string {
  if (pago) {
    return 'Pago';
  }

  const dias = diasParaVencimento(vencimento);
  if (dias === 0) {
    return 'Vence hoje';
  }
  if (dias > 0) {
    return `Vence em ${dias} dia${dias > 1 ? 's' : ''}`;
  }

  const atraso = Math.abs(dias);
  return `Atrasado há ${atraso} dia${atraso > 1 ? 's' : ''}`;
}

const MES_LABELS = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

// Formata o mês de competência (ex.: "2026-07-01T00:00:00.000Z" -> "Jul/2026").
export function formatMesReferencia(mesReferencia: string | Date): string {
  const data = new Date(mesReferencia);
  return `${MES_LABELS[data.getUTCMonth()]}/${data.getUTCFullYear()}`;
}

export function formatTempoLocacao(dataEntrada: string | Date): string {
  const inicio = startOfUtcDay(new Date(dataEntrada));
  const hoje = startOfUtcDay(new Date());

  let anos = hoje.getUTCFullYear() - inicio.getUTCFullYear();
  let meses = hoje.getUTCMonth() - inicio.getUTCMonth();
  if (hoje.getUTCDate() < inicio.getUTCDate()) {
    meses -= 1;
  }
  if (meses < 0) {
    anos -= 1;
    meses += 12;
  }

  if (anos <= 0 && meses <= 0) {
    const dias = Math.max(0, Math.round((hoje.getTime() - inicio.getTime()) / MS_PER_DAY));
    return dias <= 1 ? 'Chegou hoje' : `${dias} dias`;
  }

  const partes: string[] = [];
  if (anos > 0) {
    partes.push(`${anos} ano${anos > 1 ? 's' : ''}`);
  }
  if (meses > 0) {
    partes.push(`${meses} ${meses > 1 ? 'meses' : 'mês'}`);
  }
  return partes.join(' e ');
}
