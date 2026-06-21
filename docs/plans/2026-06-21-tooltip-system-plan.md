# Tooltip System & Keyboard Shortcuts Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Implement a reusable, accessible tooltip component matching the "Soft & Snappy" design language, and add working keyboard shortcuts for the Move, Rectangle Select, Crop, and Eyedropper tools.

**Architecture:** 
- Implement a reusable `<Tooltip>` component in SolidJS that uses standard signals for hover/focus state, absolute/fixed positioning with window clamping, a Portal to avoid layout clip paths, and keyboard Escape listener.
- Leverage `display: contents` on a wrapper element, binding listeners on mount to `firstElementChild`.
- Map global key listeners `v`, `m`, `c`, `i` in `useCanvasKeyboard.ts` to tool activations.

**Tech Stack:** SolidJS + TypeScript, Tailwind CSS v4, Vitest, JSDOM

---

## Tasks

### Task 1: Add Keyboard Shortcuts in `useCanvasKeyboard.ts`

**Files:**
- Modify: `apps/desktop/src/components/editor/useCanvasKeyboard.ts:554-568`
- Create: `apps/desktop/src/components/editor/__tests__/ToolKeyboardShortcuts.test.tsx`

**Step 1: Write the failing test**
Create `apps/desktop/src/components/editor/__tests__/ToolKeyboardShortcuts.test.tsx` containing tests for pressing `v`, `m`, `c`, and `i` to select tools.
```tsx
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
import { EditorProvider } from "../EditorContext";
import { useEditor } from "../EditorContext";
import { useCanvasKeyboard } from "../useCanvasKeyboard";
import { WorkspaceManager } from "@/engine/workspace";

function KeyboardHarness(props: { captureEditor: (editor: ReturnType<typeof useEditor>) => void }) {
  const editor = useEditor();
  props.captureEditor(editor);
  useCanvasKeyboard({
    isSpacePressed: () => false,
    setIsSpacePressed: vi.fn(),
    isAltPressed: () => false,
    setIsAltPressed: vi.fn(),
    isPanning: () => false,
    setIsPanning: vi.fn(),
    stopMomentum: vi.fn(),
    fitToScreenAndRender: vi.fn(),
    syncViewport: vi.fn(),
    getCanvasContainerRef: () => undefined,
  });
  return null;
}

describe("Tool Keyboard Shortcuts", () => {
  it("should switch to move, selection, crop, and eyedropper on keypress", () => {
    let capturedEditor!: ReturnType<typeof useEditor>;
    const ws = new WorkspaceManager();
    const doc = WorkspaceManager.createBlankDocument("test-doc", 800, 600);
    ws.addDocument(doc);

    const container = document.createElement("div");
    document.body.appendChild(container);

    const dispose = render(
      () => (
        <EditorProvider workspace={ws} renderer={{ uploadImage: vi.fn(), destroyTexture: vi.fn() } as any} scheduler={{ requestRender: vi.fn() } as any}>
          <KeyboardHarness captureEditor={(e) => { capturedEditor = e; }} />
        </EditorProvider>
      ),
      container
    );

    // Initial tool is move
    expect(capturedEditor.activeTool()).toBe("move");

    // Press b to switch to brush
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "b" }));
    expect(capturedEditor.activeTool()).toBe("brush");

    // Press v to switch to move
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "v" }));
    expect(capturedEditor.activeTool()).toBe("move");

    // Press m to switch to selection
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "m" }));
    expect(capturedEditor.activeTool()).toBe("selection");

    // Press c to switch to crop
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "c" }));
    expect(capturedEditor.activeTool()).toBe("crop");

    // Press i to switch to eyedropper
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "i" }));
    expect(capturedEditor.activeTool()).toBe("eyedropper");

    dispose();
    container.remove();
  });
});
```

**Step 2: Run test to verify it fails**
Run: `pnpm --filter photrez-desktop test --run apps/desktop/src/components/editor/__tests__/ToolKeyboardShortcuts.test.tsx`
Expected: FAIL on key `v`, `m`, `c`, `i` tests (brush will pass since it exists).

**Step 3: Write minimal implementation**
Modify `apps/desktop/src/components/editor/useCanvasKeyboard.ts` to add the keyboard checks in `handleKeyDown`:
```typescript
      // Tool selection shortcuts
      if (!ctrl && key === "v") {
        e.preventDefault();
        setActiveTool("move");
        scheduler.requestRender();
        return;
      }
      if (!ctrl && key === "m") {
        e.preventDefault();
        setActiveTool("selection");
        scheduler.requestRender();
        return;
      }
      if (!ctrl && key === "c") {
        e.preventDefault();
        setActiveTool("crop");
        scheduler.requestRender();
        return;
      }
      if (!ctrl && key === "i") {
        e.preventDefault();
        setActiveTool("eyedropper");
        scheduler.requestRender();
        return;
      }
```

**Step 4: Run test to verify it passes**
Run: `pnpm --filter photrez-desktop test --run apps/desktop/src/components/editor/__tests__/ToolKeyboardShortcuts.test.tsx`
Expected: PASS

**Step 5: Commit**
Stage and commit changes for Task 1.

---

### Task 2: Implement the Tooltip Component

**Files:**
- Create: `apps/desktop/src/components/editor/Tooltip.tsx`
- Create: `apps/desktop/src/components/editor/__tests__/Tooltip.test.tsx`

**Step 1: Write the failing test**
Create `apps/desktop/src/components/editor/__tests__/Tooltip.test.tsx` to assert:
- Tooltip renders its child trigger element.
- Hovering shows tooltip after delay (we can mock timers using `vi.useFakeTimers()`).
- Target focus shows tooltip instantly.
- Escape key closes tooltip.
- Tooltip element has correct styling, ARIA role="tooltip", and coordinates.
- Mouse leave cancels active timer.

**Step 2: Run test to verify it fails**
Run: `pnpm --filter photrez-desktop test --run apps/desktop/src/components/editor/__tests__/Tooltip.test.tsx`
Expected: FAIL (file doesn't exist or is empty)

**Step 3: Write minimal implementation**
Create `apps/desktop/src/components/editor/Tooltip.tsx`:
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

// Global state for IDE-like warm tooltips
let lastTooltipHiddenTime = 0;
const TOOLTIP_WARM_DELAY = 250; // ms

export function Tooltip(props: TooltipProps) {
  let triggerRef!: HTMLDivElement;
  let tooltipRef!: HTMLDivElement;

  const [visible, setVisible] = createSignal(false);
  const [coords, setCoords] = createSignal({ x: 0, y: 0 });
  const [measured, setMeasured] = createSignal(false);

  let hoverTimer: number | null = null;
  const uniqueId = `tooltip-${Math.random().toString(36).substring(2, 9)}`;

  const showTooltip = (instant = false) => {
    if (props.disabled) return;
    if (hoverTimer) clearTimeout(hoverTimer);

    const now = Date.now();
    const isWarm = now - lastTooltipHiddenTime < TOOLTIP_WARM_DELAY;

    if (instant || isWarm) {
      setVisible(true);
    } else {
      hoverTimer = window.setTimeout(() => {
        setVisible(true);
      }, 400);
    }
  };

  const hideTooltip = () => {
    if (hoverTimer) clearTimeout(hoverTimer);
    if (visible()) {
      setVisible(false);
      lastTooltipHiddenTime = Date.now();
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      hideTooltip();
    }
  };

  createEffect(() => {
    if (visible() && tooltipRef && triggerRef) {
      const target = triggerRef.firstElementChild as HTMLElement;
      if (!target) return;

      target.setAttribute("aria-describedby", uniqueId);

      const targetRect = target.getBoundingClientRect();
      const tooltipRect = tooltipRef.getBoundingClientRect();

      let x = 0;
      let y = 0;
      const placement = props.placement || "top";
      const gap = 6;

      if (placement === "top") {
        x = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
        y = targetRect.top - tooltipRect.height - gap;
      } else if (placement === "bottom") {
        x = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
        y = targetRect.bottom + gap;
      } else if (placement === "left") {
        x = targetRect.left - tooltipRect.width - gap;
        y = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
      } else if (placement === "right") {
        x = targetRect.right + gap;
        y = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
      }

      // Keep within viewport boundaries
      const padding = 6;
      x = Math.max(padding, Math.min(x, window.innerWidth - tooltipRect.width - padding));
      y = Math.max(padding, Math.min(y, window.innerHeight - tooltipRect.height - padding));

      setCoords({ x, y });
      setMeasured(true);
    } else if (triggerRef) {
      const target = triggerRef.firstElementChild as HTMLElement;
      if (target) {
        target.removeAttribute("aria-describedby");
      }
      setMeasured(false);
    }
  });

  onMount(() => {
    const target = triggerRef.firstElementChild as HTMLElement;
    if (target) {
      target.addEventListener("mouseenter", () => showTooltip(false));
      target.addEventListener("mouseleave", hideTooltip);
      target.addEventListener("focusin", () => showTooltip(true));
      target.addEventListener("focusout", hideTooltip);
      window.addEventListener("keydown", handleKeyDown);
    }
  });

  onCleanup(() => {
    if (hoverTimer) clearTimeout(hoverTimer);
    const target = triggerRef?.firstElementChild as HTMLElement;
    if (target) {
      target.removeAttribute("aria-describedby");
    }
    window.removeEventListener("keydown", handleKeyDown);
  });

  return (
    <>
      <div ref={triggerRef} class="contents">
        {props.children}
      </div>
      <Show when={visible()}>
        <Portal mount={document.body}>
          <div
            ref={tooltipRef}
            id={uniqueId}
            role="tooltip"
            class={clsx(
              "fixed z-[100] pointer-events-none px-2 py-1 text-[11px] font-sans text-editor-text",
              "bg-[#181818] border border-white/10 rounded-[4px] shadow-[0_4px_12px_rgba(0,0,0,0.5)]",
              "transition-opacity duration-100 ease-out",
              measured() ? "opacity-100" : "opacity-0"
            )}
            style={{
              left: `${coords().x}px`,
              top: `${coords().y}px`,
            }}
          >
            <div class="flex items-center gap-1.5 whitespace-nowrap">
              <span>{props.content}</span>
              <Show when={props.shortcut}>
                <kbd class="ml-1 px-1 py-0.5 rounded bg-white/10 text-white/50 text-[9px] font-mono font-semibold border border-white/5 uppercase leading-none">
                  {props.shortcut}
                </kbd>
              </Show>
            </div>
          </div>
        </Portal>
      </Show>
    </>
  );
}
```

**Step 4: Run test to verify it passes**
Run: `pnpm --filter photrez-desktop test --run apps/desktop/src/components/editor/__tests__/Tooltip.test.tsx`
Expected: PASS

**Step 5: Commit**
Stage and commit changes for Task 2.

---

### Task 3: Wire Tooltips to LeftToolRail

**Files:**
- Modify: `apps/desktop/src/components/editor/LeftToolRail.tsx`
- Modify: `apps/desktop/src/components/editor/__tests__/AppTitleBar.test.tsx` (or `LeftToolRail` tests if exist)

**Step 1: Write the failing test**
Update `apps/desktop/src/components/editor/__tests__/LeftToolRail.test.tsx` (if it exists, otherwise write wiring assertions in a new/existing test file e.g., `AppTitleBar.test.tsx` or create `LeftToolRail.test.tsx`) to assert:
- LeftToolRail buttons render tooltip wrappers.
- The correct tool name and shortcut keys are rendered inside tooltips.

**Step 2: Run test to verify it fails**
Run: `pnpm --filter photrez-desktop test --run apps/desktop/src/components/editor/__tests__/`
Expected: FAIL (or no assertions check tooltips yet).

**Step 3: Write minimal implementation**
Modify `apps/desktop/src/components/editor/LeftToolRail.tsx`:
- Import `Tooltip` component.
- Wrap tool rail buttons in `<Tooltip>`:
  - Move Tool -> `V`
  - Rectangle Select -> `M`
  - Crop Tool -> `C`
  - Eyedropper Tool -> `I`
  - Brush Tool -> `B`
  - Eraser Tool -> `E`
  - Swap colors micro-button -> `X`
  - More tools -> (no shortcut)

**Step 4: Run test to verify it passes**
Run: `pnpm --filter photrez-desktop test --run apps/desktop/src/components/editor/__tests__/`
Expected: PASS

**Step 5: Commit**
Stage and commit changes for Task 3.

---

### Task 4: Full Verification

**Steps:**
1. Run full Vitest frontend suite: `pnpm --filter photrez-desktop test --run`
2. Run type checking: `pnpm run type-check` (if configured in workspace, or check typescript compiler)
3. Run Vite build: `pnpm run build`
4. Run Rust core/workspace tests: `cargo test --workspace`
5. Verify changes locally by updating documentation (`AI_CURRENT_TASK.md`, `AI_HISTORY.md`, `FEATURES.md`).
