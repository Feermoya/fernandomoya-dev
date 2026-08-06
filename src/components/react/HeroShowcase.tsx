import HeroClientRail from '@/components/react/HeroClientRail';
import HeroProjectCarousel from '@/components/react/HeroProjectCarousel';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { prefersReducedMotion } from '@/lib/motion-prefs';
import type { HeroCarouselProject } from '@/types/hero-carousel';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const CARDS_QUERY = '(min-width: 768px)';

type Props = {
  projects: HeroCarouselProject[];
  sizes: string;
};

export default function HeroShowcase({ projects, sizes }: Props) {
  const [reduceMotion] = useState(() => prefersReducedMotion());
  /**
   * Las capturas solo existen en el DOM donde se pueden leer. En teléfonos nunca
   * se montan, así que tampoco se descargan.
   */
  const [showCards, setShowCards] = useState(false);

  const sectionRef = useRef<HTMLElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const eyebrowRef = useRef<HTMLParagraphElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const statementRef = useRef<HTMLParagraphElement>(null);
  const leadRef = useRef<HTMLParagraphElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const metaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = window.matchMedia(CARDS_QUERY);
    const sync = () => setShowCards(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const copy = copyRef.current;
    const stage = stageRef.current;
    if (!section || !copy || !stage) return;

    const titleLineEls = titleRef.current
      ? ([...titleRef.current.querySelectorAll('.hero-editorial__title-line')] as HTMLElement[])
      : [];
    const eyebrow = eyebrowRef.current;
    const statement = statementRef.current;
    const lead = leadRef.current;
    const actions = actionsRef.current;
    const meta = metaRef.current;
    const mobile = window.matchMedia('(max-width: 767px)').matches;

    if (reduceMotion) {
      gsap.set(
        [copy, stage, eyebrow, ...titleLineEls, statement, lead, actions, meta],
        {
          clearProps: 'all',
          opacity: 1,
          y: 0,
          scale: 1,
        },
      );
      return;
    }

    const skipEntrance = typeof performance !== 'undefined' && performance.now() > 900;

    const ctx = gsap.context(() => {
      gsap.set(copy, { opacity: 1 });

      if (skipEntrance) {
        gsap.set([stage, eyebrow, ...titleLineEls, statement, lead, actions, meta], {
          opacity: 1,
          y: 0,
          scale: 1,
        });
      } else {
        const yShift = mobile ? 10 : 12;
        gsap.set(eyebrow, { opacity: 0, y: yShift });
        gsap.set(titleLineEls, { opacity: 0, y: yShift });
        gsap.set([statement, lead, actions, meta], { opacity: 0, y: yShift });
        gsap.set(stage, { opacity: 0, scale: 0.985, y: 18 });

        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

        tl.to(eyebrow, { opacity: 1, y: 0, duration: 0.32 }, 0)
          .to(titleLineEls, { opacity: 1, y: 0, duration: 0.38, stagger: 0.05 }, 0.06)
          .to(statement, { opacity: 1, y: 0, duration: 0.32 }, 0.24)
          .to(lead, { opacity: 1, y: 0, duration: 0.32 }, 0.32)
          .to(actions, { opacity: 1, y: 0, duration: 0.28 }, 0.4)
          .to(meta, { opacity: 1, y: 0, duration: 0.26 }, 0.48)
          .to(stage, { opacity: 1, scale: 1, y: 0, duration: 0.5 }, 0.2);
      }

      if (!mobile) {
        ScrollTrigger.create({
          trigger: section,
          start: 'top top',
          end: 'bottom top+=120',
          scrub: 0.45,
          onUpdate: (self) => {
            const p = self.progress;
            gsap.set(stage, { y: -p * 16 });
            gsap.set(copy, { opacity: Math.max(0.9, 1 - p * 0.1) });
          },
        });
      }
    }, section);

    return () => ctx.revert();
  }, [reduceMotion]);

  return (
    <section
      ref={sectionRef}
      id="inicio"
      className="hero-editorial"
      aria-labelledby="hero-heading"
    >
      <div className="container-page hero-editorial__inner">
        <div ref={copyRef} className="hero-editorial__copy">
          <p ref={eyebrowRef} className="hero-editorial__eyebrow">
            <span aria-hidden="true" />
            DISEÑO Y DESARROLLO WEB · MENDOZA
          </p>
          <h1 ref={titleRef} id="hero-heading" className="hero-editorial__title">
            <span className="hero-editorial__title-line">Diseño webs</span>
            <span className="hero-editorial__title-line">para negocios</span>
            <span className="hero-editorial__title-line">que quieren&nbsp;crecer.</span>
          </h1>
          <p ref={statementRef} className="hero-editorial__statement">
            Tu web se ve bien y igual no vende.
          </p>
          <p ref={leadRef} className="hero-editorial__lead">
            Diseño y desarrollo sitios para negocios que necesitan explicar qué hacen, generar
            confianza y convertir visitas en consultas.
          </p>
          <div ref={actionsRef} className="hero-editorial__actions">
            <a href="#proyectos" className="hero-editorial__cta hero-editorial__cta--primary">
              Ver proyectos
            </a>
            <a href="#contacto" className="hero-editorial__cta hero-editorial__cta--secondary">
              Contame tu idea
            </a>
          </div>
          <div ref={metaRef} className="hero-editorial__meta">
            <span className="hero-editorial__status-dot" aria-hidden="true" />
            <span>Disponible para nuevos proyectos</span>
            <span>Mendoza, Argentina</span>
          </div>
        </div>

        <div
          ref={stageRef}
          className="hero-editorial__stage"
          data-mode={showCards ? 'cards' : 'rail'}
        >
          {showCards ? <HeroProjectCarousel projects={projects} sizes={sizes} /> : null}
          <HeroClientRail projects={projects} />
        </div>
      </div>
    </section>
  );
}
