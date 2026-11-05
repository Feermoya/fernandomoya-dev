# Foco financiero · Manual de diseño

Fuente única de verdad visual. Si algo no está acá, NO se inventa: se usa el token o componente más parecido y se avisa.

Principios:
1. Claridad primero: el número importante es siempre lo más grande de la pantalla.
2. El color significa algo: azul = acción, verde = logrado, rojo = vacío o empeoró, naranja = bajo, celeste = nivel.
3. Fino y limpio: tarjetas blancas, bordes de 1px, mucho aire, esquinas muy redondeadas.
4. Motiva: celebrar logros (objetivo cumplido, subir de nivel, racha).
5. Se siente app nativa: gestos, vibración, transiciones fluidas, safe areas.

---

## 1. Tokens de color

```css
:root {
  /* Superficies */
  --bg-app: #F3F6FD;
  --bg-card: #FFFFFF;
  --bg-segment: #E8EEFB;      /* fondo del selector Dashboard/Bitcoin */
  --border-card: #E3E9F6;

  /* Texto */
  --text-primary: #0F1A33;
  --text-secondary: #4A5675;
  --text-muted: #6B7794;      /* etiquetas, subtítulos */

  /* Acción */
  --primary: #2F5BEA;
  --primary-on: #FFFFFF;

  /* Éxito / cumplido */
  --success: #34B36B;
  --success-bg: #E3F7EC;
  --success-border: #BFEBD3;
  --success-text: #16794A;

  /* Peligro / vacío / empeoró */
  --danger-bg: #FDECEA;
  --danger-cell: #FBE4E2;
  --danger-text: #B3261E;

  /* Advertencia / bajo */
  --warning-bg: #FFF1E4;
  --warning-border: #FAD9B8;
  --warning-text: #C2570C;

  /* Nivel / info */
  --level-bg: #E3F1F8;
  --level-border: #C6E2F0;
  --level-text: #1F6E96;

  /* Gráficos (concentración, Bitcoin). Usar en este orden */
  --chart-1: #F29D38;
  --chart-2: #7C4DFF;
  --chart-3: #3A8FB7;
  --chart-4: #34B36B;
  --chart-5: #E0527A;
}
```

Reglas de color:
- Prohibido usar hex fuera de esta lista. Si falta uno, se pregunta.
- Máximo UN botón primario relleno de azul por pantalla ("Cargar inversión").
- Verde sólido (`--success` con texto blanco) solo para estado "cumplido". Lo suave (`--success-bg`) para chips informativos.
- Nunca usar opacidad en texto para atenuarlo: usar `--text-muted` o `--text-secondary`.

---

## 2. Tipografía

Fuentes (Google Fonts, pesos limitados):
- Display / números: **Bricolage Grotesque** 600 y 700.
- Interfaz: **Manrope** 500, 600 y 700.

```css
--font-display: 'Bricolage Grotesque', system-ui, sans-serif;
--font-ui: 'Manrope', system-ui, sans-serif;
```

Escala (valores para móvil, ancho ~390px):

| Uso | Fuente | Tamaño | Peso | Letter-spacing |
|---|---|---|---|---|
| Título app ("Foco financiero") | display | 28px | 700 | -0.03em |
| Monto principal (objetivo del mes) | display | 34px | 700 | -0.03em |
| Monto secundario (Cartera) | display | 28px | 700 | -0.03em |
| Porcentaje dentro del anillo | display | 22px | 700 | -0.02em |
| Mes ("Noviembre de 2026") | display | 17px | 700 | -0.02em |
| Título de tarjeta | display | 17px | 700 | -0.02em |
| Texto base | ui | 14px | 500/600 | 0 |
| Subtítulo / "de $ 850.000" | ui | 14px | 500 | 0 |
| Etiqueta (OBJETIVO DEL MES) | ui | 11px | 700 | 0.09em, MAYÚSCULAS |
| Chips / pills | ui | 11–12px | 600 | 0 |
| Botón principal | ui | 16px | 700 | 0 |

Reglas:
- Todo número de dinero y porcentaje grande usa `font-variant-numeric: tabular-nums` y fuente display.
- Formato de dinero: `$ 1.393.725` (punto como separador de miles, espacio tras el símbolo). Dólares: `US$ 97,00`.
- Títulos y botones en sentence case ("Cargar inversión"), solo las etiquetas van en MAYÚSCULAS.
- Sin pesos 800/900. Sin tercera fuente.

---

## 3. Forma, espacio y profundidad

```css
--radius-card: 24px;
--radius-inner: 12px;
--radius-cell: 8px;
--radius-pill: 999px;

--space-1: 4px;  --space-2: 8px;  --space-3: 12px;
--space-4: 16px; --space-5: 20px; --space-6: 24px;
```

- Padding de pantalla: 16px laterales. Separación entre tarjetas: 12px.
- Padding interno de tarjeta: 16px.
- Tarjeta: fondo `--bg-card`, borde `1px solid --border-card`, radio 24px.
- Sombra (suave, solo tarjetas y botón principal):
  - Tarjeta: `0 1px 2px rgba(15,26,51,.04), 0 6px 20px rgba(47,91,234,.05)`
  - Botón principal: `0 8px 20px rgba(47,91,234,.28)`
- Sin vidrio, sin desenfoques decorativos, sin gradientes (excepto un posible fondo de celebración).
- Zonas táctiles mínimo 44x44px.
- Respetar safe areas (notch y barra inferior). El botón principal queda flotando a 16px sobre la barra inferior.

---

## 4. Íconos

- Librería: Lucide (trazo 1.75px, outline, redondeados). No mezclar librerías.
- Tamaños: 16px en chips, 20px en botones y encabezados.
- Tendencia: `trending-up` (verde, "Mejoró") y `trending-down` (rojo, "Empeoró").
- Candado (admin), nube (guardado), trofeo (nivel), llama (racha), calendario (mes), meta (objetivo), cartera.

---

## 5. Componentes

### 5.1 Encabezado
Título (display 28) + subtítulo (ui 14, `--text-muted`). Debajo, fila de chips: `ADMIN` (candado), botón de nube (círculo 40px) y chip "Guardado en la nube" (`--success-bg`, borde y texto de éxito).

### 5.2 Selector de pestañas (Dashboard / Bitcoin)
Contenedor `--bg-segment`, radio pill, padding 4px. Pestaña activa: fondo `--primary`, texto blanco, radio pill. Inactiva: texto `--text-secondary`. Transición del indicador 250ms ease-out (se desliza, no salta).

### 5.3 Fila de nivel y mes
- Chip "NIVEL N" con trofeo (`--level-*`).
- Navegador de mes: botón ‹ circular, mes centrado (display 17), botón › circular. Fondo blanco, borde `--border-card`. Al cambiar de mes, el contenido hace fade de 150ms.

### 5.4 Tarjeta "Objetivo del mes" (componente estrella)
Estructura:
- Fila superior: etiqueta `OBJETIVO DEL MES` + chip de estado a la derecha.
- Fila central: **anillo de progreso** (84px, trazo 9px, radio 34, `stroke-linecap: round`, empieza arriba) + a la derecha el monto grande y debajo "de $ X".
- Fila inferior: chip de tendencia a ancho completo.

Anillo:
- Pista `--border-card`. Progreso: `--primary` si es menor a 100%, `--success` si llega a 100% o más.
- El porcentaje del centro se limita visualmente a 100% en el trazo, pero el número puede mostrar el real (ej. 164%).
- Animación al montar: trazo de 0 al valor en 800ms `cubic-bezier(.22,1,.36,1)`; el monto cuenta de 0 al valor en 700ms.

Chip de estado:
- Menor a 100%: "En curso" (fondo `--bg-segment`, texto `--primary`).
- 100% o más: "Objetivo cumplido" (fondo `--success`, texto blanco).

Chip de tendencia vs mes anterior (radio 12, padding 8x10):
- Mejoró: ícono trending-up, fondo `--success-bg`, texto `--success-text`. "+N% · Mejoró vs oct 2026".
- Empeoró: ícono trending-down, fondo `--danger-bg`, texto `--danger-text`. "-N% · Empeoró vs oct 2026".
- Sin dato del mes anterior: no mostrar el chip.

### 5.5 Tarjeta "Progreso de nivel"
Etiqueta `PROGRESO DE NIVEL` + porcentaje a la derecha. Barra de **4 segmentos** de 8px con 4px de separación. Segmentos llenos `--primary`, vacíos `--border-card`. El último segmento lleno anima de izquierda a derecha.

### 5.6 Tarjeta "Racha"
- Encabezado: etiqueta `RACHA · N MESES` con ícono de llama + chip a la derecha "Mín. $ 10.000" (`--warning-*`).
- **Tira de 12 meses**: grilla de 12 celdas (alto 34px, radio 8, separación 4px), una por mes, más antiguo a la izquierda.
  - Cumplido: `--success`. Bajo: `--chart-1` (naranja). Vacío: `--danger-cell`.
  - Mes actual: aro de 2px `--primary` con offset 2px.
- Debajo: iniciales del primer y último mes a los extremos (DIC … NOV), 11px `--text-muted`.
- Leyenda: punto de color + "Cumplido", "Bajo", "Vacío".
- Al hacer tap en una celda: tooltip con mes y monto.
- Cuando la racha sube: la nueva celda hace pulse (scale 1 → 1.15 → 1) y vibración suave.

### 5.7 Tarjeta "Concentración del mes"
Título + subtítulo "Distribución de compras", chip a la derecha ("Concentración alta" usa `--warning-*`). Filas por activo: ticker (display 17) + porcentaje a la derecha, barra de 8px con color de `--chart-N` en orden, debajo "$ monto · N operaciones" (ui 13, `--text-muted`). Las barras animan al montar con 60ms de escalonado.

### 5.8 Tarjeta "Cartera"
Dos sub-tarjetas lado a lado ("ESTE MES" y "TOTAL HISTÓRICO") con fondo `--bg-app`, radio 18, padding 14. Monto en display 28. Debajo, chip de tendencia o texto "Desde el inicio" y "+ US$ 97,00 en dólares". Enlace "Ver promedio, ops y año" en `--primary`, peso 600.

### 5.9 Botón principal "Cargar inversión"
Flotante inferior, ancho completo menos 32px, alto 56px, radio pill, fondo `--primary`, texto blanco ui 16/700 con ícono `plus` de 20px a la izquierda. Sombra de botón principal. Estado presionado: `scale(.97)` en 120ms. Un solo botón así por pantalla.

### 5.10 Hoja de carga (bottom sheet)
Al tocar "Cargar inversión": hoja que sube desde abajo (radio superior 28px, fondo blanco, manija gris de 36x4px arriba), se cierra arrastrando hacia abajo. Campos con radio 14px, borde `--border-card`, foco con borde `--primary` 2px. Botón de confirmar igual al principal.

---

## 6. Movimiento y sensación nativa

- Duraciones: rápida 120ms, base 250ms, entrada de datos 700–800ms.
- Curva por defecto: `cubic-bezier(.22,1,.36,1)`.
- Respetar `prefers-reduced-motion`: sin conteo ni confeti, solo cambios instantáneos.
- Vibración (haptics): suave al cargar inversión, éxito al cumplir objetivo o subir de nivel. Si la plataforma no la soporta, se ignora sin error.
- **Celebraciones** (una vez por evento, nunca repetir al volver a la pantalla):
  - Objetivo cumplido: anillo se completa, chip cambia a verde, confeti breve de 1.2s (colores `--success`, `--primary`, `--chart-1`).
  - Subir de nivel: el chip de nivel hace pulse y aparece un mensaje corto "Nivel N alcanzado".
  - Racha nueva: pulse de la celda actual.
- Estados de carga: skeletons con los mismos radios (nunca spinners a pantalla completa).

---

## 7. Copy (textos)

- Español rioplatense neutro, sentence case, sin signos de exclamación en datos.
- Verbos primero en acciones: "Cargar inversión", "Ver promedio, ops y año".
- Sin "por favor", "simplemente", "exitosamente".
- Estados: "En curso", "Objetivo cumplido", "Mejoró", "Empeoró", "Cumplido", "Bajo", "Vacío".

---

## 8. Accesibilidad

- Contraste mínimo 4.5:1 en texto. Los pares definidos arriba ya lo cumplen; no combinar otros.
- El estado nunca se comunica solo con color: siempre ícono o texto (ej. flecha + "Empeoró").
- Anillo y tira de racha con `aria-label` descriptivo ("Objetivo del mes: 100%", "Racha: 7 meses").
- Tamaños de texto respetan el escalado del sistema.

---

## 9. Lo que NO se hace

- No cambiar la estructura ni el orden de las secciones del Dashboard.
- No agregar modo oscuro, vidrio (liquid glass), gradientes decorativos ni neón.
- No usar colores, fuentes, radios o sombras fuera de este manual.
- No usar más de un botón primario por pantalla.
- No mezclar librerías de íconos.
- No introducir librerías pesadas de UI o animación sin preguntar (CSS/SVG alcanza; para confeti usar una librería liviana).
- No tocar la lógica de negocio, los cálculos ni la persistencia de datos.

---

## 10. Checklist antes de dar una pantalla por terminada

- [ ] Solo tokens de este manual (buscar hex sueltos).
- [ ] Números de dinero en Bricolage Grotesque con `tabular-nums`.
- [ ] Anillo, racha y barras animan al montar.
- [ ] Tendencias con ícono + color + texto.
- [ ] Zonas táctiles de 44px y safe areas correctas.
- [ ] Un solo botón primario.
- [ ] Funciona con `prefers-reduced-motion`.
