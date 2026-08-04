import { gsap, ScrollTrigger } from '@/lib/gsap';
import { prefersReducedMotion } from '@/lib/motion-prefs';

export function initFeaturedProjectsMotion() {
  const articles = document.querySelectorAll<HTMLElement>('[data-featured-project]');
  if (articles.length === 0) return;

  if (prefersReducedMotion()) {
    articles.forEach((article) => {
      const copy = article.querySelectorAll('[data-featured-copy]');
      const media = article.querySelector('[data-featured-media]');
      const scale = article.querySelector('.featured-project__scale');
      gsap.set([copy, media, scale], {
        clearProps: 'all',
        opacity: 1,
        y: 0,
        scale: 1,
        clipPath: 'none',
      });
    });
    return;
  }

  articles.forEach((article) => {
    const copyTargets = article.querySelectorAll('[data-featured-copy]');
    const chips = article.querySelectorAll('[data-featured-chip]');
    const media = article.querySelector('[data-featured-media]');
    const scale = article.querySelector('.featured-project__scale');

    gsap.set(copyTargets, { opacity: 0, y: 14 });
    if (media) {
      gsap.set(media, { opacity: 0 });
      gsap.set(scale || media, {
        scale: 0.99,
        clipPath: 'inset(4% 0% 4% 0%)',
      });
    }

    ScrollTrigger.create({
      trigger: article,
      start: 'top 82%',
      once: true,
      onEnter: () => {
        const tl = gsap.timeline({
          defaults: { ease: 'power3.out' },
        });

        tl.to(copyTargets, {
          opacity: 1,
          y: 0,
          duration: 0.5,
          stagger: 0.035,
        });

        if (media) {
          tl.to(
            media,
            { opacity: 1, duration: 0.45 },
            0.08,
          );
          tl.to(
            scale || media,
            {
              scale: 1,
              clipPath: 'inset(0% 0% 0% 0%)',
              duration: 0.55,
            },
            0.08,
          );
        }

        if (chips.length > 0) {
          tl.fromTo(
            chips,
            { opacity: 0.4 },
            { opacity: 1, stagger: 0.03, duration: 0.28 },
            0.22,
          );
        }
      },
    });
  });
}
