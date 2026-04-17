import type { ImageMetadata } from 'astro';

const covers = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/projects/*.{png,jpg,jpeg,webp,svg}',
  { eager: true },
);

/**
 * Resuelve la portada por nombre de archivo del frontmatter.
 * Compara por nombre de archivo (basename) para evitar fallos con rutas/casing del glob de Vite.
 */
export function getProjectCover(filename: string): ImageMetadata | undefined {
  const want = filename.trim();
  const entry = Object.entries(covers).find(([path]) => {
    const base = path.split('/').pop() ?? '';
    return base === want || base.toLowerCase() === want.toLowerCase();
  });
  return entry?.[1]?.default;
}
