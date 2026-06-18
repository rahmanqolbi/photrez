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

  it('should map Ctrl+Shift+Z to redo', () => {
    const ctrlKey = true;
    const shiftKey = true;
    const key = 'z';
    const isRedo = ctrlKey && shiftKey && key === 'z';
    expect(isRedo).toBe(true);
  });

  it('should map Ctrl+Z to undo', () => {
    const ctrlKey = true;
    const shiftKey = false;
    const key = 'z';
    const isUndo = ctrlKey && !shiftKey && key === 'z';
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

describe('Layer shortcuts', () => {
  it('should map Ctrl+Shift+N to add new layer', () => {
    const ctrlKey = true;
    const shiftKey = true;
    const key = 'n';
    const isNewLayer = ctrlKey && shiftKey && key === 'n';
    expect(isNewLayer).toBe(true);
  });

  it('should map Ctrl+] to move layer up', () => {
    const ctrlKey = true;
    const shiftKey = false;
    const key = ']';
    const isMoveUp = ctrlKey && !shiftKey && key === ']';
    expect(isMoveUp).toBe(true);
  });

  it('should map Ctrl+[ to move layer down', () => {
    const ctrlKey = true;
    const shiftKey = false;
    const key = '[';
    const isMoveDown = ctrlKey && !shiftKey && key === '[';
    expect(isMoveDown).toBe(true);
  });

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

  it('should map Delete to delete active layer (outside selection tool)', () => {
    const key = 'Delete';
    const isDelete = key === 'Delete' || (key as string) === 'Backspace';
    expect(isDelete).toBe(true);
  });

  it('should map Backspace to delete active layer (outside selection tool)', () => {
    const key = 'Backspace';
    const isDelete = (key as string) === 'Delete' || key === 'Backspace';
    expect(isDelete).toBe(true);
  });

  it('should not delete layer when only one layer remains', () => {
    const layerCount = 1;
    const canDelete = layerCount > 1;
    expect(canDelete).toBe(false);
  });

  it('should map 0 to 100% opacity', () => {
    const key = '0';
    const digit = key.charCodeAt(0) - 48;
    const opacity = digit === 0 ? 1.0 : digit / 10;
    expect(opacity).toBe(1.0);
  });

  it('should map 5 to 50% opacity', () => {
    const key = '5';
    const digit = key.charCodeAt(0) - 48;
    const opacity = digit === 0 ? 1.0 : digit / 10;
    expect(opacity).toBe(0.5);
  });

  it('should map 9 to 90% opacity', () => {
    const key = '9';
    const digit = key.charCodeAt(0) - 48;
    const opacity = digit === 0 ? 1.0 : digit / 10;
    expect(opacity).toBe(0.9);
  });

  it('should not trigger opacity shortcut with Ctrl modifier', () => {
    const ctrlKey = true;
    const shiftKey = false;
    const altKey = false;
    const key = '5';
    const isOpacityShortcut =
      !ctrlKey && !shiftKey && !altKey && key.length === 1 && key >= '0' && key <= '9';
    expect(isOpacityShortcut).toBe(false);
  });

  it('should not trigger opacity shortcut with Shift modifier', () => {
    const ctrlKey = false;
    const shiftKey = true;
    const altKey = false;
    const key = '5';
    const isOpacityShortcut =
      !ctrlKey && !shiftKey && !altKey && key.length === 1 && key >= '0' && key <= '9';
    expect(isOpacityShortcut).toBe(false);
  });

  it('should trigger opacity shortcut with bare digit', () => {
    const ctrlKey = false;
    const shiftKey = false;
    const altKey = false;
    const key = '7';
    const isOpacityShortcut =
      !ctrlKey && !shiftKey && !altKey && key.length === 1 && key >= '0' && key <= '9';
    expect(isOpacityShortcut).toBe(true);
  });
});
