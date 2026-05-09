import { motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';

type Item = {
  number: string;
  title: string;
  headline: string;
  text: string;
  icon: 'message' | 'shield' | 'send' | 'phone';
};

const ITEMS: Item[] = [
  {
    number: '01',
    title: 'Mensaje claro',
    headline: 'Que se entienda qué vendés.',
    text: 'La persona tiene que saber rápido si lo que ofrecés es para ella.',
    icon: 'message',
  },
  {
    number: '02',
    title: 'Confianza',
    headline: 'Que tu negocio se vea serio.',
    text: 'Diseño, textos e imágenes tienen que acompañar la calidad de tu trabajo.',
    icon: 'shield',
  },
  {
    number: '03',
    title: 'Contacto fácil',
    headline: 'Que escribirte sea simple.',
    text: 'Si alguien tiene interés, no debería tener que buscar cómo avanzar.',
    icon: 'send',
  },
  {
    number: '04',
    title: 'Mobile cómodo',
    headline: 'Que funcione bien desde el celular.',
    text: 'La mayoría entra desde el teléfono. Ahí todo tiene que ser claro y rápido.',
    icon: 'phone',
  },
];

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

function CardIcon({ name }: { name: Item['icon'] }) {
  const common =
    'h-5 w-5 stroke-current text-[#93c5fd] transition-transform duration-300 group-hover:scale-110';

  if (name === 'message') {
    return (
      <svg
        className={common}
        viewBox="0 0 24 24"
        fill="none"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M5 6.5h14a2 2 0 0 1 2 2v6.5a2 2 0 0 1-2 2H9l-4 3v-3H5a2 2 0 0 1-2-2V8.5a2 2 0 0 1 2-2Z" />
        <path d="M8 10h8" />
        <path d="M8 13h5" />
      </svg>
    );
  }

  if (name === 'shield') {
    return (
      <svg
        className={common}
        viewBox="0 0 24 24"
        fill="none"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 3.5 19 6v5.2c0 4.2-2.8 7.8-7 9.3-4.2-1.5-7-5.1-7-9.3V6l7-2.5Z" />
        <path d="m9.5 12 1.8 1.8 3.7-4" />
      </svg>
    );
  }

  if (name === 'send') {
    return (
      <svg
        className={common}
        viewBox="0 0 24 24"
        fill="none"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 3 10.5 13.5" />
        <path d="M21 3 14.5 21l-4-7.5L3 9.5 21 3Z" />
      </svg>
    );
  }

  return (
    <svg
      className={common}
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="7" y="3" width="10" height="18" rx="2.4" />
      <path d="M10 6h4" />
      <path d="M11.5 18h1" />
    </svg>
  );
}

function SpotlightCard({
  item,
  index,
  reduce,
}: {
  item: Item;
  index: number;
  reduce: boolean;
}) {
  const [spot, setSpot] = useState({ x: 50, y: 50 });

  return (
    <motion.article
      className="group relative overflow-hidden rounded-2xl border border-white/[0.075] bg-white/[0.035] p-4 transition-all duration-300 hover:border-[#60a5fa]/25 hover:bg-white/[0.055] sm:p-5"
      initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-55px 0px' }}
      transition={{
        duration: reduce ? 0 : 0.46,
        ease: EASE,
        delay: reduce ? 0 : index * 0.08,
      }}
      onMouseMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setSpot({
          x: ((event.clientX - rect.left) / rect.width) * 100,
          y: ((event.clientY - rect.top) / rect.height) * 100,
        });
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(circle at ${spot.x}% ${spot.y}%, rgba(96,165,250,0.16), transparent 34%)`,
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[#60a5fa]/45 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />

      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#60a5fa]/[0.08] blur-2xl"
        animate={
          reduce
            ? undefined
            : {
                opacity: [0.24, 0.38, 0.24],
                scale: [1, 1.08, 1],
              }
        }
        transition={{
          duration: 4.2,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: index * 0.25,
        }}
      />

      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#60a5fa]/18 bg-[#60a5fa]/[0.075] text-[#93c5fd] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:h-10 sm:w-10">
            <CardIcon name={item.icon} />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#93c5fd]/75">
              {item.title}
            </p>

            <h4 className="mt-2 text-[1.08rem] font-semibold leading-snug text-white sm:text-[1.16rem]">
              {item.headline}
            </h4>
          </div>
        </div>

        <span className="shrink-0 rounded-full border border-white/[0.08] bg-white/[0.045] px-2.5 py-1 text-[11px] font-semibold tabular-nums text-white/42">
          {item.number}
        </span>
      </div>

      <p className="relative z-10 mt-4 text-[13px] leading-relaxed text-white/50 sm:text-sm">
        {item.text}
      </p>

      <motion.div
        aria-hidden="true"
        className="relative z-10 mt-4 h-px w-full overflow-hidden rounded-full bg-white/[0.06]"
      >
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-[#60a5fa] via-[#818cf8] to-[#a78bfa]"
          initial={{ x: '-100%' }}
          whileInView={{ x: '0%' }}
          viewport={{ once: true, margin: '-55px 0px' }}
          transition={{
            duration: reduce ? 0 : 0.65,
            ease: EASE,
            delay: reduce ? 0 : index * 0.08 + 0.18,
          }}
        />
      </motion.div>
    </motion.article>
  );
}

export default function ResultsChart() {
  const reduceMotion = useReducedMotion();
  const reduce = Boolean(reduceMotion);

  return (
    <motion.div
      className="glass-panel relative mt-6 w-full min-w-0 overflow-hidden rounded-2xl border border-white/[0.08] !p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:!p-6"
      initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px 0px' }}
      transition={{ duration: reduce ? 0 : 0.5, ease: EASE }}
    >
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-8 h-56 w-56 rounded-full bg-[#60a5fa]/[0.08] blur-3xl"
        animate={
          reduce
            ? undefined
            : {
                x: [0, 28, 0],
                opacity: [0.28, 0.42, 0.28],
              }
        }
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 bottom-8 h-56 w-56 rounded-full bg-[#a78bfa]/[0.075] blur-3xl"
        animate={
          reduce
            ? undefined
            : {
                x: [0, -24, 0],
                opacity: [0.22, 0.36, 0.22],
              }
        }
        transition={{ duration: 6.4, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative z-10 max-w-2xl">
        <p className="inline-flex items-center rounded-full border border-[#60a5fa]/20 bg-[#60a5fa]/[0.07] px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[#c4b5fd]/90">
          Lo importante
        </p>

        <h3 className="mt-4 max-w-xl text-[1.35rem] font-semibold leading-tight tracking-tight text-white sm:text-2xl">
          Una web tiene que hacer tres cosas bien.
        </h3>

        <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/55 sm:text-[0.95rem]">
          Mostrar qué vendés, generar confianza y dejar claro cómo contactarte.
        </p>
      </div>

      <div className="relative z-10 mt-6 grid gap-3 sm:grid-cols-2 sm:gap-4">
        {ITEMS.map((item, idx) => (
          <SpotlightCard key={item.title} item={item} index={idx} reduce={reduce} />
        ))}
      </div>

      <p className="relative z-10 mt-5 border-t border-white/[0.07] pt-4 text-sm leading-relaxed text-white/50">
        Eso busco cuando armo una web nueva: menos ruido, más claridad y un camino directo hacia la consulta.
      </p>
    </motion.div>
  );
}
