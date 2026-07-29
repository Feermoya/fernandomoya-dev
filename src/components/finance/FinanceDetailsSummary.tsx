import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

type Props = {
  icon: LucideIcon;
  label: string;
  tone?: 'default' | 'danger';
  trailing?: ReactNode;
};

/** Summary tipado para acordeones de Foco (sin cambiar el layout del details). */
export function FinanceDetailsSummary({
  icon: Icon,
  label,
  tone = 'default',
  trailing,
}: Props) {
  const danger = tone === 'danger';
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2.5">
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${
          danger
            ? 'border-red-200 bg-red-100 text-red-700'
            : 'border-slate-200 bg-slate-50 text-slate-600'
        }`}
        aria-hidden
      >
        <Icon size={14} strokeWidth={2.25} />
      </span>
      <span
        className={`truncate text-sm font-bold tracking-tight ${
          danger ? 'text-red-800' : 'text-slate-900'
        }`}
      >
        {label}
      </span>
      {trailing}
    </span>
  );
}
