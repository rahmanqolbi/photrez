import { describe, it, expect } from 'vitest';
import { resolveCursor } from '../viewport/cursorResolver';
import type { CursorContext } from '../viewport/cursorResolver';

describe('resolveCursor', () => {
  const base: CursorContext = {
    isSpacePressed: false,
    isPanning: false,
    activeTool: 'selection',
    isAltPressed: false,
    hoverHandle: null,
    isLayerLocked: false,
    eyedropperTarget: null,
  };

  it('returns crosshair when eyedropperTarget is set', () => {
    const ctx: CursorContext = {
      ...base,
      eyedropperTarget: '#ffffff',
    };
    expect(resolveCursor(ctx)).toBe('crosshair');
  });

  it('returns grab when space is pressed', () => {
    const ctx: CursorContext = {
      ...base,
      isSpacePressed: true,
    };
    expect(resolveCursor(ctx)).toBe('grab');
  });

  it('returns grabbing when space is pressed and panning', () => {
    const ctx: CursorContext = {
      ...base,
      isSpacePressed: true,
      isPanning: true,
    };
    expect(resolveCursor(ctx)).toBe('grabbing');
  });

  it('returns crosshair when alt is pressed and activeTool is brush', () => {
    const ctx: CursorContext = {
      ...base,
      activeTool: 'brush',
      isAltPressed: true,
    };
    expect(resolveCursor(ctx)).toBe('crosshair');
  });

  it('returns crosshair when alt is pressed and activeTool is eraser', () => {
    const ctx: CursorContext = {
      ...base,
      activeTool: 'eraser',
      isAltPressed: true,
    };
    expect(resolveCursor(ctx)).toBe('crosshair');
  });

  describe('move tool with handles', () => {
    it('returns default when layer is locked', () => {
      const ctx: CursorContext = {
        ...base,
        activeTool: 'move',
        isLayerLocked: true,
        hoverHandle: 'move',
      };
      expect(resolveCursor(ctx)).toBe('default');
    });

    it('returns move when hoverHandle is move', () => {
      const ctx: CursorContext = {
        ...base,
        activeTool: 'move',
        hoverHandle: 'move',
      };
      expect(resolveCursor(ctx)).toBe('move');
    });

    it('returns nwse-resize for tl handle', () => {
      const ctx: CursorContext = {
        ...base,
        activeTool: 'move',
        hoverHandle: 'tl',
      };
      expect(resolveCursor(ctx)).toBe('nwse-resize');
    });

    it('returns nesw-resize for br handle', () => {
      const ctx: CursorContext = {
        ...base,
        activeTool: 'move',
        hoverHandle: 'br',
      };
      expect(resolveCursor(ctx)).toBe('nesw-resize');
    });

    it('returns ns-resize for t handle', () => {
      const ctx: CursorContext = {
        ...base,
        activeTool: 'move',
        hoverHandle: 't',
      };
      expect(resolveCursor(ctx)).toBe('ns-resize');
    });

    it('returns ew-resize for l handle', () => {
      const ctx: CursorContext = {
        ...base,
        activeTool: 'move',
        hoverHandle: 'l',
      };
      expect(resolveCursor(ctx)).toBe('ew-resize');
    });

    it('returns default when no hoverHandle', () => {
      const ctx: CursorContext = {
        ...base,
        activeTool: 'move',
        hoverHandle: null,
      };
      expect(resolveCursor(ctx)).toBe('default');
    });
  });

  it('returns crosshair for selection tool', () => {
    const ctx: CursorContext = {
      ...base,
      activeTool: 'selection',
    };
    expect(resolveCursor(ctx)).toBe('crosshair');
  });

  it('returns crosshair for crop tool', () => {
    const ctx: CursorContext = {
      ...base,
      activeTool: 'crop',
    };
    expect(resolveCursor(ctx)).toBe('crosshair');
  });

  it('returns none for brush tool', () => {
    const ctx: CursorContext = {
      ...base,
      activeTool: 'brush',
    };
    expect(resolveCursor(ctx)).toBe('none');
  });

  it('returns none for eraser tool', () => {
    const ctx: CursorContext = {
      ...base,
      activeTool: 'eraser',
    };
    expect(resolveCursor(ctx)).toBe('none');
  });

  it('returns copy for eyedropper tool', () => {
    const ctx: CursorContext = {
      ...base,
      activeTool: 'eyedropper',
    };
    expect(resolveCursor(ctx)).toBe('copy');
  });

  it('returns default for unknown tool', () => {
    const ctx: CursorContext = {
      ...base,
      activeTool: 'unknown' as any,
    };
    expect(resolveCursor(ctx)).toBe('default');
  });
});
