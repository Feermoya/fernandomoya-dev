# Panel de cobros, definición del MVP

## 1. Objetivo

Crear dentro del sitio actual un panel privado para gestionar clientes recurrentes y sus cobros mensuales.

El sistema reemplazará la planilla utilizada actualmente para controlar manualmente quién pagó, quién debe pagar y cuándo corresponde cobrar a cada cliente.

Debe priorizar rapidez, claridad y uso desde celular.

No es un sistema contable.

No es un sistema de facturación.

No es un gestor financiero personal.

Es un sistema simple de seguimiento de clientes y cobros recurrentes.

## 2. Tecnología existente

El panel debe integrarse dentro del proyecto actual.

Stack base:

- Astro 6
- Tailwind CSS v4
- Supabase
- shadcn/ui para componentes interactivos cuando corresponda

No crear un proyecto independiente.

No reemplazar Astro.

No migrar la web completa a React.

React debe utilizarse únicamente cuando un componente interactivo lo justifique.

## 3. Principio de diseño

La interfaz es 100% mobile first.

El panel debe diseñarse desde 320 px en adelante.

No crear una tabla desktop que después se adapte a mobile.

No utilizar tablas HTML para el listado principal de cobros.

Los datos deben representarse mediante cards, listas, badges y componentes táctiles.

En pantallas grandes, mantener la experiencia mobile dentro de un contenedor centrado.

No crear una segunda interfaz específica para desktop.

## 4. Preguntas que debe responder

Al abrir el panel debo entender rápidamente:

1. Quién ya me pagó.
2. Quién tiene que pagarme.
3. Quién está vencido.
4. A quién todavía no corresponde cobrarle.
5. Cuánto cobré durante el período actual.
6. Cuánto tengo pendiente de cobrar.
7. Cuándo corresponde cobrar a cada cliente.

## 5. Clientes

Cada cliente debe tener como mínimo:

- Nombre
- Estado activo o inactivo
- Importe habitual
- Moneda
- Modalidad de cobro
- Día habitual de vencimiento
- Fecha de inicio
- Nota opcional

Monedas iniciales:

- ARS
- USD

Modalidades iniciales:

- Mes actual
- Mes vencido

## 6. Cobros

El sistema trabaja por períodos mensuales.

Ejemplo:

Agosto 2026.

Cada obligación de cobro debe relacionarse con:

- Cliente
- Período
- Importe
- Moneda
- Fecha esperada de cobro
- Estado
- Pago asociado cuando exista

Estados funcionales:

- No corresponde aún
- Pendiente
- Vencido
- Pagado

Siempre que sea viable, estos estados deben derivarse de las fechas, configuración del cliente y existencia de un pago.

Evitar guardar información redundante que pueda calcularse.

## 7. Pagos

Al registrar un pago guardar:

- Cliente
- Período correspondiente
- Fecha del pago
- Importe
- Moneda
- Método de pago opcional
- Nota opcional

Registrar un pago debe actualizar inmediatamente la información visible del cliente y del dashboard.

## 8. Dashboard

Debe mostrar:

- Cobrado este mes
- Pendiente
- Vencido
- Próximos cobros
- Progreso de cobros del período
- Últimos movimientos

Los importes ARS y USD no deben sumarse como si fueran la misma moneda.

No realizar conversiones automáticas durante el MVP.

## 9. Pantallas del MVP

El MVP tendrá:

- Inicio
- Cobros
- Clientes
- Detalle de cliente
- Registrar pago
- Crear cliente
- Editar cliente

La navegación principal será inferior y estará optimizada para uso táctil.

## 10. Fuera del MVP

No implementar:

- Gastos personales
- Presupuestos
- Facturación
- ARCA
- Mercado Pago
- Integraciones bancarias
- WhatsApp
- Recordatorios automáticos
- Notificaciones push
- Conversión automática USD/ARS
- Cotización del dólar
- Reportes contables
- Gestión de proyectos
- Roles empresariales
- Equipos
- Multiusuario
- Aplicación nativa

## 11. Criterio general

Ante una decisión entre agregar funcionalidad o mantener el sistema simple, priorizar simplicidad.

No agregar features que no estén definidas en este documento.

Si durante una etapa aparece una decisión que modifica estas reglas, detenerse e informarla antes de implementarla.