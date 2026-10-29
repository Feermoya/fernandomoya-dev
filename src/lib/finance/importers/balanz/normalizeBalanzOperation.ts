import type { BalanzOperation } from './types';
export function argentineNumber(raw: string): number {
  if (!/^-?(?:\d{1,3}(?:\.\d{3})*|\d+),\d+$/.test(raw.trim())) throw new Error('Importe argentino inválido.');
  const n = Number(raw.trim().replace(/\./g, '').replace(',', '.'));
  if (!Number.isFinite(n)) throw new Error('Importe fuera de rango.');
  return n;
}
export function argentineDate(raw: string): string {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw);
  if (!m) throw new Error('Fecha inválida.');
  const iso = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const d = new Date(`${iso}T12:00:00Z`);
  if (!Number.isFinite(+d) || d.toISOString().slice(0, 10) !== iso) throw new Error('Fecha inválida.');
  return iso;
}
export function validOperation(o: BalanzOperation): boolean {
  return !!o && o.source === 'balanz' && /^\d{1,30}$/.test(o.ticketId) && /^[A-Z0-9][A-Z0-9.-]{0,9}$/.test(o.ticker)
    && ['BUY', 'SELL'].includes(o.operationType) && ['ARS', 'USD'].includes(o.currency)
    && /^\d{4}-\d{2}-\d{2}$/.test(o.tradeDate) && Number.isFinite(Date.parse(o.tradeDate))
    && new Date(`${o.tradeDate}T12:00:00Z`).toISOString().slice(0,10) === o.tradeDate
    && (o.settlementDate === undefined || (/^\d{4}-\d{2}-\d{2}$/.test(o.settlementDate) && Number.isFinite(Date.parse(o.settlementDate)) && o.settlementDate >= o.tradeDate))
    && [o.quantity, o.unitPrice, o.grossAmount].every(n => Number.isFinite(n) && n > 0)
    && Math.abs(o.quantity * o.unitPrice - o.grossAmount) <= Math.max(0.02, o.grossAmount * 1e-8)
    && (o.netAmount === undefined || (Number.isFinite(o.netAmount) && (o.operationType === 'BUY' ? o.netAmount < 0 : o.netAmount > 0)))
    && typeof o.rawDescription === 'string' && o.rawDescription.length <= 1000;
}
