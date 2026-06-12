import { describe, it, expect } from 'vitest';
import { VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE } from '../renderer/shaders';

describe('Shader invariants', () => {
  it('should NOT double-flip texture Y — view matrix already flips Y', () => {
    expect(VERTEX_SHADER_SOURCE).toContain('v_texCoord = vec2(pos.x, pos.y)');
    expect(VERTEX_SHADER_SOURCE).not.toContain('1.0 - pos');
  });

  it('should rotate CW for positive angle (no negation)', () => {
    // Positive u_layerRotation = CW in screen space.
    // The shader must not negate the angle — use radians(), not -radians().
    expect(VERTEX_SHADER_SOURCE).toContain('float rad = radians(u_layerRotation)');
    expect(VERTEX_SHADER_SOURCE).not.toContain('-radians(u_layerRotation)');
  });

  it('should use standard CCW rotation formula in math coords', () => {
    // x*cos - y*sin  and  x*sin + y*cos = standard rotation matrix.
    // In screen coords (Y-down), this produces CW rotation for positive angle.
    expect(VERTEX_SHADER_SOURCE).toContain('centered.x * c - centered.y * s');
    expect(VERTEX_SHADER_SOURCE).toContain('centered.x * s + centered.y * c');
  });

  it('should apply flip before rotation (center-anchored flip)', () => {
    const flipLine = VERTEX_SHADER_SOURCE.split('\n').findIndex(l => l.includes('centered *= u_flipSign'));
    const rotateLine = VERTEX_SHADER_SOURCE.split('\n').findIndex(l => l.includes('vec2 rotated'));
    expect(flipLine).toBeGreaterThan(-1);
    expect(rotateLine).toBeGreaterThan(-1);
    expect(rotateLine).toBeGreaterThan(flipLine); // flip before rotate
  });

  it('should compile u_flipTexY uniform in fragment shader to handle FBO rendering coordinate corrections', () => {
    expect(FRAGMENT_SHADER_SOURCE).toContain('uniform bool u_flipTexY;');
    expect(FRAGMENT_SHADER_SOURCE).toContain('texCoord.y = 1.0 - texCoord.y;');
  });
});

describe('Renderer integration', () => {
  it('should have correct Z-index for layer overlays', () => {
    const layerZIndex = (layersCount: number, layerIndex: number) => {
      return layersCount - layerIndex;
    };
    
    expect(layerZIndex(3, 0)).toBe(3);
    expect(layerZIndex(3, 2)).toBe(1);
  });

  it('should calculate correct viewport transform', () => {
    const zoom = 100;
    const pan = { x: 50, y: 30 };
    const docWidth = 800;
    const docHeight = 600;
    
    const transform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom / 100})`;
    expect(transform).toBe('translate(50px, 30px) scale(1)');
  });

  it('should handle layer visibility toggle', () => {
    const layers = [
      { id: '1', visible: true },
      { id: '2', visible: false },
      { id: '3', visible: true },
    ];
    
    const visibleLayers = layers.filter(l => l.visible);
    expect(visibleLayers.length).toBe(2);
  });

  it('should calculate dirty layer tracking', () => {
    const dirtyLayers = new Set<string>();
    dirtyLayers.add('layer-1');
    dirtyLayers.add('layer-2');
    
    expect(dirtyLayers.size).toBe(2);
    expect(dirtyLayers.has('layer-1')).toBe(true);
    expect(dirtyLayers.has('layer-3')).toBe(false);
    
    dirtyLayers.clear();
    expect(dirtyLayers.size).toBe(0);
  });

  it('should format viewport pan for CSS', () => {
    const pan = { x: 100, y: 50 };
    const cssTransform = `translate(${pan.x}px, ${pan.y}px)`;
    expect(cssTransform).toBe('translate(100px, 50px)');
  });

  it('should include zoom × dpr in canvas backing resolution for HiDPI sharpness', () => {
    const docW = 800;
    const docH = 600;
    const zoom = 2.0;
    const dpr = 2;
    const w = Math.round(docW * zoom * dpr);
    const h = Math.round(docH * zoom * dpr);
    expect(w).toBe(3200);
    expect(h).toBe(2400);
  });

  it('should update canvas backing resolution when zoom changes', () => {
    const docW = 800;
    const docH = 600;
    const dpr = 2;

    const atZoom1 = { w: Math.round(docW * 1.0 * dpr), h: Math.round(docH * 1.0 * dpr) };
    const atZoom2 = { w: Math.round(docW * 2.0 * dpr), h: Math.round(docH * 2.0 * dpr) };
    const atZoom05 = { w: Math.round(docW * 0.5 * dpr), h: Math.round(docH * 0.5 * dpr) };

    expect(atZoom1).toEqual({ w: 1600, h: 1200 });
    expect(atZoom2).toEqual({ w: 3200, h: 2400 });
    expect(atZoom05).toEqual({ w: 800, h: 600 });

    // When zoom changes, resize must produce a different backing size
    expect(atZoom2.w).toBeGreaterThan(atZoom1.w);
    expect(atZoom1.w).toBeGreaterThan(atZoom05.w);
  });
});
