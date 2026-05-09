
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
  email: string;
  whatsappUrl: string;
  metrics: readonly Metric[];
};

const EASE: [number,number,number,number] = [0.16, 1, 0.3, 1];
const view = { once: true as const, margin: '-72px' as const };

/* Variantes reutilizables */
const fadeUp: Variants = {
  hidden:  { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0,
    transition: { duration: DURATION_ENTER, ease: EASE_OUT_SOFT } },
};
const fadeLeft: Variants = {
  hidden:  { opacity: 0, x: -24 },
  visible: { opacity: 1, x: 0,
    transition: { duration: DURATION_ENTER, ease: EASE_OUT_SOFT } },
};
const fadeRight: Variants = {
  hidden:  { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0,
    transition: { duration: DURATION_ENTER, ease: EASE_OUT_SOFT } },
};
const staggerWrap: Variants = {
  hidden:   {},
  visible:  { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

/* Ícono de métrica según índice */
function MetricIcon({ index }: { index: number }) {
  const icons = [
    /* sitios */
    <svg key="s" viewBox="0 0 24 24" fill="none" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round"
      className="h-4 w-4 stroke-[#60a5fa]" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M3 9h18M9 21V9"/>
    </svg>,
    /* años */
    <svg key="a" viewBox="0 0 24 24" fill="none" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round"
      className="h-4 w-4 stroke-[#a78bfa]" aria-hidden>
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 7v5l3 3"/>
    </svg>,
    /* semanas */
    <svg key="w" viewBox="0 0 24 24" fill="none" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round"
      className="h-4 w-4 stroke-[#34d399]" aria-hidden>
      <path d="M5 13l4 4L19 7"/>
    </svg>,
    /* 100% */
    <svg key="p" viewBox="0 0 24 24" fill="none" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round"
      className="h-4 w-4 stroke-[#f472b6]" aria-hidden>
      <path d="M12 3v1m0 16v1M4.22 4.22l.7.7m12.16 12.16.7.7M3 12h1m16 0h1"/>
      <circle cx="12" cy="12" r="4"/>
    </svg>,
  ];
  return icons[index % icons.length] ?? null;
}

const METRIC_COLORS = ['#60a5fa','#a78bfa','#34d399','#f472b6'];

export default function AboutSectionClient({
  profileSrc, profileAlt, heading, body,
  email, whatsappUrl, metrics,
}: Props) {
  const reduce = useReducedMotion();
  const labelRef = useRef<HTMLParagraphElement>(null);

  /* Resaltar "mejor tu negocio" */
  const needle   = 'mejor tu negocio';
  const idx      = heading.toLowerCase().indexOf(needle);
  const before   = idx >= 0 ? heading.slice(0, idx) : heading;
  const accent   = idx >= 0 ? heading.slice(idx, idx + needle.length) : '';
  const after    = idx >= 0 ? heading.slice(idx + needle.length) : '';

  /* SplitType en el badge */
  useLayoutEffect(() => {
    if (reduce || !labelRef.current) return;
    const el = labelRef.current;
    const split = new SplitType(el, { types: 'chars' });
    const chars = (split.chars ?? []) as HTMLElement[];
    chars.forEach(c => { c.style.display = 'inline-block'; });

    let played = false;
    const io = new IntersectionObserver(([e]) => {
      if (!e?.isIntersecting || played) return;
      played = true; io.disconnect();
      animate(chars,
        { opacity: [0, 1], filter: ['blur(4px)', 'blur(0px)'] },
        { delay: stagger(0.02), duration: 0.48, ease: 'easeOut' },
      );
    }, { threshold: 0.3 });
    io.observe(el);
    return () => { io.disconnect(); split.revert(); };
  }, [reduce]);

  return (
    <section
      id="sobre-mi"
      className="container-page py-10 sm:py-14"
      aria-labelledby="about-home-heading"
    >
      <div className="glass-panel relative overflow-hidden rounded-2xl border border-white/[0.08] !p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:!p-7 lg:!p-8">

        {/* Blob decorativo */}
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full opacity-50 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(96,165,250,0.16), rgba(167,139,250,0.08) 50%, transparent 70%)' }}
        />
        <div aria-hidden className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full opacity-40 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.12), transparent 70%)' }}
        />

        {/* ── HEADER: badge + foto en la misma fila ── */}
        <div className="relative z-10 flex items-start justify-between gap-4">

          {/* Texto izquierda */}
          <motion.div
            className="min-w-0 flex-1"
            variants={staggerWrap}
            initial={reduce ? 'visible' : 'hidden'}
            whileInView="visible"
            viewport={view}
          >
            {/* Badge */}
            <motion.div variants={fadeUp}>
              <p ref={labelRef}
                className="inline-flex items-center rounded-full border border-[#60a5fa]/20 bg-white/[0.04] px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[#c4b5fd]/90"
              >
                Sobre mi trabajo
              </p>
            </motion.div>

            {/* Heading */}
            <motion.div variants={fadeUp}>
              <h2 id="about-home-heading"
                className="mt-3 max-w-[26rem] text-balance text-[clamp(1.4rem,1.1rem+1.2vw,1.95rem)] font-semibold leading-[1.1] tracking-[-0.02em] text-white"
              >
                {accent ? (
                  <>
                    <span>{before}</span>
                    <span className="bg-gradient-to-r from-[#60a5fa] to-[#a78bfa] bg-clip-text text-transparent">
                      {accent}
                    </span>
                    <span>{after}</span>
                  </>
                ) : heading}
              </h2>
            </motion.div>

            {/* Body */}
            <motion.div variants={fadeUp}>
              <p className="mt-3 max-w-[36rem] text-[15px] leading-relaxed text-white/55 sm:text-[16px]">
                {body}
              </p>
            </motion.div>
          </motion.div>

          {/* Foto derecha — alineada con el badge */}
          <motion.div
            className="shrink-0"
            variants={fadeRight}
            initial={reduce ? 'visible' : 'hidden'}
            whileInView="visible"
            viewport={view}
          >
            <div className="relative">
              {/* Anillo animado */}
              <motion.div
                aria-hidden
                className="absolute inset-[-3px] rounded-full"
                style={{
                  background: 'conic-gradient(from 0deg, #60a5fa, #a78bfa, #60a5fa)',
                  padding: '2px',
                }}
                animate={reduce ? undefined : { rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
              >
                <div className="h-full w-full rounded-full bg-[#050818]" />
              </motion.div>

              <img
                src={profileSrc}
                alt={profileAlt}
                width={160} height={160}
                className="relative z-10 h-[88px] w-[88px] rounded-full object-cover brightness-[1.05] contrast-[1.06] sm:h-[110px] sm:w-[110px] md:h-[130px] md:w-[130px]"
              />

              {/* Ping de disponibilidad */}
              <motion.div
                aria-hidden
                className="absolute bottom-1 right-1 z-20 h-3 w-3 rounded-full bg-[#34d399]"
                animate={reduce ? undefined : {
                  boxShadow: [
                    '0 0 0 0 rgba(52,211,153,0.5)',
                    '0 0 0 6px rgba(52,211,153,0)',
                  ],
                }}
                transition={{ duration: 1.4, repeat: Infinity }}
              />
            </div>
          </motion.div>
        </div>

        {/* ── MÉTRICAS — 4 en fila en desktop, 2x2 en mobile ── */}
        {metrics.length > 0 && (
          <motion.div
            className="relative z-10 mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4"
            variants={staggerWrap}
            initial={reduce ? 'visible' : 'hidden'}
            whileInView="visible"
            viewport={view}
          >
            {metrics.map((m, i) => (
              <motion.div
                key={`${m.label}-${m.value}`}
                variants={fadeUp}
                className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 transition-colors duration-300 hover:border-white/[0.14] hover:bg-white/[0.06]"
              >
                {/* Glow en hover */}
                <div aria-hidden
                  className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full blur-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{ background: METRIC_COLORS[i % METRIC_COLORS.length] + '33' }}
                />

                {/* Ícono */}
                <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04]">
                  <MetricIcon index={i} />
                </div>

                <AnimatedMetric
                  end={m.value}
                  suffix={m.suffix}
                  label={m.label}
                  valueClassName="bg-gradient-to-r from-[#60a5fa] to-[#a78bfa] bg-clip-text text-[1.9rem] font-extrabold leading-none tabular-nums tracking-tight text-transparent sm:text-[2.1rem]"
                  labelClassName="mt-1.5 whitespace-pre-line text-[10px] font-semibold uppercase leading-snug tracking-[0.12em] text-white/40"
                />

                {/* Barra de color al fondo */}
                <motion.div
                  aria-hidden
                  className="absolute bottom-0 left-0 h-0.5 w-full"
                  initial={{ scaleX: 0, originX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.7, delay: i * 0.1, ease: EASE }}
                  style={{ background: `linear-gradient(90deg, ${METRIC_COLORS[i % METRIC_COLORS.length]}, transparent)` }}
                />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* ── RESULTADOS CHART ── */}
        <motion.div
          className="relative z-10"
          variants={fadeUp}
          initial={reduce ? 'visible' : 'hidden'}
          whileInView="visible"
          viewport={view}
        >
          <ResultsChart />
        </motion.div>

        {/* ── LINKS ── */}
        <motion.div
          className="relative z-10 mt-6 flex flex-wrap items-center gap-x-3 gap-y-2"
          variants={fadeUp}
          initial={reduce ? 'visible' : 'hidden'}
          whileInView="visible"
          viewport={view}
        >
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#34d399]/25 bg-[#34d399]/[0.06] px-3 py-1 text-[12px] font-medium text-[#34d399]/90 transition hover:bg-[#34d399]/[0.12]"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#34d399]" aria-hidden />
            WhatsApp
          </a>
          <a
            href={`mailto:${email}`}
            className="text-[13px] text-white/40 transition hover:text-white/75"
          >
            Escribime un mail
          </a>
        </motion.div>

      </div>
    </section>
  );
}