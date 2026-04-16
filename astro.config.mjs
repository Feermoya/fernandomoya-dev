import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Tailwind v4 se integra vía plugin de Vite (no hace falta @astrojs/tailwind).
 * `site` es obligatorio para URLs canónicas y el sitemap.
 * Imágenes: `astro:assets` optimiza en build usando Sharp (ver `devDependencies`).
 */
export default defineConfig({
  site: 'https://example.com',
  compressHTML: true,
  /** Landing de una sola vista: sin prefetch de otras rutas. */
  prefetch: false,
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  },
  integrations: [react(), sitemap()],
});
