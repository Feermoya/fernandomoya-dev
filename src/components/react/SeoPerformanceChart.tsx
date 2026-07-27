import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReducedMotion } from 'motion/react';
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { SeoPerformancePoint } from '@/data/seo-performance';
import { seoPerformanceSummary } from '@/data/seo-performance';

gsap.registerPlugin(ScrollTrigger);

type Summary = typeof seoPerformanceSummary;

type Props = {
  series: SeoPerformancePoint[];
  summary: Summary;
};

type CumulativePoint = SeoPerformancePoint & {
  cumulativeClicks: number;
  cumulativeImpressions: number;
};

type ChartPoint = {
  x: number;
  y: number;
  raw: CumulativePoint;
};

const VIEW_W = 800;
const VIEW_H = 300;
const PAD = { top: 22, right: 52, bottom: 34, left: 42 };

const CLICKS_MAX = 180;
const IMPRESSIONS_MAX = 2100;
const LEFT_TICKS = [0, 60, 120, 180];
const RIGHT_TICKS = [0, 700, 1400, 2100];

function formatMetric(value: number, kind: keyof Summary): string {
  if (kind === 'clicks') return new Intl.NumberFormat('es-AR').format(Math.round(value));
  if (kind === 'impressions') {
    if (value >= 1000) {
      const thousands = value / 1000;
      return `${thousands.toLocaleString('es-AR', {
        minimumFractionDigits: value >= 2000 ? 2 : 1,
        maximumFractionDigits: 2,
      })} mil`;
    }
    return new Intl.NumberFormat('es-AR').format(Math.round(value));
  }
  if (kind === 'averagePosition') {
    return value.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }
  return String(value);
}

function formatAxisRight(value: number): string {
  if (value >= 1000) {
    const thousands = value / 1000;
    return `${thousands.toLocaleString('es-AR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })} mil`;
  }
  return new Intl.NumberFormat('es-AR').format(value);
}

function formatCount(value: number): string {
  return new Intl.NumberFormat('es-AR').format(value);
}

function buildCumulativeSeries(series: SeoPerformancePoint[]): CumulativePoint[] {
  let clicksTotal = 0;
  let impressionsTotal = 0;

  return series.map((point) => {
    clicksTotal += point.clicks;
    impressionsTotal += point.impressions;
    return {
      ...point,
      cumulativeClicks: clicksTotal,
      cumulativeImpressions: impressionsTotal,
    };
  });
}

function buildLinePath(points: ChartPoint[]): string {
  if (points.length === 0) return '';
  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ');
}

function buildAreaPath(points: ChartPoint[], baseline: number): string {
  if (points.length === 0) return '';
  const first = points[0];
  const last = points[points.length - 1];
  return `${buildLinePath(points)} L ${last.x.toFixed(2)} ${baseline.toFixed(2)} L ${first.x.toFixed(2)} ${baseline.toFixed(2)} Z`;
}

function scaleY(value: number, max: number, chartH: number): number {
  const clamped = Math.max(0, Math.min(max, value));
  return PAD.top + chartH - (clamped / max) * chartH;
}

function normalizeCumulative(
  series: CumulativePoint[],
  key: 'cumulativeClicks' | 'cumulativeImpressions',
  max: number,
): ChartPoint[] {
  const chartW = VIEW_W - PAD.left - PAD.right;
  const chartH = VIEW_H - PAD.top - PAD.bottom;

  return series.map((raw, index) => {
    const x =
      series.length === 1
        ? PAD.left + chartW / 2
        : PAD.left + (index / (series.length - 1)) * chartW;
    const y = scaleY(raw[key], max, chartH);
    return { x, y, raw };
  });
}

function pickAxisLabels(series: CumulativePoint[]): { date: string; index: number }[] {
  if (series.length <= 6) {
    return series.map((point, index) => ({ date: point.date, index }));
  }
  const count = 6;
  const labels: { date: string; index: number }[] = [];
  for (let i = 0; i < count; i += 1) {
    const index = Math.round((i / (count - 1)) * (series.length - 1));
    labels.push({ date: series[index].date, index });
  }
  return labels;
}

function formatShortDate(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00`);
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }).replace('.', '');
}

function buildChartSummary(series: CumulativePoint[], summary: Summary): string {
  const first = series[0];
  const last = series[series.length - 1];
  return `Cómo fue creciendo la presencia en Google: de ${formatShortDate(first.date)} a ${formatShortDate(last.date)}. Final: ${formatMetric(summary.clicks, 'clicks')} visitas desde Google y ${formatMetric(summary.impressions, 'impressions')} apariciones.`;
}

export default function SeoPerformanceChart({ series, summary }: Props) {
  const reduceMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const impressionsPathRef = useRef<SVGPathElement>(null);
  const clicksPathRef = useRef<SVGPathElement>(null);
  const areaPathRef = useRef<SVGPathElement>(null);
  const gridGroupRef = useRef<SVGGElement>(null);
  const pointsGroupRef = useRef<SVGGElement>(null);
  const endLabelsRef = useRef<SVGGElement>(null);
  const axisGroupRef = useRef<SVGGElement>(null);
  const chartHeadingRef = useRef<HTMLParagraphElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const tooltipPinnedRef = useRef(false);

  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const cumulativeSeries = useMemo(() => buildCumulativeSeries(series), [series]);
  const clicksPoints = useMemo(
    () => normalizeCumulative(cumulativeSeries, 'cumulativeClicks', CLICKS_MAX),
    [cumulativeSeries],
  );
  const impressionsPoints = useMemo(
    () => normalizeCumulative(cumulativeSeries, 'cumulativeImpressions', IMPRESSIONS_MAX),
    [cumulativeSeries],
  );
  const axisLabels = useMemo(() => pickAxisLabels(cumulativeSeries), [cumulativeSeries]);
  const chartSummary = useMemo(
    () => buildChartSummary(cumulativeSeries, summary),
    [cumulativeSeries, summary],
  );

  const chartW = VIEW_W - PAD.left - PAD.right;
  const chartH = VIEW_H - PAD.top - PAD.bottom;
  const baseline = PAD.top + chartH;
  const lastIndex = cumulativeSeries.length - 1;
  const lastClicks = clicksPoints[lastIndex];
  const lastImpressions = impressionsPoints[lastIndex];

  const gridLines = useMemo(
    () => LEFT_TICKS.map((tick) => scaleY(tick, CLICKS_MAX, chartH)),
    [chartH],
  );

  useLayoutEffect(() => {
    const root = rootRef.current;
    const section = root?.closest('.seo-impact') as HTMLElement | null;
    if (!root || !section || series.length < 2) return;

    const headerTargets = section.querySelectorAll(
      '.seo-impact__eyebrow, .seo-impact__title, .seo-impact__lead, .seo-impact__case-id',
    );
    const noteTargets = section.querySelectorAll('.seo-impact__note');
    const legend = root.querySelector('.seo-impact__legend');
    const highlight = section.querySelector('.seo-impact__highlight');
    const chartHeading = chartHeadingRef.current;
    const counters = section.querySelectorAll<HTMLElement>('[data-seo-count]');
    const gridGroup = gridGroupRef.current;
    const pointsGroup = pointsGroupRef.current;
    const endLabels = endLabelsRef.current;
    const axisGroup = axisGroupRef.current;
    const impressionsPath = impressionsPathRef.current;
    const clicksPath = clicksPathRef.current;
    const areaPath = areaPathRef.current;

    const setFinalState = () => {
      gsap.set(headerTargets, { clearProps: 'all', opacity: 1, y: 0 });
      gsap.set(noteTargets, { clearProps: 'all', opacity: 1, y: 0 });
      if (highlight) gsap.set(highlight, { clearProps: 'all', opacity: 1, y: 0 });
      if (chartHeading) gsap.set(chartHeading, { clearProps: 'all', opacity: 1 });
      if (legend) gsap.set(legend, { clearProps: 'all', opacity: 1 });
      if (gridGroup) gsap.set(gridGroup, { opacity: 1 });
      if (axisGroup) gsap.set(axisGroup, { opacity: 1 });
      if (pointsGroup) gsap.set(pointsGroup, { opacity: 1 });
      if (endLabels) gsap.set(endLabels, { opacity: 1 });
      if (areaPath) gsap.set(areaPath, { opacity: 1 });
      if (impressionsPath) {
        gsap.set(impressionsPath, { strokeDasharray: 'none', strokeDashoffset: 0 });
      }
      if (clicksPath) {
        gsap.set(clicksPath, { strokeDasharray: 'none', strokeDashoffset: 0 });
      }
      counters.forEach((el) => {
        const key = el.dataset.seoCount as keyof Summary;
        const target = Number(el.dataset.seoValue);
        if (!key || Number.isNaN(target)) return;
        el.textContent = formatMetric(target, key);
      });
    };

    if (reduceMotion) {
      setFinalState();
      return;
    }

    const getPathLengths = () => ({
      impressionsLength: impressionsPath?.getTotalLength() ?? 0,
      clicksLength: clicksPath?.getTotalLength() ?? 0,
    });

    const killActiveTimeline = () => {
      timelineRef.current?.kill();
      timelineRef.current = null;
      gsap.killTweensOf(counters);
    };

    const resetState = (impressionsLength: number, clicksLength: number) => {
      killActiveTimeline();

      gsap.set(headerTargets, { opacity: 0, y: 18 });
      gsap.set(noteTargets, { opacity: 0, y: 10 });
      if (highlight) gsap.set(highlight, { opacity: 0, y: 8 });
      if (chartHeading) gsap.set(chartHeading, { opacity: 0 });
      if (legend) gsap.set(legend, { opacity: 0 });
      if (gridGroup) gsap.set(gridGroup, { opacity: 0 });
      if (axisGroup) gsap.set(axisGroup, { opacity: 0 });
      if (pointsGroup) gsap.set(pointsGroup, { opacity: 0 });
      if (endLabels) gsap.set(endLabels, { opacity: 0 });
      if (areaPath) gsap.set(areaPath, { opacity: 0 });

      if (impressionsPath && impressionsLength > 0) {
        gsap.set(impressionsPath, {
          strokeDasharray: impressionsLength,
          strokeDashoffset: impressionsLength,
        });
      }
      if (clicksPath && clicksLength > 0) {
        gsap.set(clicksPath, {
          strokeDasharray: clicksLength,
          strokeDashoffset: clicksLength,
        });
      }

      counters.forEach((el) => {
        const key = el.dataset.seoCount as keyof Summary;
        if (!key) return;
        el.textContent = formatMetric(0, key);
      });
    };

    const playAnimation = () => {
      const { impressionsLength, clicksLength } = getPathLengths();
      if (impressionsLength === 0 && clicksLength === 0) return;

      resetState(impressionsLength, clicksLength);

      const tl = gsap.timeline({
        defaults: { ease: 'power3.out' },
        onComplete: () => {
          if (timelineRef.current === tl) timelineRef.current = null;
        },
      });
      timelineRef.current = tl;

      tl.to(headerTargets, { opacity: 1, y: 0, duration: 0.4, stagger: 0.05 });
      if (highlight) tl.to(highlight, { opacity: 1, y: 0, duration: 0.35 }, 0.35);
      if (chartHeading) tl.to(chartHeading, { opacity: 1, duration: 0.3 }, 0.45);

      counters.forEach((el) => {
        const key = el.dataset.seoCount as keyof Summary;
        const target = Number(el.dataset.seoValue);
        if (!key || Number.isNaN(target)) return;
        const proxy = { value: 0 };
        tl.to(
          proxy,
          {
            value: target,
            duration: 1.1,
            ease: 'power2.out',
            onUpdate: () => {
              el.textContent = formatMetric(proxy.value, key);
            },
            onComplete: () => {
              el.textContent = formatMetric(target, key);
            },
          },
          0.2,
        );
      });

      tl.to([gridGroup, axisGroup], { opacity: 1, duration: 0.28 }, 0.25);

      if (impressionsPath && impressionsLength > 0) {
        tl.to(impressionsPath, { strokeDashoffset: 0, duration: 0.55, ease: 'power2.out' }, 0.4);
      }
      if (clicksPath && clicksLength > 0) {
        tl.to(clicksPath, { strokeDashoffset: 0, duration: 0.55, ease: 'power2.out' }, 0.62);
      }
      if (areaPath) {
        tl.to(areaPath, { opacity: 1, duration: 0.35 }, 0.75);
      }

      tl.to(pointsGroup, { opacity: 1, duration: 0.28 }, 1.1);
      tl.to(endLabels, { opacity: 1, duration: 0.3 }, 1.2);
      if (legend) tl.to(legend, { opacity: 1, duration: 0.28 }, 1.2);
      tl.to(noteTargets, { opacity: 1, y: 0, duration: 0.3 }, 1.25);
    };

    let scrollTrigger: ScrollTrigger | null = null;

    const setupScrollTrigger = () => {
      const { impressionsLength, clicksLength } = getPathLengths();
      if (impressionsLength === 0 && clicksLength === 0) {
        requestAnimationFrame(setupScrollTrigger);
        return;
      }

      scrollTrigger = ScrollTrigger.create({
        trigger: section,
        start: 'top 78%',
        end: 'bottom top',
        onEnter: playAnimation,
        onEnterBack: playAnimation,
      });

      ScrollTrigger.refresh();

      if (scrollTrigger.isActive) {
        playAnimation();
      }
    };

    const ctx = gsap.context(() => {
      requestAnimationFrame(setupScrollTrigger);
    }, section);

    return () => {
      killActiveTimeline();
      scrollTrigger?.kill();
      ctx.revert();
    };
  }, [reduceMotion, series.length]);

  useLayoutEffect(() => {
    const onDocPointer = (event: PointerEvent) => {
      if (!tooltipPinnedRef.current) return;
      const root = rootRef.current;
      if (!root) return;
      if (root.contains(event.target as Node)) return;
      tooltipPinnedRef.current = false;
      setTooltipVisible(false);
      setActiveIndex(null);
    };

    document.addEventListener('pointerdown', onDocPointer);
    return () => document.removeEventListener('pointerdown', onDocPointer);
  }, []);

  const pointerToIndex = useCallback(
    (clientX: number) => {
      const svg = svgRef.current;
      if (!svg || clicksPoints.length === 0) return null;

      const rect = svg.getBoundingClientRect();
      const relX = ((clientX - rect.left) / rect.width) * VIEW_W;
      let nearest = 0;
      let minDist = Infinity;

      clicksPoints.forEach((point, index) => {
        const dist = Math.abs(point.x - relX);
        if (dist < minDist) {
          minDist = dist;
          nearest = index;
        }
      });

      return nearest;
    },
    [clicksPoints],
  );

  const showTooltipAt = useCallback(
    (index: number) => {
      const wrap = rootRef.current;
      const svg = svgRef.current;
      if (!wrap || !svg) return;

      const rect = wrap.getBoundingClientRect();
      const svgRect = svg.getBoundingClientRect();
      const point = clicksPoints[index];
      const x = (point.x / VIEW_W) * svgRect.width;
      const clampedX = Math.max(64, Math.min(rect.width - 64, x));
      const y = Math.max(8, (point.y / VIEW_H) * svgRect.height - 8);

      setActiveIndex(index);
      setTooltipPos({ x: clampedX, y });
      setTooltipVisible(true);
    },
    [clicksPoints],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (event.pointerType === 'touch') return;
      tooltipPinnedRef.current = false;
      const index = pointerToIndex(event.clientX);
      if (index === null) return;
      showTooltipAt(index);
    },
    [pointerToIndex, showTooltipAt],
  );

  const onPointerLeave = useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    if (event.pointerType === 'touch' || tooltipPinnedRef.current) return;
    setTooltipVisible(false);
    setActiveIndex(null);
  }, []);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      const index = pointerToIndex(event.clientX);
      if (index === null) return;
      if (event.pointerType === 'touch') {
        tooltipPinnedRef.current = true;
      }
      showTooltipAt(index);
    },
    [pointerToIndex, showTooltipAt],
  );

  const activePoint = activeIndex !== null ? clicksPoints[activeIndex] : null;

  return (
    <div ref={rootRef} className="seo-impact__chart-wrap">
      <p ref={chartHeadingRef} className="seo-impact__chart-heading">
        Cómo fue creciendo la presencia en Google
      </p>
      <p className="seo-impact__chart-summary">{chartSummary}</p>

      <svg
        ref={svgRef}
        className="seo-impact__chart"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="img"
        aria-labelledby="seo-chart-desc"
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        onPointerDown={onPointerDown}
      >
        <desc id="seo-chart-desc">{chartSummary}</desc>

        <g ref={gridGroupRef} aria-hidden="true">
          {gridLines.map((y) => (
            <line
              key={y}
              className="seo-chart__grid-line"
              x1={PAD.left}
              y1={y}
              x2={VIEW_W - PAD.right}
              y2={y}
            />
          ))}
        </g>

        <g ref={axisGroupRef} aria-hidden="true">
          {LEFT_TICKS.map((tick) => (
            <text
              key={`l-${tick}`}
              className="seo-chart__axis-label seo-chart__axis-label--left"
              x={PAD.left - 8}
              y={scaleY(tick, CLICKS_MAX, chartH) + 3}
              textAnchor="end"
            >
              {tick}
            </text>
          ))}
          {RIGHT_TICKS.map((tick) => (
            <text
              key={`r-${tick}`}
              className="seo-chart__axis-label seo-chart__axis-label--right"
              x={VIEW_W - PAD.right + 8}
              y={scaleY(tick, IMPRESSIONS_MAX, chartH) + 3}
              textAnchor="start"
            >
              {formatAxisRight(tick)}
            </text>
          ))}
          {axisLabels.map(({ date, index }, labelIndex) => {
            const x =
              cumulativeSeries.length === 1
                ? PAD.left + chartW / 2
                : PAD.left + (index / (cumulativeSeries.length - 1)) * chartW;
            const sparse = labelIndex === 1 || labelIndex === 4;
            return (
              <text
                key={`${date}-${index}`}
                className="seo-chart__axis-label seo-chart__axis-label--date"
                data-sparse={sparse ? 'true' : undefined}
                x={x}
                y={VIEW_H - 8}
                textAnchor="middle"
              >
                {formatShortDate(date)}
              </text>
            );
          })}
        </g>

        <path
          ref={areaPathRef}
          className="seo-chart__area"
          d={buildAreaPath(clicksPoints, baseline)}
          aria-hidden="true"
        />

        <path
          ref={impressionsPathRef}
          className="seo-chart__line seo-chart__line--impressions"
          d={buildLinePath(impressionsPoints)}
          aria-hidden="true"
        />

        <path
          ref={clicksPathRef}
          className="seo-chart__line seo-chart__line--clicks"
          d={buildLinePath(clicksPoints)}
          aria-hidden="true"
        />

        {activePoint ? (
          <line
            className="seo-chart__guide"
            x1={activePoint.x}
            y1={PAD.top}
            x2={activePoint.x}
            y2={baseline}
            aria-hidden="true"
          />
        ) : null}

        <g ref={pointsGroupRef} aria-hidden="true">
          {lastImpressions ? (
            <circle
              className="seo-chart__point seo-chart__point--impressions seo-chart__point--final"
              cx={lastImpressions.x}
              cy={lastImpressions.y}
              r={activeIndex === lastIndex ? 5 : 4.5}
            />
          ) : null}
          {lastClicks ? (
            <circle
              className="seo-chart__point seo-chart__point--clicks seo-chart__point--final"
              cx={lastClicks.x}
              cy={lastClicks.y}
              r={activeIndex === lastIndex ? 5.5 : 5}
            />
          ) : null}
        </g>

        <g ref={endLabelsRef} className="seo-chart__end-labels" aria-hidden="true">
          {lastClicks ? (
            <text
              className="seo-chart__end-label seo-chart__end-label--clicks"
              x={Math.min(lastClicks.x - 8, VIEW_W - PAD.right - 8)}
              y={lastClicks.y - 10}
              textAnchor="end"
            >
              {formatCount(summary.clicks)} visitas
            </text>
          ) : null}
          {lastImpressions ? (
            <text
              className="seo-chart__end-label seo-chart__end-label--impressions"
              x={Math.min(lastImpressions.x - 8, VIEW_W - PAD.right - 8)}
              y={lastImpressions.y + 16}
              textAnchor="end"
            >
              {formatMetric(summary.impressions, 'impressions')} apariciones
            </text>
          ) : null}
        </g>
      </svg>

      <div
        className="seo-impact__tooltip"
        data-visible={tooltipVisible ? 'true' : 'false'}
        style={{ left: tooltipPos.x, top: tooltipPos.y }}
        aria-hidden={!tooltipVisible}
      >
        {activePoint ? (
          <>
            <span className="seo-impact__tooltip-date">
              {formatShortDate(activePoint.raw.date)}
            </span>
            <div className="seo-impact__tooltip-row">
              <span>Visitas acumuladas</span>
              <strong>{formatCount(activePoint.raw.cumulativeClicks)}</strong>
            </div>
            <div className="seo-impact__tooltip-row">
              <span>Apariciones acumuladas</span>
              <strong>{formatCount(activePoint.raw.cumulativeImpressions)}</strong>
            </div>
            <p className="seo-impact__tooltip-day">
              Ese día: {formatCount(activePoint.raw.clicks)} visitas ·{' '}
              {formatCount(activePoint.raw.impressions)} apariciones
            </p>
          </>
        ) : null}
      </div>

      <div className="seo-impact__legend">
        <span className="seo-impact__legend-item">
          <span className="seo-impact__legend-swatch seo-impact__legend-swatch--clicks" />
          Visitas desde Google
        </span>
        <span className="seo-impact__legend-item">
          <span className="seo-impact__legend-swatch seo-impact__legend-swatch--impressions" />
          Apariciones en Google
        </span>
      </div>
    </div>
  );
}
