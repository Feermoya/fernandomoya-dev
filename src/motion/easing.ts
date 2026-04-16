/**
 * Curvas compartidas (legibles, ≤600ms, sin reflow).
 * Entradas: ease-out suave · Salidas: ease-in · Hover corto easeOut.
 */
export const EASE_OUT_SOFT = [0.25, 0.1, 0.25, 1] as const;
export const EASE_IN = [0.4, 0, 0.6, 1] as const;

export const DURATION_ENTER = 0.55;
export const DURATION_STAGGER_CHILD = 0.55;
export const DURATION_MAX = 0.6;

/** Stagger palabras hero: ~4 entradas solapadas máx. con duration ~0.55 */
export const HERO_WORD_STAGGER = 0.14;
