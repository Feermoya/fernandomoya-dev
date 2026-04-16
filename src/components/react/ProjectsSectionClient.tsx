import { motion, useReducedMotion } from 'motion/react';
import ProjectCardMotion, { type ProjectCardData } from '@/components/react/ProjectCardMotion';
import { projectGridContainer, projectGridItem } from '@/components/react/motion-variants';
import { DURATION_ENTER, EASE_OUT_SOFT } from '@/motion/easing';

export type ProjectGroup = {
  title: string;
  items: ProjectCardData[];
};

type Props = {
  groups: ProjectGroup[];
};

const view = { once: true as const, margin: '-80px' as const };

export default function ProjectsSectionClient({ groups }: Props) {
  const reduce = useReducedMotion();

  return (
    <section
      id="proyectos"
      className="relative border-t border-white/[0.08] py-10 sm:py-12"
      aria-labelledby="projects-heading"
    >
      <div className="container-page">
        <motion.div
          className="flex flex-wrap items-end justify-between gap-4"
          initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={view}
          transition={{ duration: reduce ? 0 : DURATION_ENTER, ease: EASE_OUT_SOFT }}
        >
          <div className="max-w-lg">
            <p className="text-eyebrow">Selección</p>
            <h2 id="projects-heading" className="mt-1.5 text-xl font-semibold tracking-tight text-text sm:text-2xl">
              Proyectos
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Clientes y trabajo propio. Cada tarjeta abre el sitio en vivo.
            </p>
          </div>
        </motion.div>

        {groups.map((group) => (
          <div key={group.title} className="mt-8">
            <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{group.title}</h3>
            <motion.div
              className="mt-3 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4"
              variants={projectGridContainer}
              initial={reduce ? 'visible' : 'hidden'}
              whileInView="visible"
              viewport={view}
            >
              {group.items.map((item) => (
                <motion.div key={item.id} variants={projectGridItem} className="min-h-0">
                  <ProjectCardMotion project={item} />
                </motion.div>
              ))}
            </motion.div>
          </div>
        ))}
      </div>
    </section>
  );
}
