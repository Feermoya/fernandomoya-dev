import Lenis from 'lenis';

const defaultEasing = (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t));

/** Dispara el evento global de scroll para que listeners (parallax, Motion) se actualicen cada frame de Lenis */
function syncMotionScroll() {
  window.dispatchEvent(new Event('scroll'));
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

function bootWhenSplashReady() {
  const splash = document.getElementById('fm-splash');
  if (!splash || splash.classList.contains('fm-gone') || splash.classList.contains('fm-hidden')) {
    initFmLenis();
    return;
  }
  const obs = new MutationObserver(() => {
    if (splash.classList.contains('fm-hidden') || splash.classList.contains('fm-gone')) {
      obs.disconnect();
      requestAnimationFrame(() => initFmLenis());
    }
  });
  obs.observe(splash, { attributes: true, attributeFilter: ['class'] });
  window.setTimeout(() => {
    obs.disconnect();
    if (!window.__fmLenis) initFmLenis();
  }, 3600);
}

bootWhenSplashReady();
document.addEventListener('astro:page-load', () => bootWhenSplashReady());
