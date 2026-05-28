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

describe('Photrez UI Sanity Checks', () => {
  const indexCssPath = path.resolve(__dirname, 'index.css');
  const indexCss = fs.readFileSync(indexCssPath, 'utf8');

  it('should have the "Mechanical Precision" radius vocabulary', () => {
    expect(indexCss).toContain('--radius-lg: 6px');
    expect(indexCss).toContain('--radius-md: 4px');
    expect(indexCss).toContain('--radius-sm: 2px');
  });

  it('should use standardized studio palette prefix', () => {
    expect(indexCss).toContain('--color-studio-bg: #1A1A1C');
    expect(indexCss).toContain('--color-studio-border: #343438');
    expect(indexCss).toContain('--color-accent: #E15A17');
  });

  it('should have shadow-pro with high precision (not blurry)', () => {
    // Refined to be extremely dark and sharp
    expect(indexCss).toContain('--shadow-pro: 0 0 0 1px rgba(0, 0, 0, 0.4), 0 4px 12px rgba(0, 0, 0, 0.6)');
  });

  it('should implement the .studio-input component with flat modern styling', () => {
    expect(indexCss).toContain('.studio-input');
    expect(indexCss).toContain('rounded-md');
    expect(indexCss).not.toContain('border-top-color: #101012');
  });

  it('should have a high-contrast muted text for accessibility', () => {
    expect(indexCss).toContain('--color-text-muted: #71717A');
  });
});

describe('Layout Architecture Checks', () => {
  const appTsxPath = path.resolve(__dirname, 'App.tsx');
  const appTsx = fs.readFileSync(appTsxPath, 'utf8');

  it('should have docked side panels (no margin-2 slop)', () => {
    // We removed m-2 from Tool Rail and Inspector
    expect(appTsx).not.toContain('m-2 rounded-[var(--radius-lg)] shadow-[var(--shadow-pro)]');
    expect(appTsx).not.toContain('rounded-r-lg shadow-sm'); // Tool Rail docked (flat)
    expect(appTsx).not.toContain('rounded-l-lg shadow-sm'); // Inspector docked (flat)
  });

  it('should use the standardized studio- palette classes', () => {
    expect(appTsx).toContain('bg-studio-bg');
    expect(appTsx).toContain('border-studio-border');
    expect(appTsx).toContain('bg-studio-canvas');
  });

  it('should use responsive rounding', () => {
    // We use specific directional rounding for Docked Precision
    expect(appTsx).toContain('rounded-md'); 
    expect(appTsx).not.toContain('rounded-r-lg'); // Tool rail (flat — no dock rounding)
    expect(appTsx).not.toContain('rounded-l-lg'); // Inspector (flat — no dock rounding)
  });
});
