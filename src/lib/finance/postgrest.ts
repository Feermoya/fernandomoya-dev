/**
 * Filtros PostgREST / Supabase.
 * Valores con guiones (ej. fernando-foco-financiero-main) rompen `id=eq.valor` → HTTP 400.
 * Hay que envolver el texto entre comillas dobles (codificadas como %22).
 */

function escapePostgrestString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/** Valor entre comillas listo para URL (sin operador). */
export function postgrestQuotedValue(value: string): string {
  return encodeURIComponent(`"${escapePostgrestString(value)}"`);
}

/** `column=eq."valor"` — lectura por id de fila. */
export function postgrestEqFilter(column: string, value: string): string {
  return `${column}=eq.${postgrestQuotedValue(value)}`;
}

/** `column=in.("valor")` — alternativa estable para textos con caracteres reservados. */
export function postgrestInFilter(column: string, value: string): string {
  return `${column}=in.(${postgrestQuotedValue(value)})`;
}

export function financeGameStateSelectUrl(
  restBase: string,
  syncId: string,
  columns = 'body,updated_at',
): string {
  const filter = postgrestInFilter('id', syncId);
  return `${restBase}/finance_game_state?${filter}&select=${columns}&limit=1`;
}
