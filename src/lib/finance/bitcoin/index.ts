export type {
  FinanceBitcoinModule,
  BitcoinAllocationInput,
  BitcoinAllocationResult,
  BitcoinLegValue,
  BitcoinQuantityHint,
  BitcoinValueSource,
} from '@/lib/finance/bitcoin/types';
export {
  DEFAULT_BITCOIN_IBIT_PERCENT,
  getDefaultBitcoinModule,
  normalizeBitcoinModule,
  bitcoinTargetPercents,
} from '@/lib/finance/bitcoin/defaults';
export {
  allocateBitcoinPurchase,
  estimatePurchaseQuantities,
  roundArs,
} from '@/lib/finance/bitcoin/allocation';
export { BITCOIN_IBIT_TICKER, getIbitNetQuantity } from '@/lib/finance/bitcoin/positions';
export { valueBitcoinLegs, type BitcoinValuationSnapshot } from '@/lib/finance/bitcoin/valuation';
