import { useEffect, useState } from 'react';

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function FinanceInstallHint() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    try {
      if (localStorage.getItem('finance-install-hint-dismissed') === '1') return;
    } catch {
      /* ignore */
    }
    setOpen(true);
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem('finance-install-hint-dismissed', '1');
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="mb-3 rounded-2xl border border-violet-400/30 bg-violet-950/40 p-3.5 sm:p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-200/80">Instalar en el teléfono</p>
      <p className="mt-1.5 text-sm font-semibold leading-snug text-violet-100/90">
        <span className="font-bold text-white">iPhone:</span> Compartir → Agregar a pantalla de inicio.
      </p>
      <p className="mt-1 text-sm font-semibold leading-snug text-violet-100/90">
        <span className="font-bold text-white">Android:</span> Menú ⋮ → Instalar app o Agregar a inicio.
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="finance-touch-target mt-3 min-h-[40px] rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-bold text-white transition hover:bg-white/10"
      >
        Entendido
      </button>
    </div>
  );
}
