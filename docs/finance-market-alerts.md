# Alertas de mercado — Foco financiero

## Qué hace

El módulo detecta **tickers** a partir de las inversiones cargadas, consulta **precios actuales** y muestra **alertas informativas**. Las mismas reglas alimentan WhatsApp automático vía el cron único de keep-alive.

Los mensajes de WhatsApp son cortos y factuales (sin saludos ni disclaimer legal).

## Architecture

```
UI (FinanceMarketAlerts)  →  buildMarketAlerts + /api/finance-prices
Cron Hobby (keepalive)    →  ping Supabase + runFinanceWhatsAppJobs
                              ├ investment reminder (días programados)
                              └ market alerts (si marketWhatsAppEnabled)
```

Un solo cron en `vercel.json` → `/api/finance-keepalive`. Hobby no admite un segundo cron: los avisos viven en ese job. El ping desde la app **no** envía WhatsApp (solo el header `x-vercel-cron: 1`).

## WhatsApp automático

1. Activá CallMeBot y copiá la API key.
2. En Foco → **Avisos WhatsApp**, pegá la key una vez (campo en pantalla). Viaja con el sync a Supabase — no hace falta ponerla en Vercel.
3. El número es fijo (`site.social.whatsappPhoneDigits`).
4. Dejá ON inversión y/o mercado.
5. Abrí la app online para sincronizar + redeploy del código.

El recordatorio de inversión **no usa días fijos**: el cron mira el volumen del mes y los niveles. Si invertiste poco o estás cerca de subir (ej. nivel 2→3), avisa. Si ya llegaste a Disciplina (L3 / $450.000), no molesta. Anti-spam: como máximo cada ~3 días.

Anti-spam mercado: huellas `kind:TICKER` (ej. `loss-since-buy:TSLA`).

## Tickers

Prioridad (`getEntryTicker`):

1. `entry.ticker`
2. `entry.category`
3. Tokens en `entry.note`
4. `entry.asset === 'BTC'` → `BTC`

## Tipos de alerta

| kind | Condición (defaults) |
|------|----------------------|
| `daily-drop` | variación diaria ≤ −3% |
| `daily-rise` | variación diaria ≥ +3% |
| `loss-since-buy` | vs compra ≤ −5% (misma moneda) |
| `gain-since-buy` | vs compra ≥ +8% |
| `neutral` | sin movimientos (solo UI; no WhatsApp) |

Máximo **4** alertas en pantalla.

## Archivos

- `src/lib/finance/marketAlerts.ts` — reglas + fingerprints
- `src/lib/finance/whatsappJobs.ts` — jobs CallMeBot
- `src/lib/finance/remoteFinanceState.ts` — lectura/escritura Supabase en servidor
- `api/finance-keepalive.entry.ts` — ping + cron WhatsApp
- `src/components/finance/FinanceMarketAlerts.tsx` — UI
- `src/components/finance/FinanceWhatsAppReminders.tsx` — configuración (sin envío manual)
