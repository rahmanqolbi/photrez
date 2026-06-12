# Design Doc: Responsive Option Bar & Visual Unification

## Context
The Option Bar (located at the top of the canvas, rendering contextual settings for tools like Move, Crop, Brush, and Eraser) currently faces two main issues:
1. **Responsiveness/Overflow**: On narrow screen dimensions or when sidebars (Properties/Adjust, Layers) are fully expanded, the Option Bar elements overflow, causing an ugly horizontal scrollbar or cutting off critical options.
2. **Visual Inconsistency**: The design styles across different tool option bars are not unified:
   - Move: displays a pill-like grey header of active tool.
   - Brush: displays an uppercase oranje header (`Brush Options` / `Eraser Options`).
   - Crop: does not display any tool header.
   - Various buttons, inputs, and dropdown selectors use custom in-file styling instead of unified shared styles.

## Proposed Changes
We will implement a responsive Option Bar design utilizing CSS Container Queries to dynamically adapt to the available horizontal space, combined with visual unification of the components.

### 1. Visual Unification
- **Shared Components**: Move/unify shared visual elements to `OptionBarShared.tsx`.
- **Tool Identifier Pill**: Ensure every tool option bar starts with a unified pill showing the active tool's icon and label:
  - Height: `24px`
  - Style: `border border-editor-field-border bg-editor-field rounded-[4px] px-2 text-[11px] font-medium text-editor-text-dim capitalize flex items-center gap-1.5`
- **Fields and Selectors**: Style custom inputs and selection dropdowns (like Crop Unit Selector, Composition Guide) to look like standard `EditableNumField` inputs (height `24px`, font size `11px`, background `bg-editor-field`, subtle border).

### 2. Container Queries & Progressive Hiding
Wrap the option bar content in a container named `optionbar`:
- Define Option Bar wrapper in `OptionBar.tsx` as a container: `@container optionbar (min-width: 0px)`.
- Use container query rules (or Tailwind container queries if supported, else standard CSS container query styles) to:
  - `@container optionbar (max-width: 900px)`: Hide text labels on toggle buttons (Auto, Snap, Delete Cropped, Fill BG) and labels for coordinates (`X`, `Y`, `W`, `H`) or group prefixes (`Align`, `Flip`).
  - `@container optionbar (max-width: 650px)`: Hide secondary group controls (e.g. Align, Flip on Move tool, custom W:H or Guide mode on Crop tool) and display them in a **More Options** (`...`) dropdown menu at the end of the Option Bar.

### 3. "More Options" Overflow Menu
- Add a dropdown component (using a custom SolidJS popover or dropdown trigger) at the end of the Option Bar.
- This dropdown is only visible when the container is narrow (`max-width: 650px`).
- It renders the hidden options as a vertical list menu with desktop-like styling (snappy hover state, tight padding, clear borders).

## Affected Files

### [OptionBar.tsx](file:///d:/Project/image-studio/apps/desktop/src/components/editor/OptionBar.tsx)
- Wrap in `@container optionbar` container.
- Manage overflow state or pass responsive class names.

### [OptionBarShared.tsx](file:///d:/Project/image-studio/apps/desktop/src/components/editor/OptionBarShared.tsx)
- Add unified styles, standard Tool Pill component, and common dropdown primitives.
- Implement a reusable Popover/Dropdown component for overflow options.

### [MoveOptionBar.tsx](file:///d:/Project/image-studio/apps/desktop/src/components/editor/MoveOptionBar.tsx)
- Update layout to utilize unified styles.
- Support container query collapsing for text and overflow.

### [CropOptionBar.tsx](file:///d:/Project/image-studio/apps/desktop/src/components/editor/CropOptionBar.tsx)
- Update layout to utilize unified styles.
- Support container query collapsing.

### [BrushOptionBar.tsx](file:///d:/Project/image-studio/apps/desktop/src/components/editor/BrushOptionBar.tsx)
- Replace custom inline styles with standard inputs or matching class elements.
- Support container query collapsing.

## Verification Plan
1. Check visually in both wide and narrow screen sizes.
2. Confirm that resizing the browser or opening/closing panels correctly triggers label hiding and the "More Options" dropdown.
3. Ensure no regression in tool functionality (Move, Crop, Brush, and Eraser settings work correctly).
4. Run frontend tests to ensure no broken imports or unit tests.
