import { describe, expect, it } from 'vitest';
import { allocateBitcoinPurchase, estimatePurchaseQuantities, roundArs } from './allocation';

describe('allocateBitcoinPurchase', () => {
  it('sin posiciones previas reparte 65/35 de $50.000', () => {
    const r = allocateBitcoinPurchase({
      ibitActual: 0,
      btcActual: 0,
      nuevaInversion: 50_000,
      porcentajeIBIT: 0.65,
    });
    expect(r.compraIBIT).toBe(32_500);
    expect(r.compraBTC).toBe(17_500);
    expect(r.compraIBIT + r.compraBTC).toBe(50_000);
  });

  it('si IBIT está por encima del objetivo, prioriza BTC', () => {
    const r = allocateBitcoinPurchase({
      ibitActual: 80_000,
      btcActual: 10_000,
      nuevaInversion: 20_000,
      porcentajeIBIT: 0.65,
    });
    expect(r.compraIBIT).toBe(0);
    expect(r.compraBTC).toBe(20_000);
    expect(r.explanationKind).toBe('favor_btc');
  });

  it('si BTC está por encima del objetivo, prioriza IBIT', () => {
    const r = allocateBitcoinPurchase({
      ibitActual: 10_000,
      btcActual: 80_000,
      nuevaInversion: 20_000,
      porcentajeIBIT: 0.65,
    });
    expect(r.compraBTC).toBe(0);
    expect(r.compraIBIT).toBe(20_000);
    expect(r.explanationKind).toBe('favor_ibit');
  });

  it('cartera equilibrada mantiene el split objetivo sobre el total futuro', () => {
    // 65k / 35k ya equilibrado; +10k → total 110k → IBIT obj 71500 → compra 6500
    const r = allocateBitcoinPurchase({
      ibitActual: 65_000,
      btcActual: 35_000,
      nuevaInversion: 10_000,
      porcentajeIBIT: 0.65,
    });
    expect(r.compraIBIT).toBe(6_500);
    expect(r.compraBTC).toBe(3_500);
    expect(r.compraIBIT + r.compraBTC).toBe(10_000);
  });

  it('inversión insuficiente para corregir desbalance destina todo al faltante', () => {
    const r = allocateBitcoinPurchase({
      ibitActual: 100_000,
      btcActual: 0,
      nuevaInversion: 5_000,
      porcentajeIBIT: 0.65,
    });
    expect(r.compraIBIT).toBe(0);
    expect(r.compraBTC).toBe(5_000);
  });

  it('cambio de porcentajes recalcula', () => {
    const a = allocateBitcoinPurchase({
      ibitActual: 0,
      btcActual: 0,
      nuevaInversion: 100_000,
      porcentajeIBIT: 0.7,
    });
    expect(a.compraIBIT).toBe(70_000);
    expect(a.compraBTC).toBe(30_000);
  });

  it('inversión 0 no recomienda compras', () => {
    const r = allocateBitcoinPurchase({
      ibitActual: 10_000,
      btcActual: 5_000,
      nuevaInversion: 0,
      porcentajeIBIT: 0.65,
    });
    expect(r.compraIBIT).toBe(0);
    expect(r.compraBTC).toBe(0);
    expect(r.explanationKind).toBe('empty');
  });

  it('nunca sugiere montos negativos ni supera el total', () => {
    const cases = [
      { ibitActual: 0, btcActual: 0, nuevaInversion: 1, porcentajeIBIT: 0.65 },
      { ibitActual: 999_999, btcActual: 1, nuevaInversion: 333, porcentajeIBIT: 0.5 },
      { ibitActual: 12_345, btcActual: 67_890, nuevaInversion: 12_345, porcentajeIBIT: 0.65 },
    ];
    for (const c of cases) {
      const r = allocateBitcoinPurchase(c);
      expect(r.compraIBIT).toBeGreaterThanOrEqual(0);
      expect(r.compraBTC).toBeGreaterThanOrEqual(0);
      expect(r.compraIBIT + r.compraBTC).toBe(roundArs(c.nuevaInversion));
    }
  });
});

describe('estimatePurchaseQuantities', () => {
  it('estima nominales IBIT hacia abajo y BTC a 8 decimales', () => {
    const q = estimatePurchaseQuantities({
      compraIBIT: 32_500,
      compraBTC: 17_500,
      ibitPriceArs: 10_000,
      btcPriceUsd: 100_000,
      usdArsRate: 1000,
    });
    expect(q.ibitUnits).toBe(3.25);
    expect(q.btcAmount).toBe(0.000175);
  });
});
