import type {
  BitcoinAllocationInput,
  BitcoinAllocationResult,
  BitcoinQuantityHint,
} from '@/lib/finance/bitcoin/types';

/** ARS enteros (formato Foco). */
export function roundArs(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value);
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function pctOf(part: number, total: number): number {
  if (!(total > 0)) return 0;
  return Math.round((part / total) * 10000) / 100;
}

/**
 * Asigna una nueva inversión en ARS entre IBIT y BTC para acercarse al objetivo,
 * sin sugerir ventas. Trabaja en pesos enteros.
 */
export function allocateBitcoinPurchase(input: BitcoinAllocationInput): BitcoinAllocationResult {
  const ibitActual = roundArs(input.ibitActual);
  const btcActual = roundArs(input.btcActual);
  const nuevaInversion = roundArs(input.nuevaInversion);
  const porcentajeIBIT = clamp01(input.porcentajeIBIT);
  const porcentajeBTC = 1 - porcentajeIBIT;

  const totalActual = ibitActual + btcActual;
  const pctIbitActual = pctOf(ibitActual, totalActual);
  const pctBtcActual = pctOf(btcActual, totalActual);

  if (nuevaInversion <= 0) {
    return {
      nuevaInversion: 0,
      totalFuturo: totalActual,
      ibitObjetivo: roundArs(totalActual * porcentajeIBIT),
      btcObjetivo: totalActual - roundArs(totalActual * porcentajeIBIT),
      compraIBIT: 0,
      compraBTC: 0,
      ibitFuturo: ibitActual,
      btcFuturo: btcActual,
      pctIbitActual,
      pctBtcActual,
      pctIbitProyectado: pctIbitActual,
      pctBtcProyectado: pctBtcActual,
      explanationKind: 'empty',
      explanation: 'Ingresá un importe para ver cuánto comprar de cada activo.',
    };
  }

  const totalFuturo = ibitActual + btcActual + nuevaInversion;
  const ibitObjetivo = Math.round(totalFuturo * porcentajeIBIT);
  const btcObjetivo = totalFuturo - ibitObjetivo;

  const compraIBIT = Math.min(nuevaInversion, Math.max(0, ibitObjetivo - ibitActual));
  const compraBTC = nuevaInversion - compraIBIT;

  const ibitFuturo = ibitActual + compraIBIT;
  const btcFuturo = btcActual + compraBTC;
  const pctIbitProyectado = pctOf(ibitFuturo, totalFuturo);
  const pctBtcProyectado = pctOf(btcFuturo, totalFuturo);

  const targetPct = Math.round(porcentajeIBIT * 10000) / 100;
  const btcTargetPct = Math.round(porcentajeBTC * 10000) / 100;
  const gapAfter = Math.abs(pctIbitProyectado - targetPct);

  let explanationKind: BitcoinAllocationResult['explanationKind'] = 'balanced';
  let explanation = `Tu distribución está cerca del objetivo. Esta compra mantiene el equilibrio ${targetPct}/${btcTargetPct}.`;

  if (compraIBIT === 0 && compraBTC === nuevaInversion) {
    explanationKind = 'favor_btc';
    explanation =
      'Hoy tenés más IBIT del objetivo. Conviene dirigir esta compra a BTC para equilibrar tu distribución.';
  } else if (compraBTC === 0 && compraIBIT === nuevaInversion) {
    explanationKind = 'favor_ibit';
    explanation =
      'Hoy tenés más BTC del objetivo. Conviene dirigir esta compra a IBIT para equilibrar tu distribución.';
  } else if (gapAfter > 0.75) {
    explanationKind = 'partial';
    explanation =
      'Esta compra mejora el equilibrio, pero todavía no alcanza para llegar al objetivo.';
  } else if (pctIbitActual > targetPct + 1) {
    explanationKind = 'favor_btc';
    explanation = 'Priorizamos BTC porque IBIT está por encima del peso objetivo.';
  } else if (pctIbitActual < targetPct - 1) {
    explanationKind = 'favor_ibit';
    explanation = 'Priorizamos IBIT porque BTC está por encima del peso objetivo.';
  }

  return {
    nuevaInversion,
    totalFuturo,
    ibitObjetivo,
    btcObjetivo,
    compraIBIT,
    compraBTC,
    ibitFuturo,
    btcFuturo,
    pctIbitActual,
    pctBtcActual,
    pctIbitProyectado,
    pctBtcProyectado,
    explanationKind,
    explanation,
  };
}

/** Nominales IBIT (3 decimales, hacia abajo) y BTC (8 decimales). */
export function estimatePurchaseQuantities(params: {
  compraIBIT: number;
  compraBTC: number;
  ibitPriceArs?: number;
  btcPriceUsd?: number;
  usdArsRate?: number;
}): BitcoinQuantityHint {
  const hint: BitcoinQuantityHint = {};

  if (params.ibitPriceArs && params.ibitPriceArs > 0 && params.compraIBIT > 0) {
    const raw = params.compraIBIT / params.ibitPriceArs;
    const units = Math.floor(raw * 1000) / 1000;
    if (units > 0) {
      hint.ibitUnits = units;
      hint.ibitSpendExecutable = roundArs(units * params.ibitPriceArs);
      hint.ibitRemainder = Math.max(0, params.compraIBIT - hint.ibitSpendExecutable);
    }
  }

  if (
    params.btcPriceUsd &&
    params.btcPriceUsd > 0 &&
    params.usdArsRate &&
    params.usdArsRate > 0 &&
    params.compraBTC > 0
  ) {
    const btcArsPrice = params.btcPriceUsd * params.usdArsRate;
    if (btcArsPrice > 0) {
      const raw = params.compraBTC / btcArsPrice;
      hint.btcAmount = Math.floor(raw * 1e8) / 1e8;
    }
  }

  return hint;
}
