import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/panel/auth',()=>({PANEL_SESSION_COOKIE:'fm_panel_session',verifyPanelSessionToken:(s:string)=>s==='valid'}));
import handler from '../../../../../../api/finance-balanz.entry';
import { parseBalanzOperations } from '../parseBalanzOperations';
import { balanzKey } from '../types';
import { getInitialFinanceState } from '../../../storage';
const op=parseBalanzOperations('BALANZ\nCuenta Corriente por Concertación\nBoleto / 999 / COMPRA / 0 / TEST / $ 2,00 2,00 100,0000000000 200,00 0,00 0,00 0,00 0,00 -200,00 1/9/2026 1/9/2026').operations[0];
const row={body:getInitialFinanceState(),updated_at:'2026-10-01T00:00:00Z'};
function request(overrides:Record<string,unknown>={}){return {method:'POST',headers:{cookie:'fm_panel_session=valid'},body:{expectedUpdatedAt:row.updated_at,operations:[op],selections:[{key:balanzKey(op)}]},...overrides};}
function response(){const res={code:0,data:null as any,setHeader:vi.fn(),status(code:number){res.code=code;return res;},json(data:unknown){res.data=data;return res;}};return res;}
beforeEach(()=>{vi.stubEnv('FINANCE_BALANZ_IMPORT_ENABLED','true');vi.stubEnv('FINANCE_SUPABASE_URL','https://example.invalid');vi.stubEnv('FINANCE_SUPABASE_ANON_KEY','test');});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
describe('atomic Balanz API',()=>{
 it('requires a signed panel session',async()=>{const res=response();const fetch=vi.fn();vi.stubGlobal('fetch',fetch);await handler(request({headers:{}}),res);expect(res.code).toBe(401);expect(fetch).not.toHaveBeenCalled();});
 it('rejects cross-site submission',async()=>{const res=response();await handler(request({headers:{cookie:'fm_panel_session=valid','sec-fetch-site':'cross-site'}}),res);expect(res.code).toBe(403);});
 it('keeps writes disabled until backup verification',async()=>{vi.stubEnv('FINANCE_BALANZ_IMPORT_ENABLED','false');const res=response();await handler(request(),res);expect(res.code).toBe(503);});
 it('reports Supabase read failures without writing',async()=>{const fetch=vi.fn().mockResolvedValue(new Response('',{status:503}));vi.stubGlobal('fetch',fetch);const res=response();await handler(request(),res);expect(res.code).toBe(502);expect(fetch).toHaveBeenCalledTimes(1);});
 it('rejects stale previews',async()=>{const fetch=vi.fn().mockResolvedValue(Response.json([{...row,updated_at:'new'}]));vi.stubGlobal('fetch',fetch);const res=response();await handler(request(),res);expect(res.code).toBe(409);expect(fetch).toHaveBeenCalledTimes(1);});
 it('handles a concurrent writer between read and PATCH',async()=>{const fetch=vi.fn().mockResolvedValueOnce(Response.json([row])).mockResolvedValueOnce(Response.json([]));vi.stubGlobal('fetch',fetch);const res=response();await handler(request(),res);expect(res.code).toBe(409);expect(fetch.mock.calls[1][1].method).toBe('PATCH');expect(fetch.mock.calls[1][0]).toContain('updated_at=eq.');expect(fetch.mock.calls[1][0]).not.toContain('limit=');});
 it('reports write failure without success',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(Response.json([row])).mockResolvedValueOnce(new Response('',{status:500})));const res=response();await handler(request(),res);expect(res.code).toBe(502);expect(res.data.ok).toBe(false);});
 it('returns only confirmed state, preserving all fields',async()=>{const original={...row,body:{...row.body,untouched:{value:1}}};let saved:any;const fetch=vi.fn().mockResolvedValueOnce(Response.json([original])).mockImplementationOnce(async(_url,init)=>{saved=JSON.parse(init.body);return Response.json([{body:saved.body,updated_at:'new'}]);});vi.stubGlobal('fetch',fetch);const res=response();await handler(request(),res);expect(res.code).toBe(200);expect(res.data.added).toHaveLength(1);expect(saved.body.untouched).toEqual({value:1});expect(saved.body.goals).toEqual(original.body.goals);});
});
