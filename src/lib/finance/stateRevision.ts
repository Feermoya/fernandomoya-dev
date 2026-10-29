import type { FinanceState } from './types';
/** Per-snapshot, per-tab version. Never borrow a newer version from localStorage or another read. */
const revisions = new WeakMap<FinanceState,string>();
export function markStateRevision(state: FinanceState, revision: string): void { revisions.set(state,revision); }
export function stateRevision(state: FinanceState): string | null { return revisions.get(state) ?? null; }
