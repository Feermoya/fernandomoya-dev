# 04 · Pantallas

## Inicio
Header compacto, presentación del desarrollador, titular sobre webs para negocios, dos CTAs, proyectos destacados accesibles rápidamente, servicios breves, sobre mí en pocas líneas, contacto y footer.

El Hero debe explicar el servicio sin scroll. No usar foto gigante ni un marco de teléfono en la UI real.

## Proyectos
Título simple, explicación breve, filtros solamente cuando sean útiles y trabajos reales desde Astro Content Collections. Priorizar legibilidad y portadas fieles. Ordenar destacados antes que otros.

## Detalle de proyecto
Volver, imagen grande proporcionada, nombre, categoría, resumen verificable, capacidades reales, CTA a web, galería solo si existen imágenes reales, conexión con otros proyectos. Conservar URL y metadatos.

## Servicios
Overline, titular «Soluciones web para cada necesidad», explicación breve y cards de: sitios web profesionales, catálogos de productos, plataformas personalizadas. Validar oferta real. CTA de contacto al final.

## Responsive
- 320–359: padding 16px y lectura sin desbordes.
- 360–430: referencia mobile prioritaria.
- 431–767: ancho fluido, sin imitar marco telefónico.
- 768–1023: transición tablet coherente.
- 1024+: preservar desktop durante la fase mobile.

No crear nuevas rutas por deducción de la maqueta; reutilizar Home, secciones y `/proyectos/[id]` existentes.
