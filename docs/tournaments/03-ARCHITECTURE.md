# Arquitectura técnica — Torneos

## Hallazgos de auditoría (etapa 0)

| Área | Estado actual | Decisión para torneos |
|------|---------------|------------------------|
| Astro 6 + React 19 + Tailwind v4 + Vercel | OK | Misma stack |
| `Layout.astro` `appShell` | Acoplado a Foco (manifest, theme, apple title, clase `finance-app-html`) | Generalizar a `shellApp: 'finance' \| 'tournaments'` sin romper `appShell={true}` (= finance) |
| Middleware | Protege `/panel`, `/foco-financiero`, `/admin` con PIN | **No** proteger `/torneos` con PIN del panel. Auth propia por grupo |
| Supabase panel | `SUPABASE_URL` + `SERVICE_ROLE`; RLS cerrado; acceso solo SSR | Cliente admin **separado** para torneos |
| APIs | `src/pages/panel/api/*` + `api/finance-*.mjs` | Endpoints Astro en `src/pages/torneos/api/*` |
| PWA Foco | `/foco-financiero.webmanifest` | Manifiesto propio en etapa 6; etapa 1 sin manifest de torneos |
| `motion` | Ya instalado | Usar en etapas 2–5 |
| Lucide / Space Grotesk | Disponibles | Reutilizar |
| Sitemap | Excluye foco/panel/admin | Excluir `/torneos/g/` (vistas privadas) |

## Integración en el monorepo

```
/torneos                    → landing app (SSR o estático + island)
/torneos/g/[publicId]       → app del grupo (SSR, noindex)
/torneos/api/...            → escrituras y lecturas server-side
```

- Sin cabecera/pie del portfolio (`shellApp: 'tournaments'`).
- Módulo independiente: `src/lib/tournaments/*`, `src/components/tournaments/*`, `src/styles/tournaments.css`.
- No importar lógica ni CSS de Foco financiero.
- Cambios en `Layout.astro` / `astro.config.mjs` / `vercel.json` solo los mínimos multi-app.

## Proyecto Supabase

**Recomendación: proyecto Supabase independiente** para aislar datos financieros/panel de grupos públicos.

Variables (server-only, sin `PUBLIC_`):

```
TOURNAMENTS_SUPABASE_URL=
TOURNAMENTS_SUPABASE_SERVICE_ROLE_KEY=
TOURNAMENTS_SESSION_SECRET=   # firma cookies admin; opcional, se deriva si falta
```

Fallback de desarrollo documentado: si no hay `TOURNAMENTS_*`, no usar automáticamente el de finanzas (evita contaminación). La app muestra estado “no configurado”.

Migraciones versionadas en `supabase/migrations/` con prefijo `tournament_`.

### Seguridad DB

- RLS ON en todas las tablas `tournament_*`.
- Sin policies para `anon` / `authenticated` (mismo patrón que panel cobros).
- Acceso solo con `service_role` desde endpoints SSR tras validar permiso.
- El browser **nunca** recibe la service role ni escribe directo a PostgREST.

## Modelo de datos

### Tablas etapa 1

**`tournament_groups`**

| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid PK | |
| public_id | text UNIQUE | Opaco, URL-safe (~22 chars) |
| name | text | |
| created_at / updated_at | timestamptz | |
| created_ip_hash | text nullable | Rate-limit / abuso (hash, no IP en claro) |

**`tournament_players`**

| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid PK | Identidad estable en el grupo |
| group_id | uuid FK | ON DELETE CASCADE |
| display_name | text | Editable sin cambiar id |
| active | boolean | Soft-deactivate |
| sort_order | int | |
| created_at / updated_at | timestamptz | |

**`tournament_admin_credentials`**

| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid PK | |
| group_id | uuid UNIQUE FK | |
| secret_hash | text | Hash del secreto organizador |
| recovery_hash | text | Hash de clave de recuperación |
| version | int | Incrementa al rotar |
| revoked_at | timestamptz nullable | |
| created_at / updated_at | timestamptz | |

### Tablas etapas 2–4 (migración completa desde etapa 1 para evitar churn)

**`tournament_matchdays`** (fechas)

- group_id, name, status (`prepared` \| `live` \| `finished`), started_at, finished_at, sequence_number

**`tournament_matches`**

- matchday_id, mode (`solo` \| `pairs`), sort_order
- score_home / score_away nullable (null = resultado simplificado)
- simplified_outcome (`home` \| `away` \| `draw`) nullable
- CHECK: o bien scores numéricos, o simplified_outcome; no inventar GD sin scores

**`tournament_match_participants`**

- match_id, player_id, side (`home` \| `away`), slot (0 \| 1)
- UNIQUE (match_id, player_id); en pairs exactamente 2 por side

**`tournament_awards`**

- matchday_id, type, player_id nullable, player_b_id nullable (parejas), note nullable
- Tipos: mvp, best_goal, best_pair, champion_solo, undefeated_pair, custom…

Las **parejas** no tienen tabla propia: se derivan de participantes (par ordenado canónico `min(id),max(id)`).

### Rankings

Cálculo **derivado** en servidor/pure functions a partir de partidos. Sin contadores denormalizados editables en v1.

Puntos: V=3, E=1, D=0. Orden: puntos → victorias → GD (solo con marcador) → partidos → id estable.

## Autorización

| Acción | Requisito |
|--------|-----------|
| GET grupo / jugadores / lecturas | Conocer `public_id` |
| Crear grupo | Rate-limit + validación |
| POST/PATCH/DELETE mutaciones | Cookie admin firmada **o** claim con secreto |
| Listar todos los grupos | **Prohibido** (no hay endpoint de directorio) |

### Secretos

1. Al crear: generar `adminSecret` y `recoveryKey` (criptográficamente aleatorios).
2. Persistir solo hashes (scrypt vía `crypto.scryptSync` o SHA-256 con pepper de `TOURNAMENTS_SESSION_SECRET` — preferir scrypt/pbkdf2).
3. Mostrar secretos **una vez** al cliente; no se pueden releer.
4. Claim: `POST .../claim-admin` con secreto → cookie httpOnly `fm_tg_admin` firmada HMAC (`groupId`, `credentialVersion`, `iat`).
5. Revoke / recover: rotan hash + `version` → cookies viejas inválidas.

El frontend no envía “soy admin: true”. El servidor decide.

## APIs (etapa 1)

| Método | Ruta | Auth |
|--------|------|------|
| POST | `/torneos/api/groups` | Público (rate-limit) |
| GET | `/torneos/api/groups/[publicId]` | Público |
| POST | `/torneos/api/groups/[publicId]/claim-admin` | Secreto |
| POST | `/torneos/api/groups/[publicId]/recover-admin` | Recovery key |
| POST | `/torneos/api/groups/[publicId]/revoke-admin` | Cookie admin |
| PATCH | `/torneos/api/groups/[publicId]/players` | Cookie admin |

Respuestas JSON `{ ok: true \| false, ... }`. Códigos 400/401/403/404/429/503.

## Capas de código

```
src/lib/tournaments/
  types.ts
  ids.ts              # public_id generation
  secrets.ts          # hash / verify / cookies
  validate.ts         # nombres, límites
  supabase/admin.ts   # service role tournaments
  session.ts          # requireTournamentAdmin
  api.ts              # json helpers
  repositories/       # groups, players
  rankings/           # etapas 3+ (pure + tests)
```

## Rate limiting (crear grupo)

- Máx. jugadores por grupo: 24 (v1).
- Nombre grupo: 2–48 chars.
- Máx. creaciones por `created_ip_hash` / hora: configurable (ej. 10).
- Validar payloads en servidor; ignorar campos de permiso del body.

## SEO / privacidad

- `/torneos`: indexable (pieza de portfolio).
- `/torneos/g/*`: `noindex, nofollow` + fuera del sitemap.
- Headers `Cache-Control: no-store` en vistas de grupo (vercel.json).

## Pruebas

Vitest (ya en el repo) para:

- Hash/verify secretos y cookies.
- Normalización de jugadores pegados.
- (Etapas 3+) rankings, empates, parejas, rachas, auth de mutaciones.

Comandos: `npm run typecheck`, `npm run test`, `npm run build`.
