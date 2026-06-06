# Crop Option Bar Visual & UX Improvements Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Improve Crop tool option bar and viewport preview to resolve crop workflow pain points (Delete Cropped visual representation, Center-locked W/H swapping, and removing the floating crop mode HUD).

**Architecture:** Update `CropOptionBar.tsx` toggle label and swap logic. Update `CropOverlay.tsx` to conditionally fill the shield mask with solid background color based on delete toggle status. Remove `CropModeIndicator` from `CanvasViewport.tsx`.

**Tech Stack:** SolidJS, TypeScript, Tailwind CSS, SVG

---

### Task 1: Update Delete Toggle Label and Tooltips
**Files:**
- Modify: `apps/desktop/src/components/editor/CropOptionBar.tsx`

**Step 1: Code modification to rename toggle label and add precise tooltips**
Modify the ToggleBtn for cropDeletePixels to use "Delete Cropped" label, and add tooltips to option bar buttons.

**Step 2: Run build to ensure types are correct**
Run: `pnpm run build`
Expected: PASS

**Step 3: Commit changes**
```bash
git add apps/desktop/src/components/editor/CropOptionBar.tsx
git commit -m "feat: rename crop delete toggle to Delete Cropped"
```

---

### Task 2: Implement Interactive Canvas Shield Mask Preview
**Files:**
- Modify: `apps/desktop/src/components/editor/CropOverlay.tsx`
- Modify: `apps/desktop/src/components/editor/CanvasViewport.tsx`

**Step 1: Pass cropDeletePixels status to CropOverlay**
Modify `CanvasViewport.tsx` to pass `cropDeletePixels()` to `<CropOverlay deleteCropped={cropDeletePixels()} />`.

**Step 2: Update CropOverlay to change shield opacity/color dynamically**
In `CropOverlay.tsx`, read `props.deleteCropped` and set the shield `<rect>` fill to `#161618` (canvas background) with `fill-opacity={0.98}` when active, and `rgba(0,0,0,0.55)` when inactive.

**Step 3: Run build to ensure types are correct**
Run: `pnpm run build`
Expected: PASS

**Step 4: Run unit tests to verify behavior**
Run: `pnpm --filter photrez-desktop test`
Expected: PASS

**Step 5: Commit changes**
```bash
git add apps/desktop/src/components/editor/CropOverlay.tsx apps/desktop/src/components/editor/CanvasViewport.tsx
git commit -m "feat: implement interactive canvas shield preview based on Delete Cropped state"
```

---

### Task 3: Implement Smart Center-Locked Swap for Crop Rect
**Files:**
- Modify: `apps/desktop/src/components/editor/CropOptionBar.tsx`

**Step 1: Implement center-locked math on swap button click**
Update the Swap button onClick callback in `CropOptionBar.tsx` to calculate center, swap dimensions, and offset top-left:
```typescript
const rect = cropRect();
if (rect) {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const nw = rect.h;
  const nh = rect.w;
  setCropRect({
    x: cx - nw / 2,
    y: cy - nh / 2,
    w: nw,
    h: nh
  });
}
```

**Step 2: Run build to ensure compilation is clean**
Run: `pnpm run build`
Expected: PASS

**Step 3: Run frontend tests to ensure no regressions**
Run: `pnpm --filter photrez-desktop test`
Expected: PASS

**Step 4: Commit changes**
```bash
git add apps/desktop/src/components/editor/CropOptionBar.tsx
git commit -m "feat: implement smart center-locked swap for crop box"
```

---

### Task 4: Remove Floating Crop Mode Indicator
**Files:**
- Modify: `apps/desktop/src/components/editor/CanvasViewport.tsx`

**Step 1: Remove CropModeIndicator reference and rendering**
In `CanvasViewport.tsx`, remove import of `CropModeIndicator` and remove `<CropModeIndicator isActive={activeTool() === "crop"} />`.

**Step 2: Run build to ensure compilation is clean**
Run: `pnpm run build`
Expected: PASS

**Step 3: Run frontend tests to ensure no regressions**
Run: `pnpm --filter photrez-desktop test`
Expected: PASS

**Step 4: Commit changes**
```bash
git add apps/desktop/src/components/editor/CanvasViewport.tsx
git commit -m "feat: remove floating crop mode indicator HUD"
```
