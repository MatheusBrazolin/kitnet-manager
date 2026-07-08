const MS_PER_DAY = 86_400_000;

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function diasParaVencimento(vencimento: string | Date): number {
  const hoje = startOfDay(new Date());
  const data = startOfDay(new Date(vencimento));
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

export function formatTempoLocacao(dataEntrada: string | Date): string {
  const inicio = new Date(dataEntrada);
  const hoje = new Date();

  let anos = hoje.getFullYear() - inicio.getFullYear();
  let meses = hoje.getMonth() - inicio.getMonth();
  if (hoje.getDate() < inicio.getDate()) {
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
