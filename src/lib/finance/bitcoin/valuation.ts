import type { FinancePrice } from '@/lib/finance/financePrices';
import type { FinanceBitcoinModule, BitcoinLegValue } from '@/lib/finance/bitcoin/types';
import { getIbitNetQuantity } from '@/lib/finance/bitcoin/positions';
import { roundArs } from '@/lib/finance/bitcoin/allocation';
import type { FinanceEntry } from '@/lib/finance/types';
import type { FinancePortfolioHolding } from '@/lib/finance/portfolio/types';

export type BitcoinValuationSnapshot = {
  ibit: BitcoinLegValue;
  btc: BitcoinLegValue;
  usdArsRate?: number;
  pricesFetchedAt?: string;
  usingLivePrices: boolean;
  notes: string[];
};

function pickIbitPrice(
  live?: FinancePrice | null,
  manual?: number,
): { price?: number; currency?: 'ARS' | 'USD'; from: 'live' | 'manual' | null } {
  if (live && live.price > 0 && live.source !== 'missing') {
    const cur = (live.currency ?? 'ARS').toUpperCase() === 'USD' ? 'USD' : 'ARS';
    return { price: live.price, currency: cur, from: 'live' };
  }
  if (manual && manual > 0) return { price: manual, currency: 'ARS', from: 'manual' };
  return { from: null };
}

export function valueBitcoinLegs(params: {
  module: FinanceBitcoinModule;
  entries: FinanceEntry[];
  holdings: FinancePortfolioHolding[];
  ibitPrice?: FinancePrice | null;
  btcPrice?: FinancePrice | null;
}): BitcoinValuationSnapshot {
  const { module, entries, holdings } = params;
  const notes: string[] = [];
  const usdArsRate = module.manualUsdArsRate;
  let usingLivePrices = false;
  let pricesFetchedAt: string | undefined;

  const ibitPos = getIbitNetQuantity(entries, holdings);
  const ibitQuote = pickIbitPrice(params.ibitPrice, module.manualIbitPriceArs);
  if (params.ibitPrice?.fetchedAt) pricesFetchedAt = params.ibitPrice.fetchedAt;

  let ibit: BitcoinLegValue;

  if (module.manualIbitValueArs && module.manualIbitValueArs > 0 && !ibitPos.hasUnits) {
    ibit = {
      valueArs: roundArs(module.manualIbitValueArs),
      source: 'manual',
      detail: 'Valor IBIT ingresado manualmente',
    };
  } else if (ibitPos.hasUnits && ibitQuote.price && ibitQuote.currency === 'ARS') {
    usingLivePrices = ibitQuote.from === 'live';
    ibit = {
      valueArs: roundArs(ibitPos.quantity * ibitQuote.price),
      source: ibitQuote.from === 'live' ? 'portfolio_live' : 'manual',
      quantity: ibitPos.quantity,
      unitPrice: ibitQuote.price,
      unitCurrency: 'ARS',
      detail:
        ibitQuote.from === 'live'
          ? `${ibitPos.quantity} IBIT × precio en vivo`
          : `${ibitPos.quantity} IBIT × precio manual`,
    };
  } else if (ibitPos.hasUnits && ibitQuote.price && ibitQuote.currency === 'USD' && usdArsRate) {
    usingLivePrices = ibitQuote.from === 'live';
    const ars = ibitPos.quantity * ibitQuote.price * usdArsRate;
    ibit = {
      valueArs: roundArs(ars),
      source: ibitQuote.from === 'live' ? 'portfolio_live' : 'manual',
      quantity: ibitPos.quantity,
      unitPrice: ibitQuote.price,
      unitCurrency: 'USD',
      detail: `${ibitPos.quantity} IBIT × USD convertidos a ARS`,
    };
  } else if (module.manualIbitValueArs && module.manualIbitValueArs > 0) {
    ibit = {
      valueArs: roundArs(module.manualIbitValueArs),
      source: 'manual',
      quantity: ibitPos.hasUnits ? ibitPos.quantity : undefined,
      detail: 'Valor IBIT ingresado manualmente',
    };
  } else if (ibitPos.investedArs > 0 && !ibitPos.hasUnits) {
    ibit = {
      valueArs: roundArs(ibitPos.investedArs),
      source: 'portfolio_cost',
      detail: 'Sin cantidad/precio: se usa el costo acumulado en ARS',
    };
    notes.push('IBIT sin nominales fiables: la distribución usa el costo invertido, no el valor de mercado.');
  } else {
    ibit = {
      valueArs: 0,
      source: 'unavailable',
      detail: 'Sin posición IBIT valorable. Configurá un valor manual o cargá nominales en la cartera.',
    };
  }

  if (ibitPos.hasUnits && (!ibitQuote.price || (ibitQuote.currency === 'USD' && !usdArsRate))) {
    if (ibit.source === 'unavailable' || ibit.source === 'portfolio_cost') {
      notes.push('Falta precio de IBIT (o tipo de cambio) para valorar la posición.');
    }
  }

  // BTC directo
  const btcQty = module.btcQuantity > 0 ? module.btcQuantity : 0;
  const liveBtc =
    params.btcPrice && params.btcPrice.price > 0 && params.btcPrice.source !== 'missing'
      ? params.btcPrice
      : null;
  if (liveBtc?.fetchedAt) {
    pricesFetchedAt = pricesFetchedAt ?? liveBtc.fetchedAt;
  }

  const btcUsd = liveBtc?.price ?? module.manualBtcPriceUsd;
  let btc: BitcoinLegValue;

  if (module.manualBtcValueArs && module.manualBtcValueArs > 0 && !(btcQty > 0 && btcUsd && usdArsRate)) {
    btc = {
      valueArs: roundArs(module.manualBtcValueArs),
      source: 'manual',
      quantity: btcQty || undefined,
      detail: 'Valor BTC ingresado manualmente',
    };
  } else if (btcQty > 0 && btcUsd && btcUsd > 0 && usdArsRate && usdArsRate > 0) {
    usingLivePrices = usingLivePrices || Boolean(liveBtc);
    btc = {
      valueArs: roundArs(btcQty * btcUsd * usdArsRate),
      source: liveBtc ? 'portfolio_live' : 'manual',
      quantity: btcQty,
      unitPrice: btcUsd,
      unitCurrency: 'USD',
      detail: liveBtc
        ? `${btcQty} BTC × precio en vivo × tipo de cambio`
        : `${btcQty} BTC × precio manual × tipo de cambio`,
    };
  } else if (module.manualBtcValueArs && module.manualBtcValueArs > 0) {
    btc = {
      valueArs: roundArs(module.manualBtcValueArs),
      source: 'manual',
      quantity: btcQty || undefined,
      detail: 'Valor BTC ingresado manualmente',
    };
  } else if (btcQty > 0) {
    btc = {
      valueArs: 0,
      source: 'unavailable',
      quantity: btcQty,
      detail: 'Tenés BTC cargado, pero falta precio USD y/o tipo de cambio ARS.',
    };
    notes.push('Configurá el tipo de cambio USD/ARS (y el precio de BTC si no hay cotización).');
  } else {
    btc = {
      valueArs: 0,
      source: 'unavailable',
      detail: 'Sin BTC directo registrado.',
    };
  }

  return {
    ibit,
    btc,
    usdArsRate,
    pricesFetchedAt,
    usingLivePrices,
    notes,
  };
}
