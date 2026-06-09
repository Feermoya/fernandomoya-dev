# Alertas de mercado — Foco financiero

## Qué hace

El módulo detecta **tickers** a partir de las inversiones cargadas, consulta **precios actuales** de forma dinámica y muestra **alertas informativas** sobre movimientos relevantes.

No es asesoramiento financiero: los textos usan lenguaje prudente (*“puede ser una oportunidad para revisar”*, *“revisar si sigue alineado con tu estrategia”*).

## De dónde salen los tickers

Prioridad al detectar qué compraste (`getEntryTicker`):

1. `entry.ticker` (campo nuevo)
2. `entry.category` (ej. `SPY`, `GOOGL`)
3. Tokens en `entry.note`
4. `entry.asset === 'BTC'` → `BTC`

Entradas viejas sin `ticker` siguen funcionando si la etiqueta o nota contiene un ticker válido.

## Precios en vivo vs snapshot de compra

| Dato | ¿Se persiste? | Uso |
|------|----------------|-----|
| Precio actual + variación diaria | **No** | Alertas de mercado (fetch al abrir / Actualizar) |
| `buyPrice`, `buySnapshot` | **Sí** (en la entrada) | Momento de la compra al cargar inversión |

Al cargar una inversión con ticker, la app intenta consultar `/api/finance-prices` y guarda un **snapshot** en la entrada. Si falla el precio, la inversión se guarda igual.

## Tipos de alerta

1. **Variación diaria** (`changePercent` desde Yahoo/Google), si la fuente lo provee:
   - ≤ −3% → oportunidad para revisar
   - ≥ +3% → suba notable hoy

2. **Precio actual vs precio de compra** (solo si `buyCurrency` coincide con la moneda del precio actual):
   - ≤ −5% vs compra → por debajo del precio registrado
   - ≥ +8% vs compra → arriba del precio registrado

Máximo **4 alertas** visibles. Si no hay movimientos fuertes, una alerta neutral.

## Limitaciones

- Si la fuente no devuelve `changePercent`, la alerta diaria puede no aparecer.
- Entradas viejas no tienen `buyPrice` salvo que se carguen de nuevo o se editen con ticker explícito.
- No se guarda histórico diario en servidor ni en localStorage.
- No se mezclan monedas (ARS vs USD) al comparar contra la compra.

## Archivos

- `src/lib/finance/entryTicker.ts` — detección de ticker
- `src/lib/finance/marketAlerts.ts` — reglas de alertas
- `src/components/finance/FinanceMarketAlerts.tsx` — UI
- `src/lib/finance/financePricesServer.ts` — `changePercent` en servidor
