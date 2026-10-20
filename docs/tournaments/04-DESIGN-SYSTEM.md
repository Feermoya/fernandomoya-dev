# Design system — Noche FC (Torneos)

## Principio

En mobile debe sentirse como una **app deportiva premium 2026**, no como una web responsive del portfolio. Desktop = app web completa a ancho útil (no columna estrecha centrada).

Identidad original: sin logos ni assets de EA Sports / FIFA oficiales.

## Tokens

Namespace CSS: `.tournaments-app-html` / `.tournaments-app-shell` (aislado de Foco y del portfolio).

| Token | Valor | Uso |
|-------|-------|-----|
| `--tg-bg` | `#12141A` | Fondo grafito |
| `--tg-bg-elevated` | `#1A1D26` | Superficies |
| `--tg-surface` | `#22262F` | Cards / paneles |
| `--tg-surface-2` | `#2A2F3A` | Hover / chips |
| `--tg-line` | `#2E3440` | Bordes sutiles |
| `--tg-text` | `#F2F4F7` | Texto primario |
| `--tg-muted` | `#9AA3B2` | Secundario |
| `--tg-accent` | `#B8F23A` | Verde lima competitivo |
| `--tg-accent-ink` | `#12141A` | Texto sobre acento |
| `--tg-danger` | `#FF5C5C` | Errores / derrotas |
| `--tg-win` | `#B8F23A` | Victorias |
| `--tg-draw` | `#F5C542` | Empates |
| `--tg-font` | Space Grotesk | UI completa |

Tipografía: reutilizar Space Grotesk (ya cargada en shell apps). Números/marcadores con `font-variant-numeric: tabular-nums` y escala grande.

## Componentes base (etapa 1+)

- **Shell**: safe-area, padding inferior para tab bar, sin header del sitio.
- **Bottom nav** (mobile): Inicio / Partidos / Ranking.
- **Top bar** (desktop + mobile): nombre del grupo, badge Lectura/Organizador.
- **Primary button**: fondo lima, ink oscuro, min-height 48px.
- **Ghost / secondary**: borde `--tg-line`.
- **Player chip / card**: seleccionable, estado active/disabled.
- **Score stepper**: controles táctiles grandes (+/−).
- **Empty / error states**: copy claro, sin jerga técnica.

No cards decorativas innecesarias: la superficie existe para jerarquía o interacción.

## Navegación

### Mobile

- Tab bar fija inferior con `env(safe-area-inset-bottom)`.
- Contenido con `padding-bottom` suficiente.
- Sheets bottom para “Cargar partido” (etapas 2+).

### Desktop

- Layout de app a ancho completo (`max-w` amplio, p. ej. 1100–1280px).
- Nav lateral o top tabs equivalentes; misma información que mobile.
- No emular un teléfono centrado.

## Iconografía

Lucide React. Set acotado: Trophy, Users, Swords, Share2, Undo2, Crown, Medal, Plus, ChevronLeft, Lock, Link, etc.

## Motion

Librería: `motion` (ya en package.json).

| Momento | Comportamiento |
|---------|----------------|
| Cambio de pantalla | Fade/slide corto (≤200ms) |
| Selección jugador | Scale/highlight |
| Marcador | Pop numérico |
| Ranking | Reorden layout suave |
| Podio / premios | Entrada staggered |
| Preferencia | Respetar `prefers-reduced-motion` (`src/lib/motion-prefs.ts`) |

Sin partículas pesadas ni glow púrpura genérico.

## Exportaciones (etapa 5)

Tarjetas PNG (Instagram story 1080×1920 y square 1080×1080):

- Pareja campeona
- MVP
- Resultado / podio

Render offscreen → canvas/PNG. Web Share API + “Guardar imagen”. Sin chrome de UI en la imagen.

## Accesibilidad

- Contraste AA sobre grafito + lima.
- Targets ≥ 44×44px.
- Focus visible.
- Labels en steppers y chips.
- `noindex` en rutas privadas (no es a11y, pero va con privacidad de vistas).

## Relación con Foco financiero

| | Foco | Torneos |
|--|------|---------|
| Fondo | Claro `#F6F8FB` | Oscuro grafito |
| Acento | Fintech verde/azul | Lima `#B8F23A` |
| Manifest | propio | propio (etapa 6) |
| Clases | `finance-app-*` | `tournaments-app-*` |

No compartir hojas de estilo de app.
