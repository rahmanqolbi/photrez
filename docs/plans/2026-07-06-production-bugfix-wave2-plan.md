---
phase: 2
plan: 2
wave: 2
depends_on:
  - "Production Bug-Fix Wave 1 (P0-1..3, P1-1..5, P2-1..3) — COMPLETE"
files_modified: []
autonomous: false
user_setup:
  - "Review per-area priority: Global > Viewport > Export > Layer > Brush"
  - "Setelah task list disetujui, lanjut ke eksekusi wave 2"
must_haves:
  truths:
    - "All P0 bugs from wave 1 are fixed (VRAM leak, ImageBitmap leak)"
    - "All P1 bugs from wave 1 are fixed (stuck drag, stale callbacks, mutex, path validation, zip bomb)"
    - "Undo/redo wiring tests (38 tests) added and passing"
    - "No-engine guard tests added to pointerToolRouting"
---

# Plan 2.2: Production Bug-Fix Wave 2 — Remaining P0 & P1 Risks

<objective>
Menangani semua risiko P0 dan P1 yang **tersisa** setelah Wave 1. Target: menutup gap yang teridentifikasi di risk register (`docs/risk-registers/production/`).

**Prioritas:** Per-area berdasarkan severity dan frekuensi trigger.

**Estimasi:** 10-15 task terpisah, masing-masing 1-3 file yang diubah.
</objective>

<context>
## Ringkasan Risiko setelah Wave 1

**Wave 1 sudah fixed (11 bugs):**
- ✅ P0-1: VRAM leak on layer delete
- ✅ P0-2: VRAM leak on tab close
- ✅ P0-3: ImageBitmap leak during slider drag
- ✅ P1-1: Stuck drag state on aborted OS file drag
- ✅ P1-2: Stale callbacks after document removal
- ✅ P1-3: Mutex poisoning → `.unwrap_or_else(|e| e.into_inner())`
- ✅ P1-4: `print_image` — path validation
- ✅ P1-5: `load_project` — zip bomb protection
- ✅ P2-1: ErrorBoundary wraps EditorShell
- ✅ P2-2: Temp file cleanup after print (finally block)
- ✅ P2-3: Memory budget checks in `setLayerImageBitmap`, `resizeCanvas`

**Tambahan verifikasi dari Wave 1:**
- ✅ 38 undo/redo contract wiring tests (commit BEFORE mutation)
- ✅ No-engine guard tests di pointerToolRouting

Sumber risiko: `docs/risk-registers/production/01-global-wiring-state-sync.md`, `02-layer-workspace.md`, `07-viewport-renderer.md`, `08-export-file-io-ipc.md`, `10-testing-observability-release.md`.
</context>

<tasks>

<!-- ═══════════════════════════════════════════════════════════ -->
<!-- AREA 1: GLOBAL WIRING (P0 + P1)                            -->
<!-- ═══════════════════════════════════════════════════════════ -->

<task type="auto">
  <name>W2-GLOBAL-001: Tool Routing Wiring Test — Semua Tool Id (P0)</name>
  <risk_id>PBR-GLOBAL-001</risk_id>
  <severity>P0</severity>
  <symptom>Tool aktif di UI tapi klik canvas tidak melakukan apa-apa</sampai>
  <root_cause>Tool type ditambahkan ke UI tapi tidak dirouting di `useCanvasPointerTools`</root_cause>
  <mitigation>
    Pointer chain test: `pointerdown → pointermove → pointerup` harus memanggil
    engine mutation untuk setiap tool ID.

    File target:
    - `apps/desktop/src/components/editor/__tests__/pointerToolRouting.test.tsx`
    
    Action:
    - Tambah test untuk thumb/drag tool dan tool-tool baru yang belum tercakup
    - Verifikasi setiap tool ID di `ToolId` union type dirouting ke `handlePointerDown`
    - Verifikasi tool yang tidak membutuhkan pointer routing (eyedropper etc.) tidak
      dipanggil
    
    Catatan: test yang sudah ada mencakup move, selection, crop, brush, eraser,
    eyedropper. Test perlu diperluas untuk mencakup semua tool di `ToolId`.
  </mitigation>
  <verify>Setiap tool ID di ToolId memiliki test routing ke handlePointerDown</verify>
</task>

<task type="auto">
  <name>W2-GLOBAL-002: Undo/Redo Contract — Engine Operations Lagi (P0)</name>
  <risk_id>PBR-GLOBAL-003</risk_id>
  <severity>P0</severity>
  <symptom>Undo skip action atau restore partial state</sampai>
  <root_cause>Ada path engine mutation yang panggil `history.commit()` setelah mutation (salah urutan)</root_cause>
  <mitigation>
    Audit semua pemanggil `setLayerImageBitmap`, `applyBasicAdjustment`, `mergeDown`,
    `flattenLayers`, `deleteLayer`, `addLayer`, dll — pastikan semua sudah didahului
    oleh `history.commit()`.

    File target:
    - `apps/desktop/src/engine/document.ts` — semua method public yang mutable
    - `apps/desktop/src/engine/workspace.ts` — method yang ubah state
    
    Action:
    - Review setiap method public di DocumentEngine yang memanggil `notifyChange()`
    - Pastikan tidak ada method yang memanggil `notifyChange()` tanpa ada
      `history.commit()` di caller-nya
    - Tambah komentar `// NOTE: caller MUST call history.commit() BEFORE this method`
      di method yang membutuhkan pre-commit

    Catatan: sebagian besar path sudah benar (sudah dites di undo-redo-contract-wiring.test.ts).
    Fokus pada path yang belum dites: layer opacity via LayersPanel, blend mode, rename,
    lock properties.
  </mitigation>
  <verify>Grep untuk setiap `setLayer*` + `notifyChange()` — pastikan ada `history.commit()` di caller</verify>
</task>

<task type="auto">
  <name>W2-GLOBAL-003: Layer Desync Signal — activeLayerId vs selectedLayerId (P0)</name>
  <risk_id>PBR-GLOBAL-004</risk_id>
  <severity>P0</severity>
  <symptom>Layers panel, transform overlay, dan engine menunjuk ke layer berbeda</sampai>
  <root_cause>`activeLayerId`, `selectedLayerId`, dan `engine.getActiveLayerId()` sinkronisasi inkonsisten</root_cause>
  <mitigation>
    Engine-signal contract test untuk kasus:
    - Undo setelah delete layer (sudah ada test di engine-signal-contract)
    - Switch document → assert selectedLayerId sync
    - Delete active layer → assert selectedLayerId fallback
    - Tool switch → assert selectedLayerId tidak stale

    File target:
    - `apps/desktop/src/components/editor/__tests__/engine-signal-contract.test.tsx`
    - `apps/desktop/src/components/editor/shell/EditorContext.tsx`

    Action:
    - Tambah test: `engine.setActiveLayer(null)` → signal sync
    - Tambah test: delete active layer via `useLayerActions` → selectedLayerId berubah
    - Review setSelectedLayerId di `workspaceSync.ts` — apakah ada path yang missed?
  </mitigation>
  <verify>Tambah 3-5 engine-signal contract test untuk layer desync scenario</verify>
</task>

<task type="auto">
  <name>W2-GLOBAL-004: Pointer Cancel + Lost Capture — Cleanup (P1)</name>
  <risk_id>PBR-GLOBAL-008</risk_id>
  <severity>P1</severity>
  <symptom>Drag stuck, selection edit mode stuck, paint stroke tidak pernah commit</sampai>
  <root_cause>`pointercancel` / `lostpointercapture` tidak dirouting ke cleanup yang benar</root_cause>
  <mitigation>
    Test pointer chain dengan cancel dan lost capture untuk setiap tool:
    - brush: stroke harus commit via `commitBrushStroke` on cancel
    - selection: selection box harus sync dari engine, jangan null
    - move: drag state direset
    - crop: drag state direset

    File target:
    - `apps/desktop/src/components/editor/canvas/useCanvasPointerTools.ts`
    
    Action:
    - Review implementasi `onCanvasPointerCancel` dan `onCanvasLostPointerCapture`
    - Pastikan setiap tool memiliki cleanup yang sesuai
    - Tambah test yang simulasikan cancel/lost capture untuk setiap tool yang drag-enabled
  </mitigation>
  <verify>Tambah pointer cancel + lost capture test untuk brush, selection, move, crop</verify>
</task>

<task type="auto">
  <name>W2-GLOBAL-005: Tool State Leak — Switch Tool Cleanup (P1)</name>
  <risk_id>PBR-GLOBAL-005</risk_id>
  <severity>P1</severity>
  <symptom>Cursor, transform box, atau drag session leak setelah tool switch</sampai>
  <root_cause>Transient signal tidak dibersihkan di active tool change effect</root_cause>
  <mitigation>
    Tool A → Tool B → Tool A round-trip test dengan per-signal assertion:
    - `selectionBox` harus null setelah switch dari selection
    - `hudInfo` harus null setelah switch
    - `cropDragPreview` harus null setelah switch dari crop
    - `snapLines` harus [] setelah switch

    File target:
    - `apps/desktop/src/components/editor/canvas/useCanvasPointerTools.ts`
    - File test baru atau tambah ke test yang ada
    
    Action:
    - Identifikasi semua transient signal yang perlu cleanup
    - Buat test yang verifikasi cleanup pada setiap tool switch
  </mitigation>
  <verify>Tambah tool switch round-trip test dengan assertions per-signal</verify>
</task>

<!-- ═══════════════════════════════════════════════════════════ -->
<!-- AREA 2: VIEWPORT & RENDERER (P0 + P1)                      -->
<!-- ═══════════════════════════════════════════════════════════ -->

<task type="auto">
  <name>W2-VIEW-001: Viewport Drift — Pixels vs Overlays (P0)</name>
  <risk_id>PBR-VIEW-001</risk_id>
  <severity>P0</severity>
  <symptom>Rendered pixels dan overlays terpisah setelah zoom/pan</sampai>
  <root_cause>Camera, Solid signals, dan engine viewport jadi tiga sumber truth berbeda</root_cause>
  <mitigation>
    Viewport sync test: fit → zoom → pan → assert camera, signal, dan engine viewport konsisten.

    File target:
    - `apps/desktop/src/viewport/viewportCamera.ts`
    - `apps/desktop/src/components/editor/CanvasViewport.tsx`
    - File test baru: `src/__tests__/viewport-sync.test.ts`

    Action:
    - Test `setZoom` → assert `pan()`, `zoom()`, engine.getViewport() sinkron
    - Test `setPan` → assert semua sumber truth sinkron
    - Test fit-to-screen → assert semua sumber truth sinkron
    - Test zoom animation → assert final state sinkron
  </mitigation>
  <verify>Tambah viewport sync test untuk fit, zoom, pan, zoom animation</verify>
</task>

<task type="auto">
  <name>W2-VIEW-002: WebGL Scissor — Pixels Outside Artboard (P0)</name>
  <risk_id>PBR-VIEW-003</risk_id>
  <severity>P0</severity>
  <symptom>Transformed pixels muncul di luar artboard</sampai>
  <root_cause>Final pass scissor clipping hilang atau pake document bounds yang salah</root_cause>
  <mitigation>
    WebGL scissor unit test dan E2E moved-layer clipping test.

    File target:
    - `apps/desktop/src/renderer/webgl2.ts`
    - File test: `src/renderer/__tests__/webgl2-scissor.test.ts`
    
    Action:
    - Review implementasi scissor di render pass
    - Pastikan scissor di-resize saat canvas resize
    - Tambah test untuk layer yang digeser sebagian di luar canvas
  </mitigation>
  <verify>WebGL scissor test untuk moved/cropped/transformed layers</verify>
</task>

<task type="auto">
  <name>W2-VIEW-003: WebGL Context Loss — Blank Editor (P1)</name>
  <risk_id>PBR-VIEW-007</risk_id>
  <severity>P1</severity>
  <symptom>WebGL context loss bikin editor blank total</sampai>
  <root_cause>Tidak ada context loss handling di renderer</root_cause>
  <mitigation>
    Implement context loss handler di WebGL2 backend:
    - Listen `webglcontextlost` event
    - Prevent default (biarkan context bisa di-restore)
    - Listen `webglcontextrestored` event
    - Re-upload semua textures yang ada
    - Request re-render setelah restore

    File target:
    - `apps/desktop/src/renderer/webgl2.ts`

    Action:
    - Tambah event listener di setup WebGL
    - Implement re-upload queue untuk semua layer
    - Test: simulasikan context loss + restore (via browser-use agent)
  </mitigation>
  <verify>Context loss → restore → textures re-upload → render normal</verify>
</task>

<task type="auto">
  <name>W2-VIEW-004: HiDPI Backing Buffer (P1)</name>
  <risk_id>PBR-VIEW-004</risk_id>
  <severity>P1</severity>
  <symptom>Canvas blurry atau memory heavy di HiDPI display</sampai>
  <root_cause>Backing buffer pakai DPR/zoom dimensions yang salah</root_cause>
  <mitigation>
    DPR resize test dan memory gate untuk HiDPI.

    File target:
    - `apps/desktop/src/components/editor/CanvasViewport.tsx`
    - `apps/desktop/src/renderer/webgl2.ts`

    Action:
    - Test resize canvas pada DPR 1x, 1.5x, 2x
    - Pastikan backing buffer size = `Math.round(viewportPixels * DPR)`
    - Verifikasi tidak ada extra memory allocation untuk HiDPI
  </mitigation>
  <verify>DPR resize test untuk 1x, 1.5x, 2x — memory tidak bengkak</verify>
</task>

<!-- ═══════════════════════════════════════════════════════════ -->
<!-- AREA 3: EXPORT & FILE IO (P0 + P1)                         -->
<!-- ═══════════════════════════════════════════════════════════ -->

<task type="auto">
  <name>W2-EXPORT-001: Export Parity — Canvas vs Export (P0)</name>
  <risk_id>PBR-EXPORT-001</risk_id>
  <severity>P0</severity>
  <symptom>Exported image berbeda dari visible editor</sampai>
  <root_cause>Canvas 2D export composite diverges dari WebGL renderer</root_cause>
  <mitigation>
    E2E export pixel parity test untuk opacity, transform, visibility.

    File target:
    - `apps/desktop/src/components/editor/exportDocument.ts`
    - File test baru atau tambah ke `exportDocument.test.ts`
    
    Action:
    - Buat test yang bandingkan hasil render WebGL vs Canvas 2D export
    - Test cases: layer dengan opacity, transform, visibility off
    - Test cases: rotated layer, flipped layer
  </mitigation>
  <verify>Export composite pixel-identical dengan WebGL render untuk semua transform state</verify>
</task>

<task type="auto">
  <name>W2-EXPORT-002: Export Magic Bytes Validation (P0)</name>
  <risk_id>PBR-EXPORT-002</risk_id>
  <severity>P0</severity>
  <symptom>Export write wrong file type atau invalid bytes</sampai>
  <root_cause>MIME, extension, encoder, atau quality mapping drift</root_cause>
  <mitigation>
    Magic byte tests untuk PNG/JPEG/WebP.

    File target:
    - `apps/desktop/src/components/editor/exportDocument.ts`
    - `apps/desktop/src/components/editor/__tests__/exportDocument.test.ts`

    Action:
    - Test: export PNG → cek magic bytes `[0x89, 0x50, 0x4E, 0x47]`
    - Test: export JPEG → cek magic bytes `[0xFF, 0xD8, 0xFF]`
    - Test: export WebP → cek magic bytes `[0x52, 0x49, 0x46, 0x46]`
    - Test: quality extremes (1, 50, 100) → file masih valid
    
    Referensi: `docs/reference/file-format-support.md`
  </mitigation>
  <verify>Tambah magic byte test untuk PNG, JPEG, WebP — semua pass</verify>
</task>

<task type="auto">
  <name>W2-EXPORT-003: Save Cancel Path — No Overwrite After Cancel (P0)</name>
  <risk_id>PBR-EXPORT-003</risk_id>
  <severity>P0</severity>
  <symptom>Save overwrite atau write setelah dialog cancel</sampai>
  <root_cause>Dialog cancel path tidak di-respect atau stale path reused</root_cause>
  <mitigation>
    Cancel path contract test untuk Save dan Save As.

    File target:
    - `apps/desktop/src/components/editor/useEditorCommands.ts`
    - `apps/desktop/src/tauri/native.ts`

    Action:
    - Mock `showSaveDialog` → return null (cancel)
    - Test: cancel Save As → tidak ada writeFileBytes dipanggil
    - Test: cancel Save (with sourcePath) → tidak ada perubahan di session
    - Test: cancel quality dialog → tidak ada export
  </mitigation>
  <verify>Save/Save As/Export — cancel path tidak menyebabkan write</verify>
</task>

<task type="auto">
  <name>W2-EXPORT-004: Large Export Memory Duplication (P1)</name>
  <risk_id>PBR-EXPORT-004</risk_id>
  <severity>P1</severity>
  <symptom>Large document export freeze atau crash</sampai>
  <root_cause>Full composite plus base64 IPC duplicate memory</root_cause>
  <mitigation>
    Large document memory/perf gate test.

    File target:
    - `apps/desktop/src/components/editor/exportDocument.ts`

    Action:
    - Test: export 4000×4000 image → memory usage tidak melebihi batas
    - Test: export multi-layer (5+ layers) → tidak freeze
    - Identifikasi potential double-buffer: composite + encode + IPC serialization
    
    Referensi: `docs/reference/performance-measurement-protocol.md`
  </mitigation>
  <verify>Large document export tidak double memory</verify>
</task>

<task type="auto">
  <name>W2-EXPORT-005: Export Layer Visibility + Lock (P1)</name>
  <risk_id>PBR-EXPORT-005</risk_id>
  <severity>P1</severity>
  <symptom>Invisible/locked layers di-export secara tidak konsisten</sampai>
  <root_cause>Export composite mengabaikan layer visibility atau transform</root_cause>
  <mitigation>
    Export tests untuk invisible layer, opacity, transform, locked.

    File target:
    - `apps/desktop/src/components/editor/__tests__/exportDocument.test.ts`
    - `apps/desktop/src/engine/layerComposite.ts`

    Action:
    - Test: export dengan hidden layer → hasil tidak termasuk hidden layer
    - Test: export dengan layer opacity 0.5 → hasil semi-transparent
    - Test: export dengan transformed layer → hasil sesuai transform
  </mitigation>
  <verify>Export hanya include visible, non-locked layers dengan transform yang benar</verify>
</task>

<!-- ═══════════════════════════════════════════════════════════ -->
<!-- AREA 4: LAYER OPERATIONS (P1)                               -->
<!-- ═══════════════════════════════════════════════════════════ -->

<task type="auto">
  <name>W2-LAYER-001: Duplicate/Merge/Flatten — Field Preservation (P1)</name>
  <risk_id>PBR-LAYER-003</risk_id>
  <severity>P1</severity>
  <symptom>Duplicate/merge/flatten loses pixels, opacity, lock, blend mode</sampai>
  <root_cause>Deep clone/composite path omit satu field</root_cause>
  <mitigation>
    Snapshot comparison test untuk setiap LayerNode field setelah operasi.

    File target:
    - `apps/desktop/src/engine/__tests__/layerAdjustments.test.ts`
    - `apps/desktop/src/engine/document.ts`

    Action:
    - Test: duplicate layer → semua field identik (nama numeric suffix di-exclude)
    - Test: merge down → merged layer mempertahankan blend mode + lock dari bottom
    - Test: flatten → semua field di flattened layer benar (opacity, lock, blend)
    - Gunakan snapshot comparison untuk membandingkan setiap field
  </mitigation>
  <verify>Duplicate/merge/flatten preserve semua LayerNode field</verify>
</task>

<task type="auto">
  <name>W2-LAYER-002: Locked Layer Guard — Matrix Test (P1)</name>
  <risk_id>PBR-LAYER-004</risk_id>
  <severity>P1</severity>
  <symptom>Locked layer bisa dimodifikasi lewat shortcut/drag meski panel mencegah</sampai>
  <root_cause>Guard hanya implement di satu entry path (button) — canvas/shortcut/drag tidak</root_cause>
  <mitigation>
    Matrix guard test: button, keyboard, pointer, drag/drop path untuk locked/hidden layer.

    File target:
    - `apps/desktop/src/components/editor/__tests__/layerGuardMatrix.test.ts`
    - File test baru

    Action:
    - Identifikasi semua entry path yang bisa modify layer
    - Untuk setiap path: test dengan locked layer → tidak ada perubahan
    - Untuk setiap path: test dengan hidden layer → tidak ada perubahan
    - Path: panel button, keyboard shortcut (useCanvasKeyboard), pointer drag,
      layer drag reorder, cross-doc drag
  </mitigation>
  <verify>Locked/hidden layer tidak bisa dimodifikasi dari entry path manapun</verify>
</task>

<task type="auto">
  <name>W2-LAYER-003: Wrong Document Mutation — Multi-Doc Async (P1)</name>
  <risk_id>PBR-LAYER-007</risk_id>
  <severity>P1</severity>
  <symptom>Tab dokumen berubah tapi panel layer masih mutasi dokumen sebelumnya</sampai>
  <root_cause>Workspace sync atau event handler capture stale engine/history</root_cause>
  <mitigation>
    Multi-doc test: switch tab → mutate layer → assert hanya active doc yang berubah.

    File target:
    - `apps/desktop/src/components/editor/__tests__/engine-signal-contract.test.tsx`

    Action:
    - Test: open doc A + doc B → switch to A → mutate layer di A → switch to B → assert B tidak berubah
    - Test: async operation (add file, import) → switch tab mid-flight → assert target doc benar
    
    Catatan: test cross-doc sudah ada di engine-signal-contract, perlu diperluas.
  </mitigation>
  <verify>Multi-document: mutasi hanya affect active document</verify>
</task>

<!-- ═══════════════════════════════════════════════════════════ -->
<!-- AREA 5: BRUSH / PAINT (P0 + P1)                             -->
<!-- ═══════════════════════════════════════════════════════════ -->

<task type="auto">
  <name>W2-BRUSH-001: Brush No-Ops After Move Deselect (P0)</name>
  <risk_id>PBR-BRUSH-001</risk_id>
  <severity>P0</severity>
  <symptom>Brush tidak menggambar setelah Move tool deselect layer</sampai>
  <root_cause>Paint target baca selectedLayerId bukan engine.getActiveLayerId()</root_cause>
  <mitigation>
    Review paint path untuk memastikan menggunakan engine's activeLayerId,
    bukan UI's selectedLayerId.

    File target:
    - `apps/desktop/src/components/editor/canvas/useCanvasPointerTools.ts`
    - `apps/desktop/src/components/editor/brushToolState.ts`

    Action:
    - Review `prepareToolContext()` — apakah brush/eraser tool baca selectedLayerId?
    - Review `commitBrushStroke` — apakah target layer benar?
    - Tambah regression test: brush after move deselect → paint di active layer
  </mitigation>
  <verify>Brush tetap menggambar setelah Move tool deselect</verify>
</task>

<task type="auto">
  <name>W2-BRUSH-002: Paint Modifies Locked/Hidden Layer (P0)</name>
  <risk_id>PBR-BRUSH-002</risk_id>
  <severity>P0</severity>
  <symptom>Paint memodifikasi locked atau hidden layer</sampai>
  <root_cause>Guard miss di satu paint path</root_cause>
  <mitigation>
    Guard matrix test untuk paint path: locked, hidden, visible layer.

    File target:
    - `apps/desktop/src/viewport/input-handler.ts` — brush/eraser handler
    - `apps/desktop/src/components/editor/canvas/useCanvasPointerTools.ts`
    
    Action:
    - Review guard di `onCanvasPointerDown` untuk brush/eraser
    - Pastikan `getPaintToolBlockReason` mencakup semua kondisi
    - Tambah test: brush with locked layer → no paint
    - Tambah test: brush with hidden layer → no paint
  </mitigation>
  <verify>Locked/hidden layer tidak bisa di-paint dari pointer path</verify>
</task>

<task type="auto">
  <name>W2-BRUSH-003: Brush Stroke Offset — Transformed Layer (P1)</name>
  <risk_id>PBR-BRUSH-003</risk_id>
  <severity>P1</severity>
  <symptom>Brush stroke position tidak sesuai dengan transform layer</sampai>
  <root_cause>Pointer coordinate tidak dikonversi ke transformed layer space</root_cause>
  <mitigation>
    Brush coordinate test dengan transformed layer.

    File target:
    - `apps/desktop/src/viewport/input-handler.ts`
    - File test: `src/__tests__/input-handler-brush-transform.test.ts`
    
    Action:
    - Test: brush stroke pada layer dengan scale 2x → stroke position benar
    - Test: brush stroke pada layer dengan rotation 45° → stroke position benar
    - Review apakah `getDocCoords` atau `handlePointerDown` perlu transform inverse
  </mitigation>
  <verify>Brush stroke position benar pada transformed layer</verify>
</task>

<!-- ═══════════════════════════════════════════════════════════ -->
<!-- AREA 6: TESTING & CI (P0 + P1)                              -->
<!-- ═══════════════════════════════════════════════════════════ -->

<task type="auto">
  <name>W2-TEST-001: CI Pipeline — GitHub Actions (P1)</name>
  <risk_id>PBR-TEST-004</risk_id>
  <severity>P1</severity>
  <symptom>Tidak ada automated CI — regression bisa terlewat</sampai>
  <root_cause>GitHub Actions pipeline belum fully functional</root_cause>
  <mitigation>
    Fix dan verify GitHub Actions CI.

    File target:
    - `.github/workflows/ci.yml`

    Action:
    - Review dan fix workflow (dari Wave 1 diketahui ada issue `vi.stubGlobal`)
    - Pastikan type-check dan test berjalan di CI
    - Pastikan Rust backend compile
    - Tambah step artifact untuk test reports
    - Verify di GitHub setelah push
    
    Catatan: test runner `bun test` vs `vitest run` sudah didiskusikan di Wave 1.
    Pastikan CI menggunakan command yang benar sesuai vite.config.ts.
  </mitigation>
  <verify>CI pipeline pass: type-check, tests, Rust build</verify>
</task>

<task type="auto">
  <name>W2-TEST-002: Pre-release Validation Script (P1)</name>
  <risk_id>PBR-TEST-006</risk_id>
  <severity>P1</severity>
  <symptom>Performance regression tidak terdeteksi sebelum rilis</sampai>
  <root_cause>Tidak ada routine startup/RAM/export-size measurement</root_cause>
  <mitigation>
    Update `scripts/validate-all.sh` dengan performance gates.

    File target:
    - `scripts/validate-all.sh` / `scripts/validate-all.ps1`

    Action:
    - Tambah step: startup time < 3s
    - Tambah step: idle RAM < 200MB
    - Tambah step: export 2000×2000 PNG < 5s
    
    Referensi: `docs/reference/performance-measurement-protocol.md`
  </mitigation>
  <verify>validate-all script termasuk performance gates</verify>
</task>

<!-- ═══════════════════════════════════════════════════════════ -->
<!-- AREA 7: SECURITY & RESILIENCY (P1)                          -->
<!-- ═══════════════════════════════════════════════════════════ -->

<task type="auto">
  <name>W2-SEC-001: Stale Timer/RAF Cleanup — Listener Leak (P1)</name>
  <risk_id>PBR-TEST-007</risk_id>
  <severity>P1</severity>
  <symptom>Long-running async atau RAF loop tetap aktif setelah test/user action</sampai>
  <root_cause>Missing cleanup untuk scheduler/timer/listener</root_cause>
  <mitigation>
    Cleanup audit untuk RAF, timers, dan window listeners.

    File target:
    - `apps/desktop/src/renderer/scheduler.ts`
    - `apps/desktop/src/components/editor/useBrushOverlay.ts`
    - `apps/desktop/src/viewport/viewportCamera.ts`

    Action:
    - Cari semua `requestAnimationFrame`, `setInterval`, `setTimeout` di codebase
    - Pastikan setiap RAF loop punya cancel mechanism
    - Pastikan setiap `addEventListener` punya `removeEventListener`
    - Tambah test: mount → unmount → assert RAF tidak running
  </mitigation>
  <verify>Tidak ada RAF/timer leak setelah unmount</verify>
</task>

</tasks>

<priority_matrix>

## Priority Matrix

Berdasarkan severity dan dampak user, berikut urutan prioritas eksekusi:

| Priority | Task ID | Area | Severity | Effort | Dampak |
|----------|---------|------|----------|--------|--------|
| **P0** | W2-GLOBAL-002 | Undo/redo gap | P0 | Medium | Data loss, undo rusak |
| **P0** | W2-GLOBAL-003 | Layer desync | P0 | Medium | Layer panel vs engine mismatch |
| **P0** | W2-VIEW-001 | Viewport drift | P0 | High | Pixels dan overlays terpisah |
| **P0** | W2-VIEW-002 | Scissor clipping | P0 | High | Pixels di luar artboard |
| **P0** | W2-EXPORT-001 | Export parity | P0 | High | Export beda dari visible canvas |
| **P0** | W2-EXPORT-002 | Magic bytes | P0 | Low | File rusak/tidak valid |
| **P0** | W2-EXPORT-003 | Save cancel | P0 | Low | Data overwrite |
| **P0** | W2-BRUSH-001 | Brush no-ops | P0 | Medium | Brush tidak kerja |
| **P0** | W2-BRUSH-002 | Paint locked layer | P0 | Medium | Lock guard miss |
| **P0** | W2-GLOBAL-001 | Tool routing test | P0 | Low | Gap coverage |
| **P1** | W2-VIEW-003 | Context loss | P1 | High | Blank screen |
| **P1** | W2-GLOBAL-004 | Pointer cancel | P1 | Medium | Stuck drag state |
| **P1** | W2-GLOBAL-005 | Tool state leak | P1 | Low | Cursor/states leak |
| **P1** | W2-LAYER-001 | Duplicate fields | P1 | Low | Data loss on merge |
| **P1** | W2-LAYER-002 | Lock guard matrix | P1 | Medium | Security gap |
| **P1** | W2-LAYER-003 | Wrong doc mutation | P1 | Medium | Multi-doc corruption |
| **P1** | W2-EXPORT-004 | Large export OOM | P1 | Low | Freeze/crash |
| **P1** | W2-EXPORT-005 | Export visibility | P1 | Low | Wrong export |
| **P1** | W2-BRUSH-003 | Brush offset | P1 | Medium | Wrong paint position |
| **P1** | W2-VIEW-004 | HiDPI buffer | P1 | Low | Blurry/memory heavy |
| **P1** | W2-TEST-001 | CI pipeline | P1 | Medium | No automated checks |
| **P1** | W2-TEST-002 | Perf gates | P1 | Medium | Regression risk |
| **P1** | W2-SEC-001 | Listener leak | P1 | Medium | RAF/timer leak |

</priority_matrix>

<execution_plan>

## Recommended Execution Order

### Wave 2A — Quick Wins (P0, effort rendah)
1. **W2-GLOBAL-001** — Perluas tool routing test (test only, 1 file)
2. **W2-GLOBAL-002** — Audit undo/redo gap + test (1-2 files)
3. **W2-EXPORT-002** — Magic byte test (test only, 1 file)
4. **W2-EXPORT-003** — Save cancel path test (test only, 1 file)

### Wave 2B — Core P0 (efort tinggi, dampak besar)
5. **W2-VIEW-001** — Viewport sync test (3-4 files)
6. **W2-VIEW-002** — Scissor test (2 files)
7. **W2-EXPORT-001** — Export parity test (2 files)
8. **W2-BRUSH-001/002** — Brush guard + no-ops fix (2-3 files)

### Wave 2C — P1 Fixes
9. **W2-GLOBAL-003/004/005** — Layer desync, pointer cancel, tool leak
10. **W2-LAYER-001/002/003** — Layer field preservation, lock matrix, multi-doc
11. **W2-BRUSH-003** — Brush offset on transformed layer
12. **W2-EXPORT-004/005** — Large export, visibility

### Wave 2D — Infrastructure
13. **W2-TEST-001** — CI pipeline fix
14. **W2-TEST-002** — Performance gates
15. **W2-VIEW-003/004** — Context loss, HiDPI
16. **W2-SEC-001** — Listener leak audit

</execution_plan>

<success_criteria>

## Success Criteria

- [ ] Semua P0 risk register items mitigated atau memiliki test guard
- [ ] Semua P1 risk register items memiliki test atau fix
- [ ] Tidak ada `history.commit()` yang dipanggil setelah mutation (W2-GLOBAL-002)
- [ ] Viewport sync test pass: camera, signal, engine konsisten setelah fit/zoom/pan
- [ ] Export pixel parity test pass: export === visible canvas
- [ ] Lock guard matrix test pass: locked/hidden layer tidak bisa dimodifikasi
- [ ] Multi-doc test pass: mutasi hanya affect active document
- [ ] Brush guard test pass: locked/hidden layer tidak bisa di-paint
- [ ] CI pipeline functional

</success_criteria>

<verification>

## Post-Wave 2 Verification Gates

```powershell
# Type-check
bun run type-check

# Test suite
bun run --filter photrez-desktop test

# Rust backend
cargo build -p photrez-desktop

# E2E (available tests)
bun run --filter photrez-desktop exec playwright test --project component-jsdom

# Manual smoke
bun run tauri dev
```

</verification>
