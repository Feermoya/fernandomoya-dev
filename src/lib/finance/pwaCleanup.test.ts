import { describe, expect, it, vi } from 'vitest';
import { cleanupLegacyFinanceWorker, isLegacyFinanceWorkerScope } from './pwaCleanup';

const origin = 'https://www.fermoyadev.com.ar';
describe('legacy Foco service worker cleanup', () => {
  it('matches Foco but not other apps or other domains', () => {
    expect(isLegacyFinanceWorkerScope(origin+'/foco-financiero',origin)).toBe(true);
    expect(isLegacyFinanceWorkerScope(origin+'/foco-financiero/',origin)).toBe(true);
    expect(isLegacyFinanceWorkerScope(origin+'/torneos',origin)).toBe(false);
    expect(isLegacyFinanceWorkerScope(origin+'/foco-financiero-fake',origin)).toBe(false);
    expect(isLegacyFinanceWorkerScope('https://other.example/foco-financiero',origin)).toBe(false);
  });
  it('removes only the previous Foco worker', async () => {
    const remove = vi.fn(async()=>true), keep = vi.fn(async()=>true);
    const result = await cleanupLegacyFinanceWorker({
      getRegistrations: async()=>[
        {scope:origin+'/foco-financiero',unregister:remove},
        {scope:origin+'/torneos',unregister:keep},
      ],
    }, origin);
    expect(result).toBe(1); expect(remove).toHaveBeenCalledOnce(); expect(keep).not.toHaveBeenCalled();
  });
  it('does not break the page when the worker registry is blocked', async () => {
    expect(await cleanupLegacyFinanceWorker({getRegistrations:async()=>{throw Error('blocked');}},origin)).toBe(0);
  });
});
