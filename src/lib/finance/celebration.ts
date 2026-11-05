function vibrateSafe(pattern: number | number[]): void {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
}

/** Vibración suave al cargar una inversión. */
export function triggerEntryHaptic(): void {
  vibrateSafe([12, 40, 16]);
}

/** Vibración de éxito (objetivo / nivel). */
export function triggerSuccessHaptic(): void {
  vibrateSafe([10, 30, 18, 30, 24]);
}
