import type { FinanceEntry } from '../../types';
export type BalanzOperation = {
  source: 'balanz'; ticketId: string; operationType: 'BUY' | 'SELL'; ticker: string;
  tradeDate: string; settlementDate?: string; quantity: number; unitPrice: number;
  currency: 'ARS' | 'USD'; grossAmount: number; netAmount?: number; fees?: number;
  rawDescription: string;
};
export type ReconciliationStatus = 'NEW' | 'ALREADY_IMPORTED' | 'MATCHED_MANUAL' | 'REVIEW' | 'INVALID';
export type ReconciledOperation = {
  operation: BalanzOperation; status: ReconciliationStatus; matchedEntryId?: string;
  candidates?: FinanceEntry[]; reason: string;
};
export type BalanzParseResult = { operations: BalanzOperation[]; ignored: number; warnings: string[] };
export function balanzKey(o: BalanzOperation): string {
  return `balanz:${o.ticketId}:${o.ticker}:${o.operationType}`;
}
