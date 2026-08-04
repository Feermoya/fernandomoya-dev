import ProjectWindow, { type ProjectWindowData } from '@/components/react/ProjectWindow';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReducedMotion } from 'motion/react';
import { useLayoutEffect, useRef } from 'react';

gsap.registerPlugin(ScrollTrigger);

export type HeroProject = ProjectWindowData & {
  slotClass: string;
  depth: number;
};

type Props = {
  projects: HeroProject[];
};

const TITLE_LINES = [
  'Diseño webs que',
  'hacen ver mejor',
  'a tu negocio.',
] as const;

function isMobileViewport(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
}

export default function HeroShowcase({ projects }: Props) {
  const reduceMotion = useReducedMotion();
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
    const parallaxLayers = parallaxRefs.current.filter(Boolean) as HTMLDivElement[];
    const titleLineEls = titleRef.current
      ? ([...titleRef.current.querySelectorAll('.hero-editorial__title-line')] as HTMLElement[])
      : [];
    const eyebrow = eyebrowRef.current;
    const lead = leadRef.current;
    const actions = actionsRef.current;
    const meta = metaRef.current;

    if (reduceMotion) {
      gsap.set([copy, stage, eyebrow, ...titleLineEls, lead, actions, meta, ...slots], {
        clearProps: 'all',
        opacity: 1,
        y: 0,
        scale: 1,
        x: 0,
      });
      parallaxLayers.forEach((layer) => {
        layer.style.transform = 'translate3d(0,0,0)';
      });
      return;
    }

    const mobile = isMobileViewport();
    const centerIndex = projects.findIndex((p) => p.slotClass.includes('hema'));
    const centerSlot = centerIndex >= 0 ? slots[centerIndex] : slots[0];
    const sideSlots = slots.filter((_, i) => i !== centerIndex);
    // Si la hidratación llegó tarde (client:idle), no ocultar el SSR: evita flash.
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
        gsap.set(stage, { opacity: 0, scale: 0.97 });
        gsap.set([eyebrow, titleLineEls, lead, actions, meta], { opacity: 0, y: 16 });
        gsap.set(centerSlot, { opacity: 0, y: 48, scale: 0.94 });
        gsap.set(sideSlots, { opacity: 0, y: 36, scale: 0.96 });

        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

        tl.to(stage, { opacity: 1, scale: 1, duration: 0.4 }, 0)
          .to(centerSlot, { opacity: 1, y: 0, scale: 1, duration: 0.5 }, 0.12)
          .to(sideSlots, { opacity: 1, y: 0, scale: 1, duration: 0.4, stagger: 0.08 }, 0.28)
          .to(eyebrow, { opacity: 1, y: 0, duration: 0.32 }, 0.42)
          .to(titleLineEls, { opacity: 1, y: 0, duration: 0.4, stagger: 0.06 }, 0.52)
          .to(lead, { opacity: 1, y: 0, duration: 0.35 }, 0.78)
          .to(actions, { opacity: 1, y: 0, duration: 0.32 }, 0.9)
          .to(meta, { opacity: 1, y: 0, duration: 0.3 }, 1.0);
      }

      if (!mobile) {
        ScrollTrigger.create({
          trigger: section,
          start: 'top top',
          end: 'bottom top+=140',
          scrub: 0.55,
          onUpdate: (self) => {
            const p = self.progress;
            gsap.set(stage, { y: -p * 20 });
            gsap.set(copy, { opacity: Math.max(0.8, 1 - p * 0.2) });
            slots.forEach((slot, index) => {
              const spread = (index - 1) * p * 8;
              gsap.set(slot, { x: spread, y: -p * Math.min(10, 6 + index * 2) });
            });
          },
        });
      }
    }, section);

    return () => ctx.revert();
  }, [projects, reduceMotion]);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section || reduceMotion || isMobileViewport()) return;

    const parallaxLayers = parallaxRefs.current.filter(Boolean) as HTMLDivElement[];
    if (parallaxLayers.length === 0) return;

    const maxShift = [6, 10, 8];
    const maxRotate = [0.35, 0.7, 0.55];

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
        const factor = depth === 0 ? 0.35 : depth === 1 ? 0.75 : 1;
        const tx = currentX * maxShift[index] * factor;
        const ty = currentY * maxShift[index] * factor;
        const rot = currentX * maxRotate[index] * factor;
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
            {TITLE_LINES.map((line, index) => (
              <span
                key={line}
                className={`hero-editorial__title-line ${
                  index === 1 ? 'hero-editorial__title-line--accent' : ''
                }`}
              >
                {line}
              </span>
            ))}
          </h1>
          <p ref={leadRef} className="hero-editorial__lead">
            Creo sitios claros, rápidos y fáciles de usar para empresas, profesionales y marcas que
            necesitan mostrarse mejor.
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
