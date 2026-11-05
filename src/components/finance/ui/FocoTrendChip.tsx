import { TrendingDown, TrendingUp } from 'lucide-react';
import { FOCO_ICON_STROKE } from '@/components/finance/ui/focoUi';

type Props = {
  percent: number;
  versus: string;
  className?: string;
};

export function FocoTrendChip({ percent, versus, className = '' }: Props) {
  const improved = percent > 0;
  const worsened = percent < 0;
  if (!improved && !worsened) return null;

  const Icon = improved ? TrendingUp : TrendingDown;
  const label = improved ? 'Mejoró' : 'Empeoró';
  const pct = `${percent > 0 ? '+' : '−'}${Math.abs(Math.round(percent))}%`;

  return (
    <div
      className={`foco-trend ${improved ? 'foco-trend--up' : 'foco-trend--down'} ${className}`.trim()}
      role="status"
    >
      <Icon size={16} strokeWidth={FOCO_ICON_STROKE} aria-hidden />
      <span className="tabular-nums">
        {pct} · {label} {versus}
      </span>
    </div>
  );
}
