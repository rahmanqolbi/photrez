// Generate PNG test images for Photrez large image handling test
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { PNG } from "pngjs";

const outDir = join("scripts", "dev", "test-images");
mkdirSync(outDir, { recursive: true });

function makePNG(w: number, h: number, label: string): void {
  console.log(`Generating ${w}x${h} PNG (${label})...`);
  const png = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      png.data[i]     = ((x / w) * 255) | 0;
      png.data[i + 1] = ((y / h) * 255) | 0;
      png.data[i + 2] = 128;
      png.data[i + 3] = 255;
    }
    if (y % 500 === 0) process.stdout.write(`  row ${y}/${h}\r`);
  }
  
  const filePath = join(outDir, `${label}.png`);
  const buf = PNG.sync.write(png);
  writeFileSync(filePath, buf);
  
  const sizeMB = Math.round((buf.length / 1024 / 1024) * 100) / 100;
  const rawMB = Math.round((w * h * 4 / 1024 / 1024) * 100) / 100;
  console.log(`  Done: PNG=${sizeMB}MB (raw ${rawMB}MB)`);
}

makePNG(1000, 1000, "test-1000x1000");     // 4MB raw baseline
makePNG(4000, 4000, "test-4000x4000");     // 64MB raw large

console.log("\nDone!");
