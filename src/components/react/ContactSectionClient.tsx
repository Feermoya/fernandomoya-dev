import { motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import { DURATION_ENTER, EASE_OUT_SOFT } from '@/motion/easing';

type Props = { whatsappUrl: string; email: string };

const EASE: [number,number,number,number] = [0.16, 1, 0.3, 1];
const view = { once: true as const, margin: '-72px' as const };

const PROMPTS = [
  'Tengo un negocio y no tengo web todavía...',
  'Mi web actual está desactualizada...',
  'Quiero vender más desde mi sitio...',
  'Necesito mostrar mi trabajo online...',
];

export default function ContactSectionClient({ whatsappUrl, email }: Props) {
  const reduce = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const [promptIdx, setPromptIdx] = useState(0);

  return (
    <section
      id="contacto"
      className="container-page pb-14 sm:pb-20"
      aria-labelledby="contact-heading"
    >
      <motion.div
        className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
        initial={reduce ? { opacity: 1 } : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={view}
        transition={{ duration: reduce ? 0 : 0.55, ease: EASE }}
      >

        {/* ── Fondo animado ── */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* Glow izquierdo */}
          <motion.div
            className="absolute -left-32 -top-32 h-96 w-96 rounded-full blur-3xl"
            style={{ background: 'rgba(59,79,216,0.18)' }}
            animate={reduce ? undefined : {
              x: [0, 20, 0], y: [0, 15, 0], scale: [1, 1.08, 1],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
          {/* Glow derecho */}
          <motion.div
            className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full blur-3xl"
            style={{ background: 'rgba(167,139,250,0.14)' }}
            animate={reduce ? undefined : {
              x: [0, -18, 0], y: [0, -12, 0], scale: [1, 1.06, 1],
            }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          />
          {/* Grid de puntos */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />
          {/* Línea superior decorativa */}
          <motion.div
            className="absolute left-0 right-0 top-0 h-px"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(96,165,250,0.6) 40%, rgba(167,139,250,0.6) 60%, transparent)',
            }}
            initial={{ scaleX: 0, opacity: 0 }}
            whileInView={{ scaleX: 1, opacity: 1 }}
            viewport={view}
            transition={{ duration: 1.0, ease: EASE }}
          />
        </div>

        {/* ── Contenido ── */}
        <div className="relative z-10 grid gap-10 p-6 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-16 lg:p-14">

          {/* Columna izquierda */}
          <div>
            {/* Badge */}
            <motion.p
              className="inline-flex items-center gap-1.5 rounded-full border border-[#60a5fa]/20 bg-[#60a5fa]/[0.06] px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[#c4b5fd]/90"
              initial={reduce ? { opacity: 1 } : { opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={view}
              transition={{ duration: DURATION_ENTER, ease: EASE_OUT_SOFT }}
            >
              <motion.span
                className="h-1.5 w-1.5 rounded-full bg-[#34d399]"
                animate={reduce ? undefined : {
                  boxShadow: [
                    '0 0 0 0 rgba(52,211,153,0.5)',
                    '0 0 0 5px rgba(52,211,153,0)',
                  ],
                }}
                transition={{ duration: 1.4, repeat: Infinity }}
              />
              Disponible para proyectos
            </motion.p>

            {/* Título */}
            <motion.h2
              id="contact-heading"
              className="mt-4 text-[clamp(1.6rem,1.2rem+1.5vw,2.4rem)] font-bold leading-[1.08] tracking-[-0.03em] text-white"
              initial={reduce ? { opacity: 1 } : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={view}
              transition={{ duration: DURATION_ENTER, delay: 0.08, ease: EASE_OUT_SOFT }}
            >
              ¿Tu negocio necesita<br />
              <span className="bg-gradient-to-r from-[#60a5fa] to-[#a78bfa] bg-clip-text text-transparent">
                una mejor web?
              </span>
            </motion.h2>

            {/* Subtítulo */}
            <motion.p
              className="mt-4 max-w-lg text-[15px] leading-relaxed text-white/50"
              initial={reduce ? { opacity: 1 } : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={view}
              transition={{ duration: DURATION_ENTER, delay: 0.14, ease: EASE_OUT_SOFT }}
            >
              Contame el nombre de tu negocio y qué necesitás. 
            </motion.p>

            {/* Prompts rotantes — muestra casos de uso */}
            <motion.div
              className="mt-5 flex flex-wrap gap-2"
              initial={reduce ? { opacity: 1 } : { opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={view}
              transition={{ duration: DURATION_ENTER, delay: 0.20, ease: EASE_OUT_SOFT }}
            >
              {PROMPTS.map((p, i) => (
                <motion.button
                  key={p}
                  onClick={() => setPromptIdx(i)}
                  className="rounded-full border px-3 py-1 text-[11px] font-medium transition-all duration-200"
                  animate={{
                    borderColor: promptIdx === i
                      ? 'rgba(96,165,250,0.5)'
                      : 'rgba(255,255,255,0.08)',
                    background: promptIdx === i
                      ? 'rgba(96,165,250,0.10)'
                      : 'rgba(255,255,255,0.02)',
                    color: promptIdx === i
                      ? 'rgba(196,181,253,0.95)'
                      : 'rgba(255,255,255,0.35)',
                  }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {p}
                </motion.button>
              ))}
            </motion.div>
          </div>

          {/* Columna derecha — CTA card */}
          <motion.div
            className="flex flex-col items-stretch gap-3 lg:min-w-[240px]"
            initial={reduce ? { opacity: 1 } : { opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={view}
            transition={{ duration: DURATION_ENTER, delay: 0.18, ease: EASE_OUT_SOFT }}
          >
            {/* Card CTA principal */}
            <motion.a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="group relative flex flex-col items-center justify-center overflow-hidden rounded-2xl px-8 py-6 text-center"
              style={{ background: 'linear-gradient(135deg, #3b4fd8, #6d28d9)' }}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {/* Shimmer en hover */}
              <motion.div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.12) 50%, transparent 70%)',
                  backgroundSize: '200% 100%',
                }}
                animate={hovered ? { backgroundPosition: ['200% center', '-200% center'] } : {}}
                transition={{ duration: 0.7, ease: 'easeInOut' }}
              />

              <span className="relative z-10 flex items-center gap-2 text-[15px] font-semibold text-white">
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white" aria-hidden>
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/>
                </svg>
                Escribime por WhatsApp
              </span>
            </motion.a>

            {/* Separador */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-white/[0.07]" />
              <span className="text-[11px] text-white/25">o</span>
              <div className="h-px flex-1 bg-white/[0.07]" />
            </div>

            {/* Mail secundario */}
            <motion.a
              href={`mailto:${email}`}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-5 py-3 text-[13px] font-medium text-white/50 transition-all duration-200 hover:border-white/[0.16] hover:bg-white/[0.05] hover:text-white/80"
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
            >
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round"
                className="h-4 w-4 stroke-current" aria-hidden>
                <rect x="3" y="5" width="18" height="14" rx="2"/>
                <path d="m3 7 9 6 9-6"/>
              </svg>
              {email}
            </motion.a>

          </motion.div>

        </div>
      </motion.div>
    </section>
  );
}