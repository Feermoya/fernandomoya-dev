# Etapa 03, sistema visual mobile

## Objetivo

Crear la base visual del panel usando datos mock.

Todavía no conectar las pantallas a los datos reales de Supabase.

Leer:

`docs/cobros/00-mvp.md`

y las etapas anteriores.

## 1. Mobile first estricto

Diseñar primero para:

320 px
360 px
375 px
390 px
430 px

No diseñar primero desktop.

No utilizar tablas para representar clientes o cobros.

No crear breakpoints innecesarios.

## 2. Desktop

En pantallas grandes mantener la aplicación centrada.

Usar un ancho máximo apropiado para conservar la experiencia mobile.

Referencia aproximada:

480 a 600 px.

Elegir el valor según el diseño final.

No expandir cards hasta ocupar monitores completos.

## 3. App Shell

Crear el layout principal del panel.

Debe incluir:

- Área segura superior
- Header
- Contenido
- Navegación inferior fija
- Safe area para dispositivos iOS

La navegación inferior tendrá inicialmente:

- Inicio
- Cobros
- Clientes

Evaluar una cuarta opción únicamente si tiene una función concreta dentro del MVP.

## 4. Componentes

Utilizar shadcn/ui cuando tenga sentido.

Crear componentes reutilizables del dominio cuando shadcn no cubra el caso.

Ejemplos:

`SummaryCard`
`PaymentStatusBadge`
`ClientListItem`
`PaymentListItem`
`BottomNavigation`
`PanelHeader`
`CurrencyAmount`
`EmptyState`

Evitar componentes gigantes.

## 5. Estados visuales

Debe distinguirse rápidamente:

Pagado.

Pendiente.

Vencido.

No corresponde aún.

No depender únicamente del color.

Usar texto, badge o iconografía.

## 6. Interacción táctil

Los elementos interactivos deben tener áreas cómodas para tocar.

Evitar botones pequeños.

Las acciones secundarias pueden utilizar Sheet, Drawer o menús cuando corresponda.

## 7. Datos mock

Crear una fuente mock pequeña con clientes representativos.

Incluir ejemplos de:

- ARS
- USD
- Pagado
- Pendiente
- Vencido
- Mes actual
- Mes vencido

No duplicar estos mocks en múltiples componentes.

## 8. Alcance

En esta etapa crear únicamente:

- App shell
- Navegación
- Tokens visuales necesarios
- Componentes base reutilizables
- Una pantalla mínima que permita evaluar el sistema visual

No desarrollar todavía toda la funcionalidad de Dashboard, Cobros y Clientes.

## 9. Calidad

Verificar:

- Sin overflow horizontal
- Sin textos cortados
- Montos grandes
- Nombres largos
- Safe areas
- Scroll correcto
- Bottom navigation sin tapar contenido
- Touch targets adecuados

## 10. Entregable

Al terminar informar:

- Archivos creados
- Componentes creados
- Componentes shadcn utilizados
- Decisiones visuales tomadas
- Capturas o forma de revisar la pantalla
- Problemas encontrados

No avanzar a la etapa 04.