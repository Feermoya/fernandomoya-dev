import type { FinanceEntry } from '../../types';
import { balanzKey, type BalanzOperation } from './types';
export function mapBalanzToFinanceEntry(o: BalanzOperation, importedAt: string): FinanceEntry {
  return {
    id: balanzKey(o), type: o.operationType === 'BUY' ? 'investment' : 'investment_sale',
    month: o.tradeDate.slice(0,7), createdAt: `${o.tradeDate}T15:00:00.000Z`,
    amount: Math.abs(o.netAmount ?? o.grossAmount), amountCurrency: o.currency,
    platform: 'Balanz', ticker: o.ticker, category: o.ticker,
    buyPrice: o.unitPrice, buyCurrency: o.currency, estimatedUnits: o.quantity,
    note: `${o.operationType === 'BUY' ? 'Compra' : 'Venta'} · Boleto ${o.ticketId}`,
    importedSource: { provider:'balanz', externalId:balanzKey(o), importedAt,
      tradeDate:o.tradeDate, settlementDate:o.settlementDate, quantity:o.quantity,
      unitPrice:o.unitPrice, currency:o.currency, operation:o.operationType,
      grossAmount:o.grossAmount, netAmount:o.netAmount, fees:o.fees },
  };
}
