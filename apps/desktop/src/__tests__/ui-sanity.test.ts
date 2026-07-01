import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Engineering Integrity: Strict TypeScript Mandate', () => {
  const srcDir = path.resolve(__dirname, '..');

  it('should not contain any .js or .jsx files (100% TypeScript requirement)', () => {
    const files = fs.readdirSync(srcDir);
    const forbiddenFiles = files.filter(f => f.endsWith('.js') || f.endsWith('.jsx'));

    if (forbiddenFiles.length > 0) {
      throw new Error(`CRITICAL FAILURE: Forbidden files detected in src/: ${forbiddenFiles.join(', ')}. This project is strictly 100% TypeScript.`);
    }
    expect(forbiddenFiles.length).toBe(0);
  });
});

describe('Photrez design tokens', () => {
  const stylesCssPath = path.resolve(__dirname, '..', 'styles.css');
  const stylesCss = fs.readFileSync(stylesCssPath, 'utf8');

  it('should define the editor palette in OKLCH', () => {
    expect(stylesCss).toContain('--editor-bg: oklch(0.205 0 0)');
    expect(stylesCss).toContain('--editor-topbar: oklch(0.19 0 0)');
    expect(stylesCss).toContain('--editor-panel: oklch(0.235 0 0)');
    expect(stylesCss).toContain('--editor-canvas: oklch(0.17 0 0)');
    expect(stylesCss).toContain('--editor-field: oklch(0.265 0 0)');
    expect(stylesCss).toContain('--editor-divider: oklch(0.3 0 0)');
    expect(stylesCss).toContain('--editor-text: oklch(0.84 0 0)');
    expect(stylesCss).toContain('--editor-text-dim: oklch(0.58 0 0)');
    expect(stylesCss).toContain('--editor-accent: oklch(0.74 0.15 55)');
    expect(stylesCss).toContain('--editor-brand: oklch(0.62 0.2 36)');
  });

  it('should keep orange limited to small active indicators', () => {
    const indexCssPath = path.resolve(__dirname, '..', 'index.css');
    const indexCss = fs.readFileSync(indexCssPath, 'utf8');
    // Active tab/panel accent indicator: documented as design lock.
    // Must use the same accent token as focus outlines to stay visually consistent.
    expect(indexCss).toContain('.document-tab.active::after');
    expect(indexCss).toContain('.panel-tab.active::after');
    expect(indexCss).toContain('.layer-row.selected');
    // orange must be referenced only via --color-accent / --color-editor-accent
    expect(indexCss).toMatch(/var\(--color-accent|var\(--color-editor-accent/);
    expect(indexCss).not.toMatch(/#[Ff]{2}8[67]2[Dd]/);
  });
});

describe('App.tsx integrity', () => {
  // asserting on a stale high-fidelity slice comment block. The previous
  // suite passed via comments left in App.tsx ("tests pass but app fails"
  // anti-pattern from 2026-06-16). This block checks what the file
  // currently does.
  const appTsxPath = path.resolve(__dirname, '..', 'App.tsx');
  const appTsx = fs.readFileSync(appTsxPath, 'utf8');

  it('exports a single default App function that renders EditorShell', () => {
    expect(appTsx).toContain('export default function App');
    expect(appTsx).toContain('return <EditorShell />');
  });

  it('contains no external image-editor branding (regression guard)', () => {
    expect(appTsx).not.toContain('LUMINARIS');
    expect(appTsx).not.toContain('L U M I N A R I S');
  });

  it('contains no React-only patterns or forbidden TypeScript escape hatches', () => {
    expect(appTsx).not.toContain('useState');
    expect(appTsx).not.toContain('useEffect');
    expect(appTsx).not.toContain('React');
    expect(appTsx).not.toContain('className=');
    expect(appTsx).not.toContain('as any');
    expect(appTsx).not.toContain('@ts-ignore');
    expect(appTsx).not.toContain('@ts-expect-error');
  });
});
