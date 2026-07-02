import { useLayoutEffect, useMemo, useRef } from 'react';
import { animate, motion, stagger, useReducedMotion, type Variants } from 'motion/react';
import MagneticButton from '@/components/react/MagneticButton';
import Typeanimation from '@/components/ui/typeanimation';
import { staggerContainer, staggerItem } from '@/components/react/motion-variants';
import { DURATION_ENTER, EASE_OUT_SOFT, HERO_WORD_STAGGER } from '@/motion/easing';
import SplitType from 'split-type';

const SERVICE_BADGES = [
  { label: 'Diseño web', icon: '◈' },
  { label: 'Desarrollo', icon: '⟨/⟩' },
  { label: 'Identidad digital', icon: '◎' },
] as const;

type Props = {
  headline?: string;
  headlinePrefix?: string;
  animatedWords?: string[];
  headlineSuffix?: string;
  /** H1 fijo (multilínea con `\n`); si existe, no se usa TypeAnimation ni prefijo/sufijo animados. */
  staticHeadline?: string;
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

function HeroServiceBadges({ className, plain = false }: { className?: string; plain?: boolean }) {
  const badges = SERVICE_BADGES.map(({ label, icon }) => (
    <span
      key={label}
      className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.10] bg-white/[0.05] px-3 py-1 text-[11px] font-medium tracking-wide text-white/55 backdrop-blur-sm transition-colors duration-200 hover:border-[rgba(96,165,250,0.35)] hover:bg-[rgba(96,165,250,0.08)] hover:text-[rgba(196,181,253,0.9)]"
    >
      <span className="text-[10px] text-[#60a5fa]/70" aria-hidden>
        {icon}
      </span>
      {label}
    </span>
  ));

  if (plain) {
    return (
      <div className={['flex flex-wrap gap-2', className].filter(Boolean).join(' ')}>
        {badges}
      </div>
    );
  }

  return (
    <motion.div
      className={['flex flex-wrap gap-2', className].filter(Boolean).join(' ')}
      variants={staggerItem}
    >
      {SERVICE_BADGES.map(({ label, icon }) => (
        <motion.span
          key={label}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.10] bg-white/[0.05] px-3 py-1 text-[11px] font-medium tracking-wide text-white/55 backdrop-blur-sm"
          whileHover={{
            borderColor: 'rgba(96,165,250,0.35)',
            color: 'rgba(196,181,253,0.9)',
            background: 'rgba(96,165,250,0.08)',
          }}
          transition={{ duration: 0.2 }}
        >
          <span className="text-[10px] text-[#60a5fa]/70" aria-hidden>
            {icon}
          </span>
          {label}
        </motion.span>
      ))}
    </motion.div>
  );
}

export default function HeroMotion({
  headline,
  headlinePrefix,
  animatedWords,
  headlineSuffix,
  staticHeadline,
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
  const useStaticHero = Boolean(staticHeadline?.trim());

  const showAnimated =
    !useStaticHero && headlinePrefix && animatedWords && animatedWords.length > 0 && headlineSuffix;

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

  if (useStaticHero) {
    return (
      <div
        className="hero-static relative z-10 mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-5xl -translate-y-6 flex-col items-center justify-center px-5 pb-16 pt-20 text-center max-md:min-h-0 max-md:-translate-y-4 max-md:pb-10 max-md:pt-8 sm:min-h-[calc(100svh-4rem)] sm:px-6 sm:pb-16 md:-translate-y-10 lg:-translate-y-16 xl:-translate-y-20"
        data-static-hero
      >
        <HeroServiceBadges plain className="hero-static__item justify-center" />

        <h1
          id="hero-heading"
          className="hero-static__headline hero-static__item mt-4 max-w-3xl text-balance text-[clamp(3rem,13vw,4.7rem)] font-bold leading-[0.92] tracking-[-0.055em] text-white sm:mt-5 sm:max-w-4xl sm:text-[clamp(4rem,8vw,7rem)]"
        >
          {staticHeadline!
            .trim()
            .split('\n')
            .filter(Boolean)
            .map((line, lineIndex, lines) => (
              <span
                key={`line-${lineIndex}`}
                className={[
                  'hero-headline__line',
                  lineIndex === lines.length - 1 ? 'hero-headline__line--accent' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {line.split(/\s+/).filter(Boolean).map((word, wordIndex) => (
                  <span key={`word-${lineIndex}-${wordIndex}`} className="hero-headline__word">
                    {word}
                  </span>
                ))}
              </span>
            ))}
        </h1>

        <div
          className="hero-static__item mx-auto mt-5 h-px w-16 rounded-full bg-gradient-to-r from-transparent via-[#60a5fa]/50 to-transparent"
          aria-hidden
        />

        <p className="hero-static__item mt-4 mx-auto max-w-[42rem] text-center text-[1rem] font-normal leading-[1.68] text-white/55 sm:text-[1.05rem]">
          {lead}
        </p>

        {hasService ? (
          <p className="hero-static__item mx-auto mt-3 max-w-[30rem] text-pretty text-sm leading-6 text-white/45 sm:text-base">
            {serviceLine!.trim()}
          </p>
        ) : null}

        <div className="hero-static__item mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <MagneticButton
            href={ctaPrimaryHref || '/'}
            shimmer
            className="w-full justify-center !rounded-xl !bg-[#3b4fd8] shadow-[0_16px_44px_rgba(59,79,216,0.35)] hover:!bg-[#4f5fe8] sm:w-auto"
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
            className="w-full justify-center !rounded-xl !border-[1.5px] !border-white/[0.25] !bg-transparent !text-white hover:!border-white/[0.5] hover:!bg-transparent sm:w-auto"
          >
            {ctaSecondary}
          </MagneticButton>
        </div>

        <div className="hero-static__item mt-7 flex flex-col items-center gap-2 sm:mt-8">
          <ShimmerPill>{pillA}</ShimmerPill>
          {pillB?.trim() ? <ShimmerPill>{pillB.trim()}</ShimmerPill> : null}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="relative z-10 grid gap-5 lg:grid-cols-12 lg:items-start lg:gap-10"
      variants={staggerContainer}
      initial={reduce ? 'visible' : 'hidden'}
      animate="visible"
    >
      <HeroServiceBadges className="lg:col-span-8 lg:col-start-1 lg:row-start-1" />

      {showAnimated ? (
        <h1
          id="hero-heading"
          className="min-h-[3lh] max-w-3xl text-balance text-white lg:col-span-8 lg:col-start-1 lg:row-start-2 text-[clamp(3rem,13vw,4.7rem)] font-bold leading-[0.92] tracking-[-0.055em] sm:max-w-4xl sm:text-[clamp(4rem,8vw,7rem)]"
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
                className="inline-block font-bold drop-shadow-[0_10px_30px_rgba(96,165,250,0.18)]"
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
          className="max-w-3xl text-balance text-white lg:col-span-8 lg:col-start-1 lg:row-start-2 text-[clamp(3rem,13vw,4.7rem)] font-bold leading-[0.92] tracking-[-0.055em] sm:max-w-4xl sm:text-[clamp(4rem,8vw,7rem)]"
        >
          {headline}
        </h1>
      ) : (
        <motion.h1
          id="hero-heading"
          className="max-w-3xl text-balance text-white lg:col-span-8 lg:col-start-1 lg:row-start-2 text-[clamp(3rem,13vw,4.7rem)] font-bold leading-[0.92] tracking-[-0.055em] sm:max-w-4xl sm:text-[clamp(4rem,8vw,7rem)]"
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
        className="mt-4 mx-auto max-w-[42rem] text-center text-[1rem] font-normal leading-[1.68] text-white/55 sm:text-[1.05rem] lg:col-span-8 lg:col-start-1 lg:row-start-4"
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
          className="w-full justify-center !rounded-xl !bg-[#3b4fd8] shadow-[0_16px_44px_rgba(59,79,216,0.35)] hover:!bg-[#4f5fe8] sm:w-auto"
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
          className="w-full justify-center !rounded-xl !border-[1.5px] !border-white/[0.25] !bg-transparent !text-white hover:!border-white/[0.5] hover:!bg-transparent sm:w-auto"
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
