# Brush and Eraser Engine Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Implement a high-performance raster Brush and Eraser engine inside photrez-core with sub-pixel interpolation, custom brush circle size preview, SolidJS lag-free overlay canvas preview, and smooth Options Bar integration for size, opacity, and hardness controls.

**Architecture:** Inject drawing and blending algorithms in `photrez-core` layers. Register the `draw_brush_stroke` command in Tauri shell main.rs. On the frontend, enable Left Rail Brush (B) and Eraser (E) buttons, map global shortcuts, render a hovering circle preview of the brush size, and overlay a hardware-accelerated 2D `<canvas>` element on top of the artboard to draw stroke previews locally with zero latency before committing the coordinates array to the Rust core database on mouse up.

**Tech Stack:** Rust, SolidJS, TypeScript, HTML5 Canvas 2D, Tailwind CSS v4, Lucide Icons.

---

### Task 1: [photrez-core] Implement Brush Stroke Drawing and Blending in brush.rs & layers.rs

**Files:**
- Modify: [brush.rs](file:///d:/Project/image-studio/crates/core/src/brush.rs) (Add `paint_pixel` alpha blending method)
- Modify: [layers.rs](file:///d:/Project/image-studio/crates/core/src/layers.rs) (Add `draw_brush_stroke` method for path sub-pixel rendering and eraser falloff)

**Step 1: Write the failing tests**
- Add testing cases inside `crates/core/src/layers.rs` tests module:
  ```rust
  #[test]
  fn test_brush_stroke_drawing() {
      let mut layer = Layer::new("l-1".to_string(), "Layer 1".to_string(), 10, 10);
      let settings = BrushSettings::new(2.0, 1.0, [1.0, 0.0, 0.0, 1.0]); // Fully red opaque
      
      // Paint single dot at center
      layer.draw_brush_stroke(&[(5.0, 5.0)], &settings, false);
      
      let idx = ((5 * 10 + 5) * 4) as usize;
      assert_eq!(layer.bitmap_ref.pixel_data[idx], 255); // Red
      assert_eq!(layer.bitmap_ref.pixel_data[idx+1], 0);   // Green
      assert_eq!(layer.bitmap_ref.pixel_data[idx+2], 0);   // Blue
      assert_eq!(layer.bitmap_ref.pixel_data[idx+3], 255); // Alpha
  }

  #[test]
  fn test_eraser_stroke_drawing() {
      let mut layer = Layer::new("l-1".to_string(), "Layer 1".to_string(), 10, 10);
      let settings = BrushSettings::new(2.0, 1.0, [0.0, 0.0, 0.0, 1.0]);
      
      // Erase center point
      layer.draw_brush_stroke(&[(5.0, 5.0)], &settings, true);
      
      let idx = ((5 * 10 + 5) * 4) as usize;
      assert_eq!(layer.bitmap_ref.pixel_data[idx+3], 0); // Erazed Alpha channel
  }
  ```

**Step 2: Run tests to verify compilation fails**
- Run: `.\rtk.exe cargo test --package photrez-core --lib -- layers::tests`
- Expected: Compilation error due to missing `draw_brush_stroke` method.

**Step 3: Implement minimal code to pass**
- Modify `crates/core/src/brush.rs` (lines 14-16) to add blending:
  ```rust
  impl BrushSettings {
      pub fn new(size: f32, hardness: f32, color: [f32; 4]) -> Self {
          Self { size, hardness, color }
      }

      pub fn paint_pixel(&self, pixel: &mut [u8], dist: f32) {
          let r = self.size / 2.0;
          let hardness_r = r * self.hardness;
          
          let alpha_factor = if dist <= hardness_r {
              1.0
          } else if dist < r {
              1.0 - (dist - hardness_r) / (r - hardness_r)
          } else {
              0.0
          };
          
          let brush_alpha = self.color[3] * alpha_factor;
          if brush_alpha <= 0.0 {
              return;
          }
          
          let src_r = (self.color[0] * 255.0) as u32;
          let src_g = (self.color[1] * 255.0) as u32;
          let src_b = (self.color[2] * 255.0) as u32;
          
          let dest_r = pixel[0] as u32;
          let dest_g = pixel[1] as u32;
          let dest_b = pixel[2] as u32;
          let dest_a = pixel[3] as u32;
          
          let out_r = ((src_r as f32 * brush_alpha) + (dest_r as f32 * (1.0 - brush_alpha))) as u8;
          let out_g = ((src_g as f32 * brush_alpha) + (dest_g as f32 * (1.0 - brush_alpha))) as u8;
          let out_b = ((src_b as f32 * brush_alpha) + (dest_b as f32 * (1.0 - brush_alpha))) as u8;
          let out_a = ((brush_alpha * 255.0) + (dest_a as f32 * (1.0 - brush_alpha))) as u8;
          
          pixel[0] = out_r;
          pixel[1] = out_g;
          pixel[2] = out_b;
          pixel[3] = out_a;
      }
  }
  ```
- Modify `crates/core/src/layers.rs` (lines 33-35) to append drawing logic:
  ```rust
  impl Layer {
      pub fn new(id: String, name: String, width: u32, height: u32) -> Self {
          let pixel_data = vec![255; (width * height * 4) as usize];
          Self {
              id,
              name,
              opacity: 1.0,
              visible: true,
              locked: false,
              blend_mode: "normal".to_string(),
              x: 0.0,
              y: 0.0,
              width,
              height,
              bitmap_ref: BitmapData {
                  width,
                  height,
                  format: PixelFormat::RGBA8,
                  pixel_data,
              },
              transform: Transform::new(),
          }
      }

      pub fn draw_brush_stroke(&mut self, path: &[(f32, f32)], settings: &super::brush::BrushSettings, is_eraser: bool) {
          if path.is_empty() || self.locked {
              return;
          }
          
          let w = self.width as i32;
          let h = self.height as i32;
          let r = settings.size / 2.0;
          
          let mut paint_point = |cx: f32, cy: f32| {
              let x_start = ((cx - r).floor() as i32).max(0).min(w - 1);
              let x_end = ((cx + r).ceil() as i32).max(0).min(w - 1);
              let y_start = ((cy - r).floor() as i32).max(0).min(h - 1);
              let y_end = ((cy + r).ceil() as i32).max(0).min(h - 1);
              
              for py in y_start..=y_end {
                  for px in x_start..=x_end {
                      let dx = px as f32 - cx;
                      let dy = py as f32 - cy;
                      let dist = (dx * dx + dy * dy).sqrt();
                      if dist <= r {
                          let idx = ((py * w + px) * 4) as usize;
                          let pixel = &mut self.bitmap_ref.pixel_data[idx..idx+4];
                          
                          if is_eraser {
                              let hardness_r = r * settings.hardness;
                              let alpha_factor = if dist <= hardness_r {
                                  1.0
                              } else {
                                  1.0 - (dist - hardness_r) / (r - hardness_r)
                              };
                              let erase_amount = settings.color[3] * alpha_factor;
                              let dest_a = pixel[3] as f32;
                              pixel[3] = (dest_a * (1.0 - erase_amount)) as u8;
                          } else {
                              settings.paint_pixel(pixel, dist);
                          }
                      }
                  }
              }
          };
          
          let (mut x0, mut y0) = path[0];
          paint_point(x0, y0);
          
          for &(x1, y1) in path.iter().skip(1) {
              let dx = x1 - x0;
              let dy = y1 - y0;
              let len = (dx * dx + dy * dy).sqrt();
              let steps = (len / (settings.size * 0.1)).ceil() as u32;
              
              if steps > 1 {
                  for step in 1..=steps {
                      let t = step as f32 / steps as f32;
                      let cx = x0 + dx * t;
                      let cy = y0 + dy * t;
                      paint_point(cx, cy);
                  }
              } else {
                  paint_point(x1, y1);
              }
              x0 = x1;
              y0 = y1;
          }
      }
  }
  ```

**Step 4: Run tests to verify they pass**
- Run: `.\rtk.exe cargo test --package photrez-core --lib -- layers::tests`
- Expected: PASS

**Step 5: Commit**
```bash
git add crates/core/src/brush.rs crates/core/src/layers.rs
git commit -m "feat(core): implement raster brush & eraser stroke blending and drawing algorithms with tests"
```

---

### Task 2: [desktop-shell] Register draw_brush_stroke Command in main.rs

**Files:**
- Modify: [main.rs](file:///d:/Project/image-studio/apps/desktop/src-tauri/src/main.rs) (Add `draw_brush_stroke` Tauri command, add to supported_commands list and Builder invoke handlers)

**Step 1: Implement draw_brush_stroke command**
- In `apps/desktop/src-tauri/src/main.rs` (before `redo` handler), add:
  ```rust
  #[tauri::command]
  fn draw_brush_stroke(
      layer_id: String,
      path: Vec<(f32, f32)>,
      size: f32,
      hardness: f32,
      color: [f32; 4],
      is_eraser: bool,
      state: tauri::State<'_, EditorState>,
  ) -> Result<Value, Value> {
      if path.is_empty() {
          return err_response("E_VALIDATION", "Stroke path cannot be empty");
      }

      let mut doc = state.document.lock().unwrap();
      let mut history = state.history.lock().unwrap();
      history.commit((*doc).clone());

      let settings = photrez_core::brush::BrushSettings::new(size, hardness, color);
      
      if let Some(layer) = doc.layers.iter_mut().find(|l| l.id == layer_id) {
          layer.draw_brush_stroke(&path, &settings, is_eraser);
          ok_response(&*doc)
      } else {
          err_response("LAYER_NOT_FOUND", "Layer not found")
      }
  }
  ```
- Add the command to `supported_commands` list in `get_contract_info` (around line 103):
  ```rust
            "resize_canvas",
            "draw_brush_stroke"
  ```
- Register the handler in `tauri::generate_handler!` inside `main()`:
  ```rust
              crop_canvas,
              resize_canvas,
              draw_brush_stroke
  ```

**Step 2: Verify compilation**
- Run: `.\rtk.exe cargo check -p photrez-core`
- Expected: PASS

**Step 3: Commit**
```bash
git add apps/desktop/src-tauri/src/main.rs
git commit -m "feat(shell): register draw_brush_stroke Tauri command handler"
```

---

### Task 3: [frontend] Enable Left Rail buttons, Shortcut mapping, and Options Bar parameters

**Files:**
- Modify: [App.tsx](file:///d:/Project/image-studio/apps/desktop/src/App.tsx) (Enable Left Rail Brush & Eraser, wire up keyboard shortcuts, bind opacity & hardness spinners)

**Step 1: Enable Left Rail Brush & Eraser buttons**
- Find the Brush and Eraser button blocks in the Left Tool Rail (around line 555-570) and update them:
  ```tsx
  <button 
    onClick={() => handleToolChange("brush")}
    class={`tool-btn-raw sub-hint ${activeTool() === "brush" ? "active" : ""}`} 
    title="Brush Tool (B)"
  >
    <Brush size={18} />
  </button>

  <button 
    onClick={() => handleToolChange("eraser")}
    class={`tool-btn-raw ${activeTool() === "eraser" ? "active" : ""}`} 
    title="Eraser Tool (E)"
  >
    <Eraser size={18} />
  </button>
  ```

**Step 2: Map shortcuts 'B' and 'E' inside the keydown listener**
- Around the tool key triggers inside `onMount` shortcut block:
  ```typescript
      } else if (e.key.toLowerCase() === "b") {
        e.preventDefault();
        setActiveTool("brush");
      } else if (e.key.toLowerCase() === "e") {
        e.preventDefault();
        setActiveTool("eraser");
  ```

**Step 3: Bind stroke properties in Options Bar**
- Expand Option Bar properties grid signals inside the top component for `brushHardness` and `brushOpacity`:
  ```typescript
  const [brushHardness, setBrushHardness] = createSignal(0.8);
  const [brushOpacity, setBrushOpacity] = createSignal(1.0);
  ```
- Replace the contextual Options Bar divider & Stroke styling elements with interactive Brush inputs when tool is `"brush"` or `"eraser"`:
  ```tsx
  <Show when={activeTool() === "brush" || activeTool() === "eraser"}>
    <div class="h-4 border-r border-studio-border self-center"></div>

    {/* Brush Hardness option */}
    <div class="flex items-center gap-2">
      <div class="flex items-center bg-studio-input border border-studio-border rounded-md overflow-hidden h-[26px] focus-within:border-accent">
        <span class="text-[10px] font-bold text-text-muted px-2.5 select-none border-r border-studio-border/50 h-full flex items-center bg-white/[1%]">HARDNESS</span>
        <input 
          type="number"
          step="0.1" min="0" max="1"
          class="w-10 text-center text-[12px] font-semibold text-text-primary bg-transparent border-none outline-none px-1"
          value={brushHardness()}
          onChange={(e: any) => setBrushHardness(Math.max(0.0, Math.min(1.0, parseFloat(e.currentTarget.value) || 0.8)))}
        />
      </div>
    </div>

    <div class="h-4 border-r border-studio-border self-center"></div>

    {/* Brush Opacity option */}
    <div class="flex items-center gap-2">
      <div class="flex items-center bg-studio-input border border-studio-border rounded-md overflow-hidden h-[26px] focus-within:border-accent">
        <span class="text-[10px] font-bold text-text-muted px-2.5 select-none border-r border-studio-border/50 h-full flex items-center bg-white/[1%]">OPACITY</span>
        <input 
          type="number"
          step="0.1" min="0" max="1"
          class="w-10 text-center text-[12px] font-semibold text-text-primary bg-transparent border-none outline-none px-1"
          value={brushOpacity()}
          onChange={(e: any) => setBrushOpacity(Math.max(0.0, Math.min(1.0, parseFloat(e.currentTarget.value) || 1.0)))}
        />
      </div>
    </div>
  </Show>
  ```

**Step 4: Commit**
```bash
git add apps/desktop/src/App.tsx
git commit -m "feat(frontend): enable Brush and Eraser toolbar triggers, shortcut bindings, and contextual Options Bar settings"
```

---

### Task 4: [frontend] Implement zero-latency `<canvas>` stroke drawing overlay and cursor preview

**Files:**
- Modify: [App.tsx](file:///d:/Project/image-studio/apps/desktop/src/App.tsx) (Implement overlay canvas triggers and brush cursor preview)

**Step 1: Inject Brush overlay canvas and state**
- Add path coordinates array signal and hovering brush position tracker:
  ```typescript
  const [strokePoints, setStrokePoints] = createSignal<{x: number, y: number}[]>([]);
  const [isDrawingStroke, setIsDrawingStroke] = createSignal(false);
  const [canvasHoverPos, setCanvasHoverPos] = createSignal({ x: -999, y: -999 });
  let strokeCanvasRef: HTMLCanvasElement | undefined;
  ```
- Implement path drawing function for standard 2D canvas overlay:
  ```typescript
  const drawStrokeSegment = (x: number, y: number) => {
    const canvas = strokeCanvasRef;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = activeTool() === "eraser" ? "rgba(22,22,24,0.7)" : fgColor();
    ctx.lineWidth = strokeWidth();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.lineTo(x, y);
    ctx.stroke();
  };
  ```

**Step 2: Update Artboard pointer triggers to support painting**
- Modify `handleArtboardMouseDown`, `handleArtboardMouseMove`, and `handleArtboardMouseUp` to start and accumulate painting paths locally on the Canvas overlay, and commit to Tauri backend on up:
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
    } else if ((activeTool() === "brush" || activeTool() === "eraser") && selectedLayerId()) {
      const layer = layers().find(l => l.id === selectedLayerId());
      if (layer && !layer.locked && layer.visible) {
        setIsDrawingStroke(true);
        // Translate coords relative to layer coordinates space
        const lx = coords.x - layer.x;
        const ly = coords.y - layer.y;
        setStrokePoints([{ x: lx, y: ly }]);

        const canvas = strokeCanvasRef;
        if (canvas) {
          const ctx = canvas.getContext("2d");
          ctx?.clearRect(0, 0, canvas.width, canvas.height);
          ctx?.beginPath();
          ctx?.moveTo(coords.x, coords.y);
        }
      }
    }
  };

  const handleArtboardMouseMove = (e: MouseEvent) => {
    const coords = getArtboardCoords(e.clientX, e.clientY);
    setCanvasHoverPos({ x: coords.x, y: coords.y });

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
    } else if (isDrawingStroke() && selectedLayerId()) {
      const layer = layers().find(l => l.id === selectedLayerId());
      if (layer) {
        const lx = coords.x - layer.x;
        const ly = coords.y - layer.y;
        setStrokePoints(pts => [...pts, { x: lx, y: ly }]);
        drawStrokeSegment(coords.x, coords.y);
      }
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
    } else if (isDrawingStroke() && selectedLayerId()) {
      setIsDrawingStroke(false);
      
      const pts = strokePoints();
      if (pts.length > 0) {
        const hex = fgColor();
        const r = parseInt(hex.slice(1, 3), 16) / 255.0;
        const g = parseInt(hex.slice(3, 5), 16) / 255.0;
        const b = parseInt(hex.slice(5, 7), 16) / 255.0;
        
        const path_args = pts.map(p => [p.x, p.y]);
        
        invoke("draw_brush_stroke", {
          layerId: selectedLayerId(),
          path: path_args,
          size: strokeWidth(),
          hardness: brushHardness(),
          color: [r, g, b, brushOpacity()],
          isEraser: activeTool() === "eraser",
        })
        .then((res: any) => { if (res?.ok) syncDocumentState(); })
        .catch(console.error)
        .finally(() => {
          const canvas = strokeCanvasRef;
          const ctx = canvas?.getContext("2d");
          ctx?.clearRect(0, 0, canvas?.width || 0, canvas?.height || 0);
        });
      }
    }
    setIsDraggingLayer(false);
  };
  ```

**Step 3: Render zero-latency `<canvas>` overlay and Hover Brush Cursor size circle**
- Inside the `<div class="artboard ...">` element (around the other overlays), append:
  ```tsx
  {/* ── Zero-Latency Overlay Canvas for Brush Strokes dragging preview ── */}
  <canvas 
    ref={strokeCanvasRef}
    width={docWidth()}
    height={docHeight()}
    class="absolute inset-0 pointer-events-none z-[10002]"
  />

  {/* ── Brush / Eraser Circular Preview Cursor ── */}
  <Show when={(activeTool() === "brush" || activeTool() === "eraser") && canvasHoverPos().x >= 0 && canvasHoverPos().x <= docWidth() && canvasHoverPos().y >= 0 && canvasHoverPos().y <= docHeight()}>
    <div 
      class="absolute bg-transparent border border-accent/80 rounded-full pointer-events-none z-[10003] -translate-x-1/2 -translate-y-1/2"
      style={`
        left: ${canvasHoverPos().x}px;
        top: ${canvasHoverPos().y}px;
        width: ${strokeWidth()}px;
        height: ${strokeWidth()}px;
      `}
    />
  </Show>
  ```

**Step 4: Commit**
```bash
git add apps/desktop/src/App.tsx
git commit -m "feat(frontend): implement HTML5 Canvas zero-latency drawing stroke overlay and dynamic hover brush cursor size preview"
```

---

### Task 5: Verify and Compile Production bundle

**Files:**
- Test: Full cargo tests and package builder verification

**Step 1: Verify Core and shell backend compilation**
- Run: `.\rtk.exe cargo test --workspace`
- Expected: All Rust workspace tests pass cleanly.

**Step 2: Verify SolidJS frontend build**
- Run: `pnpm run build`
- Expected: Warning-free Vite production compilation successful.

**Step 3: Commit**
```bash
git commit -am "chore(release): verify and finalize Milestone 4 Brush & Eraser engine integration checks"
```
