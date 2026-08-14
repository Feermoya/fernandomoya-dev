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
import type { CollectedSeriesPoint } from '@/lib/panel/view-types';
import {
  computeCollectedDelta,
  formatCollectedDeltaBadge,
  type CollectedDeltaInfo,
} from '@/lib/panel/charges/collectedByMonth';
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
  series: CollectedSeriesPoint[];
};

export type { CollectedDeltaInfo };

/** Re-export para tests / callers que usaban nombres MRR. */
export function computeMrrDelta(series: CollectedSeriesPoint[]): CollectedDeltaInfo | null {
  return computeCollectedDelta(series);
}

export function formatDeltaBadge(delta: CollectedDeltaInfo): string {
  return formatCollectedDeltaBadge(delta);
}

/** Card Cobrado por mes + Chart.js (line). Solo ARS reales de payments. */
export function CollectedMonthChart({ series }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);
  const gradientId = useId().replace(/:/g, '');

  const delta = computeCollectedDelta(series);
  const displayArs = series.length > 0 ? series[series.length - 1].collectedArs : 0;

  useEffect(() => {
    if (!canvasRef.current || series.length === 0) return;

    chartRef.current?.destroy();

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const gradient = ctx.createLinearGradient(0, 0, 0, 180);
    gradient.addColorStop(0, 'rgba(79, 70, 229, 0.22)');
    gradient.addColorStop(1, 'rgba(79, 70, 229, 0)');

    const values = series.map((p) => p.collectedArs);
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
              label: (item) => formatCurrencyAmount(Number(item.raw), 'ARS'),
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
      <p className="panel-chart-card__title">Cobrado por mes</p>
      <div className="panel-chart-card__headline">
        <p className="panel-chart-card__value">
          {formatCurrencyAmount(displayArs, 'ARS')}
        </p>
        {delta ? (
          <span
            className={`panel-chart-card__badge panel-chart-card__badge--${delta.direction}`}
          >
            {formatCollectedDeltaBadge(delta)}
          </span>
        ) : series.length > 0 ? (
          <span className="panel-chart-card__badge panel-chart-card__badge--muted">
            Sin mes anterior
          </span>
        ) : null}
      </div>
      <p className="panel-chart-card__delta">
        {delta ? 'Respecto del mes anterior · ARS cobrado' : 'Pagos reales agrupados por mes'}
      </p>

      {series.length === 0 ? (
        <div className="panel-chart-empty" role="status">
          <span className="panel-chart-empty__icon" aria-hidden>
            <ChartNoAxesCombined size={22} strokeWidth={2} />
          </span>
          <p className="panel-chart-empty__title">Todavía no hay cobros</p>
          <p className="panel-chart-empty__copy">
            El gráfico aparecerá cuando haya pagos registrados en ARS.
          </p>
        </div>
      ) : (
        <div className="panel-chart-card__canvas-wrap">
          <canvas
            ref={canvasRef}
            role="img"
            aria-label="Gráfico de cobrado por mes en pesos"
          />
        </div>
      )}
    </div>
  );
}

/** Alias de compatibilidad con el nombre anterior del componente. */
export const MrrTrendChart = CollectedMonthChart;
