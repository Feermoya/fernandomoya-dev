import { useRef, useState } from 'react';
import { FileUp, LoaderCircle } from 'lucide-react';
import { fetchFinanceRemote, type RemoteFinanceRow } from '@/lib/finance/cloudSync';
import type { FinanceState } from '@/lib/finance/types';
import { importFinanceState } from '@/lib/finance/storage';
import { parseBalanzPdf } from '@/lib/finance/importers/balanz/parseBalanzPdf';
import { reconcileBalanzOperations } from '@/lib/finance/importers/balanz/reconcileBalanzOperations';
import { balanzKey, type BalanzParseResult, type ReconciledOperation } from '@/lib/finance/importers/balanz/types';
import { formatEntryAmount } from '@/lib/finance/calculations';
const labels = { NEW:'Nueva', ALREADY_IMPORTED:'Ya importada', MATCHED_MANUAL:'Ya registrada', REVIEW:'Revisión', INVALID:'Inválida' };
type Props = { disabled?: boolean; onBusyChange?: (busy: boolean) => void; onImported: (state: FinanceState, iso: string) => void };
export function FinanceBalanzImporter({ disabled, onImported, onBusyChange }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [parsed,setParsed] = useState<BalanzParseResult|null>(null);
  const [remote,setRemote] = useState<RemoteFinanceRow|null>(null);
  const [rows,setRows] = useState<ReconciledOperation[]>([]);
  const [selected,setSelected] = useState<Set<string>>(new Set());
  const [reviewed,setReviewed] = useState<Set<string>>(new Set());
  const [done,setDone] = useState('');
  const [doneMonth,setDoneMonth] = useState('');
  async function refresh(data: BalanzParseResult) {
    const latest = await fetchFinanceRemote();
    if (!latest) throw new Error('No hay historial remoto disponible. No se importará nada.');
    const next = reconcileBalanzOperations(data.operations,latest.state.entries);
    setRemote(latest);setRows(next);setReviewed(new Set());
    setSelected(new Set(next.filter(r=>r.status==='NEW').map(r=>balanzKey(r.operation))));
  }
  async function load(file?: File) {
    if (!file) return;
    setBusy(true);onBusyChange?.(true);setError('');setDone('');setParsed(null);setRows([]);setSelected(new Set());
    try { const data = await parseBalanzPdf(file); await refresh(data); setParsed(data); }
    catch(e) {setError(e instanceof Error ? e.message : 'No se pudo leer el PDF.');}
    finally {setBusy(false);onBusyChange?.(false); if(input.current)input.current.value='';}
  }
  async function commit() {
    if (!parsed || !remote || disabled || !selected.size) return;
    setBusy(true);onBusyChange?.(true);setError('');
    try {
      // A fresh read is mandatory immediately before submission. Any change requires a new review.
      const latest = await fetchFinanceRemote();
      if (!latest || latest.updatedAt !== remote.updatedAt) {
        await refresh(parsed); throw new Error('El historial cambió. Revisá la lista actualizada y volvé a confirmar.');
      }
      const response = await fetch('/api/finance-balanz',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({expectedUpdatedAt:latest.updatedAt,operations:parsed.operations,selections:[...selected].map(key=>({key,distinctReviewed:reviewed.has(key)}))})});
      const result = await response.json();
      if (!response.ok || !result.ok) {
        if(response.status===409)await refresh(parsed);
        throw new Error(result.error || 'Supabase no confirmó el guardado.');
      }
      const validated = importFinanceState(JSON.stringify(result.row.body));
      if (!validated.ok) throw new Error('La respuesta guardada no pasó la validación. Consultá el historial antes de reintentar.');
      setRemote({state:validated.state,updatedAt:result.row.updated_at});
      onImported(validated.state,result.row.updated_at);
      const buys = result.added.filter((e: {type:string})=>e.type==='investment').length;
      const sells = result.added.length-buys;
      setDone(`${buys} compras agregadas. ${sells} ventas registradas. ${result.omitted} operaciones omitidas por duplicación.`);
      setDoneMonth(parsed.operations[0]?.tradeDate.slice(0,7) ?? '');
      setRows(reconcileBalanzOperations(parsed.operations,validated.state.entries));setSelected(new Set());
    } catch(e) {setError(e instanceof Error ? e.message : 'Error de importación.');}
    finally {setBusy(false);onBusyChange?.(false);}
  }
  return <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
    <input ref={input} className="sr-only" type="file" accept=".pdf,application/pdf" aria-label="Seleccionar PDF de Balanz" disabled={busy||disabled} onChange={e=>void load(e.target.files?.[0])}/>
    <button type="button" disabled={busy||disabled} onClick={()=>input.current?.click()} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-800 disabled:opacity-50">
      {busy?<LoaderCircle size={18} className="animate-spin"/>:<FileUp size={18}/>} {busy?'Procesando…':'Importar PDF de Balanz'}
    </button>
    <p className="mt-2 text-xs text-slate-500">El PDF se procesa en tu dispositivo. Revisá las operaciones antes de guardar.</p>
    {error&&<p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {done&&<div role="status" className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">Importación completada. {done}
      {doneMonth&&<button type="button" className="mt-2 block min-h-11 font-bold underline" onClick={()=>{if(remote)onImported({...remote.state,currentMonth:doneMonth},remote.updatedAt);}}>Ver {doneMonth}</button>}
    </div>}
    {parsed&&<details open className="mt-3">
      <summary className="cursor-pointer text-sm font-bold">Revisar operaciones ({rows.length})</summary>
      <p className="mt-2 text-xs text-slate-600">{rows.filter(r=>r.operation.operationType==='BUY').length} compras · {rows.filter(r=>r.operation.operationType==='SELL').length} ventas</p>
      <p className="text-xs text-slate-600">{rows.filter(r=>r.status==='NEW').length} nuevas · {rows.filter(r=>['ALREADY_IMPORTED','MATCHED_MANUAL'].includes(r.status)).length} registradas · {rows.filter(r=>r.status==='REVIEW').length} para revisar</p>
      <p className="mt-2 text-xs text-slate-500">{parsed.ignored} saldos y otros movimientos excluidos. Compras en USD y ventas no suman al objetivo en ARS. Los importes de compras incluyen gastos cuando el neto está disponible, no equivalen necesariamente a aportes de dinero nuevo.</p>
      {parsed.warnings.map(w=><p key={w} className="mt-1 text-xs text-amber-800">{w}</p>)}
      <ul className="mt-3 max-h-96 space-y-2 overflow-y-auto">
        {rows.map(r=>{const o=r.operation;const key=balanzKey(o);const blocked=['ALREADY_IMPORTED','MATCHED_MANUAL','INVALID'].includes(r.status);return <li key={key} className="min-w-0 rounded-xl border border-slate-200 p-3 text-xs">
          <label className="flex min-h-11 items-start gap-2">
            <input type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={selected.has(key)} disabled={busy||blocked||(r.status==='REVIEW'&&!reviewed.has(key))} onChange={e=>setSelected(prev=>{const next=new Set(prev);e.target.checked?next.add(key):next.delete(key);return next;})}/>
            <span className="min-w-0 break-words"><strong>{o.ticker} · {o.operationType==='BUY'?'Compra':'Venta'}</strong> · {o.tradeDate}<br/>{o.quantity.toLocaleString('es-AR',{maximumFractionDigits:8})} nominales · {formatEntryAmount(Math.abs(o.netAmount??o.grossAmount),o.currency)}<br/>Precio: {o.unitPrice.toLocaleString('es-AR',{maximumFractionDigits:10})} {o.currency}<br/>Boleto {o.ticketId} · {labels[r.status]}</span>
          </label>
          <p className="mt-1 text-slate-500">{r.reason}</p>
          {r.candidates?.map(e=><p key={e.id} className="mt-1 rounded bg-slate-50 p-2">Registro actual: {e.ticker??e.category} · {e.createdAt.slice(0,10)} · {formatEntryAmount(e.amount,e.amountCurrency)} · {e.estimatedUnits??'sin cantidad'} nominales</p>)}
          {r.status==='REVIEW'&&<label className="mt-2 flex min-h-11 items-center gap-2"><input type="checkbox" disabled={busy} checked={reviewed.has(key)} onChange={e=>{setReviewed(prev=>{const next=new Set(prev);e.target.checked?next.add(key):next.delete(key);return next;});if(!e.target.checked)setSelected(prev=>{const next=new Set(prev);next.delete(key);return next;});}}/>Revisé los registros. Esta es una operación distinta.</label>}
        </li>;})}
      </ul>
      <button type="button" disabled={busy||disabled||!selected.size} onClick={()=>void commit()} className="mt-3 min-h-11 w-full rounded-xl bg-blue-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">Importar seleccionadas ({selected.size})</button>
      <button type="button" disabled={busy} className="mt-2 min-h-11 w-full text-xs font-bold text-slate-600" onClick={()=>{setBusy(true);onBusyChange?.(true);void refresh(parsed).catch(e=>setError(e.message)).finally(()=>{setBusy(false);onBusyChange?.(false);});}}>Actualizar revisión desde Supabase</button>
    </details>}
  </div>;
}
