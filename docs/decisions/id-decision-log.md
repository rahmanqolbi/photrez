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
| Production hardening gate | Local hardening uses `pnpm run verify` for frontend tests, production build, core Rust tests, and workspace Rust tests; browser-sensitive editor flows also require Playwright. Native OS drag/drop and dialogs remain explicit Tauri runtime release smoke items. | Locked 2026-06-17 |

## Tambahan Keputusan 2026-06-18

| Area | Keputusan | Status |
| ---- | --------- | ------ |
| Tauri shell contract baseline | Runtime shell contract baseline is `2.0.0` with exactly `ping`, `get_contract_info`, `read_file_bytes`, and `write_file_bytes`; docs must describe this runtime surface, while historical editor operations remain TypeScript hot-path behavior unless registered in Tauri. | Locked 2026-06-18 |
| File IO resource guard | MVP Tauri file read/write keeps base64 IPC for now but rejects payloads over 256MB with `E_RESOURCE_LIMIT`; streaming/chunked IO is deferred until large-file support becomes an explicit product requirement. | Locked 2026-06-18 |
| Static analysis and audit gates | Root `type-check`, `lint`, and `audit` scripts are required for review readiness. `lint` is currently a TypeScript static gate; `audit` requires network/tooling access and must be proven in CI or native release evidence. | Locked 2026-06-18 |

## Tambahan Keputusan 2026-06-19

| Area | Keputusan | Status |
| ---- | --------- | ------ |
| Brush hardness semantics | Brush/eraser size is the fixed outer paint diameter. Hardness may define the fully opaque core and feather rim width inside that diameter, but it must not change the outer brush area; opacity/flow remain independent from hardness. | Locked 2026-06-19 |
| Brush hardness 0 visual profile | Runtime `soft` brush tips must keep hardness 0 visually dense through the mid-radius before fading to the fixed outer edge, matching Photoshop-like soft round behavior more closely than a low-alpha center-heavy halo. | Locked 2026-06-19 |
| Soft brush cursor semantics | The displayed brush circle is the normal-size cursor/main diameter, not always the conservative full support radius. Runtime `soft` tips may keep a faint low-alpha tail beyond the visible circle at low hardness; non-soft curves and hard brushes keep exact radius cutoff. | Locked 2026-06-19 |
| Brush hardness perceptual mapping | Runtime `soft` hardness uses a perceptual core-radius map (`1 - (1 - hardness)^2`) rather than linear core radius, so 80% hardness behaves much closer to hard round and hardness 0 remains a light radial fade without a broad solid disk. | Locked 2026-06-19 |
| Brush dab spacing default | `getBrushDabSpacing` returns `Math.max(1, Math.round(size * 0.25))` — fixed 25% of brush size, independent of hardness and flow. This matches Photoshop default and produces visible individual dabs so a stroke reads as a brush stroke rather than a smooth blob. Hardness already controls the soft profile inside the mask; spacing stays geometry-agnostic. Future tuning can expose spacing as a slider without changing the algorithm. | Locked 2026-06-19 |
| Hard-brush path ownership | Hardness 100% uses the same mask-engine path as soft brushes. The previous `ctx.lineCap=round` shortcut in `paintStrokeRenderer.ts` and `useBrushOverlay.ts` was removed because it produced browser-dependent anti-aliasing and bypassed the brush-tip pipeline. `brushAlphaAtDistance` already returns 1 inside radius and 0 outside for hardness=1, so the mask path produces a hard edge with deterministic subpixel AA. | Locked 2026-06-19 |
| Brush per-dab accumulation | Within a single stroke, dab alphas accumulate via pre-multiplied source-over (`next = cur + round((255 - cur) * dab / 255)`) rather than max-within-stroke. This matches Photoshop / Krita / Procreate semantics where opacity 50% + ~10 passes reaches ~99% at the mask center, instead of staying capped at 50%. The previous `stampBrushTipMaxAlpha` is renamed to `stampBrushTip` to reflect the new accumulation semantics. | Locked 2026-06-19 |
| Soft curve mask formula | Runtime `soft` brush tip uses a smoothstep core+feather model: `alpha = 1` inside the solid core (`distance <= hardness * radius`) and `alpha = 1 - smoothstep((u - hardness) / (T - hardness))` across the feather region. This replaces the previous GIMP `gauss(pow(t, 0.4/(1-h)))` formula which faded ~2× faster at mid-radius (Photrez 0.44 vs Photoshop ~0.87 at h=0, t=0.25). The smoothstep curve has flat derivatives at both endpoints (C¹ continuous) and matches the visual feel of Photoshop / Krita / Procreate soft round at every hardness level. | Locked 2026-06-19 |
| Soft brush tail ratio | `SOFT_BRUSH_TAIL_RATIO` is 0.10 (10% of cursor radius) instead of the previous 0.22. The smaller tail matches Photoshop's behavior where softness 0 paints a faint low-alpha tail just past the visible cursor circle without expanding the brush area noticeably. Hard brushes keep the exact cursor cutoff (no tail expansion). | Locked 2026-06-19 |
| Soft brush visible edge alpha | The soft curve keeps `alpha = 0.50` (strongly visible) at the cursor edge so the visual cursor indicator matches where the brush actually paints and the brush footprint fills the entire cursor visual size. After the cursor edge the alpha fades linearly to 0 over `SOFT_BRUSH_TAIL_RATIO = 0.10` (feather overshoot past the cursor). The combination of strong edge alpha + the cursor being rendered as a soft filled circle (matching the paint profile) means the user perceives the brush body and cursor as the same shape. | Locked 2026-06-19 |
| Brush cursor visual = simple sharp stroke | The cursor is rendered as a sharp stroked circle (dark + white, two concentric strokes plus a crosshair) at the brush size. The user prefers the original clean stroke over a soft filled preview because soft fills caused visible color-inversion artifacts (mix-blend-mode: difference) on the canvas. The paint behavior already matches the brush size and feather profile, so the cursor just needs to mark the boundary. Locked 2026-06-19 (revert). | Locked 2026-06-19 |

## Tambahan Keputusan 2026-06-20

| Area | Keputusan | Status |
| ---- | --------- | ------ |
| Brush/eraser footprint boundary | `Size / 2` is the sole support radius for every hardness. Runtime alpha is 1 inside `hardness * radius`, feathers to 0 at `radius`, and remains 0 outside. This supersedes the 2026-06-19 soft-tail, visible-edge-alpha, and perceptual-core entries; hardness changes only the profile inside the footprint. | Locked 2026-06-20 |
| Brush/eraser feather curve | Inside the fixed support radius, the current feather uses inverse-quadratic falloff `alpha = 1 - t²` after the hardness-defined solid core. This supersedes the smoothstep formula while preserving the exact footprint boundary. | Locked 2026-06-20 |
| Post-MVP requested UI backlog | History Panel, native menu integration, window state persistence, a general context-menu system, tooltip system, and modal/dialog system remain desired work. They are planned after release-candidate native evidence and do not expand the locked MVP release gate. | Planned post-MVP 2026-06-20 |
| Window state persistence (storage) | Window state persistence is implemented in `main.rs` using core Tauri APIs only: `setup` reads `%APPDATA%\com.photrez.app\window-state.json` and applies saved size/position/maximized; `on_window_event` writes the same file on `CloseRequested`. No third-party plugin, no custom IPC commands, no frontend code. Rationale: Ponytail rung #1 (YAGNI — only four fields needed) + rung #2 (stdlib `std::fs` + `serde_json` cover the persistence layer) + rung #3 (Tauri core APIs `set_size`, `set_position`, `maximize`, `inner_size`, `outer_position`, `is_maximized`, `on_window_event` cover the apply + save layer). Originally planned with `tauri-plugin-window-state`, but adding that plugin broke all Tauri IPC commands at runtime (every core command returned `Plugin not found`) — root cause unresolved; plugin was removed. | Locked 2026-06-20 |
| Window state persistence (scope) | Persist exactly four fields: `width`, `height`, `x` (optional), `y` (optional), `maximized`. Position is `Option<i32>` so first-launch behavior is a no-op (defaults skip `set_position` entirely, no visual jump to (0,0)). Save on `WindowEvent::CloseRequested` only (no debounced save) — Ponytail rung #1 (YAGNI: state loss on crash is acceptable; user just gets default size next launch). Multi-monitor and fullscreen handling deferred until an explicit product requirement appears; the on-disk format leaves room for `fullscreen` to be added without breaking older files (`#[serde(default)]` pattern on `Option` fields). Upgrade path: add `fullscreen: bool` field and `WindowEvent::Resized` debounce if user reports state loss. | Locked 2026-06-20 |
| Native menu ownership | The Tauri 2 native menu mirrors rather than replaces the custom title-bar menu. Rust owns menu construction and forwards only known editor IDs through `photrez://native-menu`; `useEditorCommands` owns editor mutations shared by native events, DOM shortcuts, and title-bar controls. Window/Quit/About and text Cut/Copy/Paste remain Tauri predefined native actions. | Locked 2026-06-21 |
| Custom application menu behavior | Every title-bar heading opens a compact dropdown; headings never execute a command directly. File, Edit, Image, Layer, View, Window, and Help expose only working commands. The dropdown surface owns focus/navigation/dismissal, while `useEditorCommands` remains the sole mutation router shared with the native Tauri menu. | Locked 2026-06-21 |
| Edit and Layer menu ownership | Edit selection actions reuse `SelectionOperations`; Layer actions reuse `useLayerActions`, including pre-mutation history commits, texture synchronization, transform-session cancellation, and delete confirmation. The native Layer submenu forwards the same stable IDs through `photrez://native-menu`. | Locked 2026-06-21 |
| Inverted rectangular selection semantics | `SelectionState.inverted=true` means all canvas pixels outside the stored rectangle are selected. The rectangle remains the excluded hole; copy emits a full-layer bitmap with a transparent hole, destructive operations affect the four outer bands, and transform handles are disabled because the complement is not one transformable rectangle. | Locked 2026-06-21 |
| Context menu command ownership | Canvas context-menu items dispatch typed editor command IDs through `photrez://editor-command`; the mounted `useEditorCommands` router remains the sole mutation owner shared with native and title-bar menus. Layer-row context actions reuse `useLayerActions` after activating the right-click target. | Locked 2026-06-21 |
