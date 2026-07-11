import { motion, useReducedMotion, type Variants } from 'motion/react';
import AnimatedMetric from '@/components/react/AnimatedMetric';
import ResultsChart from '@/components/react/ResultsChart';
import { DURATION_ENTER, EASE_OUT_SOFT } from '@/motion/easing';

type Metric = { value: number; suffix: string; label: string };
type Props = {
  profileSrc: string;
  profileAlt: string;
  heading: string;
  body?: string;
  email: string;
  whatsappUrl: string;
  metrics: readonly Metric[];
  lightSurface?: boolean;
};

const EASE: [number,number,number,number] = [0.16, 1, 0.3, 1];
const view = { once: true as const, margin: '-72px' as const };

const fadeUp: Variants = {
  hidden:  { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0,
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

function MetricIcon({ index }: { index: number }) {
  const icons = [
    <svg key="s" viewBox="0 0 24 24" fill="none" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round"
      className="h-4 w-4 stroke-[#60a5fa]" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M3 9h18M9 21V9"/>
    </svg>,
    <svg key="a" viewBox="0 0 24 24" fill="none" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round"
      className="h-4 w-4 stroke-[#a78bfa]" aria-hidden>
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 7v5l3 3"/>
    </svg>,
    <svg key="w" viewBox="0 0 24 24" fill="none" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round"
      className="h-4 w-4 stroke-[#34d399]" aria-hidden>
      <path d="M5 13l4 4L19 7"/>
    </svg>,
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
  profileSrc, profileAlt, heading, body = '',
  email, whatsappUrl, metrics, lightSurface = false,
}: Props) {
  const reduce = useReducedMotion();
  const editorialDark = lightSurface;

  const needle   = 'mejor tu negocio';
  const idx      = heading.toLowerCase().indexOf(needle);
  const before   = idx >= 0 ? heading.slice(0, idx) : heading;
  const accent   = idx >= 0 ? heading.slice(idx, idx + needle.length) : '';
  const after    = idx >= 0 ? heading.slice(idx + needle.length) : '';

  return (
    <div className="w-full py-6 sm:py-10" aria-labelledby="about-home-heading">
      <div
        className={
          editorialDark
            ? 'relative w-full overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#07111f] p-4 text-white shadow-[0_28px_80px_rgba(15,23,42,0.20)] sm:rounded-[2rem] sm:p-7 lg:p-9'
            : 'glass-panel relative w-full overflow-hidden rounded-2xl border border-white/[0.08] !p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:!p-7 lg:!p-9'
        }
      >
        {editorialDark ? (
          <>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(circle at 12% 8%, rgba(96,165,250,0.22), transparent 34%), radial-gradient(circle at 88% 20%, rgba(167,139,250,0.18), transparent 32%), linear-gradient(135deg, rgba(255,255,255,0.06), transparent 42%)',
              }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.28]"
              style={{
                backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)',
                backgroundSize: '22px 22px',
                maskImage: 'radial-gradient(ellipse 85% 65% at 50% 25%, black 30%, transparent 80%)',
              }}
            />
          </>
        ) : (
          <>
            <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full opacity-50 blur-3xl"
              style={{ background: 'radial-gradient(circle, rgba(96,165,250,0.16), rgba(167,139,250,0.08) 50%, transparent 70%)' }}
            />
            <div aria-hidden className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full opacity-40 blur-3xl"
              style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.12), transparent 70%)' }}
            />
          </>
        )}

        {/* ── HEADER ── */}
        <div className="relative z-10 grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start lg:gap-10 xl:gap-12">

          <motion.div
            className="min-w-0 w-full"
            variants={staggerWrap}
            initial={reduce ? 'visible' : 'hidden'}
            whileInView="visible"
            viewport={view}
          >
            <motion.div variants={fadeUp} className="py-0.5">
              <h2
                id="about-home-heading"
                className="about-home-heading w-full max-w-none text-pretty text-[clamp(1.75rem,1.05rem+2.6vw,2.85rem)] font-extrabold leading-[1.12] tracking-[-0.035em] text-white sm:leading-[1.08] lg:max-w-[38rem] xl:max-w-[44rem]"
              >
                {accent ? (
                  <>
                    <span className="text-white">{before.trimEnd()}</span>
                    <br className="hidden sm:block" />
                    <span className="bg-gradient-to-r from-[#60a5fa] to-[#a78bfa] bg-clip-text text-transparent">
                      {accent}
                    </span>
                    {after ? <span className="text-white">{after}</span> : null}
                  </>
                ) : (
                  <span className="text-white">{heading}</span>
                )}
              </h2>
            </motion.div>

            <motion.div
              variants={fadeUp}
              className="mt-4 h-px w-12 rounded-full sm:mt-5"
              style={{ background: 'linear-gradient(90deg, #60a5fa 0%, #a78bfa 100%)' }}
              aria-hidden
            />

            {body.trim() ? (
              <motion.div variants={fadeUp}>
                <p className="mt-3 max-w-[40rem] text-[13px] leading-relaxed text-white/62 sm:text-[14px] lg:text-[15px]">
                  {body}
                </p>
              </motion.div>
            ) : null}
          </motion.div>

          <motion.div
            className="flex justify-start lg:justify-end"
            variants={fadeRight}
            initial={reduce ? 'visible' : 'hidden'}
            whileInView="visible"
            viewport={view}
          >
            <div className="relative shrink-0">
              <div
                aria-hidden
                className="absolute inset-[-4px] rounded-full"
                style={{
                  background: 'linear-gradient(135deg, rgba(96,165,250,0.55), rgba(167,139,250,0.45))',
                  padding: '2px',
                }}
              />
              <motion.div
                aria-hidden
                className="absolute inset-[-3px] rounded-full"
                style={{
                  background: 'conic-gradient(from 0deg, #60a5fa, #a78bfa, #60a5fa)',
                  padding: '2px',
                }}
                animate={reduce ? undefined : { rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
              >
                <div className="h-full w-full rounded-full bg-[#07111f]" />
              </motion.div>

              <img
                src={profileSrc}
                alt={profileAlt}
                width={160} height={160}
                className="relative z-10 h-[84px] w-[84px] rounded-full object-cover ring-2 ring-white/10 brightness-[1.05] contrast-[1.06] sm:h-[108px] sm:w-[108px] lg:h-[128px] lg:w-[128px]"
              />

              <motion.div
                aria-hidden
                className="absolute bottom-1 right-1 z-20 h-3 w-3 rounded-full bg-[#34d399] ring-2 ring-[#07111f]"
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

        {metrics.length > 0 && (
          <motion.div
            className="relative z-10 mt-7 grid grid-cols-2 gap-2.5 sm:mt-8 sm:gap-3 lg:grid-cols-4 lg:gap-4"
            variants={staggerWrap}
            initial={reduce ? 'visible' : 'hidden'}
            whileInView="visible"
            viewport={view}
          >
            {metrics.map((m, i) => (
              <motion.div
                key={`${m.label}-${m.value}`}
                variants={fadeUp}
                className="group relative overflow-hidden rounded-xl border border-white/[0.10] bg-white/[0.055] p-3.5 transition-all duration-300 hover:border-white/[0.16] hover:bg-white/[0.085] sm:rounded-2xl sm:p-4"
              >
                <div aria-hidden
                  className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full blur-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{ background: METRIC_COLORS[i % METRIC_COLORS.length] + '33' }}
                />

                <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.10] bg-white/[0.06]">
                  <MetricIcon index={i} />
                </div>

                <AnimatedMetric
                  end={m.value}
                  suffix={m.suffix}
                  label={m.label}
                  valueClassName="bg-gradient-to-r from-[#60a5fa] to-[#a78bfa] bg-clip-text text-[1.75rem] font-extrabold leading-none tabular-nums tracking-tight text-transparent sm:text-[2rem]"
                  labelClassName="mt-1.5 whitespace-pre-line text-[10px] font-semibold uppercase leading-snug tracking-[0.12em] text-white/45"
                />

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

        <motion.div
          className="relative z-10"
          variants={fadeUp}
          initial={reduce ? 'visible' : 'hidden'}
          whileInView="visible"
          viewport={view}
        >
          <ResultsChart darkSurface={editorialDark} lightSurface={!editorialDark} />
        </motion.div>

        <motion.div
          className="relative z-10 mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 sm:mt-6"
          variants={fadeUp}
          initial={reduce ? 'visible' : 'hidden'}
          whileInView="visible"
          viewport={view}
        >
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#34d399]/30 bg-[#34d399]/[0.08] px-3 py-1 text-[12px] font-medium text-[#34d399]/95 transition hover:bg-[#34d399]/[0.14]"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#34d399]" aria-hidden />
            WhatsApp
          </a>
          <a
            href={`mailto:${email}`}
            className="text-[13px] text-white/55 transition hover:text-white/85"
          >
            Escribime un mail
          </a>
        </motion.div>

      </div>
    </div>
  );
}
