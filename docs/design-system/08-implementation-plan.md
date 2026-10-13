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
