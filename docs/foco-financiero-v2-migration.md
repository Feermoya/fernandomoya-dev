# Foco financiero 2.0 — migración segura

## Hallazgos comprobados en main (2026-10-29)

- `src/lib/finance/cloudSync.ts` consulta `/api/finance-cloud` para lectura/escritura.
- `src/hooks/finance/useFinancePersistence.ts` persiste en localStorage y hace POST remoto diferido 600 ms, reemplazando el estado completo.
- `src/hooks/finance/useFinanceCloudSync.ts` lee caché local si falla el arranque remoto y puede subir cambios locales pendientes.
- `src/lib/finance/storage.ts` usa una fila canónica y conserva identificadores legacy; el estado contiene inversiones, objetivos, retos, plan y cartera.
- El dashboard espera `cloudReady`, pero el modo offline actual puede mostrar y editar datos locales.

## Condiciones antes de modificar persistencia

1. Obtener backup verificable del JSON remoto canónico y filas legacy, con fecha, hash y conteos; no guardar credenciales en el repositorio.
2. Comprobar autorización del endpoint remoto: el ID fijo no es autenticación. Impedir lectura/escritura pública de datos financieros.
3. Evitar reemplazos concurrentes: control optimista de versión (`updated_at`/revision) y error 409, o transacciones atómicas por operación.
4. No habilitar edición si Supabase no está disponible; mostrar estado de solo lectura/error y permitir reintento.
5. Eliminar el guardado local de datos financieros **solo después** de verificar recuperación remota y compatibilidad con el historial existente. Mantener estado efímero React.
6. Conservar todos los campos de `FinanceState` durante migraciones; probar export/import y lectura de datos antiguos.
7. Los cambios del selector de mes son preferencias de interfaz; no deben provocar escrituras innecesarias de todo el historial.

## Rediseño responsive

- Mantener Astro/React, Tailwind y lucide-react existentes.
- Mobile: resumen mensual, plan de foco, alertas, importar operaciones, últimas inversiones, ajustes secundarios.
- Desktop: grilla de contenido y panel lateral, cards sin ancho excesivo, sin duplicar componentes montados.
- Preservar accesibilidad, indicadores de sincronización, precios, logos, niveles y rachas.

## Importador Balanz

- Parsear PDF en memoria y generar vista previa de operaciones.
- Identificar fecha, número de boleto, ticker, tipo (compra/venta), nominales, moneda, precio y total.
- Deduplicar secciones repetidas dentro del PDF por identificador de operación.
- Deduplicar contra operaciones previamente importadas en Supabase y contrastar con registros manuales históricos.
- Nunca inferir que una venta es un aporte negativo ni contabilizar reinversiones como dinero nuevo sin una regla definida.
- Confirmación explícita antes de escribir; importación idempotente y transaccional.
- Conservar archivo de origen solo si existe necesidad justificada; preferir hash/identificadores y datos estructurados.

## Septiembre de 2026

- Conciliar el extracto contra los registros reales de Supabase antes de agregar entradas.
- Presentar: nuevas, duplicadas, ambiguas, ventas, compras y total por moneda.
- No ejecutar escritura masiva sin verificar que no duplica movimientos ya cargados.

## Validaciones de release

- Tests de normalización, parser y deduplicación; pruebas de concurrencia y fallo de red.
- Build, typecheck y pruebas de regresión.
- Validar visualmente mobile y desktop antes de promover a main.
- Publicar por etapas con rollback documentado.
