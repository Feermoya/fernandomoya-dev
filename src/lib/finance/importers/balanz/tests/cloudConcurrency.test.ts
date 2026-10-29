import { describe,it,expect,vi,afterEach } from 'vitest';
// The legacy Vercel handler is JavaScript and intentionally remains framework-independent.
// @ts-ignore no separate declaration file for Vercel JS API
import handler from '../../../../../../api/finance-cloud.mjs';
function res(){const r={code:0,data:null as any,setHeader:vi.fn(),status(c:number){r.code=c;return r;},json(d:unknown){r.data=d;return r;}};return r;}
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
describe('all normal saves must use a conditional update',()=>{
 it('rejects old clients without a remote version',async()=>{vi.stubEnv('FINANCE_SUPABASE_URL','https://example.invalid');vi.stubEnv('FINANCE_SUPABASE_ANON_KEY','test');const fetch=vi.fn();vi.stubGlobal('fetch',fetch);const r=res();await handler({method:'POST',body:{state:{entries:[]}}},r);expect(r.code).toBe(409);expect(fetch).not.toHaveBeenCalled();});
 it('does not overwrite an imported record after the remote version changes',async()=>{vi.stubEnv('FINANCE_SUPABASE_URL','https://example.invalid');vi.stubEnv('FINANCE_SUPABASE_ANON_KEY','test');const fetch=vi.fn().mockResolvedValue(Response.json([]));vi.stubGlobal('fetch',fetch);const r=res();await handler({method:'POST',body:{state:{entries:[]},expectedUpdatedAt:'2026-10-01T00:00:00Z'}},r);expect(r.code).toBe(409);expect(fetch.mock.calls[0][1].method).toBe('PATCH');expect(fetch.mock.calls[0][0]).toContain('updated_at=eq.');expect(fetch.mock.calls[0][0]).not.toContain('limit=');});
});
