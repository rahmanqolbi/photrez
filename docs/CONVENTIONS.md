# CONVENTIONS.md — Photrez Code Patterns & Domain Knowledge

> Detailed code patterns, API examples, and domain-specific assumptions extracted from `AI_CONTEXT.md`.
> AI agents: read this when working on related subsystems. `AI_CONTEXT.md` has pointers here.

---

## 1. SolidJS Patterns (NOT React)

### Signal Access — MUST Call As Function

```tsx
// ❌ WRONG — signal is not a value
const x = count;        // returns accessor function, not value
if (count) { ... }      // always truthy (function reference)

// ✅ CORRECT
const x = count();      // returns current value
if (count()) { ... }    // evaluates actual value
```

### Control Flow Components (NOT .map())

```tsx
// ❌ WRONG — React pattern
{layers.map((layer) => <LayerItem key={layer.id} />)}

// ✅ CORRECT — SolidJS <For>
<For each={layers()}>
    {(layer) => <LayerItem layer={layer} />}
</For>

// ✅ Conditional rendering
<Show when={isVisible()} fallback={<Fallback />}>
    <Content />
</Show>

// ✅ Switch/Match
<Switch>
    <Match when={activeTab() === "layers"}><LayersPanel /></Match>
    <Match when={activeTab() === "history"}><HistoryPanel /></Match>
</Switch>
```

### Store for Complex State

```tsx
import { createStore } from "solid-js/store";

const [state, setState] = createStore({
    document: { width: 800, height: 600 },
    layers: [],
    activeLayerId: null
});

// Update nested property
setState("document", "width", 1920);
setState("layers", layers => [...layers, newLayer]);

// ❌ WRONG — direct mutation won't trigger reactivity
state.document.width = 1920;
```

### Untrack and Batch

```tsx
import { untrack, batch } from "solid-js";

// Read signal without tracking (prevent re-run effect)
createEffect(() => {
    const id = props.id;  // tracked
    const label = untrack(() => props.label);  // NOT tracked
});

// Batch multiple updates (single re-render)
batch(() => {
    setCount(1);
    setName("new");
    setActive(true);
});
```

### Lifecycle

```tsx
import { onMount, onCleanup, createEffect } from "solid-js";

onMount(() => {
    // Runs once after component mount
});

onCleanup(() => {
    // Cleanup on component unmount
});

// Every createEffect with listeners MUST have onCleanup()
createEffect(() => {
    const handler = () => { ... };
    window.addEventListener("resize", handler);
    onCleanup(() => window.removeEventListener("resize", handler));
});
```

---

## 2. Tauri 2 IPC Patterns

### Command Definition (Rust)

```rust
#[tauri::command]
fn my_command(
    param: String,
    state: tauri::State<'_, EditorState>
) -> Result<Value, Value> {
    let mut doc = state.document.lock().unwrap();
    // ... logic
    ok_response(&*doc)
}

// Registration in Builder
tauri::Builder::default()
    .manage(EditorState::new())
    .invoke_handler(tauri::generate_handler![my_command])
    .run(tauri::generate_context!())
```

### Frontend Invoke (SolidJS)

```tsx
import { invoke } from "@tauri-apps/api/core";

const result = await invoke("my_command", { param: "value" });
// result = response envelope { ok, contract_version, data }

// ❌ FORBIDDEN — no Node.js APIs in Tauri
import fs from "fs";         // DOES NOT EXIST
import path from "path";     // DOES NOT EXIST
require("electron");         // DOES NOT EXIST
```

### Tauri vs Electron Key Differences

| Aspect           | Tauri 2                              | Electron (DO NOT USE)                  |
|------------------|--------------------------------------|----------------------------------------|
| Backend          | Rust native                          | Node.js                               |
| IPC              | `invoke()` → `#[tauri::command]`     | `ipcRenderer` → `ipcMain`             |
| File dialog      | `@tauri-apps/plugin-dialog`          | `dialog.showOpenDialog`               |
| State            | `tauri::State<'_, T>` (Rust managed) | Zustand / Redux                       |
| Security         | Permission-based (`capabilities/`)   | `contextIsolation` / `sandbox`        |
| Preload          | None (use `invoke` directly)         | `contextBridge.exposeInMainWorld`      |

---

## 3. History / Undo-Redo Pattern

```rust
// Pattern: snapshot-based
// 1. history.commit(current_state) BEFORE mutation
// 2. Mutate document
// 3. Return response

#[tauri::command]
fn add_layer(name: String, state: tauri::State<'_, EditorState>) -> Result<Value, Value> {
    let mut doc = state.document.lock().unwrap();
    let mut history = state.history.lock().unwrap();

    // Snapshot BEFORE mutation
    history.commit((*doc).clone());

    // Mutate
    doc.add_layer(new_layer);

    ok_response(&*doc)
}
```

- **Max depth**: 50 entries (locked in decision log).
- **Eviction**: FIFO when exceeding 50.
- **Redo branch**: Discarded on new mutation after undo.

---

## 4. GPU Resource Lifecycle (wgpu — Future)

```rust
// wgpu resource lifecycle:
// 1. Adapter → Device + Queue (once at init)
// 2. Surface ← Device (for window rendering)
// 3. Texture/Buffer ← Device (per-resource, freed on drop)
// 4. RenderPipeline ← Device (compiled shader + state)

// ❌ FORBIDDEN — leaking GPU resources
let texture = device.create_texture(&desc);
// forgot to drop → GPU memory leak

// ✅ CORRECT — resource dropped when no longer needed
{
    let texture = device.create_texture(&desc);
    // ... use texture
} // automatically dropped here
```

---

## 5. Move Tool Runtime Assumptions

Rules specific to the Move Tool subsystem:

- **Two drag paths**: Canvas path (`input-handler.ts`) handles auto-select and fallback move. Overlay path (`SelectionTransformOverlay.tsx`) handles selected-layer move/resize/rotate handles. Every fix must be verified in both paths.
- **Layer stack**: `engine.getLayers()` returns top-first order (`layers[0]` = visually topmost). `hitTestLayers()` returns the first visible matching layer.
- **Transform geometry**: Move math uses visual rect top-left (`transform.x/y`), positive `scaleX/scaleY` magnitude. Orientation (`flipH/flipV`) only affects texture in shader, not geometry.
- **Rotation convention**: Positive degrees = clockwise. Must be consistent across transform geometry, renderer shader, cursor resolver, and SVG overlay.
- **Snapping**: Uses transformed AABB (axis-aligned bounding box), not true rotated-edge snapping. Canvas edges/centers have higher priority (3 and 2) than layer-to-layer (1).
- **Transient states** are separate and must be cleaned explicitly: `snapLines` signal, HUD (`hudInfo`), `dragState`, `hoverHandle`. Cleaning one does not clean the others.
- **Alt behavior** is context-dependent: canvas move path disables snapping, overlay resize scales from center, brush/eraser switches to eyedropper.
- **Overlay Alt snap**: Overlay move path is consistent with canvas path — Alt disables snapping (`!e.altKey` guard).
- **Keyboard nudge** (`Arrow/Shift+Arrow`): bypasses snapping and HUD, commits history only once per non-repeat burst.
- **Viewport rotation** (`ViewportState.rotation`) exists in type but is not yet supported by Move Tool math. If activated, screen-to-document, cursor, and transform geometry need revision.

---

## 6. Tool Creation Recipe (9-12 langkah wiring)

> **Origin:** Pattern ini di-extract setelah investigasi berulang "every new tool passes test but fails in frontend". Root cause selalu sama: **wiring lupa 1+ langkah**, biasanya step 3 (pointer handler) atau step 5 (option bar).
> Reference: `docs/plans/2026-06-14-test-overhaul-reference.md` §Phase 2.

### Recipe

```text
1.  Tool type union
    → editorState.ts (atau file type pusat)

2.  Keyboard shortcut
    → useCanvasKeyboard.ts
    → test: keyboard shortcut terdaftar, tidak conflict dengan tool lain

3.  Pointer handler di dispatcher        ← PALING SERING LUPA
    → useCanvasPointerTools.ts (atau useCanvasPointerTools dispatcher)
    → tanpa ini: tool TIDAK respond ke click di canvas
    → test: click on canvas dengan tool aktif → engine state berubah

4.  Toolbar button
    → AppTitleBar.tsx atau components/editor/ToolRail.tsx
    → test: button muncul, clickable, switch activeTool signal

5.  Option bar component                  ← SERING LUPA
    → components/editor/<Tool>OptionBar.tsx
    → tampil saat activeTool() === "tool-name"
    → test: render dengan activeTool(), assert DOM + signals sync

6.  Cursor behavior
    → CSS atau cursor resolver (cursorResolver.ts)
    → test: cursor berubah sesuai hover state + drag state

7.  Undo/redo integration                ← SERING LUPA
    → history.commit(engine.snapshot()) SEBELUM mutation
    → tanpa ini: undo tidak revert aksi tool
    → test: trigger aksi, undo, verify state kembali

8.  Status bar integration (optional)
    → StatusBar.tsx
    → test: status info update sesuai tool state

9.  EditorContext state (optional)
    → kalau tool butuh state tambahan, register di EditorContext.tsx
    → test: state signal reactive, cleanup saat tool switch

10. Tests (wajib sebelum merge)
    → Unit tests untuk logic
    → 1 contract test untuk state machine
    → 1 CanvasViewport integration test untuk real pointer chain
    → 1 tool switch round-trip test (A→B→A, no orphan state)

11. Docs
    → docs/AI_HISTORY.md: entry FEATURE atau BUG FIX dengan Root Cause + Fix Rationale
    → docs/FEATURES.md: status update
    → docs/AI_CURRENT_TASK.md: status COMPLETE

12. Verification
    → pnpm --filter photrez-desktop test --run
    → pnpm run build
    → tidak ada regression
```

### Common bugs dari missed step

| Missed step | Symptom | Diagnosis |
|---|---|---|
| Step 3 (pointer handler) | "Tool tidak respond ke click" | `useCanvasPointerTools` dispatcher belum diupdate dengan `case "newTool"` |
| Step 5 (option bar) | "Option bar tidak muncul saat tool aktif" | Tidak ada `<Show when={activeTool() === "newTool"}>` render di shell |
| Step 6 (cursor) | "Cursor tidak berubah" | Cursor resolver belum diupdate dengan case untuk newTool |
| Step 7 (history) | "Undo tidak revert aksi tool" | Lupa `history.commit()` sebelum mutate engine state |

### Tool switch cleanup (wajib untuk SEMUA tool)

Saat user switch dari tool A ke tool B, tool A **harus**:
- Clear hover state (`hoverHandle` → null)
- Clear drag state (`dragState` → null)
- Clear session-specific state (e.g., `layerTransformSession`, `modernCropFrame`)
- Restore default cursor

Test pattern: lihat `CanvasViewport.test.tsx` §"Phase 3 Tool Switch Contracts" untuk 4 contoh test round-trip.
