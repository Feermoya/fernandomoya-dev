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
    <div className="mb-3 rounded-2xl border border-blue-200 bg-blue-50 p-3.5 sm:p-4">
      <p className="finance-label text-blue-700">Instalar en el teléfono</p>
      <p className="mt-1.5 text-sm font-semibold leading-snug text-slate-700">
        <span className="font-bold text-slate-900">iPhone:</span> Compartir → Agregar a pantalla de inicio.
      </p>
      <p className="mt-1 text-sm font-semibold leading-snug text-slate-700">
        <span className="font-bold text-slate-900">Android:</span> Menú ⋮ → Instalar app o Agregar a inicio.
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="finance-secondary-button finance-touch-target mt-3 min-h-[40px] px-4 text-xs"
      >
        Entendido
      </button>
    </div>
  );
}
