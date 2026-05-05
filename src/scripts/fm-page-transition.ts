import { animate } from 'motion';

const CLIP_HIDDEN = 'inset(0% 0% 100% 0%)';
const CLIP_FULL = 'inset(0% 0% 0% 0%)';
const CLIP_OUT = 'inset(100% 0% 0% 0%)';

const EASE_EXIT: [number, number, number, number] = [0.76, 0, 0.24, 1];
const EASE_ENTER: [number, number, number, number] = [0.16, 1, 0.3, 1];

let overlayCtl: ReturnType<typeof animate> | null = null;
let logoCtl: ReturnType<typeof animate> | null = null;
let listenersBound = false;

function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function supportsVt(): boolean {
  return typeof document.startViewTransition === 'function';
}

function getEls(): { overlay: HTMLElement; logo: HTMLElement } | null {
  const overlay = document.getElementById('page-transition-overlay');
  const logo = document.querySelector<HTMLElement>('.page-transition-overlay-logo');
  if (!overlay || !logo) return null;
  return { overlay, logo };
}

function stopRunning(): void {
  overlayCtl?.stop();
  logoCtl?.stop();
  overlayCtl = null;
  logoCtl = null;
}

function resetHard(overlay: HTMLElement, logo: HTMLElement): void {
  overlay.style.clipPath = CLIP_HIDDEN;
  logo.style.opacity = '0';
  logo.style.filter = 'blur(12px)';
}

function bindPageTransitionUi(): void {
  if (listenersBound) return;
  if (!supportsVt() || reducedMotion()) return;
  listenersBound = true;

  document.addEventListener(
    'astro:before-preparation',
    () => {
      if (!supportsVt() || reducedMotion()) return;
      stopRunning();
      const next = getEls();
      if (!next) return;
      const { overlay, logo } = next;
      resetHard(overlay, logo);

      overlayCtl = animate(
        overlay,
        { clipPath: [CLIP_HIDDEN, CLIP_FULL] },
        { duration: 0.4, easing: EASE_EXIT },
      );

      logoCtl = animate(
        logo,
        { opacity: [0, 1], filter: ['blur(12px)', 'blur(0px)'] },
        { duration: 0.3, delay: 0.06, easing: EASE_ENTER },
      );
    },
    { passive: true },
  );

  document.addEventListener(
    'astro:after-swap',
    () => {
      if (!supportsVt() || reducedMotion()) return;
      stopRunning();
      const next = getEls();
      if (!next) return;
      const { overlay, logo } = next;

      overlay.style.clipPath = CLIP_FULL;
      logo.style.opacity = '1';
      logo.style.filter = 'blur(0px)';

      void (async () => {
        try {
          await animate(
            logo,
            { opacity: [1, 0], filter: ['blur(0px)', 'blur(8px)'] },
            { duration: 0.14, easing: [0.4, 0, 0.2, 1] },
          );
          await animate(
            overlay,
            { clipPath: [CLIP_FULL, CLIP_OUT] },
            { duration: 0.5, delay: 0.05, easing: EASE_ENTER },
          );
        } finally {
          resetHard(overlay, logo);
        }
      })();
    },
    { passive: true },
  );
}

bindPageTransitionUi();
