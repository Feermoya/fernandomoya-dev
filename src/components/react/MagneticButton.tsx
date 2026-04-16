import { motion, useMotionValue, useReducedMotion } from 'motion/react';
import { useCallback, useRef } from 'react';

type Variant = 'primary' | 'ghost';

const primaryClass =
  'relative inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-transparent bg-accent px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100';

const ghostClass =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-white/[0.1] bg-white/[0.08] px-5 py-2.5 text-sm font-medium text-muted shadow-glass-depth-sm transition-[transform,box-shadow,background-color,border-color,color] duration-200 ease-out hover:border-white/[0.18] hover:bg-white/[0.1] hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100';

type Props = {
  href: string;
  variant?: Variant;
  className?: string;
  /** Shimmer en hover (solo sentido con variant primary). */
  shimmer?: boolean;
  children: React.ReactNode;
};

export default function MagneticButton({
  href,
  variant = 'primary',
  className = '',
  shimmer = false,
  children,
}: Props) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLAnchorElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const onMove = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (reduce || !ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width - 0.5;
      const ny = (e.clientY - rect.top) / rect.height - 0.5;
      const tx = Math.max(-8, Math.min(8, nx * 16));
      const ty = Math.max(-5, Math.min(5, ny * 10));
      x.set(tx);
      y.set(ty);
    },
    [reduce, x, y],
  );

  const onLeave = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  const base = variant === 'primary' ? primaryClass : ghostClass;
  const shimmerWrap = variant === 'primary' && shimmer && !reduce ? 'btn-shimmer-wrap' : '';

  return (
    <motion.a
      ref={ref}
      href={href}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`${base} ${shimmerWrap} ${className}`.trim()}
    >
      <motion.span
        className="relative z-[1] inline-flex items-center justify-center gap-2 will-change-transform motion-reduce:will-change-auto"
        style={reduce ? undefined : { x, y }}
      >
        {children}
      </motion.span>
    </motion.a>
  );
}
