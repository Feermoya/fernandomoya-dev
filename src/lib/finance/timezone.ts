const TZ = 'America/Argentina/Buenos_Aires';

/** Fecha civil en Argentina (Mendoza / Buenos Aires, UTC−3). */
export function getArgentinaDateParts(date: Date = new Date()): {
  year: number;
  month: number;
  day: number;
  monthKey: string;
} {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = Number(parts.find((p) => p.type === 'year')?.value);
  const month = Number(parts.find((p) => p.type === 'month')?.value);
  const day = Number(parts.find((p) => p.type === 'day')?.value);
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;

  return { year, month, day, monthKey };
}

export function monthLabelEsFromKey(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
}
