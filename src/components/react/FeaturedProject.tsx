import ProjectShowcaseWindow from '@/components/react/ProjectShowcaseWindow';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReducedMotion } from 'motion/react';
import { useLayoutEffect, useRef } from 'react';

gsap.registerPlugin(ScrollTrigger);

export type FeaturedProjectData = {
  id: string;
  number: string;
  client: string;
  listLabel: string;

  category: string;
  headline: string;
  summary: string;

  challengeLabel: string;
  challenge: string;

  solutionLabel: string;
  solution: string;

  highlights: string[];

  domain: string;
  live: string;
  caseUrl: string;

  coverSrc: string;
  coverSrcSet?: string;
  coverWidth: number;
  coverHeight: number;
  alt: string;

  theme: 'avellaneda' | 'mendoza' | 'giacomelli' | 'hema';
  mediaPosition: 'left' | 'right';
};

type Props = {
  project: FeaturedProjectData;
};

export default function FeaturedProject({ project }: Props) {
  const reduceMotion = useReducedMotion();
  const rootRef = useRef<HTMLElement>(null);
  const numberRef = useRef<HTMLSpanElement>(null);
  const copyItemsRef = useRef<HTMLDivElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const number = numberRef.current;
    const copyItems = copyItemsRef.current;
    const reveal = revealRef.current;
    const scale = scaleRef.current;
    if (!root || !number || !copyItems || !reveal || !scale) return;

    const copyTargets = copyItems.querySelectorAll('[data-featured-copy]');

    if (reduceMotion) {
      gsap.set([number, copyTargets, reveal, scale], {
        clearProps: 'all',
        opacity: 1,
        y: 0,
        scale: 1,
        clipPath: 'none',
      });
      return;
    }

    gsap.set(number, { opacity: 0 });
    gsap.set(copyTargets, { opacity: 0, y: 18 });
    gsap.set(reveal, { clipPath: 'inset(8% 0% 8% 0%)', opacity: 0 });
    gsap.set(scale, { scale: 1.025 });

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: root,
        start: 'top 78%',
        once: true,
        onEnter: () => {
          const tl = gsap.timeline({
            defaults: {
              ease: 'power3.out',
            },
          });

          tl.to(number, {
            opacity: 1,
            duration: 0.4,
          })
            .to(
              copyTargets,
              {
                opacity: 1,
                y: 0,
                duration: 0.55,
                stagger: 0.065,
              },
              '-=0.25',
            )
            .to(
              reveal,
              {
                clipPath: 'inset(0% 0% 0% 0%)',
                opacity: 1,
                duration: 0.75,
              },
              '-=0.65',
            )
            .to(
              scale,
              {
                scale: 1,
                duration: 0.75,
              },
              '<',
            );
        },
      });
    }, root);

    return () => ctx.revert();
  }, [reduceMotion, project.id]);

  const mediaLeft = project.mediaPosition === 'left';

  return (
    <article
      ref={rootRef}
      className={`featured-project featured-project--${project.theme}${mediaLeft ? ' featured-project--media-left' : ''}`}
      aria-labelledby={`featured-project-${project.id}`}
    >
      <div className="featured-project__inner container-page">
        <div className="featured-project__grid">
          <div ref={copyItemsRef} className="featured-project__copy">
            <div className="featured-project__topline" data-featured-copy>
              <span ref={numberRef} className="featured-project__number" aria-hidden="true">
                {project.number}
              </span>
              <span className="featured-project__category">{project.category}</span>
            </div>

            <h3 id={`featured-project-${project.id}`} className="featured-project__name" data-featured-copy>
              {project.listLabel}
            </h3>

            <p className="featured-project__headline" data-featured-copy>
              {project.headline}
            </p>

            <p className="featured-project__summary" data-featured-copy>
              {project.summary}
            </p>

            <div className="featured-project__details" data-featured-copy>
              <div className="featured-project__detail">
                <span className="featured-project__detail-label">{project.challengeLabel}</span>
                <p>{project.challenge}</p>
              </div>

              <div className="featured-project__detail">
                <span className="featured-project__detail-label">{project.solutionLabel}</span>
                <p>{project.solution}</p>
              </div>
            </div>

            <ul
              className="featured-project__highlights"
              aria-label={`Características del proyecto ${project.client}`}
              data-featured-copy
            >
              {project.highlights.map((highlight) => (
                <li key={highlight}>{highlight}</li>
              ))}
            </ul>

            <div className="featured-project__links" data-featured-copy>
              <a href={project.caseUrl} className="featured-project__cta">
                Ver caso completo
                <span aria-hidden="true">→</span>
              </a>

              <a
                href={project.live}
                className="featured-project__site-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                Visitar sitio
                <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>

          <div className="featured-project__media">
            <div ref={revealRef} className="featured-project__reveal">
              <div ref={scaleRef} className="featured-project__scale">
                <ProjectShowcaseWindow
                  name={project.client}
                  domain={project.domain}
                  imageSrc={project.coverSrc}
                  imageSrcSet={project.coverSrcSet}
                  imageWidth={project.coverWidth}
                  imageHeight={project.coverHeight}
                  alt={project.alt}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
