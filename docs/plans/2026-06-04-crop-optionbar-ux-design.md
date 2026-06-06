# Design Doc: Crop Option Bar Visual & UX Improvements

**Date:** 2026-06-04  
**Status:** Approved  
**Topic:** Crop Tool Option Bar & Viewport UX Improvements for crop workflow pain points  

## 1. Goal
Improve the Crop tool option bar and viewport preview to resolve common crop workflow pain points.
Specifically:
1. Make the Destructive vs. Non-destructive crop mode visually intuitive (interactive canvas preview + clear label rename).
2. Implement smart orientation swapping (Center-locked W/H swapping) and preset orientation change.
3. Remove the floating crop mode status indicator popup ("Mode Potong") which clutter the screen.

---

## 2. Proposed Design

### A. Destructive vs. Non-Destructive UX ("Delete Cropped")
- **Option Bar Button Label:** Rename the toggle button from `"Delete"` to `"Delete Cropped"` with a detailed tooltip:
  - Active: `"Delete Cropped Pixels (Destructive)"`
  - Inactive: `"Keep Cropped Pixels (Non-Destructive)"`
- **Visual Shield Preview (`CropOverlay.tsx`):**
  - When `Delete Cropped` is active (destructive), the `<rect>` shield overlay fill will be set to solid canvas background color `#161618` with full opacity (or `rgba(22,22,24,0.98)`), hiding all pixels outside the crop boundary to simulate deletion.
  - When `Delete Cropped` is inactive (non-destructive), the shield overlay will be a semi-transparent `rgba(0,0,0,0.55)` overlay, letting the user see the hidden pixels.

### B. Smart Centered Swap & Auto-Fit
- **Center-Locked Swap:** Clicking the swap button swaps `w` and `h` of the `cropRect` by computing the center coordinate and rebuilding the bounds around it.
- **Sync Aspect Ratio & Size Targets:**
  - Ratio mode: swap `w` and `h` in `cropAspect`.
  - Size mode: swap `w` and `h` in `cropSizeTarget`.
- **Instant Aspect Ratio fitting:**
  - When the crop mode changes (e.g. from `free` to `ratio` or `size`), when a preset is selected (including custom preset initialization), or when custom ratio or size targets are typed and committed, the system immediately runs `fitCropRectToAspect` to shape the canvas crop box dynamically (resolving the "nothing happens" issue).

### C. Remove Floating Mode Indicator & Explain Freeform Read-Only Input
- Remove `<CropModeIndicator>` from `CanvasViewport.tsx` layout structure.
- **Freeform Read-Only Design:** In "Free" mode, crop box coordinates are determined freely by canvas dragging. Hence, option bar fields display current size (W & H) as read-only labels using `NumField`. To type exact custom ratios or sizes, the user switches the dropdown to "Ratio" or "Size" modes respectively.
- **Decoupled Custom Preset Dropdown:** Introduce a `selectedPreset` signal in the option bar to track the select dropdown status independently. This decouples the dropdown display state from the active ratio coordinates, preventing the W/H inputs from collapsing if a custom ratio matches a default preset (like `16:9`).

---

## 3. Implementation Plan Routing
The next step is to create a detailed implementation plan in `docs/plans/task.md` or `docs/plans/2026-06-04-crop-optionbar-ux-implementation.md` using the `writing-plans` workflow shims.
