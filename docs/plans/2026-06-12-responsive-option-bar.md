# Responsive Option Bar & Visual Unification Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Create a visually unified and responsive Option Bar for the editor that handles narrow screen sizes elegantly by hiding labels and grouping overflow options in a "More" dropdown.

**Architecture:** Use CSS Container Queries via container classes to dynamically collapse labels (`max-width: 900px`) and hide sub-groups (`max-width: 650px`), while rendering the hidden options inside a snappy "More Options" dropdown component.

**Tech Stack:** SolidJS, Tailwind CSS v4, CSS Container Queries.

---

### Task 1: Create Shared Components in OptionBarShared.tsx

**Files:**
- Modify: [OptionBarShared.tsx](file:///d:/Project/image-studio/apps/desktop/src/components/editor/OptionBarShared.tsx)

**Step 1: Implement ToolPill and ResponsiveDropdown**
Add a unified `ToolPill` component and a simple popover dropdown component `ResponsiveDropdown` (using a simple SolidJS toggle state with layout logic) for overflow options.

```tsx
import { Icon } from "./icons";
import { Show, createSignal, JSX } from "solid-js";

export function ToolPill(props: { icon: string; label: string }) {
  return (
    <div class="flex h-[24px] shrink-0 items-center gap-1.5 rounded-[4px] border border-editor-field-border bg-editor-field px-2 text-[11px] font-medium text-editor-text-dim capitalize">
      <Icon name={props.icon as any} class="size-3" strokeWidth={1.5} />
      <span>{props.label}</span>
    </div>
  );
}

export function MoreDropdown(props: { children: JSX.Element }) {
  const [isOpen, setIsOpen] = createSignal(false);
  return (
    <div class="relative hidden @max-[650px]:flex">
      <button
        onClick={() => setIsOpen(!isOpen())}
        class="flex size-[24px] shrink-0 items-center justify-center rounded-[3px] border border-editor-field-border bg-editor-field text-editor-icon hover:border-editor-accent hover:text-editor-text transition-colors"
        title="More Options"
      >
        <Icon name="more-horizontal" class="size-4" strokeWidth={1.5} />
      </button>
      <Show when={isOpen()}>
        <div class="absolute right-0 top-full z-50 mt-1 flex flex-col gap-2 rounded-[4px] border border-editor-field-border bg-editor-panel p-2 shadow-lg min-w-[150px]">
          <div class="fixed inset-0 z-[-1]" onClick={() => setIsOpen(false)} />
          {props.children}
        </div>
      </Show>
    </div>
  );
}
```

**Step 2: Commit**
```bash
git add apps/desktop/src/components/editor/OptionBarShared.tsx
git commit -m "feat: add ToolPill and MoreDropdown shared components"
```

---

### Task 2: Unify & Responsive-ize MoveOptionBar.tsx

**Files:**
- Modify: [MoveOptionBar.tsx](file:///d:/Project/image-studio/apps/desktop/src/components/editor/MoveOptionBar.tsx)

**Step 1: Update MoveOptionBar structure**
- Import `ToolPill` and `MoreDropdown`.
- Replace the capitalized tool name header with `<ToolPill icon="cursor" label={activeTool()} />`.
- Wrap the labels inside ToggleBtn/EditableNumField with `@max-[900px]:hidden` classes so they hide under 900px.
- Wrap Align and Flip groups with `@max-[650px]:hidden` and copy them into a `<MoreDropdown>` render at the end of the Option Bar.

**Step 2: Commit**
```bash
git add apps/desktop/src/components/editor/MoveOptionBar.tsx
git commit -m "feat: unify MoveOptionBar design and make it responsive"
```

---

### Task 3: Unify & Responsive-ize CropOptionBar.tsx

**Files:**
- Modify: [CropOptionBar.tsx](file:///d:/Project/image-studio/apps/desktop/src/components/editor/CropOptionBar.tsx)

**Step 1: Update CropOptionBar structure**
- Add `<ToolPill icon="crop" label="Crop" />` at the start.
- Standardize all inline buttons and selectors to use `h-[24px]` and matching borders/background.
- Wrap non-essential crop options (e.g. guide modes, Fill BG settings, presets) with `@max-[650px]:hidden` and make them available in the overflow dropdown.

**Step 2: Commit**
```bash
git add apps/desktop/src/components/editor/CropOptionBar.tsx
git commit -m "feat: unify CropOptionBar design and make it responsive"
```

---

### Task 4: Unify & Responsive-ize BrushOptionBar.tsx

**Files:**
- Modify: [BrushOptionBar.tsx](file:///d:/Project/image-studio/apps/desktop/src/components/editor/BrushOptionBar.tsx)

**Step 1: Update BrushOptionBar structure**
- Add `<ToolPill icon="brush" label={activeTool()} />` at the start instead of uppercase orange text.
- Replace custom inline styles on inputs with standard `h-[24px]` heights and classes matching `EditableNumField`.
- Apply `@max-[900px]:hidden` to slider/numeric field label texts and `@max-[650px]:hidden` to secondary configurations (Smoothing, presets).

**Step 2: Commit**
```bash
git add apps/desktop/src/components/editor/BrushOptionBar.tsx
git commit -m "feat: unify BrushOptionBar design and make it responsive"
```

---

### Task 5: Apply `@container` query wrapper in OptionBar.tsx

**Files:**
- Modify: [OptionBar.tsx](file:///d:/Project/image-studio/apps/desktop/src/components/editor/OptionBar.tsx)

**Step 1: Add container class**
Change the outer div wrapper class to include `@container`:
```tsx
<div class="@container flex h-[44px] shrink-0 items-center gap-1.5 overflow-x-auto border-b border-editor-divider bg-editor-toolbar px-3">
```

**Step 2: Commit**
```bash
git add apps/desktop/src/components/editor/OptionBar.tsx
git commit -m "style: apply container class to OptionBar root"
```

---

### Task 7: Run Verifications

**Step 1: Build project**
Run build to verify typescript checks pass:
`pnpm run build`

**Step 2: Run tests**
Run desktop tests:
`pnpm --filter photrez-desktop test`
