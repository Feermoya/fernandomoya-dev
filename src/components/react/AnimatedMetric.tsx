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
  className?: string;
  valueClassName?: string;
  labelClassName?: string;
};

/**
 * Count-up al entrar en viewport: useMotionValue + useTransform + useMotionValueEvent.
 * Sin backdrop-filter en el contenedor (texto legible sobre glass).
 */
export default function AnimatedMetric({
  end,
  suffix = '',
  label,
  className,
  valueClassName,
  labelClassName,
}: Props) {
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
      setDisplay(end);
      return;
    }
    const ctrl = animate(count, end, { duration: DURATION_MAX, ease: EASE_OUT_SOFT });
    return () => ctrl.stop();
  }, [inView, end, count, reduce]);

  return (
    <div
      ref={ref}
      className={
        className ??
        'rounded-xl border border-white/[0.06] bg-white/[0.06] px-4 py-3'
      }
    >
      <p
        className={
          valueClassName ??
          'bg-gradient-to-r from-[#60a5fa] to-[#a78bfa] bg-clip-text text-4xl font-extrabold tabular-nums tracking-tight text-transparent'
        }
      >
        {display}
        {suffix}
      </p>
      <p
        className={
          labelClassName ??
          'mt-1 text-xs leading-snug tracking-[0.04em] text-white/40'
        }
      >
        {label}
      </p>
    </div>
  );
}
