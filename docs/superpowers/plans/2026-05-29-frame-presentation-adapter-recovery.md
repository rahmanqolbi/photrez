# Frame Presentation Adapter Recovery impl Plan
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make imported and edited image pixels visible in the Photrez MVP by replacing the fragile native wgpu-surface-behind-WebView presentation path with a verified Rust-owned preview frame adapter.

**Architecture:** Rust Core remains the only source of truth for document state and pixel data. The MVP presentation path will render a flattened PNG preview from Rust, store it in the app cache, return only small frame metadata through Tauri IPC, and let SolidJS display the frame with a normal `<img>` inside the existing artboard. Native wgpu surface rendering stays available as future renderer work, but it stops blocking the usable open-edit-export flow.

**Tech Stack:** Tauri 2 commands, SolidJS signals, `@tauri-apps/api/core` `convertFileSrc`, Rust `photrez-core::export`, Tauri asset protocol, existing Vitest and Rust tests.

## Why This Plan Exists

The current native wgpu presentation path depends on WebView transparency and native surface ordering. External references show this is a known fragile area:

- Tauri command return values are JSON by default, and Tauri warns that returning large data such as files through JSON can slow the app. Tauri supports optimized raw buffers and channels for binary data: <https://tauri.app/fr/develop/calling-rust/>
- Tauri supports custom protocols for serving bytes into WebViews: <https://docs.rs/tauri/latest/tauri/struct.Builder.html#method.register_uri_scheme_protocol>
- Tauri supports an asset protocol for serving files from disk into the WebView with explicit scope: <https://v2.tauri.app/security/asset-protocol/>
- Tauri users report native renderer/WebView transparency and ordering problems around wgpu overlays: <https://github.com/orgs/tauri-apps/discussions/11944>
- A related Tauri issue reports a transparent WebView becoming black/white and not letting content behind it show through even when CSS is transparent: <https://github.com/tauri-apps/tauri/issues/12450>
- wgpu render-to-texture/readback is a valid path for future offscreen GPU preview work: <https://wgpu.rs/doc/src/wgpu_examples/render_to_texture/mod.rs.html>

This plan deliberately chooses a boring display path first: PNG preview file plus WebView image display. That proves Core pixels, edit invalidation, and UI presentation before returning to native surface work.

## Current Evidence and Constraints

- `crates/core/src/layers.rs` stores `Layer.bitmap_ref.pixel_data`, but it is `#[serde(skip)]`, so frontend document sync receives metadata only.
- `crates/core/src/export.rs::flatten_document` already composites layers into RGBA bytes.
- `crates/core/src/export.rs::export_document` already encodes PNG/JPEG/WebP bytes.
- `apps/desktop/src/App.tsx` currently renders transparent layer boxes in the artboard, not actual layer pixels.
- `apps/desktop/src-tauri/src/main.rs` currently initializes `photrez_render::WgpuRenderer` and renders during `RunEvent::MainEventsCleared`.
- The MVP cannot depend on shipping large RGBA buffers through JSON IPC.
- The frontend must not become a document or pixel source of truth.

## File Structure

Create:

- `apps/desktop/src/previewFrame.ts`
  - Frontend utility for converting backend frame paths into cache-busted WebView image URLs.
  - Pure functions only, easy Vitest coverage.

- `apps/desktop/src/__tests__/previewFrame.test.ts`
  - Unit tests for frame URL generation and stale-frame protection helpers.

- `apps/desktop/src-tauri/src/preview.rs`
  - Rust preview frame adapter.
  - Owns preview version counter and last cache path.
  - Encodes current `Document` into PNG bytes using `photrez_core::export::export_document`.
  - Writes versioned files under app cache directory.
  - Deletes the previous preview file after a new one is written.

- `docs/05-adr/0007-frame-presentation-adapter.md`
  - Records the architecture decision that the MVP uses a Rust-owned WebView presentation adapter instead of native wgpu surface presentation.

Modify:

- `apps/desktop/src-tauri/src/main.rs`
  - Add `mod preview;`.
  - Manage `PreviewFrameState`.
  - Register `refresh_preview_frame`.
  - Stop relying on `trigger_render` for visible pixels.
  - Do not initialize or present native `WgpuRenderer` during the MVP adapter path.

- `apps/desktop/src-tauri/tauri.conf.json`
  - Enable asset protocol with app cache scope so the WebView can load generated preview PNG files.

- `apps/desktop/src/App.tsx`
  - Add `previewFrameUrl`, `previewFrameVersion`, `previewFrameError`.
  - Render preview `<img>` as the lowest artboard content layer.
  - Call `refreshPreviewFrame()` after commands that change visible document state.
  - Remove the `trigger_render` effect from the visible preview path.

- `apps/desktop/src/__tests__/renderer.test.ts`
  - Keep existing tests if still useful, but do not treat CSS placeholder tests as proof of pixel rendering.

- `docs/15-command-contract-spec.md`
  - Add `refresh_preview_frame` command contract.
  - Mark `trigger_render` and `update_viewport_state` as renderer-internal/legacy for the MVP adapter path.

- `docs/38-usable-mvp-recovery-plan.md`
  - Add a note that P1 will be recovered via frame presentation adapter.

- `docs/ARCHITECTURE.md`
  - Update current runtime status to describe the adapter path.

- `docs/FEATURES.md`
  - Change viewport status from native wgpu visibility completion to adapter-based recovery in progress/completed after verification.

- `docs/AI_CURRENT_TASK.md`
  - Track active implementation state.

- `docs/AI_HISTORY.md`
  - Append completion entry with root cause and verification.

## Data Flow After Implementation

```text
User action in SolidJS
  -> invoke("open_image" / "draw_brush_stroke" / "undo" / "redo" / layer command)
  -> Rust Core mutates Document and bitmap data
  -> frontend calls invoke("refresh_preview_frame")
  -> Rust preview adapter flattens Document to PNG bytes
  -> Rust writes $APPCACHE/photrez-preview/frame-N.png
  -> command returns { path, version, width, height, bytes }
  -> frontend convertFileSrc(path) + ?v=N
  -> artboard displays <img src="asset://localhost/photrez-preview/frame-N.png?v=N">
```

## Task 1: Add Frontend Preview URL Utility

- Create: `apps/desktop/src/previewFrame.ts`
- Create: `apps/desktop/src/__tests__/previewFrame.test.ts`

- [ ] **Step 1: Create the utility test**

Create `apps/desktop/src/__tests__/previewFrame.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  buildPreviewFrameSrc,
  isFreshPreviewFrame,
  type PreviewFrameMeta,
} from "../previewFrame";

describe("preview frame helpers", () => {
  it("builds a cache-busted asset URL from backend frame metadata", () => {
    const meta: PreviewFrameMeta = {
      path: "C:\\Users\\Qolbi\\AppData\\Local\\com.photrez.app\\cache\\photrez-preview\\frame-7.png",
      version: 7,
      width: 640,
      height: 480,
      bytes: 1234,
    };

    const src = buildPreviewFrameSrc(meta, (path) => `asset://${path}`);

    expect(src).toBe(
      "asset://C:\\Users\\Qolbi\\AppData\\Local\\com.photrez.app\\cache\\photrez-preview\\frame-7.png?v=7",
    );
  });

  it("accepts only frames that are at least as new as the current version", () => {
    expect(isFreshPreviewFrame({ version: 3 }, 2)).toBe(true);
    expect(isFreshPreviewFrame({ version: 3 }, 3)).toBe(true);
    expect(isFreshPreviewFrame({ version: 2 }, 3)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the failing test**

Run:

```powershell
pnpm.cmd --filter photrez-desktop test -- previewFrame
```

Expected: FAIL because `../previewFrame` does not exist.

- [ ] **Step 3: Create the utility**

Create `apps/desktop/src/previewFrame.ts`:

```ts
export interface PreviewFrameMeta {
  path: string;
  version: number;
  width: number;
  height: number;
  bytes: number;
}

export interface PreviewFrameVersionLike {
  version: number;
}

export function buildPreviewFrameSrc(
  frame: PreviewFrameMeta,
  convertFileSrc: (path: string) => string,
): string {
  const base = convertFileSrc(frame.path);
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}v=${frame.version}`;
}

export function isFreshPreviewFrame(
  frame: PreviewFrameVersionLike,
  currentVersion: number,
): boolean {
  return frame.version >= currentVersion;
}
```

- [ ] **Step 4: Run the utility tests**

Run:

```powershell
pnpm.cmd --filter photrez-desktop test -- previewFrame
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add apps/desktop/src/previewFrame.ts apps/desktop/src/__tests__/previewFrame.test.ts
git commit -m "test: add preview frame URL helpers"
```

## Task 2: Add Rust Preview Frame Adapter

- Create: `apps/desktop/src-tauri/src/preview.rs`
- Modify: `apps/desktop/src-tauri/src/main.rs`

- [ ] **Step 1: Create a focused Rust adapter file**

Create `apps/desktop/src-tauri/src/preview.rs`:

```rust
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use photrez_core::document::Document;
use photrez_core::export::{export_document, ExportFormat, ExportSettings};
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct PreviewFrameMeta {
    pub path: String,
    pub version: u64,
    pub width: u32,
    pub height: u32,
    pub bytes: usize,
}

#[derive(Debug, Default)]
struct PreviewFrameCacheInner {
    version: u64,
    last_path: Option<PathBuf>,
}

#[derive(Debug, Default)]
pub struct PreviewFrameState {
    inner: Mutex<PreviewFrameCacheInner>,
}

impl PreviewFrameState {
    pub fn render_to_cache(
        &self,
        doc: &Document,
        cache_root: &Path,
    ) -> Result<PreviewFrameMeta, String> {
        let preview_dir = cache_root.join("photrez-preview");
        fs::create_dir_all(&preview_dir)
            .map_err(|e| format!("Failed to create preview cache dir: {}", e))?;

        let png_bytes = export_document(doc, &ExportSettings::new(ExportFormat::PNG, 100))?;

        let mut inner = self
            .inner
            .lock()
            .map_err(|_| "Preview frame state lock poisoned".to_string())?;
        inner.version = inner.version.saturating_add(1);

        let version = inner.version;
        let frame_path = preview_dir.join(format!("frame-{}.png", version));
        let tmp_path = preview_dir.join(format!("frame-{}.tmp", version));

        fs::write(&tmp_path, &png_bytes)
            .map_err(|e| format!("Failed to write preview frame temp file: {}", e))?;
        fs::rename(&tmp_path, &frame_path)
            .map_err(|e| format!("Failed to publish preview frame: {}", e))?;

        if let Some(old_path) = inner.last_path.replace(frame_path.clone()) {
            if old_path != frame_path {
                let _ = fs::remove_file(old_path);
            }
        }

        Ok(PreviewFrameMeta {
            path: frame_path.to_string_lossy().to_string(),
            version,
            width: doc.width,
            height: doc.height,
            bytes: png_bytes.len(),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use photrez_core::layers::Layer;

    #[test]
    fn render_to_cache_writes_png_and_increments_version() {
        let temp_dir = std::env::temp_dir().join(format!(
            "photrez-preview-test-{}",
            uuid::Uuid::new_v4().simple()
        ));

        let mut doc = Document::new("doc-preview".to_string(), 2, 1);
        let mut layer = Layer::new("layer-red".to_string(), "Red".to_string(), 2, 1);
        layer.bitmap_ref.pixel_data = vec![255, 0, 0, 255, 0, 255, 0, 255];
        doc.layers = vec![layer];

        let state = PreviewFrameState::default();
        let first = state.render_to_cache(&doc, &temp_dir).unwrap();
        let second = state.render_to_cache(&doc, &temp_dir).unwrap();

        assert_eq!(first.version, 1);
        assert_eq!(second.version, 2);
        assert_eq!(second.width, 2);
        assert_eq!(second.height, 1);
        assert!(second.bytes > 8);

        let bytes = fs::read(second.path).unwrap();
        assert_eq!(&bytes[0..8], b"\x89PNG\r\n\x1a\n");

        let _ = fs::remove_dir_all(temp_dir);
    }
}
```

- [ ] **Step 2: Run the focused Rust test**

Run:

```powershell
cargo test -p photrez-desktop preview::tests::render_to_cache_writes_png_and_increments_version
```

Expected: FAIL until `mod preview;` is added in `main.rs`, or PASS if Rust test discovery compiles the module after the next step. If this hits the known Windows `windres` baseline issue, record the exact error and continue with `cargo check -p photrez-desktop` after implementation.

- [ ] **Step 3: Register the module and command**

Modify `apps/desktop/src-tauri/src/main.rs`.

Near the imports, add:

```rust
mod preview;

use preview::PreviewFrameState;
use tauri::AppHandle;
```

Add this command near the other commands:

```rust
#[tauri::command]
fn refresh_preview_frame(
    app: AppHandle,
    state: tauri::State<'_, EditorState>,
    preview_state: tauri::State<'_, PreviewFrameState>,
) -> Result<Value, Value> {
    let cache_dir = match app.path().app_cache_dir() {
        Ok(path) => path,
        Err(e) => return err_response("E_IO", &format!("Failed to resolve app cache dir: {}", e)),
    };

    let doc = state.document.lock().unwrap();
    match preview_state.render_to_cache(&*doc, &cache_dir) {
        Ok(frame) => ok_response(frame),
        Err(e) => err_response("E_INTERNAL", &e),
    }
}
```

In `get_contract_info`, add:

```rust
"refresh_preview_frame",
```

In `tauri::Builder::default()`, add another managed state:

```rust
.manage(PreviewFrameState::default())
```

In the existing `tauri::generate_handler!` command list, add:

```rust
refresh_preview_frame,
```

- [ ] **Step 4: Run Rust compile/test gate**

Run:

```powershell
cargo test -p photrez-desktop preview
```

Expected: PASS if the local Windows resource toolchain is healthy. If it fails with the existing `windres`/resource compiler issue, do not mask it; record it in the implementation notes and still run:

```powershell
cargo test -p photrez-core
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add apps/desktop/src-tauri/src/main.rs apps/desktop/src-tauri/src/preview.rs
git commit -m "feat: add preview frame cache adapter"
```

## Task 3: Enable Asset Protocol for Preview Files

- Modify: `apps/desktop/src-tauri/tauri.conf.json`

- [ ] **Step 1: Add asset protocol config**

Modify the `app.security` block in `apps/desktop/src-tauri/tauri.conf.json` from:

```json
"security": {
  "csp": null
}
```

to:

```json
"security": {
  "csp": null,
  "assetProtocol": {
    "enable": true,
    "scope": ["$APPCACHE/**/*"]
  }
}
```

- [ ] **Step 2: Verify JSON shape**

Run:

```powershell
node -e "JSON.parse(require('fs').readFileSync('apps/desktop/src-tauri/tauri.conf.json','utf8')); console.log('valid')"
```

Expected:

```text
valid
```

- [ ] **Step 3: Commit**

```powershell
git add apps/desktop/src-tauri/tauri.conf.json
git commit -m "chore: allow cached preview frames through asset protocol"
```

## Task 4: Render Preview Frame in the SolidJS Artboard

- Modify: `apps/desktop/src/App.tsx`
- Modify: `apps/desktop/src/__tests__/renderer.test.ts` only if old tests conflict with the new visible preview path.

- [ ] **Step 1: Import preview helpers**

Change the imports at the top of `apps/desktop/src/App.tsx` from:

```ts
import { invoke } from "@tauri-apps/api/core";
```

to:

```ts
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import {
  buildPreviewFrameSrc,
  isFreshPreviewFrame,
  type PreviewFrameMeta,
} from "./previewFrame";
```

- [ ] **Step 2: Add preview frame signals**

Near the document/layer signals, add:

```ts
const [previewFrameUrl, setPreviewFrameUrl] = createSignal<string | null>(null);
const [previewFrameVersion, setPreviewFrameVersion] = createSignal(0);
const [previewFrameError, setPreviewFrameError] = createSignal("");
```

- [ ] **Step 3: Add a refresh helper**

Add this helper near `syncDocumentState`:

```ts
const refreshPreviewFrame = async () => {
  try {
    const result = await invoke("refresh_preview_frame") as any;
    if (!result?.ok) {
      setPreviewFrameError(result?.error?.message || "Preview refresh failed");
      return;
    }

    const frame = result.data as PreviewFrameMeta;
    const currentVersion = previewFrameVersion();
    if (!isFreshPreviewFrame(frame, currentVersion)) {
      return;
    }

    setPreviewFrameVersion(frame.version);
    setPreviewFrameUrl(buildPreviewFrameSrc(frame, convertFileSrc));
    setPreviewFrameError("");
  } catch (err) {
    console.error("Preview refresh failed:", err);
    setPreviewFrameError("Preview refresh failed");
  }
};
```

- [ ] **Step 4: Refresh preview after document sync**

In `syncDocumentState`, after setting `docWidth`, `docHeight`, and `selection`, call:

```ts
void refreshPreviewFrame();
```

The relevant block should become:

```ts
if (res && res.ok) {
  const doc = res.data;
  setLayers(doc.layers || []);
  setDocWidth(doc.width || 800);
  setDocHeight(doc.height || 600);
  setSelection(doc.selection || null);
  if (doc.layers && doc.layers.length > 0 && !selectedLayerId()) {
    setSelectedLayerId(doc.layers[0].id);
  }
  void refreshPreviewFrame();
}
```

- [ ] **Step 5: Replace visible pixel placeholder with an image frame**

Inside the artboard, before selection/crop/transform overlays, add:

```tsx
<Show
  when={previewFrameUrl()}
  fallback={
    <div class="absolute inset-0 pointer-events-none z-0 bg-studio-canvas" />
  }
>
  {(src) => (
    <img
      src={src()}
      alt=""
      draggable={false}
      class="absolute inset-0 pointer-events-none select-none z-0"
      style={`width: ${docWidth()}px; height: ${docHeight()}px; object-fit: fill;`}
    />
  )}
</Show>
```

Keep all editing overlays above the image with their existing high z-index utility classes, for example `z-[9998]`, `z-[9999]`, `z-[10000]`, `z-[10001]`, `z-[10002]`, `z-[10003]`, and `z-[10004]`.

- [ ] **Step 6: Remove the visible dependency on `trigger_render`**

Replace the current effect:

```ts
createEffect(() => {
  layers();
  selectedLayerId();
  zoom();
  pan();
  invoke("trigger_render").catch(console.error);
  syncViewportState();
});
```

with:

```ts
createEffect(() => {
  zoom();
  pan();
  syncViewportState();
});
```

Do not remove `syncViewportState` yet because transform overlays and future renderer work may still use viewport math. The preview frame display no longer depends on `trigger_render`.

- [ ] **Step 7: Show a small non-blocking preview error**

Inside the artboard, below the preview `<img>` and before overlays, add:

```tsx
<Show when={previewFrameError()}>
  <div class="absolute left-3 top-3 z-[10004] rounded-sm border border-danger/50 bg-studio-bg px-2 py-1 text-[11px] text-danger shadow-pro">
    {previewFrameError()}
  </div>
</Show>
```

- [ ] **Step 8: Run frontend tests**

Run:

```powershell
pnpm.cmd --filter photrez-desktop test
```

Expected: PASS.

- [ ] **Step 9: Commit**

```powershell
git add apps/desktop/src/App.tsx apps/desktop/src/__tests__/renderer.test.ts
git commit -m "feat: display Rust preview frames in artboard"
```

## Task 5: Stop Native Surface Rendering From Blocking MVP Preview

- Modify: `apps/desktop/src-tauri/src/main.rs`
- Do not delete `crates/render`; keep it for later wgpu offscreen/native renderer work.

- [ ] **Step 1: Remove runtime dependency on `WgpuState` from the visible MVP path**

In `apps/desktop/src-tauri/src/main.rs`, remove or gate the `WgpuState` struct and the setup closure passed to `.setup` that calls:

```rust
let mut renderer = pollster::block_on(photrez_render::WgpuRenderer::new());
renderer.set_surface_from_window(window);
```

For the MVP adapter path, `main()` should not create a native wgpu surface.

- [ ] **Step 2: Remove `MainEventsCleared` surface presentation**

In the closure passed to `app.run`, remove the `tauri::RunEvent::MainEventsCleared` branch that builds `layer_data` and calls:

```rust
renderer.set_viewport_state(
    vp.artboard_x,
    vp.artboard_y,
    vp.artboard_w,
    vp.artboard_h,
    vp.pan_x,
    vp.pan_y,
    vp.zoom,
    vp.doc_width,
    vp.doc_height,
);
renderer.render_layers(&layer_data);
doc.clear_dirty();
```

The preview adapter renders explicitly through `refresh_preview_frame`, so app idle events must not own visible pixel presentation.

- [ ] **Step 3: Keep legacy commands classified**

Keep `trigger_render` and `update_viewport_state` registered only if existing frontend code or tests still reference them. If no code references them after Task 4, either:

1. Remove both from `generate_handler!` and `get_contract_info`, or
2. Leave them as no-op/internal commands and document them as legacy in `docs/15-command-contract-spec.md`.

Recommended MVP choice: leave `update_viewport_state` if transform or future renderer wiring still calls it; stop calling `trigger_render`.

- [ ] **Step 4: Run compile checks**

Run:

```powershell
cargo check -p photrez-render
```

Expected: PASS.

Run:

```powershell
cargo check -p photrez-desktop
```

Expected: PASS if the Windows resource toolchain is healthy. If this fails with the previously observed `windres` issue, document the exact output under implementation notes and do not claim the desktop Rust gate is green.

- [ ] **Step 5: Commit**

```powershell
git add apps/desktop/src-tauri/src/main.rs
git commit -m "refactor: decouple MVP preview from native wgpu surface"
```

## Task 6: Refresh Preview After Every Visible Mutation

- Modify: `apps/desktop/src/App.tsx`

- [ ] **Step 1: Audit current command handlers**

Search:

```powershell
rg -n "invoke\\(\"(open_image|add_layer|delete_layer|reorder_layer|update_layer|undo|redo|crop_canvas|resize_canvas|draw_brush_stroke|move_layer|transform_layer|clear_selection|select_all)" apps/desktop/src/App.tsx
```

Expected: list every document mutation call site.

- [ ] **Step 2: Ensure each visible mutation syncs state and preview**

For each mutation handler, make the success branch call `syncDocumentState()`. Since Task 4 calls `refreshPreviewFrame()` at the end of `syncDocumentState`, do not duplicate preview refreshes unless a handler intentionally avoids full document sync.

Example:

```ts
invoke("move_layer", { id: selectedLayerId(), x: nextX, y: nextY })
  .then((res: any) => {
    if (res?.ok) {
      syncDocumentState();
    }
  })
  .catch(console.error);
```

- [ ] **Step 3: Brush stroke commit must refresh after backend commit**

In the mouse-up brush/eraser commit path, ensure the success branch is:

```ts
if (res?.ok) {
  syncDocumentState();
}
```

Also clear the zero-latency stroke overlay canvas after the backend commit:

```ts
const canvas = strokeCanvasRef;
const ctx = canvas?.getContext("2d");
if (canvas && ctx) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}
```

- [ ] **Step 4: Run frontend test gate**

Run:

```powershell
pnpm.cmd --filter photrez-desktop test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add apps/desktop/src/App.tsx
git commit -m "fix: refresh preview after visible document mutations"
```

## Task 7: Add Command Contract and Architecture Docs

- Create: `docs/05-adr/0007-frame-presentation-adapter.md`
- Modify: `docs/15-command-contract-spec.md`
- Modify: `docs/38-usable-mvp-recovery-plan.md`
- Modify: `docs/ARCHITECTURE.md`

- [ ] **Step 1: Add ADR**

Create `docs/05-adr/0007-frame-presentation-adapter.md`:

```md
# ADR 0007: Frame Presentation Adapter for MVP Viewport Recovery

## Status

Accepted

## Date

2026-05-29

## Context

Photrez needs a reliable visible pixel viewport for the MVP open-edit-export flow. The native wgpu surface path attempted to render behind a transparent Tauri WebView, but this depends on platform-specific WebView transparency and native surface ordering. The current app still does not have verified visual smoke evidence that imported image pixels are visible.

Large pixel buffers must not be sent through normal JSON IPC. Frontend document state intentionally omits `Layer.bitmap_ref.pixel_data`, so the WebView cannot directly reconstruct document pixels from `get_document_state`.

## Decision

For MVP recovery, Photrez will use a Rust-owned frame presentation adapter:

1. Rust Core remains the source of truth for document and pixel data.
2. Rust flattens the current document into a PNG preview frame.
3. The desktop shell writes versioned preview PNG files into the app cache.
4. The frontend receives only frame metadata through IPC.
5. The frontend displays the frame via Tauri asset protocol using a normal `<img>`.

The native wgpu surface path is deferred. Future renderer work may replace CPU preview generation with wgpu offscreen render-to-texture, while preserving the same frontend frame presentation contract.

## Consequences

### Positive

- Restores a reliable visible image path for MVP.
- Avoids large JSON IPC payloads.
- Keeps image business logic and pixel data in Rust.
- Decouples product usability from WebView/native surface transparency behavior.
- Provides a stable presentation contract that can later be backed by offscreen wgpu.

### Negative

- CPU PNG preview generation is less efficient than direct GPU presentation.
- Preview refresh has encode/write overhead.
- The app cache needs cleanup of old frame files.

### Guardrails

- Frontend must not mutate pixel data.
- Preview files are presentation artifacts only.
- Export remains authoritative through `photrez-core::export`.
- Native wgpu surface work must not block the MVP smoke test.
```

- [ ] **Step 2: Update command contract**

Add this section to `docs/15-command-contract-spec.md`:

```md
### `refresh_preview_frame`

Purpose: regenerate the current document preview frame and return small presentation metadata for the frontend.

Request:

```json
{}
```

Success `data`:

```json
{
  "path": "C:\\Users\\Qolbi\\AppData\\Local\\com.photrez.app\\cache\\photrez-preview\\frame-12.png",
  "version": 12,
  "width": 1200,
  "height": 800,
  "bytes": 45231
}
```

Errors:

- `E_IO`: cache directory or preview file write failed.
- `E_INTERNAL`: preview encode failed.

Rules:

- Pixel bytes must not be returned through JSON.
- `version` must increase monotonically per app session.
- Frontend must cache-bust the image URL with `version`.
```

Also add `refresh_preview_frame` to the command list and note that `trigger_render` is internal/legacy if it remains registered.

- [ ] **Step 3: Update recovery plan**

In `docs/38-usable-mvp-recovery-plan.md`, under P1, add:

```md
Implementation decision 2026-05-29:

- MVP recovery will use a Rust-owned frame presentation adapter: Core flatten/export PNG -> app-cache preview frame -> Tauri asset URL -> WebView `<img>`.
- Native wgpu surface presentation is deferred until the open-edit-export smoke test is green.
- Future wgpu work should target offscreen render-to-texture behind the same frame metadata contract before revisiting native surface presentation.
```

- [ ] **Step 4: Update architecture status**

In `docs/ARCHITECTURE.md`, update the runtime status bullets to state:

```md
- **Viewport Presentation**: MVP recovery uses a Rust-owned frame presentation adapter. The frontend displays cache-busted preview PNG frames from app cache; it does not own pixel data.
- **Native wgpu Surface**: Existing code remains experimental/deferred and is not the release gate for visible MVP pixels.
```

- [ ] **Step 5: Commit**

```powershell
git add docs/05-adr/0007-frame-presentation-adapter.md docs/15-command-contract-spec.md docs/38-usable-mvp-recovery-plan.md docs/ARCHITECTURE.md
git commit -m "docs: record frame presentation adapter architecture"
```

## Task 8: Verification and Smoke Test

- Modify: `docs/FEATURES.md`
- Modify: `docs/AI_CURRENT_TASK.md`
- Modify: `docs/AI_HISTORY.md`

- [ ] **Step 1: Run automated gates**

Run:

```powershell
cargo test -p photrez-core
```

Expected: PASS.

Run:

```powershell
cargo check -p photrez-render
```

Expected: PASS.

Run:

```powershell
pnpm.cmd --filter photrez-desktop test
```

Expected: PASS.

Run:

```powershell
pnpm.cmd run build
```

Expected: PASS.

Run:

```powershell
cargo check -p photrez-desktop
```

Expected: PASS unless blocked by the known Windows `windres` baseline issue. If blocked, record the exact failure and classify it separately from preview adapter correctness.

- [ ] **Step 2: Manual smoke test**

Run the app and verify:

```powershell
pnpm.cmd tauri dev
```

Manual steps:

1. Launch Photrez.
2. Open a PNG/JPEG/WebP from File -> Open or Ctrl+O.
3. Confirm actual image pixels appear in the artboard.
4. Select Brush.
5. Draw one visible stroke.
6. Confirm the preview updates after stroke commit.
7. Undo.
8. Confirm the stroke disappears.
9. Redo.
10. Confirm the stroke reappears.
11. Export PNG.
12. Open exported PNG externally and confirm it matches the visible document.

- [ ] **Step 3: Update FEATURES**

In `docs/FEATURES.md`, update the viewport section after smoke verification:

```md
| DONE | Pixel-level canvas preview via Rust frame presentation adapter |
| DEFERRED | Native wgpu surface presentation behind WebView |
```

Keep the smoke gate marked pending until Step 2 passes.

- [ ] **Step 4: Update AI_CURRENT_TASK**

Prepend a new current task entry. Replace each evidence line with the exact result observed in Step 1 and Step 2; do not write the entry until those gates have actually run.

```md
## Current Task - Frame Presentation Adapter Recovery [COMPLETE]

Date: 2026-05-29

### Deskripsi

Mengganti jalur presentasi viewport MVP dari native wgpu surface di belakang WebView menjadi Rust-owned frame presentation adapter: Core flatten PNG -> app cache frame -> asset URL -> `<img>` di artboard.

### Bukti Verifikasi

- `cargo test -p photrez-core`: PASS, include test count from command output.
- `cargo check -p photrez-render`: PASS.
- `pnpm.cmd --filter photrez-desktop test`: PASS, include test count from command output.
- `pnpm.cmd run build`: PASS.
- `cargo check -p photrez-desktop`: PASS, or FAIL with the exact known Windows resource compiler error if still blocked.
- Manual open-edit-export smoke: PASS only after image pixels, brush, undo, redo, and export have been visually verified.
```

- [ ] **Step 5: Update AI_HISTORY**

Prepend an entry. Replace the validation bullets with exact observed command results from this implementation run.

```md
## [2026-05-29] FIX - Frame Presentation Adapter Viewport Recovery [COMPLETE]

### Kategori: BUG FIX / RENDERER / UI / FRONTEND / SHELL

**Deskripsi:** Memulihkan viewport piksel MVP dengan frame presentation adapter yang tidak bergantung pada native surface/WebView transparency.

**Root Cause:** Jalur native wgpu surface di belakang WebView bergantung pada transparansi dan z-order WebView2 yang tidak terverifikasi stabil. Frontend juga tidak menerima pixel data melalui `get_document_state` karena `pixel_data` sengaja tidak diserialisasi.

**Fix Rationale:** Kirim metadata kecil lewat IPC, serve preview PNG dari app cache melalui asset protocol, dan tetap jadikan Rust Core sebagai pemilik dokumen/pixel truth.

**Validasi:**
- `cargo test -p photrez-core`: PASS, include test count from command output.
- `cargo check -p photrez-render`: PASS.
- `pnpm.cmd --filter photrez-desktop test`: PASS, include test count from command output.
- `pnpm.cmd run build`: PASS.
- `cargo check -p photrez-desktop`: PASS, or FAIL with the exact known Windows resource compiler error if still blocked.
- Manual open-edit-export smoke: PASS only after image pixels, brush, undo, redo, and export have been visually verified.
```

- [ ] **Step 6: Commit docs**

```powershell
git add docs/FEATURES.md docs/AI_CURRENT_TASK.md docs/AI_HISTORY.md
git commit -m "docs: close frame presentation adapter recovery"
```

## Task 9: Post-MVP Renderer Follow-Up

This is not required for MVP recovery. Create follow-up issue or doc entry only after Task 8 is green.

- [ ] **Step 1: Record offscreen wgpu target**

Add a follow-up note to `docs/38-usable-mvp-recovery-plan.md`:

```md
Post-MVP renderer follow-up:

- Replace CPU PNG preview generation with `photrez-render` offscreen render-to-texture.
- Read back or share the rendered frame through the existing preview frame metadata contract.
- Revisit native surface presentation only after offscreen output is visually verified and performance measured.
```

- [ ] **Step 2: Do not implement this in MVP recovery**

No code changes in this task. The goal is to prevent the team from reintroducing native surface transparency as a release blocker.

## Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| PNG encode/write is slow on large images | Brush preview may feel delayed after commit | Keep zero-latency stroke overlay for drag, refresh only after commit, measure before optimizing |
| App cache scope blocks preview image | Image URL fails to load | Enable `assetProtocol` for `$APPCACHE/**/*`, log `previewFrameError`, verify with manual smoke |
| Old preview files accumulate | Disk cache grows | Version files and delete previous frame after successful write |
| `cargo check -p photrez-desktop` blocked by `windres` | Verification ambiguity | Record exact toolchain failure separately and keep Rust core/frontend gates explicit |
| Frontend starts treating preview as truth | Architecture regression | Preview URL is display-only; all sampling/export/edit commands continue to call Rust Core |
| Stale frame response overwrites newer frame | Visual flicker/regression | Use monotonic `version` and `isFreshPreviewFrame` before applying URL |

## Definition of Done

- Imported image pixels are visible in the artboard.
- Brush or eraser edits become visible after commit.
- Undo/redo updates the visible preview.
- Exported PNG matches the visible document.
- Frontend receives only preview metadata, not raw document pixel buffers.
- `photrez-core` remains the source of truth for document and pixel data.
- `pnpm.cmd --filter photrez-desktop test` passes.
- `pnpm.cmd run build` passes.
- `cargo test -p photrez-core` passes.
- `cargo check -p photrez-render` passes.
- `cargo check -p photrez-desktop` passes or a pre-existing Windows resource compiler blocker is explicitly documented.
- Docs are updated: ADR, command contract, recovery plan, architecture, features, AI current task, AI history.

## Self-Review

### Spec Coverage

- Visible imported pixels: covered by Tasks 2, 3, 4, and 8.
- Avoid large JSON IPC: covered by app-cache asset URL flow in Tasks 2 and 3.
- Keep Rust Core as source of truth: covered by architecture and data flow; frontend only receives frame metadata.
- Recover open-edit-export MVP: covered by Task 8 smoke test.
- Do not expand MVP scope: no PSD, print checker, plugins, AI, cloud, or native project format.
- Leave path open for wgpu: covered by Task 9 offscreen renderer follow-up.

### Placeholder Scan

This plan intentionally avoids implementation placeholders. Every task names exact files, commands, expected outputs, and the code shape for new modules/helpers. Implementation agents must replace verification ellipses in AI docs with actual command outputs after running the gates.

### Type Consistency

- Frontend `PreviewFrameMeta` matches Rust `PreviewFrameMeta`: `path`, `version`, `width`, `height`, `bytes`.
- `refresh_preview_frame` returns the canonical response envelope through `ok_response(frame)`.
- Frontend uses `buildPreviewFrameSrc(frame, convertFileSrc)` and cache-busts with `version`.
- Rust preview generation reuses `photrez_core::export::export_document` with `ExportFormat::PNG`.
