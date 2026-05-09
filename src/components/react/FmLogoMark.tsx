import { motion, useReducedMotion } from 'motion/react';
import { forwardRef } from 'react';

export type FmLogoMarkProps = {
  className?: string;
};

/**
 * Mismo monograma FM que la barra de navegación: `site-logo-fm-wrap` + letras con gradiente global.
 */
const FmLogoMark = forwardRef<HTMLSpanElement, FmLogoMarkProps>(function FmLogoMark(
  { className = '' },
  ref,
) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      ref={ref}
      className={`site-logo-fm-wrap inline-flex h-9 min-w-[2.625rem] items-center justify-center overflow-hidden rounded-lg border border-white/[0.12] bg-white/[0.05] px-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] will-change-transform motion-reduce:will-change-auto ${className}`}
      aria-hidden="true"
      whileHover={reduce ? undefined : { rotate: 4, scale: 1.04 }}
      transition={{ type: 'spring', stiffness: 420, damping: 22 }}
    >
      <span className="site-logo-fm">
        <span className="site-logo-fm__letter">F</span>
        <span className="site-logo-fm__letter">M</span>
      </span>
    </motion.span>
  );
});

export default FmLogoMark;
