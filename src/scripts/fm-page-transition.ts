const CLIP_HIDDEN = 'inset(0% 0% 100% 0%)';
const CLIP_FULL = 'inset(0% 0% 0% 0%)';
const CLIP_OUT = 'inset(100% 0% 0% 0%)';

const EASE_EXIT = 'cubic-bezier(0.76, 0, 0.24, 1)';
const EASE_ENTER = 'cubic-bezier(0.16, 1, 0.3, 1)';

let overlayAnim: Animation | null = null;
let logoAnim: Animation | null = null;
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
  overlayAnim?.cancel();
  logoAnim?.cancel();
  overlayAnim = null;
  logoAnim = null;
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

      overlayAnim = overlay.animate(
        [{ clipPath: CLIP_HIDDEN }, { clipPath: CLIP_FULL }],
        { duration: 400, easing: EASE_EXIT, fill: 'forwards' },
      );

      logoAnim = logo.animate(
        [
          { opacity: 0, filter: 'blur(12px)' },
          { opacity: 1, filter: 'blur(0px)' },
        ],
        { duration: 300, delay: 60, easing: EASE_ENTER, fill: 'forwards' },
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
          await logo.animate(
            [
              { opacity: 1, filter: 'blur(0px)' },
              { opacity: 0, filter: 'blur(8px)' },
            ],
            { duration: 140, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' },
          ).finished;
          await overlay
            .animate(
              [{ clipPath: CLIP_FULL }, { clipPath: CLIP_OUT }],
              { duration: 500, delay: 50, easing: EASE_ENTER, fill: 'forwards' },
            )
            .finished;
        } finally {
          resetHard(overlay, logo);
        }
      })();
    },
    { passive: true },
  );
}

bindPageTransitionUi();
