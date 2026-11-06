import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import handler from '../../../../../../scripts/finance-api/finance-balanz.entry';
import { parseBalanzOperations } from '../parseBalanzOperations';
import { balanzKey } from '../types';
import { getInitialFinanceState } from '../../../storage';

const USER = '11111111-1111-4111-8111-111111111111';
const BOOK = 'book-user-a';
const op = parseBalanzOperations(
  'BALANZ\nCuenta Corriente por Concertación\nBoleto / 999 / COMPRA / 0 / TEST / $ 2,00 2,00 100,0000000000 200,00 0,00 0,00 0,00 0,00 -200,00 1/9/2026 1/9/2026',
).operations[0];
const row = { body: getInitialFinanceState(), updated_at: '2026-10-01T00:00:00Z' };

function request(overrides: Record<string, unknown> = {}) {
  return {
    method: 'POST',
    headers: { authorization: 'Bearer session-token' },
    body: {
      expectedUpdatedAt: row.updated_at,
      operations: [op],
      selections: [{ key: balanzKey(op) }],
    },
    ...overrides,
  };
}

function response() {
  const res = {
    code: 0,
    data: null as { ok?: boolean; added?: unknown[] } | null,
    setHeader: vi.fn(),
    status(code: number) {
      res.code = code;
      return res;
    },
    json(data: unknown) {
      res.data = data as { ok?: boolean; added?: unknown[] } | null;
      return res;
    },
  };
  return res;
}

function route(state: (url: string, init?: RequestInit) => Promise<Response> | Response) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    const target = String(url);
    if (target.includes('/auth/v1/user')) return Response.json({ id: USER, email: 'a@example.com' });
    if (target.includes('/finance_profiles')) return Response.json([{ state_id: BOOK, email: 'a@example.com' }]);
    expect(target).not.toContain('fernando-foco-financiero-main');
    return state(target, init);
  });
}

beforeEach(() => {
  vi.stubEnv('FINANCE_BALANZ_IMPORT_ENABLED', 'true');
  vi.stubEnv('SUPABASE_URL', 'https://example.invalid');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-test');
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('atomic Balanz API', () => {
  it('requires a finance session', async () => {
    const res = response();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await handler(request({ headers: {} }), res);
    expect(res.code).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns 401 when the token is rejected', async () => {
    const res = response();
    const fetchMock = vi.fn(async () => new Response('{}', { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);
    await handler(request(), res);
    expect(res.code).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects cross-site submission', async () => {
    const res = response();
    await handler(request({ headers: { authorization: 'Bearer session-token', 'sec-fetch-site': 'cross-site' } }), res);
    expect(res.code).toBe(403);
  });

  it('keeps writes disabled until backup verification', async () => {
    vi.stubEnv('FINANCE_BALANZ_IMPORT_ENABLED', 'false');
    const res = response();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await handler(request(), res);
    expect(res.code).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports Supabase read failures without writing', async () => {
    const fetchMock = route(() => new Response('', { status: 503 }));
    vi.stubGlobal('fetch', fetchMock);
    const res = response();
    await handler(request(), res);
    expect(res.code).toBe(502);
    expect(fetchMock.mock.calls.some((call) => call[1]?.method === 'PATCH')).toBe(false);
  });

  it('rejects stale previews', async () => {
    const fetchMock = route(() => Response.json([{ ...row, updated_at: 'new' }]));
    vi.stubGlobal('fetch', fetchMock);
    const res = response();
    await handler(request(), res);
    expect(res.code).toBe(409);
    expect(fetchMock.mock.calls.some((call) => call[1]?.method === 'PATCH')).toBe(false);
  });

  it('handles a concurrent writer between read and PATCH', async () => {
    const fetchMock = route((url, init) => {
      if (init?.method === 'PATCH') return Response.json([]);
      expect(url).toContain(encodeURIComponent(`"${BOOK}"`));
      return Response.json([row]);
    });
    vi.stubGlobal('fetch', fetchMock);
    const res = response();
    await handler(request(), res);
    expect(res.code).toBe(409);
    const patch = fetchMock.mock.calls.find((call) => call[1]?.method === 'PATCH');
    expect(String(patch?.[0])).toContain('updated_at=eq.');
    expect(String(patch?.[0])).toContain(encodeURIComponent(`"${BOOK}"`));
    expect(String(patch?.[0])).not.toContain('limit=');
  });

  it('reports write failure without success', async () => {
    vi.stubGlobal(
      'fetch',
      route((_url, init) => (init?.method === 'PATCH' ? new Response('', { status: 500 }) : Response.json([row]))),
    );
    const res = response();
    await handler(request(), res);
    expect(res.code).toBe(502);
    expect(res.data?.ok).toBe(false);
  });

  it('returns only confirmed state, preserving all fields', async () => {
    const original = { ...row, body: { ...row.body, untouched: { value: 1 } } };
    let saved: { body: { untouched?: { value: number }; goals?: unknown } } | undefined;
    const fetchMock = route((_url, init) => {
      if (init?.method === 'PATCH') {
        saved = JSON.parse(String(init.body));
        return Response.json([{ body: saved?.body, updated_at: 'new' }]);
      }
      return Response.json([original]);
    });
    vi.stubGlobal('fetch', fetchMock);
    const res = response();
    await handler(request(), res);
    expect(res.code).toBe(200);
    expect(res.data?.added).toHaveLength(1);
    expect(saved?.body.untouched).toEqual({ value: 1 });
    expect(saved?.body.goals).toEqual(original.body.goals);
  });
});
