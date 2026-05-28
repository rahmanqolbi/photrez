# Design Document - Snappy & Mechanical Toolbar Overhaul

**Date**: 2026-05-28  
**Topic**: Snappy & Mechanical Toolbar Overhaul  
**Status**: APPROVED

---

## 1. Goal & Aesthetic Principles
The goal is to completely restructure and redesign the **Contextual Tool Options Bar (Toolbar)** in Photrez to align it with high-precision, professional desktop CAD/graphics software (e.g. Figma, Blender, Adobe Lightroom) and strictly eliminate all forms of "AI slop" (no blurry drop shadows, no glassmorphism, no neon glowing edges, and no mismatched heights).

### Anti-AI Slop Guidelines:
- **Zero-Tint Neutral Surfaces**: All backgrounds use solid `#202022` (`bg-studio-panel`) and `#28282B` (`bg-studio-input`). No blur backdrops or translucent blends.
- **Sharp Mechanical Borders**: Groups and buttons are defined by strict 1px solid borders (`border-studio-border` / `#343438`).
- **Tactile Inset Depth**: Inactive buttons are flush, while active state buttons sit in pressed wells via `shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.5)]`.
- **Snappy Micro-interactions**: Hover and active transitions trigger instantly (0ms transition delay) to feel mechanical and mechanical.

---

## 2. Layout & Grid Specifications

- **Container Dimensions**:
  - Toolbar height: `h-10` (`40px`).
  - Vertical alignment: Centered.
  - Horizontal alignment: Flex-row with `justify-between`.
- **Unified Controls Height**:
  - Every single interactive element (Color swatch picker, Stroke numeric input box, Segmented selector, Inspector toggle, and Export button) is locked at exactly **`26px`** height (`h-[26px]`).
- **Mechanical Dividers**:
  - High-density control groups are separated by crisp, 50% height vertical dividers:
    ```tsx
    <div class="h-4 border-r border-studio-border self-center"></div>
    ```

---

## 3. Left Component Specifications (Tool Options)

### A. Active Tool Indicator
- **Content**: Lucide `PenTool` icon (accent color) + `"Pen Tool"` label text (`text-[12px] font-bold text-text-primary uppercase tracking-wider`).
- **Divider**: Followed immediately by a mechanical divider line.

### B. "Fill" Color Swatch Button
- **Structure**: A button with class:
  `h-[26px] bg-studio-input border border-studio-border hover:bg-studio-elevated rounded-md px-2 flex items-center gap-1.5 cursor-default transition-colors duration-75`
- **Children**:
  - Small 10x10px color square: `w-2.5 h-2.5 rounded-[1px] bg-gradient-to-tr from-accent to-accent-hover border border-white/20 flex-shrink-0`
  - Name label: `"Photon Amber"` (`text-[12px] font-semibold text-text-primary`)
  - Arrow dropdown: `ChevronDown` size 12 (`text-text-muted`)

### C. "Stroke" Width Input with Micro-Spinner
- **Structure**: A single integrated widget wrapper with class:
  `flex items-center bg-studio-input border border-studio-border rounded-md overflow-hidden h-[26px] focus-within:border-accent transition-colors duration-100`
- **Children**:
  - **Label Prefix**: Teks label `"Stroke"` (`text-[10px] font-bold text-text-muted px-2 select-none border-r border-studio-border/50 h-full flex items-center bg-white/[1%]`).
  - **Numeric Input Box**: An input with class:
    `w-10 text-center text-[12px] font-semibold text-text-primary bg-transparent border-none outline-none tabular-nums px-1`
    - Displays number murni `2.5`. Allows input typing.
  - **Unit Suffix**: Static `"px"` (`text-[10px] font-bold text-text-muted select-none pr-1.5 pointer-events-none`).
  - **Micro-Spinner Step Buttons**: Locked inside the input at the right edge:
    - Container class: `w-4.5 h-full flex flex-col divide-y divide-studio-border border-l border-studio-border`
    - Up Button: Lucide `ChevronUp` or character `▲` styled mini (`flex-1 flex items-center justify-center hover:bg-white/10 hover:text-white transition-colors cursor-default text-[8px]`), increases stroke by 0.5.
    - Down Button: Lucide `ChevronDown` or character `▼` styled mini (`flex-1 flex items-center justify-center hover:bg-white/10 hover:text-white transition-colors cursor-default text-[8px]`), decreases stroke by 0.5 (min 0).

### D. "Stroke Style" Segmented Selector
- **Structure**: A mini capsule container:
  `bg-studio-input border border-studio-border rounded-md p-0.5 h-[26px] flex items-center gap-0.5 select-none`
- **Grup Buttons**:
  - Solid: `bg-studio-elevated text-accent border border-studio-border-strong rounded shadow-sm px-1.5 h-full flex items-center justify-center` with custom solid line indicator.
  - Dashed: `text-text-muted hover:text-text-primary px-1.5 h-full flex items-center justify-center` with dashed line indicator.
  - Dotted: `text-text-muted hover:text-text-primary px-1.5 h-full flex items-center justify-center` with dotted line indicator.

---

## 4. Right Component Specifications (Action Buttons)

### A. "Inspector" Panel Toggle Button
- **Structure**: A button element linked to the `inspectorOpen` state.
- **Active State (Inspector Open)**:
  `h-[26px] px-2.5 flex items-center gap-1.5 bg-studio-bg border border-accent/40 text-accent rounded-md shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.5)] text-[11px] font-bold tracking-wider cursor-default`
- **Inactive State (Inspector Closed)**:
  `h-[26px] px-2.5 flex items-center gap-1.5 bg-studio-input border border-studio-border text-text-secondary hover:text-white hover:bg-studio-elevated rounded-md text-[11px] font-bold tracking-wider cursor-default transition-all duration-75`
- **Children**: Lucide `SlidersHorizontal` (size 13) + `"INSPECTOR"` text label.

### B. "Export" Graphic Button
- **Structure**: A high-contrast action button:
  `h-[26px] px-3 flex items-center gap-1.5 bg-accent hover:bg-accent-hover active:bg-accent-active text-white text-[11px] font-bold tracking-wider rounded-md shadow-sm cursor-default transition-colors`
  - Note: No slow animation transitions, pure crisp hover switches.
- **Children**: Lucide `Share` (size 13) + `"EXPORT"` text label.
