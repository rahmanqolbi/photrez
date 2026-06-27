# Export and Color Selection Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Implement a professional-grade layered flattening compositor and raster image export pipeline (supporting PNG, JPEG, and WebP formats) in Rust Core, and wire up interactive color selection via a canvas Eyedropper sampling tool and dual swatches OS native color pickers in the SolidJS frontend.

**Architecture:** Integrate the `image` crate in Rust core for file format encoding, and implement bottom-to-top alpha compositing layer-flattening algorithms inside export.rs. Introduce the `rfd` crate in the desktop-shell Tauri backend to handle completely native, secure file dialogs on a separate worker thread. On the frontend, enable the Left Rail Eyedropper tool (Hotkey I) to call the Tauri `sample_pixel` composite color-sampling endpoint, and overlay invisible native `<input type="color">` pickers over the Foreground/Background swatches to support instant custom color modifications.

**Tech Stack:** Rust, SolidJS, TypeScript, Tailwind CSS v4, `image` crate (encoding), `rfd` crate (native OS file dialogs).

---

### Task 1: [photrez-core] Add image Crate and Implement Layer Compositor Flattening & Encoder in export.rs

**Files:**
- Modify: `crates/core/Cargo.toml` (Add `image` dependency)
- Modify: `crates/core/src/export.rs` (Implement `flatten_document` and `export_document` methods)

**Step 1: Write the failing tests**
- Replace `crates/core/src/export.rs` tests module with comprehensive compositing and format encoding tests:
  ```rust
  #[cfg(test)]
  mod tests {
      use super::*;
      use crate::document::Document;
      use crate::layers::Layer;

      #[test]
      fn test_document_flattening() {
          let mut doc = Document::new("doc-1".to_string(), 2, 2);
          
          // Layer 1: Red background [255, 0, 0, 255]
          let mut l1 = Layer::new("l-1".to_string(), "Layer 1".to_string(), 2, 2);
          l1.bitmap_ref.pixel_data = vec![
              255, 0, 0, 255,   255, 0, 0, 255,
              255, 0, 0, 255,   255, 0, 0, 255,
          ];
          
          // Layer 2: Semitransparent Blue overlay [0, 0, 255, 128]
          let mut l2 = Layer::new("l-2".to_string(), "Layer 2".to_string(), 2, 2);
          l2.bitmap_ref.pixel_data = vec![
              0, 0, 255, 128,   0, 0, 255, 128,
              0, 0, 255, 128,   0, 0, 255, 128,
          ];
          
          doc.add_layer(l1); // added at top visually (since add_layer inserts at 0, top of stack)
          // Wait, add_layer inserts at 0. So let's reorder or stack them so l1 is below l2.
          // In photrez convention: layers is sorted index-0 (top) to index-N (bottom).
          // So we place l2 at index 0 (top), l1 at index 1 (bottom):
          doc.layers = vec![l2, l1];
          
          let flattened = flatten_document(&doc);
          
          // Expected blended color (standard Porter-Duff alpha compositing):
          // out_a = 0.5 + 1.0 * 0.5 = 1.0
          // out_r = (0.0 * 0.5 + 255.0 * 1.0 * 0.5) / 1.0 = 127.5 => ~128
          // out_b = (255.0 * 0.5 + 0.0 * 1.0 * 0.5) / 1.0 = 127.5 => ~128
          assert!(flattened[0] >= 127 && flattened[0] <= 128); // Red
          assert_eq!(flattened[1], 0);                         // Green
          assert!(flattened[2] >= 127 && flattened[2] <= 128); // Blue
          assert_eq!(flattened[3], 255);                       // Alpha
      }

      #[test]
      fn test_image_export_encoding() {
          let mut doc = Document::new("doc-1".to_string(), 2, 2);
          let mut l1 = Layer::new("l-1".to_string(), "Layer 1".to_string(), 2, 2);
          l1.bitmap_ref.pixel_data = vec![
              255, 0, 0, 255,   255, 0, 0, 255,
              255, 0, 0, 255,   255, 0, 0, 255,
          ];
          doc.add_layer(l1);

          let settings_png = ExportSettings::new(ExportFormat::PNG, 100);
          let png_bytes = export_document(&doc, &settings_png).unwrap();
          // PNG magic header check
          assert_eq!(&png_bytes[0..4], &[0x89, 0x50, 0x4E, 0x47]);

          let settings_jpeg = ExportSettings::new(ExportFormat::JPEG, 85);
          let jpeg_bytes = export_document(&doc, &settings_jpeg).unwrap();
          // JPEG magic header check
          assert_eq!(&jpeg_bytes[0..2], &[0xFF, 0xD8]);
      }
  }
  ```

**Step 2: Run tests to verify compilation fails**
- Run: `.\rtk.exe cargo test --package photrez-core --lib -- export::tests`
- Expected: Compilation error due to missing `image` crate and unimplemented `export_document`/`flatten_document` helper functions.

**Step 3: Implement minimal code to pass**
- Modify `crates/core/Cargo.toml` to inject `image` dependency:
  ```toml
  [dependencies]
  serde = { version = "1.0", features = ["derive"] }
  serde_json = "1.0"
  image = { version = "0.25", default-features = false, features = ["png", "jpeg", "webp"] }
  ```
- Modify `crates/core/src/export.rs` to implement compositing and image encoding:
  ```rust
  use serde::{Deserialize, Serialize};
  use crate::document::Document;
  use std::io::Cursor;

  #[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
  pub enum ExportFormat {
      PNG,
      JPEG,
      WebP,
  }

  #[derive(Debug, Clone, Serialize, Deserialize)]
  pub struct ExportSettings {
      pub format: ExportFormat,
      pub quality: u8, // 1 to 100
  }

  impl ExportSettings {
      pub fn new(format: ExportFormat, quality: u8) -> Self {
          Self { format, quality }
      }
  }

  pub fn flatten_document(doc: &Document) -> Vec<u8> {
      let w = doc.width as i32;
      let h = doc.height as i32;
      let mut flattened = vec![0u8; (doc.width * doc.height * 4) as usize];

      // Reverse stack order: composite from bottom layer to top layer
      for layer in doc.layers.iter().rev() {
          if !layer.visible {
              continue;
          }

          let lx_offset = layer.x as i32;
          let ly_offset = layer.y as i32;
          let lw = layer.width as i32;
          let lh = layer.height as i32;
          let layer_opacity = layer.opacity;

          for py in 0..lh {
              let doc_y = ly_offset + py;
              if doc_y < 0 || doc_y >= h {
                  continue;
              }

              for px in 0..lw {
                  let doc_x = lx_offset + px;
                  if doc_x < 0 || doc_x >= w {
                      continue;
                  }

                  let layer_idx = ((py * lw + px) * 4) as usize;
                  let doc_idx = ((doc_y * w + doc_x) * 4) as usize;

                  let src_r = layer.bitmap_ref.pixel_data[layer_idx] as f32 / 255.0;
                  let src_g = layer.bitmap_ref.pixel_data[layer_idx + 1] as f32 / 255.0;
                  let src_b = layer.bitmap_ref.pixel_data[layer_idx + 2] as f32 / 255.0;
                  let src_a = layer.bitmap_ref.pixel_data[layer_idx + 3] as f32 / 255.0 * layer_opacity;

                  if src_a <= 0.0 {
                      continue;
                  }

                  let dest_r = flattened[doc_idx] as f32 / 255.0;
                  let dest_g = flattened[doc_idx + 1] as f32 / 255.0;
                  let dest_b = flattened[doc_idx + 2] as f32 / 255.0;
                  let dest_a = flattened[doc_idx + 3] as f32 / 255.0;

                  // Porter-Duff alpha compositing
                  let out_a = src_a + dest_a * (1.0 - src_a);
                  let out_r = if out_a > 0.0 {
                      (src_r * src_a + dest_r * dest_a * (1.0 - src_a)) / out_a
                  } else {
                      0.0
                  };
                  let out_g = if out_a > 0.0 {
                      (src_g * src_a + dest_g * dest_a * (1.0 - src_a)) / out_a
                  } else {
                      0.0
                  };
                  let out_b = if out_a > 0.0 {
                      (src_b * src_a + dest_b * dest_a * (1.0 - src_a)) / out_a
                  } else {
                      0.0
                  };

                  flattened[doc_idx] = (out_r * 255.0).round().min(255.0) as u8;
                  flattened[doc_idx + 1] = (out_g * 255.0).round().min(255.0) as u8;
                  flattened[doc_idx + 2] = (out_b * 255.0).round().min(255.0) as u8;
                  flattened[doc_idx + 3] = (out_a * 255.0).round().min(255.0) as u8;
              }
          }
      }
      flattened
  }

  pub fn export_document(doc: &Document, settings: &ExportSettings) -> Result<Vec<u8>, String> {
      let mut flattened = flatten_document(doc);

      // Composite JPEGs on white solid background
      if let ExportFormat::JPEG = settings.format {
          for i in (0..flattened.len()).step_by(4) {
              let r = flattened[i] as f32 / 255.0;
              let g = flattened[i + 1] as f32 / 255.0;
              let b = flattened[i + 2] as f32 / 255.0;
              let a = flattened[i + 3] as f32 / 255.0;

              let out_r = r * a + 1.0 * (1.0 - a);
              let out_g = g * a + 1.0 * (1.0 - a);
              let out_b = b * a + 1.0 * (1.0 - a);

              flattened[i] = (out_r * 255.0).round().min(255.0) as u8;
              flattened[i + 1] = (out_g * 255.0).round().min(255.0) as u8;
              flattened[i + 2] = (out_b * 255.0).round().min(255.0) as u8;
              flattened[i + 3] = 255;
          }
      }

      let mut encoded_bytes = Vec::new();
      let writer = Cursor::new(&mut encoded_bytes);
      
      let img_buffer = image::ImageBuffer::<image::Rgba<u8>, _>::from_raw(doc.width, doc.height, flattened)
          .ok_or_else(|| "Failed to create ImageBuffer from flattened pixel vector".to_string())?;

      match settings.format {
          ExportFormat::PNG => {
              img_buffer.write_to(&mut Cursor::new(&mut encoded_bytes), image::ImageFormat::Png)
                  .map_err(|e| format!("Failed to encode PNG: {}", e))?;
          }
          ExportFormat::JPEG => {
              // Convert to RGB first for standard JPEGs
              let rgb_buffer = image::ImageBuffer::<image::Rgb<u8>, _>::from_raw(
                  doc.width, doc.height, 
                  img_buffer.pixels().flat_map(|p| [p[0], p[1], p[2]]).collect::<Vec<u8>>()
              ).ok_or_else(|| "Failed to create RGB buffer".to_string())?;

              let quality = settings.quality.clamp(1, 100);
              let mut encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(
                  &mut Cursor::new(&mut encoded_bytes), quality
              );
              encoder.encode_image(&rgb_buffer)
                  .map_err(|e| format!("Failed to encode JPEG: {}", e))?;
          }
          ExportFormat::WebP => {
              img_buffer.write_to(&mut Cursor::new(&mut encoded_bytes), image::ImageFormat::WebP)
                  .map_err(|e| format!("Failed to encode WebP: {}", e))?;
          }
      }

      Ok(encoded_bytes)
  }
  ```

**Step 4: Run tests to verify they pass**
- Run: `.\rtk.exe cargo test --package photrez-core --lib -- export::tests`
- Expected: PASS

**Step 5: Commit**
```bash
git add crates/core/Cargo.toml crates/core/src/export.rs
git commit -m "feat(core): implement document layered compositing and format encoding under export.rs with tests"
```

---

### Task 2: [desktop-shell] Add rfd and Register export_document Command in main.rs

**Files:**
- Modify: `apps/desktop/src-tauri/Cargo.toml` (Add `rfd` crate)
- Modify: `apps/desktop/src-tauri/src/main.rs` (Implement `export_document` command calling `rfd` and core `export_document`)

**Step 1: Implement export_document command**
- Modify `apps/desktop/src-tauri/Cargo.toml` to append dependency:
  ```toml
  [dependencies]
  rfd = "0.15"
  ```
- Modify `apps/desktop/src-tauri/src/main.rs` (before `redo` command), add:
  ```rust
  #[tauri::command]
  fn export_document(
      format: String,
      quality: u8,
      state: tauri::State<'_, EditorState>,
  ) -> Result<Value, Value> {
      let doc = state.document.lock().unwrap();

      let core_format = match format.to_uppercase().as_str() {
          "PNG" => photrez_core::export::ExportFormat::PNG,
          "JPEG" | "JPG" => photrez_core::export::ExportFormat::JPEG,
          "WEBP" => photrez_core::export::ExportFormat::WebP,
          _ => return err_response("E_VALIDATION", "Unsupported export format"),
      };

      let settings = photrez_core::export::ExportSettings::new(core_format, quality);
      let encoded_bytes = match photrez_core::export::export_document(&*doc, &settings) {
          Ok(bytes) => bytes,
          Err(e) => return err_response("E_ENCODING", &e),
      };

      // Invoke RFD native save file dialog in a worker thread
      let default_name = format!("untitled.{}", format.to_lowercase());
      let dialog = rfd::FileDialog::new()
          .set_file_name(&default_name)
          .add_filter(&format, &[&format.to_lowercase()])
          .save_file();

      if let Some(path) = dialog {
          if let Err(e) = std::fs::write(&path, encoded_bytes) {
              err_response("E_IO", &format!("Failed to write file to disk: {}", e))
          } else {
              ok_response(serde_json::json!({
                  "status": "success",
                  "path": path.to_string_lossy()
              }))
          }
      } else {
          err_response("E_CANCEL", "Export cancelled by user")
      }
  }
  ```
- Add command to contract supported commands list and builder register array:
  ```rust
            "resize_canvas",
            "draw_brush_stroke",
            "export_document"
  ```
  And:
  ```rust
              crop_canvas,
              resize_canvas,
              draw_brush_stroke,
              export_document
  ```

**Step 2: Verify compilation**
- Run: `.\rtk.exe cargo check -p photrez-desktop`
- Expected: PASS

**Step 3: Commit**
```bash
git add apps/desktop/src-tauri/Cargo.toml apps/desktop/src-tauri/src/main.rs
git commit -m "feat(shell): integrate rfd crate and implement export_document command with native save file dialog"
```

---

### Task 3: [photrez-core] Implement sample_pixel composite color sampling in document.rs

**Files:**
- Modify: `crates/core/src/document.rs` (Add `sample_pixel` sampling algorithm)

**Step 1: Write the failing test**
- Add inside `crates/core/src/document.rs` tests module:
  ```rust
  #[test]
  fn test_sample_pixel() {
      let mut doc = Document::new("doc-1".to_string(), 2, 2);
      
      let mut l1 = Layer::new("l-1".to_string(), "Layer 1".to_string(), 2, 2);
      l1.bitmap_ref.pixel_data = vec![
          255, 0, 0, 255,   255, 0, 0, 255,
          255, 0, 0, 255,   255, 0, 0, 255,
      ];
      doc.add_layer(l1);
      
      let color = doc.sample_pixel(1.0, 1.0);
      assert_eq!(color, [255, 0, 0, 255]); // Sampled Red Background color
  }
  ```

**Step 2: Run tests to verify compilation fails**
- Run: `.\rtk.exe cargo test --package photrez-core --lib -- document::tests`
- Expected: FAIL with missing method `sample_pixel` on Document.

**Step 3: Implement minimal code to pass**
- Add `sample_pixel` implementation inside `crates/core/src/document.rs`:
  ```rust
  impl Document {
      // ... previous methods

      pub fn sample_pixel(&self, x: f32, y: f32) -> [u8; 4] {
          let ix = x.floor() as i32;
          let iy = y.floor() as i32;
          
          if ix < 0 || ix >= self.width as i32 || iy < 0 || iy >= self.height as i32 {
              return [0, 0, 0, 0]; // Transparent black out of bounds
          }
          
          let mut blended = [0f32; 4];
          
          // Reverse order: blend bottom (N-1) to top (0)
          for layer in self.layers.iter().rev() {
              if !layer.visible {
                  continue;
              }
              
              let lx = ix - layer.x as i32;
              let ly = iy - layer.y as i32;
              
              if lx >= 0 && lx < layer.width as i32 && ly >= 0 && ly < layer.height as i32 {
                  let idx = ((ly * layer.width as i32 + lx) * 4) as usize;
                  let src_r = layer.bitmap_ref.pixel_data[idx] as f32 / 255.0;
                  let src_g = layer.bitmap_ref.pixel_data[idx + 1] as f32 / 255.0;
                  let src_b = layer.bitmap_ref.pixel_data[idx + 2] as f32 / 255.0;
                  let src_a = layer.bitmap_ref.pixel_data[idx + 3] as f32 / 255.0 * layer.opacity;
                  
                  if src_a <= 0.0 {
                      continue;
                  }
                  
                  let dest_r = blended[0];
                  let dest_g = blended[1];
                  let dest_b = blended[2];
                  let dest_a = blended[3];
                  
                  let out_a = src_a + dest_a * (1.0 - src_a);
                  let out_r = if out_a > 0.0 {
                      (src_r * src_a + dest_r * dest_a * (1.0 - src_a)) / out_a
                  } else {
                      0.0
                  };
                  let out_g = if out_a > 0.0 {
                      (src_g * src_a + dest_g * dest_a * (1.0 - src_a)) / out_a
                  } else {
                      0.0
                  };
                  let out_b = if out_a > 0.0 {
                      (src_b * src_a + dest_b * dest_a * (1.0 - src_a)) / out_a
                  } else {
                      0.0
                  };
                  
                  blended = [out_r, out_g, out_b, out_a];
              }
          }
          
          [
              (blended[0] * 255.0).round().min(255.0) as u8,
              (blended[1] * 255.0).round().min(255.0) as u8,
              (blended[2] * 255.0).round().min(255.0) as u8,
              (blended[3] * 255.0).round().min(255.0) as u8,
          ]
      }
  }
  ```

**Step 4: Run tests to verify they pass**
- Run: `.\rtk.exe cargo test --package photrez-core --lib -- document::tests`
- Expected: PASS

**Step 5: Commit**
```bash
git add crates/core/src/document.rs
git commit -m "feat(core): implement sample_pixel on Document to support composite color sampling with tests"
```

---

### Task 4: [desktop-shell] Register sample_pixel Command in main.rs

**Files:**
- Modify: `apps/desktop/src-tauri/src/main.rs` (Add `sample_pixel` Tauri command, register to builders)

**Step 1: Register sample_pixel command**
- In `apps/desktop/src-tauri/src/main.rs` (before `main()` function), add:
  ```rust
  #[tauri::command]
  fn sample_pixel(
      x: f32,
      y: f32,
      state: tauri::State<'_, EditorState>,
  ) -> Result<Value, Value> {
      let doc = state.document.lock().unwrap();
      let color = doc.sample_pixel(x, y);
      ok_response(color)
  }
  ```
- Register the command in `supported_commands` list in `get_contract_info`:
  ```rust
            "export_document",
            "sample_pixel"
  ```
- Register the handler in `tauri::generate_handler!` inside `main()`:
  ```rust
              export_document,
              sample_pixel
  ```

**Step 2: Verify compilation**
- Run: `.\rtk.exe cargo check -p photrez-desktop`
- Expected: PASS

**Step 3: Commit**
```bash
git add apps/desktop/src-tauri/src/main.rs
git commit -m "feat(shell): register sample_pixel Tauri command handler"
```

---

### Task 5: [frontend] Eyedropper Tool & Option Bar color sampling in App.tsx

**Files:**
- Modify: `apps/desktop/src/App.tsx` (Enable Left Rail Eyedropper, bind shortcut I, implement artboard pointer drag color sampling)

**Step 1: Enable Left Rail Eyedropper button**
- Find the brush button block in Left Rail and insert the Eyedropper right next to it:
  ```tsx
  <button 
    onClick={() => handleToolChange("eyedropper")}
    class={`tool-btn-raw ${activeTool() === "eyedropper" ? "active" : ""}`} 
    title="Eyedropper Tool (I)"
  >
    {/* SVG Pipette Icon */}
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="m2 22 1-1c1.5-1.5 1.5-4 .5-5.5L14 5l4 4-10.5 10.5c-1.5-1-4-1-5.5.5Z" />
      <path d="M14 5 19 2l3 3-3 5-5-5Z" />
    </svg>
  </button>
  ```

**Step 2: Map shortcut key 'I' inside the keydown listener**
- Add trigger inside `onMount` shortcut block:
  ```typescript
      } else if (e.key.toLowerCase() === "i") {
        e.preventDefault();
        setActiveTool("eyedropper");
  ```

**Step 3: Update Option Bar tool icon switch**
- Add Eyedropper custom icon into the `Switch` tag:
  ```tsx
  <Match when={activeTool() === "eyedropper"}>
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-accent">
      <path d="m2 22 1-1c1.5-1.5 1.5-4 .5-5.5L14 5l4 4-10.5 10.5c-1.5-1-4-1-5.5.5Z" /><path d="M14 5 19 2l3 3-3 5-5-5Z" />
    </svg>
  </Match>
  ```

**Step 4: Update Artboard Pointer down & move triggers to sample colors**
- Create dynamic color sampling helper:
  ```typescript
  const handleSampleColor = (cx: number, cy: number) => {
    invoke("sample_pixel", { x: cx, y: cy })
      .then((res: any) => {
        if (res && res.ok) {
          const [r, g, b, _a] = res.data;
          const hex = "#" + [r, g, b].map(x => x.toString(16).padStart(2, "0")).join("").toUpperCase();
          setFgColor(hex);
        }
      })
      .catch(console.error);
  };
  ```
- Modify `handleArtboardMouseDown` to sample color on click:
  ```typescript
    } else if (activeTool() === "eyedropper") {
      handleSampleColor(coords.x, coords.y);
    }
  ```
- Modify `handleArtboardMouseMove` to sample color on drag:
  ```typescript
    } else if (activeTool() === "eyedropper" && e.buttons === 1) {
      handleSampleColor(coords.x, coords.y);
    }
  ```

**Step 5: Commit**
```bash
git add apps/desktop/src/App.tsx
git commit -m "feat(frontend): enable Eyedropper toolbar button, shortcut trigger, and live canvas pixel-level color sampling"
```

---

### Task 6: [frontend] Snappy Custom Overlapping Color Swatches with Native Color Picker & Options Bar Export Modal

**Files:**
- Modify: `apps/desktop/src/App.tsx` (Add native inputs to color swatches, implement top right contextual export settings modal dialog)

**Step 1: Overlay native color picker inputs over color swatches**
- Modify theoverlapping swatches container (around line 720) in `App.tsx`:
  ```tsx
  <div class="relative w-11 h-11 select-none cursor-default" title="Color Swatches (Primary / Secondary)">
    {/* Background Color Swatch */}
    <div 
      class="absolute right-1 bottom-1 w-6 h-6 rounded-sm border border-studio-border-strong z-0 shadow-[0_1px_4px_rgba(0,0,0,0.5)] transition-all duration-75 relative overflow-hidden"
      style={`background-color: ${bgColor()};`}
      title="Secondary Color (Background) - Click to change"
    >
      <input 
        type="color"
        class="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
        value={bgColor()}
        onInput={(e: any) => setBgColor(e.currentTarget.value)}
      />
    </div>
    {/* Foreground Color Swatch */}
    <div 
      class="absolute left-1 top-1 w-6 h-6 rounded-sm border border-white/10 z-10 shadow-md transition-all duration-75 relative overflow-hidden"
      style={`background-color: ${fgColor()};`}
      title="Primary Color (Foreground) - Click to change"
    >
      <input 
        type="color"
        class="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
        value={fgColor()}
        onInput={(e: any) => setFgColor(e.currentTarget.value)}
      />
    </div>
    {/* ... curved arrow buttons unchanged */}
  </div>
  ```

**Step 2: Add Option Bar Contextual Export settings dropdown modal**
- In the top bar Export action area, let's create a compact, visually stunning contextual properties dropdown for choosing export format and quality parameters:
  ```typescript
  const [showExportModal, setShowExportModal] = createSignal(false);
  const [exportFormat, setExportFormat] = createSignal("PNG");
  const [exportQuality, setExportQuality] = createSignal(85);
  const [exportStatusText, setExportStatusText] = createSignal("");

  const handleExport = () => {
    setExportStatusText("Preparing export...");
    invoke("export_document", {
      format: exportFormat(),
      quality: exportQuality(),
    })
    .then((res: any) => {
      if (res?.ok) {
        setExportStatusText(`Exported successfully to: ${res.data.path}`);
        setTimeout(() => { setShowExportModal(false); setExportStatusText(""); }, 3000);
      }
    })
    .catch((err: any) => {
      setExportStatusText(err?.error?.message || "Export failed");
    });
  };
  ```
- Replace the simple "EXPORT" button in options bar with a relative dropdown trigger:
  ```tsx
  {/* Export Action */}
  <div class="relative">
    <button 
      onClick={() => setShowExportModal(!showExportModal())}
      class={`h-[26px] px-3 flex items-center gap-1.5 text-[11px] font-bold tracking-wider rounded-md shadow-sm cursor-default transition-all duration-75 ${
        showExportModal() 
          ? "bg-accent-active text-white border border-accent/40 shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.5)]" 
          : "bg-accent hover:bg-accent-hover active:bg-accent-active text-white"
      }`}
    >
      <Share size={13} />
      <span>EXPORT</span>
    </button>

    <Show when={showExportModal()}>
      <div class="absolute right-0 top-[30px] bg-studio-panel border border-studio-border rounded-lg shadow-lg p-4 w-72 z-[10005] flex flex-col gap-3">
        <span class="text-[11px] font-bold text-text-muted uppercase tracking-wider">Export Settings</span>
        
        {/* Format selectors */}
        <div class="flex items-center gap-2">
          <span class="text-text-secondary text-[11px] w-14 font-semibold">Format</span>
          <div class="bg-studio-input border border-studio-border rounded-md p-0.5 h-[26px] flex-1 flex gap-0.5">
            <For each={["PNG", "JPEG", "WEBP"]}>
              {(fmt) => (
                <button
                  onClick={() => setExportFormat(fmt)}
                  class={`flex-1 text-center text-[10px] font-bold rounded cursor-default transition-all duration-75 ${
                    exportFormat() === fmt
                      ? "bg-studio-elevated text-accent border border-studio-border-strong shadow-sm"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  {fmt}
                </button>
              )}
            </For>
          </div>
        </div>

        {/* Quality selector (Only shown for JPEG/WEBP) */}
        <Show when={exportFormat() !== "PNG"}>
          <div class="flex items-center gap-2">
            <span class="text-text-secondary text-[11px] w-14 font-semibold">Quality</span>
            <input 
              type="range" 
              min="1" max="100" 
              class="flex-grow accent-accent"
              value={exportQuality()}
              onInput={(e: any) => setExportQuality(parseInt(e.currentTarget.value))}
            />
            <span class="text-[11px] font-mono w-8 text-right font-semibold text-white">{exportQuality()}%</span>
          </div>
        </Show>

        <button 
          onClick={handleExport}
          class="bg-accent hover:bg-accent-hover text-white text-[11px] font-bold tracking-wider py-1.5 rounded-md mt-1 transition-colors cursor-default text-center"
        >
          CONFIRM & EXPORT
        </button>

        <Show when={exportStatusText() !== ""}>
          <div class="text-[10px] text-accent font-semibold text-center select-none truncate">
            {exportStatusText()}
          </div>
        </Show>
      </div>
    </Show>
  </div>
  ```

**Step 3: Commit**
```bash
git add apps/desktop/src/App.tsx
git commit -m "feat(frontend): integrate native swatch color pickers and snappy contextual Options Bar export settings modal"
```

---

### Task 7: Verify and Compile Production bundle

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
git commit -am "chore(release): verify and finalize Milestone 5 Export & Color sampling checks"
```
