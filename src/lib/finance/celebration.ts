/** Vibración corta en móvil (si el navegador lo permite). */
export function triggerEntryHaptic(): void {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;
  try {
    navigator.vibrate([14, 45, 18]);
  } catch {
    /* ignore */
  }
}
