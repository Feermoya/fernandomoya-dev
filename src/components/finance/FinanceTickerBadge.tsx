type Props = {
  ticker: string;
  tone?: 'blue' | 'emerald' | 'amber' | 'slate';
};

const TONE_CLASS: Record<NonNullable<Props['tone']>, string> = {
  blue: 'border-blue-200 bg-blue-50 text-blue-800',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  amber: 'border-amber-200 bg-amber-50 text-amber-800',
  slate: 'border-slate-200 bg-slate-50 text-slate-700',
};

export function FinanceTickerBadge({ ticker, tone = 'blue' }: Props) {
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-md border px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${TONE_CLASS[tone]}`}
    >
      <span className="truncate">{ticker}</span>
    </span>
  );
}
