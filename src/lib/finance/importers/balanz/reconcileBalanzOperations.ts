import type { FinanceEntry } from '../../types';
import { getEntryTicker } from '../../entryTicker';
import { validOperation } from './normalizeBalanzOperation';
import { balanzKey, type BalanzOperation, type ReconciledOperation } from './types';
const close = (a: number, b: number, tolerance: number) => Math.abs(a-b) <= tolerance;
export function reconcileBalanzOperations(operations: BalanzOperation[], entries: FinanceEntry[]): ReconciledOperation[] {
  const results: ReconciledOperation[] = operations.map(operation => {
    if (!validOperation(operation)) return { operation, status: 'INVALID', reason: 'Datos incompletos o inconsistentes.' };
    const exact = entries.find(e => e.importedSource?.externalId === balanzKey(operation) && e.importedSource.provider === 'balanz');
    if (exact) return { operation, status: 'ALREADY_IMPORTED', matchedEntryId: exact.id, reason: 'Este boleto ya fue importado.' };
    // Manual dates are interpreted in Argentina. Imported trade dates are date-only.
    const candidates = entries.filter(e => {
      if (e.importedSource || (e.type !== 'investment' && e.type !== 'investment_sale')) return false;
      if (getEntryTicker(e) !== operation.ticker) return false;
      if ((e.type === 'investment_sale' ? 'SELL' : 'BUY') !== operation.operationType) return false;
      const date = new Date(e.createdAt);
      const day = Number.isFinite(+date) ? new Intl.DateTimeFormat('en-CA', {timeZone:'America/Argentina/Mendoza',year:'numeric',month:'2-digit',day:'2-digit'}).format(date) : '';
      const grouped = (e.amountCurrency ?? 'ARS') === operation.currency
        && e.estimatedUnits !== undefined && e.estimatedUnits > operation.quantity
        && e.amount >= operation.grossAmount;
      return e.month === operation.tradeDate.slice(0,7) && (day === operation.tradeDate || !day || grouped);
    });
    const strong = candidates.filter(e => {
      if ((e.amountCurrency ?? 'ARS') !== operation.currency) return false;
      const amountMatches = [operation.grossAmount, Math.abs(operation.netAmount ?? operation.grossAmount)].some(a => close(e.amount, a, Math.max(1, a * .01)));
      const units = e.estimatedUnits;
      const price = e.buyPrice;
      return amountMatches && units !== undefined && close(units, operation.quantity, Math.max(1e-8, operation.quantity*1e-8))
        && price !== undefined && (e.buyCurrency ?? 'ARS') === operation.currency && close(price, operation.unitPrice, Math.max(.01, operation.unitPrice*.005));
    });
    if (strong.length === 1) return { operation, status: 'MATCHED_MANUAL', matchedEntryId: strong[0].id, candidates: strong, reason: 'Coinciden fecha, ticker, moneda, nominales, monto (hasta 1%) y precio (hasta 0,5%).' };
    if (candidates.length) return { operation, status: 'REVIEW', candidates, reason: 'Hay registros manuales compatibles. Revisá si son compras agrupadas o una operación distinta.' };
    return { operation, status: 'NEW', reason: 'No se encontró una operación compatible.' };
  });
  // A single manual investment may not silently swallow several real tickets.
  for (const r of results) if (r.status === 'MATCHED_MANUAL' && results.filter(x => x.matchedEntryId === r.matchedEntryId).length > 1) {
    r.status = 'REVIEW'; r.reason = 'Varios boletos coinciden con un registro manual. Requiere revisión.';
  }
  return results;
}
