# Crop Option Bar UX Improvements Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Unify crop presets into a single dropdown selector, add "Lock Current Shape" & "Recent Ratios" features, and place the Swap button between the Width and Height inputs.

**Architecture:** Implement state tracking for recent ratios and render custom aspect ratio options dynamically. Reposition input structures in `CropOptionBar.tsx` for visual and structural clarity.

**Tech Stack:** SolidJS, Tailwind CSS v4, Lucide Icons.

---

### Task 1: Set up State and Helper Functions in CropOptionBar.tsx

**Files:**
- Modify: [CropOptionBar.tsx](file:///d:/Project/image-studio/apps/desktop/src/components/editor/CropOptionBar.tsx)

**Step 1: Declare recent ratios and dropdown visibility states**
Add the following local signals at the top of `CropOptionBar`:
```typescript
const [recentRatios, setRecentRatios] = createSignal<{ w: number; h: number }[]>([]);
const [showRatiosDropdown, setShowRatiosDropdown] = createSignal(false);
```

**Step 2: Implement "Lock Current Shape" logic**
Add a function to calculate the aspect ratio of the active crop frame and lock it:
```typescript
const handleLockCurrentShape = () => {
  const rect = cropRect();
  if (rect && rect.w > 0 && rect.h > 0) {
    // Simplify or round ratio
    const w = Math.round(rect.w);
    const h = Math.round(rect.h);
    setCropMode("ratio");
    setCropAspect({ w, h });
    setCropFrameToAspect({ w, h });
  }
};
```

**Step 3: Implement Recent Ratios tracking**
Modify W and H submit handlers to store newly entered ratios to `recentRatios` (maintaining max 3 items):
```typescript
const pushRecentRatio = (w: number, h: number) => {
  setRecentRatios((prev) => {
    const next = prev.filter((r) => !(r.w === w && r.h === h));
    return [{ w, h }, ...next].slice(0, 3);
  });
};
```

**Step 4: Commit**
```bash
git add apps/desktop/src/components/editor/CropOptionBar.tsx
git commit -m "feat: implement lock ratio and recent ratio state tracking"
```

---

### Task 2: Create Aspect Ratio Dropdown UI in CropOptionBar.tsx

**Files:**
- Modify: [CropOptionBar.tsx](file:///d:/Project/image-studio/apps/desktop/src/components/editor/CropOptionBar.tsx)

**Step 1: Create dropdown element**
Replace the old Mode Toggle (PILL_PRESETS loop) with the new Aspect Ratio dropdown container.
Use standard OptionBar dropdown styles:
```tsx
<div class="relative">
  <button
    type="button"
    onClick={() => setShowRatiosDropdown(!showRatiosDropdown())}
    class="flex h-[24px] items-center gap-1.5 rounded-[3px] border border-editor-field-border bg-editor-field px-2 text-[11px] text-editor-text hover:border-editor-accent"
  >
    <span>Ratio: {currentRatioLabel()}</span>
    <Icon name="chevron-down" class="size-3 text-editor-text-dim" />
  </button>
  <Show when={showRatiosDropdown()}>
    {/* Dropdown panel showing Lock Shape, Recents, and Presets */}
  </Show>
</div>
```

**Step 2: Implement dropdown options click handlers**
Handle preset selection, custom ratio click, and Lock Shape trigger.

**Step 3: Commit**
```bash
git add apps/desktop/src/components/editor/CropOptionBar.tsx
git commit -m "feat: add Aspect Ratio dropdown selector"
```

---

### Task 3: Reposition Swap Button Between W & H Fields

**Files:**
- Modify: [CropOptionBar.tsx](file:///d:/Project/image-studio/apps/desktop/src/components/editor/CropOptionBar.tsx)

**Step 1: Rearrange Custom W:H layout**
Move the `swap` button between `EditableNumField` W and H in Custom Ratio input:
```tsx
<EditableNumField label="W" ... />
<button onClick={handleSwap}>
  <Icon name="swap" ... />
</button>
<EditableNumField label="H" ... />
```

**Step 2: Rearrange Physical Size W:H layout**
Move the `swap` button between `EditableNumField` W and H in Physical Size mode input.

**Step 3: Commit**
```bash
git add apps/desktop/src/components/editor/CropOptionBar.tsx
git commit -m "feat: place Swap button between W and H inputs"
```

---

### Task 4: Run Tests & Verify

**Step 1: Build project**
Run: `pnpm run build`

**Step 2: Run frontend unit tests**
Run: `pnpm --filter photrez-desktop test`
Check that crop tool and Option Bar tests pass.
