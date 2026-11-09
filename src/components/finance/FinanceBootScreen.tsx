import { useEffect, useState } from 'react';

type Props = { description?: string; slow?: boolean };
export function FinanceBootScreen({ description = 'Abriendo tus inversiones…', slow = false }: Props) {
  const [longWait, setLongWait] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setLongWait(true), 6500);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div className="foco-boot-static" role="status" aria-live="polite">
      <img src="/foco/icon-192.png" width={68} height={68} alt="" />
      <strong>Foco financiero</strong>
      <span>{description}</span>
      <div className="foco-boot-track" aria-hidden="true"><i /></div>
      {slow || longWait ? (
        <div className="mt-5 flex flex-col items-center gap-2">
          <p className="max-w-xs text-center text-xs font-medium text-slate-600">
            La apertura está tardando más de lo esperado. No hace falta borrar los datos.
          </p>
          <button type="button" onClick={() => window.location.reload()}
            className="min-h-11 rounded-xl border border-blue-200 bg-white px-5 text-sm font-bold text-blue-700 shadow-sm">
            Reintentar carga
          </button>
        </div>
      ) : null}
    </div>
  );
}
