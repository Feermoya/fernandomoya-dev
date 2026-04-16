import { useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Halo radial que sigue al puntero (rAF). Desactivado en touch / reduced motion.
 */
export default function CursorGlow() {
  const reduce = useReducedMotion();
  const [enabled, setEnabled] = useState(false);
  const pos = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });
  const raf = useRef<number>(0);
  const layer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduce) return;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    if (coarse) return;
    setEnabled(true);
  }, [reduce]);

  const tick = useCallback(() => {
    const el = layer.current;
    if (!el) return;
    pos.current.x += (target.current.x - pos.current.x) * 0.14;
    pos.current.y += (target.current.y - pos.current.y) * 0.14;
    el.style.transform = `translate3d(${pos.current.x - 200}px, ${pos.current.y - 200}px, 0)`;
    raf.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const onMove = (e: PointerEvent) => {
      target.current.x = e.clientX;
      target.current.y = e.clientY;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    raf.current = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf.current);
    };
  }, [enabled, tick]);

  if (!enabled) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[40] overflow-hidden"
      aria-hidden="true"
    >
      <div
        ref={layer}
        className="absolute h-[400px] w-[400px] rounded-full will-change-transform"
        style={{
          /* Opacidad 0.08–0.12 sobre acento (#2d5be3); radio 200px (spec E) */
          background:
            'radial-gradient(circle 200px at center, rgba(45, 91, 227, 0.1), transparent 72%)',
        }}
      />
    </div>
  );
}
