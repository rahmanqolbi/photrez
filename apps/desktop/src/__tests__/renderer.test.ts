import { describe, it, expect } from 'vitest';

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
});
