import type { FinanceState } from '../../types';
import { mapBalanzToFinanceEntry } from './mapBalanzToFinanceEntry';
import { reconcileBalanzOperations } from './reconcileBalanzOperations';
import { balanzKey, type BalanzOperation } from './types';
export type BalanzSelection = { key: string; distinctReviewed?: boolean };
/** Pure append: preserves every existing record and every unrelated state field. */
export function buildBalanzImportBatch(state: FinanceState, operations: BalanzOperation[], selections: BalanzSelection[], now: string) {
  if (!Array.isArray(operations) || !operations.length || operations.length > 500 || !Array.isArray(selections)) throw new Error('Lote inválido.');
  if (new Set(operations.map(balanzKey)).size !== operations.length || new Set(selections.map(s=>s.key)).size !== selections.length) throw new Error('El lote contiene boletos o selecciones repetidos.');
  const reconciliation = reconcileBalanzOperations(operations, state.entries);
  if (selections.some(s => !operations.some(o => balanzKey(o) === s.key))) throw new Error('Selección desconocida.');
  const selected = new Map(selections.map(s=>[s.key,s]));
  const accepted = reconciliation.filter(r => {
    const choice = selected.get(balanzKey(r.operation));
    if (!choice) return false;
    if (r.status === 'INVALID') throw new Error('La selección contiene operaciones inválidas.');
    if (r.status === 'ALREADY_IMPORTED' || r.status === 'MATCHED_MANUAL') return false;
    if (r.status === 'REVIEW' && choice.distinctReviewed !== true) throw new Error('Hay operaciones que requieren revisión.');
    return true;
  });
  const added = accepted.map(r=>mapBalanzToFinanceEntry(r.operation,now));
  if (added.some(e=>state.entries.some(old=>old.id === e.id))) throw new Error('Identificador existente. Revisá el historial.');
  return { state: { ...state, entries: [...state.entries, ...added] }, added, reconciliation,
    omitted: reconciliation.filter(r=>r.status==='ALREADY_IMPORTED'||r.status==='MATCHED_MANUAL').length };
}
