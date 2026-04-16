import { motion, useReducedMotion } from 'motion/react';
import { DURATION_ENTER, EASE_OUT_SOFT } from '@/motion/easing';

export default function NotFoundClient() {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className="container-page py-24 text-center"
      initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : DURATION_ENTER, ease: EASE_OUT_SOFT }}
    >
      <p className="text-eyebrow">404</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-text">No encontrado</h1>
      <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted">
        Esta URL no existe. Volvé al inicio de la landing.
      </p>
      <div className="mt-10 flex justify-center gap-3">
        <a
          href="/"
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-transparent bg-accent px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-accent-hover"
        >
          Ir al inicio
        </a>
        <a
          href="/#proyectos"
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-white/[0.1] bg-white/[0.08] px-5 py-2.5 text-sm font-medium text-muted shadow-glass-depth-sm transition hover:border-white/[0.18] hover:bg-white/[0.1] hover:text-text"
        >
          Proyectos
        </a>
      </div>
    </motion.div>
  );
}
