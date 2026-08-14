import { describe, expect, it } from 'vitest';
import { sumCollectedByCurrency } from '@/lib/panel/charges/collectedTotals';
import { HISTORY_PAYMENTS_2026, collectedByMonthArs } from '@/lib/panel/history/history2026';
import { canStartSubmit, resolvePanelBackLink } from '@/lib/panel/navigation';

describe('sumCollectedByCurrency', () => {
  it('suma ARS histórico de fixtures y excluye otras monedas', () => {
    const payments = [
      ...HISTORY_PAYMENTS_2026.map((r) => ({
        amount_received: r.amountReceivedArs,
        currency_received: 'ARS',
      })),
      { amount_received: 99, currency_received: 'USD' },
      { amount_received: 50, currency_received: 'EUR' },
      { amount_received: NaN, currency_received: 'ARS' },
    ];
    const totals = sumCollectedByCurrency(payments);
    const expectedArs = Object.values(collectedByMonthArs()).reduce((a, b) => a + b, 0);
    expect(totals.totalCollectedARS).toBe(expectedArs);
    expect(totals.totalCollectedUSD).toBe(99);
  });

  it('USD 0 no suma basura', () => {
    expect(
      sumCollectedByCurrency([{ amount_received: 1000, currency_received: 'ARS' }]),
    ).toEqual({ totalCollectedARS: 1000, totalCollectedUSD: 0 });
  });
});

describe('resolvePanelBackLink', () => {
  it('cobros → inicio', () => {
    expect(resolvePanelBackLink('/panel/cobros')).toEqual({
      href: '/panel',
      label: 'Inicio',
    });
  });

  it('clientes → inicio', () => {
    expect(resolvePanelBackLink('/panel/clientes')).toEqual({
      href: '/panel',
      label: 'Inicio',
    });
  });

  it('detalle cliente → clientes', () => {
    expect(resolvePanelBackLink('/panel/clientes/abc-123')).toEqual({
      href: '/panel/clientes',
      label: 'Clientes',
    });
  });

  it('inicio sin back', () => {
    expect(resolvePanelBackLink('/panel')).toBeNull();
  });
});

describe('canStartSubmit', () => {
  it('bloquea doble acción', () => {
    expect(canStartSubmit(false)).toBe(true);
    expect(canStartSubmit(true)).toBe(false);
  });
});
