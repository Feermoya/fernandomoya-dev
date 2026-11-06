import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { FocoPrimaryButton } from '@/components/finance/ui';
import { financeScopedKey } from '@/lib/finance/storage';

const TOUR_KEY = 'fm-finance-tour-v1';

const STEPS = [
  {
    id: 'hello',
    title: 'Tu libro',
    body: 'Estos números son solo tuyos. En un momento te muestro el objetivo, la racha y dónde se cargan las inversiones.',
    target: null,
    radius: 24,
  },
  {
    id: 'goal',
    title: 'Objetivo del mes',
    body: 'El círculo es el objetivo. El monto de al lado es lo que ya invertiste este mes.',
    target: 'goal',
    radius: 24,
  },
  {
    id: 'streak',
    title: 'La racha',
    body: 'Cada cuadrado es un mes. Suma si llegás al mínimo del chip. Verde es cumplido.',
    target: 'streak',
    radius: 24,
  },
  {
    id: 'invest',
    title: 'Cargar inversión',
    body: 'Este botón abre la carga. Ahí anotás el monto, el activo y la fecha.',
    target: 'invest',
    radius: 999,
  },
  {
    id: 'goals',
    title: 'Para dejarlo a tu medida',
    body: 'Objetivos guarda metas largas. Al lado, Montos rápidos deja atajos para cargar. El plan del mes está justo arriba.',
    target: 'goals',
    radius: 24,
  },
] as const;

type Props = {
  userId: string;
};

export function FinanceWelcomeTour({ userId }: Props) {
  const titleId = useId();
  const cardRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [cardTop, setCardTop] = useState(24);
  const step = STEPS[index];
  const last = index === STEPS.length - 1;

  useEffect(() => {
    if (!userId) return;
    try {
      if (window.localStorage.getItem(financeScopedKey(TOUR_KEY, userId)) === '1') return;
    } catch {
      return;
    }
    setOpen(true);
  }, [userId]);

  useEffect(() => {
    if (!open) return;
    const target = step.target;
    if (!target) {
      setRect(null);
      return;
    }
    const el = document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
    if (!el) {
      setRect(null);
      return;
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (target !== 'invest') {
      el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
    }
    let raf = 0;
    let frames = 0;
    const measure = () => {
      setRect(el.getBoundingClientRect());
      frames += 1;
      if (frames < (reduced ? 1 : 28)) raf = requestAnimationFrame(measure);
    };
    raf = requestAnimationFrame(measure);
    const onMove = () => setRect(el.getBoundingClientRect());
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove, true);
    };
  }, [open, step]);

  useLayoutEffect(() => {
    if (!open) return;
    const card = cardRef.current;
    if (!card) return;
    const height = card.getBoundingClientRect().height;
    const margin = 16;
    if (!rect) {
      setCardTop(Math.max(margin, (window.innerHeight - height) / 2));
      return;
    }
    const below = rect.bottom + 16;
    if (below + height <= window.innerHeight - margin) {
      setCardTop(below);
      return;
    }
    setCardTop(Math.max(margin, rect.top - height - 16));
  }, [open, rect, index]);

  useEffect(() => {
    if (!open) return;
    nextRef.current?.focus();
  }, [open, index]);

  function finish() {
    try {
      window.localStorage.setItem(financeScopedKey(TOUR_KEY, userId), '1');
    } catch {
      /* si el navegador bloquea el almacenamiento, el recorrido se puede cerrar igual */
    }
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, userId]);

  if (!open) return null;

  const pad = 8;

  return (
    <div className="foco-tour" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      {rect ? (
        <div
          className="foco-tour-hole"
          style={{
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
            borderRadius: step.radius,
            transform: `translate3d(${rect.left - pad}px, ${rect.top - pad}px, 0)`,
          }}
        />
      ) : (
        <div className="foco-tour-dim" />
      )}
      <div className="foco-tour-catch" />
      <div ref={cardRef} className="foco-tour-card" style={{ top: cardTop }}>
        <div key={step.id} className="foco-tour-copy">
          <p className="foco-label">
            {index + 1} de {STEPS.length}
          </p>
          <h2 id={titleId} className="foco-card-title mt-2">
            {step.title}
          </h2>
          <p className="mt-2 text-sm font-medium leading-relaxed text-[var(--text-secondary)]">{step.body}</p>
        </div>
        {step.target === 'invest' ? (
          <button
            ref={nextRef}
            type="button"
            className="mt-4 min-h-[44px] w-full text-sm font-bold text-[var(--primary)]"
            onClick={() => setIndex((n) => n + 1)}
          >
            Siguiente
          </button>
        ) : (
          <FocoPrimaryButton
            ref={nextRef}
            showPlus={false}
            className="mt-4 w-full"
            onClick={() => (last ? finish() : setIndex((n) => n + 1))}
          >
            {index === 0 ? 'Empezar' : last ? 'Listo' : 'Siguiente'}
          </FocoPrimaryButton>
        )}
        {last ? null : (
          <button type="button" className="mt-3 w-full text-xs font-semibold text-[var(--text-muted)]" onClick={finish}>
            Omitir
          </button>
        )}
      </div>
    </div>
  );
}
