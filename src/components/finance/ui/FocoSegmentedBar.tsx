import { useEffect, useState } from 'react';

type Props = {
  /** 0–100 */
  percent: number;
  segments?: number;
  'aria-label'?: string;
  reducedMotion?: boolean;
};

export function FocoSegmentedBar({
  percent,
  segments = 4,
  'aria-label': ariaLabel,
  reducedMotion,
}: Props) {
  const filled = Math.min(segments, Math.max(0, Math.ceil((Math.min(100, percent) / 100) * segments)));
  const [ready, setReady] = useState(Boolean(reducedMotion));

  useEffect(() => {
    if (reducedMotion) {
      setReady(true);
      return;
    }
    setReady(false);
    const t = window.setTimeout(() => setReady(true), 30);
    return () => window.clearTimeout(t);
  }, [percent, reducedMotion]);

  return (
    <div
      className="foco-segments"
      role="progressbar"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
    >
      {Array.from({ length: segments }, (_, i) => {
        const isFill = i < filled;
        const isLast = i === filled - 1;
        return (
          <span
            key={i}
            className={`foco-segments__cell ${isFill ? 'is-filled' : ''} ${
              isFill && isLast && ready ? 'is-animating' : ''
            }`}
          />
        );
      })}
    </div>
  );
}
