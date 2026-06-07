import type { FinanceState } from '@/lib/finance/types';
import { FinanceProgressPath } from '@/components/finance/FinanceProgressPath';

type Props = {
  state: FinanceState;
  month: string;
  onWealthTargetChange: (value: number | undefined) => void;
  compact?: boolean;
};

export function FinanceLevels({ state, month, onWealthTargetChange, compact = false }: Props) {
  return (
    <div className={`flex flex-col ${compact ? 'gap-3' : 'gap-4'}`}>
      <FinanceProgressPath state={state} month={month} compact={compact} />

      <div className="finance-card-compact px-3 py-2.5 sm:px-4 sm:py-3">
        <p className="finance-label">Meta nivel 10 (opcional)</p>
        <input
          type="number"
          min={0}
          step={1000}
          placeholder="Inversión acumulada objetivo"
          className="finance-input-mobile mt-2 w-full rounded-lg px-3 py-2 text-sm font-semibold"
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
