/**
 * Genera íconos PWA exclusivos de Foco Financiero.
 * Para personalizar, colocá public/foco/logo-custom.png (cuadrado, preferiblemente 1024px).
 * Tiene prioridad sobre public/foco/logo.svg.
 */
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'public', 'foco');
const custom = path.join(dir, 'logo-custom.png');
const source = existsSync(custom) ? custom : path.join(dir, 'logo.svg');
if (!existsSync(source)) throw new Error('Falta el logo de Foco Financiero');
mkdirSync(dir, { recursive: true });
for (const size of [16, 32, 180, 192, 512]) {
  const name = size === 180 ? 'apple-touch-icon.png'
    : size <= 32 ? 'favicon-' + size + '.png' : 'icon-' + size + '.png';
  await sharp(source).resize(size, size, { fit: 'cover' }).png({ compressionLevel: 9 })
    .toFile(path.join(dir, name));
}
const safe = await sharp(source).resize(370, 370, {
  fit: 'contain', background: '#0B1646',
}).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#0B1646' } })
  .composite([{ input: safe, top: 71, left: 71 }]).png({ compressionLevel: 9 })
  .toFile(path.join(dir, 'icon-512-maskable.png'));
console.log('Foco PWA icons generated from ' + path.relative(root, source));
