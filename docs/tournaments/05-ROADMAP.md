# Roadmap — Torneos

Fuente de verdad de etapas.

## Etapa 0 — Auditoría y arquitectura ✅

Docs en `docs/tournaments/01–05`. Shell multi-app, Supabase aislado, auth por secreto.

## Etapa 1 — Base funcional ✅

`/torneos`, crear/entrar grupo, jugadores, claim/recover/revoke, migración SQL.

## Etapa 2 — Torneos y partidos ✅

- Fechas (`prepared` / `live` / `finished`)
- Carga rápida 1v1 / 2v2 (sheet táctil)
- Marcador exacto + resultado simplificado
- Deshacer último / revancha
- Sorteo opcional con descansos

## Etapa 3 — Competencia ✅

- Rankings: 1v1, jugador 2v2, parejas
- Alcance fecha / historial
- Rachas, invictos (mín. 3), tests Vitest

## Etapa 4 — Premios y cierre ✅

- MVP, mejor gol, custom
- Finalizar / reabrir
- Podio e historial de fechas

## Etapa 5 — Experiencia premium ✅

- Motion (apertura sheet, marcador, podio) + `prefers-reduced-motion`
- Tarjetas PNG (campeón / podio) story + square
- Web Share API + descarga

## Etapa 6 — Calidad y publicación ✅

- Manifest PWA propio `/torneos.webmanifest`
- Safe areas, nav mobile/desktop, `noindex` en grupos
- Headers Vercel + sitemap filter
- Tests + build

## Activación

1. `TOURNAMENTS_SUPABASE_URL` + `TOURNAMENTS_SUPABASE_SERVICE_ROLE_KEY`
2. Ejecutar `supabase/migrations/20261020120000_tournaments.sql`
3. Opcional: `TOURNAMENTS_SESSION_SECRET`
