import { useLayoutEffect, useRef } from 'react';
import { animate, motion, stagger, useReducedMotion, type Variants } from 'motion/react';
import AnimatedMetric from '@/components/react/AnimatedMetric';
import ResultsChart from '@/components/react/ResultsChart';
import { DURATION_ENTER, EASE_OUT_SOFT } from '@/motion/easing';
import SplitType from 'split-type';

type Metric = { value: number; suffix: string; label: string };

type Props = {
  profileSrc: string;
  profileAlt: string;
  heading: string;
  body: string;
  linkedin: string;
  email: string;
  metrics: readonly Metric[];
};

const view = { once: true as const, margin: '-80px' as const };

const textBlock: Variants = {
  hidden: { opacity: 0, x: -24 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: DURATION_ENTER, ease: EASE_OUT_SOFT },
  },
};

const photoBlock: Variants = {
  hidden: { opacity: 0, x: 28 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: DURATION_ENTER, ease: EASE_OUT_SOFT },
  },
};

const textChildren: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

const textChildrenContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.04,
    },
  },
};

export default function AboutSectionClient({
  profileSrc,
  profileAlt,
  heading,
  body,
  linkedin,
  email,
  metrics,
}: Props) {
  const reduce = useReducedMotion();
  const aboutLabelRef = useRef<HTMLParagraphElement>(null);
  const accentNeedle = 'mejor tu negocio';
  const accentIdx = heading.toLowerCase().indexOf(accentNeedle);
  const accent = accentIdx >= 0 ? heading.slice(accentIdx, accentIdx + accentNeedle.length) : '';
  const titleBefore = accentIdx >= 0 ? heading.slice(0, accentIdx) : heading;
  const titleAfter = accentIdx >= 0 ? heading.slice(accentIdx + accentNeedle.length) : '';

  useLayoutEffect(() => {
    if (reduce || !aboutLabelRef.current) return;
    const el = aboutLabelRef.current;
    const split = new SplitType(el, { types: 'chars' });
    const chars = (split.chars ?? []) as HTMLElement[];
    chars.forEach((c) => {
      c.style.display = 'inline-block';
    });

    let played = false;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e?.isIntersecting || played) return;
        played = true;
        io.disconnect();
        animate(
          chars,
          { opacity: [0, 1], filter: ['blur(4px)', 'blur(0px)'] },
          { delay: stagger(0.02, { startDelay: 0 }), duration: 0.52, ease: 'easeOut' },
        );
      },
      { threshold: 0.35 },
    );
    io.observe(el);

    return () => {
      io.disconnect();
      split.revert();
    };
  }, [reduce]);

  return (
    <section id="sobre-mi" className="container-page py-10 sm:py-12" aria-labelledby="about-home-heading">
      <section className="glass-panel relative overflow-hidden rounded-xl border border-white/[0.08] !p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:!p-6 lg:!p-7">
        <div
          className="pointer-events-none absolute -right-24 top-[-35%] h-[420px] w-[420px] rounded-full opacity-60 blur-3xl"
          style={{
            background:
              'radial-gradient(circle at 30% 30%, rgba(96, 165, 250, 0.14), rgba(167, 139, 250, 0.08) 42%, transparent 68%)',
          }}
          aria-hidden="true"
        />

        <div className="relative z-[1] flex flex-col gap-8 md:flex-row md:items-start md:gap-10">
          <motion.div
            className="order-1 shrink-0 md:order-2 md:pt-0.5"
            initial={reduce ? 'visible' : 'hidden'}
            whileInView="visible"
            viewport={view}
            variants={photoBlock}
          >
            <div className="relative mx-auto md:mx-0 md:ml-auto">
              <div
                className="pointer-events-none absolute inset-[-18px] rounded-full opacity-70 blur-2xl"
                style={{
                  background:
                    'radial-gradient(circle, rgba(96, 165, 250, 0.22), rgba(167, 139, 250, 0.12) 45%, transparent 70%)',
                }}
                aria-hidden="true"
              />
              <div className="about-photo-orbit relative mx-auto h-40 w-40 md:h-[200px] md:w-[200px]">
                <div className="about-photo-orbit__inner flex h-full w-full items-center justify-center">
                  <img
                    src={profileSrc}
                    alt={profileAlt}
                    width={640}
                    height={640}
                    className="h-full w-full rounded-full object-cover contrast-[1.06] brightness-[1.04]"
                  />
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="order-2 min-w-0 flex-1 md:order-1"
            initial={reduce ? 'visible' : 'hidden'}
            whileInView="visible"
            viewport={view}
            variants={textBlock}
          >
            <motion.div variants={textChildrenContainer} initial={false}>
              <motion.div variants={textChildren}>
                <p
                  ref={aboutLabelRef}
                  className="inline-flex items-center rounded-full border border-[#60a5fa]/20 bg-white/[0.04] px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[#c4b5fd]/90"
                >
                  Sobre mi trabajo
                </p>
              </motion.div>

              <motion.div variants={textChildren}>
                <h2
                  id="about-home-heading"
                  className="mt-3 max-w-[22rem] text-balance text-[clamp(1.35rem,1.05rem+1.1vw,1.85rem)] font-semibold leading-[1.12] tracking-[-0.02em] text-text sm:max-w-[26rem]"
                >
                  {accent ? (
                    <>
                      <span className="text-text">{titleBefore}</span>
                      <span className="bg-gradient-to-r from-[#60a5fa] to-[#a78bfa] bg-clip-text text-transparent">{accent}</span>
                      <span className="text-text">{titleAfter}</span>
                    </>
                  ) : (
                    heading
                  )}
                </h2>
              </motion.div>

              <motion.div variants={textChildren}>
                <p className="mt-3 max-w-prose whitespace-pre-line text-[17px] font-normal leading-relaxed text-slate-200">
                  {body}
                </p>
              </motion.div>

              {metrics.length > 0 && (
                <motion.div variants={textChildren} className="mt-6 grid grid-cols-2 gap-3 sm:max-w-lg">
                  {metrics.map((m) => (
                    <AnimatedMetric
                      key={`${m.label}-${m.value}`}
                      end={m.value}
                      suffix={m.suffix}
                      label={m.label}
                      className="rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                      valueClassName="bg-gradient-to-r from-[#60a5fa] to-[#a78bfa] bg-clip-text text-[2.15rem] font-extrabold leading-none tabular-nums tracking-tight text-transparent sm:text-[2.35rem]"
                      labelClassName="mt-2 whitespace-pre-line text-[11px] font-semibold uppercase leading-snug tracking-[0.12em] text-white/45"
                    />
                  ))}
                </motion.div>
              )}

              <motion.div variants={textChildren} className="w-full">
                <ResultsChart />
              </motion.div>

              <motion.div variants={textChildren} className="mt-6 flex flex-wrap items-center gap-3">
                <a
                  className="text-xs text-muted underline-offset-4 transition hover:text-accent hover:underline"
                  href={linkedin}
                  rel="noreferrer"
                  target="_blank"
                >
                  LinkedIn
                </a>
                <span className="text-xs text-muted/70">·</span>
                <a
                  className="text-[13px] text-white/45 no-underline transition duration-150 hover:text-white/80"
                  href={`mailto:${email}`}
                >
                  Escribime un mail
                </a>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </section>
  );
}
