# Design Specification — Interactive Navigator Panel

Date: 2026-06-04
Status: Approved

## Overview

This specification details the implementation of an interactive, feature-rich Navigator Panel for Photrez. The goals are:
1. **Live Preview Composition**: Replace the static thumbnail image with a dynamic canvas that draws the document composited layers (or background) scaled to fit the thumbnail boundary.
2. **Interactive Viewport Frame (Red Box)**: Draw a red rectangular boundary representing the active viewport visibility window relative to the entire canvas document space.
3. **Drag to Pan**: Allow the user to drag the red viewport frame (or click anywhere on the preview thumbnail) to center the viewport window around the clicked/dragged coordinate.
4. **Interactive Zoom Slider**: Allow the user to drag the zoom slider or click quick zoom buttons to adjust the viewport zoom dynamically.

## Proposed Components & Math

### 1. Aspect Ratio Fitting
The Navigator thumbnail area is constrained to a fixed height (e.g. `88px`) and variable width matching the panel (`w` approx `240px`).
Let the document size be $D_w \times D_h$ (e.g., $800 \times 600$).
We calculate scale factor $S_{nav} = \min(88 / D_h, 240 / D_w)$ to center the document rendering inside the navigator canvas.

### 2. Viewport Frame Coordinates
The main viewport shows a sub-region of the document depending on `panX`, `panY`, `zoom`, and container dimensions $V_w \times V_h$.
We map viewport coordinates to the Navigator canvas space:
- Viewport Left: $X_{left} = -panX / zoom$
- Viewport Top: $Y_{top} = -panY / zoom$
- Viewport Width: $W_{width} = V_w / zoom$
- Viewport Height: $H_{height} = V_h / zoom$

These are then scaled by $S_{nav}$ and offset by the thumbnail's centered layout margins.

### 3. Drag to Pan Action
When a pointerdown/pointermove occurs inside the Navigator canvas:
1. Map pointer coordinate $(x, y)$ back to document coordinate $(X_{doc}, Y_{doc})$.
2. Update the document's pan state such that the center of the main viewport matches $(X_{doc}, Y_{doc})$:
   - `panX = (V_w / 2) - X_doc * zoom`
   - `panY = (V_h / 2) - Y_doc * zoom`

## Proposed Changes

### [NEW] [Navigator.tsx](file:///d:/Project/image-studio/apps/desktop/src/components/editor/Navigator.tsx)
Extract the navigator layout from `LayersPanel.tsx` into a dedicated component. It will contain:
- A `<canvas>` element for drawing the live thumbnail preview and drawing the viewport bounding box overlay.
- SolidJS dynamic handlers for mouse/pointer events to update viewport coordinates.
- A functional zoom slider.

### [MODIFY] [LayersPanel.tsx](file:///d:/Project/image-studio/apps/desktop/src/components/editor/LayersPanel.tsx)
- Import `<Navigator>` and replace the static navigator markup container.
