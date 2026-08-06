import { prefersReducedMotion } from '@/lib/motion-prefs';
import type { HeroCarouselProject } from '@/types/hero-carousel';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';

type Props = {
  projects: HeroCarouselProject[];
  sizes: string;
};

/** px por frame a ~60fps — suave y legible */
const SPEED = 0.045;

function externalProps(project: HeroCarouselProject) {
  return project.external
    ? { target: '_blank' as const, rel: 'noopener noreferrer' }
    : {};
}

export default function HeroProjectCarousel({ projects, sizes }: Props) {
  const [reduceMotion] = useState(() => prefersReducedMotion());
  const wrapRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef(0);
  const velocityRef = useRef(0);
  const previousTimeRef = useRef(0);
  const rafRef = useRef(0);
  const setWidthRef = useRef(0);
  const draggingRef = useRef(false);
  const pausedRef = useRef(false);
  const inViewRef = useRef(true);
  const resumeTimerRef = useRef<number | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const dragStartXRef = useRef(0);
  const dragStartPositionRef = useRef(0);
  const lastPointerXRef = useRef(0);
  const lastPointerTimeRef = useRef(0);
  const draggedDistanceRef = useRef(0);

  const loopProjects = [...projects, ...projects];

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    setWidthRef.current = track.scrollWidth / 2;
  }, []);

  const applyTransform = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const width = setWidthRef.current;
    if (width > 0) {
      while (positionRef.current <= -width) positionRef.current += width;
      while (positionRef.current > 0) positionRef.current -= width;
    }
    track.style.transform = `translate3d(${positionRef.current}px, 0, 0)`;
  }, []);

  const pauseAutoplay = useCallback(() => {
    pausedRef.current = true;
    if (resumeTimerRef.current) {
      window.clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  }, []);

  const resumeAutoplaySoon = useCallback((delay = 900) => {
    if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = window.setTimeout(() => {
      pausedRef.current = false;
      resumeTimerRef.current = null;
    }, delay);
  }, []);

  useLayoutEffect(() => {
    measure();
    applyTransform();
  }, [applyTransform, measure, projects]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        inViewRef.current = Boolean(entry?.isIntersecting);
      },
      { threshold: 0.12 },
    );
    observer.observe(wrap);

    const onResize = () => {
      measure();
      applyTransform();
    };
    window.addEventListener('resize', onResize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, [applyTransform, measure]);

  useEffect(() => {
    if (reduceMotion || projects.length < 2) return;

    previousTimeRef.current = performance.now();

    const tick = (now: number) => {
      const delta = Math.min(now - previousTimeRef.current, 40);
      previousTimeRef.current = now;

      if (inViewRef.current && !document.hidden) {
        if (draggingRef.current) {
          // position updated in pointer handlers
        } else if (Math.abs(velocityRef.current) > 0.02) {
          positionRef.current += velocityRef.current * delta;
          velocityRef.current *= Math.pow(0.955, delta / 16.67);
          if (Math.abs(velocityRef.current) < 0.02) velocityRef.current = 0;
          applyTransform();
        } else if (!pausedRef.current) {
          positionRef.current -= SPEED * delta;
          applyTransform();
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current);
    };
  }, [applyTransform, projects.length, reduceMotion]);

  if (projects.length === 0) return null;

  if (reduceMotion) {
    return (
      <div
        ref={wrapRef}
        className="hero-marquee hero-marquee--static"
        aria-label="Proyectos web realizados"
      >
        <div className="hero-marquee__track">
          {projects.map((project, index) => {
            const style = {
              ['--carousel-fit']: project.fit ?? 'cover',
              ['--carousel-position']: project.position ?? 'top center',
            } as CSSProperties;

            return (
              <a
                key={project.id}
                href={project.href}
                className="hero-marquee__card"
                aria-label={`Ver proyecto ${project.name}`}
                style={style}
                {...externalProps(project)}
              >
                <img
                  src={project.imageSrc}
                  srcSet={project.imageSrcSet}
                  sizes={sizes}
                  width={project.imageWidth}
                  height={project.imageHeight}
                  alt={project.alt}
                  loading={index < 3 ? 'eager' : 'lazy'}
                  fetchPriority={index === 0 ? 'high' : 'auto'}
                  decoding="async"
                  draggable={false}
                />
                <span className="hero-marquee__label">{project.name}</span>
              </a>
            );
          })}
        </div>
      </div>
    );
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    draggingRef.current = true;
    pauseAutoplay();
    velocityRef.current = 0;
    pointerIdRef.current = event.pointerId;
    dragStartXRef.current = event.clientX;
    dragStartPositionRef.current = positionRef.current;
    lastPointerXRef.current = event.clientX;
    lastPointerTimeRef.current = performance.now();
    draggedDistanceRef.current = 0;
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.classList.add('is-dragging');
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current || pointerIdRef.current !== event.pointerId) return;
    const deltaX = event.clientX - dragStartXRef.current;
    draggedDistanceRef.current = Math.max(draggedDistanceRef.current, Math.abs(deltaX));
    positionRef.current = dragStartPositionRef.current + deltaX;

    const now = performance.now();
    const elapsed = Math.max(now - lastPointerTimeRef.current, 1);
    velocityRef.current = (event.clientX - lastPointerXRef.current) / elapsed;

    lastPointerXRef.current = event.clientX;
    lastPointerTimeRef.current = now;
    applyTransform();
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current || pointerIdRef.current !== event.pointerId) return;
    draggingRef.current = false;
    pointerIdRef.current = null;
    event.currentTarget.classList.remove('is-dragging');
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* noop */
    }
    resumeAutoplaySoon(1100);
  };

  const handleClickCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (draggedDistanceRef.current > 6) {
      event.preventDefault();
      event.stopPropagation();
      draggedDistanceRef.current = 0;
    }
  };

  return (
    <div
      ref={wrapRef}
      className="hero-marquee"
      aria-label="Carrusel de proyectos web realizados"
      onMouseEnter={pauseAutoplay}
      onMouseLeave={() => resumeAutoplaySoon(400)}
      onFocusCapture={pauseAutoplay}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          resumeAutoplaySoon(600);
        }
      }}
    >
      <div
        ref={trackRef}
        className="hero-marquee__track"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClickCapture={handleClickCapture}
      >
        {loopProjects.map((project, index) => {
          const isClone = index >= projects.length;
          const style = {
            ['--carousel-fit']: project.fit ?? 'cover',
            ['--carousel-position']: project.position ?? 'top center',
          } as CSSProperties;

          return (
            <a
              key={`${project.id}-${index}`}
              href={project.href}
              className="hero-marquee__card"
              aria-label={isClone ? undefined : `Ver proyecto ${project.name}`}
              aria-hidden={isClone ? true : undefined}
              tabIndex={isClone ? -1 : undefined}
              style={style}
              {...externalProps(project)}
            >
              <img
                src={project.imageSrc}
                srcSet={project.imageSrcSet}
                sizes={sizes}
                width={project.imageWidth}
                height={project.imageHeight}
                alt={isClone ? '' : project.alt}
                loading={index < 3 ? 'eager' : 'lazy'}
                fetchPriority={index === 0 ? 'high' : 'auto'}
                decoding="async"
                draggable={false}
              />
              <span className="hero-marquee__label">{project.name}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
