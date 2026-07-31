/**
 * Tipos de cartera inicial / histórica.
 * No son movimientos mensuales: no afectan objetivo, racha ni niveles.
 */

export type FinancePortfolioCurrency = 'ARS' | 'USD';

export type FinancePortfolioHoldingSource = 'manual' | 'csv';

export type FinancePortfolioHolding = {
  id: string;
  ticker: string;
  displayName?: string;
  quantity: number;
  averagePurchasePrice: number;
  currency: FinancePortfolioCurrency;
  broker?: string;
  purchaseDate?: string;
  market?: string;
  notes?: string;
  source: FinancePortfolioHoldingSource;
  createdAt: string;
  updatedAt: string;
};

export type ConsolidatedPositionSourceFlags = {
  entries: boolean;
  historicalHoldings: boolean;
};

export type ConsolidatedPosition = {
  ticker: string;
  /** Solo si hay cantidad confiable (holdings o estimatedUnits). */
  quantity?: number;
  investedAmountByCurrency: Record<string, number>;
  /** Promedio ponderado cuando hay unidades + precio en una sola moneda. */
  averagePurchasePrice?: number;
  currency?: string;
  displayName?: string;
  sources: ConsolidatedPositionSourceFlags;
  /** Limitación explícita si no se puede unificar. */
  limitation?: string;
};

export type PortfolioDuplicateStrategy = 'combine' | 'replace' | 'ignore';

export type FinanceSymbolSearchResult = {
  symbol: string;
  name: string;
  exchange?: string;
  type?: string;
  currency?: string;
  market?: string;
};

export type TickerQuoteStatus =
  | 'available'
  | 'delayed'
  | 'unavailable'
  | 'temporary_error';
