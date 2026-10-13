# 05 · Movimiento e interacciones

**Respuesta inmediata antes que decoración.**

| Elemento | Duración | Efecto |
|---|---|---|
| Botón | 120–160 ms | Color o transform discreto |
| Chip | 140–180 ms | Estado de color |
| Card | 160–200 ms | Elevación o translateY(-2px) en hover |
| Menú | 180–220 ms | Opacidad y desplazamiento mínimo |
| Swipe | Directo | Scroll-snap nativo cuando aplique |

- CSS para microinteracciones simples; JS cuando haya comportamiento real.
- Soportar prefers-reduced-motion.
- Evitar Lenis en mobile si afecta desplazamiento nativo.
- Sin autoavance compulsivo, scroll hijacking, parallax o animaciones que retrasen LCP.
- Contenido esencial visible sin JavaScript.
- Foco visible y objetivos táctiles de al menos 44px.
- Modal accesible, Escape, foco y retorno; swipe nunca como única forma de navegación.
