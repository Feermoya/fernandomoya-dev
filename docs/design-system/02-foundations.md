# 02 · Foundations y tokens

Valores canónicos propuestos para comenzar la implementación. La ilustración conceptual no determina hex ni medidas exactas. Validar contraste AA.

| Token | Valor | Uso |
|---|---|---|
| --fm-bg | #F8FAFC | Fondo general |
| --fm-surface | #FFFFFF | Tarjetas |
| --fm-surface-soft | #F1F5F9 | Chips y bloques suaves |
| --fm-ink | #111827 | Títulos y botones principales |
| --fm-text | #273244 | Cuerpo |
| --fm-muted | #66758B | Texto secundario |
| --fm-border | #E7ECF2 | Bordes |
| --fm-accent | #365CF5 | Enlaces seleccionados e indicadores |
| --fm-accent-soft | #E9EEFF | Iconos azules |
| --fm-violet-soft | #F0EAFE | Categoría catálogos |
| --fm-orange-soft | #FFF0E5 | Categoría plataformas |
| --fm-success | #23835B | Estado éxito real |

### CSS de inicio
```css
.fm-portfolio {
  --fm-bg: #f8fafc;
  --fm-surface: #fff;
  --fm-surface-soft: #f1f5f9;
  --fm-ink: #111827;
  --fm-text: #273244;
  --fm-muted: #66758b;
  --fm-border: #e7ecf2;
  --fm-accent: #365cf5;
  --fm-accent-soft: #e9eeff;
  --fm-violet-soft: #f0eafe;
  --fm-orange-soft: #fff0e5;
  --fm-radius-sm: 10px;
  --fm-radius-md: 16px;
  --fm-radius-lg: 22px;
  --fm-shadow-card: 0 8px 28px rgb(15 23 42 / 5%);
}
```

## Tipografía
Propuesta: **Manrope variable**, pesos 400–800. Fallback Inter, system-ui, sans-serif. Verificar licencia y estrategia de carga. Sin serif.

- Hero mobile: 34–40px, line-height 1.08–1.14, peso 750–800.
- H1 interno: 30–34px, 1.12, peso 750.
- H2: 24–28px, 1.2, peso 700.
- H3: 18–20px, 1.3, peso 700.
- Body: 15–16px, 1.5, peso 400–500.
- Small: 13–14px, 1.45.
- Overline: 11–12px, peso 700, letter-spacing .04em.

Nunca usar textos generales de 11–12px para encajar más contenido.

## Espacios y geometría
Espaciado: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64px. Padding horizontal: 20px mobile estándar, 16px a 320px. Gap tarjetas: 12–16px. Separación de secciones: 52–72px. Radio cards: 18–22px. Botones: 12–16px. Altura táctil mínima: 44px. Contenido desktop sugerido máximo 1200px, sin alterar el layout existente hasta su etapa.

## Iconos
**Lucide**, ya presente en el stack. Tamaño 18–22px, grosor 1.75–2. Monitor para webs, ShoppingCart/LayoutGrid para catálogos, Blocks para plataformas, ArrowUpRight para visitar, ArrowRight para navegación, MapPin, Mail, Menu, X y ChevronLeft/Right.

## Imágenes
Utilizar `astro:assets` y archivos reales. Proporciones 16:10 para destacadas, 4:3 o 3:2 para listados. Evitar recortes importantes, renders ficticios y auto-playing pesado.
