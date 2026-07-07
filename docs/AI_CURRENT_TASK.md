# Current Task: Edge Auto-Scroll — Task 2: Wire into pointer handlers [COMPLETE]

**Status**: COMPLETE

## Task Description
Wire edge auto-scroll detection into `onCanvasPointerMove` and `onCanvasPointerUp`:
1. Store pointer position in `onCanvasPointerMove` right after the panning guard.
2. Edge detection block before `getDocCoords` call, checking tool is brush/eraser/selection/crop and dragging is active.
3. Stop RAF on pointer up in `onCanvasPointerUp` after the engine guard.

## Verification
- ✅ Build green (`bun run build` completed successfully)
- ✅ All 2286 frontend tests passed


