import type { ImageMetadata } from 'astro';

const covers = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/projects/*.{png,jpg,jpeg,webp,svg}',
  { eager: true },
);

/**
 * Resuelve la portada de un proyecto por nombre de archivo declarado en el frontmatter.
 */
export function getProjectCover(filename: string): ImageMetadata | undefined {
  const entry = Object.entries(covers).find(([path]) => path.endsWith(`/${filename}`));
  return entry?.[1]?.default;
}
