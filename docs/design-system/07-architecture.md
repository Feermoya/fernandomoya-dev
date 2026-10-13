# 07 · Arquitectura

## Alcance
Portfolio público. No alterar `src/pages/foco-financiero.astro`, `src/pages/panel/**`, `src/pages/admin.astro`, APIs, auth, Supabase ni landings externas al alcance.

## Inventario inicial
- `src/pages/index.astro`: Hero, ProjectsSection, SeoImpactSection, BrandWorkSection, HomeAbout, HomeContactSection.
- `src/pages/proyectos/[id].astro`: detalle de proyectos.
- `src/content/projects/*.md`: fuente de datos.
- `src/assets/projects/`: capturas reales.
- `src/layouts/Layout.astro`: layout compartido.
- `src/components/sections/`, `src/components/layout/`: secciones y shell.
- Astro, React, Tailwind, GSAP, Motion, Lenis: evitar sumar librerías sin motivo.

## Guía técnica
- Tokens con prefijo `--fm-*` y scope `.fm-portfolio`.
- No sobrescribir CSS global sin auditar otras vistas.
- Content Collections como única fuente de datos. No replicar listados en React.
- Astro semántico para contenido estático, React hidratado para filtros y galerías funcionales.
- `astro:assets` y responsive images.
- No crear un router nuevo, PWA extra ni sistema de animaciones paralelo.
- Componentes pequeños y sin valores arbitrarios repetidos.
- Limpiar código muerto solo tras confirmar ausencia de usos.
- Mantener SEO, canonical, JSON-LD, sitemap y rutas.
