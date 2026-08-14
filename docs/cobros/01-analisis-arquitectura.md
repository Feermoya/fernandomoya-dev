# Etapa 01, análisis e integración técnica

## Objetivo

Analizar el proyecto existente y preparar la arquitectura del nuevo panel sin implementar todavía la funcionalidad de negocio.

Leer primero:

`docs/cobros/00-mvp.md`

Ese documento es la fuente de verdad funcional.

## 1. Analizar el proyecto actual

Antes de modificar código revisar:

- Versión de Astro
- Configuración de Tailwind
- Integraciones existentes
- Estructura de `src`
- Layouts
- Componentes
- Rutas
- Dependencias
- Configuración de Supabase si existe
- Autenticación existente si existe
- Uso actual de React, Vue, Svelte u otros frameworks
- Variables de entorno
- Middleware
- Convenciones de nombres
- Alias de imports
- Configuración TypeScript

No asumir estructura ni dependencias.

## 2. Definir ubicación del panel

Proponer la ruta más coherente dentro del proyecto.

Preferencia inicial:

`/panel`

Subrutas esperadas:

`/panel`
`/panel/cobros`
`/panel/clientes`
`/panel/clientes/[id]`

No implementar estas rutas todavía si hacerlo implica avanzar sobre etapas posteriores.

## 3. shadcn/ui

Comprobar la forma correcta de integrar shadcn/ui con la configuración existente.

No reinstalar Tailwind si ya está configurado.

No modificar innecesariamente estilos globales de la web pública.

El panel debe mantener sus componentes y estilos lo más aislados posible.

Identificar qué componentes de shadcn/ui serían útiles.

Ejemplos esperados:

- Card
- Badge
- Button
- Input
- Select
- Sheet o Drawer
- Dialog
- Tabs
- Dropdown Menu
- Skeleton

No instalar componentes que todavía no tengan uso previsto.

## 4. React

Determinar si el proyecto ya utiliza React.

Si no está instalado, indicar qué componentes del panel justificarían incorporarlo.

Astro seguirá siendo la tecnología principal.

No convertir páginas estáticas a React.

Utilizar islands únicamente para interactividad.

## 5. Estructura propuesta

Evaluar una estructura similar a:

`src/components/panel/`
`src/components/panel/ui/`
`src/components/panel/dashboard/`
`src/components/panel/clients/`
`src/components/panel/payments/`

`src/layouts/PanelLayout.astro`

`src/lib/supabase/`

`src/types/`

La estructura definitiva debe respetar las convenciones existentes del repositorio.

## 6. Restricciones

En esta etapa NO:

- Crear modelo definitivo de Supabase
- Crear tablas
- Implementar dashboard
- Implementar clientes
- Implementar cobros
- Implementar autenticación
- Crear datos mock extensos
- Modificar páginas públicas
- Rediseñar la web existente

## 7. Resultado esperado

Al terminar devolver:

1. Estado actual relevante del proyecto.
2. Dependencias que ya sirven.
3. Dependencias nuevas necesarias.
4. Arquitectura propuesta.
5. Archivos que sería necesario crear.
6. Archivos existentes que sería necesario modificar.
7. Riesgos o incompatibilidades encontradas.
8. Decisiones que necesitan aprobación.

No avanzar a la etapa 02.

Esperar confirmación.