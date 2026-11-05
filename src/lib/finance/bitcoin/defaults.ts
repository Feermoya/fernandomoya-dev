import type { FinanceBitcoinModule } from '@/lib/finance/bitcoin/types';

export const DEFAULT_BITCOIN_IBIT_PERCENT = 65;

export function getDefaultBitcoinModule(): FinanceBitcoinModule {
  return {
    targetIbitPercent: DEFAULT_BITCOIN_IBIT_PERCENT,
    btcQuantity: 0,
  };
}

export function normalizeBitcoinModule(raw?: FinanceBitcoinModule | null): FinanceBitcoinModule {
  const base = getDefaultBitcoinModule();
  if (!raw || typeof raw !== 'object') return base;

  const target = Number(raw.targetIbitPercent);
  const targetIbitPercent =
    Number.isFinite(target) && target >= 0 && target <= 100
      ? Math.round(target * 100) / 100
      : base.targetIbitPercent;

  const qty = Number(raw.btcQuantity);
  const btcQuantity = Number.isFinite(qty) && qty >= 0 ? qty : 0;

  const optPositive = (v: unknown): number | undefined => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };

  return {
    targetIbitPercent,
    btcQuantity,
    manualIbitValueArs: optPositive(raw.manualIbitValueArs),
    manualBtcValueArs: optPositive(raw.manualBtcValueArs),
    manualIbitPriceArs: optPositive(raw.manualIbitPriceArs),
    manualBtcPriceUsd: optPositive(raw.manualBtcPriceUsd),
    manualUsdArsRate: optPositive(raw.manualUsdArsRate),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined,
  };
}

export function bitcoinTargetPercents(module: FinanceBitcoinModule): {
  ibit: number;
  btc: number;
} {
  const ibit = Math.min(100, Math.max(0, module.targetIbitPercent));
  return { ibit, btc: Math.round((100 - ibit) * 100) / 100 };
}
