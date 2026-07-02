// Generate a test image with random noise (won't compress well)
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { PNG } from "pngjs";

const outDir = "C:\\Users\\Qolbi\\Desktop";
const w = 4000, h = 4000;

console.log(`Generating ${w}x${h} noise PNG...`);

const png = new PNG({ width: w, height: h });
// Use a seeded random for reproducibility
let seed = 12345;
function rand(): number {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}

for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    png.data[i]     = (rand() * 255) | 0;
    png.data[i + 1] = (rand() * 255) | 0;
    png.data[i + 2] = (rand() * 255) | 0;
    png.data[i + 3] = 255;
  }
  if (y % 500 === 0) process.stdout.write(`  row ${y}/${h}\r`);
}

const filePath = join(outDir, "test-photrez-noise-4000x4000.png");
const buf = PNG.sync.write(png);
writeFileSync(filePath, buf);
const sizeMB = Math.round((buf.length / 1024 / 1024) * 100) / 100;
const rawMB = Math.round((w * h * 4 / 1024 / 1024) * 100) / 100;
console.log(`Done: ${sizeMB}MB PNG (${rawMB}MB raw)`);
console.log(`File: ${filePath}`);
