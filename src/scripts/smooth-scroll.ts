function canUseSmoothScroll(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  return window.matchMedia('(min-width: 1024px) and (pointer: fine)').matches;
}

async function initSmoothScroll() {
  if (!canUseSmoothScroll()) return;

  const [{ default: Lenis }, { gsap, ScrollTrigger }] = await Promise.all([
    import('lenis'),
    import('@/lib/gsap'),
  ]);
  await import('lenis/dist/lenis.css');

  const lenis = new Lenis({
    duration: 0.8,
    smoothWheel: true,
    syncTouch: false,
    wheelMultiplier: 0.9,
  });

  lenis.on('scroll', ScrollTrigger.update);

  const onTick = (time: number) => {
    lenis.raf(time * 1000);
  };

  gsap.ticker.add(onTick);
  gsap.ticker.lagSmoothing(0);

  const mq = window.matchMedia('(min-width: 1024px) and (pointer: fine)');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  const teardown = () => {
    gsap.ticker.remove(onTick);
    lenis.destroy();
    ScrollTrigger.refresh();
  };

  const onChange = () => {
    if (!canUseSmoothScroll()) teardown();
  };

  mq.addEventListener('change', onChange);
  reduced.addEventListener('change', onChange);
}

if ('requestIdleCallback' in window) {
  window.requestIdleCallback(() => {
    void initSmoothScroll();
  }, { timeout: 1800 });
} else {
  window.setTimeout(() => {
    void initSmoothScroll();
  }, 1);
}
