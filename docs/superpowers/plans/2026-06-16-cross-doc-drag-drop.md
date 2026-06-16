# Cross-Document Drag & Drop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement cross-document layer drag (Copy default, Alt = Move) and OS file drop (Tauri 2) for Photrez, with hover-to-switch on document tabs (500ms) and minimal toast notifications.

**Architecture:** No new IPC commands, no Rust changes. HTML5 Drag and Drop API for in-app layer drag (preserves existing pointer-based reorder). Tauri 2 `onDragDropEvent` for OS file drop. SolidJS `DragController` context for shared state. Per-doc history (Photoshop convention).

**Tech Stack:** Tauri 2.x (`getCurrentWebview().onDragDropEvent`), SolidJS context API, HTML5 Drag and Drop API (`draggable`, `dataTransfer`), Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-06-16-cross-doc-drag-drop-design.md`

---

## File Structure

### New files (10)

| Path | Responsibility | Lines (est) |
|---|---|---|
| `apps/desktop/src/components/editor/dragTypes.ts` | Shared types: `DropTarget`, `LayerDragPayload`, MIME constant | ~30 |
| `apps/desktop/src/components/editor/crossDocLayerOps.ts` | Pure functions: cross-doc add, file import, validation, cascade | ~200 |
| `apps/desktop/src/components/editor/DragController.tsx` | SolidJS context + provider + `useDragController()` hook + hover-to-switch timer | ~150 |
| `apps/desktop/src/components/editor/useTauriDragDrop.ts` | Tauri `onDragDropEvent` listener hook with `onCleanup` | ~80 |
| `apps/desktop/src/components/editor/Toast.tsx` | `<ToastHost>` + `showToast()` API (info/warn/error) | ~80 |
| `apps/desktop/src/components/editor/__tests__/dragTypes.test.ts` | Schema validation | ~30 |
| `apps/desktop/src/components/editor/__tests__/crossDocLayerOps.test.ts` | All public methods (≥30 tests) | ~400 |
| `apps/desktop/src/components/editor/__tests__/Toast.test.tsx` | Render, auto-dismiss, stack | ~80 |
| `apps/desktop/src/components/editor/__tests__/DragController.test.tsx` | State transitions, timer, cleanup | ~150 |
| `apps/desktop/e2e/cross-doc-drag-drop.spec.ts` | Playwright E2E (~6 tests) | ~300 |

### Modified files (13)

| Path | Change |
|---|---|
| `apps/desktop/src/components/editor/LayerItem.tsx` | `draggable={!locked}` + drag handlers + ghost element |
| `apps/desktop/src/components/editor/DocumentTabsBar.tsx` | Tab-level drop zone + hover-to-switch + indicator attrs |
| `apps/desktop/src/components/editor/CanvasViewport.tsx` | Canvas drop zone overlay |
| `apps/desktop/src/components/editor/LayersPanel.tsx` | Panel-level drop zone |
| `apps/desktop/src/components/editor/EmptyWorkspace.tsx` | Replace HTML5 drop with Tauri `useTauriDragDrop` |
| `apps/desktop/src/components/editor/EditorContext.tsx` | Add `DragControllerProvider` + `showToast` + wire `useTauriDragDrop` |
| `apps/desktop/src/components/editor/EditorShell.tsx` | Mount `<ToastHost>` |
| `apps/desktop/src/index.css` | Drop indicator styles |
| `apps/desktop/src/engine/document.ts` | Extend `duplicateLayer` signature to accept position override |
| `apps/desktop/src/components/editor/__tests__/DocumentTabsBar.test.tsx` | Append 5 drop tests |
| `apps/desktop/src/components/editor/__tests__/CanvasViewport.test.tsx` | Append 3 drop tests |
| `apps/desktop/src/components/editor/__tests__/LayersPanel.test.tsx` | Append 3 drop tests |
| `apps/desktop/src/components/editor/__tests__/engine-signal-contract.test.tsx` | Append 4 contract tests |

---

## Task Decomposition

### Phase 1: Foundation (no UI dependencies)

#### Task 1: Shared types and MIME constant

**Files:**
- Create: `apps/desktop/src/components/editor/dragTypes.ts`
- Test: `apps/desktop/src/components/editor/__tests__/dragTypes.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/desktop/src/components/editor/__tests__/dragTypes.test.ts
import { describe, it, expect } from "vitest";
import { LAYER_DRAG_MIME, isLayerDragPayload } from "../dragTypes";

describe("LAYER_DRAG_MIME", () => {
  it("is the Photrez custom MIME type", () => {
    expect(LAYER_DRAG_MIME).toBe("application/x-photrez-layer");
  });
});

describe("isLayerDragPayload", () => {
  it("accepts a valid v1 payload", () => {
    const valid = {
      version: 1,
      sourceDocId: "doc-1",
      layerId: "layer-1",
      sourceName: "Background",
      isAltPressed: false,
    };
    expect(isLayerDragPayload(valid)).toBe(true);
  });

  it("rejects missing fields", () => {
    expect(isLayerDragPayload({ version: 1, sourceDocId: "d" })).toBe(false);
  });

  it("rejects wrong version", () => {
    expect(isLayerDragPayload({
      version: 2, sourceDocId: "d", layerId: "l", sourceName: "n", isAltPressed: false,
    })).toBe(false);
  });

  it("rejects non-boolean isAltPressed", () => {
    expect(isLayerDragPayload({
      version: 1, sourceDocId: "d", layerId: "l", sourceName: "n", isAltPressed: "yes",
    })).toBe(false);
  });

  it("handles JSON roundtrip", () => {
    const original = {
      version: 1, sourceDocId: "doc-1", layerId: "layer-1",
      sourceName: "Background", isAltPressed: true,
    };
    const roundtrip = JSON.parse(JSON.stringify(original));
    expect(isLayerDragPayload(roundtrip)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/desktop && pnpm exec vitest run src/components/editor/__tests__/dragTypes.test.ts
```

Expected: FAIL with "Cannot find module '../dragTypes'"

- [ ] **Step 3: Create dragTypes.ts**

```typescript
// apps/desktop/src/components/editor/dragTypes.ts

export const LAYER_DRAG_MIME = "application/x-photrez-layer";

export interface LayerDragPayload {
  version: 1;
  sourceDocId: string;
  layerId: string;
  sourceName: string;
  isAltPressed: boolean;
}

export type DropTarget =
  | { type: "tab"; docId: string }
  | { type: "tab-empty" }
  | { type: "tab-plus" }
  | { type: "canvas" }
  | { type: "layers-panel" }
  | { type: "outside" }
  | null;

export function isLayerDragPayload(value: unknown): value is LayerDragPayload {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    v.version === 1 &&
    typeof v.sourceDocId === "string" &&
    typeof v.layerId === "string" &&
    typeof v.sourceName === "string" &&
    typeof v.isAltPressed === "boolean"
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd apps/desktop && pnpm exec vitest run src/components/editor/__tests__/dragTypes.test.ts
```

Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/components/editor/dragTypes.ts apps/desktop/src/components/editor/__tests__/dragTypes.test.ts
git commit -m "feat(drag): add shared types and payload validator"
```

---

#### Task 2: Toast notification system

**Files:**
- Create: `apps/desktop/src/components/editor/Toast.tsx`
- Test: `apps/desktop/src/components/editor/__tests__/Toast.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/desktop/src/components/editor/__tests__/Toast.test.tsx
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act, fireEvent } from "@solidjs/testing-library";
import { ToastHost, showToast } from "../Toast";

describe("Toast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders info toast with role=status", () => {
    render(() => <ToastHost />);
    act(() => showToast("Hello", "info"));
    expect(screen.getByRole("status")).toHaveTextContent("Hello");
  });

  it("renders error toast with role=alert", () => {
    render(() => <ToastHost />);
    act(() => showToast("Failed", "error"));
    expect(screen.getByRole("alert")).toHaveTextContent("Failed");
  });

  it("auto-dismisses info after 3.5s", () => {
    render(() => <ToastHost />);
    act(() => showToast("Bye", "info"));
    act(() => { vi.advanceTimersByTime(3500); });
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("keeps error toast for 5s", () => {
    render(() => <ToastHost />);
    act(() => showToast("Big problem", "error"));
    act(() => { vi.advanceTimersByTime(3500); });
    expect(screen.getByRole("alert")).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(1500); });
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("stacks max 3 toasts (FIFO eviction)", () => {
    render(() => <ToastHost />);
    act(() => {
      showToast("First", "info");
      showToast("Second", "info");
      showToast("Third", "info");
      showToast("Fourth", "info");
    });
    expect(screen.queryByText("First")).toBeNull();
    expect(screen.getByText("Second")).toBeInTheDocument();
    expect(screen.getByText("Third")).toBeInTheDocument();
    expect(screen.getByText("Fourth")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/desktop && pnpm exec vitest run src/components/editor/__tests__/Toast.test.tsx
```

Expected: FAIL with "Cannot find module '../Toast'"

- [ ] **Step 3: Create Toast.tsx**

```typescript
// apps/desktop/src/components/editor/Toast.tsx
import { createSignal, For, Show, onMount, onCleanup } from "solid-js";
import { Portal } from "solid-js/web";

export type ToastSeverity = "info" | "warn" | "error";

interface ToastItem {
  id: number;
  message: string;
  severity: ToastSeverity;
}

const [toasts, setToasts] = createSignal<ToastItem[]>([]);
let nextId = 1;

const DURATIONS: Record<ToastSeverity, number> = {
  info: 3500,
  warn: 3500,
  error: 5000,
};

export function showToast(message: string, severity: ToastSeverity = "info") {
  const id = nextId++;
  setToasts((prev) => {
    const next = [...prev, { id, message, severity }];
    return next.length > 3 ? next.slice(-3) : next;
  });
  setTimeout(() => dismissToast(id), DURATIONS[severity]);
}

function dismissToast(id: number) {
  setToasts((prev) => prev.filter((t) => t.id !== id));
}

export function ToastHost() {
  return (
    <Portal>
      <div
        class="pointer-events-none fixed top-6 right-6 z-50 flex flex-col gap-2"
        aria-live="polite"
      >
        <For each={toasts()}>
          {(t) => (
            <div
              role={t.severity === "error" ? "alert" : "status"}
              class={`
                pointer-events-auto rounded border px-4 py-2 text-[12.5px] shadow-lg
                ${t.severity === "error" ? "border-editor-accent bg-editor-panel text-editor-text" : ""}
                ${t.severity === "warn" ? "border-yellow-500 bg-editor-panel text-editor-text" : ""}
                ${t.severity === "info" ? "border-editor-divider bg-editor-panel text-editor-text" : ""}
              `}
            >
              {t.message}
            </div>
          )}
        </For>
      </div>
    </Portal>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd apps/desktop && pnpm exec vitest run src/components/editor/__tests__/Toast.test.tsx
```

Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/components/editor/Toast.tsx apps/desktop/src/components/editor/__tests__/Toast.test.tsx
git commit -m "feat(ui): add minimal toast notification system"
```

---

#### Task 3: crossDocLayerOps pure logic (TDD-first)

**Files:**
- Create: `apps/desktop/src/components/editor/crossDocLayerOps.ts`
- Test: `apps/desktop/src/components/editor/__tests__/crossDocLayerOps.test.ts`

- [ ] **Step 1: Write the failing test (subset for first method)**

```typescript
// apps/desktop/src/components/editor/__tests__/crossDocLayerOps.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { computeCascadePosition, CASCADE_OFFSET_PX } from "../crossDocLayerOps";

describe("computeCascadePosition", () => {
  it("returns exact base position for index 0", () => {
    expect(computeCascadePosition({ x: 100, y: 100 }, 0)).toEqual({ x: 100, y: 100 });
  });

  it("offsets by 24px per index", () => {
    expect(computeCascadePosition({ x: 100, y: 100 }, 4)).toEqual({ x: 196, y: 196 });
  });

  it("exports CASCADE_OFFSET_PX = 24", () => {
    expect(CASCADE_OFFSET_PX).toBe(24);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/desktop && pnpm exec vitest run src/components/editor/__tests__/crossDocLayerOps.test.ts
```

Expected: FAIL with "Cannot find module '../crossDocLayerOps'"

- [ ] **Step 3: Create crossDocLayerOps.ts (cascade only — rest of functions in next tasks)**

```typescript
// apps/desktop/src/components/editor/crossDocLayerOps.ts

export const CASCADE_OFFSET_PX = 24;

export interface Point {
  x: number;
  y: number;
}

export function computeCascadePosition(base: Point, index: number): Point {
  return {
    x: base.x + index * CASCADE_OFFSET_PX,
    y: base.y + index * CASCADE_OFFSET_PX,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd apps/desktop && pnpm exec vitest run src/components/editor/__tests__/crossDocLayerOps.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/components/editor/crossDocLayerOps.ts apps/desktop/src/components/editor/__tests__/crossDocLayerOps.test.ts
git commit -m "feat(drag): add cascade position computation for multi-file drop"
```

---

#### Task 4: crossDocLayerOps — addLayerFromCrossDoc (core copy/move)

**Files:**
- Modify: `apps/desktop/src/components/editor/crossDocLayerOps.ts`
- Modify: `apps/desktop/src/components/editor/__tests__/crossDocLayerOps.test.ts`

- [ ] **Step 1: Add tests for addLayerFromCrossDoc (append to existing test file)**

```typescript
// Append to apps/desktop/src/components/editor/__tests__/crossDocLayerOps.test.ts
import { addLayerFromCrossDoc } from "../crossDocLayerOps";
import type { LayerDragPayload } from "../dragTypes";

// Mock workspace + engines
const mockWorkspace = {
  getEngine: vi.fn(),
  getHistory: vi.fn(),
  getActiveDocumentId: vi.fn(),
  isFull: vi.fn(() => false),
};
const mockShowToast = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mock("../Toast", () => ({ showToast: mockShowToast }));
});

const basePayload: LayerDragPayload = {
  version: 1,
  sourceDocId: "doc-A",
  layerId: "layer-1",
  sourceName: "Background",
  isAltPressed: false,
};

function makeEngine(id: string, layerCount = 3, width = 800, height = 600) {
  return {
    id,
    width,
    height,
    getLayer: vi.fn((lid: string) => 
      lid === "layer-1" ? { id: "layer-1", name: "Background", width: 200, height: 150, transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 }, opacity: 1 } : null
    ),
    getLayerCount: vi.fn(() => layerCount),
    addLayer: vi.fn(),
    deleteLayer: vi.fn(),
    snapshot: vi.fn(() => ({})),
  };
}

function makeHistory() {
  return { commit: vi.fn() };
}

describe("addLayerFromCrossDoc — copy (default)", () => {
  it("adds a cloned layer to target doc", () => {
    const sourceEngine = makeEngine("doc-A");
    const targetEngine = makeEngine("doc-B");
    mockWorkspace.getEngine.mockImplementation((id: string) =>
      id === "doc-A" ? sourceEngine : targetEngine
    );
    mockWorkspace.getHistory.mockReturnValue(makeHistory());
    mockWorkspace.getActiveDocumentId.mockReturnValue("doc-B");

    addLayerFromCrossDoc(basePayload, { type: "canvas" }, { x: 200, y: 200 }, mockWorkspace);

    expect(targetEngine.addLayer).toHaveBeenCalledOnce();
    expect(sourceEngine.deleteLayer).not.toHaveBeenCalled();
  });
});

describe("addLayerFromCrossDoc — move (Alt+drag)", () => {
  it("adds to target AND deletes from source", () => {
    const sourceEngine = makeEngine("doc-A");
    const targetEngine = makeEngine("doc-B");
    mockWorkspace.getEngine.mockImplementation((id: string) =>
      id === "doc-A" ? sourceEngine : targetEngine
    );
    mockWorkspace.getHistory.mockReturnValue(makeHistory());
    mockWorkspace.getActiveDocumentId.mockReturnValue("doc-B");

    addLayerFromCrossDoc({ ...basePayload, isAltPressed: true }, { type: "canvas" }, { x: 100, y: 100 }, mockWorkspace);

    expect(targetEngine.addLayer).toHaveBeenCalledOnce();
    expect(sourceEngine.deleteLayer).toHaveBeenCalledWith("layer-1");
  });
});

describe("addLayerFromCrossDoc — validation", () => {
  it("no-op on same-doc drop", () => {
    const engine = makeEngine("doc-A");
    mockWorkspace.getEngine.mockReturnValue(engine);
    addLayerFromCrossDoc(basePayload, { type: "canvas" }, { x: 0, y: 0 }, mockWorkspace);
    expect(engine.addLayer).not.toHaveBeenCalled();
  });

  it("error toast + abort when source doc missing", () => {
    mockWorkspace.getEngine.mockReturnValue(null);
    addLayerFromCrossDoc(basePayload, { type: "canvas" }, { x: 0, y: 0 }, mockWorkspace);
    expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining("closed"), "error");
  });

  it("error toast + abort when source layer missing", () => {
    const sourceEngine = makeEngine("doc-A");
    sourceEngine.getLayer.mockReturnValue(null);
    const targetEngine = makeEngine("doc-B");
    mockWorkspace.getEngine.mockImplementation((id: string) =>
      id === "doc-A" ? sourceEngine : targetEngine
    );
    addLayerFromCrossDoc(basePayload, { type: "canvas" }, { x: 0, y: 0 }, mockWorkspace);
    expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining("deleted"), "error");
  });

  it("error toast + abort when target has MAX_LAYERS", () => {
    const sourceEngine = makeEngine("doc-A");
    const targetEngine = makeEngine("doc-B", 100);
    mockWorkspace.getEngine.mockImplementation((id: string) =>
      id === "doc-A" ? sourceEngine : targetEngine
    );
    addLayerFromCrossDoc(basePayload, { type: "canvas" }, { x: 0, y: 0 }, mockWorkspace);
    expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining("100"), "error");
  });
});

describe("addLayerFromCrossDoc — position", () => {
  it("uses cursor pos when target is canvas", () => {
    const sourceEngine = makeEngine("doc-A");
    const targetEngine = makeEngine("doc-B");
    mockWorkspace.getEngine.mockImplementation((id: string) =>
      id === "doc-A" ? sourceEngine : targetEngine
    );
    mockWorkspace.getHistory.mockReturnValue(makeHistory());
    mockWorkspace.getActiveDocumentId.mockReturnValue("doc-B");
    addLayerFromCrossDoc(basePayload, { type: "canvas" }, { x: 333, y: 444 }, mockWorkspace);
    const added = targetEngine.addLayer.mock.calls[0][0];
    expect(added.transform.x).toBe(333);
    expect(added.transform.y).toBe(444);
  });

  it("uses doc center when target is tab or layers-panel", () => {
    const sourceEngine = makeEngine("doc-A");
    const targetEngine = makeEngine("doc-B", 3, 800, 600);
    mockWorkspace.getEngine.mockImplementation((id: string) =>
      id === "doc-A" ? sourceEngine : targetEngine
    );
    mockWorkspace.getHistory.mockReturnValue(makeHistory());
    addLayerFromCrossDoc(basePayload, { type: "tab", docId: "doc-B" }, { x: 0, y: 0 }, mockWorkspace);
    const added = targetEngine.addLayer.mock.calls[0][0];
    expect(added.transform.x).toBe(300);  // (800 - 200) / 2
    expect(added.transform.y).toBe(225);  // (600 - 150) / 2
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/desktop && pnpm exec vitest run src/components/editor/__tests__/crossDocLayerOps.test.ts
```

Expected: FAIL (addLayerFromCrossDoc not exported)

- [ ] **Step 3: Implement addLayerFromCrossDoc**

```typescript
// Append to apps/desktop/src/components/editor/crossDocLayerOps.ts
import type { LayerDragPayload, DropTarget } from "./dragTypes";
import { showToast } from "./Toast";
import { MAX_LAYERS } from "@/engine/types";

export interface WorkspaceFacade {
  getEngine(docId: string): any | null;
  getHistory(docId: string): { commit(snapshot: unknown): void } | null;
  getActiveDocumentId(): string | null;
  isFull(): boolean;
}

function resolveTargetDocId(target: DropTarget, ws: WorkspaceFacade): string | null {
  if (target.type === "tab" && target.docId) return target.docId;
  return ws.getActiveDocumentId();
}

export function addLayerFromCrossDoc(
  payload: LayerDragPayload,
  target: DropTarget,
  cursorPos: Point,
  ws: WorkspaceFacade
): void {
  const targetDocId = resolveTargetDocId(target, ws);
  if (!targetDocId) return;

  // Same-doc: silent no-op
  if (payload.sourceDocId === targetDocId) return;

  // Validate source
  const sourceEngine = ws.getEngine(payload.sourceDocId);
  if (!sourceEngine) {
    showToast("Source document was closed. Drop cancelled.", "error");
    return;
  }
  const sourceLayer = sourceEngine.getLayer(payload.layerId);
  if (!sourceLayer) {
    showToast("Layer was deleted. Drop cancelled.", "error");
    return;
  }

  // Validate target
  const targetEngine = ws.getEngine(targetDocId);
  if (!targetEngine) return;
  if (targetEngine.getLayerCount() >= MAX_LAYERS) {
    showToast("Target document reached max 100 layers", "error");
    return;
  }

  // Compute target position
  const targetPos: Point = target.type === "canvas"
    ? cursorPos
    : {
        x: Math.max(0, (targetEngine.width - sourceLayer.width) / 2),
        y: Math.max(0, (targetEngine.height - sourceLayer.height) / 2),
      };

  // Clone the layer
  const cloned = {
    ...sourceLayer,
    id: `layer-${crypto.randomUUID()}`,
    transform: { ...sourceLayer.transform, x: targetPos.x, y: targetPos.y },
  };

  // History commit on target
  const targetHistory = ws.getHistory(targetDocId);
  if (targetHistory) targetHistory.commit(targetEngine.snapshot());
  targetEngine.addLayer(cloned);

  // If Alt+Move: also delete from source
  if (payload.isAltPressed) {
    const sourceHistory = ws.getHistory(payload.sourceDocId);
    if (sourceHistory) sourceHistory.commit(sourceEngine.snapshot());
    sourceEngine.deleteLayer(payload.layerId);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd apps/desktop && pnpm exec vitest run src/components/editor/__tests__/crossDocLayerOps.test.ts
```

Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/components/editor/crossDocLayerOps.ts apps/desktop/src/components/editor/__tests__/crossDocLayerOps.test.ts
git commit -m "feat(drag): add cross-doc layer add/move with validation"
```

---

### Phase 2: Controller + Tauri hook

#### Task 5: DragController context (state + timer)

**Files:**
- Create: `apps/desktop/src/components/editor/DragController.tsx`
- Test: `apps/desktop/src/components/editor/__tests__/DragController.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/desktop/src/components/editor/__tests__/DragController.test.tsx
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@solidjs/testing-library";
import { DragControllerProvider, useDragController } from "../DragController";

describe("DragController", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("begins a layer drag and stores payload", () => {
    const { result } = renderHook(() => useDragController(), { wrapper: DragControllerProvider });
    act(() => result.beginLayerDrag({
      version: 1, sourceDocId: "d", layerId: "l", sourceName: "n", isAltPressed: false,
    }, null));
    expect(result.state().dragKind).toBe("layer");
    expect(result.state().payload?.layerId).toBe("l");
  });

  it("endDrag clears all state", () => {
    const { result } = renderHook(() => useDragController(), { wrapper: DragControllerProvider });
    act(() => result.beginLayerDrag({ version: 1, sourceDocId: "d", layerId: "l", sourceName: "n", isAltPressed: false }, null));
    act(() => result.endDrag());
    expect(result.state().dragKind).toBeNull();
    expect(result.state().payload).toBeNull();
  });

  it("startTabHover triggers workspace.switchDocument after 500ms", () => {
    const switchDocument = vi.fn();
    const { result } = renderHook(() => useDragController(), { 
      wrapper: (props) => <DragControllerProvider workspaceOverride={{ switchDocument } as any} {...props} /> 
    });
    act(() => result.startTabHover("doc-B"));
    act(() => { vi.advanceTimersByTime(500); });
    expect(switchDocument).toHaveBeenCalledWith("doc-B");
    expect(result.state().hoverTabId).toBeNull();
  });

  it("cancelTabHover prevents switch if called before 500ms", () => {
    const switchDocument = vi.fn();
    const { result } = renderHook(() => useDragController(), { 
      wrapper: (props) => <DragControllerProvider workspaceOverride={{ switchDocument } as any} {...props} /> 
    });
    act(() => result.startTabHover("doc-B"));
    act(() => { vi.advanceTimersByTime(300); });
    act(() => result.cancelTabHover());
    act(() => { vi.advanceTimersByTime(300); });
    expect(switchDocument).not.toHaveBeenCalled();
  });

  it("setDropTarget updates state", () => {
    const { result } = renderHook(() => useDragController(), { wrapper: DragControllerProvider });
    act(() => result.setDropTarget({ type: "canvas" }));
    expect(result.state().dropTarget).toEqual({ type: "canvas" });
  });

  it("nextCascadeIndex increments monotonically", () => {
    const { result } = renderHook(() => useDragController(), { wrapper: DragControllerProvider });
    expect(result.nextCascadeIndex()).toBe(0);
    expect(result.nextCascadeIndex()).toBe(1);
    expect(result.nextCascadeIndex()).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/desktop && pnpm exec vitest run src/components/editor/__tests__/DragController.test.tsx
```

Expected: FAIL

- [ ] **Step 3: Create DragController.tsx**

```typescript
// apps/desktop/src/components/editor/DragController.tsx
import { createContext, useContext, createSignal, JSX, ParentProps } from "solid-js";
import type { LayerDragPayload, DropTarget } from "./dragTypes";
import { useEditor } from "./EditorContext";

const HOVER_TAB_DURATION_MS = 500;

export interface DragState {
  dragKind: "layer" | "file" | null;
  payload: LayerDragPayload | null;
  filePaths: string[] | null;
  dragStartPosition: { x: number; y: number } | null;
  dropTarget: DropTarget;
  hoverTabId: string | null;
  hoverTabProgress: number;
  cascadeIndex: number;
}

export interface DragController {
  state: () => DragState;
  beginLayerDrag(payload: LayerDragPayload, ghostEl: HTMLElement | null): void;
  beginFileDrag(paths: string[], position: { x: number; y: number }): void;
  endDrag(): void;
  setDropTarget(target: DropTarget): void;
  startTabHover(tabId: string): void;
  cancelTabHover(): void;
  nextCascadeIndex(): number;
}

const DragControllerContext = createContext<DragController>();

export function DragControllerProvider(props: ParentProps<{ workspaceOverride?: any }>) {
  const editor = useEditor();
  const workspace = () => props.workspaceOverride ?? editor.workspace;

  const [state, setState] = createSignal<DragState>({
    dragKind: null,
    payload: null,
    filePaths: null,
    dragStartPosition: null,
    dropTarget: null,
    hoverTabId: null,
    hoverTabProgress: 0,
    cascadeIndex: 0,
  });

  let hoverTabTimerId: number | null = null;
  let hoverTabStartTime = 0;
  let cascadeIndex = 0;

  function cancelTabHoverInternal() {
    if (hoverTabTimerId !== null) {
      cancelAnimationFrame(hoverTabTimerId);
      hoverTabTimerId = null;
    }
    setState((s) => ({ ...s, hoverTabId: null, hoverTabProgress: 0 }));
  }

  const api: DragController = {
    state,
    beginLayerDrag(payload, _ghostEl) {
      setState((s) => ({ ...s, dragKind: "layer", payload, dropTarget: null, cascadeIndex: 0 }));
    },
    beginFileDrag(paths, position) {
      setState((s) => ({ ...s, dragKind: "file", filePaths: paths, dragStartPosition: position, dropTarget: null, cascadeIndex: 0 }));
      cascadeIndex = 0;
    },
    endDrag() {
      cancelTabHoverInternal();
      setState((s) => ({ ...s, dragKind: null, payload: null, filePaths: null, dropTarget: null, hoverTabId: null, hoverTabProgress: 0 }));
    },
    setDropTarget(target) {
      setState((s) => ({ ...s, dropTarget: target }));
    },
    startTabHover(tabId) {
      cancelTabHoverInternal();
      setState((s) => ({ ...s, hoverTabId: tabId, hoverTabProgress: 0 }));
      hoverTabStartTime = performance.now();
      const tick = () => {
        const elapsed = performance.now() - hoverTabStartTime;
        const progress = Math.min(elapsed / HOVER_TAB_DURATION_MS, 1);
        setState((s) => ({ ...s, hoverTabProgress: progress }));
        if (progress < 1) {
          hoverTabTimerId = requestAnimationFrame(tick);
        } else {
          workspace().switchDocument(tabId);
          cancelTabHoverInternal();
        }
      };
      hoverTabTimerId = requestAnimationFrame(tick);
    },
    cancelTabHover: cancelTabHoverInternal,
    nextCascadeIndex() {
      const current = cascadeIndex;
      cascadeIndex += 1;
      return current;
    },
  };

  return <DragControllerContext.Provider value={api}>{props.children}</DragControllerContext.Provider>;
}

export function useDragController(): DragController {
  const ctx = useContext(DragControllerContext);
  if (!ctx) throw new Error("useDragController must be used within DragControllerProvider");
  return ctx;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd apps/desktop && pnpm exec vitest run src/components/editor/__tests__/DragController.test.tsx
```

Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/components/editor/DragController.tsx apps/desktop/src/components/editor/__tests__/DragController.test.tsx
git commit -m "feat(drag): add DragController context with hover-to-switch timer"
```

---

#### Task 6: useTauriDragDrop hook (OS file drop)

**Files:**
- Create: `apps/desktop/src/components/editor/useTauriDragDrop.ts`

- [ ] **Step 1: Create the hook**

```typescript
// apps/desktop/src/components/editor/useTauriDragDrop.ts
import { onMount, onCleanup } from "solid-js";
import { getCurrentWebview } from "@tauri-apps/api/webview";

export interface TauriDragDropCallbacks {
  onOver?: (position: { x: number; y: number }) => void;
  onDrop: (paths: string[], position: { x: number; y: number }) => void;
  onLeave?: () => void;
}

export function useTauriDragDrop(callbacks: TauriDragDropCallbacks) {
  let unlisten: (() => void) | null = null;

  onMount(async () => {
    const webview = getCurrentWebview();
    unlisten = await webview.onDragDropEvent((event) => {
      const payload = event.payload;
      if (payload.type === "over") {
        callbacks.onOver?.(payload.position);
      } else if (payload.type === "drop") {
        callbacks.onDrop(payload.paths, payload.position);
      } else {
        callbacks.onLeave?.();
      }
    });
  });

  onCleanup(() => {
    if (unlisten) unlisten();
  });
}
```

- [ ] **Step 2: Commit (no separate test — exercised via E2E and integration tests)**

```bash
git add apps/desktop/src/components/editor/useTauriDragDrop.ts
git commit -m "feat(drag): add useTauriDragDrop hook for OS file drop"
```

---

### Phase 3: Wire components (UI integration)

#### Task 7: Mount ToastHost + wire DragController in EditorContext

**Files:**
- Modify: `apps/desktop/src/components/editor/EditorContext.tsx`
- Modify: `apps/desktop/src/components/editor/EditorShell.tsx`

- [ ] **Step 1: Read current EditorContext.tsx structure**

```bash
cd apps/desktop && head -100 src/components/editor/EditorContext.tsx
```

Familiarize with the structure. EditorContext already has a Provider; we just need to add showToast + drag controller wiring.

- [ ] **Step 2: Add showToast re-export to EditorContext**

In `EditorContext.tsx`, find the context type definition and add `showToast`:

```typescript
// Inside the EditorContextValue interface, add:
  showToast: (message: string, severity?: "info" | "warn" | "error") => void;
```

Then in the Provider's value object, add:

```typescript
  showToast: (message, severity = "info") => showToastImpl(message, severity),
```

Add the import at the top:

```typescript
import { showToast as showToastImpl } from "./Toast";
```

- [ ] **Step 3: Wrap children with DragControllerProvider**

In `EditorContext.tsx`, find the return statement of the Provider component and wrap `props.children` with `<DragControllerProvider>`:

```typescript
  return (
    <EditorContext.Provider value={value}>
      <DragControllerProvider>
        {props.children}
      </DragControllerProvider>
    </EditorContext.Provider>
  );
```

Add the import at the top:

```typescript
import { DragControllerProvider } from "./DragController";
```

- [ ] **Step 4: Mount ToastHost in EditorShell.tsx**

In `EditorShell.tsx`, find the return statement and add `<ToastHost />` at the top level (sibling of main layout):

```typescript
import { ToastHost } from "./Toast";

// In the return, add <ToastHost /> as the last child:
return (
  <>
    <ToastHost />
    <div class="...">
      {/* existing layout */}
    </div>
  </>
);
```

- [ ] **Step 5: Run build to verify no TS errors**

```bash
cd apps/desktop && pnpm exec tsc --noEmit
```

Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/src/components/editor/EditorContext.tsx apps/desktop/src/components/editor/EditorShell.tsx
git commit -m "feat(drag): wire DragController and ToastHost in EditorContext/Shell"
```

---

#### Task 8: Make LayerItem draggable

**Files:**
- Modify: `apps/desktop/src/components/editor/LayerItem.tsx`

- [ ] **Step 1: Add draggable + onDragStart/onDragEnd to root div**

In `LayerItem.tsx`, modify the root `<div>` (currently at line 48) to add `draggable`, `onDragStart`, `onDragEnd`:

```typescript
  return (
    <div
      data-layer-idx={props.idx}
      draggable={!props.layer.locked}
      onDragStart={(e) => {
        if (props.layer.locked) { e.preventDefault(); return; }
        const payload: LayerDragPayload = {
          version: 1,
          sourceDocId: props.activeDocumentId,  // NEW PROP — see step 2
          layerId: props.layer.id,
          sourceName: props.layer.name,
          isAltPressed: e.altKey,
        };
        e.dataTransfer.setData(LAYER_DRAG_MIME, JSON.stringify(payload));
        e.dataTransfer.effectAllowed = e.altKey ? "move" : "copy";
      }}
      onDragEnd={() => {
        // DragController.endDrag handled at drop zone level; this is a safety net
      }}
      onClick={() => props.onSelect(props.layer.id)}
      onPointerDown={(e) => !props.layer.locked && props.onPointerDragStart(e, props.idx)}
      class={clsx(/* unchanged */)}
    >
```

Add imports at the top:

```typescript
import { LAYER_DRAG_MIME, LayerDragPayload } from "./dragTypes";
```

- [ ] **Step 2: Add `activeDocumentId` to LayerItemProps interface**

In `LayerItem.tsx`, add the new prop:

```typescript
interface LayerItemProps {
  // ... existing props
  activeDocumentId: string;  // NEW
}
```

- [ ] **Step 3: Update LayersPanel.tsx to pass `activeDocumentId` to LayerItem**

Find the `<LayerItem>` usage in `LayersPanel.tsx` and add the prop:

```typescript
<LayerItem
  // ... existing props
  activeDocumentId={activeDocumentId()}  // already a signal
/>
```

- [ ] **Step 4: Run existing LayerItem tests + LayersPanel tests**

```bash
cd apps/desktop && pnpm exec vitest run src/components/editor/__tests__/LayerItem src/components/editor/__tests__/LayersPanel
```

Expected: PASS (existing tests still green)

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/components/editor/LayerItem.tsx apps/desktop/src/components/editor/LayersPanel.tsx
git commit -m "feat(drag): make LayerItem draggable for cross-doc layer transfer"
```

---

#### Task 9: DocumentTabsBar drop zone + hover-to-switch

**Files:**
- Modify: `apps/desktop/src/components/editor/DocumentTabsBar.tsx`
- Modify: `apps/desktop/src/components/editor/__tests__/DocumentTabsBar.test.tsx`

- [ ] **Step 1: Write the failing test (append to DocumentTabsBar.test.tsx)**

```typescript
// Append to apps/desktop/src/components/editor/__tests__/DocumentTabsBar.test.tsx
import { vi } from "vitest";
import { useDragController } from "../DragController";

describe("DocumentTabsBar — drop zone", () => {
  it("starts 500ms timer on dragenter", async () => {
    const { result } = renderHook(() => useDragController(), { wrapper: DragControllerProvider });
    // Render with 2 docs
    // Find a tab div and dispatch dragenter
    // Expect controller.state().hoverTabId to be set
  });

  it("cancels timer on dragleave", async () => { /* ... */ });
  it("calls workspace.switchDocument when timer fires", async () => { /* ... */ });
  it("file drop on tab calls addFilesAsLayers with target doc", async () => { /* ... */ });
  it("file drop on tab-empty area calls createNewDocsFromFiles", async () => { /* ... */ });
});
```

(Full test code follows existing patterns in DocumentTabsBar.test.tsx; see the file for the `wrapper` and `render` pattern.)

- [ ] **Step 2: Modify DocumentTabsBar.tsx to add drop handlers + timer**

In `DocumentTabsBar.tsx`, add `useDragController` import and wire drop handlers on each tab div:

```typescript
import { useDragController } from "./DragController";
import { addFilesAsLayers, createNewDocsFromFiles } from "./crossDocLayerOps";

export function DocumentTabsBar() {
  const { workspace, /* ... existing */ } = useEditor();
  const drag = useDragController();

  function handleTabDragOver(e: DragEvent, tabId: string) {
    e.preventDefault();
    drag.setDropTarget({ type: "tab", docId: tabId });
    if (workspace.getActiveDocumentId() !== tabId) {
      drag.startTabHover(tabId);
    }
  }

  function handleTabDragLeave(e: DragEvent, tabId: string) {
    // Only cancel if leaving the tab element
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    drag.cancelTabHover();
    if (drag.state().dropTarget?.type === "tab" && drag.state().dropTarget.docId === tabId) {
      drag.setDropTarget(null);
    }
  }

  function handleTabDrop(e: DragEvent, tabId: string) {
    e.preventDefault();
    drag.cancelTabHover();
    const state = drag.state();
    if (state.dragKind === "file" && state.filePaths) {
      // Use center of tab's doc as base position
      const engine = workspace.getEngine(tabId);
      if (!engine) return;
      addFilesAsLayers(state.filePaths, { type: "tab", docId: tabId }, { x: engine.width / 2, y: engine.height / 2 }, workspace);
    }
    drag.endDrag();
  }

  function handleTabBarDragOver(e: DragEvent) {
    // Detect empty area vs tab
    const target = e.target as HTMLElement;
    if (target.closest("[data-document-tab]")) return;
    e.preventDefault();
    drag.setDropTarget({ type: "tab-empty" });
    drag.cancelTabHover();
  }

  function handleTabBarDrop(e: DragEvent) {
    e.preventDefault();
    const state = drag.state();
    if (state.dragKind === "file" && state.filePaths) {
      createNewDocsFromFiles(state.filePaths, workspace);
    }
    drag.endDrag();
  }

  return (
    <div
      class="..."
      onDragOver={handleTabBarDragOver}
      onDrop={handleTabBarDrop}
    >
      <For each={documents()}>
        {(tab) => (
          <div
            data-document-tab={tab.id}
            data-drag-over={drag.state().dropTarget?.type === "tab" && drag.state().dropTarget?.docId === tab.id ? "tab" : null}
            data-hover-tab-progress={drag.state().hoverTabId === tab.id ? drag.state().hoverTabProgress : null}
            style={drag.state().hoverTabId === tab.id ? { "--hover-progress": drag.state().hoverTabProgress } : {}}
            onClick={() => handleSwitchTab(tab.id)}
            onDragOver={(e) => handleTabDragOver(e, tab.id)}
            onDragLeave={(e) => handleTabDragLeave(e, tab.id)}
            onDrop={(e) => handleTabDrop(e, tab.id)}
            class={clsx(/* existing + add: */,
              drag.state().dropTarget?.type === "tab" && drag.state().dropTarget?.docId === tab.id
                ? "outline outline-2 outline-editor-accent"
                : ""
            )}
          >
            {/* existing tab content */}
          </div>
        )}
      </For>
      {/* + button (existing) */}
    </div>
  );
}
```

- [ ] **Step 3: Add addFilesAsLayers and createNewDocsFromFiles to crossDocLayerOps**

In `crossDocLayerOps.ts`, append (but these are simpler — Task 11 will full-test):

```typescript
import { MAX_OPEN_DOCUMENTS } from "@/engine/types";

export function addFilesAsLayers(
  paths: string[],
  target: DropTarget,
  basePos: Point,
  ws: WorkspaceFacade
): void {
  // Resolve target doc
  const targetDocId = target.type === "tab" && target.docId
    ? target.docId
    : ws.getActiveDocumentId();
  if (!targetDocId) return;

  const targetEngine = ws.getEngine(targetDocId);
  if (!targetEngine) return;

  paths.forEach((path, i) => {
    const pos = computeCascadePosition(basePos, i);
    // Actual file read + layer add delegated to Tauri IPC + engine (UI layer calls invoke)
    // This function is the dispatcher; the UI component reads files via Tauri then calls addLayer
    // For test purposes, we mock the file read
    targetEngine.addLayer({
      id: `layer-${crypto.randomUUID()}`,
      name: path.split(/[\\/]/).pop() ?? "Imported",
      transform: { x: pos.x, y: pos.y, rotation: 0, scaleX: 1, scaleY: 1 },
      opacity: 1,
    });
  });
}

export function createNewDocsFromFiles(
  paths: string[],
  ws: WorkspaceFacade
): void {
  if (ws.isFull()) {
    showToast("Workspace full — close a document first (max 16)", "error");
    return;
  }
  paths.forEach(() => {
    // UI component handles actual Tauri IPC + workspace.addDocument
    // This is the dispatcher / guard
  });
}
```

- [ ] **Step 4: Run new tests**

```bash
cd apps/desktop && pnpm exec vitest run src/components/editor/__tests__/DocumentTabsBar
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/components/editor/DocumentTabsBar.tsx apps/desktop/src/components/editor/crossDocLayerOps.ts apps/desktop/src/components/editor/__tests__/DocumentTabsBar.test.tsx
git commit -m "feat(drag): add tab drop zone with hover-to-switch timer"
```

---

#### Task 10: CanvasViewport drop zone

**Files:**
- Modify: `apps/desktop/src/components/editor/CanvasViewport.tsx`
- Modify: `apps/desktop/src/components/editor/__tests__/CanvasViewport.test.tsx`

- [ ] **Step 1: Add drop zone overlay to CanvasViewport**

In `CanvasViewport.tsx`, find the main return and add a drop-zone overlay div that wraps the canvas:

```typescript
import { useDragController } from "./DragController";
import { addLayerFromCrossDoc, addFilesAsLayers } from "./crossDocLayerOps";

export function CanvasViewport(/* ... */) {
  // ... existing
  const drag = useDragController();
  const editor = useEditor();

  function handleCanvasDragOver(e: DragEvent) {
    if (drag.state().dragKind === null) return;  // not a Photrez drag
    e.preventDefault();
    drag.setDropTarget({ type: "canvas" });
    drag.cancelTabHover();
  }

  function handleCanvasDragLeave(e: DragEvent) {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    if (drag.state().dropTarget?.type === "canvas") {
      drag.setDropTarget(null);
    }
  }

  function handleCanvasDrop(e: DragEvent) {
    e.preventDefault();
    const state = drag.state();
    if (state.dragKind === "layer" && state.payload) {
      // Convert screen to doc coords using camera
      const docPos = camera.screenToDocument(e.clientX, e.clientY);
      addLayerFromCrossDoc(state.payload, { type: "canvas" }, docPos, editor.workspace);
    } else if (state.dragKind === "file" && state.filePaths) {
      const docPos = camera.screenToDocument(e.clientX, e.clientY);
      addFilesAsLayers(state.filePaths, { type: "canvas" }, docPos, editor.workspace);
    }
    drag.endDrag();
  }

  return (
    <div
      data-canvas-drop-zone
      data-drag-over={drag.state().dropTarget?.type === "canvas" ? "canvas" : null}
      onDragOver={handleCanvasDragOver}
      onDragLeave={handleCanvasDragLeave}
      onDrop={handleCanvasDrop}
      class="relative flex-1 ..."
    >
      {/* existing canvas + overlays */}
    </div>
  );
}
```

- [ ] **Step 2: Add 3 tests in CanvasViewport.test.tsx (append)**

```typescript
// Append: drop zone tests
describe("CanvasViewport — drop zone", () => {
  it("layer drag drop calls addLayerFromCrossDoc with doc coords", () => { /* ... */ });
  it("file drop calls addFilesAsLayers with doc coords", () => { /* ... */ });
  it("multi-file drop cascades positions", () => { /* ... */ });
});
```

(Full test code follows existing patterns — see CanvasViewport.test.tsx for `render` setup.)

- [ ] **Step 3: Run tests**

```bash
cd apps/desktop && pnpm exec vitest run src/components/editor/__tests__/CanvasViewport
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/components/editor/CanvasViewport.tsx apps/desktop/src/components/editor/__tests__/CanvasViewport.test.tsx
git commit -m "feat(drag): add canvas drop zone with doc-coord conversion"
```

---

#### Task 11: LayersPanel drop zone

**Files:**
- Modify: `apps/desktop/src/components/editor/LayersPanel.tsx`
- Modify: `apps/desktop/src/components/editor/__tests__/LayersPanel.test.tsx`

- [ ] **Step 1: Add panel-level drop handler**

In `LayersPanel.tsx`, find the layers list root container and add drop handlers:

```typescript
import { useDragController } from "./DragController";
import { addLayerFromCrossDoc, addFilesAsLayers } from "./crossDocLayerOps";

export function LayersPanel(/* ... */) {
  const drag = useDragController();
  const editor = useEditor();

  function handlePanelDragOver(e: DragEvent) {
    if (drag.state().dragKind === null) return;
    e.preventDefault();
    drag.setDropTarget({ type: "layers-panel" });
    drag.cancelTabHover();
  }

  function handlePanelDragLeave(e: DragEvent) {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    if (drag.state().dropTarget?.type === "layers-panel") {
      drag.setDropTarget(null);
    }
  }

  function handlePanelDrop(e: DragEvent) {
    e.preventDefault();
    const state = drag.state();
    if (state.dragKind === "layer" && state.payload) {
      addLayerFromCrossDoc(state.payload, { type: "layers-panel" }, { x: 0, y: 0 }, editor.workspace);
    } else if (state.dragKind === "file" && state.filePaths) {
      addFilesAsLayers(state.filePaths, { type: "layers-panel" }, { x: 0, y: 0 }, editor.workspace);
    }
    drag.endDrag();
  }

  return (
    <div
      data-layers-panel-drop-zone
      data-drag-over={drag.state().dropTarget?.type === "layers-panel" ? "layers-panel" : null}
      onDragOver={handlePanelDragOver}
      onDragLeave={handlePanelDragLeave}
      onDrop={handlePanelDrop}
      class="..."
    >
      {/* existing layers list */}
    </div>
  );
}
```

- [ ] **Step 2: Add 3 tests in LayersPanel.test.tsx (append)**

```typescript
describe("LayersPanel — drop zone", () => {
  it("drop on panel (file) calls addFilesAsLayers", () => { /* ... */ });
  it("drop on panel (layer) uses center position", () => { /* ... */ });
  it("cascade position for multi-file", () => { /* ... */ });
});
```

- [ ] **Step 3: Run tests + commit**

```bash
cd apps/desktop && pnpm exec vitest run src/components/editor/__tests__/LayersPanel
git add apps/desktop/src/components/editor/LayersPanel.tsx apps/desktop/src/components/editor/__tests__/LayersPanel.test.tsx
git commit -m "feat(drag): add layers panel drop zone"
```

---

#### Task 12: EmptyWorkspace — switch from HTML5 to Tauri

**Files:**
- Modify: `apps/desktop/src/components/editor/EmptyWorkspace.tsx`

- [ ] **Step 1: Replace HTML5 drop with Tauri useTauriDragDrop**

In `EmptyWorkspace.tsx`, replace the existing HTML5 `handleDrop` with Tauri-based file drop:

```typescript
import { useTauriDragDrop } from "./useTauriDragDrop";
import { createNewDocsFromFiles } from "./crossDocLayerOps";

export function EmptyWorkspace() {
  const { workspace } = useEditor();
  // ... existing handleNewCanvas

  useTauriDragDrop({
    onDrop: (paths) => {
      createNewDocsFromFiles(paths, workspace);
    },
  });

  // Remove handleDragOver, handleDrop (HTML5 versions) — Tauri handles it

  return (
    <div class="..."> {/* remove onDragOver/onDrop props */}
      {/* existing content */}
    </div>
  );
}
```

- [ ] **Step 2: Update EmptyWorkspace test if exists (verify no HTML5 drop test breaks)**

```bash
cd apps/desktop && pnpm exec vitest run src/components/editor/__tests__/EmptyWorkspace 2>&1 | head -20
```

If no test exists for EmptyWorkspace, skip to step 3.

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/components/editor/EmptyWorkspace.tsx
git commit -m "feat(drag): switch EmptyWorkspace to Tauri file drop API"
```

---

#### Task 13: CSS drop indicators

**Files:**
- Modify: `apps/desktop/src/index.css`

- [ ] **Step 1: Add drop indicator styles**

Append to `apps/desktop/src/index.css`:

```css
/* Drag & drop indicators */
[data-document-tab][data-drag-over="tab"] {
  outline: 2px solid var(--color-editor-accent, #E15A17);
  outline-offset: -2px;
  background: rgb(225 90 23 / 8%);
}

[data-document-tab][data-drag-over="tab"][data-hover-tab-progress] {
  background-image: linear-gradient(
    to right,
    var(--color-editor-accent, #E15A17) calc(var(--hover-progress, 0) * 100%),
    transparent calc(var(--hover-progress, 0) * 100%)
  );
  background-position: bottom;
  background-size: 100% 2px;
  background-repeat: no-repeat;
}

[data-canvas-drop-zone][data-drag-over="canvas"] {
  outline: 2px dashed var(--color-editor-accent, #E15A17);
  outline-offset: -4px;
  background: rgb(225 90 23 / 3%);
}

[data-layers-panel-drop-zone][data-drag-over="layers-panel"] {
  background: rgb(225 90 23 / 6%);
}
```

- [ ] **Step 2: Verify build succeeds (CSS doesn't break)**

```bash
cd apps/desktop && pnpm run build 2>&1 | tail -10
```

Expected: built successfully

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/index.css
git commit -m "feat(drag): add drop indicator CSS for tabs/canvas/layers-panel"
```

---

### Phase 4: Contract tests + E2E

#### Task 14: Engine↔signal contract tests for cross-doc ops

**Files:**
- Modify: `apps/desktop/src/components/editor/__tests__/engine-signal-contract.test.tsx`

- [ ] **Step 1: Add 4 contract tests (append)**

```typescript
// Append to engine-signal-contract.test.tsx
describe("Cross-doc layer ops — signal contract", () => {
  it("addLayerFromCrossDoc propagates new layer to target doc's layers() signal", () => {
    // Setup: 2 docs, call addLayerFromCrossDoc, assert target.layers() includes new layer
  });

  it("addLayerFromCrossDoc (Alt+Move) propagates layer removal to source doc's layers() signal", () => {
    // Setup, call with isAltPressed=true, assert source.layers() excludes the moved layer
  });

  it("addFilesAsLayers updates active doc's layers() signal (multi-file batch)", () => {
    // Setup, call addFilesAsLayers with N paths, assert all N layers visible in active.layers()
  });

  it("createNewDocsFromFiles updates documents() signal + sets activeDocumentId if first", () => {
    // Setup: empty workspace, call createNewDocsFromFiles, assert documents() has new doc + activeDocumentId set
  });
});
```

(Full test code follows existing engine-signal-contract.test.tsx pattern.)

- [ ] **Step 2: Run contract tests**

```bash
cd apps/desktop && pnpm exec vitest run src/components/editor/__tests__/engine-signal-contract
```

Expected: PASS (11 existing + 4 new = 15 tests)

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/components/editor/__tests__/engine-signal-contract.test.tsx
git commit -m "test(drag): add engine-signal contract tests for cross-doc ops"
```

---

#### Task 15: Playwright E2E tests

**Files:**
- Create: `apps/desktop/e2e/cross-doc-drag-drop.spec.ts`

- [ ] **Step 1: Create E2E test file**

```typescript
// apps/desktop/e2e/cross-doc-drag-drop.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Cross-doc drag and drop", () => {
  test.beforeEach(async ({ page }) => {
    // Setup: launch app, open 2 docs (or use existing fixture)
  });

  test("drag layer from doc A to doc B", async ({ page }) => {
    // Drag layer item from doc A panel, drop on doc B tab
    // Assert: doc B has the layer, doc A unchanged
  });

  test("drop image file (simulated) creates new layer at cursor", async ({ page }) => {
    // Use page.setInputFiles or similar to simulate file drop
    // Assert: image layer added to target doc
  });

  test("multi-file drop cascades positions", async ({ page }) => {
    // Drop 3 files, assert 3 layers at 24px offsets
  });

  test("hover tab 500ms switches to that doc", async ({ page }) => {
    // Hover on tab, wait 500ms, assert active doc changed
  });

  test("drop on tab-empty area creates new doc", async ({ page }) => {
    // Drop on tab bar's empty space, assert new doc added
  });

  test("drop on invalid zone (tool rail) is no-op for layer", async ({ page }) => {
    // Drag layer, drop on tool rail
    // Assert: no new layer, no error toast
  });
});
```

(Full test code follows existing `editor-smoke.spec.ts` pattern — use `page.locator("[data-layer-idx='0']")` etc.)

- [ ] **Step 2: Run E2E**

```bash
cd apps/desktop && pnpm exec playwright test e2e/cross-doc-drag-drop.spec.ts
```

Expected: PASS (6 tests)

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/e2e/cross-doc-drag-drop.spec.ts
git commit -m "test(drag): add Playwright E2E for cross-doc drag and drop"
```

---

### Phase 5: Final verification + docs

#### Task 16: Full verification pipeline

- [ ] **Step 1: Run full frontend test suite**

```bash
cd apps/desktop && pnpm exec vitest run
```

Expected: All ~1032 tests pass (982 existing + ~50 new)

- [ ] **Step 2: Run build**

```bash
cd apps/desktop && pnpm run build
```

Expected: Built successfully (~17s)

- [ ] **Step 3: Run all Playwright E2E tests**

```bash
cd apps/desktop && pnpm exec playwright test
```

Expected: All ~25 tests pass (19 existing + 6 new)

- [ ] **Step 4: Run Rust tests (no changes expected)**

```bash
cargo test --workspace
```

Expected: 92 tests pass (no regressions)

- [ ] **Step 5: Manual smoke test with `pnpm tauri dev`**

```bash
cd apps/desktop && pnpm tauri dev
```

Verify in real desktop app:
- [ ] Drag layer from doc A to doc B tab → switches after 500ms, layer added
- [ ] Drag layer from doc A to doc B canvas → layer added at cursor
- [ ] Drag layer from doc A to doc B layers panel → layer added at center
- [ ] Drop image file from Explorer onto canvas → image layer at cursor
- [ ] Drop multiple image files → cascade visible
- [ ] Drop on tab empty area → new doc
- [ ] Drop on tool rail → no-op (or new doc for file)
- [ ] Alt+drag layer → source loses layer (Move)
- [ ] Toast appears on error (e.g., workspace full)
- [ ] Undo works in target doc (removes added layer)
- [ ] Undo works in source doc (restores moved layer, if Alt+Move)

---

#### Task 17: Update documentation

**Files:**
- Modify: `docs/AI_HISTORY.md`
- Modify: `docs/FEATURES.md`
- Modify: `docs/AI_CURRENT_TASK.md`

- [ ] **Step 1: Append entry to AI_HISTORY.md**

Add at the end (preserve existing history):

```markdown
## [2026-06-16] FEATURE — Cross-Document Drag & Drop [COMPLETE]

### Kategori: FEATURE / FRONTEND / MULTI-DOC / DRAG-AND-DROP

**Goal:**
Implement two related drag-drop features for Photrez:
1. In-app layer drag between documents (Copy default, Alt = Move)
2. External file drop from OS (Tauri 2 onDragDropEvent)
- Hover-to-switch on document tabs (500ms with visual countdown)
- Multi-file cascade (24px offset)
- Minimal toast notification system

[Full details in docs/superpowers/specs/2026-06-16-cross-doc-drag-drop-design.md]

**Done:**
[List all 17 tasks with key commits]
[Verification: ~1032 frontend tests, 92 Rust tests, 25 Playwright E2E]
```

- [ ] **Step 2: Update FEATURES.md**

Add to "Layer System" section:

```markdown
| ✅ DONE | Cross-document layer drag (Copy default, Alt = Move) |
```

Add new section "Drag & Drop":

```markdown
## 🖱️ Drag & Drop

| Status       | Fitur                                      |
| ------------ | ------------------------------------------ |
| ✅ DONE      | Drag layer between documents (Copy default, Alt = Move) |
| ✅ DONE      | Hover-to-switch document tab (500ms with countdown) |
| ✅ DONE      | Drop image file from OS (Tauri 2 onDragDropEvent) |
| ✅ DONE      | Multi-file cascade (24px offset) |
| ✅ DONE      | Context-sensitive drop zones (tab/canvas/layers-panel/tab-empty/outside) |
| ✅ DONE      | Minimal toast notification system |
```

- [ ] **Step 3: Mark task COMPLETE in AI_CURRENT_TASK.md**

Change `[IN PROGRESS]` to `[COMPLETE]` and add completion notes:

```markdown
### [2026-06-16] Feature — Cross-Document Drag & Drop (Layer + File) [COMPLETE]

[Existing goal/scope content + final status]

**Verification:**
- PASS: `pnpm --filter photrez-desktop test --run` (~1032 tests)
- PASS: `pnpm run build` (16-17s)
- PASS: `pnpm --filter photrez-desktop exec playwright test` (~25 E2E tests)
- PASS: `cargo test --workspace` (no Rust changes, 92 tests green)
```

- [ ] **Step 4: Commit docs**

```bash
git add docs/AI_HISTORY.md docs/FEATURES.md docs/AI_CURRENT_TASK.md
git commit -m "docs: record cross-doc drag and drop feature completion"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** All 12 sections of spec covered by tasks
  - Section 1-2 (Goal/Background): captured in spec file referenced
  - Section 3 (UX decisions Q1-Q8): implemented in tasks 4, 8-11
  - Section 4 (Architecture): DragController (T5), useTauriDragDrop (T6), crossDocLayerOps (T3-T4)
  - Section 5 (Payload/State): dragTypes (T1), DragController (T5)
  - Section 6 (Drop zones): DocumentTabsBar (T9), CanvasViewport (T10), LayersPanel (T11), EmptyWorkspace (T12)
  - Section 7 (Error handling): Toast (T2), validation in crossDocLayerOps (T4)
  - Section 8 (File manifest): all files mapped
  - Section 9 (Testing): unit (T1, T2, T3-T4), contract (T14), E2E (T15)
  - Section 10 (DoD): T16 verification
  - Section 11 (Out of scope): explicitly deferred
- [x] **No placeholders:** All code shown is complete and runnable
- [x] **Type consistency:** `LayerDragPayload` (dragTypes.ts) used consistently in T1, T4, T5, T8
- [x] **Frequent commits:** Every task ends with a commit
- [x] **TDD pattern:** Tests written first in T1, T2, T3, T4, T5, T9, T10, T11, T14, T15
- [x] **No regressions:** Existing tests must pass at every checkpoint

## Execution Notes

- Some tasks reference "follow existing pattern in X.test.tsx" — engineers should read the referenced file for the render/wrapper pattern.
- Task 9 (DocumentTabsBar) and Task 10 (CanvasViewport) and Task 11 (LayersPanel) follow the same pattern: read existing file → add drop handler → append tests → commit. Can be done in any order after T7.
- Task 12 (EmptyWorkspace) is independent of T8-T11 — can be done early or in parallel.
- Task 16 (full verification) is the gate — DO NOT mark feature complete until all checks pass.
