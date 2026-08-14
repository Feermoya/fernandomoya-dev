import type { ReactNode } from 'react';
import { cn } from '@/lib/panel/cn';

type Props = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
};

export function PanelHeader({ title, subtitle, action, className }: Props) {
  return (
    <header className={cn('panel-header', className)}>
      <div className="min-w-0">
        <p className="panel-header__eyebrow">Panel de cobros</p>
        <h1 className="panel-header__title">{title}</h1>
        {subtitle ? <p className="panel-header__subtitle">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
