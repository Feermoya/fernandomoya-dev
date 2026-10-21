import { useEffect, useRef, useState } from 'react';
import type { ScoreDirection } from '@/components/tournaments/motion/motionConfig';

type Props = {
  value: number;
  direction: ScoreDirection;
};

export default function AnimatedScore({ value, direction }: Props) {
  const [current, setCurrent] = useState(value);
  const [previous, setPrevious] = useState<{ value: number; id: number } | null>(null);
  const dirRef = useRef<1 | -1>(1);
  const exitId = useRef(0);

  useEffect(() => {
    if (value === current) return;
    if (direction === 0) {
      setPrevious(null);
      setCurrent(value);
      return;
    }
    dirRef.current = direction > 0 ? 1 : -1;
    const id = exitId.current + 1;
    exitId.current = id;
    setPrevious({ value: current, id });
    setCurrent(value);
  }, [value, direction, current]);

  const dir = dirRef.current;
  const enterClass = dir > 0 ? 'tick-in-up' : 'tick-in-down';
  const exitClass = dir > 0 ? 'tick-out-up' : 'tick-out-down';

  return (
    <span className="score-readout">
      <span className="sr-only" aria-live="polite">
        {current}
      </span>
      <span className="score-figure" aria-hidden>
        {previous != null && (
          <b
            key={previous.id}
            className={exitClass}
            onAnimationEnd={() => setPrevious((item) => (item?.id === previous.id ? null : item))}
          >
            {previous.value}
          </b>
        )}
        <b key={current} className={previous == null ? undefined : enterClass}>
          {current}
        </b>
      </span>
    </span>
  );
}
