import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { lfDuration, lfEaseOut, type ScoreDirection } from '@/components/tournaments/motion/motionConfig';

type Props = {
  value: number;
  direction: ScoreDirection;
};

export default function AnimatedScore({ value, direction }: Props) {
  const reduced = useReducedMotion() ?? false;
  const [current, setCurrent] = useState(value);
  const [previous, setPrevious] = useState<{ value: number; id: number } | null>(null);
  const dirRef = useRef<1 | -1>(1);
  const exitId = useRef(0);

  useEffect(() => {
    if (value === current) return;
    if (reduced || direction === 0) {
      setPrevious(null);
      setCurrent(value);
      return;
    }
    dirRef.current = direction > 0 ? 1 : -1;
    const id = exitId.current + 1;
    exitId.current = id;
    setPrevious({ value: current, id });
    setCurrent(value);
  }, [value, direction, reduced, current]);

  const dir = dirRef.current;
  const enterY = dir > 0 ? 22 : -22;
  const exitY = dir > 0 ? -22 : 22;

  return (
    <span className="score-readout">
      <span className="sr-only" aria-live="polite">
        {current}
      </span>
      <span className="score-figure" aria-hidden>
        {previous != null && (
          <motion.b
            key={previous.id}
            initial={{ y: 0, opacity: 1 }}
            animate={{ y: exitY, opacity: 0 }}
            transition={{ duration: lfDuration.score, ease: lfEaseOut }}
            onAnimationComplete={() =>
              setPrevious((item) => (item?.id === previous.id ? null : item))
            }
          >
            {previous.value}
          </motion.b>
        )}
        <motion.b
          key={current}
          initial={previous == null ? false : { y: enterY, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: lfDuration.score, ease: lfEaseOut }}
        >
          {current}
        </motion.b>
      </span>
    </span>
  );
}
