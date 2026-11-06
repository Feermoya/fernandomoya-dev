type Props = {
  /** 0–∞; el trazo se limita a 100. */
  percent: number;
  /** 0–1, ya con la curva de entrada. 1 muestra el valor final. */
  progress: number;
  size?: number;
  stroke?: number;
  label: string;
};

export function FocoProgressRing({
  percent,
  progress,
  size = 112,
  stroke = 9,
  label,
}: Props) {
  const center = size / 2;
  const radius = center - stroke / 2 - 0.5;
  const c = 2 * Math.PI * radius;
  const shown = Math.max(0, percent) * Math.min(1, Math.max(0, progress));
  const visual = Math.min(100, shown);
  const done = percent >= 100;
  const offset = c - (visual / 100) * c;

  return (
    <div
      className="foco-ring"
      style={{ width: size, height: size }}
      role="img"
      aria-label={label}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--border-card)"
          strokeWidth={stroke}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={done ? 'var(--success)' : 'var(--primary)'}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </svg>
      <span className="foco-ring__pct tabular-nums">{Math.round(shown)}%</span>
    </div>
  );
}
