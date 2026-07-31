# Cartera inicial / histórica

Posiciones compradas fuera de Foco. **No** son `FinanceEntry` mensuales.

| Archivo | Rol |
|---------|-----|
| `types.ts` | Holdings + consolidación + búsqueda |
| `validateHolding.ts` | Normalización y validación |
| `mergeHoldings.ts` | Combinar / reemplazar / ignorar |
| `csvImport.ts` | CSV local + preview |
| `consolidate.ts` | Entries + holdings por ticker |
| `symbolSearch.ts` | Adaptador Yahoo search |

Uso: alertas de mercado y panel Posiciones. No afecta objetivo, racha ni niveles.
