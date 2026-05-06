import { useLayoutEffect, useMemo, useRef } from 'react';
import { animate, motion, stagger, useReducedMotion, type Variants } from 'motion/react';
import MagneticButton from '@/components/react/MagneticButton';
import Typeanimation from '@/components/ui/typeanimation';
import { staggerContainer, staggerItem } from '@/components/react/motion-variants';
import { DURATION_ENTER, EASE_OUT_SOFT, HERO_WORD_STAGGER } from '@/motion/easing';
import SplitType from 'split-type';

type Props = {
  eyebrow: string;
  headline?: string;
  headlinePrefix?: string;
  animatedWords?: string[];
  headlineSuffix?: string;
  lead: string;
  /** Línea de invitación (tono cliente). */
  serviceLine?: string;
  pillA: string;
  pillB?: string;
  /** Opcional: nota corta a la derecha (solo lg). */
  aside?: string;
  ctaPrimary: string;
  ctaSecondary: string;
  ctaPrimaryHref?: string;
  ctaSecondaryHref?: string;
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

const HERO_SPLIT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

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
  headlinePrefix,
  animatedWords,
  headlineSuffix,
  lead,
  serviceLine,
  pillA,
  pillB,
  aside,
  ctaPrimary,
  ctaSecondary,
  ctaPrimaryHref,
  ctaSecondaryHref,
}: Props) {
  const reduce = useReducedMotion();
  const prefixRef = useRef<HTMLSpanElement>(null);
  const suffixRef = useRef<HTMLSpanElement>(null);
  const hasService = Boolean(serviceLine?.trim());

  // Si se proveen props animadas, usar animación, si no, fallback a headline clásico
  const showAnimated = headlinePrefix && animatedWords && animatedWords.length > 0 && headlineSuffix;

  /** Evita CLS: reserva espacio tipo “ch” según la palabra/frase más larga del ciclo */
  const typeSlotMinCh = useMemo(() => {
    if (!animatedWords?.length) return 0;
    return animatedWords.reduce((max, w) => Math.max(max, [...w].length), 0);
  }, [animatedWords]);

  useLayoutEffect(() => {
    if (!showAnimated || reduce) return;

    const prefixEl = prefixRef.current;
    const suffixEl = suffixRef.current;
    if (!prefixEl || !suffixEl) return;

    const splitP = new SplitType(prefixEl, { types: 'words' });
    const splitS = new SplitType(suffixEl, { types: 'words' });
    const splits = [splitP, splitS];

    const words = [...(splitP.words ?? []), ...(splitS.words ?? [])] as HTMLElement[];
    words.forEach((w) => {
      w.style.overflow = 'hidden';
      w.style.display = 'inline-block';
      w.style.verticalAlign = 'baseline';
    });

    animate(
      words,
      { opacity: [0, 1], y: ['110%', '0%'] },
      {
        duration: 0.74,
        delay: stagger(0.06, { startDelay: 0 }),
        ease: HERO_SPLIT_EXPO,
      },
    );

    return () => {
      splits.forEach((s) => s.revert());
    };
  }, [reduce, showAnimated, headlinePrefix, headlineSuffix]);

  return (
    <motion.div
      className="relative z-10 grid gap-5 lg:grid-cols-12 lg:items-start lg:gap-10"
      variants={staggerContainer}
      initial={reduce ? 'visible' : 'hidden'}
      animate="visible"
    >
      <motion.p
        className="text-eyebrow text-white/40 lg:col-span-8 lg:col-start-1 lg:row-start-1"
        variants={staggerItem}
      >
        {eyebrow}
      </motion.p>

      {showAnimated ? (
        <h1
          id="hero-heading"
          className="min-h-[3lh] text-balance text-text lg:col-span-8 lg:col-start-1 lg:row-start-2 text-[clamp(2.05rem,4.6vw+0.9rem,4.25rem)] leading-[1.04] tracking-[-0.035em] font-semibold"
        >
          <span ref={prefixRef} className="inline">
            {headlinePrefix}{' '}
          </span>
          <span className="inline-flex flex-wrap items-baseline gap-x-0 gap-y-0">
            <span
              className="inline-block max-w-full align-baseline"
              style={
                typeSlotMinCh > 0
                  ? { minWidth: `min(100%, ${typeSlotMinCh + 1}ch)` }
                  : undefined
              }
            >
              <Typeanimation
                words={animatedWords}
                typingSpeed="slow"
                deletingSpeed="slow"
                gradientFrom="#60a5fa"
                gradientTo="#a78bfa"
                pauseDuration={1800}
                className="inline-block font-extrabold drop-shadow-[0_10px_30px_rgba(96,165,250,0.18)]"
              />
            </span>
            <span ref={suffixRef} className="inline">
              , {headlineSuffix}
            </span>
          </span>
        </h1>
      ) : reduce ? (
        <h1
          id="hero-heading"
          className="text-balance text-text lg:col-span-8 lg:col-start-1 lg:row-start-2 text-[clamp(2.05rem,4.6vw+0.9rem,4.25rem)] leading-[1.04] tracking-[-0.035em] font-semibold"
        >
          {headline}
        </h1>
      ) : (
        <motion.h1
          id="hero-heading"
          className="text-balance text-text lg:col-span-8 lg:col-start-1 lg:row-start-2 text-[clamp(2.05rem,4.6vw+0.9rem,4.25rem)] leading-[1.04] tracking-[-0.035em] font-semibold"
          variants={headlineWordContainer}
        >
          {headline?.split(/\s+/).filter(Boolean).map((w, i) => (
            <motion.span key={`${w}-${i}`} className="mr-[0.22em] inline-block last:mr-0" variants={headlineWord}>
              {w}
            </motion.span>
          ))}
        </motion.h1>
      )}

      <motion.p
        className="mt-2 max-w-[34rem] text-pretty text-[1.05rem] sm:mt-4 sm:text-[1.125rem] font-normal leading-[1.68] text-white/74 lg:col-span-8 lg:col-start-1 lg:row-start-3"
        variants={staggerItem}
      >
        {lead}
      </motion.p>
      {hasService ? (
        <motion.p
          className="mt-2 max-w-[34rem] text-pretty text-[0.92rem] font-normal leading-relaxed text-white/40 lg:col-span-8 lg:col-start-1 lg:row-start-4"
          variants={staggerItem}
        >
          {serviceLine!.trim()}
        </motion.p>
      ) : null}
      <motion.div
        className={`mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 lg:col-span-8 lg:col-start-1 ${hasService ? 'lg:row-start-5' : 'lg:row-start-4'}`}
        variants={staggerItem}
      >
        <MagneticButton
          href={ctaPrimaryHref || '/'}
          shimmer
          className="!rounded-xl !bg-[#3b4fd8] shadow-[0_16px_44px_rgba(59,79,216,0.35)] hover:!bg-[#4f5fe8]"
        >
          {ctaPrimary}
          <svg
            className="h-4 w-4 shrink-0 opacity-95"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </MagneticButton>
        <MagneticButton
          href={ctaSecondaryHref || '#proyectos'}
          variant="ghost"
          className="!rounded-xl !bg-transparent !text-white !border-[1.5px] !border-white/[0.25] hover:!border-white/[0.5] hover:!bg-transparent"
        >
          {ctaSecondary}
        </MagneticButton>
      </motion.div>

      <motion.div
        className={`mt-2 flex flex-col items-start gap-2.5 lg:col-span-4 lg:col-start-9 lg:mt-0 lg:items-end lg:self-end max-sm:hidden ${hasService ? 'lg:row-start-6' : 'lg:row-start-5'}`}
        variants={staggerItem}
      >
        <ShimmerPill>{pillA}</ShimmerPill>
        {pillB?.trim() ? <ShimmerPill>{pillB.trim()}</ShimmerPill> : null}
        {aside?.trim() ? (
          <p className="mt-2 max-w-[17rem] text-right text-[11px] leading-relaxed text-white/25 max-lg:hidden">{aside}</p>
        ) : null}
      </motion.div>
    </motion.div>
  );
}
