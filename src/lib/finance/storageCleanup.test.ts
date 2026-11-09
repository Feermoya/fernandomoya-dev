import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  FINANCE_STORAGE_KEY, FINANCE_LOCAL_SAVED_AT_KEY, FINANCE_PENDING_CLOUD_PUSH_KEY,
  clearLegacyFinanceCacheAfterCloudRead, financeScopedKey,
} from './storage';

afterEach(() => vi.unstubAllGlobals());

function createStorage() {
  const map = new Map<string, string>();
  const store = {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => { map.set(key, value); },
    removeItem: (key: string) => { map.delete(key); },
  };
  vi.stubGlobal('window', { localStorage: store });
  return store;
}

describe('cleanup of legacy financial data only after cloud confirmation', () => {
  it('removes user-scoped financial cache without touching the auth session', () => {
    const storage = createStorage();
    storage.setItem(financeScopedKey(FINANCE_STORAGE_KEY, 'brother'), '{"entries":[]}');
    storage.setItem(financeScopedKey(FINANCE_LOCAL_SAVED_AT_KEY, 'brother'), '2026-01-01');
    storage.setItem('fm-finance-auth', 'auth-session');
    clearLegacyFinanceCacheAfterCloudRead('brother');
    expect(storage.getItem(financeScopedKey(FINANCE_STORAGE_KEY, 'brother'))).toBeNull();
    expect(storage.getItem(financeScopedKey(FINANCE_LOCAL_SAVED_AT_KEY, 'brother'))).toBeNull();
    expect(storage.getItem('fm-finance-auth')).toBe('auth-session');
  });

  it('preserves a legacy offline draft when an unsynced marker exists', () => {
    const storage = createStorage();
    const key = financeScopedKey(FINANCE_STORAGE_KEY, 'owner');
    storage.setItem(key, 'important-legacy-draft');
    storage.setItem(financeScopedKey(FINANCE_PENDING_CLOUD_PUSH_KEY, 'owner'), '1');
    clearLegacyFinanceCacheAfterCloudRead('owner');
    expect(storage.getItem(key)).toBe('important-legacy-draft');
  });

  it('never touches another account', () => {
    const storage = createStorage();
    const key = financeScopedKey(FINANCE_STORAGE_KEY, 'brother');
    storage.setItem(key, 'brother-data');
    clearLegacyFinanceCacheAfterCloudRead('owner');
    expect(storage.getItem(key)).toBe('brother-data');
  });
});
