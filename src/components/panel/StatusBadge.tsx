import { AlertCircle, CheckCircle2, Clock3, CalendarClock } from 'lucide-react';
import type { ChargeStatus } from '@/lib/panel/types';
import { cn } from '@/lib/panel/cn';

const META: Record<
  ChargeStatus,
  { label: string; className: string; Icon: typeof Clock3 }
> = {
  upcoming: { label: 'Próximo', className: 'panel-badge--upcoming', Icon: CalendarClock },
  due_today: { label: 'Hoy', className: 'panel-badge--due_today', Icon: Clock3 },
  overdue: { label: 'Vencido', className: 'panel-badge--overdue', Icon: AlertCircle },
  paid: { label: 'Pagado', className: 'panel-badge--paid', Icon: CheckCircle2 },
};

type Props = {
  status: ChargeStatus;
  className?: string;
};

export function StatusBadge({ status, className }: Props) {
  const meta = META[status];
  const Icon = meta.Icon;
  return (
    <span className={cn('panel-badge', meta.className, className)}>
      <Icon size={12} strokeWidth={2.5} aria-hidden />
      <span>{meta.label}</span>
    </span>
  );
}
