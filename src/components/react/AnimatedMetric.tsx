import {
  animate,
  useInView,
  useReducedMotion,
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
 * Count-up al entrar en viewport.
 * Usa animate + onUpdate para evitar quedar en 0 si el motion value no propaga el evento.
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
  const inView = useInView(ref, { once: true, amount: 0.45, margin: '0px 0px -48px 0px' });
  const [display, setDisplay] = useState(0);
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    if (!inView || hasAnimatedRef.current) return;
    hasAnimatedRef.current = true;

    if (reduce) {
      setDisplay(end);
      return;
    }

    setDisplay(0);
    const ctrl = animate(0, end, {
      duration: DURATION_MAX,
      ease: EASE_OUT_SOFT,
      onUpdate: (v) => setDisplay(Math.round(v)),
      onComplete: () => setDisplay(end),
    });

    return () => ctrl.stop();
  }, [inView, end, reduce]);

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
