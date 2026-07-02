#!/usr/bin/env bun
/**
 * fix-mojibake.ts — Decodes double-encoded UTF-8 mojibake in .md files.
 *
 * The corruption is "double encoding": original UTF-8 bytes were interpreted
 * as Windows-1252, then saved again as UTF-8. We reverse this by:
 * 1. Reading file as UTF-8 (giving corrupted characters)
 * 2. Mapping each corrupted character back to its Windows-1252 byte value
 * 3. Decoding those bytes as UTF-8 to get the original character
 *
 * Run: bun run scripts/fix-mojibake.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, relative } from 'path';

// ── Build Windows-1252 → byte reverse mapping ──
const cp1252: Record<number, number> = {};

// Base Latin-1 (0x00-0xFF, except 0x80-0x9F which Windows-1252 remaps)
for (let i = 0; i <= 0xFF; i++) {
  cp1252[i] = i; // For 0x00-0x7F (ASCII) and 0xA0-0xFF (Latin-1 supplement)
}

// Windows-1252 specific remapping for 0x80-0x9F
// Format: { unicode_codepoint: windows1252_byte }
const win1252Specials: Record<number, number> = {
  0x20AC: 0x80, // €
  0x201A: 0x82, // ‚
  0x0192: 0x83, // ƒ
  0x201E: 0x84, // „
  0x2026: 0x85, // …
  0x2020: 0x86, // †
  0x2021: 0x87, // ‡
  0x02C6: 0x88, // ˆ
  0x2030: 0x89, // ‰
  0x0160: 0x8A, // Š
  0x2039: 0x8B, // ‹
  0x0152: 0x8C, // Œ
  0x017D: 0x8E, // Ž
  0x2018: 0x91, // '
  0x2019: 0x92, // '
  0x201C: 0x93, // "
  0x201D: 0x94, // "
  0x2022: 0x95, // •
  0x2013: 0x96, // –
  0x2014: 0x97, // —
  0x02DC: 0x98, // ˜
  0x2122: 0x99, // ™
  0x0161: 0x9A, // š
  0x203A: 0x9B, // ›
  0x0153: 0x9C, // œ
  0x017E: 0x9E, // ž
  0x0178: 0x9F, // Ÿ
};

// Override the Latin-1 defaults with Win-1252 specials
for (const [cp, byte] of Object.entries(win1252Specials)) {
  cp1252[Number(cp)] = byte;
}
// For 0x80-0x9F that don't have Win-1252 mappings, keep them as-is
// (they'll be C1 control chars that won't appear in practice)

// Enable this map for strict validation — only attempt decode if the
// resulting codepoint is in one of these "reasonable" ranges.
const VALID_RANGES = [
  [0x0080, 0x024F], // Latin Extended + IPA
  [0x02C6, 0x02DC], // Modifier letters
  [0x0391, 0x03C9], // Greek (for Δ, π, etc.)
  [0x2000, 0x206F], // General Punctuation (dashes, quotes, spaces)
  [0x2100, 0x214F], // Letterlike Symbols (™, ℠)
  [0x2190, 0x21FF], // Arrows
  [0x2200, 0x22FF], // Mathematical Operators
  [0x2500, 0x257F], // Box Drawing
  [0x2580, 0x259F], // Block Elements
  [0x25A0, 0x25FF], // Geometric Shapes
  [0x2600, 0x27BF], // Miscellaneous Symbols + Dingbats (emoji)
  [0x2B50, 0x2B50], // ⭐
  [0xFE00, 0xFE0F], // Variation Selectors
  [0x1F300, 0x1FAFF], // Miscellaneous Emoji
];

function isInValidRange(cp: number): boolean {
  for (const [min, max] of VALID_RANGES) {
    if (cp >= min && cp <= max) return true;
  }
  return false;
}

function charToWin1252Byte(cp: number): number | undefined {
  return cp1252[cp];
}

/**
 * Try to fix a 2-byte, 3-byte, or 4-byte UTF-8 double-encoding starting at `chars[i]`.
 * Returns the fixed character and new index, or null if not fixable.
 */
function tryFixMojibake(
  chars: string[],
  i: number
): { fixed: string; newIndex: number } | null {
  const cp0 = chars[i]?.codePointAt(0) ?? -1;

  // Try 4-byte sequence (original first byte: 0xF0-0xF4)
  if (cp0 >= 0xF0 && cp0 <= 0xF4 && i + 3 < chars.length) {
    const cps = [
      cp0,
      chars[i + 1].codePointAt(0)!,
      chars[i + 2].codePointAt(0)!,
      chars[i + 3].codePointAt(0)!,
    ];
    const bytes = cps.map(charToWin1252Byte);
    if (bytes.every((b) => b !== undefined)) {
      const buf = new Uint8Array(bytes as number[]);
      const decoder = new TextDecoder('utf-8', { fatal: false });
      const decoded = decoder.decode(buf);
      const decodedCodepoints = [...decoded];
      if (decodedCodepoints.length === 1) {
        const decodedCp = decodedCodepoints[0]!.codePointAt(0)!;
        if (decodedCp >= 0x10000 && isInValidRange(decodedCp)) {
          return { fixed: decoded, newIndex: i + 4 };
        }
      }
    }
  }

  // Try 3-byte sequence (original first byte: 0xE0-0xEF)
  if (cp0 >= 0xE0 && cp0 <= 0xEF && i + 2 < chars.length) {
    const cps = [
      cp0,
      chars[i + 1].codePointAt(0)!,
      chars[i + 2].codePointAt(0)!,
    ];
    const bytes = cps.map(charToWin1252Byte);
    if (bytes.every((b) => b !== undefined)) {
      const buf = new Uint8Array(bytes as number[]);
      const decoder = new TextDecoder('utf-8', { fatal: false });
      const decoded = decoder.decode(buf);
      if (decoded.length === 1) {
        const decodedCp = decoded.codePointAt(0)!;
        if (
          decodedCp >= 0x0800 &&
          isInValidRange(decodedCp) &&
          // Exclude accidentally decoded Latin-1 chars
          !(decodedCp >= 0xE0 && decodedCp <= 0xEF && cp0 === decodedCp)
        ) {
          return { fixed: decoded, newIndex: i + 3 };
        }
      }
    }
  }

  // Try 2-byte sequence (original first byte: 0xC2-0xDF)
  if (cp0 >= 0xC2 && cp0 <= 0xDF && i + 1 < chars.length) {
    const cps = [cp0, chars[i + 1].codePointAt(0)!];
    const bytes = cps.map(charToWin1252Byte);
    if (bytes.every((b) => b !== undefined)) {
      const buf = new Uint8Array(bytes as number[]);
      const decoder = new TextDecoder('utf-8', { fatal: false });
      const decoded = decoder.decode(buf);
      if (decoded.length === 1) {
        const decodedCp = decoded.codePointAt(0)!;
        if (
          decodedCp >= 0x80 &&
          isInValidRange(decodedCp) &&
          // Exclude self-matches (circular decode)
          decodedCp !== cp0
        ) {
          return { fixed: decoded, newIndex: i + 2 };
        }
      }
    }
  }

  return null;
}

function fixFile(filePath: string): { fixed: number; path: string } {
  const original = readFileSync(filePath, 'utf-8');
  const chars = [...original];
  const result: string[] = [];
  let fixCount = 0;

  let i = 0;
  while (i < chars.length) {
    const fix = tryFixMojibake(chars, i);
    if (fix) {
      result.push(fix.fixed);
      fixCount++;
      i = fix.newIndex;
    } else {
      result.push(chars[i]);
      i++;
    }
  }

  const fixed = result.join('');
  if (fixed !== original) {
    writeFileSync(filePath, fixed, 'utf-8');
    return { fixed: fixCount, path: filePath };
  }
  return { fixed: 0, path: filePath };
}

// ── Main ──
const rootDir = resolve(import.meta.dir, '..');
const patterns = [
  '*.md',                          // Root markdown files
  'docs/**/*.md',                  // All docs
];

const allFiles: string[] = [];
for (const p of patterns) {
  const glob = new Bun.Glob(p);
  for (const match of glob.scanSync({ cwd: rootDir, absolute: true })) {
    allFiles.push(match);
  }
}
const uniqueFiles = [...new Set(allFiles)].sort();

console.log(`Found ${uniqueFiles.length} .md files`);

let totalFixed = 0;
let totalFiles = 0;

for (const file of uniqueFiles) {
  // Skip node_modules
  if (file.includes('node_modules')) continue;

  try {
    const result = fixFile(file);
    if (result.fixed > 0) {
      const rel = relative(rootDir, result.path);
      console.log(`  ${rel}: ${result.fixed} fixes`);
      totalFixed += result.fixed;
      totalFiles++;
    }
  } catch (err) {
    console.error(`  ERROR ${file}: ${err}`);
  }
}

console.log(`\nTotal: ${totalFiles} files, ${totalFixed} mojibake sequences fixed.`);

// Also show if no files were fixed
if (totalFiles === 0) {
  console.log('No mojibake found — all files are clean.');
}
