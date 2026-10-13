# 08 · Plan de implementación

Una etapa por turno. Frenar y esperar aprobación manual.

## Etapa 0 · Auditoría sin edición
Inventario de rutas, componentes, estilos, SEO, datos, animaciones y riesgos. Entregar plan por archivo, sin modificar código.

## Etapa 1 · Foundations
Tokens, tipografía y primitivas visuales del portfolio, namespaced y sin romper desktop.

## Etapa 2 · Header y Hero
Header FM y Hero mobile con titular comercial claro, cuerpo y dos CTA. Proyectos accesibles con scroll corto.

## Etapa 3 · Portfolio
Tarjetas con imágenes reales y Content Collections. Filtros únicamente útiles y comprobados.

## Etapa 4 · Detalle
Refactorizar `/proyectos/[id]`: galería real, contenido condensado, visita externa, metadatos y enlaces conservados.

## Etapa 5 · Servicios, sobre mí y contacto
Cards de servicios, presentación corta, contacto directo, sin narración redundante.

## Etapa 6 · Interacciones
Feedback, swipe si conviene, foco, reduced motion, sin bloqueos de navegación.

## Etapa 7 · Limpieza y rendimiento
Eliminar código sin uso verificado, optimizar LCP, imágenes, hidratación y layouts.

## Etapa 8 · Calidad
Checks locales: `npm run typecheck`, `npm run build`, accesibilidad, SEO y revisión 320/375/390/430/768px y desktop.

## Entrega obligatoria
Archivos cambiados, motivos, posibles regresiones, controles visuales y próximo paso. No hacer deploy, push ni pruebas online automatizadas.

## Estado del trabajo (13/10/2026)

Se publicaron las siguientes etapas en `main`:
- Foundations y Hero mobile.
- Galería mobile con datos desde Content Collections.
- Detalles de proyectos mobile.
- Servicios y presentación comercial.
- Limpieza de secciones duplicadas, recuperación de anclas y corrección de visibilidad de resultados SEO y textos animados.

**Pendiente de validación:** no se ejecutó `npm run typecheck` ni `npm run build` debido a falta de acceso al entorno npm desde esta sesión. No se hizo inspección visual automatizada. El estado publicado no debe interpretarse como QA completado.

**Deuda técnica visible:** los componentes antiguos de Home/case studies permanecen en HTML para conservar la versión desktop, y parte de su JS continúa hidratándose en mobile. Una futura etapa debe reducir esa carga sin romper responsive, SEO ni funcionalidades.

## Optimización adicional

- Hero mobile renderizado mediante Astro sin hidratar el carrusel React/GSAP. El carrusel se hidrata únicamente a partir de 768px mediante `client:media`.
- Animación React en casos de estudio condicionada a ancho de pantalla de 768px o superior.
- Se conserva el ancla única `#inicio` en el contenedor del Hero.
- **Pendiente:** ejecutar checks y verificar visualmente; estas optimizaciones no constituyen prueba de rendimiento medida.

## Etapa de revisión: scripts por breakpoint
- `FeaturedProjectsList`: carga dinámica de animación GSAP solo a partir de 768px. Este contenido editorial está oculto en mobile.
- Vercel informó deployment exitoso del commit `51b6fb2a`; esto no sustituye pruebas locales de typecheck, tests, accesibilidad ni evaluación visual.
- La galería desktop y mobile aún coexisten en HTML para conservar ambas presentaciones: revisar impacto de HTML e imágenes antes de una refactorización estructural.

## Etapa de consolidación visual mobile (octubre 2026)
- Tokens comunes del shell de app centralizados en `portfolio-app-shell.css` para Home y detalles; se retiraron declaraciones repetidas del CSS del caso de estudio.
- Se consolidaron ajustes de barra inferior y header, y se retiraron sobrescrituras obsoletas del listado editorial que ya está oculto en mobile.
- **Pendiente de QA real:** `npm run typecheck`, `npm run build`, inspección visual 320/375/390/430 px, validación del encabezado, anclas, bottom nav y scroll con safe areas.
