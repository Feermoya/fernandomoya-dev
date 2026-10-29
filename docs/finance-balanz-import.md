# Importación de operaciones Balanz

## Alcance implementado

- Botón junto al formulario existente. No cambia el layout de Foco ni agrega gráficos o alertas.
- Extracción local mediante PDF.js (carga diferida, worker del mismo paquete servido por Vite). El PDF original no se transmite ni se conserva.
- Máximo 12 MB y 100 páginas. Validación de extensión, MIME, firma, texto, formato, fechas, nominales, precio y bruto.
- Compras y ventas ARS/USD, decimales argentinos, nominales fraccionarios y fechas de concertación/liquidación.
- Clave estable `balanz:boleto:ticker:BUY|SELL`. No depende de la página ni del orden.
- El extracto repite boletos en instrumentos y monedas. Las patas en ARS de operaciones USD se excluyen. El neto de la cuenta en la misma moneda prevalece sobre el total de instrumentos. Si falta el neto USD se informa y se conserva el bruto, sin inventar conversiones.
- Saldos, depósitos, dividendos, transferencias y rescates no entran al historial de compraventas.
- Rechaza boletos incompletos o contradictorios, sin importar un subconjunto silenciosamente.

## Conciliación

Consulta la fila canónica de Supabase para cada revisión. Las coincidencias por identificador externo se bloquean. Las manuales requieren ticker, compra/venta, fecha argentina, moneda, nominales, monto y precio. Tolerancias: monto hasta 1% (comisiones/redondeo), precio hasta 0,5%, nominales 1e-8 relativo. No compara por ticker/mes únicamente.

Posibles registros agrupados o evidencia incompleta pasan a revisión. Si varios boletos compiten por la misma entrada manual, ninguno se omite automáticamente. La UI muestra candidatos y exige declarar explícitamente que se trata de una operación distinta antes de seleccionarla.

La confirmación vuelve a consultar Supabase. Si cambió la versión, presenta otra revisión. El servidor repite la conciliación independientemente del navegador.

## Persistencia y compatibilidad

`/api/finance-balanz` requiere la cookie firmada del panel existente y rechaza envíos cross-site. Hace una lectura fresca y un PATCH condicionado por `updated_at`. Añade registros a `entries` y conserva el JSON completo, incluidos campos desconocidos. No crea ni migra filas ni reemplaza tablas. Ante conflicto devuelve 409. Ante fallo no anuncia éxito. Si la respuesta se pierde después del commit, reimportar reconoce los mismos identificadores.

Los guardados normales de `/api/finance-cloud` y los jobs automáticos ahora también requieren la versión que leyeron. Los clientes antiguos sin versión reciben 409 y deben recargar. Las versiones de UI se asocian a cada snapshot en memoria, nunca se toman de otra pestaña por localStorage. La fila canónica tiene prioridad frente a las legacy, que se conservan.

Las compras mantienen `type: investment`. Las ventas usan `investment_sale`, importe positivo y metadatos de origen opcionales. Las ventas se muestran en movimientos, sin restarse de la misión ni computarse como ganancias. El editor normal no modifica boletos importados. Las compras USD quedan fuera del objetivo monetario ARS. También se corrigió el desglose mensual por ticker para no mezclar monedas. El plan de foco sigue usando las reglas existentes por ticker. Las compras miden operaciones de inversión, no aportes netos de fondos externos.

El modelo, la caché y la sincronización existentes se mantienen. No es una migración a persistencia exclusivamente remota. Los datos locales no se eliminan. Un conflicto de un guardado normal no se resuelve con una fusión automática destructiva.

## Habilitación y release

`FINANCE_BALANZ_IMPORT_ENABLED=true` es obligatorio para permitir escrituras del importador. Por defecto está deshabilitado. No se configuró esta variable en producción.

Antes de habilitar y publicar:

1. Autorizar el equipo correcto en Vercel y obtener el respaldo completo de filas canónica/legacy, esquema y permisos. Verificar hashes, conteos y restauración en un entorno aislado. El respaldo de la fila canónica ya obtenido es parcial.
2. Confirmar el trigger de `updated_at`, probar lectura/PATCH con conflicto en un entorno no productivo y revisar permisos RLS. La política anon abierta del SQL histórico no queda subsanada por este importador.
3. Resolver los errores TypeScript preexistentes y verificar la experiencia en navegador mobile/desktop, sesión/PIN y worker PDF.js. No usar credenciales productivas en previews.
4. Habilitar la variable únicamente después de esas comprobaciones. Desplegar y verificar la versión exacta. No ejecutar importaciones reales sin la revisión de operaciones de la UI.

Rollback: deshabilitar la variable detiene nuevas importaciones. No restaurar un backup encima de datos nuevos ni borrar entradas importadas masivamente. Revertir código tras conservar un nuevo respaldo y comprobar compatibilidad del historial.

## Verificación realizada

- `npm test`: parser, normalización, conciliación, idempotencia, lote parcial, preservación, monedas, autorización, fallo de Supabase y conflictos CAS, junto con las pruebas previas.
- PDF.js ejecutado sobre el PDF adjunto fuera del repositorio: 17 operaciones únicas, 11 compras y 6 ventas, sin advertencias. También se contrastó con la extracción Poppler. Ni el PDF ni texto personal se agregan a Git.
- `npm run build`: completado. Reejecutar después del último cambio antes de publicar.
- `npm run typecheck`: errores preexistentes en LevelUpOverlay, levels, whatsappJobs, panel/payments/register y smooth-scroll. Se comparó con una worktree de HEAD inicial y no había diferencias en la salida antes de añadir las últimas pruebas. No se tocaron esos problemas ajenos al alcance.
- QA visual local: no completada. El servidor dev anunció disponibilidad pero la conexión local fue rechazada. No equivale a una verificación en iPhone real.
- No se modificaron registros productivos ni se desplegó esta implementación.
