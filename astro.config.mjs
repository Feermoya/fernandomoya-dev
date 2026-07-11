import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function financePricesDevPlugin() {
  return {
    name: 'finance-prices-dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const urlPath = req.url?.split('?')[0] ?? '';
        if (urlPath !== '/api/finance-prices') return next();

        try {
          const fullUrl = new URL(req.url ?? '/', 'http://localhost');
          const tickers = fullUrl.searchParams.get('tickers') ?? '';
          const { buildFinancePricesResponse, FINANCE_PRICES_CACHE_HEADERS } =
            await server.ssrLoadModule('/src/lib/finance/financePricesServer.ts');
          const body = await buildFinancePricesResponse(tickers);
          res.statusCode = body.error === 'Parámetro tickers vacío' ? 400 : 200;
          Object.entries(FINANCE_PRICES_CACHE_HEADERS).forEach(([k, v]) => {
            res.setHeader(k, v);
          });
          res.end(JSON.stringify(body));
        } catch (e) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(
            JSON.stringify({
              ok: false,
              prices: {},
              fetchedAt: new Date().toISOString(),
              error: e instanceof Error ? e.message : 'Error interno',
            }),
          );
        }
      });
    },
  };
}

/**
 * Tailwind v4 se integra vía plugin de Vite (no hace falta @astrojs/tailwind).
 * `site` es obligatorio para URLs canónicas y el sitemap.
 * En Vercel: definí PUBLIC_SITE_URL (ej. https://tu-app.vercel.app o tu dominio).
 * Si no está, se usa VERCEL_URL en build (preview/prod en Vercel).
 * Imágenes: `astro:assets` optimiza en build usando Sharp (ver `devDependencies`).
 */
const siteUrl =
  process.env.PUBLIC_SITE_URL?.replace(/\/$/, '') ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://www.fermoyadev.com.ar');

export default defineConfig({
  site: siteUrl,
  compressHTML: true,
  /** Landing de una sola vista: sin prefetch de otras rutas. */
  prefetch: false,
  vite: {
    plugins: [tailwindcss(), financePricesDevPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  },
  integrations: [
    react(),
    sitemap({
      filter: (page) => !page.includes('/precios') && !page.includes('/foco-financiero'),
    }),
  ],
});
