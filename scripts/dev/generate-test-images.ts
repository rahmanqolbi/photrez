// Generate test images for large image handling performance test
import { mkdirSync, writeFileSync, openSync, writeSync, closeSync, existsSync, statSync } from "fs";
import { join } from "path";

const outDir = join("scripts", "dev", "test-images");
mkdirSync(outDir, { recursive: true });

function makePPM(w: number, h: number, label: string): void {
  console.log(`Generating ${w}x${h} (${label})...`);
  const header = `P6\n${w} ${h}\n255\n`;
  const headerBytes = Buffer.from(header, "ascii");
  const filePath = join(outDir, `${label}.ppm`);
  const fd = openSync(filePath, "w");
  writeSync(fd, headerBytes);

  const row = Buffer.alloc(w * 3);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = x * 3;
      row[i]     = ((x / w) * 255) | 0;
      row[i + 1] = ((y / h) * 255) | 0;
      row[i + 2] = 128;
    }
    writeSync(fd, row);
    if (y % 500 === 0) process.stdout.write(`  row ${y}/${h}\r`);
  }
  closeSync(fd);

  const sizeMB = Math.round((statSync(filePath).size / 1024 / 1024) * 100) / 100;
  console.log(`  Done: ${sizeMB}MB`);
}

makePPM(4000, 4000, "test-4000x4000");
makePPM(8000, 6000, "test-8000x6000");
makePPM(1000, 1000, "test-1000x1000");

console.log("\nDone!");
