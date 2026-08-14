import { useEffect, useId, useRef } from 'react';
import {
  Chart,
  Filler,
  LineController,
  LineElement,
  LinearScale,
  CategoryScale,
  PointElement,
  Tooltip,
  type ChartConfiguration,
} from 'chart.js';
import { ChartNoAxesCombined } from 'lucide-react';
import type { MrrSeriesPoint } from '@/lib/panel/view-types';
import { formatCurrencyAmount } from '@/components/panel/CurrencyAmount';

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
);

type Props = {
  series: MrrSeriesPoint[];
  /** MRR contractual actual (services activos). */
  currentMrrUsd?: number;
};

export type MrrDeltaInfo = {
  pct: number;
  direction: 'up' | 'down' | 'flat';
  previousLabel: string;
};

/**
 * Delta %: (current - previous) / previous * 100.
 * Usa los dos últimos puntos de la serie confiable. Null si previous ≤ 0 o < 2 puntos.
 */
export function computeMrrDelta(series: MrrSeriesPoint[]): MrrDeltaInfo | null {
  if (series.length < 2) return null;
  const last = series[series.length - 1];
  const prev = series[series.length - 2];
  if (!(prev.mrrUsd > 0)) return null;
  const pct = ((last.mrrUsd - prev.mrrUsd) / prev.mrrUsd) * 100;
  const direction = pct > 0.05 ? 'up' : pct < -0.05 ? 'down' : 'flat';
  return { pct, direction, previousLabel: prev.label.toLowerCase() };
}

export function formatDeltaBadge(delta: MrrDeltaInfo): string {
  const rounded = Math.round(delta.pct * 10) / 10;
  const sign = rounded > 0 ? '+' : '';
  const pct = `${sign}${rounded.toLocaleString('es-AR', { maximumFractionDigits: 1 })}%`;
  return `${pct} vs ${delta.previousLabel}`;
}

/** Card MRR + Chart.js (line). Solo historial contractual USD confiable. */
export function MrrTrendChart({ series, currentMrrUsd = 0 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);
  const gradientId = useId().replace(/:/g, '');

  const delta = computeMrrDelta(series);
  const displayUsd =
    series.length > 0 ? series[series.length - 1].mrrUsd : currentMrrUsd;

  useEffect(() => {
    if (!canvasRef.current || series.length === 0) return;

    chartRef.current?.destroy();

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const gradient = ctx.createLinearGradient(0, 0, 0, 180);
    gradient.addColorStop(0, 'rgba(79, 70, 229, 0.22)');
    gradient.addColorStop(1, 'rgba(79, 70, 229, 0)');

    const values = series.map((p) => p.mrrUsd);
    const pointRadii = series.map((_, i) => (i === series.length - 1 ? 5 : 0));
    const pointHover = series.map((_, i) => (i === series.length - 1 ? 6 : 4));

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels: series.map((p) => p.label),
        datasets: [
          {
            data: values,
            borderColor: '#4f46e5',
            backgroundColor: gradient,
            fill: true,
            tension: 0.35,
            borderWidth: 2.75,
            pointRadius: pointRadii,
            pointHoverRadius: pointHover,
            pointBackgroundColor: '#4f46e5',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            displayColors: false,
            backgroundColor: '#111827',
            titleFont: { size: 12, weight: 600 },
            bodyFont: { size: 13, weight: 600 },
            padding: 10,
            callbacks: {
              label: (item) =>
                formatCurrencyAmount(Number(item.raw), 'USD'),
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: {
              color: '#6b7280',
              font: { size: 11, weight: 600 },
              maxRotation: 0,
            },
          },
          y: {
            display: false,
            beginAtZero: false,
            grace: '8%',
          },
        },
      },
    };

    chartRef.current = new Chart(ctx, config);

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [series, gradientId]);

  return (
    <div className="panel-chart-card">
      <p className="panel-chart-card__title">Evolución MRR USD</p>
      <div className="panel-chart-card__headline">
        <p className="panel-chart-card__value">{formatCurrencyAmount(displayUsd, 'USD')}</p>
        {delta ? (
          <span
            className={`panel-chart-card__badge panel-chart-card__badge--${delta.direction}`}
          >
            {formatDeltaBadge(delta)}
          </span>
        ) : series.length > 0 ? (
          <span className="panel-chart-card__badge panel-chart-card__badge--muted">
            Sin histórico
          </span>
        ) : null}
      </div>
      <p className="panel-chart-card__delta">
        {delta
          ? 'Respecto del período anterior · contractual USD'
          : 'MRR actual · servicios activos'}
      </p>

      {series.length === 0 ? (
        <div className="panel-chart-empty" role="status">
          <span className="panel-chart-empty__icon" aria-hidden>
            <ChartNoAxesCombined size={22} strokeWidth={2} />
          </span>
          <p className="panel-chart-empty__title">Todavía no hay historial</p>
          <p className="panel-chart-empty__copy">
            La evolución aparecerá a medida que haya períodos contractuales en USD.
          </p>
        </div>
      ) : (
        <div className="panel-chart-card__canvas-wrap">
          <canvas
            ref={canvasRef}
            role="img"
            aria-label="Gráfico de evolución del MRR en dólares"
          />
        </div>
      )}
    </div>
  );
}
