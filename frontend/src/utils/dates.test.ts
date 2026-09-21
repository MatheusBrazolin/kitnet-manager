import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  diasParaVencimento,
  formatMesReferencia,
  formatTempoLocacao,
  formatVencimentoLabel,
  hojeIsoLocal,
} from './dates';

describe('dates', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-10T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('diasParaVencimento', () => {
    it('returns 0 for today', () => {
      expect(diasParaVencimento('2026-07-10')).toBe(0);
    });

    it('returns a positive number of days for a future date', () => {
      expect(diasParaVencimento('2026-07-15')).toBe(5);
    });

    it('returns a negative number of days for a past date', () => {
      expect(diasParaVencimento('2026-07-05')).toBe(-5);
    });
  });

  describe('formatVencimentoLabel', () => {
    it('returns "Pago" when pago is true, regardless of the date', () => {
      expect(formatVencimentoLabel('2026-01-01', true)).toBe('Pago');
    });

    it('returns "Vence hoje" for the current date', () => {
      expect(formatVencimentoLabel('2026-07-10', false)).toBe('Vence hoje');
    });

    it('returns "Vence em N dias" for a future date', () => {
      expect(formatVencimentoLabel('2026-07-15', false)).toBe('Vence em 5 dias');
    });

    it('uses singular "dia" for exactly 1 day', () => {
      expect(formatVencimentoLabel('2026-07-11', false)).toBe('Vence em 1 dia');
    });

    it('returns "Atrasado há N dias" for a past date', () => {
      expect(formatVencimentoLabel('2026-07-05', false)).toBe('Atrasado há 5 dias');
    });

    it('uses singular "dia" for exactly 1 day late', () => {
      expect(formatVencimentoLabel('2026-07-09', false)).toBe('Atrasado há 1 dia');
    });
  });

  describe('formatMesReferencia', () => {
    it('formats a mesReferencia ISO string as "Mês/Ano"', () => {
      expect(formatMesReferencia('2026-07-01T00:00:00.000Z')).toBe('Jul/2026');
    });

    it('formats December correctly', () => {
      expect(formatMesReferencia('2026-12-01T00:00:00.000Z')).toBe('Dez/2026');
    });
  });

  describe('formatTempoLocacao', () => {
    it('returns "Chegou hoje" for a move-in date of today', () => {
      expect(formatTempoLocacao('2026-07-10')).toBe('Chegou hoje');
    });

    it('returns days for a move-in less than a month ago', () => {
      expect(formatTempoLocacao('2026-07-01')).toBe('9 dias');
    });

    it('returns months for a move-in a few months ago', () => {
      expect(formatTempoLocacao('2026-04-10')).toBe('3 meses');
    });

    it('returns singular "mês" for exactly one month', () => {
      expect(formatTempoLocacao('2026-06-10')).toBe('1 mês');
    });

    it('returns years and months combined', () => {
      expect(formatTempoLocacao('2024-05-10')).toBe('2 anos e 2 meses');
    });
  });

  // Regressão de fuso: "hoje" era derivado com new Date().toISOString(), que devolve a
  // data em UTC. Em São Paulo (UTC-3), das 21h em diante isso já é o dia seguinte — os
  // formulários vinham pré-preenchidos com a data errada, "Vence hoje" aparecia um dia
  // antes e o tempo de locação contava um dia a mais.
  //
  // O ambiente de teste roda com TZ=America/Sao_Paulo (ver vite.config.ts), então
  // 2026-07-11T01:00:00Z é 10/07 às 22h no relógio local de quem usa o app.
  describe('virada do dia no fuso local', () => {
    it('hojeIsoLocal devolve o dia LOCAL, não o dia em UTC', () => {
      vi.setSystemTime(new Date('2026-07-11T01:00:00Z'));
      expect(hojeIsoLocal()).toBe('2026-07-10');
    });

    it('diasParaVencimento ainda diz "hoje" às 22h do dia do vencimento', () => {
      vi.setSystemTime(new Date('2026-07-11T01:00:00Z'));
      expect(diasParaVencimento('2026-07-10')).toBe(0);
    });

    it('formatVencimentoLabel não antecipa "Vence hoje" para o dia seguinte', () => {
      vi.setSystemTime(new Date('2026-07-11T01:00:00Z'));
      expect(formatVencimentoLabel('2026-07-11', false)).toBe('Vence em 1 dia');
    });

    it('formatTempoLocacao não conta um dia a mais depois das 21h', () => {
      vi.setSystemTime(new Date('2026-07-11T01:00:00Z'));
      expect(formatTempoLocacao('2026-07-10')).toBe('Chegou hoje');
    });
  });
});
