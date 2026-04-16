import type { Variants } from 'motion/react';
import { DURATION_ENTER, DURATION_STAGGER_CHILD, EASE_OUT_SOFT } from '@/motion/easing';

/**
 * Variantes Motion: solo opacity + transform (GPU).
 * Sin filter/blur sobre texto (legibilidad + criterio de calidad).
 */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION_ENTER, ease: EASE_OUT_SOFT },
  },
};

export const projectGridContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06 },
  },
};

export const projectGridItem: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: DURATION_STAGGER_CHILD, ease: EASE_OUT_SOFT },
  },
};
