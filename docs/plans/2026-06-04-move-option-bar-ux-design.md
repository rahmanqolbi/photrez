# Design Spec: Move Option Bar UX & Visual Improvements

## Goal
Improve the Move Tool's Option Bar visually and functionally to clarify the state of auto-select and snapping, provide real-time hover selection targeting, and add canvas alignment features to solve classic Photoshop UX pain points.

## Proposed Changes

### 1. Toggle Button Visual Redesign
Modify `ToggleBtn` in `apps/desktop/src/components/editor/OptionBarShared.tsx` to use the **Amber Accent Tint** for active states, aligning with the "Soft & Snappy" design system.

- **Active State Class**:
  `border-editor-accent/40 bg-editor-accent/10 text-editor-text shadow-[inset_0_1px_2px_rgba(225,90,23,0.15)]`
- **Label Text**: Upgraded to `text-editor-text` (bright white) and `font-medium` for high visibility.

### 2. Auto-Select Hover Indicator Badge
Add a dynamic badge to the Move Option Bar showing the active hover target when Auto-Select is enabled:
- Read `hoveredLayerId()` from `EditorContext`.
- If `moveAutoSelect()` is active and a layer is hovered, display a subtle, compact badge in the Option Bar: `Target: [Layer Name]`.
- This informs the user exactly which layer will be selected on click.

### 3. Quick Canvas/Selection Alignment
Add 6 alignment buttons (Align Left, Align Center Horizontal, Align Right, Align Top, Align Center Vertical, Align Bottom) to the Move Option Bar:
- Import `AlignLeft`, `AlignRight`, `AlignTop`, and `AlignBottom` from `lucide-solid` and register them in `icons.tsx`.
- Alignment calculation inside `MoveOptionBar.tsx`:
  - Determine boundary container width `W` and height `H` (default to `docWidth()` and `docHeight()` or active selection boundary if any is present).
  - Calculate target position coordinates based on active layer width/height and layer transform bounds.
  - Call `engine.transformLayer` to apply the coordinates and commit to history.

## Verification Plan

### Automated Tests
- Run `pnpm run build` to verify compilation.
- Run `pnpm --filter photrez-desktop test` to ensure vitest test suites continue to pass.

### Manual Verification
- Launch the Tauri app using `pnpm tauri dev`.
- Select the Move Tool.
- Toggle Auto and Snap buttons and verify they show high contrast and a Photon Amber background when active.
- Hover over various layers with Auto-Select active and verify the target layer name indicator appears.
- Select a layer and click alignment buttons to verify the layer aligns correctly to canvas edges/centers.
