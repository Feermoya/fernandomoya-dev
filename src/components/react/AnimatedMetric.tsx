import {
  animate,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
} from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { DURATION_MAX, EASE_OUT_SOFT } from '@/motion/easing';

type Props = {
  end: number;
  suffix?: string;
  label: string;
};

/**
 * Count-up al entrar en viewport: useMotionValue + useTransform + useMotionValueEvent.
 * Sin backdrop-filter en el contenedor (texto legible sobre glass).
 */
export default function AnimatedMetric({ end, suffix = '', label }: Props) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);

  useMotionValueEvent(rounded, 'change', (v) => setDisplay(v));

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      count.set(end);
      return;
    }
    const ctrl = animate(count, end, { duration: DURATION_MAX, ease: EASE_OUT_SOFT });
    return () => ctrl.stop();
  }, [inView, end, count, reduce]);

  return (
    <div ref={ref} className="rounded-xl border border-white/[0.1] bg-white/[0.06] px-4 py-3">
      <p className="text-2xl font-semibold tabular-nums tracking-tight text-text">
        {display}
        {suffix}
      </p>
      <p className="mt-1 text-[11px] leading-snug text-muted">{label}</p>
    </div>
  );
}
