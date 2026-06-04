# Design Specification — Specific Layer Locking System (Transparency, Position, Rotation)

Date: 2026-06-04
Status: Approved

## Overview

This specification details the implementation of a Photoshop-style specific layer locking system. In addition to the existing global "Lock All" (`locked`) property, we introduce:
1. **Lock Transparency** (`lockTransparency`): Prevents brush painting from altering transparent pixels.
2. **Lock Position** (`lockPosition`): Prevents changes to the X and Y coordinates.
3. **Lock Rotation** (`lockRotation`): Prevents changes to the rotation angle.

## Proposed Changes

### 1. Engine Types (`src/engine/types.ts`)
Add optional locking parameters to `LayerNode`:
```typescript
export interface LayerNode {
  // ... existing fields
  locked: boolean; // Lock All
  lockTransparency?: boolean;
  lockPosition?: boolean;
  lockRotation?: boolean;
}
```

### 2. Document Engine (`src/engine/document.ts`)
- Implement setter methods for the new lock properties:
  - `setLayerLockTransparency(id: LayerId, locked: boolean)`
  - `setLayerLockPosition(id: LayerId, locked: boolean)`
  - `setLayerLockRotation(id: LayerId, locked: boolean)`
- Guard transformation methods (`moveLayer`, `transformLayer`):
  - If `lockPosition` is true, ignore changes to `x` and `y`.
  - If `lockRotation` is true, ignore changes to `rotation`.
- Ensure restoration logic in `snapshot`/`restore` correctly copies these new fields.

### 3. Layers Panel UI (`src/components/editor/LayersPanel.tsx`)
- Bind the action buttons in the lock options header:
  - Paint Bucket icon -> toggle `lockTransparency`
  - Maximize icon -> toggle `lockPosition`
  - Rotate icon -> toggle `lockRotation`
- Highlight active lock modes using `text-editor-accent` and disable controls accordingly.
