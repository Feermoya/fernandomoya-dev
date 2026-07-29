import { ArrowRight, TrendingDown, TrendingUp } from 'lucide-react';

export type FinanceDeltaDirection = 'up' | 'down' | 'flat';

export type FinanceDeltaProps = {
  /** Variación absoluta (current - previous). Si null/undefined y no hay pct, no renderiza. */
  absolute?: number | null;
  /** Variación porcentual ya redondeada. */
  percent?: number | null;
  /** Texto de comparación, ej. "vs jun 2026". */
  versus?: string;
  /**
   * Interpretación: `invest` = subir es positivo; `cost` = subir es negativo;
   * `neutral` = solo dirección sin semántica bueno/malo.
   */
  sense?: 'invest' | 'cost' | 'neutral';
  className?: string;
  size?: 'sm' | 'md';
};

function resolveDirection(absolute?: number | null, percent?: number | null): FinanceDeltaDirection | null {
  const value = percent ?? absolute;
  if (value == null || !Number.isFinite(value)) return null;
  if (value > 0) return 'up';
  if (value < 0) return 'down';
  return 'flat';
}

function toneClasses(
  direction: FinanceDeltaDirection,
  sense: NonNullable<FinanceDeltaProps['sense']>,
): string {
  if (direction === 'flat' || sense === 'neutral') return 'text-slate-500';
  const positive = sense === 'invest' ? direction === 'up' : direction === 'down';
  return positive ? 'text-emerald-700' : 'text-red-700';
}

function toneBg(
  direction: FinanceDeltaDirection,
  sense: NonNullable<FinanceDeltaProps['sense']>,
): string {
  if (direction === 'flat' || sense === 'neutral') return 'bg-slate-100';
  const positive = sense === 'invest' ? direction === 'up' : direction === 'down';
  return positive ? 'bg-emerald-50' : 'bg-red-50';
}

/**
 * Indicador de variación: icono + color + texto (no solo color).
 */
export function FinanceDelta({
  absolute,
  percent,
  versus,
  sense = 'invest',
  className = '',
  size = 'sm',
}: FinanceDeltaProps) {
  const direction = resolveDirection(absolute, percent);
  if (!direction) return null;

  const Icon = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : ArrowRight;
  const symbol = direction === 'up' ? '▲' : direction === 'down' ? '▼' : '→';
  const pctLabel =
    percent != null && Number.isFinite(percent)
      ? `${percent > 0 ? '+' : percent < 0 ? '−' : ''}${Math.abs(Math.round(percent))}%`
      : null;

  const statusWord =
    direction === 'flat'
      ? 'Sin cambios'
      : sense === 'neutral'
        ? direction === 'up'
          ? 'Subió'
          : 'Bajó'
        : sense === 'invest'
          ? direction === 'up'
            ? 'Mejoró'
            : 'Empeoró'
          : direction === 'up'
            ? 'Subió'
            : 'Bajó';

  const textSize = size === 'md' ? 'text-[11px]' : 'text-[10px]';

  return (
    <span
      className={`inline-flex max-w-full flex-wrap items-center gap-1 rounded-md px-1.5 py-0.5 font-semibold tabular-nums ${textSize} ${toneBg(
        direction,
        sense,
      )} ${toneClasses(direction, sense)} ${className}`}
      role="status"
    >
      <span aria-hidden className="inline-flex items-center gap-0.5">
        <Icon size={size === 'md' ? 12 : 11} strokeWidth={2.5} />
      </span>
      <span>
        {pctLabel ?? symbol} · {statusWord}
      </span>
      {versus ? <span className="font-medium opacity-80">{versus}</span> : null}
    </span>
  );
}

/** Helpers de comparación sin tocar lógica de negocio. */
export function deltaPercent(current: number, previous: number): number | null {
  if (!(previous > 0) || !Number.isFinite(current) || !Number.isFinite(previous)) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export function formatMonthShort(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  return new Date(y, m - 1, 1).toLocaleDateString('es-AR', { month: 'short', year: 'numeric' });
}
