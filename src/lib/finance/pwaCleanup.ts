export type FinanceWorkerRegistration = { scope: string; unregister: () => Promise<boolean> };
export type FinanceWorkerRegistry = { getRegistrations: () => Promise<readonly FinanceWorkerRegistration[]> };

/** No tocar las PWA de otras aplicaciones en el mismo dominio. */
export function isLegacyFinanceWorkerScope(scope: string, origin: string): boolean {
  try {
    const url = new URL(scope, origin);
    return url.origin === origin && url.pathname.replace(/\/$/, '') === '/foco-financiero';
  } catch { return false; }
}

/** Deja de utilizar el SW viejo que interceptaba navegación. */
export async function cleanupLegacyFinanceWorker(registry: FinanceWorkerRegistry, origin: string): Promise<number> {
  try {
    const regs = await registry.getRegistrations();
    let count = 0;
    for (const reg of regs) {
      if (!isLegacyFinanceWorkerScope(reg.scope, origin)) continue;
      try { if (await reg.unregister()) count++; } catch { /* no bloquear la app */ }
    }
    return count;
  } catch { return 0; }
}
