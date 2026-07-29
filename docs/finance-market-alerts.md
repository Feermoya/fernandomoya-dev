# Alertas de mercado — Foco financiero

## Qué hace

El módulo detecta **tickers** a partir de las inversiones cargadas, consulta **precios actuales** y muestra **alertas informativas**. Las mismas reglas alimentan WhatsApp automático.

Los mensajes de WhatsApp son cortos y factuales (sin saludos ni disclaimer legal).

## Architecture

```
UI (FinanceMarketAlerts)
  → buildMarketAlerts + /api/finance-prices
  → syncMarketAlertsWhatsApp (si hay huellas nuevas)
Cron Hobby (keepalive ~11:00 AR)
  → ping Supabase + runFinanceWhatsAppJobs
       ├ investment reminder
       └ market alerts (si marketWhatsAppEnabled)
```

Un solo cron en `vercel.json` → `/api/finance-keepalive` (Hobby = 1 cron). El ping desde la app **no** envía WhatsApp por el cron; sí puede disparar envío desde la UI de alertas cuando hay novedades.

## WhatsApp automático

1. Activá CallMeBot y copiá la API key.
2. En Foco → **Avisos WhatsApp**, pegá la key una vez. Viaja con el sync a Supabase.
3. El número es fijo (`site.social.whatsappPhoneDigits`).
4. Dejá ON inversión y/o mercado.
5. Abrí la app online para sincronizar.

### Mercado (dos caminos, misma anti-spam)

| Camino | Cuándo | Qué manda |
|--------|--------|-----------|
| **UI acoplada** | Al abrir Foco o tocar **Actualizar** en Alertas | Solo alertas con huella **nueva** |
| **Cron** | ~11:00 AR | Igual: solo huellas nuevas |

Anti-spam: huellas `kind:TICKER` (ej. `gain-since-buy:IBM`). Mientras la condición sigue activa no reenvía. Si se apaga y vuelve, sí.

El botón **WhatsApp** en la tarjeta fuerza un reenvío de las alertas activas y marca huellas.

El recordatorio de inversión sigue solo en el cron (volumen del mes / niveles). Anti-spam: como máximo cada ~3 días.

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
- `src/lib/finance/marketAlertAutoNotify.ts` — envío desde UI + dedupe
- `src/lib/finance/whatsappJobs.ts` — jobs CallMeBot (cron)
- `src/lib/finance/remoteFinanceState.ts` — lectura/escritura Supabase en servidor
- `api/finance-keepalive.entry.ts` — ping + cron WhatsApp
- `src/components/finance/FinanceMarketAlerts.tsx` — UI + auto-WhatsApp
- `src/components/finance/FinanceWhatsAppReminders.tsx` — configuración
