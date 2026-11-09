import { FINANCE_APP_DATA_VERSION } from '@/lib/finance/appVersion';
import { getDefaultBitcoinModule, normalizeBitcoinModule } from '@/lib/finance/bitcoin/defaults';
import { isMonthlyPlanAnchorItem } from '@/lib/finance/monthlyInvestmentPlan';
import { normalizeMonitorStatus } from '@/lib/finance/monitor/status';
import { normalizePortfolioHoldings } from '@/lib/finance/portfolio/validateHolding';
import type { FinanceState, MonthlyInvestmentPlanItem } from '@/lib/finance/types';
import { getDefaultPreferences, normalizePreferences, withPreferences } from '@/lib/finance/preferences';

export const FINANCE_STORAGE_KEY = 'fm-finance-game-v1';
export const FINANCE_SYNC_ID_KEY = 'fm-finance-sync-id';
/** ID de fila vieja en Supabase (frase/hash) — se usa solo para recuperar datos. */
export const FINANCE_LEGACY_SYNC_ID_KEY = 'fm-finance-legacy-sync-id';
export const FINANCE_LOCAL_SAVED_AT_KEY = 'fm-finance-local-saved-at';
/** Hay cambios locales pendientes de subir a Supabase (offline / fallo de red). */
export const FINANCE_PENDING_CLOUD_PUSH_KEY = 'fm-finance-pending-cloud-push';
const FINANCE_APP_VERSION_KEY = 'fm-finance-app-version';

/**
 * Marca la versión de la app.
 * No borra el caché local: si estás offline al abrir tras un deploy,
 * seguirían apareciendo los datos del dispositivo y se sincronizan al volver la red.
 * El pull de arranque ya aplica la nube cuando hay conexión.
 */
export function ensureFinanceAppDataVersion(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const prev = window.localStorage.getItem(FINANCE_APP_VERSION_KEY);
    const changed = prev !== FINANCE_APP_DATA_VERSION;
    if (changed) window.localStorage.setItem(FINANCE_APP_VERSION_KEY, FINANCE_APP_DATA_VERSION);
    return changed;
  } catch {
    return false; // Safari en modo privado/restringido: continuar.
  }
}

/** Clave de caché de un usuario. Nunca usa el localStorage global histórico. */
export function financeScopedKey(base: string, userId: string): string {
  return `${base}:${userId}`;
}

export function isFinancePendingCloudPush(userId: string): boolean {
  if (typeof window === 'undefined' || !userId) return false;
  return window.localStorage.getItem(financeScopedKey(FINANCE_PENDING_CLOUD_PUSH_KEY, userId)) === '1';
}

export function markFinancePendingCloudPush(userId: string): void {
  if (typeof window === 'undefined' || !userId) return;
  window.localStorage.setItem(financeScopedKey(FINANCE_PENDING_CLOUD_PUSH_KEY, userId), '1');
}

export function clearFinancePendingCloudPush(userId: string): void {
  if (typeof window === 'undefined' || !userId) return;
  window.localStorage.removeItem(financeScopedKey(FINANCE_PENDING_CLOUD_PUSH_KEY, userId));
}

/** ID fijo de la fila en Supabase para esta app personal (un solo libro). */
export const DEFAULT_FINANCE_SYNC_ID = 'fernando-foco-financiero-main';

/** Filas viejas en Supabase (frase/hash) — recuperación si el canónico quedó vacío. */
export const KNOWN_LEGACY_CLOUD_IDS = [
  'cf785dd8a8f0fd292bc676da6874cf6d4cf7d17b549204ab78981514bdc837a9',
] as const;

/** Guarda el ID viejo antes de migrar al canónico (no borra datos locales). */
export function captureLegacySyncId(): void {
  if (typeof window === 'undefined') return;
  const stored = window.localStorage.getItem(FINANCE_SYNC_ID_KEY)?.trim();
  if (stored && stored !== DEFAULT_FINANCE_SYNC_ID) {
    const legacy = window.localStorage.getItem(FINANCE_LEGACY_SYNC_ID_KEY);
    if (!legacy) {
      window.localStorage.setItem(FINANCE_LEGACY_SYNC_ID_KEY, stored);
    }
  }
}

/**
 * El cliente no elige filas. La fila legacy permanece en Supabase y no se copia
 * a otra cuenta. Esta lista queda vacía a propósito.
 */
export function listCloudSyncCandidateIds(): string[] {
  return [];
}

/**
 * El navegador no elige el libro. Se conserva el helper para no reescribir
 * el id canónico en localStorage.
 */
export function getFinanceSyncId(): string {
  return DEFAULT_FINANCE_SYNC_ID;
}

export function resetFinanceSyncIdToDefault(): void {
  /* El id del libro lo resuelve el servidor a partir de la sesión. */
}

export function setFinanceSyncId(id: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(FINANCE_SYNC_ID_KEY, id);
}

export function getFinanceLocalSavedAt(userId: string): string | null {
  if (typeof window === 'undefined' || !userId) return null;
  return window.localStorage.getItem(financeScopedKey(FINANCE_LOCAL_SAVED_AT_KEY, userId));
}

/** Último `updated_at` remoto conocido tras fetch/upsert exitoso (metadata de sync, no árbitro de merge). */
export function setFinanceLocalSavedAt(userId: string, iso: string): void {
  if (typeof window === 'undefined' || !userId) return;
  window.localStorage.setItem(financeScopedKey(FINANCE_LOCAL_SAVED_AT_KEY, userId), iso);
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
    monthlyInvestmentPlan: [],
    monthlyInvestmentTargets: {},
    portfolioHoldings: [],
    bitcoin: getDefaultBitcoinModule(),
  };
}

/** `null` si este usuario no tiene caché propio. No lee `fm-finance-game-v1` sin dueño. */
export function loadFinanceState(userId: string): FinanceState | null {
  if (typeof window === 'undefined' || !userId) return null;
  try {
    const raw = window.localStorage.getItem(financeScopedKey(FINANCE_STORAGE_KEY, userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    const imported = importFinanceState(JSON.stringify(parsed));
    if (imported.ok) return withPreferences(imported.state);
    return null;
  } catch {
    return null;
  }
}

/** Persiste solo el JSON en localStorage (caché). No toca `fm-finance-local-saved-at`; eso lo actualiza la nube al sincronizar bien. */
export function saveFinanceState(userId: string, state: FinanceState): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    window.localStorage.setItem(financeScopedKey(FINANCE_STORAGE_KEY, userId), JSON.stringify(state));
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

function isMonthlyInvestmentPlanItem(x: unknown): x is MonthlyInvestmentPlanItem {
  if (typeof x !== 'object' || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    isMonthString(o.month) &&
    typeof o.label === 'string' &&
    Array.isArray(o.matchTerms) &&
    o.matchTerms.every((t) => typeof t === 'string') &&
    typeof o.createdAt === 'string' &&
    (o.referencePrice === undefined ||
      (typeof o.referencePrice === 'number' && Number.isFinite(o.referencePrice))) &&
    (o.targetUnits === undefined ||
      (typeof o.targetUnits === 'number' && Number.isFinite(o.targetUnits) && o.targetUnits > 0))
  );
}

function normalizeMonthlyInvestmentPlan(raw: unknown): MonthlyInvestmentPlanItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isMonthlyInvestmentPlanItem).filter((item) => !isMonthlyPlanAnchorItem(item));
}

export function withFinanceStateDefaults(state: FinanceState): FinanceState {
  return {
    ...state,
    monthlyInvestmentPlan: state.monthlyInvestmentPlan ?? [],
    monthlyInvestmentTargets: state.monthlyInvestmentTargets ?? {},
    portfolioHoldings: state.portfolioHoldings ?? [],
    bitcoin: normalizeBitcoinModule(state.bitcoin),
    monitorStatus: state.monitorStatus,
  };
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
      ...o,
      entries: o.entries as FinanceState['entries'],
      goals: o.goals as FinanceState['goals'],
      challenges: o.challenges as FinanceState['challenges'],
      currentMonth: o.currentMonth,
      monthlyInvestmentPlan: normalizeMonthlyInvestmentPlan(o.monthlyInvestmentPlan),
      monthlyInvestmentTargets: o.monthlyInvestmentTargets && typeof o.monthlyInvestmentTargets === 'object' && !Array.isArray(o.monthlyInvestmentTargets)
        ? Object.fromEntries(Object.entries(o.monthlyInvestmentTargets as Record<string, unknown>)
          .filter(([month, amount]) => /^\d{4}-\d{2}$/.test(month) && typeof amount === 'number' && Number.isFinite(amount) && amount > 0))
        : {},
      portfolioHoldings: normalizePortfolioHoldings(o.portfolioHoldings),
      bitcoin: normalizeBitcoinModule(
        o.bitcoin && typeof o.bitcoin === 'object'
          ? (o.bitcoin as FinanceState['bitcoin'])
          : undefined,
      ),
    };
    if (typeof o.wealthTarget === 'number' && Number.isFinite(o.wealthTarget)) {
      state.wealthTarget = o.wealthTarget;
    }
    if (o.preferences && typeof o.preferences === 'object') {
      state.preferences = normalizePreferences(o.preferences as FinanceState['preferences']);
    } else {
      state.preferences = getDefaultPreferences();
    }
    if (o.monitorStatus && typeof o.monitorStatus === 'object') {
      state.monitorStatus = normalizeMonitorStatus(o.monitorStatus);
    }

    return { ok: true, state: withPreferences(withFinanceStateDefaults(state)) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'JSON inválido.';
    return { ok: false, error: `No se pudo importar: ${msg}` };
  }
}
