import { motion, useReducedMotion, type Variants } from 'motion/react';
import AnimatedMetric from '@/components/react/AnimatedMetric';
import { DURATION_ENTER, EASE_OUT_SOFT } from '@/motion/easing';

type Metric = { value: number; suffix: string; label: string };

type Props = {
  profileSrc: string;
  profileAlt: string;
  heading: string;
  body: string;
  chips: string[];
  /** Fila horizontal con scroll (skills extendidas). */
  skills: string[];
  placeholderLabel: string;
  placeholderBody: string;
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

export default function AboutSectionClient({
  profileSrc,
  profileAlt,
  heading,
  body,
  chips,
  skills,
  placeholderLabel,
  placeholderBody,
  linkedin,
  email,
  metrics,
}: Props) {
  const reduce = useReducedMotion();

  return (
    <section id="sobre-mi" className="container-page py-10 sm:py-12" aria-labelledby="about-home-heading">
      <section className="glass-panel rounded-xl !p-5 sm:!p-6 lg:!p-7">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:gap-10">
          <motion.div
            className="shrink-0 sm:order-2 sm:pt-0.5"
            initial={reduce ? 'visible' : 'hidden'}
            whileInView="visible"
            viewport={view}
            variants={photoBlock}
          >
            <div className="about-photo-orbit mx-auto h-52 w-52 sm:mx-0 sm:h-60 sm:w-60 lg:h-72 lg:w-72">
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
          </motion.div>

          <motion.div
            className="min-w-0 flex-1 sm:order-1"
            initial={reduce ? 'visible' : 'hidden'}
            whileInView="visible"
            viewport={view}
            variants={textBlock}
          >
            <p className="text-eyebrow">En pocas palabras</p>
            <h2 id="about-home-heading" className="mt-1.5 text-lg font-semibold tracking-tight text-text sm:text-xl">
              {heading}
            </h2>
            <p className="mt-3 max-w-prose whitespace-pre-line text-sm leading-relaxed text-muted">{body}</p>

            {metrics.length > 0 && (
              <div className="mt-5 grid grid-cols-2 gap-3 sm:max-w-md">
                {metrics.map((m) => (
                  <AnimatedMetric key={`${m.label}-${m.value}`} end={m.value} suffix={m.suffix} label={m.label} />
                ))}
              </div>
            )}

            <ul className="mt-4 flex flex-wrap gap-2 text-[11px] text-muted">
              {chips.map((c) => (
                <li key={c} className="glass-pill rounded-full px-2.5 py-1">
                  {c}
                </li>
              ))}
            </ul>

            {skills.length > 0 && (
              <div className="skills-scroll mt-4 max-w-full">
                {skills.map((s) => (
                  <span key={s} className="glass-pill rounded-full px-2.5 py-1 text-[11px] text-muted">
                    {s}
                  </span>
                ))}
              </div>
            )}

            {placeholderBody.trim() ? (
              <p className="mt-4 rounded-lg border border-dashed border-white/[0.14] bg-surface-1/95 px-3 py-2 text-xs leading-relaxed text-muted">
                {placeholderLabel.trim() ? (
                  <>
                    <span className="font-mono text-[10px] text-accent">{placeholderLabel}</span>
                    <span className="mx-1 text-border-strong/60">—</span>
                  </>
                ) : null}
                {placeholderBody}
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <a
                href="#contacto"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-white/[0.1] bg-white/[0.08] px-5 py-2.5 text-sm font-medium text-muted shadow-glass-depth-sm transition hover:border-white/[0.18] hover:bg-white/[0.1] hover:text-text"
              >
                Contacto
              </a>
              <a
                className="text-xs text-muted underline-offset-4 transition hover:text-accent hover:underline"
                href={linkedin}
                rel="noreferrer"
                target="_blank"
              >
                LinkedIn
              </a>
              <a
                className="text-xs text-muted underline-offset-4 transition hover:text-accent hover:underline"
                href={`mailto:${email}`}
              >
                {email}
              </a>
            </div>
          </motion.div>
        </div>
      </section>
    </section>
  );
}
