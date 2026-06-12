# Brush & Eraser UX Improvements Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Improve the painting and erasing user experience in Photrez by implementing Alt-Hold Eyedropper, Shift-Click Straight Lines, and Shift-Drag Axis Locking.

**Architecture:** Implement state-based input routing in SolidJS viewport hooks (`useCanvasPointerTools`, `useCanvasKeyboard`), intercepting events based on modifier keys to route drawing to Eyedropper or locking coordinate inputs.

**Tech Stack:** SolidJS, TypeScript, HTML PointerEvents & KeyboardEvents.

---

### Task 1: UI / Viewport Context & Alt-Hold Eyedropper

**Files:**
- Modify: [useCanvasPointerTools.ts](file:///d:/Project/image-studio/apps/desktop/src/components/editor/useCanvasPointerTools.ts)
- Modify: [cursorResolver.ts](file:///d:/Project/image-studio/apps/desktop/src/viewport/cursorResolver.ts)
- Modify: [BrushCursorOverlay.tsx](file:///d:/Project/image-studio/apps/desktop/src/components/editor/BrushCursorOverlay.tsx)

**Step 1: Implement Alt-Hold Eyedropper in input-handling**
Add logic to detect `isAltPressed` in pointer events. When active during brush/eraser usage, sample pixels from the canvas and set the foreground color using `engine.samplePixel(coords.x, coords.y)`.

**Step 2: Update cursor to Eyedropper style**
Return `"copy"` (eyedropper) cursor when `isAltPressed` is true and Brush/Eraser is active. Hide the circular brush outline.

**Step 3: Commit**
```bash
git add apps/desktop/src/components/editor/useCanvasPointerTools.ts apps/desktop/src/viewport/cursorResolver.ts apps/desktop/src/components/editor/BrushCursorOverlay.tsx
git commit -m "feat: implement Alt-Hold Eyedropper logic and cursor styling"
```

---

### Task 2: Shift-Click Straight Lines

**Files:**
- Modify: [useCanvasPointerTools.ts](file:///d:/Project/image-studio/apps/desktop/src/components/editor/useCanvasPointerTools.ts)

**Step 1: Track last paint coords**
Maintain `lastPaintCoords: { x: number, y: number } | null` which updates when stroke completes or click paint occurs. Clear it if the active tool changes.

**Step 2: Connect endpoints on Shift-Click**
If `e.shiftKey` is true on Pointer Down and `lastPaintCoords` is present, interpolate points linearly from `lastPaintCoords` to the clicked point, starting the stroke with the complete line segment.

**Step 3: Commit**
```bash
git add apps/desktop/src/components/editor/useCanvasPointerTools.ts
git commit -m "feat: implement Shift-Click straight line drawing connection"
```

---

### Task 3: Shift-Drag Axis Lock

**Files:**
- Modify: [useCanvasPointerTools.ts](file:///d:/Project/image-studio/apps/desktop/src/components/editor/useCanvasPointerTools.ts)

**Step 1: Lock axis in onCanvasPointerMove**
When `e.shiftKey` is true, calculate relative distance from `dragStart`. If it exceeds 5px, lock to horizontal or vertical axis. Force Y or X coords to lock position. Clear lock if Shift is released.

**Step 2: Commit**
```bash
git add apps/desktop/src/components/editor/useCanvasPointerTools.ts
git commit -m "feat: implement Shift-Drag axis constraint locking"
```
