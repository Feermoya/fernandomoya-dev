import { useRef, useState } from 'react';
import type { FinanceState } from '@/lib/finance/types';
import { DEFAULT_FINANCE_SYNC_ID, exportFinanceState, importFinanceState } from '@/lib/finance/storage';

export type FinanceCloudChipStatus = 'synced' | 'saving' | 'error' | 'solo_local';

type Props = {
  state: FinanceState;
  onImport: (next: FinanceState) => void;
  cloudAutoSync?: boolean;
  /** ID usado en este navegador (puede diferir del default si quedó valor viejo en localStorage). */
  activeSyncId: string;
  cloudError?: string | null;
  lastSyncIso: string | null;
  onForcePull: () => Promise<void>;
  onForcePush: () => Promise<void>;
  onResetSyncIdToDefault: () => void;
};

function clearFeedbackAfter(ms: number, set: (v: string | null) => void) {
  window.setTimeout(() => set(null), ms);
}

export function FinanceJsonTools({
  state,
  onImport,
  cloudAutoSync = false,
  activeSyncId,
  cloudError,
  lastSyncIso,
  onForcePull,
  onForcePush,
  onResetSyncIdToDefault,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [diagBusy, setDiagBusy] = useState<'pull' | 'push' | 'reset' | null>(null);

  const setMsg = (msg: string, ms = 3200) => {
    setFeedback(msg);
    clearFeedbackAfter(ms, setFeedback);
  };

  const download = () => {
    const json = exportFinanceState(state);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'finance-game-backup.json';
    a.click();
    URL.revokeObjectURL(url);
    setMsg('Archivo descargado.');
  };

  const copyJson = async () => {
    const json = exportFinanceState(state);
    try {
      await navigator.clipboard.writeText(json);
      setMsg('JSON copiado.');
    } catch {
      setMsg('No se pudo copiar. Probá descargar archivo.', 4500);
    }
  };

  const pasteJson = async () => {
    let text: string;
    try {
      text = await navigator.clipboard.readText();
    } catch {
      setMsg('No se pudo leer el portapapeles. Probá “Elegir archivo”.', 5000);
      return;
    }
    const trimmed = text.trim();
    if (!trimmed.startsWith('{')) {
      setMsg('El portapapeles no parece un JSON de Foco.');
      return;
    }
    const result = importFinanceState(trimmed);
    if (!result.ok) {
      setFeedback(result.error);
      clearFeedbackAfter(5000, setFeedback);
      return;
    }
    if (
      typeof window !== 'undefined' &&
      !window.confirm(
        '¿Reemplazar todo lo de este navegador por el JSON del portapapeles? No se puede deshacer.',
      )
    ) {
      return;
    }
    onImport(result.state);
    setMsg('Datos aplicados desde el portapapeles.');
  };

  const shareOrDownload = async () => {
    const json = exportFinanceState(state);
    const file = new File([json], 'finance-game-backup.json', { type: 'application/json' });
    const share = typeof navigator !== 'undefined' ? navigator.share : undefined;
    const canShare =
      typeof navigator !== 'undefined' && typeof navigator.canShare === 'function'
        ? navigator.canShare({ files: [file] })
        : false;
    if (share && canShare) {
      try {
        await navigator.share({
          files: [file],
          title: 'Respaldo Foco financiero',
          text: 'Respaldo JSON',
        });
        setMsg('Compartido.');
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
      }
    }
    download();
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const result = importFinanceState(text);
      if (!result.ok) {
        setFeedback(result.error);
        clearFeedbackAfter(5000, setFeedback);
        return;
      }
      onImport(result.state);
      setMsg('Importado desde archivo.');
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Error al leer.');
      clearFeedbackAfter(5000, setFeedback);
    } finally {
      e.target.value = '';
    }
  };

  const fmtLast = (iso: string | null) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('es-AR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <section id="respaldo" className="finance-card-compact scroll-mt-28 px-3 py-3 text-slate-600 sm:px-4">
      <p className="text-[11px] font-medium text-slate-500">
        Exportá o importá JSON como respaldo. Con nube activa, la app sincroniza sola contra Supabase.
      </p>

      {!cloudAutoSync ? (
        <div className="mt-2 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
          <p className="font-semibold text-slate-700">Sincronización no activa en esta sesión</p>
          <p>
            Las variables de Vercel <span className="font-medium text-slate-800">no se usan en tu PC</span> cuando corrés{' '}
            <code className="rounded bg-white px-1 text-slate-700">npm run dev</code>. Astro solo las ve si están en un archivo en el
            proyecto.
          </p>
          <p>
            <span className="font-medium text-slate-800">En local:</span> en la raíz del repo creá{' '}
            <code className="rounded bg-white px-1 text-slate-700">.env.local</code> con las mismas dos variables que en Vercel (
            <code className="rounded bg-white px-1 text-slate-700">PUBLIC_FINANCE_SUPABASE_URL</code> y{' '}
            <code className="rounded bg-white px-1 text-slate-700">PUBLIC_FINANCE_SUPABASE_ANON_KEY</code>, valores copiados desde Supabase
            → Settings → API). Guardá el archivo, <span className="font-medium text-slate-800">pará y volvé a levantar</span>{' '}
            <code className="rounded bg-white px-1 text-slate-700">npm run dev</code>.
          </p>
          <p>
            <span className="font-medium text-slate-800">En producción:</span> las variables van en Vercel + redeploy; si
            ya lo hiciste, abrí el sitio publicado (no localhost).
          </p>
          <p className="text-slate-500">Sin eso, los datos quedan solo en este navegador: usá los botones de abajo.</p>
        </div>
      ) : null}

      {cloudAutoSync ? (
        <details className="finance-details mt-3 p-2">
          <summary className="cursor-pointer rounded-[18px] px-2 py-1.5 finance-label hover:bg-slate-50">
            Diagnóstico de sincronización
          </summary>
          <div className="mt-3 space-y-3 border-t border-slate-200 pt-3 text-xs text-slate-600">
            <p>
              <span className="font-semibold text-slate-700">ID esperado en Supabase:</span>{' '}
              <code className="break-all rounded bg-emerald-50 px-1 font-mono text-[10px] text-emerald-700">
                {DEFAULT_FINANCE_SYNC_ID}
              </code>
            </p>
            <p>
              <span className="font-semibold text-slate-700">ID en este navegador:</span>{' '}
              <code className="break-all rounded bg-slate-100 px-1 font-mono text-[10px] text-slate-700">{activeSyncId}</code>
              {activeSyncId !== DEFAULT_FINANCE_SYNC_ID ? (
                <span className="mt-1 block text-amber-600">
                  Este dispositivo tenía otro ID; la app ahora usa siempre el libro principal.
                </span>
              ) : null}
            </p>
            <p>
              <span className="font-semibold text-slate-700">Última sync conocida:</span> {fmtLast(lastSyncIso)}
            </p>
            {cloudError ? <p className="font-semibold text-red-600">{cloudError}</p> : null}
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                disabled={diagBusy !== null}
                className="finance-secondary-button min-h-[40px] px-3 py-2 text-xs disabled:opacity-50"
                onClick={() => {
                  setDiagBusy('pull');
                  void onForcePull()
                    .then(() => setMsg('Datos traídos desde la nube.'))
                    .catch(() => {})
                    .finally(() => setDiagBusy(null));
                }}
              >
                {diagBusy === 'pull' ? 'Trayendo…' : 'Forzar traer de la nube'}
              </button>
              <button
                type="button"
                disabled={diagBusy !== null}
                className="min-h-[40px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                onClick={() => {
                  setDiagBusy('push');
                  void onForcePush()
                    .then(() => setMsg('Estado de este dispositivo subido.'))
                    .catch(() => {})
                    .finally(() => setDiagBusy(null));
                }}
              >
                {diagBusy === 'push' ? 'Subiendo…' : 'Forzar subir este dispositivo'}
              </button>
              <button
                type="button"
                disabled={diagBusy !== null || activeSyncId === DEFAULT_FINANCE_SYNC_ID}
                className="min-h-[40px] rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-40"
                title="Si tenías un ID distinto guardado, esto alinea este navegador al libro principal."
                onClick={() => {
                  setDiagBusy('reset');
                  try {
                    onResetSyncIdToDefault();
                    setMsg('ID restablecido al predeterminado. Podés “Forzar traer de la nube”.');
                  } finally {
                    setDiagBusy(null);
                  }
                }}
              >
                Restablecer ID al predeterminado
              </button>
            </div>
          </div>
        </details>
      ) : null}

      <p
        className={`text-xs font-medium leading-relaxed text-slate-500 ${cloudAutoSync ? 'mt-4 border-t border-slate-200 pt-3' : 'mt-2'}`}
      >
        {cloudAutoSync
          ? 'Opcional: copia manual del JSON (archivo aparte).'
          : 'Sin nube en el hosting, los datos son solo de este navegador. Copiá el JSON o el archivo y pasalo al otro equipo.'}
      </p>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          className="finance-secondary-button min-h-[44px] px-3 py-2 text-xs"
          onClick={() => void copyJson()}
        >
          Copiar JSON
        </button>
        <button
          type="button"
          className="finance-secondary-button min-h-[44px] px-3 py-2 text-xs"
          onClick={() => void pasteJson()}
        >
          Pegar y aplicar
        </button>
        <button
          type="button"
          className="finance-secondary-button min-h-[44px] px-3 py-2 text-xs"
          onClick={() => void shareOrDownload()}
        >
          Compartir / descargar archivo
        </button>
        <button
          type="button"
          className="min-h-[44px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          onClick={() => fileRef.current?.click()}
        >
          Elegir archivo…
        </button>
      </div>
      <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onFile} />

      {feedback ? <p className="mt-3 text-xs font-medium text-slate-700">{feedback}</p> : null}
    </section>
  );
}
