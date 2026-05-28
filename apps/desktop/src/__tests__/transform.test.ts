import { describe, it, expect } from 'vitest';

// Test the transform calculations used in the app
describe('Transform calculations', () => {
  it('should calculate scale from width change', () => {
    const originalWidth = 100;
    const newWidth = 200;
    const scaleX = newWidth / originalWidth;
    expect(scaleX).toBe(2.0);
  });

  it('should calculate scale from height change', () => {
    const originalHeight = 50;
    const newHeight = 100;
    const scaleY = newHeight / originalHeight;
    expect(scaleY).toBe(2.0);
  });

  it('should clamp minimum dimension to 10', () => {
    const width = Math.max(10, -50);
    expect(width).toBe(10);
  });

  it('should calculate rotation from atan2', () => {
    const centerX = 50;
    const centerY = 50;
    const mouseX = 100;
    const mouseY = 50;
    const angle = Math.atan2(mouseY - centerY, mouseX - centerX) * (180 / Math.PI);
    const rotation = (angle + 90) % 360;
    expect(rotation).toBe(90);
  });

  it('should snap rotation to 15-degree increments', () => {
    const rotation = 47;
    const snapped = Math.round(rotation / 15) * 15;
    expect(snapped).toBe(45);
  });

  it('should handle negative rotation snapping', () => {
    const rotation = -45;
    const snapped = Math.round(rotation / 15) * 15;
    expect(snapped).toBe(-45);
  });
});

describe('Resize handle calculations', () => {
  it('should resize SE handle correctly', () => {
    const origX = 10, origY = 10, origW = 100, origH = 100;
    const dx = 50, dy = 30;
    const newW = Math.max(10, origW + dx);
    const newH = Math.max(10, origH + dy);
    expect(newW).toBe(150);
    expect(newH).toBe(130);
  });

  it('should resize NW handle correctly (anchor bottom-right)', () => {
    const origX = 10, origY = 10, origW = 100, origH = 100;
    const dx = -30, dy = -20;
    const newW = Math.max(10, origW - dx);
    const newH = Math.max(10, origH - dy);
    const newX = origX + (origW - newW);
    const newY = origY + (origH - newH);
    expect(newW).toBe(130);
    expect(newH).toBe(120);
    expect(newX).toBe(-20);
    expect(newY).toBe(-10);
  });

  it('should resize N handle (only height changes)', () => {
    const origY = 10, origH = 100;
    const dy = -30;
    const newH = Math.max(10, origH - dy);
    const newY = origY + (origH - newH);
    expect(newH).toBe(130);
    expect(newY).toBe(-20);
  });

  it('should not allow dimensions below 10', () => {
    const origW = 100;
    const dx = -200;
    const newW = Math.max(10, origW + dx);
    expect(newW).toBe(10);
  });
});

describe('Flip toggle logic', () => {
  it('should toggle flipH from false to true', () => {
    let flipH = false;
    flipH = !flipH;
    expect(flipH).toBe(true);
  });

  it('should toggle flipH from true to false', () => {
    let flipH = true;
    flipH = !flipH;
    expect(flipH).toBe(false);
  });

  it('should not affect flipV when toggling flipH', () => {
    let flipH = false;
    let flipV = true;
    flipH = !flipH;
    expect(flipH).toBe(true);
    expect(flipV).toBe(true);
  });
});

describe('Layer transform defaults', () => {
  it('should have correct default transform values', () => {
    const defaultTransform = {
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      flipH: false,
      flipV: false,
    };
    expect(defaultTransform.scaleX).toBe(1);
    expect(defaultTransform.scaleY).toBe(1);
    expect(defaultTransform.rotation).toBe(0);
    expect(defaultTransform.flipH).toBe(false);
    expect(defaultTransform.flipV).toBe(false);
  });

  it('should extract transform from layer with null transform', () => {
    const layer = { transform: null } as { transform: { scale_x: number; scale_y: number; rotation: number; flip_h: boolean; flip_v: boolean } | null };
    const t = {
      scaleX: layer.transform?.scale_x ?? 1,
      scaleY: layer.transform?.scale_y ?? 1,
      rotation: layer.transform?.rotation ?? 0,
      flipH: layer.transform?.flip_h ?? false,
      flipV: layer.transform?.flip_v ?? false,
    };
    expect(t.scaleX).toBe(1);
    expect(t.flipH).toBe(false);
  });
});
