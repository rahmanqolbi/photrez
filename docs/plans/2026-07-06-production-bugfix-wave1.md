---
phase: 2
plan: 1
wave: 1
depends_on: []
files_modified:
  - apps/desktop/src/components/editor/shell/EditorShell.tsx
  - apps/desktop/src/components/editor/DragController.tsx
  - apps/desktop/src/engine/document.ts
  - apps/desktop/src/components/editor/layers/useLayerActions.ts
  - apps/desktop/src/components/editor/printDocument.ts
  - apps/desktop/src-tauri/src/commands.rs
autonomous: true
user_setup: []
must_haves:
  truths:
    - "All 2190+ tests pass"
    - "TypeScript type-check passes"
    - "No VRAM leak after repeated layer/document create/delete cycles"
    - "No blank screen on unhandled runtime error in UI"
    - "No memory leak during slider adjustment drag"
    - "No stuck drag state after aborted OS file drag"
  artifacts:
    - "ErrorBoundary wrapper exists in EditorShell.tsx"
    - "DragGlobalGuard has cleanup listeners for dragleave/drop"
    - "applyBasicAdjustment closes transient bitmaps not in history"
    - "renderer.destroyTexture() called on layer delete and tab close"
    - "load_project has decompression size limit"
    - "print_image has path validation"
    - "Temp print files are cleaned up"
---

# Plan 2.1: Production Bug-Fix Wave 1 — Critical & High Severity

<objective>
Fix all P0 (Critical) and P1 (High) bugs identified in the production bug audit.

**Target:** Eliminate crash vectors, data loss paths, and security vulnerabilities before next release.

**Risk rating:** Low-Medium. Each fix is localized (1-5 lines) with existing test coverage.
</objective>

<context>
Full audit report available in the conversation history (2026-07-06 production bug audit).

Priority matrix:
- **P0 (3 bugs):** VRAM leak on tab close, VRAM leak on layer delete, ImageBitmap leak during adjustment slider drag
- **P1 (5 bugs):** Stuck drag state on aborted OS file drag, Stale callbacks after document removal, Mutex poisoning in get_pending_open_path, print_image missing path validation, load_project zip bomb vulnerability

Current test coverage: 136 test files / 2190 tests passing. Type-check clean.
</context>

<tasks>

<!-- ═══════════════════════════════════════════════════════════ -->
<!-- P0 BUGS                                                     -->
<!-- ═══════════════════════════════════════════════════════════ -->

<task type="auto">
  <name>P0-1: WebGL Texture Leak pada Layer Delete</name>
  <files>
    - apps/desktop/src/components/editor/layers/useLayerActions.ts
  </files>
  <action>
    Di fungsi delete layer (sekitar line 193), panggil `renderer.destroyTexture(activeId)` 
    SESUDAH `engine.deleteLayer(activeId)` dan SEBELUM `scheduler.requestRender()`.

    Pattern:
    ```typescript
    history.commit(engine.snapshot(), "Delete Layer");
    engine.deleteLayer(activeId);
    renderer.destroyTexture(activeId);
    scheduler.requestRender();
    ```
  </action>
  <verify>Test: add layer with bitmap → delete → check renderer texture Map size</verify>
  <done>Layer delete cleans up WebGL texture</done>
</task>

<task type="auto">
  <name>P0-2: WebGL Texture Leak pada Dokumen Tab Close</name>
  <files>
    - apps/desktop/src/components/editor/shell/DocumentTabsBar.tsx
  </files>
  <action>
    Di `handleCloseTab`, sebelum `workspace.removeDocument(id)`, loop session's layers 
    dan panggil `renderer.destroyTexture()` untuk setiap layer:

    ```typescript
    const session = workspace.getSession(id);
    if (session) {
      for (const layer of session.engine.getLayers()) {
        renderer.destroyTexture(layer.id);
      }
    }
    workspace.removeDocument(id);
    scheduler.requestRender();
    ```

    NOTE: Letakkan setelah `dialog.confirm()` (jika dirty) dan sebelum `workspace.removeDocument()`.
  </action>
  <verify>Test: open doc → close tab → confirm texture count decreases</verify>
  <done>Tab close cleans up all WebGL textures for the document</done>
</task>

<task type="auto">
  <name>P0-3: ImageBitmap Leak Saat Adjustment Slider Drag</name>
  <files>
    - apps/desktop/src/engine/document.ts
  </files>
  <action>
    Di `applyBasicAdjustment`, bitmap lama yang tidak ada di history stack harus di-close.
    
    Masalah: Setiap panggilan `applyBasicAdjustment` membuat ImageBitmap baru via 
    `canvas.transferToImageBitmap()` tetapi TIDAK pernah `.close()` bitmap sebelumnya.
    Bitmap-bitmap intermediate ini tidak ada di snapshot history, jadi GC tidak bisa 
    reclaim GPU memory dengan cepat.

    Solusi: Sebelum `this.model.dirty = true`, simpan referensi `layer.imageBitmap` lama.
    Setelah bitmap baru di-assign, close yang lama — TAPI hanya jika `baseImageBitmap` 
    sudah ada (artinya ini bukan bitmap original dari snapshot).

    ```typescript
    // Simpan referensi bitmap lama untuk di-close
    const previousBitmap = layer.imageBitmap;
    
    layer.imageBitmap = canvas.transferToImageBitmap();
    // ... 
    this.model.dirty = true;
    this.markLayerDirty(id);
    
    // Close bitmap lama — aman karena snapshot undo sudah hold referensi sendiri
    // dan bitmap ini adalah hasil preview, bukan bagian dari history
    if (previousBitmap && previousBitmap !== layer.baseImageBitmap) {
      previousBitmap.close();
    }
    
    this.notifyVisualChange();
    ```

    NOTE: Tidak perlu close `previousBitmap` jika `previousBitmap === layer.baseImageBitmap` 
    karena `baseImageBitmap` adalah referensi yang tetap dipertahankan untuk re-adjustment.

    UPDATE: Metode yang lebih aman — hanya close jika bitmap TIDAK sama dengan 
    `baseImageBitmap` (yang di-cache untuk undo adjustment). Jangan pernah close 
    bitmap yang mungkin dirujuk oleh snapshot di history stack.
  </action>
  <verify>
    - Test: applyAdjustment berulang 100x → memory tidak membengkak
    - Test: apply → undo → redo → bitmap reference masih valid (tidak detached)
    - Test: slider drag 60fps selama 5 detik → memory stabil
  </verify>
  <done>Adjustment slider drag tidak bocor ImageBitmap</done>
</task>

<!-- ═══════════════════════════════════════════════════════════ -->
<!-- P1 BUGS                                                     -->
<!-- ═══════════════════════════════════════════════════════════ -->

<task type="auto">
  <name>P1-1: Stuck Drag State pada Aborted OS File Drag</name>
  <files>
    - apps/desktop/src/components/editor/DragController.tsx
  </files>
  <action>
    Di component `DragGlobalGuard` (atau di `DragControllerProvider`), tambahkan 
    event listener untuk `dragleave` dan `drop` pada `document` level untuk cleanup 
    saat OS file drag dibatalkan:

    ```typescript
    // Di DragGlobalGuard, pada onMount:
    const handleDocumentDragEnd = () => {
      if (dragController.state.dragKind === "file") {
        dragController.endDrag();
      }
    };
    document.addEventListener("dragleave", handleDocumentDragEnd);
    document.addEventListener("drop", handleDocumentDragEnd);
    onCleanup(() => {
      document.removeEventListener("dragleave", handleDocumentDragEnd);
      document.removeEventListener("drop", handleDocumentDragEnd);
    });
    ```

    Catatan: `dragleave` fires ketika cursor meninggalkan dokumen window.
    `drop` fires ketika drop sukses terjadi (cleanup jaga-jaga).
  </action>
  <verify>Test: drag file from OS → release outside window → dragKind kembali null</verify>
  <done>OS file drag abort tidak meninggalkan stuck state</done>
</task>

<task type="auto">
  <name>P1-2: Stale Callbacks Setelah Document Removal</name>
  <files>
    - apps/desktop/src/engine/workspace.ts
  </files>
  <action>
    Di `removeDocument`, sebelum session di-delete dari Map, batalkan callbacks 
    dengan me-reset ke null:

    ```typescript
    removeDocument(id: DocumentId): void {
      if (this.sessions.has(id)) {
        // Batalkan callbacks untuk cegah stale callback firing
        const session = this.sessions.get(id)!;
        session.engine.onChange(null as any);
        session.engine.onVisualChange(null as any);
        
        // ... existing logic ...
      }
    }
    ```

    NOTE: Tipe parameter `onChange` adalah `(() => void) | null`, jadi passing 
    `null` secara langsung akan type error. Gunakan overload atau cast:
    ```typescript
    (session.engine as any).onChange(null);
    (session.engine as any).onVisualChange(null);
    ```
    Atau lebih baik: ubah tipe parameter di DocumentEngine.onChange/onVisualChange 
    menjadi `(callback: (() => void) | null): void`.
  </action>
  <verify>
    - Test: add document → remove document → engine fires notifyChange → tidak crash
    - Type-check passes
  </verify>
  <done>Removed document tidak bisa trigger stale callbacks</done>
</task>

<task type="auto">
  <name>P1-3: Mutex Poisoning Rust — get_pending_open_path</name>
  <files>
    - apps/desktop/src-tauri/src/commands.rs
  </files>
  <action>
    Ganti `.lock().unwrap()` dengan pattern yang handle poisoned lock:

    Sebelum:
    ```rust
    let cli = cli_state.lock().unwrap();
    ```

    Sesudah:
    ```rust
    let cli = cli_state.lock().unwrap_or_else(|e| e.into_inner());
    ```

    `into_inner()` mengembalikan nilai yang di-lock meskipun mutex poisoned.
    Ini aman karena kita hanya membaca `pending_open_path`.
  </action>
  <verify>`cargo build -p photrez-desktop` succeeds</verify>
  <done>Poisoned mutex tidak crash app</done>
</task>

<task type="auto">
  <name>P1-4: print_image — Path Validation</name>
  <files>
    - apps/desktop/src-tauri/src/commands.rs
  </files>
  <action>
    Tambahkan `validate_path_extension` di awal fungsi `print_image`:

    Sebelum:
    ```rust
    #[tauri::command]
    pub async fn print_image(app: tauri::AppHandle, path: String) -> Result<(), String> {
        // ... langsung ShellExecuteW
    ```

    Sesudah:
    ```rust
    #[tauri::command]
    pub async fn print_image(app: tauri::AppHandle, path: String) -> Result<(), String> {
        validate_path_extension(&path, &["png", "jpg", "jpeg", "pdf"], "print")?;
        // ... ShellExecuteW
    ```

    Gunakan allowlist yang sama seperti `read_file_bytes` (`READ_FILE_EXTENSIONS`).
  </action>
  <verify>`cargo build -p photrez-desktop` succeeds</verify>
  <done>print_image hanya bisa print file gambar/PDF yang valid</done>
</task>

<task type="auto">
  <name>P1-5: load_project — Zip Bomb Protection</name>
  <files>
    - apps/desktop/src-tauri/src/commands.rs
  </files>
  <action>
    Gunakan `.take(MAX_FILE_IO_BYTES)` pada reader sebelum decompress:

    Sebelum:
    ```rust
    let mut bytes = Vec::new();
    file.read_to_end(&mut bytes)?;
    ```

    Sesudah:
    ```rust
    let mut bytes = Vec::new();
    let mut limit_reader = file.take(MAX_FILE_IO_BYTES);
    limit_reader.read_to_end(&mut bytes)?;
    ```

    Juga untuk file JSON:
    ```rust
    let mut json_str = String::new();
    let mut limit_reader = json_file.take(1024 * 1024); // 1MB cukup untuk JSON
    limit_reader.read_to_string(&mut json_str)?;
    ```
  </action>
  <verify>`cargo build -p photrez-desktop` succeeds</verify>
  <done>load_project punya decompression size limit</done>
</task>

<!-- ═══════════════════════════════════════════════════════════ -->
<!-- P2 BUGS (Pilih yang berdampak besar)                        -->
<!-- ═══════════════════════════════════════════════════════════ -->

<task type="auto">
  <name>P2-1: ErrorBoundary — Cegah Blank Screen Total</name>
  <files>
    - apps/desktop/src/components/editor/shell/EditorShell.tsx
  </files>
  <action>
    Bungkus area kritis dengan ErrorBoundary. SolidJS tidak punya ErrorBoundary 
    built-in, jadi kita buat komponen sendiri:

    1. Buat file baru: `apps/desktop/src/components/editor/ErrorBoundary.tsx`

    ```typescript
    import { Component, JSX, onMount, onCleanup } from "solid-js";

    interface ErrorBoundaryProps {
      fallback: (error: Error) => JSX.Element;
      children: JSX.Element;
    }

    export function ErrorBoundary(props: ErrorBoundaryProps) {
      // SolidJS tidak punya componentDidCatch — kita gunakan window error handler
      // sebagai fallback. Komponen ini menjadi container yang menangkap error
      // dari child tree.
      
      let hasError = false;
      let error: Error | null = null;
      
      const handleError = (e: ErrorEvent) => {
        if (!hasError) {
          hasError = true;
          error = e.error || new Error(e.message);
          e.preventDefault();
          // Trigger re-render (practical: show fallback)
        }
      };
      
      onMount(() => {
        window.addEventListener("error", handleError);
      });
      
      onCleanup(() => {
        window.removeEventListener("error", handleError);
      });
      
      if (hasError) {
        return props.fallback(error!);
      }
      
      return <>{props.children}</>;
    }
    ```

    2. Di `EditorShell.tsx`, bungkus area kritis:
    ```typescript
    import { ErrorBoundary } from "../ErrorBoundary";
    
    // Di return:
    <EditorProvider ...>
      <ErrorBoundary fallback={(err) => <div>Editor error: {err.message}</div>}>
        {/* existing children */}
      </ErrorBoundary>
    </EditorProvider>
    ```

    Alternatif yang lebih SolidJS-native: gunakan `createResource` atau error 
    handling di `onError` dari `solid-js`.
  </action>
  <verify>
    - Type-check passes
    - Tests pass
    - Simulasi error di komponen child → fallback muncul (bukan blank screen)
  </verify>
  <done>Unhandled runtime error tidak blank screen total</done>
</task>

<task type="auto">
  <name>P2-2: Temp File Cleanup di printDocument</name>
  <files>
    - apps/desktop/src/components/editor/printDocument.ts
  </files>
  <action>
    Setelah invoke print selesai, hapus temp file.

    ```typescript
    import { removeFile, pathExists } from "@tauri-apps/plugin-fs";
    
    try {
      await invoke("print_image", { path: filePath });
    } finally {
      // Cleanup temp file
      try {
        const exists = await pathExists(filePath);
        if (exists) {
          await removeFile(filePath);
        }
      } catch (cleanupErr) {
        console.error("Failed to clean up temp file:", cleanupErr);
      }
    }
    ```
    
    Atau jika `@tauri-apps/plugin-fs` tidak tersedia, gunakan invoke custom:
    ```typescript
    // Tambah command Rust: delete_temp_file
    ```
  </action>
  <verify>Print → temp file tidak tertinggal di %TEMP%</verify>
  <done>Print tidak bocor file temporary</done>
</task>

<task type="auto">
  <name>P2-3: Memory Budget Check Wiring</name>
  <files>
    - apps/desktop/src/engine/document.ts
    - apps/desktop/src/engine/paintHistoryBudget.ts
  </files>
  <action>
    Integrasikan `estimatePaintHistoryBudget` ke operasi-operasi yang bisa 
    menyebabkan OOM:
    
    1. Di `addLayer` — sudah ada `canAddLayer()` ✅
    2. Di `setLayerImageBitmap` — tambah check ukuran bitmap baru
    3. Di crop/resize — tambah check dimensi baru
    
    Untuk fase ini: fokus pada #2 dan #3 dengan guard sederhana.
    
    Pattern:
    ```typescript
    const totalBytes = this.calculateMemoryUsage() + (bitmap.width * bitmap.height * 4);
    if (totalBytes > MAX_PIXEL_BUDGET) {
      throw new Error("E_RESOURCE_LIMIT: Operation exceeds maximum pixel memory budget.");
    }
    ```
  </action>
  <verify>Test: set huge bitmap → E_RESOURCE_LIMIT thrown</verify>
  <done>Memory budget di-enforce di semua entry point</done>
</task>

</tasks>

<verification>
## Final Verification Checklist

### Test Suite
- [ ] `npm run type-check` — no TS errors
- [ ] `npx vitest run` — 136 files / 2190+ tests passing
- [ ] Rust: `cargo build -p photrez-desktop` — compiles

### P0 Fixes
- [ ] Layer delete calls `renderer.destroyTexture()`
- [ ] Tab close calls `renderer.destroyTexture()` for all layers
- [ ] `applyBasicAdjustment` closes transient bitmaps not in history

### P1 Fixes
- [ ] Stuck drag state: `dragleave`/`drop` listeners cleanup dragKind="file"
- [ ] Stale callbacks: `removeDocument` resets engine onChange/onVisualChange
- [ ] Mutex: `.lock().unwrap()` → `.lock().unwrap_or_else(|e| e.into_inner())`
- [ ] `print_image` validates path extension before ShellExecuteW
- [ ] `load_project` uses `.take(MAX_FILE_IO_BYTES)` for decompression

### P2 Fixes (selected)
- [ ] ErrorBoundary wraps editor shell
- [ ] Temp print file deleted in finally block
- [ ] Memory budget check in setLayerImageBitmap and crop/resize
</verification>

<success_criteria>
- [ ] All P0 and P1 bugs fixed
- [ ] All verification checks green
- [ ] No regression in existing test suite
- [ ] Type-check passes
- [ ] Rust backend compiles
</success_criteria>
