# Portfolio (Astro 6)

Base de portfolio personal pensada para **carga rápida**, **poco JS** y un diseño **premium y legible**.

## Requisitos

- **Node.js ≥ 22.12** (Astro 6 lo exige). Con `nvm`: `nvm install 22 && nvm use 22`.

## Scripts

- `npm run dev` — desarrollo
- `npm run build` — build estático
- `npm run preview` — preview del build

## Organización

- `src/layouts/Layout.astro` — layout global, SEO base, `ClientRouter` (view transitions), header/footer.
- `src/components/layout/` — cabecera, pie, Motion One (mínimo).
- `src/components/ui/` — piezas pequeñas reutilizables (panel “glass”, botón enlace).
- `src/components/sections/` — secciones de página (hero, destacados).
- `src/components/project/` — tarjeta y meta de proyecto.
- `src/pages/` — rutas (`/`, `/projects`, `/projects/[slug]`, `/about`, `/contact`, `404`).
- `src/content.config.ts` — definición de colecciones (Astro 6: loader `glob` + Zod).
- `src/content/projects/` — entradas Markdown (un archivo = un proyecto).
- `src/assets/projects/` — portadas referenciadas por nombre de archivo en el frontmatter.
- `src/data/site.ts` — nombre, URL, email, redes (SEO y footer).
- `src/styles/global.css` — Tailwind v4 + tokens (`@theme`) + utilidades base.

## Proyectos (agregar sin tocar código de listados)

1. Añadí una portada en `src/assets/projects/` (mismo nombre que en `cover:` del frontmatter).
2. Creá `src/content/projects/mi-proyecto.md` con `kind` (`client` | `own`), `projectType`, `stack`, `links.live`, etc. (ver ejemplos).
3. El **id** (URL `/projects/...`) sale del **nombre del archivo** (`mi-proyecto.md` → `/projects/mi-proyecto`).
4. Placeholders de imagen: los `.svg` actuales se reemplazan por capturas reales cuando las tengas.

## Placeholders personales

- `src/data/site.ts` — email y LinkedIn (`PLACEHOLDER_*`).
- `src/data/placeholders.ts` — texto `PLACEHOLDER_BIO` y nota de foto.
- Bloques `PLACEHOLDER_*` en `HomeAbout.astro` (foto).

## Config que conviene ajustar primero

- `astro.config.mjs` → `site` (URL canónica + sitemap).
- `src/data/site.ts` → identidad, email, redes.
- `public/robots.txt` → dominio del sitemap (debe coincidir con `site`).

## Stack

- **Astro 6** (islas + HTML por defecto)
- **Tailwind CSS v4** vía `@tailwindcss/vite`
- **Motion One** (`@motionone/dom`) para un fade ligero en navegación
- **View Transitions** vía **`ClientRouter`** (`astro:transitions`, Astro 6)
- **@astrojs/sitemap** para `sitemap-index.xml`
- **`sharp`** (dev) para optimización de imágenes en build

## Notas de performance

- Prefetch de enlaces internos activado en `astro.config.mjs`.
- Imágenes con `astro:assets` + `width`/`height` + `sizes` donde aplica.
- Sin plugin de tipografía extra: estilos de markdown en `.article-content` (CSS liviano).
