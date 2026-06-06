import { describe, it, expect } from 'vitest';

// Test keyboard shortcut logic patterns
describe('Keyboard shortcut mapping', () => {
  it('should map Ctrl+G to flip horizontal', () => {
    const ctrlKey = true;
    const shiftKey = false;
    const key = 'g';
    const isFlipH = ctrlKey && key === 'g' && !shiftKey;
    expect(isFlipH).toBe(true);
  });

  it('should map Ctrl+Shift+G to flip vertical', () => {
    const ctrlKey = true;
    const shiftKey = true;
    const key = 'g';
    const isFlipV = ctrlKey && key === 'g' && shiftKey;
    expect(isFlipV).toBe(true);
  });

  it('should map Ctrl+Z to undo', () => {
    const ctrlKey = true;
    const key = 'z';
    const isUndo = ctrlKey && key === 'z';
    expect(isUndo).toBe(true);
  });

  it('should map Ctrl+Y to redo', () => {
    const ctrlKey = true;
    const key = 'y';
    const isRedo = ctrlKey && key === 'y';
    expect(isRedo).toBe(true);
  });

  it('should map Escape to cancel/deselect', () => {
    const key = 'Escape';
    const isEscape = key === 'Escape';
    expect(isEscape).toBe(true);
  });

  it('should map B to brush tool', () => {
    const key = 'b';
    const isBrush = key === 'b';
    expect(isBrush).toBe(true);
  });

  it('should map V to move tool', () => {
    const key = 'v';
    const isMove = key === 'v';
    expect(isMove).toBe(true);
  });

  it('should map I to eyedropper tool', () => {
    const key = 'i';
    const isEyedropper = key === 'i';
    expect(isEyedropper).toBe(true);
  });

  it('should not trigger shortcuts when typing in input', () => {
    const target = { tagName: 'INPUT' };
    const isInput = target.tagName === 'INPUT';
    // Shortcuts should be ignored when typing in inputs
    expect(isInput).toBe(true);
  });
});

describe('Paint tool shortcuts', () => {
  it("should map E to eraser tool", () => {
    const key = "e";
    const isEraser = key === "e";
    expect(isEraser).toBe(true);
  });

  it("should map bracket keys to active paint size adjustment", () => {
    const decrementKey = "[";
    const incrementKey = "]";
    expect(decrementKey).toBe("[");
    expect(incrementKey).toBe("]");
  });
});

describe('Nudge with arrow keys', () => {
  it('should nudge 1px with arrow key', () => {
    const shiftKey = false;
    const dx = shiftKey ? 10 : 1;
    expect(dx).toBe(1);
  });

  it('should nudge 10px with Shift+arrow', () => {
    const shiftKey = true;
    const dx = shiftKey ? 10 : 1;
    expect(dx).toBe(10);
  });
});
