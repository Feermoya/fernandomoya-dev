import { useEffect, useState } from 'react';

type Props = {
  /** 0–∞; el trazo se limita a 100. */
  percent: number;
  size?: number;
  stroke?: number;
  label: string;
  reducedMotion?: boolean;
};

export function FocoProgressRing({
  percent,
  size = 84,
  stroke = 9,
  label,
  reducedMotion,
}: Props) {
  const radius = 34;
  const c = 2 * Math.PI * radius;
  const visual = Math.min(100, Math.max(0, percent));
  const [drawn, setDrawn] = useState(reducedMotion ? visual : 0);
  const done = percent >= 100;

  useEffect(() => {
    if (reducedMotion) {
      setDrawn(visual);
      return;
    }
    setDrawn(0);
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setDrawn(visual));
    });
    return () => cancelAnimationFrame(id);
  }, [visual, reducedMotion]);

  const offset = c - (drawn / 100) * c;

  return (
    <div
      className="foco-ring"
      style={{ width: size, height: size }}
      role="img"
      aria-label={label}
    >
      <svg width={size} height={size} viewBox="0 0 84 84" aria-hidden>
        <circle
          cx="42"
          cy="42"
          r={radius}
          fill="none"
          stroke="var(--border-card)"
          strokeWidth={stroke}
        />
        <circle
          className="foco-ring__progress"
          cx="42"
          cy="42"
          r={radius}
          fill="none"
          stroke={done ? 'var(--success)' : 'var(--primary)'}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform="rotate(-90 42 42)"
        />
      </svg>
      <span className="foco-ring__pct tabular-nums">
        {Math.round(percent)}%
      </span>
    </div>
  );
}
