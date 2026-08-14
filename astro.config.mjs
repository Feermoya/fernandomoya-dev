import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function financeApiDevPlugin() {
  return {
    name: 'finance-api-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const urlPath = req.url?.split('?')[0] ?? '';

        if (urlPath === '/api/finance-prices') {
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
          return;
        }

        if (urlPath === '/api/finance-keepalive' || urlPath === '/api/finance-cloud') {
          try {
            const modPath =
              urlPath === '/api/finance-keepalive'
                ? path.resolve(__dirname, 'api/finance-keepalive.mjs')
                : path.resolve(__dirname, 'api/finance-cloud.mjs');
            const mod = await import(/* @vite-ignore */ modPath);
            const handler = mod.default;
            const fullUrl = new URL(req.url ?? '/', 'http://localhost');

            let parsedBody = undefined;
            if (req.method === 'POST') {
              const chunks = [];
              for await (const chunk of req) {
                chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
              }
              const raw = Buffer.concat(chunks).toString('utf8');
              try {
                parsedBody = raw ? JSON.parse(raw) : null;
              } catch {
                parsedBody = raw;
              }
            }

            const fakeReq = {
              method: req.method,
              query: Object.fromEntries(fullUrl.searchParams.entries()),
              body: parsedBody,
            };

            const fakeRes = {
              statusCode: 200,
              headers: {},
              setHeader(k, v) {
                this.headers[k] = v;
              },
              status(code) {
                this.statusCode = code;
                return this;
              },
              json(body) {
                res.statusCode = this.statusCode;
                Object.entries(this.headers).forEach(([k, v]) => res.setHeader(k, v));
                if (!this.headers['Content-Type']) {
                  res.setHeader('Content-Type', 'application/json; charset=utf-8');
                }
                res.end(JSON.stringify(body));
              },
            };

            await handler(fakeReq, fakeRes);
          } catch (e) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(
              JSON.stringify({
                ok: false,
                error: e instanceof Error ? e.message : 'Error interno',
              }),
            );
          }
          return;
        }

        return next();
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
  /**
   * Static por defecto (portfolio prerenderizado).
   * Las rutas `/panel/*` optan a SSR con `export const prerender = false`.
   * El adapter de Vercel habilita on-demand rendering sin convertir todo el sitio.
   */
  adapter: vercel(),
  compressHTML: true,
  /**
   * Dev Toolbar: desactivada en este proyecto.
   * Motivo: en Astro 6 + Vite 7 dispara 404 de sourcemaps, re-optimizaciones
   * y errores WebSocket/HMR (`failed to connect to websocket`, `send` undefined)
   * que no aportan al flujo del panel. Preferimos `npm run dev` estable.
   * React 19 / jsxDEV se mantiene con NODE_ENV=development + optimizeDeps.
   */
  devToolbar: {
    enabled: false,
  },
  /** Landing de una sola vista: sin prefetch de otras rutas. */
  prefetch: false,
  vite: {
    plugins: [tailwindcss(), financeApiDevPlugin()],
    resolve: {
      // Una sola copia de React en client/SSR (evita runtimes JSX cruzados).
      dedupe: ['react', 'react-dom'],
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    optimizeDeps: {
      // Prebundle explícito en modo development.
      // Si una dep se descubre mid-session, Vite re-optimiza → 504 Outdated
      // Optimize Dep → fallan islands (HeroShowcase) y React 19 deja
      // jsxDEV = void 0 si el cache se regeneró con NODE_ENV=production.
      include: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'react-dom/client',
        'chart.js',
        'gsap',
        'gsap/ScrollTrigger',
        'lenis',
        'lucide-react',
        'sileo',
      ],
    },
    server: {
      watch: {
        // Builds a .vercel/dist no deben disparar program reload ni
        // re-optimizar deps (puede pisar el cache de jsx-dev-runtime).
        ignored: ['**/.vercel/**', '**/dist/**'],
      },
    },
  },
  integrations: [
    react(),
    sitemap({
      filter: (page) =>
        !page.includes('/precios') &&
        !page.includes('/foco-financiero') &&
        !page.includes('/panel') &&
        !page.includes('/admin'),
    }),
  ],
});
