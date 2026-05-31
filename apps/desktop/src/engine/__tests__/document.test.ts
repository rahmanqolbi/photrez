import { describe, it, expect } from 'vitest';
import { DocumentEngine } from '../document';

describe('DocumentEngine', () => {
  it('creates document with correct dimensions and initial states', () => {
    const engine = new DocumentEngine('doc-1', 'My Document', 800, 600);
    
    expect(engine.getId()).toBe('doc-1');
    expect(engine.getName()).toBe('My Document');
    expect(engine.getWidth()).toBe(800);
    expect(engine.getHeight()).toBe(600);
    expect(engine.getLayers().length).toBe(0);
    expect(engine.getActiveLayerId()).toBeNull();
    expect(engine.getSelection()).toBeNull();
    expect(engine.isDirty()).toBe(false);
  });

  it('adds layers and updates layer list', () => {
    const engine = new DocumentEngine('doc-1', 'My Document', 800, 600);
    
    const layer1 = engine.addLayer('Background');
    expect(engine.getLayers().length).toBe(1);
    expect(engine.getActiveLayerId()).toBe(layer1.id);
    expect(engine.getLayers()[0].name).toBe('Background');

    const layer2 = engine.addLayer('Layer 1');
    expect(engine.getLayers().length).toBe(2);
    expect(engine.getActiveLayerId()).toBe(layer2.id);
    expect(engine.getLayers()[0].name).toBe('Layer 1'); // Inserted at top
    expect(engine.getLayers()[1].name).toBe('Background');
  });

  it('deletes layer and adjusts active layer selection', () => {
    const engine = new DocumentEngine('doc-1', 'My Document', 800, 600);
    
    const layer1 = engine.addLayer('Layer 1');
    const layer2 = engine.addLayer('Layer 2');
    
    expect(engine.getLayers().length).toBe(2);
    expect(engine.getActiveLayerId()).toBe(layer2.id);

    engine.deleteLayer(layer2.id);
    expect(engine.getLayers().length).toBe(1);
    expect(engine.getActiveLayerId()).toBe(layer1.id);

    // Prevent deleting the last layer
    engine.deleteLayer(layer1.id);
    expect(engine.getLayers().length).toBe(1);
  });

  it('reorders layers list correctly', () => {
    const engine = new DocumentEngine('doc-1', 'My Document', 800, 600);
    
    const l1 = engine.addLayer('L1'); // index 2
    const l2 = engine.addLayer('L2'); // index 1
    const l3 = engine.addLayer('L3'); // index 0

    expect(engine.getLayers().map(l => l.name)).toEqual(['L3', 'L2', 'L1']);

    engine.reorderLayer(0, 2); // Move L3 to end
    expect(engine.getLayers().map(l => l.name)).toEqual(['L2', 'L1', 'L3']);
  });

  it('sets layer properties correctly', () => {
    const engine = new DocumentEngine('doc-1', 'My Document', 800, 600);
    const layer = engine.addLayer('Test');

    engine.setLayerOpacity(layer.id, 0.7);
    expect(engine.getLayers()[0].opacity).toBe(0.7);

    engine.setLayerVisibility(layer.id, false);
    expect(engine.getLayers()[0].visible).toBe(false);

    engine.setLayerLocked(layer.id, true);
    expect(engine.getLayers()[0].locked).toBe(true);

    // When locked, opacity/visibility mutations should be blocked
    engine.setLayerOpacity(layer.id, 0.2);
    expect(engine.getLayers()[0].opacity).toBe(0.7);
  });

  it('performs layer transformations correctly', () => {
    const engine = new DocumentEngine('doc-1', 'My Document', 800, 600);
    const layer = engine.addLayer('Test');

    engine.moveLayer(layer.id, 50, -30);
    expect(engine.getLayers()[0].transform.x).toBe(50);
    expect(engine.getLayers()[0].transform.y).toBe(-30);

    engine.transformLayer(layer.id, { scaleX: 2.0, rotation: 45 });
    expect(engine.getLayers()[0].transform.scaleX).toBe(2.0);
    expect(engine.getLayers()[0].transform.rotation).toBe(45);

    engine.flipLayer(layer.id, 'h');
    expect(engine.getLayers()[0].transform.flipH).toBe(true);
  });

  it('manages selection state correctly', () => {
    const engine = new DocumentEngine('doc-1', 'My Document', 800, 600);
    
    engine.createSelection(10, 20, 100, 200);
    expect(engine.getSelection()).toEqual({ x: 10, y: 20, width: 100, height: 200 });

    engine.selectAll();
    expect(engine.getSelection()).toEqual({ x: 0, y: 0, width: 800, height: 600 });

    engine.clearSelection();
    expect(engine.getSelection()).toBeNull();
  });

  it('performs snapshot and restore round-trips correctly', () => {
    const engine = new DocumentEngine('doc-1', 'My Document', 800, 600);
    engine.addLayer('Layer 1');
    engine.addLayer('Layer 2');
    
    const snap = engine.snapshot();
    expect(snap.layers.length).toBe(2);

    engine.addLayer('Layer 3');
    expect(engine.getLayers().length).toBe(3);

    engine.restore(snap);
    expect(engine.getLayers().length).toBe(2);
    expect(engine.getLayers().map(l => l.name)).toEqual(['Layer 2', 'Layer 1']);
  });
});
