/** Rutas conocidas del panel → destino Atrás explícito. */
export function resolvePanelBackLink(
  path: string,
): { href: string; label: string } | null {
  const clean = path.replace(/\/$/, '') || '/panel';

  if (clean === '/panel/cobros') {
    return { href: '/panel', label: 'Inicio' };
  }
  if (clean === '/panel/clientes') {
    return { href: '/panel', label: 'Inicio' };
  }
  if (/^\/panel\/clientes\/[^/]+$/.test(clean)) {
    return { href: '/panel/clientes', label: 'Clientes' };
  }
  return null;
}

/** Evita doble submit: si ya submitting, no dispara de nuevo. */
export function canStartSubmit(submitting: boolean): boolean {
  return !submitting;
}
