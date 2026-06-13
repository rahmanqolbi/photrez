# UI_GUIDE.md â€” Photrez UI Design Reference

> Consolidated UI rules for Photrez MVP.
> Covers style, components, layout, copy, native behavior, user flows, and review checklist.
> All design tokens referenced here are defined in `docs/reference/design-tokens.md`.

---

## 1. Core Philosophy â€” "Soft & Snappy"

1. **Familiarity & Muscle Memory**: Standard industry layout (Toolbar top, Inspector right, Tool rail left). Users must know how to use the app instantly.
2. **Invisible UI (Zero-Tint Neutrality)**: True neutral gray surfaces (OKLCH, no blue/yellow tint) â€” UI must not distort color perception during image editing.
3. **Soft & Snappy Aesthetic**: Avoid "Mechanical Rigidity" (2px sharp) and "AI Slop" (wide blurs). Modular radius base `6px` (`--radius`). Modern and friendly, but dense for professional efficiency.
4. **Docked Precision**: Panels dock to window edges. Inner corners rounded (facing canvas), outer corners sharp (touching window). No external margins.
5. **Distinct Identity**: Single accent color **Photon Amber** (`oklch(0.74 0.15 55)`) â€” warm, high contrast on neutral UI.

---

## 2. Layout System (Editor Shell)

### Shell Regions

| Region | Size | Notes |
|---|---|---|
| **AppTitleBar** | H: `46px` | Desktop titlebar style. Menu left, title center, window controls right. Logo "pz" 30px |
| **DocumentTabsBar** | H: `44px` | Active tab: 2px Photon Amber indicator below. Text: `12px font-medium` |
| **OptionBar** | H: `44px` | Tool-specific parameters (brush size, opacity, blend mode) |
| **LeftToolRail** | W: `52px` | 6 MVP tools: Move, Rect Select, Crop, Eyedropper, Brush, Eraser. Icon `18px`, button `36px`. Color swatches at bottom via `mt-auto` |
| **RightDock** | W: `560px` (2XL: `634px`) | Side-by-side: Properties `300px`/`336px` + Layers `260px`/`298px` |
| **Canvas Viewport** | Flex fill | Background: `oklch(0.17 0 0)` (darkest) |
| **StatusBar** | H: `32px` | Zoom, dimensions, status hint, connection status |

### Viewport Targets

- Primary: `1366x768` and `1920x1080`
- Minimum: `960x640` (scroll overflow)

### Responsive Rules

- **â‰¤ 1280x720**: RightDock hidden, toggle via `Ctrl+Shift+P` (overlay, max `min(92vw, 634px)`)
- **â‰¥ 1440x900**: RightDock locked side-by-side

### Focus/Tab Order

`Titlebar â†’ Left Tool Rail â†’ Option Bar â†’ Canvas â†’ Properties â†’ Layers â†’ Status Bar`

---

## 3. Visual Density & Typography

### Spacing

- Base unit: `4px` (`gap-1` = 4px, `gap-2` = 8px)
- Panel padding: `12-14px` (`px-3.5 py-3.5`)
- Compact control height: `26px` (inputs, selects, actions)

### Typography

- Font: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- **Tabular nums**: MANDATORY global `font-variant-numeric: tabular-nums` â€” prevents shifting in transform coordinates and percentages
- Base: `13px` (native desktop standard)
- Panel headers: `14px font-semibold`
- Tabs (all): `12px font-medium` â€” prevents optical illusion where interactive buttons appear larger than static text
- Sub-labels: `11-12px font-medium`
- Min size: `11px` (never smaller)

### Color & Surfaces

- Canvas: `oklch(0.17 0 0)` (darkest)
- Panels: `oklch(0.235 0 0)`
- Recessed fields: `oklch(0.265 0 0)`, border `oklch(0.34 0 0)`

---

## 4. Component Rules

### Buttons

- Height: `26px` (panel), `28px` (primary action like Export)
- Padding: `12px` standard, `8px` dense
- Radius: `--radius-md` (4px). **FORBIDDEN: `rounded-full` pill shape.**
- Primary state: accent `--editor-accent`

### Input / Select Fields

- Height: `26px` (`h-[26px]`)
- Style: recessed box â€” `bg: --editor-field`, `border: 1px solid --editor-field-border`
- Focus: border â†’ `--editor-accent`
- **FORBIDDEN: `font-mono` or `font-bold` in numeric inputs.** Tabular nums handles alignment.

### Sliders (Biphasic & Monophasic)

- Track: `3px` height, `rounded-full`
- Handle: `10px` circle, `border border-black/40 bg-[#d4d4d4] shadow-[0_1px_2px_rgba(0,0,0,0.5)]`
- Center tick: `3px` circle for biphasic (Temp/Tint)
- Row layout: label `58px` + slider flex + value `28-44px` right-aligned

### Panels (Docked Precision)

- Panels anchor to window edges (no outer margin)
- Separation: `1px solid --editor-divider` (not margin)
- Rounding: inner corners â†’ `--radius-lg/md`, outer corners â†’ `0px`
- Header: panel bg, `46px` height, `14px font-semibold`

### LeftToolRail Color Swatches

- Container: `36px` (flush compact style)
- Two overlapping `35px` circles with diagonal clip-path
- Foreground: `polygon(0 0, 100% 0, 0 100%)`, Background: `polygon(100% 100%, 100% 0, 0 100%)`
- Gap: `1.4px` diagonal via position offset

### Layer List Items

- Height: `50px`, active: `--editor-row-active` (`oklch(0.3 0 0)`), hover: `bg-white/[0.03]`
- Thumbnail: `34x34px`, `rounded-[3px]`
- Visibility: eye/sun icon `size-4`

### Interaction States (ALL interactive components)

1. `default`: flat with subtle borders
2. `hover`: `bg-white/[0.045]` or `bg-white/5`
3. `active`: accent background or indicator
4. `focus-visible`: border â†’ `--editor-accent`
5. `disabled`: dimmed opacity, default cursor

---

## 5. Native Desktop Behavior (Anti-Webapp)

### Global CSS Resets

```css
* { user-select: none; -webkit-user-select: none; }
input, textarea { user-select: text; -webkit-user-select: text; }
body { cursor: default; }
img, svg, a { -webkit-user-drag: none; user-drag: none; }
html, body { overscroll-behavior: none; }
body { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
```

### Tauri Integration

- Frameless window: `"decorations": false` in tauri.conf.json
- Title bar drag: `data-tauri-drag-region` on AppTitleBar container
- Context menu: disable browser default, use Tauri API or custom dropdown
- File drop: prevent default, handle via Tauri File Drop events

### Overlay Scrollbars

- Thin overlay scrollbars (don't push layout)
- Default transparent, opaque on hover
- Use `--scrollbar-width` and `--color-scrollbar-thumb` tokens

### Motion Rules

- Micro-interactions (hover, focus): **max `100ms`** (`--motion-normal`)
- Panel/modal open: **max `150ms`**
- **FORBIDDEN: elastic/bounce animations.** Use `cubic-bezier(0.2, 0, 0, 1)` (sharp ease-out)

---

## 6. UI Copy & Language

### Tone

Clear, direct, friendly-professional. No filler.

### Rules

- UI language: **English** (MVP)
- Action labels: clear verbs â€” `Open`, `Export`, `Resize`, `Undo`. Max 2 words for toolbar.
- Title case for primary buttons/menus
- Tooltips: max 1 sentence. Shortcuts: `Ctrl+K` format.

### Error Messages

Format: `<what happened>. <what user can do>. (Error: <CODE>)`

Example: `Cannot open selected file. Please choose a valid image format. (Error: E_VALIDATION)`

### Empty States

Always include: (1) what's empty, (2) what to do next.

Example: `No layers yet.` / `Open an image to start editing.`

### Prohibited

- Blaming the user
- Overly technical messages without context
- Inconsistent terms for same action (e.g., mixing `Save` and `Store`)

---

## 7. Key User Flows (MVP)

### Flow A â€” Open File

`Open â†’ File dialog â†’ Select file â†’ Load to canvas + create layer â†’ Status bar shows dimensions`

Error: invalid file â†’ structured error + retry option. Load fail â†’ document state safe.

### Flow B â€” Edit Session

`Select tool â†’ Manipulate on canvas â†’ Adjust properties in inspector â†’ Undo/redo as needed`

Error: invalid action â†’ warning (no crash). Command fail â†’ structured error + consistent state.

### Flow C â€” Export

`Export â†’ Choose format (JPG/PNG/WebP) + quality â†’ Choose location â†’ Process â†’ Success/failure feedback`

Error: write fail â†’ `E_IO`. Invalid settings â†’ `E_VALIDATION`.

### UX Guardrails

- No unnecessary extra steps
- Critical actions must be visible, not hidden
- Mouse-first flow must be clear (shortcuts add speed, not replace)

---

## 8. Review Checklist (Before UI Implementation)

### Visual

- [ ] Layout follows locked shell regions
- [ ] Desktop compact density maintained
- [ ] No hardcoded colors/spacing/radius â€” use tokens
- [ ] Icon size/style consistent
- [ ] Active/focus states visible

### Components

- [ ] All interactive elements have 5 states (default/hover/active/focus/disabled)
- [ ] Using Tailwind v4 utilities + OKLCH CSS variables
- [ ] Numeric text secured with `tabular-nums`
- [ ] No outer padding/margin causing window edge gaps
- [ ] Corner radius follows docking rules

### UX Flow

- [ ] Open â†’ Edit â†’ Export works without confusion
- [ ] Error cases have actionable feedback
- [ ] Shortcut-enhanced but mouse-first clear

### Copy

- [ ] Action labels use clear verbs
- [ ] Error messages follow format: problem + action + optional code
- [ ] Consistent terminology across panels

### Performance

- [ ] No heavy unnecessary animations
- [ ] UI transitions lightweight, don't block canvas
- [ ] Panel structure doesn't cause excessive rerenders
