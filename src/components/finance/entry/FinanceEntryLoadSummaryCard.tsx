import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import type { EntryLoadSummary, EntryLoadSummaryLineTone } from '@/lib/finance/entry';

type Props = {
  summary: EntryLoadSummary;
  onDismiss: () => void;
};

function toneClass(tone: EntryLoadSummaryLineTone): string {
  switch (tone) {
    case 'positive':
      return 'text-emerald-700';
    case 'warning':
      return 'text-amber-800';
    case 'info':
      return 'text-blue-700';
    default:
      return 'text-slate-700';
  }
}

function toneIcon(tone: EntryLoadSummaryLineTone) {
  switch (tone) {
    case 'positive':
      return CheckCircle2;
    case 'warning':
      return TriangleAlert;
    default:
      return Info;
  }
}

/** Tarjeta con el resumen post-carga (celebración + plan + nivel). */
export function FinanceEntryLoadSummaryCard({ summary, onDismiss }: Props) {
  return (
    <aside
      className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-3.5 shadow-sm"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="finance-label text-emerald-700">Resumen de la carga</p>
          <h4 className="mt-0.5 text-sm font-bold tracking-tight text-emerald-950">
            {summary.headline}
          </h4>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="finance-touch-target inline-flex h-8 w-8 items-center justify-center rounded-lg text-emerald-800/70 hover:bg-emerald-100"
          aria-label="Cerrar resumen"
        >
          <X size={16} strokeWidth={2.25} />
        </button>
      </div>

      <ul className="mt-2.5 space-y-1.5">
        {summary.lines.map((line, idx) => {
          const Icon = toneIcon(line.tone);
          return (
            <li key={`${idx}-${line.text}`} className={`flex items-start gap-2 text-xs font-semibold leading-snug ${toneClass(line.tone)}`}>
              <Icon size={14} strokeWidth={2.25} className="mt-0.5 shrink-0" aria-hidden />
              <span>{line.text}</span>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
