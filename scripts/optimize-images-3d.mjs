// Regenerate responsive WebP + PNG variants from upscaled source PNGs.
// Run from repo root: node scripts/optimize-images-3d.mjs
// Requires sharp (installed in apps/frontend/node_modules)

import { createRequire } from 'module';
const require = createRequire(import.meta.url + '/../apps/frontend/');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const dir = 'apps/frontend/public/img';
const images = ['security-3d', 'workflow-3d', 'devices-3d'];
const sizes = [
  { suffix: '-sm',  width: 600,  quality: 90 },
  { suffix: '-md',  width: 900,  quality: 92 },
  { suffix: '-lg',  width: 1400, quality: 95 },
  { suffix: '-xl',  width: 1800, quality: 95 },
];
const fmt = (b) => (b / 1024).toFixed(0) + ' KB';

for (const name of images) {
  const input = path.join(dir, `${name}.png`);
  const origSize = fs.statSync(input).size;
  console.log(`\n${name}.png source: ${(origSize/1024/1024).toFixed(1)} MB`);

  for (const s of sizes) {
    const outW = path.join(dir, `${name}${s.suffix}.webp`);
    const outP = path.join(dir, `${name}${s.suffix}.png`);

    await sharp(input)
      .resize(s.width, null, { withoutEnlargement: true, fit: 'inside' })
      .webp({ quality: s.quality, effort: 6 })
      .toFile(outW);

    await sharp(input)
      .resize(s.width, null, { withoutEnlargement: true, fit: 'inside' })
      .png({ compressionLevel: 8 })
      .toFile(outP);

    console.log(`  ${s.suffix.slice(1).padEnd(2)} → webp: ${fmt(fs.statSync(outW).size).padStart(7)}  png: ${fmt(fs.statSync(outP).size).padStart(7)}`);
  }
  console.log(`✓ ${name} — 4 variantes generadas`);
}
