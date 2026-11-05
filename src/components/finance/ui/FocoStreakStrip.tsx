import { useState } from 'react';
import { formatARS } from '@/lib/finance/calculations';
import type { StreakMonthCell } from '@/lib/finance/calculations';

type Props = {
  cells: StreakMonthCell[];
  streakCount?: number;
  ariaLabel: string;
  pulseMonth?: string | null;
  onCellActivate?: (cell: StreakMonthCell) => void;
};

export function FocoStreakStrip({
  cells,
  streakCount,
  ariaLabel,
  pulseMonth,
  onCellActivate,
}: Props) {
  const [tip, setTip] = useState<string | null>(null);
  const first = cells[0]?.label ?? '';
  const last = cells[cells.length - 1]?.label ?? '';

  return (
    <div className="foco-streak" aria-label={ariaLabel}>
      <div className="foco-streak__grid">
        {cells.map((c) => {
          const state = c.isFuture
            ? 'future'
            : c.qualified
              ? 'ok'
              : c.invested > 0
                ? 'low'
                : 'empty';
          const title = c.isFuture
            ? `${c.label}: mes futuro`
            : `${c.label}: ${formatARS(c.invested)}${c.qualified ? ' · cumplido' : c.invested > 0 ? ' · bajo' : ' · vacío'}`;

          return (
            <button
              key={c.month}
              type="button"
              title={title}
              aria-label={title}
              className={`foco-streak__cell foco-streak__cell--${state} ${
                c.isCurrent ? 'is-current' : ''
              } ${pulseMonth === c.month ? 'is-pulse' : ''}`}
              onClick={() => {
                setTip(title);
                onCellActivate?.(c);
                window.setTimeout(() => setTip(null), 2200);
              }}
            />
          );
        })}
      </div>
      <div className="foco-streak__ends">
        <span>{first}</span>
        <span>{last}</span>
      </div>
      <div className="foco-streak__legend">
        <span>
          <i className="foco-dot foco-dot--ok" /> Cumplido
        </span>
        <span>
          <i className="foco-dot foco-dot--low" /> Bajo
        </span>
        <span>
          <i className="foco-dot foco-dot--empty" /> Vacío
        </span>
        {typeof streakCount === 'number' ? (
          <span className="sr-only">Racha de {streakCount} meses</span>
        ) : null}
      </div>
      {tip ? (
        <p className="foco-streak__tip" role="status">
          {tip}
        </p>
      ) : null}
    </div>
  );
}
