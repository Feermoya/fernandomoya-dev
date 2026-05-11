import { useRef, useState } from 'react';
import type { FinanceState } from '@/lib/finance/types';
import { exportFinanceState, importFinanceState } from '@/lib/finance/storage';
import { isValidStoredSyncId } from '@/lib/finance/syncPhrase';

type Props = {
  state: FinanceState;
  onImport: (next: FinanceState) => void;
  cloudAutoSync?: boolean;
  bookSyncId?: string | null;
  cloudError?: string | null;
  onLinkSyncId?: (id: string) => Promise<void>;
  onActivatePassphrase?: (phrase: string) => Promise<void>;
};

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
  onActivatePassphrase,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pasteId, setPasteId] = useState('');
  const [linkBusy, setLinkBusy] = useState(false);
  const [phrase, setPhrase] = useState('');
  const [phraseBusy, setPhraseBusy] = useState(false);

  const setMsg = (msg: string, ms = 3200) => {
    setFeedback(msg);
    clearFeedbackAfter(ms, setFeedback);
  };

  const syncLink =
    bookSyncId && typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}?sync=${encodeURIComponent(bookSyncId)}`
      : '';

  const copySyncLink = async () => {
    if (!syncLink) return;
    try {
      await navigator.clipboard.writeText(syncLink);
      setMsg('Enlace copiado (opcional).');
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
    if (!isValidStoredSyncId(id)) {
      setMsg('Pegá un UUID válido o el código de 64 letras/números.', 4000);
      return;
    }
    setLinkBusy(true);
    try {
      await onLinkSyncId(id);
      setPasteId('');
      setMsg('Este equipo ya usa ese libro en la nube.');
    } finally {
      setLinkBusy(false);
    }
  };

  const submitPhrase = async () => {
    if (!onActivatePassphrase) return;
    if (phrase.trim().length < 10) {
      setMsg('La frase debe tener al menos 10 caracteres.', 3500);
      return;
    }
    setPhraseBusy(true);
    try {
      await onActivatePassphrase(phrase);
      setPhrase('');
      setMsg('Listo. Repetí la misma frase en el otro dispositivo; después todo se sincroniza solo al usar la app.');
    } finally {
      setPhraseBusy(false);
    }
  };

  return (
    <section id="respaldo" className="scroll-mt-28 rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-3 sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Respaldo</span>
          <p className="mt-1 text-[11px] font-medium text-slate-500">
            Está en esta misma página, debajo de las métricas (las tarjetas de números), antes del formulario de
            inversión.
          </p>
        </div>
      </div>

      {!cloudAutoSync ? (
        <div className="mt-2 space-y-2 rounded-lg border border-amber-500/25 bg-amber-950/25 p-3 text-xs leading-relaxed text-amber-100/90">
          <p className="font-bold text-amber-50">La sincronización no está activa en esta sesión</p>
          <p>
            Las variables de Vercel <span className="font-bold text-amber-100">no se usan en tu PC</span> cuando corrés{' '}
            <code className="text-amber-200/90">npm run dev</code>. Astro solo las ve si están en un archivo en el
            proyecto.
          </p>
          <p>
            <span className="font-bold text-amber-100">En local:</span> en la raíz del repo creá{' '}
            <code className="text-amber-200/90">.env.local</code> con las mismas dos variables que en Vercel (
            <code className="text-amber-200/90">PUBLIC_FINANCE_SUPABASE_URL</code> y{' '}
            <code className="text-amber-200/90">PUBLIC_FINANCE_SUPABASE_ANON_KEY</code>, valores copiados desde Supabase
            → Settings → API). Guardá el archivo, <span className="font-bold text-amber-100">pará y volvé a levantar</span>{' '}
            <code className="text-amber-200/90">npm run dev</code>. Ahí aparece la caja verde.
          </p>
          <p>
            <span className="font-bold text-amber-100">En producción:</span> las variables van en Vercel + redeploy; si
            ya lo hiciste, abrí el sitio publicado (no localhost).
          </p>
          <p className="text-slate-400">
            Sin eso, los datos quedan solo en este navegador: usá los botones de JSON/archivo de abajo.
          </p>
        </div>
      ) : null}

      {cloudAutoSync ? (
        <div className="mt-3 rounded-xl border border-emerald-500/35 bg-emerald-950/35 p-3">
          <p className="text-[11px] font-black uppercase tracking-widest text-emerald-200/90">
            Sincronización (Supabase)
          </p>

          {!bookSyncId && onActivatePassphrase ? (
            <>
              <p className="mt-2 text-xs font-medium leading-relaxed text-emerald-100/90">
                <span className="font-bold text-emerald-50">¿Por qué una frase?</span> Hace falta algo que la PC y el
                celu compartan para saber que son el mismo “libro” en la nube. En vez de copiar un enlace largo, elegís
                una frase que solo vos conozcas, la escribís una vez en cada equipo, y listo: no se guarda la frase en
                el navegador, solo un código derivado. Después cada inversión se sube sola.
              </p>
              <label className="mt-3 flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-200/80">
                  Frase (mín. 10 caracteres; la misma en PC y celu)
                </span>
                <input
                  type="password"
                  autoComplete="new-password"
                  className="min-h-[48px] rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                  placeholder="Ej. foco plata marzo 2026"
                  value={phrase}
                  onChange={(e) => setPhrase(e.target.value)}
                />
              </label>
              <button
                type="button"
                disabled={phraseBusy}
                className="mt-3 min-h-[48px] w-full rounded-xl bg-emerald-600 px-3 py-2 text-sm font-black text-white shadow transition hover:brightness-110 disabled:opacity-50"
                onClick={() => void submitPhrase()}
              >
                {phraseBusy ? 'Activando…' : 'Activar sincronización en este dispositivo'}
              </button>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm font-bold text-emerald-100">
                Conectado a la nube. Los cambios se guardan solos al cargar inversiones o editar datos.
              </p>
              <details className="mt-3 rounded-lg border border-white/10 bg-black/20 p-2">
                <summary className="cursor-pointer text-xs font-bold text-slate-400 hover:text-slate-200">
                  Opciones avanzadas (enlace o ID)
                </summary>
                <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
                  {syncLink ? (
                    <div>
                      <button
                        type="button"
                        className="min-h-[40px] rounded-lg bg-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/20"
                        onClick={() => void copySyncLink()}
                      >
                        Copiar enlace con ID
                      </button>
                      <p className="mt-2 break-all font-mono text-[9px] leading-snug text-slate-500">{syncLink}</p>
                    </div>
                  ) : null}
                  {onLinkSyncId ? (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                      <input
                        type="text"
                        autoComplete="off"
                        placeholder="Pegar UUID o código 64…"
                        className="min-h-[40px] flex-1 rounded-lg border border-white/15 bg-black/35 px-2 py-2 font-mono text-[11px] text-white placeholder:text-slate-500"
                        value={pasteId}
                        onChange={(e) => setPasteId(e.target.value)}
                      />
                      <button
                        type="button"
                        disabled={linkBusy}
                        className="min-h-[40px] shrink-0 rounded-lg border border-emerald-400/40 px-3 py-2 text-xs font-bold text-emerald-100 disabled:opacity-50"
                        onClick={() => void submitPasteId()}
                      >
                        {linkBusy ? '…' : 'Usar ID'}
                      </button>
                    </div>
                  ) : null}
                </div>
              </details>
            </>
          )}
          {cloudError ? <p className="mt-2 text-xs font-semibold text-rose-300">{cloudError}</p> : null}
        </div>
      ) : null}

      <p
        className={`text-xs font-medium leading-relaxed text-slate-400 ${cloudAutoSync ? 'mt-4 border-t border-white/10 pt-3' : 'mt-2'}`}
      >
        {cloudAutoSync
          ? 'Opcional: copia manual del JSON (archivo aparte).'
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
