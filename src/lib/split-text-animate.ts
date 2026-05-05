import { animate, inView, stagger } from 'motion';
import SplitType from 'split-type';

const EXPO_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function prefersSplitMotionReduced(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Inicializa nodos `[data-split]` (words | lines | chars) con SplitType + Motion.
 * Idempotente por `data-split-bound` en el mismo documento.
 */
export function initSplitTextElements(root: ParentNode = document.body): void {
  if (typeof document === 'undefined' || prefersSplitMotionReduced()) return;

  const candidates = root.querySelectorAll<HTMLElement>('[data-split]:not([data-split-bound])');

  candidates.forEach((el) => {
    const mode = (el.dataset.split || 'words') as 'words' | 'lines' | 'chars';
    if (!['words', 'lines', 'chars'].includes(mode)) return;

    const delay = Number.parseFloat(el.dataset.splitDelay || '0') || 0;

    try {
      const split = new SplitType(el, { types: mode });
      el.dataset.splitBound = 'true';

      const targets =
        mode === 'words'
          ? (split.words ?? [])
          : mode === 'lines'
            ? (split.lines ?? [])
            : (split.chars ?? []);

      if (!targets.length) return;

      if (mode === 'words') {
        targets.forEach((node) => {
          const elu = node as HTMLElement;
          elu.style.overflow = 'hidden';
          elu.style.display = 'inline-block';
          elu.style.verticalAlign = 'baseline';
        });
      }

      if (mode === 'lines') {
        targets.forEach((node) => {
          const elu = node as HTMLElement;
          elu.style.overflow = 'hidden';
          elu.style.display = 'block';
        });
      }

      if (mode === 'chars') {
        targets.forEach((node) => {
          const elu = node as HTMLElement;
          elu.style.display = 'inline-block';
        });
      }

      let played = false;
      inView(
        el,
        () => {
          if (played) return;
          played = true;
          if (mode === 'chars') {
            animate(
              targets as HTMLElement[],
              { opacity: [0, 1], filter: ['blur(4px)', 'blur(0px)'] },
              { delay: stagger(0.02, { startDelay: delay }), duration: 0.52, ease: 'easeOut' },
            );
            return;
          }
          animate(
            targets as HTMLElement[],
            { opacity: [0, 1], y: ['110%', '0%'] },
            {
              delay: stagger(mode === 'lines' ? 0.04 : 0.06, { startDelay: delay }),
              duration: mode === 'lines' ? 0.68 : 0.74,
              ease: EXPO_OUT,
            },
          );
        },
        { amount: 0.35 },
      );
    } catch {
      delete el.dataset.splitBound;
    }
  });
}
