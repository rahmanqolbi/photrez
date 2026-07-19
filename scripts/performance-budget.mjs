// Performance budget check — fail CI if bundle exceeds thresholds.
// Three thresholds, zero dependencies.

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ASSETS = join(import.meta.dirname, '..', 'apps', 'desktop', 'dist', 'assets');

const LIMITS = {
  '.js':  500,  // kB — current ~425 kB
  '.css': 100,  // kB — current  ~53 kB
};

let exitCode = 0;

const files = readdirSync(ASSETS);
for (const [ext, limit] of Object.entries(LIMITS)) {
  for (const file of files) {
    if (!file.endsWith(ext)) continue;
    const size = readFileSync(join(ASSETS, file)).length / 1024;
    if (size > limit) {
      console.error(`FAIL  ${file}  ${size.toFixed(1)} kB  (limit ${limit} kB)`);
      exitCode = 1;
    } else {
      console.log(`PASS  ${file}  ${size.toFixed(1)} kB  (limit ${limit} kB)`);
    }
  }
}

process.exit(exitCode);
