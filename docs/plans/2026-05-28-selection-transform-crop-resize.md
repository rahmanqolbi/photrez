# Selection, Transform, Crop, and Resize Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Implement full Milestone 3 core operations including Canvas Cropping and Resizing in Rust Core & Tauri, interactive selection and layer coordinate positioning properties, Crop tool overlay rendering, and options bar action controls in SolidJS.

**Architecture:** Extend `Document` model in `photrez-core` with canvas crop and resize operations. Register these commands in the Tauri desktop shell main handlers. Introduce reactive SolidJS signals for dynamic canvas viewport sizing, layer rendering, dashed marquee selection rendering, and crop boundaries overlay drawing. Connect properties inspector coordinate inputs to Tauri positioning events.

**Tech Stack:** Rust, SolidJS, TypeScript, Tauri 2, Tailwind CSS v4, Lucide Icons.

---

### Task 1: [photrez-core] Implement Canvas Crop and Resize in document.rs

**Files:**
- Modify: [document.rs](file:///d:/Project/image-studio/crates/core/src/document.rs) (Add `crop_canvas` and `resize_canvas` methods + write unit tests)

**Step 1: Write the failing tests**
- In `crates/core/src/document.rs`, add tests to the `mod tests` module:
  ```rust
  #[test]
  fn test_crop_canvas() {
      let mut doc = Document::new("doc-crop".to_string(), 800, 600);
      let l1 = Layer::new("l-1".to_string(), "Layer 1".to_string(), 100, 100);
      doc.add_layer(l1);
      doc.layers[0].x = 50.0;
      doc.layers[0].y = 50.0;

      let res = doc.crop_canvas(10.0, 10.0, 500, 400);
      assert!(res.is_ok());
      assert_eq!(doc.width, 500);
      assert_eq!(doc.height, 400);
      assert_eq!(doc.layers[0].x, 40.0);
      assert_eq!(doc.layers[0].y, 40.0);
  }

  #[test]
  fn test_resize_canvas() {
      let mut doc = Document::new("doc-resize".to_string(), 800, 600);
      let res = doc.resize_canvas(1024, 768);
      assert!(res.is_ok());
      assert_eq!(doc.width, 1024);
      assert_eq!(doc.height, 768);
  }
  ```

**Step 2: Run tests to verify they fail**
- Run: `.\rtk.exe cargo test --package photrez-core --lib -- document::tests`
- Expected: Compilation error due to missing methods `crop_canvas` and `resize_canvas`.

**Step 3: Implement minimal code to pass**
- In `crates/core/src/document.rs`, add the methods inside `impl Document`:
  ```rust
  pub fn crop_canvas(&mut self, x: f32, y: f32, width: u32, height: u32) -> Result<(), String> {
      if width == 0 || height == 0 {
          return Err("Crop dimensions must be greater than zero".to_string());
      }
      self.width = width;
      self.height = height;
      for layer in self.layers.iter_mut() {
          layer.x -= x;
          layer.y -= y;
      }
      self.selection = None; // Clear selection after crop
      Ok(())
  }

  pub fn resize_canvas(&mut self, width: u32, height: u32) -> Result<(), String> {
      if width == 0 || height == 0 {
          return Err("Canvas dimensions must be greater than zero".to_string());
      }
      self.width = width;
      self.height = height;
      Ok(())
  }
  ```

**Step 4: Run tests to verify they pass**
- Run: `.\rtk.exe cargo test --package photrez-core --lib -- document::tests`
- Expected: PASS

**Step 5: Commit**
```bash
git add crates/core/src/document.rs
git commit -m "feat(core): implement crop_canvas and resize_canvas operations with tests"
```

---

### Task 2: [desktop-shell] Register Crop and Resize Commands in main.rs

**Files:**
- Modify: [main.rs](file:///d:/Project/image-studio/apps/desktop/src-tauri/src/main.rs) (Add `crop_canvas` and `resize_canvas` commands, add to supported_commands list and Builder handlers)

**Step 1: Write command handlers in main.rs**
- Near the other handlers, implement `crop_canvas` and `resize_canvas`:
  ```rust
  #[tauri::command]
  fn crop_canvas(
      x: f32,
      y: f32,
      width: u32,
      height: u32,
      state: tauri::State<'_, EditorState>,
  ) -> Result<Value, Value> {
      let mut doc = state.document.lock().unwrap();
      let mut history = state.history.lock().unwrap();
      history.commit((*doc).clone());

      match doc.crop_canvas(x, y, width, height) {
          Ok(_) => ok_response(&*doc),
          Err(e) => err_response("E_VALIDATION", &e),
      }
  }

  #[tauri::command]
  fn resize_canvas(
      width: u32,
      height: u32,
      state: tauri::State<'_, EditorState>,
  ) -> Result<Value, Value> {
      let mut doc = state.document.lock().unwrap();
      let mut history = state.history.lock().unwrap();
      history.commit((*doc).clone());

      match doc.resize_canvas(width, height) {
          Ok(_) => ok_response(&*doc),
          Err(e) => err_response("E_VALIDATION", &e),
      }
  }
  ```
- Add them to the `supported_commands` list in `get_contract_info` (around lines 98-102):
  ```rust
            "transform_layer",
            "crop_canvas",
            "resize_canvas"
  ```
- Register them in `tauri::generate_handler!` inside the `main()` builder wrapper (around line 308):
  ```rust
          .invoke_handler(tauri::generate_handler![
              ping,
              get_contract_info,
              get_document_state,
              add_layer,
              delete_layer,
              reorder_layer,
              update_layer,
              undo,
              redo,
              create_selection,
              clear_selection,
              select_all,
              move_layer,
              transform_layer,
              crop_canvas,
              resize_canvas
          ])
  ```

**Step 2: Verify compilation**
- Run: `.\rtk.exe cargo check`
- Expected: Successful compilation with zero errors.

**Step 3: Commit**
```bash
git add apps/desktop/src-tauri/src/main.rs
git commit -m "feat(shell): register crop_canvas and resize_canvas Tauri IPC commands"
```

---

### Task 3: [frontend] Implement Dynamic Canvas Sizing & Selection Overlay rendering in App.tsx

**Files:**
- Modify: [App.tsx](file:///d:/Project/image-studio/apps/desktop/src/App.tsx) (Add state signals, update `syncDocumentState` and render layers + selection marquee)

**Step 1: Inject signals and state**
- Inside the `App` component (around line 35), add new signals:
  ```typescript
  const [docWidth, setDocWidth] = createSignal(800);
  const [docHeight, setDocHeight] = createSignal(600);
  const [selection, setSelection] = createSignal<any>(null);
  ```
- Modify the `syncDocumentState` helper to parse these variables from the incoming document envelope:
  ```typescript
  const syncDocumentState = () => {
    invoke("get_document_state")
      .then((res: any) => {
        if (res && res.ok) {
          const doc = res.data;
          setLayers(doc.layers || []);
          setDocWidth(doc.width || 800);
          setDocHeight(doc.height || 600);
          setSelection(doc.selection || null);
          if (doc.layers && doc.layers.length > 0 && !selectedLayerId()) {
            setSelectedLayerId(doc.layers[0].id);
          }
        }
      })
      .catch((err) => console.error("Sync state err:", err));
  };
  ```

**Step 2: Bind canvas width and height dynamically & render Layer structures**
- Replace the artboard element markup (around line 677-683) with dynamic styled wrappers:
  ```tsx
  <div class="flex-grow flex items-center justify-center relative bg-studio-canvas overflow-auto">
    <div 
      class="artboard border border-studio-border shadow-pro relative overflow-hidden bg-studio-canvas"
      style={`width: ${docWidth()}px; height: ${docHeight()}px; transform: scale(${zoom() / 100});`}
      ref={artboardRef}
      onMouseDown={handleArtboardMouseDown}
    >
      {/* ── Background Grid representation ── */}
      <div class="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

      {/* ── Render Layers stack in document order ── */}
      <For each={layers()}>
        {(layer, index) => (
          <Show when={layer.visible}>
            <div 
              class={`absolute transition-shadow duration-75 select-none ${selectedLayerId() === layer.id ? "ring-1 ring-accent shadow-md" : ""}`}
              style={`
                left: ${layer.x}px;
                top: ${layer.y}px;
                width: ${layer.width}px;
                height: ${layer.height}px;
                opacity: ${layer.opacity};
                z-index: ${layers().length - index()};
                background-color: ${layer.id.includes("bg") ? "#232324" : "rgba(225,90,23,0.12)"};
                border: ${layer.id.includes("bg") ? "none" : "1px dashed rgba(225,90,23,0.3)"};
              `}
            >
              {/* Layer label inside canvas */}
              <div class="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                <span class="text-[9px] text-text-muted font-mono opacity-50 uppercase tracking-widest">{layer.name}</span>
              </div>
            </div>
          </Show>
        )}
      </For>

      {/* ── Active Selection Marquee Overlay ── */}
      {(() => {
        const sel = selection();
        return sel ? (
          <div 
            class="absolute border-2 border-dashed border-accent pointer-events-none z-[9999]"
            style={`
              left: ${sel.x}px;
              top: ${sel.y}px;
              width: ${sel.width}px;
              height: ${sel.height}px;
              animation: dash 1s linear infinite;
            `}
          />
        ) : null;
      })()}

      {/* ── Active Mouse Drag Selection Preview Overlay ── */}
      {(() => {
        const overlay = selectionOverlay();
        return overlay ? (
          <div 
            class="absolute border border-accent bg-accent/10 pointer-events-none z-[10000]"
            style={`
              left: ${overlay.x}px;
              top: ${overlay.y}px;
              width: ${overlay.w}px;
              height: ${overlay.h}px;
            `}
          />
        ) : null;
      })()}
    </div>
  </div>
  ```

**Step 3: Add CSS Keyframe animation for Dash overlay**
- At the end of [index.css](file:///d:/Project/image-studio/apps/desktop/src/index.css), add the keyframes for selection border marching-ants animation:
  ```css
  @keyframes dash {
    to {
      stroke-dashoffset: -10;
      border-style: dashed;
    }
  }
  ```

**Step 4: Commit**
```bash
git add apps/desktop/src/App.tsx apps/desktop/src/index.css
git commit -m "feat(frontend): implement dynamic canvas sizing, layer rendering, and dashed marquee selection overlays"
```

---

### Task 4: [frontend] Enable Crop Tool, Drawing Crop Overlay & Options Bar Crop Actions

**Files:**
- Modify: [App.tsx](file:///d:/Project/image-studio/apps/desktop/src/App.tsx) (Enable crop tool button, introduce drag states, render options bar context controls)

**Step 1: Enable Left Rail Crop button**
- Find the Crop tool button in Left Tool Rail (around line 580) and replace it with:
  ```tsx
  <button 
    onClick={() => handleToolChange("crop")}
    class={`tool-btn-raw ${activeTool() === "crop" ? "active" : ""}`} 
    title="Crop Tool (C)"
  >
    <Crop size={18} />
  </button>
  ```

**Step 2: Wire crop drag and overlay state**
- Add signals inside the `App` component (around line 50) for tracking crop selection boundary dragging:
  ```typescript
  const [isDraggingCrop, setIsDraggingCrop] = createSignal(false);
  const [cropStart, setCropStart] = createSignal({ x: 0, y: 0 });
  const [cropEnd, setCropEnd] = createSignal({ x: 0, y: 0 });
  const cropOverlay = () => {
    if (!isDraggingCrop() && cropStart().x === cropEnd().x) return null;
    const s = cropStart(), e = cropEnd();
    const w = Math.abs(e.x - s.x), h = Math.abs(e.y - s.y);
    if (w < 5 && h < 5) return null;
    return { x: Math.min(s.x, e.x), y: Math.min(s.y, e.y), w, h };
  };
  ```
- Modify the `handleArtboardMouseDown`, `handleArtboardMouseMove`, and `handleArtboardMouseUp` triggers to support the `"crop"` tool:
  ```typescript
  const handleArtboardMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return;
    const coords = getArtboardCoords(e.clientX, e.clientY);

    if (activeTool() === "move" && selectedLayerId()) {
      const layer = layers().find(l => l.id === selectedLayerId());
      if (layer) {
        setIsDraggingLayer(true);
        setLayerDragOffset({ x: coords.x - layer.x, y: coords.y - layer.y });
      }
    } else if (activeTool() === "selection") {
      setIsSelecting(true);
      setSelStart({ x: coords.x, y: coords.y });
      setSelEnd({ x: coords.x, y: coords.y });
    } else if (activeTool() === "crop") {
      setIsDraggingCrop(true);
      setCropStart({ x: coords.x, y: coords.y });
      setCropEnd({ x: coords.x, y: coords.y });
    }
  };

  const handleArtboardMouseMove = (e: MouseEvent) => {
    const coords = getArtboardCoords(e.clientX, e.clientY);

    if (isDraggingLayer() && selectedLayerId()) {
      const layer = layers().find(l => l.id === selectedLayerId());
      if (layer) {
        const newX = coords.x - layerDragOffset().x;
        const newY = coords.y - layerDragOffset().y;
        invoke("move_layer", { id: selectedLayerId(), x: newX, y: newY })
          .then((res: any) => { if (res?.ok) syncDocumentState(); })
          .catch(console.error);
      }
    } else if (isSelecting()) {
      setSelEnd({ x: coords.x, y: coords.y });
    } else if (isDraggingCrop()) {
      setCropEnd({ x: coords.x, y: coords.y });
    }
  };

  const handleArtboardMouseUp = (_e: MouseEvent) => {
    if (isSelecting()) {
      const overlay = selectionOverlay();
      if (overlay && overlay.w > 5 && overlay.h > 5) {
        invoke("create_selection", { x: overlay.x, y: overlay.y, width: overlay.w, height: overlay.h })
          .then((res: any) => { if (res?.ok) syncDocumentState(); })
          .catch(console.error);
      } else {
        invoke("clear_selection").catch(console.error);
      }
      setIsSelecting(false);
    } else if (isDraggingCrop()) {
      setIsDraggingCrop(false);
    }
    setIsDraggingLayer(false);
  };
  ```

**Step 3: Render Crop boundaries overlay inside artboard**
- Add the crop boundaries visual indicator inside the `<div class="artboard ...">` wrapper:
  ```tsx
  {/* ── Crop Boundaries dragging overlay ── */}
  {(() => {
    const crop = cropOverlay();
    return crop ? (
      <div 
        class="absolute border-2 border-dashed border-yellow-500 bg-black/30 pointer-events-none z-[10001] shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
        style={`
          left: ${crop.x}px;
          top: ${crop.y}px;
          width: ${crop.w}px;
          height: ${crop.h}px;
        `}
      />
    ) : null;
  })()}
  ```

**Step 4: Connect Options Bar Actions & Canvas Resizing Inputs**
- Replace the Options Bar contextual group (around line 400-502) with conditional crop handlers:
  ```tsx
  {/* 2. CONTEXTUAL TOOL OPTIONS BAR */}
  <section class="toolbar flex items-center justify-between px-4 bg-studio-bg border-b border-studio-border h-10 text-[13px] text-text-secondary select-none" aria-label="Tool options bar">
    <div class="flex items-center gap-4">
      {/* Active Tool Group */}
      <div class="flex items-center gap-2 pr-4 h-[26px]">
        <Show when={activeTool() === "crop"} fallback={<PenTool size={15} class={activeTool() === "pen" ? "text-accent" : ""} />}>
          <Crop size={15} class="text-accent animate-pulse" />
        </Show>
        <span class="font-bold text-text-primary text-[11px] uppercase tracking-wider select-none">{activeTool()} tool</span>
      </div>
      
      <Show when={activeTool() === "crop"} fallback={
        <>
          {/* Divider */}
          <div class="h-4 border-r border-studio-border self-center"></div>

          {/* Fill Color Option */}
          <div class="flex items-center gap-2">
            <span class="text-text-muted text-[10px] font-bold uppercase select-none">Fill</span>
            <button class="h-[26px] bg-studio-input border border-studio-border hover:bg-studio-elevated rounded-md px-2.5 flex items-center gap-1.5 cursor-default transition-colors duration-75">
              <span class="w-2.5 h-2.5 rounded-[1px] bg-gradient-to-tr from-accent to-accent-hover border border-white/20 flex-shrink-0"></span>
              <span class="text-[12px] font-semibold text-text-primary">Photon Amber</span>
              <ChevronDown size={12} class="text-text-muted" />
            </button>
          </div>

          {/* Divider */}
          <div class="h-4 border-r border-studio-border self-center"></div>

          {/* Stroke Option with Spinners */}
          <div class="flex items-center gap-2">
            <div class="flex items-center bg-studio-input border border-studio-border rounded-md overflow-hidden h-[26px] focus-within:border-accent transition-colors duration-100">
              <span class="text-[10px] font-bold text-text-muted px-2.5 select-none border-r border-studio-border/50 h-full flex items-center bg-white/[1%]">STROKE</span>
              <input 
                type="text" 
                class="w-10 text-center text-[12px] font-semibold text-text-primary bg-transparent border-none outline-none tabular-nums px-1" 
                value={strokeWidth().toFixed(1)} 
                onInput={(e: any) => {
                  const val = parseFloat(e.currentTarget.value);
                  if (!isNaN(val)) setStrokeWidth(Math.max(0, val));
                }}
              />
              <span class="text-[10px] font-bold text-text-muted select-none pr-1.5 pointer-events-none">px</span>
              
              {/* Micro-Spinner step triggers */}
              <div class="w-4 h-full flex flex-col divide-y divide-studio-border border-l border-studio-border">
                <button 
                  onClick={() => setStrokeWidth(w => w + 0.5)}
                  class="flex-1 flex items-center justify-center hover:bg-white/10 hover:text-white transition-colors cursor-default text-[7px]"
                  title="Increase Stroke"
                >
                  ▲
                </button>
                <button 
                  onClick={() => setStrokeWidth(w => Math.max(0, w - 0.5))}
                  class="flex-1 flex items-center justify-center hover:bg-white/10 hover:text-white transition-colors cursor-default text-[7px]"
                  title="Decrease Stroke"
                >
                  ▼
                </button>
              </div>
            </div>
          </div>
        </>
      }>
        {/* Crop tool dynamic properties options */}
        <>
          <div class="h-4 border-r border-studio-border self-center"></div>
          
          <button 
            onClick={() => {
              const crop = cropOverlay();
              if (crop) {
                invoke("crop_canvas", { x: crop.x, y: crop.y, width: Math.round(crop.w), height: Math.round(crop.h) })
                  .then((res: any) => {
                    if (res?.ok) {
                      setCropStart({ x: 0, y: 0 });
                      setCropEnd({ x: 0, y: 0 });
                      syncDocumentState();
                      setActiveTool("move");
                    }
                  })
                  .catch(console.error);
              }
            }}
            disabled={!cropOverlay()}
            class={`h-[26px] px-3 bg-yellow-600 hover:bg-yellow-500 active:bg-yellow-700 text-white font-bold rounded-md flex items-center gap-1.5 transition-colors cursor-default ${!cropOverlay() ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            <span>APPLY CROP</span>
          </button>

          <button 
            onClick={() => {
              setCropStart({ x: 0, y: 0 });
              setCropEnd({ x: 0, y: 0 });
              setActiveTool("move");
            }}
            class="h-[26px] px-3 bg-studio-input border border-studio-border hover:bg-studio-elevated text-text-secondary font-bold rounded-md flex items-center gap-1.5 transition-colors cursor-default"
          >
            <span>CANCEL</span>
          </button>

          <div class="h-4 border-r border-studio-border self-center"></div>

          {/* Quick Resize controls inside Crop view */}
          <div class="flex items-center gap-2">
            <span class="text-text-muted text-[10px] font-bold uppercase select-none">Canvas size</span>
            <div class="flex items-center bg-studio-input border border-studio-border rounded-md overflow-hidden h-[26px] focus-within:border-accent">
              <span class="text-[10px] font-bold text-text-muted px-2 select-none border-r border-studio-border/50 h-full flex items-center bg-white/[1%]">W</span>
              <input 
                type="number"
                class="w-14 text-center text-[12px] font-semibold text-text-primary bg-transparent border-none outline-none px-1"
                value={docWidth()}
                onChange={(e: any) => {
                  const val = parseInt(e.currentTarget.value);
                  if (!isNaN(val) && val > 0) {
                    invoke("resize_canvas", { width: val, height: docHeight() })
                      .then((res: any) => { if (res?.ok) syncDocumentState(); })
                      .catch(console.error);
                  }
                }}
              />
              <span class="text-[10px] font-bold text-text-muted select-none border-l border-r border-studio-border/50 h-full flex items-center bg-white/[1%] px-2 ml-1">H</span>
              <input 
                type="number"
                class="w-14 text-center text-[12px] font-semibold text-text-primary bg-transparent border-none outline-none px-1"
                value={docHeight()}
                onChange={(e: any) => {
                  const val = parseInt(e.currentTarget.value);
                  if (!isNaN(val) && val > 0) {
                    invoke("resize_canvas", { width: docWidth(), height: val })
                      .then((res: any) => { if (res?.ok) syncDocumentState(); })
                      .catch(console.error);
                  }
                }}
              />
            </div>
          </div>
        </>
      </Show>
    </div>
  </section>
  ```

**Step 5: Add Keyboard shortcut bindings inside onMount**
- Inside the keydown shortcut listener block (around lines 177-181), map keys:
  ```typescript
      } else if (e.key.toLowerCase() === "c") {
        e.preventDefault();
        setActiveTool("crop");
  ```

**Step 6: Commit**
```bash
git add apps/desktop/src/App.tsx
git commit -m "feat(frontend): implement Crop Tool activation, drawing crop boundaries overlay, and crop/resize contextual toolbar actions"
```

---

### Task 5: [frontend] Enable properties grid coordinates input positioning in App.tsx

**Files:**
- Modify: [App.tsx](file:///d:/Project/image-studio/apps/desktop/src/App.tsx) (Update Properties panel X and Y input fields to support editable state)

**Step 1: Replace coordinates matrix elements**
- Find the Properties 2x2 Segmented Matrix Grid layout (around lines 702-724) and replace with dynamic writable coordinate bindings:
  ```tsx
  {/* 2x2 Segmented Matrix Grid */}
  {(() => {
    const selectedLayer = selectedLayerId() ? layers().find(l => l.id === selectedLayerId()) : null;
    return (
      <div class="border border-studio-border rounded-md overflow-hidden bg-studio-input grid grid-cols-2 grid-rows-2 divide-x divide-y divide-studio-border select-none focus-within:border-accent transition-colors duration-100">
        {/* X Cell */}
        <div class="flex items-center px-2.5 h-[28px] focus-within:bg-white/[2%] transition-colors duration-75">
          <span class="text-[10px] font-bold text-text-muted select-none w-3.5 flex-shrink-0">X</span>
          <input 
            type="number"
            class="w-full bg-transparent border-none outline-none text-white text-[12px] font-semibold text-left tabular-nums px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
            value={selectedLayer ? Math.round(selectedLayer.x) : 0} 
            disabled={!selectedLayer || selectedLayer.locked}
            onChange={(e: any) => {
              if (selectedLayer) {
                const val = parseFloat(e.currentTarget.value);
                if (!isNaN(val)) {
                  invoke("move_layer", { id: selectedLayer.id, x: val, y: selectedLayer.y })
                    .then((res: any) => { if (res?.ok) syncDocumentState(); })
                    .catch(console.error);
                }
              }
            }}
          />
        </div>
        {/* Y Cell */}
        <div class="flex items-center px-2.5 h-[28px] focus-within:bg-white/[2%] transition-colors duration-75">
          <span class="text-[10px] font-bold text-text-muted select-none w-3.5 flex-shrink-0">Y</span>
          <input 
            type="number"
            class="w-full bg-transparent border-none outline-none text-white text-[12px] font-semibold text-left tabular-nums px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
            value={selectedLayer ? Math.round(selectedLayer.y) : 0} 
            disabled={!selectedLayer || selectedLayer.locked}
            onChange={(e: any) => {
              if (selectedLayer) {
                const val = parseFloat(e.currentTarget.value);
                if (!isNaN(val)) {
                  invoke("move_layer", { id: selectedLayer.id, x: selectedLayer.x, y: val })
                    .then((res: any) => { if (res?.ok) syncDocumentState(); })
                    .catch(console.error);
                }
              }
            }}
          />
        </div>
        {/* W Cell */}
        <div class="flex items-center px-2.5 h-[28px] opacity-60">
          <span class="text-[10px] font-bold text-text-muted select-none w-3.5 flex-shrink-0">W</span>
          <input 
            type="number"
            class="w-full bg-transparent border-none outline-none text-white text-[12px] font-semibold text-left tabular-nums px-1" 
            value={selectedLayer ? selectedLayer.width : 0} 
            disabled
            readonly
          />
        </div>
        {/* H Cell */}
        <div class="flex items-center px-2.5 h-[28px] opacity-60">
          <span class="text-[10px] font-bold text-text-muted select-none w-3.5 flex-shrink-0">H</span>
          <input 
            type="number"
            class="w-full bg-transparent border-none outline-none text-white text-[12px] font-semibold text-left tabular-nums px-1" 
            value={selectedLayer ? selectedLayer.height : 0} 
            disabled
            readonly
          />
        </div>
      </div>
    );
  })()}
  ```

**Step 2: Commit**
```bash
git add apps/desktop/src/App.tsx
git commit -m "feat(frontend): bind Properties matrix inputs for dynamic layer X & Y coordinate nudge changes"
```

---

### Task 6: Verify and Build Release Bundle

**Files:**
- Test: Core tests and compilation sanity verification

**Step 1: Verify compilation & run tests**
- Run: `.\rtk.exe cargo test --workspace`
- Expected: All cargo workspace tests pass perfectly (25 tests).
- Run: `pnpm run build`
- Expected: High quality, warning-free SolidJS production bundle built inside `dist/`.

**Step 2: Verify in Tauri runtime**
- Run `pnpm tauri dev` to check that selection marquee, layer moves, coordinates properties, crop borders, and canvas resizing inputs respond smoothly and cleanly.

**Step 3: Commit**
```bash
git commit -am "chore(release): finalize Milestone 3 verification checks"
```
