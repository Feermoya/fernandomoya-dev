import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

type Props = {
  id?: string;
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  iconTone?: 'blue' | 'emerald' | 'amber' | 'violet' | 'slate' | 'red';
  as?: 'h2' | 'h3';
  trailing?: ReactNode;
  className?: string;
};

const TONE: Record<NonNullable<Props['iconTone']>, string> = {
  blue: 'border-blue-200 bg-blue-50 text-blue-600',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-600',
  amber: 'border-amber-200 bg-amber-50 text-amber-600',
  violet: 'border-violet-200 bg-violet-50 text-violet-600',
  slate: 'border-slate-200 bg-slate-50 text-slate-600',
  red: 'border-red-200 bg-red-50 text-red-600',
};

/** Cabecera de sección: icono semántico + título + subtítulo opcional. */
export function FinanceSectionHeading({
  id,
  title,
  subtitle,
  icon: Icon,
  iconTone = 'blue',
  as: Tag = 'h2',
  trailing,
  className = '',
}: Props) {
  return (
    <div className={`flex items-start justify-between gap-2 ${className}`}>
      <div className="flex min-w-0 items-start gap-2.5">
        <span
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${TONE[iconTone]}`}
          aria-hidden
        >
          <Icon size={16} strokeWidth={2.25} />
        </span>
        <div className="min-w-0">
          <Tag id={id} className="finance-section-title">
            {title}
          </Tag>
          {subtitle ? <p className="finance-section-sub mt-0.5">{subtitle}</p> : null}
        </div>
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  );
}
