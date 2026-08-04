import ProjectWindow, { type ProjectWindowData } from '@/components/react/ProjectWindow';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { canUsePointerParallax, prefersReducedMotion } from '@/lib/motion-prefs';
import { useLayoutEffect, useRef, useState } from 'react';

export type HeroProject = ProjectWindowData & {
  slotClass: string;
  depth: number;
};

type Props = {
  projects: HeroProject[];
};

export default function HeroShowcase({ projects }: Props) {
  const [reduceMotion] = useState(() => prefersReducedMotion());
  const sectionRef = useRef<HTMLElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const eyebrowRef = useRef<HTMLParagraphElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const leadRef = useRef<HTMLParagraphElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const metaRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const parallaxRefs = useRef<(HTMLDivElement | null)[]>([]);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const copy = copyRef.current;
    const stage = stageRef.current;
    if (!section || !copy || !stage) return;

    const slots = slotRefs.current.filter(Boolean) as HTMLDivElement[];
    const titleLineEls = titleRef.current
      ? ([...titleRef.current.querySelectorAll('.hero-editorial__title-line')] as HTMLElement[])
      : [];
    const eyebrow = eyebrowRef.current;
    const lead = leadRef.current;
    const actions = actionsRef.current;
    const meta = metaRef.current;
    const mobile = window.matchMedia('(max-width: 767px)').matches;

    if (reduceMotion) {
      gsap.set([copy, stage, eyebrow, ...titleLineEls, lead, actions, meta, ...slots], {
        clearProps: 'all',
        opacity: 1,
        y: 0,
        scale: 1,
        x: 0,
      });
      return;
    }

    const centerIndex = projects.findIndex((p) => p.slotClass.includes('hema'));
    const centerSlot = centerIndex >= 0 ? slots[centerIndex] : slots[0];
    const sideSlots = slots.filter((_, i) => i !== centerIndex);
    const skipEntrance = typeof performance !== 'undefined' && performance.now() > 900;

    const ctx = gsap.context(() => {
      gsap.set(copy, { opacity: 1 });

      if (skipEntrance) {
        gsap.set([stage, eyebrow, ...titleLineEls, lead, actions, meta, ...slots], {
          opacity: 1,
          y: 0,
          scale: 1,
        });
      } else {
        const yShift = mobile ? 10 : 12;
        gsap.set(eyebrow, { opacity: 0, y: yShift });
        gsap.set(titleLineEls, { opacity: 0, y: yShift });
        gsap.set([lead, actions, meta], { opacity: 0, y: yShift });
        gsap.set(slots, { opacity: 0, scale: 0.985, y: 16 });

        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

        tl.to(eyebrow, { opacity: 1, y: 0, duration: 0.32 }, 0)
          .to(titleLineEls, { opacity: 1, y: 0, duration: 0.38, stagger: 0.06 }, 0.06)
          .to(lead, { opacity: 1, y: 0, duration: 0.32 }, 0.28)
          .to(actions, { opacity: 1, y: 0, duration: 0.28 }, 0.38)
          .to(meta, { opacity: 1, y: 0, duration: 0.26 }, 0.46)
          .to(centerSlot, { opacity: 1, scale: 1, y: 0, duration: 0.42 }, 0.22)
          .to(sideSlots, { opacity: 1, scale: 1, y: 0, duration: 0.38, stagger: 0.05 }, 0.34);
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
            slots.forEach((slot, index) => {
              const spread = (index - 1) * p * 6;
              gsap.set(slot, { x: spread });
            });
          },
        });
      }
    }, section);

    return () => ctx.revert();
  }, [projects, reduceMotion]);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section || reduceMotion || !canUsePointerParallax()) return;

    const parallaxLayers = parallaxRefs.current.filter(Boolean) as HTMLDivElement[];
    if (parallaxLayers.length === 0) return;

    const maxShift = 6;
    const maxRotate = 0.4;

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let rafId = 0;

    const tick = () => {
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;

      parallaxLayers.forEach((layer, index) => {
        const depth = projects[index]?.depth ?? 1;
        const factor = depth === 0 ? 0.35 : depth === 1 ? 0.7 : 1;
        const tx = currentX * maxShift * factor;
        const ty = currentY * maxShift * factor;
        const rot = currentX * maxRotate * factor;
        layer.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) rotate(${rot.toFixed(3)}deg)`;
      });

      const stillMoving =
        Math.abs(targetX - currentX) > 0.002 || Math.abs(targetY - currentY) > 0.002;

      if (stillMoving) {
        rafId = requestAnimationFrame(tick);
      } else {
        rafId = 0;
      }
    };

    const onMove = (event: PointerEvent) => {
      const rect = section.getBoundingClientRect();
      const nx = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      const ny = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
      targetX = Math.max(-1, Math.min(1, nx));
      targetY = Math.max(-1, Math.min(1, ny));
      if (!rafId) rafId = requestAnimationFrame(tick);
    };

    const onLeave = () => {
      targetX = 0;
      targetY = 0;
      if (!rafId) rafId = requestAnimationFrame(tick);
    };

    section.addEventListener('pointermove', onMove, { passive: true });
    section.addEventListener('pointerleave', onLeave);

    return () => {
      section.removeEventListener('pointermove', onMove);
      section.removeEventListener('pointerleave', onLeave);
      if (rafId) cancelAnimationFrame(rafId);
      parallaxLayers.forEach((layer) => {
        layer.style.transform = 'translate3d(0,0,0)';
      });
    };
  }, [projects, reduceMotion]);

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
            DISEÑO + DESARROLLO WEB · MENDOZA
          </p>
          <h1 ref={titleRef} id="hero-heading" className="hero-editorial__title">
            <span className="hero-editorial__title-line">Diseño webs</span>
            <span className="hero-editorial__title-line">
              que hacen <em>ver mejor</em>
            </span>
            <span className="hero-editorial__title-line">tu negocio.</span>
          </h1>
          <p ref={leadRef} className="hero-editorial__lead">
            Diseño webs para negocios que necesitan verse bien y, sobre todo, que la gente
            entienda qué hacen apenas entra.
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
            <span className="hero-editorial__meta-separator" aria-hidden="true">
              ·
            </span>
            <span>Mendoza, Argentina</span>
          </div>
        </div>

        <div
          ref={stageRef}
          className="hero-editorial__stage"
          aria-label="Selección de proyectos web realizados"
        >
          {projects.map((project, index) => (
            <div
              key={project.name}
              className={`hero-editorial__window-slot ${project.slotClass}`}
            >
              <div
                ref={(node) => {
                  slotRefs.current[index] = node;
                }}
                className="hero-editorial__window-motion"
              >
                <div
                  ref={(node) => {
                    parallaxRefs.current[index] = node;
                  }}
                  className="hero-editorial__window-parallax"
                >
                  <ProjectWindow {...project} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
