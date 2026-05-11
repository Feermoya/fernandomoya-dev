import type { FinanceState } from '@/lib/finance/types';
import { FinanceProgressPath } from '@/components/finance/FinanceProgressPath';

type Props = {
  state: FinanceState;
  month: string;
  onWealthTargetChange: (value: number | undefined) => void;
};

export function FinanceLevels({ state, month, onWealthTargetChange }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <FinanceProgressPath state={state} month={month} />

      <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Meta nivel 10</p>
        <input
          type="number"
          min={0}
          step={1000}
          placeholder="Inversión acumulada objetivo"
          className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-sm font-semibold text-white placeholder:text-slate-600"
          value={state.wealthTarget ?? ''}
          onChange={(e) => {
            const v = e.target.value;
            if (v === '') {
              onWealthTargetChange(undefined);
              return;
            }
            const n = Number(v);
            onWealthTargetChange(Number.isFinite(n) ? n : undefined);
          }}
        />
      </div>
    </div>
  );
}
