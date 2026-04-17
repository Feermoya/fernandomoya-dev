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
 * En Vercel: definí PUBLIC_SITE_URL (ej. https://tu-app.vercel.app o tu dominio).
 * Si no está, se usa VERCEL_URL en build (preview/prod en Vercel).
 * Imágenes: `astro:assets` optimiza en build usando Sharp (ver `devDependencies`).
 */
const siteUrl =
  process.env.PUBLIC_SITE_URL?.replace(/\/$/, '') ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://example.com');

export default defineConfig({
  site: siteUrl,
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
