export type {
  ConsolidatedPosition,
  FinancePortfolioCurrency,
  FinancePortfolioHolding,
  FinancePortfolioHoldingSource,
  FinanceSymbolSearchResult,
  PortfolioDuplicateStrategy,
  TickerQuoteStatus,
} from '@/lib/finance/portfolio/types';

export {
  findHoldingByTickerCurrency,
  holdingKey,
  isBalanzManagedHolding,
  mergePortfolioHoldings,
  replaceBrokerPortfolioHoldings,
  type MergeHoldingsResult,
} from '@/lib/finance/portfolio/mergeHoldings';

export {
  isFinancePortfolioHolding,
  normalizeAndValidateHolding,
  normalizePortfolioHoldings,
  weightedAveragePrice,
  type HoldingValidationError,
  type HoldingValidationResult,
} from '@/lib/finance/portfolio/validateHolding';

export {
  buildConsolidatedPortfolio,
  getTrackedTickersFromPortfolio,
} from '@/lib/finance/portfolio/consolidate';

export {
  holdingsFromCsvPreview,
  isSpreadsheetFile,
  parseCsvText,
  parsePortfolioCsv,
  portfolioSpreadsheetToCsvText,
  type CsvParseResult,
  type CsvRowPreview,
} from '@/lib/finance/portfolio/csvImport';

export {
  buildPortfolioHoldingViews,
  filterPortfolioViews,
  sortMarketAlertsForDisplay,
  sortPortfolioViews,
  summarizePortfolioViews,
} from '@/lib/finance/portfolio/portfolioView';


export { searchFinanceSymbols } from '@/lib/finance/portfolio/symbolSearch';
export { searchFinanceSymbolsClient } from '@/lib/finance/portfolio/symbolSearchClient';
