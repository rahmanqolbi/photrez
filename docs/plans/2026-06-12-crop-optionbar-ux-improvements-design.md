# Design Doc: Crop Tool Option Bar UX Improvements

## Context
The crop tool option bar currently displays 5 horizontal pills for aspect ratio presets (`Free`, `1:1`, `4:3`, `16:9`, `3:2`, `21:9`) and custom fields, which takes up significant horizontal space and creates UI clutter. To solve this and make the user experience professional and comfortable:
1. We will collapse presets into a single clean **Aspect Ratio Dropdown**.
2. We will add advanced pro-level options like **Lock Current Shape** and **Recent Ratios history** to solve major editor pain points.
3. We will reposition the **Swap** button to sit directly between the Width (W) and Height (H) inputs for a highly intuitive layout.

## Proposed Changes

### 1. Aspect Ratio Dropdown
- Replace the pill preset list with a single dropdown selector.
- Display label:
  - If `cropMode === "free"`, show `"Ratio: Free"`.
  - If `cropMode === "size"`, show `"Ratio: Size"`.
  - If `cropMode === "ratio"` and current aspect matches a preset, show `"Ratio: 16:9"`.
  - Otherwise, show `"Ratio: Custom (W:H)"`.
- Menu items:
  1. **Lock Current Shape**: Locks the aspect ratio based on the active selection's current proportions. (Only enabled if `cropMode === "free"`).
  2. **Recent Ratios**: List of up to 3 custom aspect ratios typed during the session.
  3. **Presets**: Free, Size, Custom, followed by standard ratio options (1:1, 4:5, 5:4, 2:3, 3:2, 4:3, 9:16, 16:9, 21:9).

### 2. Position Swap Between W & H Inputs
When W & H inputs are rendered (either in Custom Ratio mode or Physical Size mode), we will position the Swap button directly between them:
```
[ W Field ] [ Swap Button ] [ H Field ]
```
This applies to both:
- Custom Ratio `W` and `H` input group.
- Physical Size `W` and `H` input group.

### 3. Recent Ratios & Custom Ratio Focus
- Maintain a local or context state list for `recentRatios` (max 3 items).
- Clicking "Custom" in the dropdown toggles the custom ratio inputs, focuses the W input field automatically.

## Affected Files

### [CropOptionBar.tsx](file:///d:/Project/image-studio/apps/desktop/src/components/editor/CropOptionBar.tsx)
- Implement state tracking for `recentRatios`.
- Replace the preset button list with the new custom Dropdown.
- Rearrange Custom W:H layout to put Swap between W and H.
- Rearrange Physical Size W:H layout to put Swap between W and H.

## Verification Plan
1. Check that selecting preset options updates the crop grid immediately.
2. Verify that clicking "Lock Current Shape" locks the aspect ratio to the current crop frame geometry.
3. Verify that typing custom ratios adds them to the "Recent Ratios" list in the dropdown.
4. Verify that clicking the Swap button between W and H correctly flips the dimensions.
