/** Orden estable: `order` asc, luego fecha desc (colecciones Astro: datos en `.data`). */
export function byOrderThenDate<T extends { data: { order: number; publishDate: Date } }>(
  a: T,
  b: T,
): number {
  if (a.data.order !== b.data.order) return a.data.order - b.data.order;
  return b.data.publishDate.getTime() - a.data.publishDate.getTime();
}
