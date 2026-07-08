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
