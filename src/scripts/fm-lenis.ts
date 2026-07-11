import Lenis from 'lenis';

const defaultEasing = (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t));

/** Dispara el evento global de scroll para que listeners (parallax, Motion) se actualicen cada frame de Lenis */
let syncingScroll = false;
function syncMotionScroll() {
  // Lenis puede reaccionar al scroll sintético y volver a emitir `scroll` en el mismo stack → stack overflow.
  if (syncingScroll) return;
  syncingScroll = true;
  try {
    window.dispatchEvent(new Event('scroll'));
  } finally {
    syncingScroll = false;
  }
}

function destroyFmLenis() {
  window.__fmLenis?.destroy();
  window.__fmLenis = undefined;
}

function createLenis(): Lenis {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return new Lenis({
    lerp: reduced ? 1 : 0.08,
    duration: reduced ? 0 : 1.2,
    easing: defaultEasing,
    autoRaf: true,
    anchors: true,
  });
}

export function initFmLenis() {
  destroyFmLenis();
  const lenis = createLenis();
  window.__fmLenis = lenis;
  lenis.on('scroll', syncMotionScroll);
}

function boot() {
  initFmLenis();
}

boot();
document.addEventListener('astro:page-load', boot);
