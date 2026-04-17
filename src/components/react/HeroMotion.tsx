import { motion, useReducedMotion, type Variants } from 'motion/react';
import MagneticButton from '@/components/react/MagneticButton';
import { staggerContainer, staggerItem } from '@/components/react/motion-variants';
import { DURATION_ENTER, EASE_OUT_SOFT, HERO_WORD_STAGGER } from '@/motion/easing';

type Props = {
  eyebrow: string;
  headline: string;
  lead: string;
  /** Línea de invitación (tono cliente). */
  serviceLine?: string;
  pillA: string;
  pillB?: string;
  /** Opcional: nota corta a la derecha (solo lg). */
  aside?: string;
  ctaPrimary: string;
  ctaSecondary: string;
};

const headlineWordContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: HERO_WORD_STAGGER, delayChildren: 0.02 },
  },
};

const headlineWord: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION_ENTER, ease: EASE_OUT_SOFT },
  },
};

function ShimmerPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="pill-shimmer">
      <span className="pill-shimmer__inner inline-flex rounded-full px-3 py-1.5 text-[11px] font-medium tracking-wide text-muted">
        {children}
      </span>
    </span>
  );
}

export default function HeroMotion({
  eyebrow,
  headline,
  lead,
  serviceLine,
  pillA,
  pillB,
  aside,
  ctaPrimary,
  ctaSecondary,
}: Props) {
  const reduce = useReducedMotion();
  const words = headline.split(/\s+/).filter(Boolean);
  const hasService = Boolean(serviceLine?.trim());

  return (
    <motion.div
      className="relative z-10 grid gap-8 lg:grid-cols-12 lg:items-start lg:gap-10"
      variants={staggerContainer}
      initial={reduce ? 'visible' : 'hidden'}
      animate="visible"
    >
      <motion.p className="text-eyebrow lg:col-span-8 lg:col-start-1 lg:row-start-1" variants={staggerItem}>
        {eyebrow}
      </motion.p>

      {reduce ? (
        <h1
          id="hero-heading"
          className="text-display-hero text-balance text-text lg:col-span-8 lg:col-start-1 lg:row-start-2"
        >
          {headline}
        </h1>
      ) : (
        <motion.h1
          id="hero-heading"
          className="text-display-hero text-balance text-text lg:col-span-8 lg:col-start-1 lg:row-start-2"
          variants={headlineWordContainer}
        >
          {words.map((w, i) => (
            <motion.span key={`${w}-${i}`} className="mr-[0.22em] inline-block last:mr-0" variants={headlineWord}>
              {w}
            </motion.span>
          ))}
        </motion.h1>
      )}

      <motion.p
        className="text-lead mt-5 max-w-[36rem] text-pretty text-muted lg:col-span-8 lg:col-start-1 lg:row-start-3"
        variants={staggerItem}
      >
        {lead}
      </motion.p>
      {hasService ? (
        <motion.p
          className="mt-4 max-w-[36rem] text-pretty text-sm font-medium leading-relaxed text-text/90 lg:col-span-8 lg:col-start-1 lg:row-start-4"
          variants={staggerItem}
        >
          {serviceLine!.trim()}
        </motion.p>
      ) : null}
      <motion.div
        className={`mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 lg:col-span-8 lg:col-start-1 max-lg:mt-6 ${hasService ? 'lg:row-start-5' : 'lg:row-start-4'}`}
        variants={staggerItem}
      >
        <MagneticButton href="#proyectos" shimmer>
          {ctaPrimary}
        </MagneticButton>
        <MagneticButton href="#contacto" variant="ghost">
          {ctaSecondary}
        </MagneticButton>
      </motion.div>

      <motion.div
        className={`flex flex-col items-start gap-2.5 lg:col-span-4 lg:col-start-9 lg:row-start-1 lg:items-end lg:self-end ${hasService ? 'lg:row-end-6' : 'lg:row-end-5'}`}
        variants={staggerItem}
      >
        <ShimmerPill>{pillA}</ShimmerPill>
        {pillB?.trim() ? <ShimmerPill>{pillB.trim()}</ShimmerPill> : null}
        {aside?.trim() ? (
          <p className="mt-2 max-w-[17rem] text-right text-[11px] leading-relaxed text-muted max-lg:hidden">{aside}</p>
        ) : null}
      </motion.div>
    </motion.div>
  );
}
