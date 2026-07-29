# Entry / carga de inversiones

Lógica y UI del alta de movimientos de inversión.

## Carpetas

| Ruta | Contenido |
|------|-----------|
| `src/lib/finance/entry/` | Dominio: modos monto/nominales, build de entry, resumen post-carga |
| `src/components/finance/entry/` | UI: formulario, toggle de modo, tarjeta de resumen |
| `src/hooks/finance/useFinanceCelebrations.ts` | Persistencia + toast + LevelUp + `loadSummary` |

## Modos de carga

- **Monto** — el usuario indica ARS; si hay ticker se estima `estimatedUnits`.
- **Nominales** — el usuario indica unidades + ticker; se consulta precio y se calcula `amount = units × price` (solo ARS).

## API pública

```ts
import {
  buildInvestmentEntry,
  buildEntryLoadSummary,
  fetchTickerPriceForEntry,
} from '@/lib/finance/entry';

import {
  FinanceEntryForm,
  FinanceEntryLoadSummaryCard,
} from '@/components/finance/entry';
```

El re-export `components/finance/FinanceEntryForm.tsx` se mantiene por compatibilidad.
