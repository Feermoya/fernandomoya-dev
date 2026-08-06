import type { HeroCarouselProject } from '@/types/hero-carousel';

type Props = {
  projects: HeroCarouselProject[];
};

/**
 * Prueba de trabajo para pantallas chicas: los dominios reales son legibles a 13px,
 * las capturas de sitios desktop no lo son.
 */
export default function HeroClientRail({ projects }: Props) {
  if (projects.length === 0) return null;

  return (
    <div className="hero-rail">
      <ul className="hero-rail__list" aria-label="Sitios publicados">
        {projects.map((project) => (
          <li key={project.id} className="hero-rail__item">
            <a
              className="hero-rail__link"
              href={project.href}
              aria-label={`${project.name} — ${project.domain}`}
              {...(project.external
                ? { target: '_blank' as const, rel: 'noopener noreferrer' }
                : {})}
            >
              {project.domain}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
