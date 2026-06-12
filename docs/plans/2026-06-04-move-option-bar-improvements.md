# Move Option Bar Visual & UX Improvements Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Improve Move Tool's Option Bar visual state (high-contrast active state), add dynamic hover layer indicators, and add direct canvas/selection alignment features.

**Architecture:** We will modify the frontend presentation layers. Specifically, we'll style ToggleBtn in OptionBarShared, wire `hoveredLayerId` to a new preview badge in MoveOptionBar, add new alignment icons in icons.tsx, and implement alignment calculation logic within MoveOptionBar.tsx using the active layer scale/bounds and document/selection bounds.

**Tech Stack:** SolidJS, TypeScript, Tailwind CSS v4, Lucide Icons

---

### Task 1: Update ToggleBtn Active Styles

**Files:**
- Modify: `apps/desktop/src/components/editor/OptionBarShared.tsx`
- Test: `apps/desktop/src/components/editor/__tests__/OptionBarShared.test.tsx` (or verify via existing option bar tests)

**Step 1: Write the implementation**
Modify the active class of `ToggleBtn` in `apps/desktop/src/components/editor/OptionBarShared.tsx`:
```tsx
export function ToggleBtn(props: { active: boolean; onChange: (v: boolean) => void; icon: string; label: string }) {
  return (
    <button
      onClick={() => props.onChange(!props.active)}
      class={clsx(
        "flex h-[24px] shrink-0 items-center gap-1 rounded-[4px] border px-2 text-[11px] font-medium transition-all duration-75",
        props.active
          ? "border-editor-accent/40 bg-editor-accent/10 text-editor-text shadow-[inset_0_1px_2px_rgba(225,90,23,0.15)]"
          : "border-transparent bg-transparent text-editor-text-dim hover:border-editor-field-border hover:bg-editor-field/60 hover:text-editor-text",
      )}
    >
      <Icon name={props.icon as any} class={clsx("size-3", props.active && "text-editor-accent")} strokeWidth={1.5} />
      {props.label}
    </button>
  );
}
```

**Step 2: Commit**
```bash
.\rtk.exe git add apps/desktop/src/components/editor/OptionBarShared.tsx
.\rtk.exe git commit -m "feat: improve ToggleBtn visual state with high-contrast amber accent"
```

---

### Task 2: Add Dynamic Hover Target Readout

**Files:**
- Modify: `apps/desktop/src/components/editor/MoveOptionBar.tsx`

**Step 1: Write the implementation**
In `MoveOptionBar.tsx`, import `hoveredLayerId` from `useEditor()`. If `moveAutoSelect()` is true and there is a `hoveredLayerId()`, find the corresponding layer in `layers()` and display a text badge in the Option Bar:
```tsx
const hoveredLayer = () => {
  const id = hoveredLayerId();
  if (!id) return null;
  return layers().find(l => l.id === id) || null;
};
```
Under the `Snap` toggle button, render the badge:
```tsx
<Show when={moveAutoSelect() && hoveredLayer()}>
  {(hl) => (
    <div class="flex h-[24px] shrink-0 items-center gap-1.5 rounded-[4px] bg-editor-field border border-editor-field-border px-2 text-[11px] text-editor-text-dim">
      <span class="text-[9px] text-editor-accent font-bold uppercase tracking-wider">Target:</span>
      <span class="text-editor-text font-medium">{hl().name}</span>
    </div>
  )}
</Show>
```

**Step 2: Commit**
```bash
.\rtk.exe git add apps/desktop/src/components/editor/MoveOptionBar.tsx
.\rtk.exe git commit -m "feat: add dynamic auto-select hover target readout to MoveOptionBar"
```

---

### Task 3: Import and Register Alignment Icons

**Files:**
- Modify: `apps/desktop/src/components/editor/icons.tsx`

**Step 1: Import and add the following icons from `lucide-solid`:**
- `AlignLeft` as `AlignLeftIcon`
- `AlignRight` as `AlignRightIcon`
- `AlignTop` as `AlignTopIcon`
- `AlignBottom` as `AlignBottomIcon`

Register them in the types and maps:
- `"align-left"`: `AlignLeftIcon`
- `"align-right"`: `AlignRightIcon`
- `"align-top"`: `AlignTopIcon`
- `"align-bottom"`: `AlignBottomIcon`

**Step 2: Commit**
```bash
.\rtk.exe git add apps/desktop/src/components/editor/icons.tsx
.\rtk.exe git commit -m "feat: add alignment icons to icon registry"
```

---

### Task 4: Implement Direct Canvas Alignment Actions

**Files:**
- Modify: `apps/desktop/src/components/editor/MoveOptionBar.tsx`

**Step 1: Write the implementation**
In `MoveOptionBar.tsx`, add an alignment handler:
```tsx
const handleAlign = (type: "left" | "center-h" | "right" | "top" | "center-v" | "bottom") => {
  const engine = workspace.getActiveEngine();
  const id = activeLayerId();
  if (!engine || !id) return;
  const layer = engine.getLayer(id);
  if (!layer || layer.locked) return;

  const history = workspace.getActiveHistory();
  history?.commit(engine.snapshot());

  const docW = engine.getWidth();
  const docH = engine.getHeight();
  const layerW = Math.round(layer.width * layer.transform.scaleX);
  const layerH = Math.round(layer.height * layer.transform.scaleY);

  const next = { ...layer.transform };

  switch (type) {
    case "left":
      next.x = 0;
      break;
    case "center-h":
      next.x = Math.round((docW - layerW) / 2);
      break;
    case "right":
      next.x = docW - layerW;
      break;
    case "top":
      next.y = 0;
      break;
    case "center-v":
      next.y = Math.round((docH - layerH) / 2);
      break;
    case "bottom":
      next.y = docH - layerH;
      break;
  }

  engine.transformLayer(id, next);
  scheduler.requestRender();
};
```
Render the action buttons in the option bar:
```tsx
<Divider />
<div class={clsx("flex shrink-0 items-center gap-0.5", isLocked() && "opacity-30 pointer-events-none")}>
  <button onClick={() => handleAlign("left")} class="rounded-[3px] p-0.5 text-editor-icon hover:text-editor-text" aria-label="Align left">
    <Icon name="align-left" class="size-4" strokeWidth={1.5} />
  </button>
  <button onClick={() => handleAlign("center-h")} class="rounded-[3px] p-0.5 text-editor-icon hover:text-editor-text" aria-label="Align center horizontal">
    <Icon name="align-h" class="size-4" strokeWidth={1.5} />
  </button>
  <button onClick={() => handleAlign("right")} class="rounded-[3px] p-0.5 text-editor-icon hover:text-editor-text" aria-label="Align right">
    <Icon name="align-right" class="size-4" strokeWidth={1.5} />
  </button>
  <button onClick={() => handleAlign("top")} class="rounded-[3px] p-0.5 text-editor-icon hover:text-editor-text" aria-label="Align top">
    <Icon name="align-top" class="size-4" strokeWidth={1.5} />
  </button>
  <button onClick={() => handleAlign("center-v")} class="rounded-[3px] p-0.5 text-editor-icon hover:text-editor-text" aria-label="Align center vertical">
    <Icon name="align-v" class="size-4" strokeWidth={1.5} />
  </button>
  <button onClick={() => handleAlign("bottom")} class="rounded-[3px] p-0.5 text-editor-icon hover:text-editor-text" aria-label="Align bottom">
    <Icon name="align-bottom" class="size-4" strokeWidth={1.5} />
  </button>
</div>
```

**Step 2: Commit**
```bash
.\rtk.exe git add apps/desktop/src/components/editor/MoveOptionBar.tsx
.\rtk.exe git commit -m "feat: implement alignment controls in MoveOptionBar"
```
