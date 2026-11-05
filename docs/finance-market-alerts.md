# Alertas de mercado / WhatsApp — retirado

La UI de alertas financieras, los avisos por WhatsApp (CallMeBot) y el cron de `finance-market-monitor` fueron **retirados del producto**.

- `/api/finance-keepalive` solo hace ping a Supabase (sin jobs de WhatsApp).
- `/api/finance-whatsapp-send` y `/api/finance-market-monitor` responden **410 Gone**.
- El workflow de GitHub Actions quedó desactivado (solo `workflow_dispatch` informativo).

Los campos de `preferences.reminder` se conservan en el esquema de estado para no romper sync/histórico, pero la app ya no los expone ni los ejecuta.

## Acción manual recomendada

Revocá o borrá en Vercel / GitHub (si existían):

- `CALLMEBOT_API_KEY` / `FINANCE_CALLMEBOT_API_KEY`
- `FINANCE_MONITOR_URL` / `FINANCE_MONITOR_SECRET`
- cualquier secret relacionado con CallMeBot

No hace falta tocar datos de inversiones en Supabase.
