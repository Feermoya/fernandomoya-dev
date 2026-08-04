import { gsap, ScrollTrigger } from '@/lib/gsap';
import { prefersReducedMotion } from '@/lib/motion-prefs';

export function initProcessMotion() {
  const root = document.querySelector('.process-section');
  if (!(root instanceof HTMLElement)) return;

  const title = root.querySelector('.process-section__title');
  const lead = root.querySelector('.process-section__lead');
  const eyebrow = root.querySelector('.process-section__intro > .process-section__eyebrow');
  const steps = root.querySelectorAll('[data-process-step]');
  const dividers = root.querySelectorAll('[data-process-divider]');
  const mobile = window.matchMedia('(max-width: 767px)').matches;

  if (prefersReducedMotion()) {
    gsap.set([title, lead, eyebrow, steps, dividers], {
      clearProps: 'all',
      opacity: 1,
      y: 0,
      scaleX: 1,
    });
    return;
  }

  gsap.set([eyebrow, title, lead], { opacity: 0, y: mobile ? 10 : 12 });
  gsap.set(steps, { opacity: 0, y: mobile ? 10 : 12 });
  if (!mobile && dividers.length > 0) {
    gsap.set(dividers, { scaleX: 0, transformOrigin: 'left center' });
  }

  ScrollTrigger.create({
    trigger: root,
    start: 'top 82%',
    once: true,
    onEnter: () => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      const stepStagger = mobile ? 0.04 : 0.07;

      tl.to(eyebrow, { opacity: 1, y: 0, duration: 0.35 })
        .to(title, { opacity: 1, y: 0, duration: 0.45 }, '-=0.22')
        .to(lead, { opacity: 1, y: 0, duration: 0.4 }, '-=0.28');

      if (!mobile && dividers.length > 0) {
        tl.to(dividers, { scaleX: 1, duration: 0.5 }, '-=0.2');
      }

      tl.to(
        steps,
        { opacity: 1, y: 0, duration: 0.45, stagger: stepStagger },
        '-=0.3',
      );
    },
  });
}

initProcessMotion();
