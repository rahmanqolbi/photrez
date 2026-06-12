# Design Doc: Remove Inner Brush Cursor Hardness Indicator Ring

## Context
The brush/eraser cursor overlay previously rendered an inner dashed circle (`data-paint-cursor-hardness`) when `hardness > 0 && hardness < 1`. This secondary ring is non-standard compared to major image editing applications (like Adobe Photoshop and Affinity Photo) and causes visual clutter and confusion.

## Proposed Changes
We will remove the secondary inner dashed ring entirely from `BrushCursorOverlay.tsx`.

### [BrushCursorOverlay.tsx](file:///d:/Project/image-studio/apps/desktop/src/components/editor/BrushCursorOverlay.tsx)
Remove the following block:
```tsx
<Show when={settings().hardness > 0 && settings().hardness < 1}>
  <circle
    data-paint-cursor-hardness
    cx={0}
    cy={0}
    ...
  />
</Show>
```

## Verification Plan
1. Check that `BrushCursorOverlay` renders without errors.
2. Verify that unit tests pass.
