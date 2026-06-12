# Photon Amber UI Redesign & Ergonomic Scaling Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Redesign the Photrez SolidJS application shell to scale up font sizes and Lucide icons for maximum ergonomics, and implement the new Photon Amber (`#E15A17`) signature theme with CSS custom properties.

**Architecture:** We will update `index.css` to define the new design variables (true neutrals + Photon Amber accent) and global Segoe UI typography scales. We will then refactor `App.tsx` to apply larger text classes, expand click targets, replace all accent indicators with Photon Amber highlights, and strictly adhere to the YAGNI-compliant MVP v1 scope.

**Tech Stack:** SolidJS, TypeScript, Vite, Tailwind CSS v4, Lucide Icons.

---

### Task 10: Configure Photon Amber Design System

**Files:**
- Modify: [apps/desktop/src/index.css](file:///d:/Project/image-studio/apps/desktop/src/index.css)
- Modify: [docs/23-design-tokens.md](file:///d:/Project/image-studio/docs/23-design-tokens.md)

**Step 1: Update index.css variables**
Replace the old `--color-accent` variables with the new Photon Amber values:
```css
  --color-accent: #E15A17;
  --color-accent-hover: #F97316;
  --color-accent-active: #C2410C;
  --color-focus-ring: #E15A17;
```
Configure `--font-size-md: 13px;` and `--font-size-lg: 14px;` in the token configuration of Segoe UI.

**Step 2: Update design tokens documentation**
Sync [docs/23-design-tokens.md](file:///d:/Project/image-studio/docs/23-design-tokens.md) with these exact same variables for full document integrity.

**Step 3: Commit**
```bash
git add apps/desktop/src/index.css docs/23-design-tokens.md
git commit -m "style: configure Photon Amber color variables and typographic tokens"
```

---

### Task 11: Implement Ergonomic App Shell Scaling & Aksen Redesign

**Files:**
- Modify: [apps/desktop/src/App.tsx](file:///d:/Project/image-studio/apps/desktop/src/App.tsx)

**Step 1: Increase Typography Classes**
Refactor the text classes in `App.tsx`:
- Base UI labels: Change from `text-[11px]` to `text-[13px]`.
- Section headers: Change from `text-[11px] font-medium` to `text-[14px] font-semibold`.
- Keep coordinates at `text-[12px] tabular-nums`.

**Step 2: Scale Up Lucide Icons & Expand Click Targets**
Refactor the tool buttons:
- Main left rail tools: Change icons to `w-5 h-5` (around `20px`) and expand button wraps to `w-9 h-9` (`36px * 36px`).
- Accent lines: Update the vertical active line to use `#E15A17` Photon Amber.
- Replace all Solid Indigo background/text classes (`bg-[#5C6AEA]`, `text-[#5C6AEA]`, etc.) with `bg-[#E15A17]`, `text-[#E15A17]`, `hover:bg-[#F97316]`, `active:bg-[#C2410C]`, etc.

**Step 3: Verify dev compile**
Run: `pnpm --filter photrez-desktop build`
Expected: Succeeds in under 1.5 seconds.

**Step 4: Commit**
```bash
git add apps/desktop/src/App.tsx
git commit -m "style: redesign app shell with ergonomic font scaling and Photon Amber theme"
```

---

## Verification Plan

### Automated Tests
- `pnpm --filter photrez-desktop build` (Verify Typescript & build compilation)
- `cargo test --workspace` (Verify no regressions on backend)

### Manual Verification
- Open the application wrapper window via `pnpm tauri dev` (with MinGW compiler in PATH).
- Verify visually:
  - Font sizes are easily readable and crisp.
  - Sidebar buttons are larger and easier to click.
  - Custom title bar has no native OS title bar overlapping it (frameless decorations check).
  - All highlight highlights glow in beautiful **Photon Amber** rather than old Indigo.
