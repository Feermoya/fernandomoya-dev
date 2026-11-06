import { afterEach, describe, expect, it, vi } from 'vitest';
import handler from '@/lib/finance/server/financeCloudHandler';

const USER_A = '11111111-1111-4111-8111-111111111111';
const USER_B = '22222222-2222-4222-8222-222222222222';
const BOOK_A = 'fernando-foco-financiero-main';
const BOOK_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function response() {
  const res = {
    code: 0,
    data: null as unknown,
    setHeader: vi.fn(),
    status(code: number) {
      res.code = code;
      return res;
    },
    json(data: unknown) {
      res.data = data;
      return res;
    },
  };
  return res;
}

function installFetch(userId: string, bookId: string, stateBody: unknown = { entries: [{ id: 'e1' }] }) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    const target = String(url);
    if (target.includes('/auth/v1/user')) {
      return Response.json({ id: userId, email: `${userId}@example.com` });
    }
    if (target.includes('/finance_profiles')) {
      expect(target).toContain(encodeURIComponent(userId));
      return Response.json([{ state_id: bookId, email: `${userId}@example.com` }]);
    }
    if (target.includes('/finance_game_state')) {
      expect(target).toContain(encodeURIComponent(`"${bookId}"`));
      if (init?.method === 'PATCH') {
        return Response.json([{ body: JSON.parse(String(init.body)).body, updated_at: '2026-11-06T12:00:00.000Z' }]);
      }
      return Response.json([{ body: stateBody, updated_at: '2026-05-16T00:21:23.089898+00:00' }]);
    }
    return new Response('unexpected', { status: 500 });
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('finance cloud aislado por sesión', () => {
  it('rechaza una lectura sin sesión y no consulta Supabase', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://example.invalid');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-test');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const res = response();
    await handler({ method: 'GET', query: { id: BOOK_A } }, res);
    expect(res.code).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('ignora el id del navegador y lee el libro del perfil', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://example.invalid');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-test');
    const fetchMock = installFetch(USER_B, BOOK_B, { entries: [] });
    vi.stubGlobal('fetch', fetchMock);
    const res = response();
    await handler(
      {
        method: 'GET',
        headers: { authorization: 'Bearer token-b' },
        query: { id: BOOK_A },
      },
      res,
    );
    expect(res.code).toBe(200);
    const stateCall = fetchMock.mock.calls.map((call) => String(call[0])).find((url) => url.includes('finance_game_state'));
    expect(stateCall).toContain(encodeURIComponent(`"${BOOK_B}"`));
    expect(stateCall).not.toContain(BOOK_A);
  });

  it('no deja que el usuario B parchee el libro de A', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://example.invalid');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-test');
    const fetchMock = installFetch(USER_B, BOOK_B);
    vi.stubGlobal('fetch', fetchMock);
    const res = response();
    await handler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer token-b' },
        body: {
          id: BOOK_A,
          state: { entries: [{ id: 'ajeno', amount: 1 }] },
          expectedUpdatedAt: '2026-05-16T00:21:23.089898+00:00',
        },
      },
      res,
    );
    expect(res.code).toBe(200);
    const patch = fetchMock.mock.calls.find((call) => call[1]?.method === 'PATCH');
    expect(String(patch?.[0])).toContain(encodeURIComponent(`"${BOOK_B}"`));
    expect(String(patch?.[0])).not.toContain(BOOK_A);
    expect(String(patch?.[0])).toContain('updated_at=eq.');
  });

  it('no escribe si falta la versión remota', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://example.invalid');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-test');
    const fetchMock = installFetch(USER_A, BOOK_A);
    vi.stubGlobal('fetch', fetchMock);
    const res = response();
    await handler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer token-a' },
        body: { state: { entries: [] } },
      },
      res,
    );
    expect(res.code).toBe(409);
    expect(fetchMock.mock.calls.some((call) => call[1]?.method === 'PATCH')).toBe(false);
  });

  it('usa el libro de app_metadata e ignora uno puesto en user_metadata', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://example.invalid');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-test');
    const fetchMock = vi.fn(async (url: string) => {
      const target = String(url);
      if (target.includes('/auth/v1/user')) {
        return Response.json({
          id: USER_B,
          email: 'b@example.com',
          app_metadata: { finance_state_id: BOOK_B },
          user_metadata: { finance_state_id: BOOK_A, must_set_password: true },
        });
      }
      if (target.includes('/finance_profiles')) {
        throw new Error('no debería consultar perfiles si el libro ya viene en la sesión');
      }
      if (target.includes('/finance_game_state')) {
        expect(target).toContain(encodeURIComponent(`"${BOOK_B}"`));
        expect(target).not.toContain(BOOK_A);
        return Response.json([{ body: { entries: [] }, updated_at: '2026-11-06T00:00:00.000Z' }]);
      }
      return new Response('unexpected', { status: 500 });
    });
    vi.stubGlobal('fetch', fetchMock);
    const res = response();
    await handler({ method: 'GET', headers: { authorization: 'Bearer token-b' }, query: { id: BOOK_A } }, res);
    expect(res.code).toBe(200);
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes('finance_profiles'))).toBe(false);
  });

  it('responde 403 si la cuenta no tiene perfil', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://example.invalid');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-test');
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (String(url).includes('/auth/v1/user')) return Response.json({ id: USER_B, email: 'b@example.com' });
        if (String(url).includes('/finance_profiles')) return Response.json([]);
        return new Response('no', { status: 500 });
      }),
    );
    const res = response();
    await handler({ method: 'GET', headers: { authorization: 'Bearer token-b' }, query: { id: BOOK_A } }, res);
    expect(res.code).toBe(403);
    expect((res.data as { code?: string }).code).toBe('profile_missing');
  });
});
