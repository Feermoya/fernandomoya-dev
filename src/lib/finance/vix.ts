/** Parser y lectura del VIX histórico oficial de Cboe (cierre diario, NO intradía). */
export const CBOE_VIX_HISTORY_URL = 'https://cdn.cboe.com/api/global/us_indices/daily_prices/VIX_History.csv';
export type VixReading = { value: number; date: string; percentileYear: number; observations: number; stale: boolean };

function isoDate(raw: string): string | null {
  const cleaned = raw.trim().replace(/^"|"$/g, '');
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;
  const match = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, m, d, y] = match;
  const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  const date = new Date(iso + 'T12:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === iso ? iso : null;
}
export function parseCboeVixCsv(csv: string, now = new Date()): VixReading | null {
  const rows = csv.trim().split(/\r?\n/);
  if (rows.length < 2) return null;
  const header = rows[0].split(',').map(t => t.trim().replace(/^"|"$/g,'').toUpperCase());
  const dateIdx = header.indexOf('DATE'), closeIdx = header.indexOf('CLOSE');
  if (dateIdx < 0 || closeIdx < 0) return null;
  const readings = rows.slice(1).map(row => {
    const cells = row.split(',');
    const date = isoDate(cells[dateIdx] ?? '');
    const value = Number((cells[closeIdx] ?? '').replace(/"/g,''));
    return {date, value};
  }).filter((row): row is { date: string; value: number } =>
    Boolean(row.date) && Number.isFinite(row.value) && row.value > 0 && row.value < 500);
  if (!readings.length) return null;
  readings.sort((a,b)=>a.date.localeCompare(b.date));
  const latest = readings.at(-1)!;
  const timestamp = new Date(latest.date + 'T21:00:00Z').getTime();
  const daysOld = (now.getTime() - timestamp)/(1000*60*60*24);
  const recent = readings.slice(-252);
  const rank = recent.filter(p => p.value <= latest.value).length / recent.length * 100;
  return {
    value: latest.value, date: latest.date,
    percentileYear: Math.round(rank),
    observations: recent.length,
    stale: daysOld > 7 || daysOld < -1,
  };
}
export type VixZone = 'calma' | 'normal' | 'tension' | 'alta' | 'extrema';
export function vixZone(value: number): VixZone {
  if (value < 15) return 'calma';
  if (value < 20) return 'normal';
  if (value < 30) return 'tension';
  if (value < 40) return 'alta';
  return 'extrema';
}
