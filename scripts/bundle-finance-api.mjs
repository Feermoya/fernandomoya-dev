import * as esbuild from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const shared = {
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  logLevel: 'info',
  packages: 'external',
  alias: {
    '@': path.join(root, 'src'),
  },
};

const entries = [
  {
    entry: path.join(root, 'api/finance-prices.entry.ts'),
    outfile: path.join(root, 'api/finance-prices.mjs'),
  },
  {
    entry: path.join(root, 'api/finance-keepalive.entry.ts'),
    outfile: path.join(root, 'api/finance-keepalive.mjs'),
  },
];

for (const { entry, outfile } of entries) {
  await esbuild.build({
    ...shared,
    entryPoints: [entry],
    outfile,
  });
  console.log(`Bundled ${path.relative(root, outfile)}`);
}
