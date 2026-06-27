# Design Doc: Fix Shift-Click Straight Lines for Soft Brush

## Context
When Shift is held and the user clicks on the canvas with the brush/eraser active, the pointer tools interpolate a line between `lastPaintCoords` and the click coordinates, generating a list of interpolated points.
However, in `useBrushOverlay.ts`, the soft brush path (hardness < 1) only extracted the last point of the array (`points.at(-1)`) and stamped it, completely ignoring the intermediate interpolated points. This resulted in Shift-click straight lines not rendering for soft brushes.

## Proposed Changes
We will modify the soft brush path in `onPaintStroke` to loop over all newly added points in the `points` array (rather than only the last one) and process them sequentially.

### [useBrushOverlay.ts](file:///d:/Project/image-studio/apps/desktop/src/components/editor/useBrushOverlay.ts)
Change the point processing block to:
```typescript
    const settingsKey = getPaintSessionKey(settings, fgColor());
    const needsReset =
      !paintSession ||
      paintSession.layerId !== activeId ||
      paintSession.isEraser !== isEraser ||
      paintSession.settingsKey !== settingsKey ||
      paintSession.maskWidth !== layer.width ||
      paintSession.maskHeight !== layer.height ||
      prevStrokePointCount === 0;

    if (needsReset) {
      paintSession = {
        layerId: activeId,
        isEraser,
        settingsKey,
        color: fgColor(),
        maskData: new Uint8ClampedArray(layer.width * layer.height),
        maskWidth: layer.width,
        maskHeight: layer.height,
        lastPoint: null,
        spacingCarry: 0,
        dabCount: 0,
      };

      if (isEraser) {
        eraserPreviewCanvas = new OffscreenCanvas(layer.width, layer.height);
        eraserPreviewCtx = eraserPreviewCanvas.getContext("2d")!;
      }
    }

    if (!paintSession) return;

    const tip = getBrushTip({ size: settings.size, hardness: settings.hardness, curve: "soft" });
    const spacing = getBrushDabSpacing(settings.size, settings.hardness, settings.flow);
    const alphaScale = settings.opacity * settings.flow * getEffectiveFlowMultiplier(settings.hardness);

    const startIndex = needsReset ? 0 : prevStrokePointCount;
    for (let i = startIndex; i < points.length; i++) {
      const pt = points[i];
      const localPt = documentToLayerLocal(
        pt.x,
        pt.y,
        layer.transform,
        layer.width,
        layer.height,
      );

      if (!paintSession.lastPoint) {
        stampBrushTipMaxAlpha(paintSession.maskData, layer.width, layer.height, tip, localPt.x, localPt.y, alphaScale);
        paintSession.dabCount += 1;
      } else {
        const result = interpolateDabs(paintSession.lastPoint, localPt, spacing, paintSession.spacingCarry);
        paintSession.spacingCarry = result.carry;
        for (const dab of result.dabs) {
          stampBrushTipMaxAlpha(paintSession.maskData, layer.width, layer.height, tip, dab.x, dab.y, alphaScale);
          paintSession.dabCount += 1;
        }
      }
      paintSession.lastPoint = localPt;
    }
```

## Verification Plan
1. Check that Shift-click straight line drawing works for soft brushes (hardness < 1).
2. Verify all unit tests pass.
