# Instalación de Foco Financiero

Foco cuenta con un manifiesto, service worker de red y botones para instalación,
sin librerías adicionales ni cambios en la autenticación.

- Chrome Android y Chromium compatible: el botón **Instalar** abre el diálogo
  nativo cuando el navegador ofrece beforeinstallprompt.
- iPhone: el botón muestra **Compartir → Agregar a pantalla de inicio → Abrir como app**.
  Apple no ofrece una API para instalar automáticamente desde la página.
- Otros navegadores: instrucciones del menú correspondiente.
- La instalación usa la misma cuenta Supabase y no guarda datos privados offline.

## Cambiar el ícono sin modificar FM

Colocar un PNG cuadrado (idealmente 1024×1024) en
\`public/foco/logo-custom.png\`. Tiene prioridad sobre el logo SVG de ejemplo,
\`public/foco/logo.svg\`. Los archivos iOS, Android, maskable y favicon
se generan automáticamente con \`npm run dev\`, \`npm run build\` o
\`npm run finance:icons\`.

El manifiesto conserva su ID anterior para evitar duplicados.
iOS puede mantener el ícono antiguo en los accesos existentes:
si ocurre, eliminá el acceso anterior y agregá la app nuevamente.
