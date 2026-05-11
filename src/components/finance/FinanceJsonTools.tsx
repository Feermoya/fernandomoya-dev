import { useRef, useState } from 'react';
import type { FinanceState } from '@/lib/finance/types';
import { exportFinanceState, importFinanceState } from '@/lib/finance/storage';

type Props = {
  state: FinanceState;
  onImport: (next: FinanceState) => void;
};

export function FinanceJsonTools({ state, onImport }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const download = () => {
    const json = exportFinanceState(state);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'finance-game-backup.json';
    a.click();
    URL.revokeObjectURL(url);
    setFeedback('Listo.');
    window.setTimeout(() => setFeedback(null), 2500);
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const result = importFinanceState(text);
      if (!result.ok) {
        setFeedback(result.error);
        return;
      }
      onImport(result.state);
      setFeedback('Importado.');
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Error al leer.');
    } finally {
      e.target.value = '';
      window.setTimeout(() => setFeedback(null), 4000);
    }
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-3 sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Respaldo</span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg bg-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/20"
            onClick={download}
          >
            Exportar
          </button>
          <button
            type="button"
            className="rounded-lg border border-white/15 px-3 py-2 text-xs font-bold text-slate-200 transition hover:border-white/30"
            onClick={() => fileRef.current?.click()}
          >
            Importar
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onFile} />
        </div>
      </div>
      {feedback ? <p className="mt-2 text-xs font-medium text-slate-400">{feedback}</p> : null}
    </section>
  );
}
