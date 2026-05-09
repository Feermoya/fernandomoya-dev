import { motion, useInView, useReducedMotion } from 'motion/react';
import { useRef, useState, useSyncExternalStore } from 'react';

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

function subscribeMobileViewport(cb: () => void) {
  const mq = window.matchMedia('(max-width: 639.98px)');
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

function getMobileViewportSnapshot() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 639.98px)').matches;
}

/** Mobile: cards animan una por una al hacer scroll (root de intersección más exigente). */
function useIsMobileResultsLayout() {
  return useSyncExternalStore(subscribeMobileViewport, getMobileViewportSnapshot, () => false);
}

type Item = {
  number: string;
  title: string;
  headline: string;
  text: string;
  color: string;
  colorMuted: string;
  demo: 'message' | 'shield' | 'send' | 'phone';
};

const ITEMS: Item[] = [
  {
    number: '01',
    title: 'Mensaje claro',
    headline: 'Que se entienda qué vendés.',
    text: 'La persona tiene que saber rápido si lo que ofrecés es para ella.',
    color: '#60a5fa',
    colorMuted: 'rgba(96,165,250,0.12)',
    demo: 'message',
  },
  {
    number: '02',
    title: 'Confianza',
    headline: 'Que tu negocio se vea serio.',
    text: 'Diseño, textos e imágenes tienen que acompañar la calidad de tu trabajo.',
    color: '#a78bfa',
    colorMuted: 'rgba(167,139,250,0.12)',
    demo: 'shield',
  },
  {
    number: '03',
    title: 'Contacto fácil',
    headline: 'Que escribirte sea simple.',
    text: 'Si alguien tiene interés, no debería tener que buscar cómo avanzar.',
    color: '#34d399',
    colorMuted: 'rgba(52,211,153,0.10)',
    demo: 'send',
  },
  {
    number: '04',
    title: 'Mobile cómodo',
    headline: 'Que funcione bien desde el celular.',
    text: 'La mayoría entra desde el teléfono. Ahí todo tiene que ser claro y rápido.',
    color: '#f472b6',
    colorMuted: 'rgba(244,114,182,0.10)',
    demo: 'phone',
  },
];

/* ── Mini demos animadas ── */

function DemoMessage({ active, color }: { active: boolean; color: string }) {
  const lines = [
    { w: '75%', delay: 0 },
    { w: '55%', delay: 0.08 },
    { w: '65%', delay: 0.16 },
  ];
  return (
    <div className="flex flex-col gap-2 p-3">
      {/* Bubble del "negocio" */}
      <motion.div
        className="flex items-end gap-2"
        initial={{ opacity: 0, x: -10 }}
        animate={active ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
        transition={{ duration: 0.4, ease: EASE }}
      >
        <div
          className="h-6 w-6 shrink-0 rounded-full"
          style={{ background: color, opacity: 0.7 }}
        />
        <div className="flex flex-col gap-1.5">
          {lines.map((l, i) => (
            <motion.div
              key={i}
              className="h-2 rounded-full bg-white/20"
              style={{ width: l.w }}
              initial={{ scaleX: 0, originX: 0 }}
              animate={active ? { scaleX: 1 } : { scaleX: 0 }}
              transition={{ duration: 0.35, delay: l.delay, ease: EASE }}
            />
          ))}
        </div>
      </motion.div>
      {/* Respuesta del visitante */}
      <motion.div
        className="ml-auto flex items-center gap-2"
        initial={{ opacity: 0, x: 10 }}
        animate={active ? { opacity: 1, x: 0 } : { opacity: 0, x: 10 }}
        transition={{ duration: 0.4, delay: 0.3, ease: EASE }}
      >
        <div
          className="h-2 w-16 rounded-full"
          style={{ background: color, opacity: 0.5 }}
        />
        <div
          className="h-6 w-6 shrink-0 rounded-full bg-white/10"
        />
      </motion.div>
    </div>
  );
}

function DemoShield({ active, color }: { active: boolean; color: string }) {
  return (
    <div className="flex items-center justify-center py-2">
      <div className="relative flex items-center justify-center">
        {/* Anillos que se expanden */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border"
            style={{ borderColor: color }}
            initial={{ width: 32, height: 32, opacity: 0 }}
            animate={
              active
                ? {
                    width: [32, 32 + i * 22],
                    height: [32, 32 + i * 22],
                    opacity: [0.6, 0],
                  }
                : { opacity: 0 }
            }
            transition={{
              duration: 1.2,
              delay: i * 0.25,
              repeat: active ? Infinity : 0,
              ease: 'easeOut',
            }}
          />
        ))}
        {/* Escudo central */}
        <motion.div
          className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full"
          style={{ background: color }}
          initial={{ scale: 0 }}
          animate={active ? { scale: 1 } : { scale: 0 }}
          transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <motion.svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-4 w-4"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <motion.path
              stroke="white"
              d="M5 13l4 4L19 7"
              initial={{ pathLength: 0 }}
              animate={active ? { pathLength: 1 } : { pathLength: 0 }}
              transition={{ duration: 0.4, delay: 0.2, ease: EASE }}
            />
          </motion.svg>
        </motion.div>
      </div>
      {/* Stars de confianza */}
      <div className="ml-4 flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            initial={{ scale: 0, opacity: 0 }}
            animate={active ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
            transition={{ duration: 0.25, delay: 0.35 + i * 0.06, ease: EASE }}
          >
            <svg viewBox="0 0 12 12" className="h-3 w-3" fill={color}>
              <path d="M6 1l1.2 3.6H11L8.1 6.6l1.1 3.4L6 8.2 2.8 10l1.1-3.4L1 4.6h3.8z" />
            </svg>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function DemoSend({ active, color }: { active: boolean; color: string }) {
  return (
    <div className="flex flex-col gap-2 px-3 py-1">
      {/* Input simulado */}
      <motion.div
        className="flex h-7 items-center gap-2 rounded-lg border px-3"
        style={{ borderColor: active ? color : 'rgba(255,255,255,0.1)' }}
        animate={{ borderColor: active ? color : 'rgba(255,255,255,0.1)' }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          className="h-1.5 rounded-full bg-white/30"
          initial={{ width: 0 }}
          animate={active ? { width: '70%' } : { width: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
        />
        {/* Cursor parpadeante */}
        <motion.div
          className="h-3 w-px bg-white/60"
          animate={active ? { opacity: [1, 0, 1] } : { opacity: 0 }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
      </motion.div>
      {/* Botón enviar */}
      <motion.div
        className="flex h-7 items-center justify-center gap-2 rounded-lg text-xs font-semibold text-white"
        style={{ background: color }}
        initial={{ opacity: 0, y: 6 }}
        animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
        transition={{ duration: 0.35, delay: 0.25, ease: EASE }}
      >
        <span style={{ fontSize: '11px' }}>Enviar mensaje</span>
        <motion.span
          animate={active ? { x: [0, 4, 0] } : {}}
          transition={{ duration: 0.6, delay: 0.5, repeat: active ? 2 : 0 }}
        >
          →
        </motion.span>
      </motion.div>
    </div>
  );
}

function DemoPhone({ active, color }: { active: boolean; color: string }) {
  const rows = ['85%', '65%', '75%', '50%'];
  return (
    <div className="flex items-center justify-center gap-4">
      {/* Silueta mobile */}
      <motion.div
        className="relative flex h-16 w-9 flex-col gap-1 overflow-hidden rounded-lg border p-1.5"
        style={{ borderColor: 'rgba(255,255,255,0.15)' }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={active ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.4, ease: EASE }}
      >
        {rows.map((w, i) => (
          <motion.div
            key={i}
            className="h-1.5 rounded-full"
            style={{ background: i === 0 ? color : 'rgba(255,255,255,0.15)', opacity: 0.8 }}
            initial={{ scaleX: 0, originX: 0 }}
            animate={active ? { scaleX: 1 } : { scaleX: 0 }}
            transition={{ duration: 0.3, delay: 0.1 + i * 0.07, ease: EASE }}
          />
        ))}
        {/* Botón CTA mini */}
        <motion.div
          className="mt-auto h-2 rounded"
          style={{ background: color }}
          initial={{ scaleX: 0, originX: 0 }}
          animate={active ? { scaleX: 1 } : { scaleX: 0 }}
          transition={{ duration: 0.3, delay: 0.38, ease: EASE }}
        />
      </motion.div>
      {/* Check de aprobación */}
      <motion.div
        className="flex flex-col items-center gap-1"
        initial={{ opacity: 0 }}
        animate={active ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.3, delay: 0.5 }}
      >
        <motion.div
          className="flex h-7 w-7 items-center justify-center rounded-full"
          style={{ background: color }}
          initial={{ scale: 0 }}
          animate={active ? { scale: 1 } : { scale: 0 }}
          transition={{ duration: 0.35, delay: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" stroke="white">
            <path d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>
        <span style={{ fontSize: '9px', color, opacity: 0.8 }}>OK</span>
      </motion.div>
    </div>
  );
}

function Demo({
  type, active, color,
}: { type: Item['demo']; active: boolean; color: string }) {
  if (type === 'message') return <DemoMessage active={active} color={color} />;
  if (type === 'shield')  return <DemoShield  active={active} color={color} />;
  if (type === 'send')    return <DemoSend    active={active} color={color} />;
  return <DemoPhone active={active} color={color} />;
}

function Card({
  item,
  index,
  reduce,
  isMobileLayout,
  cardViewport,
}: {
  item: Item;
  index: number;
  reduce: boolean;
  isMobileLayout: boolean;
  cardViewport: { once: boolean; amount: number | 'some'; margin: string };
}) {
  const [hovered, setHovered] = useState(false);
  const [spot, setSpot] = useState({ x: 50, y: 50 });
  const articleRef = useRef<HTMLElement>(null);

  const demoInView = useInView(articleRef, {
    amount: isMobileLayout ? 0.42 : 0.2,
    margin: isMobileLayout ? '0px 0px -22% 0px' : '-80px 0px',
  });

  const active = isMobileLayout ? demoInView : hovered;

  return (
    <motion.article
      ref={articleRef}
      className="group relative cursor-default overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.03] transition-colors duration-300 hover:border-white/[0.14] hover:bg-white/[0.055]"
      initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={cardViewport}
      transition={{
        duration: reduce ? 0 : 0.48,
        ease: EASE,
        delay: reduce ? 0 : isMobileLayout ? 0 : index * 0.06,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setSpot({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
      }}
    >
      {/* Spotlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: `radial-gradient(circle at ${spot.x}% ${spot.y}%, ${item.colorMuted}, transparent 55%)` }}
      />

      {/* Número */}
      <div className="absolute right-4 top-4 text-[10px] font-semibold tabular-nums"
        style={{ color: item.color, opacity: 0.4 }}>
        {item.number}
      </div>

      <div className="p-5">
        {/* Header */}
        <div className="flex items-center gap-2">
          <motion.div
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: item.color }}
            animate={active ? { scale: [1, 1.6, 1] } : { scale: 1 }}
            transition={{ duration: 0.5, repeat: active ? Infinity : 0, repeatDelay: 1 }}
          />
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]"
            style={{ color: item.color, opacity: 0.8 }}>
            {item.title}
          </p>
        </div>

        <h4 className="mt-3 text-[1.05rem] font-semibold leading-snug text-white sm:text-[1.12rem]">
          {item.headline}
        </h4>

        <p className="mt-2 text-[12.5px] leading-relaxed text-white/45 sm:text-[13px]">
          {item.text}
        </p>

        {/* Demo animada */}
        <motion.div
          className="mt-4 overflow-hidden rounded-xl border"
          style={{ borderColor: active ? item.color + '30' : 'rgba(255,255,255,0.06)' }}
          animate={{
            borderColor: active ? item.color + '30' : 'rgba(255,255,255,0.06)',
            background: active ? item.colorMuted : 'rgba(255,255,255,0.02)',
          }}
          transition={{ duration: 0.3 }}
        >
          <Demo type={item.demo} active={active} color={item.color} />
        </motion.div>

        {/* Barra de progreso */}
        <motion.div className="relative mt-4 h-px w-full overflow-hidden rounded-full bg-white/[0.06]">
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${item.color}, ${item.color}88)` }}
            initial={{ x: '-100%' }}
            whileInView={{ x: '0%' }}
            viewport={cardViewport}
            transition={{
              duration: reduce ? 0 : 0.65,
              ease: EASE,
              delay: reduce ? 0 : isMobileLayout ? 0.08 : index * 0.06 + 0.18,
            }}
          />
        </motion.div>
      </div>
    </motion.article>
  );
}

export default function ResultsChart() {
  const reduceMotion = useReducedMotion();
  const reduce = Boolean(reduceMotion);
  const isMobileLayout = useIsMobileResultsLayout();

  const cardViewport = isMobileLayout
    ? { once: true as const, amount: 0.5 as const, margin: '0px 0px -28% 0px' as const }
    : { once: true as const, amount: 0.22 as const, margin: '-55px 0px' as const };

  return (
    <motion.div
      className="glass-panel relative mt-6 w-full overflow-hidden rounded-2xl border border-white/[0.08] !p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:!p-7"
      initial={reduce ? { opacity: 1 } : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px 0px' }}
      transition={{ duration: reduce ? 0 : 0.5, ease: EASE }}
    >
      {/* Blobs de fondo */}
      <motion.div aria-hidden="true"
        className="pointer-events-none absolute -left-20 top-6 h-48 w-48 rounded-full bg-[#60a5fa]/[0.07] blur-3xl"
        animate={reduce ? undefined : { x: [0, 24, 0], opacity: [0.25, 0.4, 0.25] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div aria-hidden="true"
        className="pointer-events-none absolute -right-20 bottom-6 h-48 w-48 rounded-full bg-[#a78bfa]/[0.07] blur-3xl"
        animate={reduce ? undefined : { x: [0, -20, 0], opacity: [0.20, 0.35, 0.20] }}
        transition={{ duration: 6.4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Header */}
      <div className="relative z-10 max-w-2xl">
        <p className="inline-flex items-center rounded-full border border-[#60a5fa]/20 bg-[#60a5fa]/[0.07] px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[#c4b5fd]/90">
          Lo importante
        </p>
        <h3 className="mt-4 text-[1.35rem] font-semibold leading-tight tracking-tight text-white sm:text-2xl">
          Una web tiene que hacer cuatro cosas bien.
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-white/50 sm:text-[0.95rem]">
          Pasá el mouse por cada punto para verlo en acción.
        </p>
      </div>

      {/* Cards */}
      <div className="relative z-10 mt-6 grid gap-3 sm:grid-cols-2 sm:gap-4">
        {ITEMS.map((item, idx) => (
          <Card
            key={item.title}
            item={item}
            index={idx}
            reduce={reduce}
            isMobileLayout={isMobileLayout}
            cardViewport={cardViewport}
          />
        ))}
      </div>
    </motion.div>
  );
}