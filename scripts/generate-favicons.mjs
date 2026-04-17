// Run from apps/frontend/: node ../../scripts/generate-favicons.mjs
import { createRequire } from "node:module";
const require = createRequire(import.meta.url + "/../apps/frontend/");
const sharp = require("sharp");

const src = "public/img/favicon-source.png";

const sizes = [
  { size: 16, path: "public/favicon-16x16.png" },
  { size: 32, path: "public/favicon-32x32.png" },
  { size: 180, path: "public/apple-touch-icon.png" },
  { size: 192, path: "public/favicon-192x192.png" },
  { size: 512, path: "public/favicon-512x512.png" },
];

for (const { size, path } of sizes) {
  await sharp(src).resize(size, size).png().toFile(path);
  console.log(`+ ${path}`);
}

await sharp(src).resize(32, 32).toFile("public/favicon.ico");
console.log("+ favicon.ico");
