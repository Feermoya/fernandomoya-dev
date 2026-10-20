# Flujos de usuario — Torneos

## Mapa de pantallas (v1)

| Pantalla | Ruta / estado | Rol |
|----------|---------------|-----|
| Bienvenida | `/torneos` | Público |
| Crear grupo (nombre) | wizard step 1 | Organizador |
| Crear grupo (jugadores) | wizard step 2 | Organizador |
| Credenciales creadas | post-create | Organizador (una vez) |
| Entrar a grupo | `/torneos` → pegar enlace / código | Cualquiera |
| Home del grupo | `/torneos/g/{publicId}` | Lectura / admin |
| Fecha activa | tab Inicio | Lectura / admin |
| Cargar partido | sheet / modal | Solo admin |
| Sortear partido | sheet opcional | Solo admin |
| Partidos | tab Partidos | Lectura / admin |
| Ranking | tab Ranking | Lectura |
| Premios / historial | desde Inicio o menú | Lectura / admin |
| Cierre de fecha | pantalla full | Lectura / admin |
| Compartir tarjeta | modal export | Cualquiera |

Navegación mobile: barra inferior fija — **Inicio · Partidos · Ranking**. Premios e historial se abren desde Inicio/menú para no saturar tabs.

## Flujo A — Primera visita: crear grupo

1. Usuario abre `/torneos`.
2. Ve título, descripción breve y acciones: **Crear torneo** / **Entrar a mi grupo**.
3. Si hay grupos recientes en el dispositivo → **Continuar mi grupo**.
4. **Crear torneo** → nombre del grupo.
5. → lista de jugadores (chips + pegar CSV/saltos de línea).
6. Confirmar → API crea grupo + jugadores + credenciales admin.
7. Pantalla de éxito muestra:
   - Enlace de consulta (compartible).
   - Secreto de organizador / enlace admin (guardar).
   - Clave de recuperación (guardar offline; solo esta vez).
8. CTA: **Ir al grupo** (claim admin + cookie) e inicia fecha implícita en etapas posteriores; en etapa 1 queda en home del grupo.

## Flujo B — Entrar a grupo existente

1. Abre enlace `/torneos/g/{publicId}` o pega el código/URL en bienvenida.
2. Carga datos de solo lectura.
3. Si trae secreto admin (claim) o cookie válida → modo edición.
4. Sin secreto → puede ver, no escribir.

## Flujo C — Noche de juego (etapas 2–4)

1. Admin inicia / continúa fecha.
2. Home muestra: nombre fecha, participantes, partidos, líder, pareja destacada, últimos resultados, CTA **Cargar partido**.
3. Carga rápida:
   - Selección táctil de jugadores.
   - 2v2: 4 jugadores → dos equipos; recordar parejas recientes.
   - Marcador con controles grandes **o** modo ganador/perdedor (sin GD inventada).
   - Guardar → feedback → Nuevo partido / Revancha.
4. Opcional: **Sortear partido** (descansos con 6–7).
5. Premios manuales cuando quiera.
6. Finalizar fecha → confirmación → podio → export PNG.

## Flujo D — Solo lectura (invitado)

- Mismos tabs; CTAs de escritura ocultos o deshabilitados.
- Puede exportar/compartir tarjetas públicas de la fecha.

## Flujo E — Pérdida de acceso admin

1. Sin cookie ni secreto → solo lectura + mensaje claro.
2. **Recuperar acceso** → ingresa clave de recuperación guardada al crear.
3. Servidor rota secreto admin, invalida cookies previas, muestra nuevo secreto una vez.

## Flujo F — Revocar organizador

1. Admin autenticado elige revocar.
2. Nuevo secreto; sesión anterior inválida.
3. Quien tenga la clave de recuperación puede reclamar.

## Estados de fecha

```
preparada → en_juego → finalizada
                ↑___________↓  (reabrir para correcciones)
```

Una fecha sin cerrar no bloquea el historial ni la creación de otra (regla de negocio: una fecha activa a la vez por grupo en v1).

## Preferencias locales (no fuente de verdad)

`localStorage` solo para:

- Lista de grupos recientes (`publicId`, nombre, último acceso).
- Preferencias UI (tab, tema ya fijo oscuro).

Nunca secretos admin ni recovery keys.
