import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startFinanceAuthSession } from './authStartup';

const flush = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };
beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('Supabase auth initial load', () => {
  it('never registers onAuthStateChange before getSession resolves', async () => {
    let resolve!: (value: { data: { session: string }; error: null }) => void;
    const getSession = vi.fn(() => new Promise<{ data: { session: string }; error: null }>(r => { resolve = r; }));
    const unsubscribe = vi.fn();
    const subscribe = vi.fn(() => unsubscribe);
    const onSession = vi.fn();
    const stop = startFinanceAuthSession({ getSession, subscribe }, { onSession, onSlow: vi.fn(), onError: vi.fn() });
    await flush();
    expect(subscribe).not.toHaveBeenCalled();
    resolve({ data: { session: 'existing-user' }, error: null });
    await flush();
    expect(onSession).toHaveBeenCalledWith('existing-user');
    expect(subscribe).not.toHaveBeenCalled();
    vi.advanceTimersByTime(0);
    expect(subscribe).toHaveBeenCalledOnce();
    stop();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it('shows a recovery state for a stuck auth request without clearing the session', async () => {
    const onSlow = vi.fn(), onSession = vi.fn(), onError = vi.fn();
    const subscribe = vi.fn();
    const stop = startFinanceAuthSession({
      getSession: () => new Promise(() => {}),
      subscribe,
    }, { onSlow, onSession, onError }, 6500);
    await flush();
    vi.advanceTimersByTime(6500);
    expect(onSlow).toHaveBeenCalledOnce();
    expect(onSession).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(subscribe).not.toHaveBeenCalled();
    stop();
  });

  it('never updates state when the component unmounts during auth', async () => {
    let resolve!: (value: { data: { session: string }; error: null }) => void;
    const onSession = vi.fn(), subscribe = vi.fn();
    const stop = startFinanceAuthSession({
      getSession: () => new Promise(r => { resolve = r; }),
      subscribe,
    }, { onSession, onSlow: vi.fn(), onError: vi.fn() });
    await flush();
    stop();
    resolve({ data: { session: 'prior-account' }, error: null });
    await flush();
    vi.runAllTimers();
    expect(onSession).not.toHaveBeenCalled();
    expect(subscribe).not.toHaveBeenCalled();
  });

  it('handles auth retrieval failures without silently logging the user out', async () => {
    const onError = vi.fn(), onSession = vi.fn(), subscribe = vi.fn();
    const stop = startFinanceAuthSession({
      getSession: async () => { throw new Error('token refresh failed'); },
      subscribe,
    }, { onSession, onSlow: vi.fn(), onError });
    await flush();
    expect(onError).toHaveBeenCalledOnce();
    expect(onSession).not.toHaveBeenCalled();
    expect(subscribe).not.toHaveBeenCalled();
    stop();
  });

  it('continues receiving later sign-ins after a normal initial load', async () => {
    let change!: (session: string | null) => void;
    const onSession = vi.fn();
    const stop = startFinanceAuthSession({
      getSession: async () => ({ data: { session: null }, error: null }),
      subscribe: (listener) => { change = listener; return () => {}; },
    }, { onSession, onSlow: vi.fn(), onError: vi.fn() });
    await flush();
    vi.advanceTimersByTime(0);
    change('signed-in-session');
    expect(onSession).toHaveBeenCalledWith(null);
    expect(onSession).toHaveBeenCalledWith('signed-in-session');
    stop();
  });
});
