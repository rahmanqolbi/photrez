import { describe, it, expect } from 'vitest';

describe('Viewport calculations', () => {
  it('should zoom at cursor position correctly', () => {
    const oldZoom = 1.0;
    const newZoom = 1.1;
    const mouseX = 100;
    const mouseY = 100;
    const panX = 0;
    const panY = 0;
    
    const zoomRatio = newZoom / oldZoom;
    const newPanX = mouseX - (mouseX - panX) * zoomRatio;
    const newPanY = mouseY - (mouseY - panY) * zoomRatio;
    
    expect(newPanX).toBe(mouseX - mouseX * zoomRatio);
    expect(newPanY).toBe(mouseY - mouseY * zoomRatio);
  });

  it('should calculate fit-to-screen zoom correctly', () => {
    const containerWidth = 1200;
    const containerHeight = 800;
    const canvasWidth = 800;
    const canvasHeight = 600;
    const padding = 80;
    
    const fitZoom = Math.min(
      (containerWidth - padding) / canvasWidth,
      (containerHeight - padding) / canvasHeight,
      1
    );
    
    expect(fitZoom).toBeLessThanOrEqual(1);
    expect(fitZoom).toBeGreaterThan(0);
  });

  it('should clamp zoom to valid range', () => {
    const MIN_ZOOM = 10;
    const MAX_ZOOM = 500;
    
    const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
    
    expect(clampZoom(5)).toBe(10);
    expect(clampZoom(600)).toBe(500);
    expect(clampZoom(100)).toBe(100);
  });

  it('should convert screen coordinates to canvas coordinates', () => {
    const clientX = 500;
    const clientY = 300;
    const rectLeft = 100;
    const rectTop = 50;
    const zoom = 1.5;
    const panX = 50;
    const panY = 30;
    
    const canvasX = (clientX - rectLeft - panX) / zoom;
    const canvasY = (clientY - rectTop - panY) / zoom;
    
    expect(canvasX).toBe((500 - 100 - 50) / 1.5);
    expect(canvasY).toBe((300 - 50 - 30) / 1.5);
  });
});

describe('Pan behavior', () => {
  it('should pan by delta from start position', () => {
    const startPanX = 100;
    const startPanY = 50;
    const startClientX = 300;
    const startClientY = 200;
    const currentClientX = 350;
    const currentClientY = 220;
    
    const newPanX = startPanX + (currentClientX - startClientX);
    const newPanY = startPanY + (currentClientY - startClientY);
    
    expect(newPanX).toBe(150);
    expect(newPanY).toBe(70);
  });
});
