import { describe, expect, it } from 'vitest';
import {
  AUGUST_2026_COLLECTED_ARS,
  HISTORY_PAYMENTS_2026,
  HISTORY_UNPAID_AUGUST_2026,
  august2026ExpectedOverdueCount,
  august2026TotalArs,
  collectedByMonthArs,
  historicalChargeStatus,
  mentionsIngresoFijo,
  resolveHistoryPeriodAndDates,
  resolveHistoryRows,
} from '@/lib/panel/history/history2026';

describe('historial 2026 · totales', () => {
  it('agosto cobrado (celdas verdes) = ARS 315610', () => {
    expect(august2026TotalArs()).toBe(AUGUST_2026_COLLECTED_ARS);
    expect(AUGUST_2026_COLLECTED_ARS).toBe(30000 + 90900 + 58000 + 60830 + 75880);
  });

  it('totales mensuales desde payments (paid_at) — ago corregido', () => {
    expect(collectedByMonthArs()).toEqual({
      '2026-01': 7580,
      '2026-02': 10000,
      '2026-03': 169530,
      '2026-04': 233345,
      '2026-05': 248345,
      '2026-06': 271768,
      '2026-07': 376409,
      '2026-08': 315610,
    });
  });

  it('agosto unpaid sin verde → 2 overdue esperados', () => {
    expect(HISTORY_UNPAID_AUGUST_2026).toEqual([
      { clientKey: 'avellaneda', dueMonth: '2026-08-01', amountArs: 100000 },
      { clientKey: 'hema', dueMonth: '2026-08-01', amountArs: 60640 },
    ]);
    expect(august2026ExpectedOverdueCount()).toBe(2);
    expect(
      historicalChargeStatus(false, '2026-08-10', '2026-08-14'),
    ).toBe('overdue');
  });

  it('no incluye Ingreso Fijo', () => {
    expect(mentionsIngresoFijo()).toBe(false);
    expect(HISTORY_PAYMENTS_2026).toHaveLength(28);
  });
});

describe('historial 2026 · period / paid_at', () => {
  it('previous_month estándar: pago agosto → period julio', () => {
    const r = resolveHistoryPeriodAndDates('2026-08-01', '2026-01-01', 10);
    expect(r.kind).toBe('standard');
    expect(r.period).toBe('2026-07-01');
    expect(r.dueDate).toBe('2026-08-10');
    expect(r.paidAt).toBe('2026-08-10');
  });

  it('Sanación paid_at día 24', () => {
    const r = resolveHistoryPeriodAndDates('2026-08-01', '2026-03-01', 24);
    expect(r.paidAt).toBe('2026-08-24');
    expect(r.dueDate).toBe('2026-08-24');
  });

  it('clientes generales día 10', () => {
    const r = resolveHistoryPeriodAndDates('2026-08-01', '2026-04-01', 10);
    expect(r.paidAt).toBe('2026-08-10');
  });

  it('bootstrap si period anterior < start_date (Pato enero)', () => {
    const r = resolveHistoryPeriodAndDates('2026-01-01', '2026-01-01', 10);
    expect(r.kind).toBe('bootstrap');
    expect(r.period).toBeNull();
    expect(r.paidAt).toBe('2026-01-10');
  });

  it('Giuliana agosto: bootstrap (excepción start_date)', () => {
    const r = resolveHistoryPeriodAndDates('2026-08-01', '2026-08-01', 10);
    expect(r.kind).toBe('bootstrap');
    expect(r.period).toBeNull();
    expect(r.dueDate).toBe('2026-08-10');
  });

  it('Pato febrero ya es standard (period enero) sin chocar con bootstrap enero', () => {
    const jan = resolveHistoryPeriodAndDates('2026-01-01', '2026-01-01', 10);
    const feb = resolveHistoryPeriodAndDates('2026-02-01', '2026-01-01', 10);
    expect(jan.period).toBeNull();
    expect(feb.period).toBe('2026-01-01');
  });
});

describe('historial 2026 · estados', () => {
  it('pago histórico → paid; no overdue', () => {
    expect(historicalChargeStatus(true, '2026-08-10', '2026-08-14')).toBe('paid');
    expect(historicalChargeStatus(false, '2026-08-10', '2026-08-14')).toBe('overdue');
  });

  it('filas resueltas cubren meses reales Poletino', () => {
    const pole = resolveHistoryRows().filter((r) => r.clientKey === 'poletino');
    expect(pole.map((r) => r.paymentMonth.slice(0, 7))).toEqual([
      '2026-04',
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
    ]);
    expect(pole.every((r) => r.amountReceivedArs > 0)).toBe(true);
  });

  it('idempotencia de resolución: mismo set al repetir', () => {
    const a = resolveHistoryRows();
    const b = resolveHistoryRows();
    expect(b).toEqual(a);
    expect(a).toHaveLength(28);
  });
});

describe('historial 2026 · reference / exchange', () => {
  it('todas las filas se modelan como ARS recibido (exchange null en SQL)', () => {
    const rows = resolveHistoryRows();
    expect(rows.every((r) => r.amountReceivedArs > 0)).toBe(true);
    expect(rows.every((r) => r.note.includes('exchange_rate null'))).toBe(true);
    expect(rows.every((r) => r.note.includes('[seed-history-2026]'))).toBe(true);
  });

  it('incluye fila Giuliana excepción', () => {
    const g = resolveHistoryRows().find((r) => r.clientKey === 'giuliana');
    expect(g?.note).toMatch(/EXCEPTION Giuliana/);
    expect(g?.amountReceivedArs).toBe(75880);
  });
});
