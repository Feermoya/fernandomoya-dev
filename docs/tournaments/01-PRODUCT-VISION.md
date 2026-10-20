# Visión de producto — Torneos FIFA / EA Sports FC

## Qué es

Aplicación web pública para organizar torneos informales de fútbol entre amigos (FIFA / EA Sports FC). Convierte una juntada en una experiencia competitiva, visual y fácil de gestionar: resultados, rankings, premios y tarjetas para compartir.

No es un sistema profesional de ligas. Es una app deportiva moderna para noches de juego entre amigos.

## Público

- Amigos que juegan 1 vs. 1 y/o 2 vs. 2 la misma noche.
- Organizador informal (quien carga resultados desde el celular).
- Invitados con enlace de solo lectura (consultan rankings y premios).

Sin registro, email ni cuentas globales. Una persona puede existir en varios grupos con identidades locales distintas.

## Prioridades (orden)

1. Velocidad de uso (carga de partidos en segundos).
2. Excelente experiencia mobile.
3. Persistencia e historial.
4. Diseño premium con identidad futbolera.
5. Funciones sociales (competir y compartir).
6. Arquitectura sencilla, mantenible y ampliable.

## Alcance v1

### Incluye

- Crear grupo + jugadores sin cuenta.
- Enlace de consulta y enlace/secreto de organizador.
- Fechas (noche de juego) con estados: preparada, en juego, finalizada.
- Partidos 1 vs. 1 y 2 vs. 2 (parejas dinámicas por partido).
- Corrección de resultados y deshacer último partido.
- Tres rankings independientes (1v1, jugador en 2v2, parejas) × alcance fecha / histórico.
- Premios manuales y reconocimientos automáticos.
- Cierre de fecha con podio.
- Exportación PNG de tarjetas (compartir / guardar).
- Shell propio en `/torneos` sin cabecera/pie del portfolio.

### No incluye (v1)

- Cuentas, OAuth, perfiles globales.
- Goleadores, asistencias, posesión u otras stats del videojuego.
- Fixture obligatorio previo.
- Directorio público de grupos.
- Notificaciones push.
- Gráficos complejos.
- PWA instalable completa (evaluada en etapa 6; manifiesto propio, no el de Foco).

## Entidades conceptuales

| Entidad | Rol |
|--------|-----|
| **Grupo** | Contenedor: jugadores, fechas, stats acumuladas, config. |
| **Fecha** | Una noche de juego. |
| **Partido** | 1v1 o 2v2 con resultado (exacto o simplificado). |
| **Premios** | Manuales (MVP, mejor gol…) y automáticos (campeón, invictos…). |

Las parejas no son equipos permanentes: se derivan de los participantes de cada partido.

## Criterios de aceptación (producto)

Ver checklist operativa en `05-ROADMAP.md` y la lista canónica del brief (escenarios 1–15). Resumen:

- Crear grupo de 7 sin email.
- Persistencia entre sesiones y dispositivos vía enlaces.
- Rankings consistentes tras editar resultados.
- Invitado de solo lectura no edita.
- Portfolio y Foco financiero intactos.

## Nombre de producto (UI)

Nombre de trabajo en UI: **Noche FC** (corto, futbolero, sin marcas protegidas).

Rutas y código usan el namespace `tournaments` / `torneos`.
