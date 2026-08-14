import type { ReactNode } from 'react';
import {
  CalendarClock,
  ChartNoAxesCombined,
  CircleDollarSign,
  TrendingUp,
  TriangleAlert,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/panel/cn';

export type SummaryTone = 'default' | 'success' | 'danger' | 'warning' | 'info';

type Props = {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: SummaryTone;
  icon?: 'money' | 'alert' | 'calendar' | 'trend' | 'users' | 'chart';
  wide?: boolean;
  className?: string;
};

const ICONS = {
  money: CircleDollarSign,
  alert: TriangleAlert,
  calendar: CalendarClock,
  trend: TrendingUp,
  users: Users,
  chart: ChartNoAxesCombined,
} as const;

export function SummaryCard({
  label,
  value,
  hint,
  tone = 'default',
  icon = 'trend',
  wide = false,
  className,
}: Props) {
  const Icon = ICONS[icon];

  if (wide) {
    return (
      <article
        className={cn('panel-metric', 'panel-metric--wide', `panel-metric--${tone}`, className)}
      >
        <div className="panel-metric__wide-row">
          <div className="panel-metric__wide-copy">
            <p className="panel-metric__label">{label}</p>
            <p className="panel-metric__value">{value}</p>
            {hint ? <p className="panel-metric__hint">{hint}</p> : null}
          </div>
          <span className="panel-metric__icon panel-metric__icon--lg" aria-hidden>
            <Icon className="panel-metric__svg" size={18} strokeWidth={2.25} />
          </span>
        </div>
      </article>
    );
  }

  return (
    <article className={cn('panel-metric', `panel-metric--${tone}`, className)}>
      <div className="panel-metric__top">
        <p className="panel-metric__label">{label}</p>
        <span className="panel-metric__icon" aria-hidden>
          <Icon className="panel-metric__svg" size={14} strokeWidth={2.25} />
        </span>
      </div>
      <p className="panel-metric__value">{value}</p>
      {hint ? <p className="panel-metric__hint">{hint}</p> : null}
    </article>
  );
}
