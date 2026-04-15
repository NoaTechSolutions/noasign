import sharp from 'sharp';
import { stat } from 'fs/promises';
import path from 'path';

const dir = 'apps/frontend/public/img';
const images = ['hero-3d', 'security-3d', 'workflow-3d', 'devices-3d'];

const fmt = (bytes) => (bytes / 1024 / 1024).toFixed(2) + ' MB';

for (const name of images) {
  const input = path.join(dir, `${name}.png`);
  const output = path.join(dir, `${name}.webp`);

  const before = (await stat(input)).size;

  await sharp(input)
    .webp({ quality: 80 })
    .resize(1200, null, { withoutEnlargement: true })
    .toFile(output);

  const after = (await stat(output)).size;
  const saving = ((1 - after / before) * 100).toFixed(0);

  console.log(`✓ ${name}.png (${fmt(before)}) → ${name}.webp (${fmt(after)}) — ${saving}% smaller`);
}
