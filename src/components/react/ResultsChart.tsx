import { motion, useReducedMotion } from 'motion/react';

const BAR_MAX = 19;
const BAR_AREA_PX = 180;

const DATA: { label: string; value: number; tone: 'muted' | 'brand' }[] = [
  { label: 'Antes', value: 4, tone: 'muted' },
  { label: 'Mes 1', value: 9, tone: 'brand' },
  { label: 'Mes 2', value: 16, tone: 'brand' },
  { label: 'Mes 3', value: 19, tone: 'brand' },
];

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function ResultsChart() {
  const reduce = useReducedMotion();
  const lastIdx = DATA.length - 1;
  const floatingDelay = lastIdx * 0.1 + 0.75;

  return (
    <div className="glass-panel mt-6 w-full min-w-0 rounded-xl border border-white/[0.08] !p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:!p-6">
      <p className="inline-flex items-center self-start rounded-full border border-[#60a5fa]/20 bg-white/[0.04] px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[#c4b5fd]/90">
        Resultados típicos
      </p>

      <div className="relative mt-5 w-full" style={{ height: BAR_AREA_PX }}>
        <div className="absolute inset-x-0 bottom-0 flex h-[180px] items-end justify-between gap-2 sm:gap-3">
          {DATA.map((d, idx) => {
            const targetH = Math.max(4, Math.round((d.value / BAR_MAX) * BAR_AREA_PX));
            const isLast = idx === lastIdx;

            return (
              <div key={d.label} className="relative flex min-h-0 min-w-0 flex-1 flex-col items-center justify-end">
                {isLast ? (
                  <motion.span
                    aria-hidden="true"
                    className="pointer-events-none absolute left-1/2 z-[1] -translate-x-1/2 whitespace-nowrap pb-2 text-[11px] font-bold leading-none text-accent tabular-nums"
                    style={{ bottom: `${targetH}px` }}
                    initial={{ opacity: reduce ? 1 : 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true, margin: '-55px 0px' }}
                    transition={{
                      duration: reduce ? 0 : 0.48,
                      ease: EASE,
                      delay: reduce ? 0 : floatingDelay,
                    }}
                  >
                    ×4 consultas
                  </motion.span>
                ) : null}

                <motion.div
                  className={`relative mx-auto w-full max-w-[4.25rem] overflow-hidden rounded-t-md ${d.tone === 'muted' ? 'bg-slate-600/90' : 'bg-gradient-to-t from-[#60a5fa] to-[#a78bfa]'}`}
                  initial={{ height: reduce ? targetH : 0 }}
                  whileInView={{ height: targetH }}
                  viewport={{ once: true, margin: '-55px 0px' }}
                  transition={
                    reduce
                      ? { duration: 0 }
                      : {
                          duration: 0.8,
                          ease: EASE,
                          delay: idx * 0.1,
                        }
                  }
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="-mx-1 mt-1 flex justify-between gap-2 px-1 sm:gap-3">
        {DATA.map((d) => (
          <p
            key={d.label}
            className="min-w-0 flex-1 text-center text-[10px] font-medium uppercase tracking-wide text-white/42 sm:text-[11px]"
          >
            {d.label}
          </p>
        ))}
      </div>

      <p className="mt-4 text-center text-sm leading-snug text-white/62">
        En promedio, los negocios con los que trabajé cuadruplicaron sus consultas en los primeros 60 días.
      </p>
    </div>
  );
}
