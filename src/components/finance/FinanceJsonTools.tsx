import { useRef, useState } from 'react';
import type { FinanceState } from '@/lib/finance/types';
import { exportFinanceState, importFinanceState } from '@/lib/finance/storage';

type Props = {
  state: FinanceState;
  onImport: (next: FinanceState) => void;
  /** Si hay env de Supabase: guardado automático + sección de enlace. */
  cloudAutoSync?: boolean;
  bookSyncId?: string | null;
  cloudError?: string | null;
  onLinkSyncId?: (id: string) => Promise<void>;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function clearFeedbackAfter(ms: number, set: (v: string | null) => void) {
  window.setTimeout(() => set(null), ms);
}

export function FinanceJsonTools({
  state,
  onImport,
  cloudAutoSync = false,
  bookSyncId,
  cloudError,
  onLinkSyncId,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pasteId, setPasteId] = useState('');
  const [linkBusy, setLinkBusy] = useState(false);

  const setMsg = (msg: string, ms = 3200) => {
    setFeedback(msg);
    clearFeedbackAfter(ms, setFeedback);
  };

  const syncLink =
    bookSyncId && typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}?sync=${bookSyncId}`
      : '';

  const copySyncLink = async () => {
    if (!syncLink) return;
    try {
      await navigator.clipboard.writeText(syncLink);
      setMsg('Enlace copiado. Pegalo en el celu (Safari/Chrome) y abrilo una vez; después queda sincronizado solo.');
    } catch {
      setMsg('No se pudo copiar el enlace.', 4000);
    }
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
      setMsg('JSON copiado. Pegalo donde quieras y en el otro dispositivo usá “Pegar y aplicar”.');
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

  const submitPasteId = async () => {
    if (!onLinkSyncId) return;
    const id = pasteId.trim();
    if (!UUID_RE.test(id)) {
      setMsg('Pegá el UUID completo (formato xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx).', 4000);
      return;
    }
    setLinkBusy(true);
    try {
      await onLinkSyncId(id);
      setPasteId('');
      setMsg('Este equipo ya usa el mismo libro en la nube.');
    } catch {
      /* cloudError lo muestra el padre */
    } finally {
      setLinkBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-3 sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Respaldo</span>
      </div>

      {cloudAutoSync ? (
        <div className="mt-3 rounded-xl border border-emerald-500/35 bg-emerald-950/35 p-3">
          <p className="text-[11px] font-black uppercase tracking-widest text-emerald-200/90">Nube activa</p>
          <p className="mt-2 text-xs font-medium leading-relaxed text-emerald-100/90">
            Cada inversión o cambio se sube solo. No tenés que exportar nada para que quede guardado. En otro
            dispositivo: una sola vez abrí el enlace de abajo (o pegá el ID si ya lo copiaste).
          </p>
          {bookSyncId ? (
            <div className="mt-3 flex flex-col gap-2">
              <button
                type="button"
                className="min-h-[44px] rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white shadow transition hover:brightness-110"
                onClick={() => void copySyncLink()}
              >
                Copiar enlace para otro dispositivo
              </button>
              <p className="break-all font-mono text-[10px] leading-snug text-emerald-200/70">{syncLink}</p>
            </div>
          ) : (
            <p className="mt-2 text-xs font-semibold text-amber-200/95">
              Hacé cualquier cambio (ej. cargá una inversión) y acá aparece el enlace para vincular el celu.
            </p>
          )}
          {onLinkSyncId ? (
            <div className="mt-4 flex flex-col gap-2 border-t border-white/10 pt-3 sm:flex-row sm:items-stretch">
              <input
                type="text"
                autoComplete="off"
                placeholder="O pegá aquí el UUID del otro equipo"
                className="min-h-[44px] flex-1 rounded-xl border border-white/15 bg-black/35 px-3 py-2 font-mono text-[11px] text-white placeholder:text-slate-500"
                value={pasteId}
                onChange={(e) => setPasteId(e.target.value)}
              />
              <button
                type="button"
                disabled={linkBusy}
                className="min-h-[44px] shrink-0 rounded-xl border border-emerald-400/40 bg-black/30 px-4 py-2 text-xs font-black text-emerald-100 transition hover:bg-white/10 disabled:opacity-50"
                onClick={() => void submitPasteId()}
              >
                {linkBusy ? '…' : 'Usar este ID'}
              </button>
            </div>
          ) : null}
          {cloudError ? <p className="mt-2 text-xs font-semibold text-rose-300">{cloudError}</p> : null}
        </div>
      ) : null}

      <p
        className={`text-xs font-medium leading-relaxed text-slate-400 ${cloudAutoSync ? 'mt-4 border-t border-white/10 pt-3' : 'mt-2'}`}
      >
        {cloudAutoSync
          ? 'Opcional: copia manual del JSON (por si querés un archivo aparte).'
          : 'Sin nube en el hosting, los datos son solo de este navegador. Copiá el JSON o el archivo y pasalo al otro equipo.'}
      </p>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          className="min-h-[44px] rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/20"
          onClick={() => void copyJson()}
        >
          Copiar JSON
        </button>
        <button
          type="button"
          className="min-h-[44px] rounded-xl border-2 border-indigo-400/50 bg-indigo-950/50 px-3 py-2 text-xs font-black text-indigo-100 transition hover:border-indigo-300"
          onClick={() => void pasteJson()}
        >
          Pegar y aplicar
        </button>
        <button
          type="button"
          className="min-h-[44px] rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/20"
          onClick={() => void shareOrDownload()}
        >
          Compartir / descargar archivo
        </button>
        <button
          type="button"
          className="min-h-[44px] rounded-xl border border-white/15 px-3 py-2 text-xs font-bold text-slate-200 transition hover:border-white/30"
          onClick={() => fileRef.current?.click()}
        >
          Elegir archivo…
        </button>
      </div>
      <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onFile} />

      {feedback ? <p className="mt-3 text-xs font-medium text-slate-300">{feedback}</p> : null}
    </section>
  );
}
