# Precios del Plan de foco (Google Finance + Yahoo Finance)

El módulo **Foco financiero** obtiene precios de referencia **dinámicamente** en el servidor. No usa Google Sheets, CSV ni carga manual obligatoria.

## Qué NO se persiste

Los precios y logos **no se guardan** en:

- base de datos
- `localStorage`
- cloud sync
- `FinanceState`

El estado persistido del plan solo incluye datos estables (`id`, `month`, `label`, `matchTerms`, `createdAt`, `targetUnits?`). El campo `referencePrice?` puede existir como **fallback manual legacy**, pero la app **no escribe ahí** precios leídos desde Google Finance ni Yahoo Finance.

Los precios viven solo en **estado local de React** (`useState`) mientras el componente está montado.

## Cómo funciona

1. Pegás tickers en el **Plan de foco** (ej. `GOOGL`, `MU`, `NVDA`, `BTC`).
2. El cliente llama al endpoint interno:

   ```
   GET /api/finance-prices?tickers=GOOGL,MU,NVDA,BTC
   ```

3. El endpoint consulta según el tipo de activo:

   **CEDEARs / acciones en BCBA (Google Finance):**

   ```
   https://www.google.com/finance/beta/quote/GOOGL:BCBA?hl=es
   ```

   **Cripto (Yahoo Finance, USD):**

   ```
   https://es.finance.yahoo.com/quote/BTC-USD/
   ```

   El precio de cripto se obtiene server-side vía la API pública de chart de Yahoo (`query1.finance.yahoo.com`), equivalente al valor de la página de cotización.

4. Parsea la respuesta server-side y devuelve JSON temporal con `price`, `currency`, `logoUrl?`.
5. La UI muestra logo (si existe), precio en cada chip y calcula el **Pendiente estimado** para CEDEARs no comprados este mes (solo ARS).

## Actualizar precios

El botón **Actualizar precios** vuelve a consultar `/api/finance-prices`. Si Google Finance o Yahoo cambiaron el valor, la app refleja el nuevo precio al actualizar.

No hay polling agresivo: fetch al cargar/cambiar tickers + botón manual.

## Cache HTTP (no persistencia)

El endpoint responde con:

```
Cache-Control: public, s-maxage=900, stale-while-revalidate=3600
```

Esto es **cache temporal HTTP** (~15 minutos en el edge), no base de datos. Puede hacer que el precio no cambie segundo a segundo hasta refrescar o expirar el cache.

## Logos

Los logos son **opcionales** y vienen en la respuesta del endpoint (`logoUrl`). Se intentan extraer del HTML de Google Finance / Yahoo Finance. Si no hay logo confiable, la UI muestra un círculo con la inicial del ticker (ej. `GOOGL → G`).

Los logos **no se guardan** en ningún lado.

## Limitaciones

- Google Finance y Yahoo Finance **no son APIs oficiales**; si cambian el HTML/JSON, el parser puede romperse hasta ajustarlo.
- Si un ticker no existe en BCBA, no tendrá precio ARS.
- Cripto se muestra en **USD** y no suma al pendiente estimado en ARS.
- No hay cotización en tiempo real garantizada; es referencia para planificar.

## Archivos relevantes

| Archivo | Rol |
|---------|-----|
| `api/finance-prices.mjs` | Endpoint serverless en Vercel (bundle generado en `npm run build`) |
| `api/finance-prices.entry.ts` | Fuente del handler para el bundle |
| `src/lib/finance/financePricesServer.ts` | Lógica compartida del endpoint |
| `src/lib/finance/googleFinanceParse.ts` | Parser Google Finance (precio + logo) |
| `src/lib/finance/yahooFinanceParse.ts` | Parser Yahoo Finance (cripto) |
| `src/lib/finance/tickerPricing.ts` | Detección cripto vs CEDEAR |
| `src/lib/finance/financePrices.ts` | Cliente fetch desde React |
| `src/lib/finance/monthlyInvestmentPlan.ts` | Cálculo de pendiente estimado |
| `src/components/finance/FinanceMonthlyInvestmentPlan.tsx` | Estado local de precios + UI |

## Formato de precio

Google Finance (BCBA) muestra valores argentinos como:

```
$ 55.725,00
```

El parser los convierte a número entero ARS: `55725`.

Yahoo Finance (cripto) devuelve USD, ej. `76483.35` para `BTC-USD`.

## Fallback manual

Si falla Google Finance / Yahoo, los chips muestran **Sin precio** y el resumen indica error. Opcionalmente puede usarse un `referencePrice` guardado manualmente en el estado (legacy) como fallback interno — nunca se escribe automáticamente desde el endpoint.
