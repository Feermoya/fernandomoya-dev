import type { FinanceState } from '@/lib/finance/types';
import { getDefaultPreferences, normalizePreferences, withPreferences } from '@/lib/finance/preferences';

export const FINANCE_STORAGE_KEY = 'fm-finance-game-v1';
export const FINANCE_SYNC_ID_KEY = 'fm-finance-sync-id';
export const FINANCE_LOCAL_SAVED_AT_KEY = 'fm-finance-local-saved-at';

/** ID fijo de la fila en Supabase para esta app personal (un solo libro). */
export const DEFAULT_FINANCE_SYNC_ID = 'fernando-foco-financiero-main';

export function getFinanceSyncId(): string {
  if (typeof window === 'undefined') return DEFAULT_FINANCE_SYNC_ID;

  const stored = window.localStorage.getItem(FINANCE_SYNC_ID_KEY);

  if (stored && stored.trim().length > 0) {
    return stored.trim();
  }

  window.localStorage.setItem(FINANCE_SYNC_ID_KEY, DEFAULT_FINANCE_SYNC_ID);
  return DEFAULT_FINANCE_SYNC_ID;
}

export function resetFinanceSyncIdToDefault(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(FINANCE_SYNC_ID_KEY, DEFAULT_FINANCE_SYNC_ID);
}

export function setFinanceSyncId(id: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(FINANCE_SYNC_ID_KEY, id);
}

export function getFinanceLocalSavedAt(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(FINANCE_LOCAL_SAVED_AT_KEY);
}

/** Último `updated_at` remoto conocido tras fetch/upsert exitoso (metadata de sync, no árbitro de merge). */
export function setFinanceLocalSavedAt(iso: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(FINANCE_LOCAL_SAVED_AT_KEY, iso);
}

function currentMonthStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function getInitialFinanceState(): FinanceState {
  return {
    entries: [],
    goals: [],
    challenges: [],
    currentMonth: currentMonthStr(),
    preferences: getDefaultPreferences(),
  };
}

export function loadFinanceState(): FinanceState {
  if (typeof window === 'undefined') {
    return getInitialFinanceState();
  }
  try {
    const raw = window.localStorage.getItem(FINANCE_STORAGE_KEY);
    if (!raw) return getInitialFinanceState();
    const parsed = JSON.parse(raw) as unknown;
    const imported = importFinanceState(JSON.stringify(parsed));
    if (imported.ok) {
      return withPreferences(imported.state);
    }
    return getInitialFinanceState();
  } catch {
    return getInitialFinanceState();
  }
}

/** Persiste solo el JSON en localStorage (caché). No toca `fm-finance-local-saved-at`; eso lo actualiza la nube al sincronizar bien. */
export function saveFinanceState(state: FinanceState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(FINANCE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota / private mode */
  }
}

export function exportFinanceState(state: FinanceState): string {
  try {
    return JSON.stringify(state, null, 2);
  } catch {
    return '{}';
  }
}

export type ImportFinanceResult =
  | { ok: true; state: FinanceState }
  | { ok: false; error: string };

function isMonthString(s: unknown): s is string {
  return typeof s === 'string' && /^\d{4}-\d{2}$/.test(s);
}

function isFinanceEntry(x: unknown): boolean {
  if (typeof x !== 'object' || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    isMonthString(o.month) &&
    typeof o.type === 'string' &&
    typeof o.amount === 'number' &&
    typeof o.createdAt === 'string'
  );
}

function isFinanceGoal(x: unknown): boolean {
  if (typeof x !== 'object' || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.name === 'string' &&
    typeof o.targetAmount === 'number' &&
    typeof o.currentAmount === 'number' &&
    typeof o.category === 'string' &&
    typeof o.createdAt === 'string'
  );
}

function isMonthlyChallenge(x: unknown): boolean {
  if (typeof x !== 'object' || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    isMonthString(o.month) &&
    typeof o.title === 'string' &&
    typeof o.targetAmount === 'number' &&
    typeof o.completed === 'boolean'
  );
}

export function importFinanceState(jsonString: string): ImportFinanceResult {
  try {
    const parsed = JSON.parse(jsonString) as unknown;
    if (typeof parsed !== 'object' || parsed === null) {
      return { ok: false, error: 'El JSON no es un objeto válido.' };
    }
    const o = parsed as Record<string, unknown>;

    if (!Array.isArray(o.entries) || !Array.isArray(o.goals) || !Array.isArray(o.challenges)) {
      return {
        ok: false,
        error: 'Faltan arrays entries, goals o challenges.',
      };
    }
    if (!isMonthString(o.currentMonth)) {
      return { ok: false, error: 'currentMonth debe ser YYYY-MM.' };
    }

    if (!o.entries.every(isFinanceEntry)) {
      return { ok: false, error: 'Hay movimientos con campos inválidos.' };
    }
    if (!o.goals.every(isFinanceGoal)) {
      return { ok: false, error: 'Hay objetivos con campos inválidos.' };
    }
    if (!o.challenges.every(isMonthlyChallenge)) {
      return { ok: false, error: 'Hay retos con campos inválidos.' };
    }

    const state: FinanceState = {
      entries: o.entries as FinanceState['entries'],
      goals: o.goals as FinanceState['goals'],
      challenges: o.challenges as FinanceState['challenges'],
      currentMonth: o.currentMonth,
    };
    if (typeof o.wealthTarget === 'number' && Number.isFinite(o.wealthTarget)) {
      state.wealthTarget = o.wealthTarget;
    }
    if (o.preferences && typeof o.preferences === 'object') {
      state.preferences = normalizePreferences(o.preferences as FinanceState['preferences']);
    } else {
      state.preferences = getDefaultPreferences();
    }

    return { ok: true, state: withPreferences(state) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'JSON inválido.';
    return { ok: false, error: `No se pudo importar: ${msg}` };
  }
}
