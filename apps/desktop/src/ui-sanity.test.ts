import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Engineering Integrity: Strict TypeScript Mandate', () => {
  const srcDir = path.resolve(__dirname);

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
  const indexCssPath = path.resolve(__dirname, 'index.css');
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
    expect(indexCss).toContain('.document-tab.active::after');
    expect(indexCss).toContain('.panel-tab.active::after');
    expect(indexCss).toContain('.tool-button.active');
    expect(indexCss).toContain('.layer-row.selected');
    expect(indexCss).not.toContain('box-shadow: 0 0');
  });
});

describe('Photrez high-fidelity component structure', () => {
  const appTsxPath = path.resolve(__dirname, 'App.tsx');
  const appTsx = fs.readFileSync(appTsxPath, 'utf8');

  it('should preserve the requested component function names', () => {
    for (const name of [
      'AppShell',
      'TopMenuBar',
      'DocumentTabsBar',
      'OptionBar',
      'MainWorkspace',
      'LeftToolRail',
      'CanvasViewport',
      'RightDock',
      'PropertiesPanel',
      'LayersPanel',
      'BottomStatusBar',
    ]) {
      expect(appTsx).toContain(`function ${name}(`);
    }
  });

  it('should render the requested photrez branding, tabs, layers, and status text', () => {
    expect(appTsx).toContain('photrez');
    expect(appTsx).not.toContain('LUMINARIS');
    expect(appTsx).not.toContain('L U M I N A R I S');
    expect(appTsx).toContain('Norway Fjord Edit');
    expect(appTsx).toContain('Color Adjust 1');
    expect(appTsx).toContain('Water Reflection');
    expect(appTsx).toContain('1920  1280 px | 41% | RGB/8 | sRGB IEC61966-2.1');
    expect(appTsx).toContain('Move Tool | Image Layer');
    expect(appTsx).toContain('Snapshots | History | Assets');
  });

  it('should use SolidJS control flow and avoid React patterns', () => {
    expect(appTsx).toContain('import { For } from "solid-js";');
    expect(appTsx).toContain('<For each={documentTabs}>');
    expect(appTsx).not.toContain('className=');
    expect(appTsx).not.toContain('useState');
    expect(appTsx).not.toContain('useEffect');
    expect(appTsx).not.toContain('React');
    expect(appTsx).not.toContain('as any');
    expect(appTsx).not.toContain('@ts-ignore');
    expect(appTsx).not.toContain('@ts-expect-error');
  });

  it('should lock the titlebar reference structure and spacing hooks', () => {
    expect(appTsx).toContain('class="hamburger-button"');
    expect(appTsx).toContain('aria-label="Main menu"');
    expect(appTsx).toContain('class="titlebar-right-separator"');
    expect(appTsx).toContain('top-menu-actions');
    expect(appTsx).toContain('<div class="brand-mark" aria-label="photrez">photrez</div>');
  });

  it('should render a continuous tool stack without dividers in the LeftToolRail', () => {
    const railStart = appTsx.indexOf('function LeftToolRail()');
    const railEnd = appTsx.indexOf('function CanvasViewport()');
    const railSection = appTsx.slice(railStart, railEnd);
    expect(railSection).not.toContain('tool-divider');
  });

  it('should use a monochrome active state for tool buttons instead of orange accent', () => {
    const indexCss = fs.readFileSync(path.resolve(__dirname, 'index.css'), 'utf8');
    const activeRule = indexCss.match(/\.tool-button\.active\s*\{[^}]*\}/);
    expect(activeRule).toBeTruthy();
    if (activeRule) {
      expect(activeRule[0]).not.toContain('var(--color-accent)');
      expect(activeRule[0]).not.toContain('#E15A17');
    }
  });

  it('should not have an orange left bar pseudo-element on active tool buttons', () => {
    const indexCss = fs.readFileSync(path.resolve(__dirname, 'index.css'), 'utf8');
    const beforeRule = indexCss.match(/\.tool-button\.active::before\s*\{[^}]*\}/);
    expect(beforeRule).toBeNull();
  });

  it('should render an ellipsis button instead of a settings button in the LeftToolRail', () => {
    const railStart = appTsx.indexOf('function LeftToolRail()');
    const railEnd = appTsx.indexOf('function CanvasViewport()');
    const railSection = appTsx.slice(railStart, railEnd);
    expect(railSection).toContain('ellip');
    expect(railSection).not.toContain('settings');
  });

  it('should use the local fjord image as an image element instead of a full screenshot background', () => {
    expect(appTsx).toContain('new URL("./norway_fjord_preview.png", import.meta.url).href');
    expect(appTsx).toContain('<img src={fjordPreviewUrl}');
    expect(appTsx).not.toContain('background-image: url("./norway_fjord_preview.png")');
    expect(appTsx).not.toContain('bottom thumbnail');
  });

  it('should maintain the docked layout structure in EditorShell without margins, padding or gaps', () => {
    const editorShellPath = path.resolve(__dirname, 'components', 'editor', 'EditorShell.tsx');
    const editorShell = fs.readFileSync(editorShellPath, 'utf8');

    // Assert docked layout main class exists
    expect(editorShell).toContain('class="relative flex min-h-0 flex-1 overflow-hidden"');

    // Assert no floating padding or gap containers around the panels
    expect(editorShell).not.toContain('gap-1.5');
    expect(editorShell).not.toContain('p-1.5');
  });
});
