import { formatARS } from '@/lib/finance/calculations';
import { DEFAULT_QUICK_AMOUNTS } from '@/lib/finance/preferences';
import type { FinancePreferences } from '@/lib/finance/types';

type Props = {
  preferences: FinancePreferences;
  onChange: (prefs: FinancePreferences) => void;
};

export function FinanceQuickAmountsEditor({ preferences, onChange }: Props) {
  const amounts = preferences.quickAmounts;

  const updateAt = (index: number, value: string) => {
    const n = Number(value.replace(/\D/g, ''));
    const next = [...amounts];
    if (Number.isFinite(n) && n > 0) next[index] = n;
    onChange({ ...preferences, quickAmounts: next });
  };

  const addSlot = () => {
    if (amounts.length >= 8) return;
    onChange({ ...preferences, quickAmounts: [...amounts, 100_000] });
  };

  const removeAt = (index: number) => {
    if (amounts.length <= 1) return;
    onChange({ ...preferences, quickAmounts: amounts.filter((_, i) => i !== index) });
  };

  const reset = () => {
    onChange({ ...preferences, quickAmounts: [...DEFAULT_QUICK_AMOUNTS] });
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-slate-300">Botones de monto al cargar inversión (se guardan en tu cuenta).</p>
      <ul className="space-y-2">
        {amounts.map((n, i) => (
          <li key={`${i}-${n}`} className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              min={1000}
              step={1000}
              className="finance-input-mobile min-h-[44px] flex-1 rounded-xl border border-white/15 bg-black/40 px-3 text-sm font-bold tabular-nums text-white"
              value={n}
              onChange={(e) => updateAt(i, e.target.value)}
            />
            <span className="hidden text-xs text-slate-500 sm:inline">{formatARS(n)}</span>
            <button
              type="button"
              onClick={() => removeAt(i)}
              className="finance-touch-target rounded-lg px-2 text-xs font-bold text-slate-500 hover:text-rose-300"
            >
              Quitar
            </button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={addSlot}
          disabled={amounts.length >= 8}
          className="min-h-[40px] rounded-xl border border-white/15 bg-white/5 px-3 text-xs font-bold text-white disabled:opacity-40"
        >
          + Agregar monto
        </button>
        <button
          type="button"
          onClick={reset}
          className="min-h-[40px] rounded-xl border border-white/15 px-3 text-xs font-bold text-slate-400"
        >
          Restaurar predeterminados
        </button>
      </div>
    </div>
  );
}
