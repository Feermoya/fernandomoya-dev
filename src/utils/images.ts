import type { ImageMetadata } from 'astro';

const projectCovers = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/projects/*.{png,jpg,jpeg,webp,svg}',
  { eager: true },
);

const caseStudyCovers = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/case-studies/*.{png,jpg,jpeg,webp,svg}',
  { eager: true },
);

function findCoverByBasename(
  covers: Record<string, { default: ImageMetadata }>,
  filename: string,
): ImageMetadata | undefined {
  const want = filename.trim();
  const entry = Object.entries(covers).find(([path]) => {
    const base = path.split('/').pop() ?? '';
    return base === want || base.toLowerCase() === want.toLowerCase();
  });
  return entry?.[1]?.default;
}

/**
 * Resuelve la portada por nombre de archivo del frontmatter.
 * Prioriza `src/assets/case-studies/` sobre `src/assets/projects/`.
 */
export function getProjectCover(filename: string): ImageMetadata | undefined {
  return (
    findCoverByBasename(caseStudyCovers, filename) ??
    findCoverByBasename(projectCovers, filename)
  );
}
