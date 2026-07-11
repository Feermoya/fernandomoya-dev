import FeaturedProject, { type FeaturedProjectData } from '@/components/react/FeaturedProject';

export type ArchiveProjectData = {
  id: string;
  number: string;
  label: string;
  projectType: string;
  year: number;
  live: string;
};

type Props = {
  featured: FeaturedProjectData[];
  archive: ArchiveProjectData[];
};

export default function FeaturedProjects({ featured, archive }: Props) {
  return (
    <>
      <div className="featured-projects">
        {featured.map((project) => (
          <FeaturedProject key={project.id} project={project} />
        ))}
      </div>

      <div className="projects-archive">
        <div className="container-page projects-archive__inner">
          <h3 className="projects-archive__title">Más trabajo</h3>
          <ol className="projects-archive__list">
            {archive.map((item) => (
              <li key={item.id} className="projects-archive__item">
                <a
                  href={item.live}
                  className="projects-archive__row"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="projects-archive__number" aria-hidden="true">
                    {item.number}
                  </span>
                  <span className="projects-archive__label">{item.label}</span>
                  <span className="projects-archive__meta">
                    <span className="projects-archive__type">{item.projectType}</span>
                    <span className="projects-archive__year">{item.year}</span>
                  </span>
                  <span className="projects-archive__arrow" aria-hidden="true">
                    →
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </>
  );
}
