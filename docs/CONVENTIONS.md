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
- **Rotation convention**: Positive degrees = clockwise (Photoshop-like). Must be consistent across transform geometry, renderer shader, cursor resolver, and SVG overlay.
- **Snapping**: Uses transformed AABB (axis-aligned bounding box), not true rotated-edge snapping. Canvas edges/centers have higher priority (3 and 2) than layer-to-layer (1).
- **Transient states** are separate and must be cleaned explicitly: `snapLines` signal, HUD (`hudInfo`), `dragState`, `hoverHandle`. Cleaning one does not clean the others.
- **Alt behavior** is context-dependent: canvas move path disables snapping, overlay resize scales from center, brush/eraser switches to eyedropper.
- **Overlay Alt snap**: Overlay move path is consistent with canvas path — Alt disables snapping (`!e.altKey` guard).
- **Keyboard nudge** (`Arrow/Shift+Arrow`): bypasses snapping and HUD, commits history only once per non-repeat burst.
- **Viewport rotation** (`ViewportState.rotation`) exists in type but is not yet supported by Move Tool math. If activated, screen-to-document, cursor, and transform geometry need revision.
