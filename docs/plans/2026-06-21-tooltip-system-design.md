# Tooltip System Design Document

**Status:** Approved
**Created:** 2026-06-21
**Topic:** Reusable Accessible Tooltip System & Keyboard Shortcuts Expansion

---

## 1. Goal

Implement a compact, responsive, and fully accessible tooltip system matching Photrez's **"Soft & Snappy"** desktop visual aesthetic, and wire keyboard shortcuts for the remaining Left Tool Rail items to ensure tooltip accuracy.

## 2. Requirements & UX Specs

### Visual Styling (DESIGN.md / GEMINI.md Parity)
- **Compact & Mechanical**: The tooltip must feel like a native desktop app overlay. No bloated layouts.
- **Color Palette**: Solid dark background (`#181818` or `rgba(24, 24, 24, 0.95)`), boundary border using `--color-border-subtle` or `rgba(255, 255, 255, 0.1)`, text using neutral white/gray.
- **Corners**: Rounded corners using `rounded-[4px]` (`--radius-sm`).
- **Typography**: Compact typography (`text-[11px]` font-sans).
- **Shortcut Display**: Keyboard shortcuts (e.g., `V`, `B`, `Ctrl+S`) rendered inside a subtle `<kbd>` element styled like a small keyboard keycap: `ml-1.5 px-1 py-0.5 rounded bg-white/10 text-white/50 text-[9px] font-mono border border-white/5 uppercase`.

### Interaction & Lifecycle (Focus/Hover)
- **Hover Delay (400ms)**: Tooltips must not flicker instantly as the user drags their cursor across the UI. A `400ms` show delay is applied when entering the target.
- **Snappy Warm-Start**: If another tooltip was visible recently (within `< 250ms`), subsequent tooltips on other elements will activate **instantly** (0ms delay). This mirrors professional tools behavior.
- **Keyboard Focus (Instant)**: Gaining focus (`focusin`) on the target element shows the tooltip instantly (0ms delay) since keyboard action indicates clear intent. Losing focus (`focusout`) hides it instantly.
- **Escape Key Dismissal**: Pressing the `Escape` key immediately closes any active tooltip.
- **Clean Exit**: Leaving the element, blurring it, or unmounting the component immediately cancels any active timers and cleans up DOM nodes and event listeners.

### Accessibility (ARIA)
- **Aria Roles**: The tooltip popup is rendered with `role="tooltip"`.
- **Dynamic Association**: Opening the tooltip generates a unique ID (e.g. `tooltip-id-1`) and sets `aria-describedby="tooltip-id-1"` on the target child element, allowing screen readers to immediately describe the hovered/focused control.

### Positioning Matrix
- Supported placements: `top`, `bottom`, `left`, `right`. Defaults to `top`.
- The position is computed dynamically relative to the target's bounding client rect.
- Clamped relative to the window edges with a safety padding (`6px`) to prevent clipping.

---

## 3. Architecture & Data Flow

```text
Target Control (e.g. Button)
  | 
  +-- mouseenter / focusin  ==> Starts delay timer (400ms or 0ms if "warm")
  +-- mouseleave / focusout ==> Cancels timer / closes tooltip, starts warm-start timer (250ms)
  +-- keydown (Escape)      ==> Closes tooltip immediately
  |
  v (If visible)
SolidJS Portal in document.body
  |
  +-- Measure tooltip bounds via ref
  +-- Calculate (x, y) relative to Target Rect
  +-- Render tooltip with `position: fixed` and transition animations
```

---

## 4. Key Components & Files

### 1. `apps/desktop/src/components/editor/Tooltip.tsx` (New)
A wrapper component that wraps any interactive child element using `display: contents` (so it does not impact grid/flex parent layouts) and attaches event listeners dynamically to its `firstElementChild`.

```tsx
import { JSX, createSignal, onMount, onCleanup, createEffect, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { clsx } from "clsx";

interface TooltipProps {
  content: string;
  shortcut?: string;
  disabled?: boolean;
  placement?: "top" | "bottom" | "left" | "right";
  children: JSX.Element;
}
```

### 2. `apps/desktop/src/components/editor/LeftToolRail.tsx` (Modify)
Replace native `title` and `aria-label` attributes on tool rail buttons with the `<Tooltip>` component.
- Move Tool -> `V`
- Rectangle Select -> `M`
- Crop Tool -> `C`
- Eyedropper Tool -> `I`
- Brush Tool -> `B`
- Eraser Tool -> `E`

### 3. `apps/desktop/src/components/editor/useCanvasKeyboard.ts` (Modify)
Add key listeners for:
- `v` -> `setActiveTool("move")`
- `m` -> `setActiveTool("selection")`
- `c` -> `setActiveTool("crop")`
- `i` -> `setActiveTool("eyedropper")`
Ensure key listeners are guarded against text inputs/active elements.

---

## 5. Testing & Verification

### Unit and Wiring Tests
- **Tooltip Component Test** (`apps/desktop/src/components/editor/__tests__/Tooltip.test.tsx`):
  - Renders child correctly.
  - Show on hover with 400ms delay.
  - Cancel on mouse leave.
  - Show instantly on focus.
  - Dynamic positioning logic (clamping, placement offsets).
  - ARIA `aria-describedby` presence on child.
- **LeftToolRail Wiring Test**: Verify tool rail buttons render `<Tooltip>` and trigger correct actions.
- **Keyboard Shortcuts Test**: Verify `V`, `M`, `C`, `I` keys update active tool state in `EditorContext`.
