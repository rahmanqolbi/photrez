# Decision Log (Bahasa Indonesia)

Dokumen ini dipakai untuk melacak keputusan inti proyek secara ringkas.

## Status Keputusan

| Area | Keputusan | Status |
| --- | --- | --- |
| Nama kerja produk | `Photrez` | Locked (working name) |
| Positioning utama | Lightweight desktop image editor, workflow familiar, identitas Photrez mandiri | Locked |
| Messaging | Product-first (performa + workflow), open-source bukan headline utama | Locked |
| Target user utama | Content creator / UMKM | Locked |
| Platform v1 | Desktop Windows | Locked |
| Arsitektur (future target) | Hybrid modular: `Tauri shell + Rust core (photrez-core) + wgpu renderer (photrez-render)` | Locked (future) |
| Arsitektur (MVP runtime) | `Tauri shell + TypeScript DocumentEngine + WebGL2 renderer` â€” lihat Architecture Migration v2 | Locked (MVP) |
| Frontend | `SolidJS + TypeScript + Vite` | Locked |
| Scope MVP v1 | Layer basic, selection/move/transform dasar, crop/resize, brush/eraser, export JPG/PNG/WebP | Locked |
| Scope transform v1 | `Scale + rotate + flip` | Locked |
| Batas undo/redo v1 | `50 langkah` | Locked |
| Default color profile v1 | `sRGB` | Locked |
| Aturan lock nama final | Final brand name harus di-lock sebelum publikasi repo publik pertama (`README + logo + domain check`) | Locked |
| Budget performa | Installer `<80 MB`, idle RAM `<250 MB`, startup `<2 detik` | Locked |
| Lisensi arah | `AGPL-3.0-or-later` | Locked (policy level) |
| Standar handoff AI | Wajib pakai `docs/archive/planning/11-implementation-handoff.md` + `docs/archive/planning/12-agent-context-pack.md` untuk instruksi kerja | Locked |
| Gate eksekusi task | Wajib lolos DoR di `docs/archive/planning/14-definition-of-ready.md`; risiko aktif dilacak di `docs/decisions/risk-register.md` | Locked |
| Baseline kontrak IPC | Spesifikasi kontrak acuan ada di `docs/reference/command-contract-spec.md` dengan versi awal `1.0.0` | Locked |
| Protokol ukur performa | Bukti startup/RAM/installer wajib mengikuti `docs/reference/performance-measurement-protocol.md` | Locked |
| Matrix test milestone | Gate test per milestone wajib refer ke `docs/archive/planning/17-test-matrix-by-milestone.md` | Locked |
| CI verification gate | Gate verifikasi merge/release wajib mengacu `docs/archive/planning/18-ci-verification-plan.md` | Locked |
| CI template starter | Implementasi CI awal wajib mulai dari `docs/archive/planning/19-ci-job-template.md` agar konsisten | Locked |
| Template CI GitHub M1 | Untuk milestone M1, baseline workflow mengacu `docs/archive/planning/20-github-actions-m1-template.md` | Locked |
| Mapping command CI M1 | Penggantian placeholder command M1 wajib mengikuti `docs/archive/planning/21-m1-command-mapping-checklist.md` | Locked |
| UI style baseline | Implementasi UI wajib mengacu `docs/archive/planning/22-ui-style-guide.md`, `docs/reference/design-tokens.md`, dan `docs/archive/planning/24-ui-component-rules.md` | Locked |
| UX flow and UI copy baseline | Flow MVP dan wording UI wajib mengacu `docs/archive/planning/26-wireframe-layout-spec.md`, `docs/archive/planning/27-key-user-flows.md`, `docs/archive/planning/28-ui-copy-guidelines.md` | Locked |
| UI pre-implementation review gate | Implementasi UI baru boleh dimulai setelah lolos checklist di `docs/archive/planning/29-ui-review-checklist.md` | Locked |
| Full UI shell mockup baseline | Referensi visual lengkap desktop shell mengacu `docs/reference/ui-full-editor-mockup.html` | Locked |
| Dependency inventory baseline | Dependency audit dan policy wajib mengacu `docs/reference/dependency-inventory.md`; dependency baru wajib update file ini dulu | Locked |
| Keyboard shortcut baseline | Shortcut MVP wajib mengacu `docs/reference/keyboard-shortcut-map.md`; shortcut baru/ubah wajib update file ini dulu | Locked |
| File format support baseline | Format import/export wajib mengacu `docs/reference/file-format-support.md` | Locked |
| Document lifecycle baseline | Alur new/open/save/export/close wajib mengacu `docs/reference/save-and-document-lifecycle.md` | Locked |
| Error code registry baseline | Mapping error per skenario wajib mengacu `docs/reference/error-code-registry.md` | Locked |
| Terminology baseline | Istilah teknis dan produk wajib konsisten mengacu `docs/reference/glossary.md` | Locked |
| i18n strategy | MVP English-only; arsitektur harus mengikuti guardrails di `docs/archive/planning/37-i18n-strategy-note.md` | Locked |
| Ctrl+S behavior | Ctrl+S selalu memicu Export Dialog (bukan quick export langsung) untuk mencegah overwrite tanpa sengaja | Locked |
| UI direction lock (A/A/A/B/A/A) | Persona `Native desktop classic`, density `Compact`, menu `Full menu bar`, panel `Multi-tab`, icon `Outline monoline`, warna `Neutral blue-gray` | Locked |
| Accent color identity | **Photon Amber** (`#E15A17` / `#F97316` / `#C2410C`) â€” migrasi dari Studio Indigo (`#5C6AEA`). Alasan: identitas visual hangat yang mandiri, cocok untuk hardware-tooling feel | Locked |
| Ergonomic layout scaling | Menubar `36px` (dari 32), Toolbar `42px` (dari 38), Status `28px` (dari 26), Tool Rail `56px` (dari 48), Tool buttons `36Ã—36` (dari 32Ã—32), Lucide icons `20Ã—20` (dari 18Ã—18). Alasan: click target terlalu kecil di 1080p, accessibility | Locked |
| Scrollbar style | Ultra-slim `4px` WebKit scrollbar dengan `var(--color-text-muted)` thumb. Alasan: mengurangi noise visual, feel lebih native | Locked |
| Range slider style | Custom WebKit slider dengan Photon Amber thumb `14px`, glow shadow `rgba(225,90,23,0.45)`, hover scale `1.15x` | Locked |
| Usable MVP release gate | Milestone DONE tidak sama dengan release usable. Release candidate hanya valid setelah open-edit-export smoke test lulus dan `docs/archive/usable-mvp-recovery-plan.md` hijau. | Locked 2026-05-29 |
| Multi-document workspace MVP recovery | Photrez memakai document tab strip untuk setiap opened image sebagai document session/tab terpisah. Backend Rust owns `WorkspaceState` dan per-document editor truth. | Locked 2026-05-29 |

## Keputusan yang Masih Pending

- Tidak ada pending keputusan untuk tahap perencanaan saat ini (semua sudah di-lock).

## Definition of Done untuk Tahap Perencanaan

Tahap perencanaan saat ini dinyatakan selesai secara penuh.

Jika nama final berubah nanti, seluruh dokumen `docs/` harus disinkronkan.

## Tambahan Keputusan 2026-06-04

| Area | Keputusan | Status |
| ---- | --------- | ------ |
| Scalability refactor strategy | Refactor maintainability dilakukan bertahap per wave. `DocumentEngine` TypeScript tetap public MVP facade/source of truth; extraction dilakukan ke helper internal dan hook/UI module yang punya ownership jelas. Rust core/render tetap reference/future target sampai ada migration task eksplisit. | Locked 2026-06-04 |

## Tambahan Keputusan 2026-06-11

| Area | Keputusan | Status |
| ---- | --------- | ------ |
| Brush hardness rendering | Soft brush/eraser hardness menggunakan deterministic per-stroke distance-field alpha mask di TypeScript MVP hot path. Browser `shadowBlur` tidak dipakai sebagai model utama softness karena perceived diameter dan feather behavior menjadi bergantung pada implementasi blur browser. | Locked 2026-06-11 |
| Brush engine performance | Soft brush interactive rendering should move to cached brush-tip alpha masks plus incremental per-stroke max-alpha masks. The distance-field path is superseded for interactive use because its cost grows with stroke length and can feel laggy. The handoff plan explicitly requires replacing the `useBrushOverlay.ts` pointer-move preview path, not only the one-shot renderer. | Locked 2026-06-11 |
| Brush visual calibration | Calibrated the brush-tip alpha profile, tightened soft spacing, and implemented subpixel stamping with bilinear tip sampling to eliminate visible banding and periodic rounding artifacts in soft brush strokes. | Locked 2026-06-11 |

## Tambahan Keputusan 2026-06-13

| Area | Keputusan | Status |
| ---- | --------- | ------ |
| Viewport smooth zoom recovery | Do not ship the GPU camera viewport migration as originally planned until every editing tool shares one reactive viewport state and tool overlays have regression coverage. The initial migration split viewport ownership between WebGL camera state, SolidJS signals, and `DocumentEngine.viewport`, causing rendered pixels and overlays to diverge. Smooth zoom must be reintroduced behind a feature flag or as presentation-only interpolation after Move, Brush, Crop, and Navigator checks pass. **Phase 1 complete 2026-06-15**: Overlay container migrated to screen-space positioning in `CanvasViewport.tsx`, eliminating the last general-path CSS transform wrapper (test: 982/982 frontend, 19/19 E2E pass). Phases 2 (Modern Crop CSS path) and 3 (animated keyboard/scroll zoom) remain deferred. | Locked 2026-06-13 |

## Tambahan Keputusan 2026-06-17

| Area | Keputusan | Status |
| ---- | --------- | ------ |
| Production bug risk register | Potential production bug risks are tracked in `docs/production-risk-register/`, split by feature/tool area, with shared taxonomy and release gates. This complements `docs/decisions/risk-register.md`, which remains the milestone-level risk register. | Locked 2026-06-17 |
| FAANG-style review rejection register | Strict review blockers and quality-gate findings are tracked in `docs/faang-review-rejections/`, split by architecture/feature/tool area, with a remediation roadmap. This is a review-readiness register, not a confirmed bug list. | Locked 2026-06-17 |
| 6-month maintainability risk register | Medium-term maintainability risks are tracked in `docs/maintainability-risk-register/`, split by architecture/feature/tool area, with ownership signals and a six-month remediation roadmap. This is a tech-debt planning register, not a production bug list. | Locked 2026-06-17 |
| Ponytail refactor doctrine | Refactor-from-scratch planning is governed by `docs/ponytail-refactor-doctrine/`: delete/simplify first, prefer native and existing helpers, avoid framework-like abstractions, and introduce only the smallest module that removes real current complexity. | Locked 2026-06-17 |
| Cross-doc tab hover ownership | Cross-doc drag tab hover uses the existing `DragController` 500ms timer. `DragControllerProvider` must capture `EditorContext` during render, and canvas pointer drag may start/cancel the same timer from `elementFromPoint()` tab detection. No second hover subsystem. | Locked 2026-06-17 |
