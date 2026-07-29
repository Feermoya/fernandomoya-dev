import type { EntryInputMode } from '@/lib/finance/entry';
import { ENTRY_INPUT_MODE_LABELS } from '@/lib/finance/entry';

type Props = {
  value: EntryInputMode;
  onChange: (mode: EntryInputMode) => void;
  disabled?: boolean;
};

export function FinanceEntryModeToggle({ value, onChange, disabled }: Props) {
  const modes: EntryInputMode[] = ['amount', 'units'];
  return (
    <div
      className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-0.5"
      role="group"
      aria-label="Modo de carga"
    >
      {modes.map((mode) => {
        const active = value === mode;
        return (
          <button
            key={mode}
            type="button"
            disabled={disabled}
            onClick={() => onChange(mode)}
            className={`min-h-[32px] rounded-[10px] px-3 text-[11px] font-bold transition disabled:opacity-50 ${
              active
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {ENTRY_INPUT_MODE_LABELS[mode]}
          </button>
        );
      })}
    </div>
  );
}
