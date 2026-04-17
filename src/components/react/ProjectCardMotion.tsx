import { motion, useReducedMotion } from 'motion/react';

export type ProjectKind = 'client' | 'own';

export type ProjectCardData = {
  id: string;
  title: string;
  description: string;
  projectType: string;
  coverSrc: string | null;
  live: string;
  kindLabel: string;
  kind: ProjectKind;
};

/** Hover: solo transform en Motion; sombra/borde vía CSS (evita animar box-shadow). */
const hoverLift = { y: -4 };

type Props = {
  project: ProjectCardData;
};

export default function ProjectCardMotion({ project }: Props) {
  const reduce = useReducedMotion();
  const p = project;
  const badgeClass =
    p.kind === 'client'
      ? 'pill-project-client absolute left-2 top-2 z-[2] rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide'
      : 'pill-project-own absolute left-2 top-2 z-[2] rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide';

  return (
    <motion.article
      id={`proyecto-${p.id}`}
      className="project-card-hover glass-panel group flex min-h-0 flex-col overflow-hidden rounded-xl transition-[border-color,box-shadow] duration-200 ease-out"
      whileHover={reduce ? undefined : hoverLift}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <div className="project-card-media relative h-[5.5rem] shrink-0 overflow-hidden bg-surface-2 sm:h-[6.25rem]">
        {p.coverSrc ? (
          <img
            src={p.coverSrc}
            alt={p.title}
            width={960}
            height={400}
            loading="lazy"
            decoding="async"
            className="relative z-0 h-full w-full object-cover transition-transform duration-300 ease-out motion-reduce:transition-none motion-reduce:group-hover:scale-100 group-hover:scale-[1.03] will-change-transform"
            sizes="(min-width: 1280px) 18vw, (min-width: 640px) 33vw, 50vw"
          />
        ) : (
          <div className="relative z-0 flex h-full w-full items-center justify-center text-[10px] text-muted">Sin imagen</div>
        )}
        <span className={badgeClass}>{p.kindLabel}</span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-3 pb-2 pt-2.5">
        <p className="text-[10px] leading-tight text-muted">{p.projectType}</p>
        <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug tracking-tight text-text">{p.title}</h3>
        <p className="mt-1.5 line-clamp-3 text-[11px] leading-relaxed text-muted">{p.description}</p>
      </div>

      <div className="mt-auto border-t border-white/[0.1] bg-white/[0.04] px-3 py-2">
        <a
          href={p.live}
          target="_blank"
          rel="noopener noreferrer"
          className="group/live inline-flex w-full items-center justify-center gap-1 rounded-md border border-transparent bg-accent/95 py-2 text-[11px] font-medium text-white shadow-sm transition-colors duration-200 ease-out hover:bg-accent-hover"
        >
          Ver sitio
          <span
            aria-hidden="true"
            className="inline-block opacity-75 transition-transform duration-200 ease-out will-change-transform group-hover/live:translate-x-[3px] group-hover/live:-translate-y-[3px]"
          >
            ↗
          </span>
        </a>
      </div>
    </motion.article>
  );
}
