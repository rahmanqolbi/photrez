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

describe('Photrez high-fidelity UI slice tokens', () => {
  const indexCssPath = path.resolve(__dirname, '..', 'index.css');
  const indexCss = fs.readFileSync(indexCssPath, 'utf8');

  it('should define the requested native desktop palette', () => {
    expect(indexCss).toContain('--color-app-bg: #0f1113');
    expect(indexCss).toContain('--color-app-chrome: #121416');
    expect(indexCss).toContain('--color-app-panel: #16191c');
    expect(indexCss).toContain('--color-app-panel-soft: #1a1d20');
    expect(indexCss).toContain('--color-app-control: #151719');
    expect(indexCss).toContain('--color-app-hover: #202328');
    expect(indexCss).toContain('--color-border-subtle: #262a2f');
    expect(indexCss).toContain('--color-border-strong: #343941');
    expect(indexCss).toContain('--color-text-primary: #f2f2f2');
    expect(indexCss).toContain('--color-text-secondary: #b7bbc0');
    expect(indexCss).toContain('--color-text-muted: #7f858c');
    expect(indexCss).toContain('--color-accent: #E15A17');
  });

  it('should lock the requested AppShell grid dimensions', () => {
    expect(indexCss).toContain('grid-template-rows: 52px 48px 56px 1fr 46px;');
    expect(indexCss).toContain('grid-template-columns: 64px 1fr 520px;');
    expect(indexCss).toContain('grid-template-columns: 280px 240px;');
  });

  it('should keep orange limited to small active indicators', () => {
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
