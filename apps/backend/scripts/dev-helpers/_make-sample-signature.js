/**
 * Generates a transparent PNG of a stylized cursive "signature" (placeholder used
 * to establish the signature size/position on the receipt templates — Phase 3
 * will replace it with the business owner's real signature image). Pure Node (no
 * image deps): draws a flowing curve into an RGBA buffer and hand-encodes a PNG.
 *
 *   node _make-sample-signature.js <out.png>
 */
const fs = require('fs');
const zlib = require('zlib');

const W = 440;
const H = 160;
const buf = Buffer.alloc(W * H * 4, 0); // transparent RGBA

const INK = [22, 33, 62]; // dark navy
function plot(x, y, a = 255) {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 4;
  if (a > buf[i + 3]) {
    buf[i] = INK[0];
    buf[i + 1] = INK[1];
    buf[i + 2] = INK[2];
    buf[i + 3] = a;
  }
}
// round brush
function dab(x, y, r) {
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d <= r) plot(x + dx, y + dy, Math.round(255 * (1 - (d / (r + 1)) * 0.4)));
    }
  }
}
function stroke(fn, t0, t1, steps, r) {
  let prev = null;
  for (let i = 0; i <= steps; i++) {
    const t = t0 + ((t1 - t0) * i) / steps;
    const [x, y] = fn(t);
    if (prev) {
      const dist = Math.hypot(x - prev[0], y - prev[1]);
      const n = Math.max(1, Math.ceil(dist));
      for (let k = 0; k <= n; k++) dab(prev[0] + ((x - prev[0]) * k) / n, prev[1] + ((y - prev[1]) * k) / n, r);
    }
    prev = [x, y];
  }
}

const cy = 92;
// A capital-ish opening loop.
stroke((t) => [40 + 55 * Math.sin(t), cy - 40 * Math.cos(t * 1.1) - 8 * t], 0, Math.PI * 1.7, 90, 2.6);
// Flowing cursive body (decaying oscillation, drifting right).
stroke((t) => [95 + t * 26, cy - 30 * Math.sin(t * 1.15) * Math.exp(-t * 0.06)], 0, 11.5, 260, 2.4);
// A mid loop.
stroke((t) => [250 + 26 * Math.cos(t), cy - 22 - 26 * Math.sin(t)], 0, Math.PI * 2, 80, 2.2);
// Trailing tail up.
stroke((t) => [300 + t * 20, cy - 8 - t * 9], 0, 5.5, 80, 2.2);
// Long underline swash.
stroke((t) => [30 + t * 380, cy + 34 + 10 * Math.sin(t * Math.PI)], 0, 1, 200, 2.0);

// --- encode PNG (RGBA, 8-bit) ---
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32(td) >>> 0, 0);
  return Buffer.concat([len, td, crc]);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // color type RGBA
// raw scanlines with filter byte 0
const raw = Buffer.alloc(H * (1 + W * 4));
for (let y = 0; y < H; y++) {
  raw[y * (1 + W * 4)] = 0;
  buf.copy(raw, y * (1 + W * 4) + 1, y * W * 4, (y + 1) * W * 4);
}
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw)),
  chunk('IEND', Buffer.alloc(0)),
]);
fs.writeFileSync(process.argv[2], png);
console.log(`sample signature written: ${process.argv[2]} (${W}x${H})`);
