import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Colección `projects` (Astro 6): loader `glob` + esquema Zod.
 * Slug = nombre del archivo (`hema.md` → ancla `#proyecto-hema` en la landing).
 */
const projects = defineCollection({
  loader: glob({ base: 'src/content/projects', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishDate: z.coerce.date(),
    /** `client` = trabajo para terceros · `own` = proyecto personal. */
    kind: z.enum(['client', 'own']),
    /** Etiqueta corta de tipo: “Sitio corporativo”, “Marca personal”, etc. */
    projectType: z.string(),
    /** Tecnologías o capas relevantes (editable cuando definas el stack real). */
    stack: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    order: z.number().default(0),
    /** Archivo en `src/assets/projects/` (placeholders `.svg` hasta capturas reales). */
    cover: z.string(),
    /** Nombre del cliente u organización (solo si aplica). */
    client: z.string().optional(),
    links: z.object({
      live: z.string().url(),
      repo: z.string().url().optional(),
    }),
  }),
});

export const collections = { projects };
