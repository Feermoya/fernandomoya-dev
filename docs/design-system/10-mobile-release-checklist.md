# Cierre del rediseño mobile — QA y lanzamiento

## Implementado
- Home mobile estática con Astro y nuevo lenguaje visual.
- Galería mobile desde Content Collections.
- Fichas de casos de estudio mobile.
- Servicios y contacto mobile.
- Shell visual y navegación inferior con safe area.
- React/GSAP de Hero y motion de casos reservados para desktop.
- Tokens compartidos y reducción de CSS duplicado.

## Validaciones automáticas
El workflow `.github/workflows/portfolio-quality.yml` ejecuta `npm ci`, `npm run typecheck`, `npm test` y `npm run build` en push a main y PR.
**No marcar como aprobadas hasta ver los resultados de GitHub Actions.**

## QA manual — pendiente
- [ ] iPhone Safari: 320, 375, 390 y 430 px.
- [ ] Android Chrome: 360 y 412 px.
- [ ] Sin scroll horizontal ni texto cortado.
- [ ] Header, menú, anclas, tabbar, scroll y safe area.
- [ ] Acceso a proyectos, enlace externo y regreso a Home.
- [ ] WhatsApp, email y navegación por teclado.
- [ ] Comprobar con JS deshabilitado y movimiento reducido.
- [ ] Confirmar desktop >=768px y rutas privadas sin regresiones.
- [ ] Lighthouse mobile y Core Web Vitals reales.

## Criterio de cierre
Despliegue Vercel correcto + GitHub Actions verde + QA manual completado. Un deploy correcto **no** equivale a pruebas aprobadas.

## Nota técnica
La versión editorial desktop permanece en el DOM y parte de su CSS/JS sigue coexistiendo. No eliminar componentes legacy sin revisión visual y de SEO. Los cambios posteriores deben corregir defectos observados, no agregar overrides sin depuración.
