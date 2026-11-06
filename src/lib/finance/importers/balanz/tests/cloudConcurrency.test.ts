import { afterEach, describe, expect, it, vi } from 'vitest';
import handler from '@/lib/finance/server/financeCloudHandler';

function res() {
  const result = {
    code: 0,
    data: null as unknown,
    setHeader: vi.fn(),
    status(code: number) {
      result.code = code;
      return result;
    },
    json(data: unknown) {
      result.data = data;
      return result;
    },
  };
  return result;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('all normal saves must use a conditional update', () => {
  it('rejects a save without a session before touching Supabase', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://example.invalid');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const result = res();
    await handler({ method: 'POST', body: { state: { entries: [] } } }, result);
    expect(result.code).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not overwrite an imported record after the remote version changes', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://example.invalid');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test');
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const target = String(url);
      if (target.includes('/auth/v1/user')) {
        return Response.json({ id: '11111111-1111-4111-8111-111111111111', email: 'a@example.com' });
      }
      if (target.includes('/finance_profiles')) {
        return Response.json([{ state_id: 'book-a', email: 'a@example.com' }]);
      }
      if (init?.method === 'PATCH') return Response.json([]);
      return Response.json([{ body: { entries: [] }, updated_at: '2026-10-01T00:00:00Z' }]);
    });
    vi.stubGlobal('fetch', fetchMock);
    const result = res();
    await handler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer token' },
        body: { state: { entries: [] }, expectedUpdatedAt: '2026-10-01T00:00:00Z' },
      },
      result,
    );
    expect(result.code).toBe(409);
    const patch = fetchMock.mock.calls.find((call) => call[1]?.method === 'PATCH');
    expect(String(patch?.[0])).toContain('updated_at=eq.');
    expect(String(patch?.[0])).not.toContain('limit=');
  });
});
