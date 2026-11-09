// Foco PWA: no interceptar fetch. WebKit/iOS maneja directamente la red.
// Mantener el SW activo conserva la instalación sin guardar HTML ni datos financieros.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
