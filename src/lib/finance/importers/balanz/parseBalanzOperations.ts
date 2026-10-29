import { argentineDate, argentineNumber, validOperation } from './normalizeBalanzOperation';
import { balanzKey, type BalanzOperation, type BalanzParseResult } from './types';
/** Rows must preserve PDF reading order. Currency-account rows take precedence over instrument totals. */
export function parseBalanzOperations(text: string): BalanzParseResult {
  if (!text.trim()) throw new Error('El PDF no contiene texto extraíble.');
  if (!/BALANZ/i.test(text) || !/Cuenta Corriente por Concertaci[oó]n/i.test(text)) throw new Error('Formato de Balanz desconocido.');
  let section: 'instruments' | 'currencies' = 'instruments';
  let cashCurrency: 'ARS' | 'USD' | null = null;
  let ignored = 0;
  const rows = new Map<string, { operation: BalanzOperation; priority: number }>();
  const warnings: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim().replace(/\s+/g, ' ');
    if (/^Monedas$/.test(line)) section = 'currencies';
    if (section === 'currencies') {
      if (/^Pesos\s*-/.test(line)) cashCurrency = 'ARS';
      else if (/^D[oó]lar(?:es)?\b/i.test(line)) cashCurrency = /(?:usd|U\$)/i.test(line) ? 'USD' : null;
    }
    if (!/^Boleto\s*\//i.test(line)) {
      if (/^(Saldo |Recibo |Dividendo |Transferencia |Liquidaci[oó]n |Orden de Pago)/i.test(line)) ignored++;
      continue;
    }
    const m = /^Boleto\s*\/\s*(\d+)\s*\/\s*(COMPRA|VENTA)\s*\/\s*\d+\s*\/\s*([A-Z0-9.-]+)\s*\/\s*(usd|\$)\s+(.+)$/i.exec(line);
    if (!m) throw new Error('Hay un boleto con formato no soportado. No se importó ninguna operación.');
    const currency = m[4].toLowerCase() === 'usd' ? 'USD' : 'ARS';
    const tokens = m[5].split(/\s+/);
    if (tokens.length < 8) throw new Error(`Boleto ${m[1]} incompleto.`);
    const settlementDate = argentineDate(tokens.pop()!);
    const tradeDate = argentineDate(tokens.pop()!);
    const numbers = tokens.map(argentineNumber);
    const [signedQuantity, , unitPrice, rawGross] = numbers;
    // FX trades generate ARS expense rows too. Those are NOT a second operation.
    if (section === 'currencies' && currency !== cashCurrency) continue;
    const priority = section === 'currencies' ? 2 : 1;
    const grossAmount = Math.abs(rawGross);
    const net = numbers.at(-1)!;
    const operation: BalanzOperation = {
      source: 'balanz', ticketId: m[1], ticker: m[3].toUpperCase(),
      operationType: m[2].toUpperCase() === 'COMPRA' ? 'BUY' : 'SELL',
      tradeDate, settlementDate, quantity: Math.abs(signedQuantity), unitPrice, currency,
      grossAmount,
      // Instrument USD totals mix charges converted from ARS. Keep cash-account net only.
      ...(currency === 'ARS' || priority === 2 ? { netAmount: net, fees: Math.abs(Math.abs(net) - grossAmount) } : {}),
      rawDescription: `Boleto / ${m[1]} / ${m[2]} / ${m[3]} / ${m[4]}`,
    };
    if (!validOperation(operation)) throw new Error(`Boleto ${m[1]} inconsistente. Revisá el extracto.`);
    const key = balanzKey(operation);
    const prev = rows.get(key);
    if (prev) {
      const p = prev.operation;
      if (['tradeDate', 'settlementDate', 'quantity', 'unitPrice', 'currency', 'grossAmount'].some(k => p[k as keyof BalanzOperation] !== operation[k as keyof BalanzOperation]))
        throw new Error(`El boleto ${m[1]} contiene datos contradictorios.`);
      if (priority === prev.priority && p.netAmount !== operation.netAmount) throw new Error(`Neto contradictorio en boleto ${m[1]}.`);
      if (priority <= prev.priority) continue;
    }
    rows.set(key, { operation, priority });
  }
  const operations = [...rows.values()].map(r => r.operation).sort((a,b) => a.tradeDate.localeCompare(b.tradeDate) || a.ticketId.localeCompare(b.ticketId));
  if (!operations.length) throw new Error('No se encontraron compras o ventas soportadas en el PDF.');
  for (const o of operations) if (o.netAmount === undefined) warnings.push(`Boleto ${o.ticketId}: sin neto en su cuenta de moneda. Se conserva el bruto.`);
  return { operations, ignored, warnings };
}
