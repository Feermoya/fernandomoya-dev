import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReducedMotion } from 'motion/react';
import { useLayoutEffect } from 'react';

gsap.registerPlugin(ScrollTrigger);

function resetMotionTargets(elements: ElementList) {
  gsap.set(elements, {
    clearProps: 'all',
    opacity: 1,
    y: 0,
    clipPath: 'none',
  });
}

export default function CaseStudyMotion() {
  const reduceMotion = useReducedMotion();

  useLayoutEffect(() => {
    const root = document.querySelector('.case-study-page');
    if (!root) return;

    const fadeEls = root.querySelectorAll('[data-cs-reveal="fade"]');
    const upEls = root.querySelectorAll('[data-cs-reveal="up"]');
    const clipEls = root.querySelectorAll('[data-cs-reveal="clip"]');
    const parallaxEls = root.querySelectorAll('[data-cs-parallax="light"]');

    if (reduceMotion) {
      resetMotionTargets([...fadeEls, ...upEls, ...clipEls]);
      gsap.set(parallaxEls, { clearProps: 'all', y: 0 });
      return;
    }

    const hero = root.querySelector('.cs-hero');
    const heroFade = hero ? hero.querySelectorAll('[data-cs-reveal="fade"]') : [];
    const heroUp = hero ? hero.querySelectorAll('[data-cs-reveal="up"]') : [];
    const heroClip = hero ? hero.querySelectorAll('[data-cs-reveal="clip"]') : [];

    gsap.set(heroFade, { opacity: 0 });
    gsap.set(heroUp, { opacity: 0, y: 24 });
    gsap.set(heroClip, { clipPath: 'inset(100% 0% 0% 0%)' });

    const ctx = gsap.context(() => {
      if (hero) {
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, delay: 0.08 });
        tl.to(heroFade, { opacity: 1, duration: 0.55 })
          .to(heroUp, { opacity: 1, y: 0, duration: 0.62, stagger: 0.08 }, '-=0.35')
          .to(heroClip, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.78 }, '-=0.42');
      }

      fadeEls.forEach((el) => {
        if (el.closest('.cs-hero')) return;
        gsap.set(el, { opacity: 0 });
        ScrollTrigger.create({
          trigger: el,
          start: 'top 88%',
          once: true,
          onEnter: () => {
            gsap.to(el, { opacity: 1, duration: 0.55, ease: 'power3.out' });
          },
        });
      });

      upEls.forEach((el) => {
        if (el.closest('.cs-hero')) return;
        gsap.set(el, { opacity: 0, y: 28 });
        ScrollTrigger.create({
          trigger: el,
          start: 'top 88%',
          once: true,
          onEnter: () => {
            gsap.to(el, { opacity: 1, y: 0, duration: 0.65, ease: 'power3.out' });
          },
        });
      });

      clipEls.forEach((el) => {
        if (el.closest('.cs-hero')) return;
        gsap.set(el, { clipPath: 'inset(100% 0% 0% 0%)' });
        ScrollTrigger.create({
          trigger: el,
          start: 'top 85%',
          once: true,
          onEnter: () => {
            gsap.to(el, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.72, ease: 'power3.out' });
          },
        });
      });

      parallaxEls.forEach((el) => {
        gsap.to(el, {
          y: 48,
          ease: 'none',
          scrollTrigger: {
            trigger: el,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 0.55,
          },
        });
      });
    }, root);

    return () => ctx.revert();
  }, [reduceMotion]);

  return null;
}
