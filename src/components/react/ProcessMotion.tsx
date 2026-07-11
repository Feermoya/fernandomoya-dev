import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReducedMotion } from 'motion/react';
import { useLayoutEffect } from 'react';

gsap.registerPlugin(ScrollTrigger);

export default function ProcessMotion() {
  const reduceMotion = useReducedMotion();

  useLayoutEffect(() => {
    const root = document.querySelector('.process-section');
    if (!root) return;

    const title = root.querySelector('.process-section__title');
    const lead = root.querySelector('.process-section__lead');
    const eyebrow = root.querySelector('.process-section__eyebrow');
    const steps = root.querySelectorAll('[data-process-step]');
    const dividers = root.querySelectorAll('[data-process-divider]');

    if (reduceMotion) {
      gsap.set([title, lead, eyebrow, steps, dividers], {
        clearProps: 'all',
        opacity: 1,
        y: 0,
        scaleX: 1,
      });
      return;
    }

    gsap.set([eyebrow, title, lead], { opacity: 0, y: 18 });
    gsap.set(steps, { opacity: 0, y: 16 });
    gsap.set(dividers, { scaleX: 0 });

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: root,
        start: 'top 82%',
        once: true,
        onEnter: () => {
          const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
          tl.to(eyebrow, { opacity: 1, y: 0, duration: 0.5 })
            .to(title, { opacity: 1, y: 0, duration: 0.62 }, '-=0.35')
            .to(lead, { opacity: 1, y: 0, duration: 0.58 }, '-=0.42')
            .to(dividers, { scaleX: 1, duration: 0.72, stagger: 0.08 }, '-=0.3')
            .to(steps, { opacity: 1, y: 0, duration: 0.62, stagger: 0.1 }, '-=0.55');
        },
      });
    }, root);

    return () => ctx.revert();
  }, [reduceMotion]);

  return null;
}
