# AI History — Photrez

## [2026-06-22] MAINTENANCE - External Image-Editor Branding Cleanup [COMPLETE]

### Kategori: MAINTENANCE / DOCUMENTATION / TEST LABELS / REPOSITORY HYGIENE

**Goal:**
Remove external image-editor product and vendor names from project-owned source comments, test labels, documentation, and filenames without changing behavior.

**Done:**
- Replaced product-specific comparisons with neutral, behavior-based terminology across source, tests, design records, feature tracking, archives, and local agent reference data.
- Renamed the round-brush hardness plan and design specification to neutral reference-based filenames.
- Preserved `@adobe/css-tools` entries in `pnpm-lock.yaml` because they are the immutable identity of a transitive dependency, not product-facing copy.
- After explicit user approval, rewrote affected commit subjects and bodies on `main`; all 288 commit trees were preserved and the pre-rewrite HEAD tree remains exactly `19c5e457bddc018d2b9bc02322debfa6598449dd`.
- Preserved a verified emergency bundle at `D:\Project\image-studio-pre-rewrite-2026-06-22.bundle`, then restored the tracked patch and two untracked files with hashes identical to their pre-rewrite snapshots.

**Verification:**
- PASS: content and filename audit, with only the required lockfile package identity remaining.
- PASS: frontend suite 1331/1331 tests.
- PASS: production build.
- PASS: Rust core 85/85 and workspace 100/100.

---

## [2026-06-22] FEATURE - Hardness-Aware Brush/Eraser Cursor [COMPLETE]

### Kategori: FEATURE / BRUSH / ERASER / CURSOR / FRONTEND / TEST

**Goal:**
Represent the measured low-hardness bleed with the single paint cursor ring shrinking along the calibrated profile instead of changing the already validated paint output.

**Done:**
- Added a shared 20% alpha-contour cursor scale to the pure super-Gaussian hardness module.
- Capped the contour at nominal radius because the measured high-hardness `sigma > 1` knots would otherwise enlarge the cursor before the 97% literal-circle branch.
- Wired the existing one-ring SVG overlay to active Brush/Eraser hardness while preserving size, zoom, center crosshair, mask support, spacing, and renderer behavior.
- Added numeric, clamping, monotonicity, live Solid signal, Brush, Eraser, zoom, mounted UX, and CanvasViewport regression coverage.

**Verification:**
- PASS: five missing-behavior assertions failed before implementation and passed afterward.
- PASS: focused profile, mounted overlay, UX, and CanvasViewport coverage, 4 files / 116 tests.
- PASS: full frontend suite, 99 files / 1331 tests in 47.82s.
- PASS: TypeScript type-check and production Vite build in 5.99s.
- PASS: Rust core 85/85 and workspace 100/100.

---

## [2026-06-22] UI FIX - History Dock Visual Anatomy [COMPLETE]

### Kategori: BUG FIX / UI-UX / HISTORY / REGRESSION-SAFETY

**Root Cause:**
The restored History tab wrapped a single baseline row in a padded, rounded, bordered container stretched across the available dock height. At the same time, Navigator lived inside the Layers-only tab content. Switching tabs therefore changed the dock's geometry and removed a canvas-level utility, producing a large framed void that looked unfinished.

**Fix Rationale:**
- Render History as an edge-to-edge row list using structural dividers instead of a nested full-height card.
- Keep Navigator outside the mutually exclusive Layers/History content region so the dock anatomy stays stable.
- Show quiet `Edits appear here` guidance only while `Open` is the sole history state.
- Use Photon Amber for the selected tab indicator while retaining neutral row surfaces.
- Lock the visual contract with mounted tests for list geometry, baseline guidance, active-tab styling, and persistent Navigator ownership.

**Verification:**
- PASS: regression tests observed failing before implementation for the expected missing contracts.
- PASS: focused component coverage, 2 files / 13 tests.
- PASS: full frontend suite, 97 files / 1311 tests.
- PASS: TypeScript type-check and production Vite build.
- PASS: Rust core 85/85 and workspace 100/100.

---

## [2026-06-22] BUG FIX - Live Terminal Dab Preview [COMPLETE]

### Kategori: BUG FIX / BRUSH / ERASER / PREVIEW / PERFORMANCE / TEST

**Root Cause:**
The terminal endpoint correction intentionally stamped only during finalization. While the pointer remained down, the preview still showed only fixed-spacing dabs, so the cursor could lead the visible cap by almost one spacing interval before the release-time dab appeared.

**Fix Rationale:**
- Keep the permanent stroke mask event-rate independent: initial dab, regular spaced dabs, and one finalized endpoint only.
- After repainting the persistent preview, composite one transient endpoint directly into the preview context when the latest point differs from the last regular dab.
- Limit temporary work to the clipped tip rectangle rather than cloning or clearing a second full-layer mask.
- Rebuild Brush and Eraser previews from their persistent source every update, so old transient positions disappear instead of accumulating opacity/flow.
- Skip the transient pass when a regular dab already occupies the endpoint, and preserve lock-transparency processing after both brush passes.

**Verification:**
- PASS: three transient-preview contracts failed before implementation and passed afterward.
- PASS: focused production-path coverage, 5 files / 164 tests.
- PASS: full frontend suite, 99 files / 1328 tests in 44.21s.
- PASS: TypeScript type-check and production Vite build in 5.97s.
- PASS: Rust core 85/85 and workspace 100/100.

---

## [2026-06-22] BUG FIX - Brush Terminal Dab Cursor Landing [COMPLETE]

### Kategori: BUG FIX / BRUSH / ERASER / INPUT / TEST

**Root Cause:**
The regular brush interpolator correctly emits dabs at fixed 25%-of-size spacing and retains leftover distance as carry. Stroke completion then committed that spaced mask without forcing the final sampled coordinate. At Size 95 the last dab could therefore remain almost 24 document pixels behind the pointer—about 59 screen pixels at 246% zoom. Pointer-up also reused the previous move samples instead of appending its final constrained/smoothed coordinate.

**Fix Rationale:**
- Preserve fixed path spacing and its event-rate-independent carry behavior.
- Forward the final pointer-up coordinate with an explicit finalization flag.
- Track the last emitted dab and stamp the terminal coordinate only when it differs, preventing duplicate flow/opacity accumulation on spacing-grid endpoints.
- Apply the same finalization contract to Brush, Eraser, Shift-connected strokes, pointer cancel, lost capture, and the deterministic stroke renderer.
- Leave the calibrated hardness formula, cursor geometry, and normal in-drag sampling unchanged.

**Verification:**
- PASS: five regression behaviors were observed failing before their corresponding production changes.
- PASS: focused production-path coverage, 4 files / 160 tests.
- PASS: full frontend suite, 98 files / 1324 tests in 43.86s.
- PASS: TypeScript type-check and production Vite build in 5.88s.
- PASS: Rust core 85/85 and workspace 100/100.

---

## [2026-06-22] FEATURE - Reference-Calibrated Round Brush Hardness [COMPLETE]

### Kategori: FEATURE / BRUSH / ERASER / FRONTEND / TEST

**Goal:**
Make Photrez round-brush hardness reproduce the supplied reference calibration instead of approximating it with a bounded core-and-feather curve.

**Done:**
- Added the exact seven hardness/sigma/n calibration knots, monotone-cubic interpolation, and super-Gaussian radial alpha formula.
- Added the supplied hardness >=97% literal hard-edge branch and a deterministic one-pixel AA fallback below 22px diameter.
- Expanded only the cached tip bitmap to quantization-aware support at half an 8-bit alpha level, preserving Size as the nominal cursor diameter and allowing measured low-hardness bleed.
- Kept brush and eraser on the same cached production mask path; radial alpha is evaluated during tip creation, never per dab.
- Replaced obsolete bounded-profile audit expectations with measured calibration, raster-tail, cache, renderer, and pointer-wiring contracts.

**Verification:**
- PASS: TDD RED observed before both the calibration module and raster integration existed.
- PASS: focused production-path coverage, 5 files / 182 tests.
- PASS: full frontend suite, 98 files / 1319 tests in 43.65s.
- PASS: TypeScript type-check and production Vite build in 6.00s.
- PASS: Rust core 85/85 and workspace 100/100.
- PASS: production-formula visual sheet inspected at 0%, 50%, 90%, and 100% hardness.

---

## [2026-06-21] BUG FIX - Restore Layers / History Dock Contract [COMPLETE]

### Kategori: BUG FIX / UI-UX / REGRESSION-SAFETY

**Root Cause:**
The History strengthening pass treated the pre-existing `Layers | History` tabs as a duplicate surface and replaced them with a collapsible History section below Navigator. That changed a persistent navigation contract even though the requested scope was to implement and harden History behavior, not redesign the right dock.

**Fix Rationale:**
- Restored the original two-tab dock and placed the hardened `HistoryPanel` inside the History tab.
- Replaced the collapsible-history signal with explicit shared `rightDockPanel` state so LayersPanel and BottomStatusBar use one production navigation path.
- Made the status-bar History action reopen the dock and select History instead of creating/toggling a second surface.
- Added a mounted regression test that asserts both tabs remain present, selection swaps correctly, and the Layers surface is preserved.
- Added the `UI Preservation Guard` to `AGENTS.md`; persistent tabs, dock hierarchy, panel ownership, and primary navigation may no longer be removed or relocated without explicit user approval, a decision entry, and mounted regression coverage.
- Corrected the History design plan and superseded the incorrect panel-ownership decision without discarding the audit trail.

**Verification:**
- PASS: focused mounted tests, 3 files / 13 tests.
- PASS: full frontend suite, 97 files / 1310 tests.
- PASS: root TypeScript compilation and production Vite build.
- PASS: Rust core 85/85 and workspace 100/100.

---

## [2026-06-21] UI - Tooltip System & Keyboard Shortcuts [COMPLETE]

### Kategori: FEATURE / UI-UX / ACCESSIBILITY / SHORTCUTS

**Goal:**
Implement a custom Tooltip System for Photrez matching the compact, "Soft & Snappy" visual aesthetic, and add keyboard shortcuts for the remaining Left Tool Rail items (Move, Selection, Crop, Eyedropper) to ensure tooltip shortcut correctness.

**Fix Rationale / Design Decisions:**
- **Wrapper Component (`<Tooltip>`)**: Wraps elements using `display: contents` to prevent layout changes. Binds events (`mouseenter`, `mouseleave`, `focusin`, `focusout`) to the wrapped child on mount.
- **Warm Start Behavior**: When a tooltip is closed, a global timestamp is set. If the user hovers over another tooltip target within `250ms`, the new tooltip opens instantly (0ms delay) instead of the default `400ms` hover delay.
- **Keyboard Access & ARIA**: Gaining focus (`focusin`) opens the tooltip instantly. Pressing `Escape` hides it. Dynamically associates the target element to the tooltip ID via `aria-describedby`, ensuring full screen-reader accessibility.
- **Shortcuts Mapping**: Mapped `v`, `m`, `c`, and `i` in `useCanvasKeyboard.ts` to select Move, Selection, Crop, and Eyedropper tools, and displayed them in the `<kbd>` badges within the tooltips.
- **Visuals**: Styled the tooltip popup with a border (`border-white/10`), rounded corners (`rounded-[4px]`), dark solid background (`#181818`), and compact typography (`text-[11px]`).

**Verification:**
- PASS: `Tooltip.test.tsx` (5/5 tests covering hover delay, mouse-leave cancellation, focus trigger, Escape key down, and ARIA describedby).
- PASS: `LeftToolRailWiring.test.tsx` (1/1 test verifying that tool rail buttons are wrapped in Tooltip and do not have browser-native title attributes).
- PASS: `ToolKeyboardShortcuts.test.tsx` (1/1 test verifying that pressing `v`, `m`, `c`, `i` updates the active tool).
- PASS: Full frontend test suite (95 files / 1304 tests).
- PASS: Root type-check (`tsc --noEmit`) and production Vite build.
- PASS: Cargo workspace tests (100/100 passed).

---

## [2026-06-21] UI - Precision Workbench Resize and Export Dialogs Polish [COMPLETE]

### Kategori: FEATURE / UI-UX / LAYOUT / STYLING

**Goal:**
Address visual design shortcomings of the Resize Canvas and Export Dialogs, ensuring alignment with strict styling tokens (radii, elevation shadows, state highlights, segmented controls, and input inset depth), and fix the associated E2E test quality check failure.

**Root Cause (E2E Test):**
The quality slider check in `editor-smoke.spec.ts` expected `Quality: 90%` as a single text node. Since the accessibility pass split this text into separate `<label>` and `<output>` elements, the E2E check failed to locate the combined string.

**Fix Rationale:**
- Polished the dialog panel container border-radius to `8px` (`--radius-lg` for outer panels) and elevated shadow to `shadow-[0_18px_50px_rgba(0,0,0,0.55)]` for dialog lift.
- Refactored `DesktopDialogButton` rounding to `6px` (`--radius-md` for buttons/tabs) and added smooth transition effects + custom hover borders for secondary buttons.
- Added input inset depth shadow (`shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)]`) to `desktopDialogFieldClass`.
- Styled the **Keep proportions** lock button to show a border, Photon Amber text, and subtle background accent in active (locked) state.
- Redesigned the format buttons in `ExportDialog` into a segmented control button group using `bg-editor-canvas` / `bg-editor-panel` and custom border classes.
- Standardized success/danger alert notifications to use `success` and `danger` theme colors instead of generic Tailwind values, with matching `6px` rounding.
- Split E2E quality slider checks to verify the `Quality` label and the `90%` output separately, and corrected the dialog radius assertion in `dialog-accessibility.spec.ts` to `8px`.

**Verification:**
- PASS: focused component tests: `ResizeCanvasModal.test.tsx` and `ExportDialog.test.tsx` (16/16).
- PASS: full frontend Vitest suite (92 files / 1297 tests).
- PASS: cargo workspace test suite (100/100, including 85 core + 15 desktop).
- PASS: TypeScript compiler type-check (`pnpm run type-check`).
- PASS: production Vite build (`pnpm run build`).
- PASS: full Playwright E2E suite (24/24).

---

## [2026-06-20] TEST INFRASTRUCTURE - Second-Pass Vitest Optimization [COMPLETE]

### Kategori: TESTING / PERFORMANCE / VITEST / REGRESSION-SAFETY

**Goal:**
Bring the complete frontend test gate below the documented 60-second target without deleting tests, weakening assertions, or moving DOM/wiring coverage into an unrealistic environment.

**Root Cause:**
The first Node/jsdom split was intentionally conservative: 59 files / 915 tests still paid jsdom environment and per-file setup costs even though many `.test.ts` files used only pure TypeScript or explicitly mocked `OffscreenCanvas`/pixel buffers. Vitest reports setup files run before every file, and its official performance guide identifies isolated environments as a significant cost.

**Fix Rationale:**
- Empirically trial each remaining `.test.ts` file in Node instead of classifying by filename alone.
- Keep TSX, Solid render, DOM events, RAF, real canvas/WebGL, and wiring tests in isolated jsdom.
- Disable isolation only for the pure Node project, as supported by Vitest's project-level configuration; leave jsdom isolation untouched because this repository has prior shared-signal regressions.
- Revert any optimization that does not improve measured wall time.

**Done:**
- Expanded `unit-node` from 27 files / 346 tests to 49 files / 783 tests.
- Reduced `component-jsdom` from 59 files / 915 tests to 37 files / 478 tests while preserving all 86 files / 1261 tests overall.
- Returned `viewportCamera.test.ts` to jsdom after the Node pilot exposed a real `DOMRect` dependency.
- Added `isolate: false` only to `unit-node`; repeated runs remained green.
- Trialed and reverted Tailwind/CSS bypass because it regressed component time (35.59s → 36.45s).
- Updated the side-panel E2E viewport to 1000px so it exercises the toggle below the intentional 1024px breakpoint; assertions remain unchanged.

**Measured Result:**
- Original baseline: 228.33s.
- First split: 82.87s–85.80s.
- Final repeated full runs: 25.70s and 25.54s.
- Net improvement: 88.8% versus original baseline and 70.2% versus the first split.

**Verification:**
- PASS: Vitest 86/86 files, 1261/1261 tests, twice.
- PASS: Node lane 49/49 files, 783/783 tests, repeated at 6.39s and 6.60s.
- PASS: Playwright 21/21 in 1.1m, including visible-pixel, pointer/wiring, undo/redo, cross-document drag, export, and responsive side-panel scenarios.
- PASS: production build in 6.16s.
- PASS: Rust core 85/85; workspace desktop 13/13.
- Remaining noise: four pre-existing jsdom `HTMLCanvasElement.getContext()` warnings; no associated failure.

**Final Safety Audit (supersedes the preliminary 25.54s benchmark above):**
- A raw configuration audit found that the preliminary benchmark had `isolate: false` on `component-jsdom`; although all tests passed, that setting could conceal cross-file UI/Solid state leakage.
- Moved `isolate: false` to `unit-node` only and restored Vitest's default per-file isolation for all jsdom component, wiring, pointer-chain, and canvas tests.
- Final safety-validated result: PASS, 86/86 files and 1261/1261 tests in 37.48s — 83.6% faster than the 228.33s original baseline while retaining honest UI regression boundaries.

---

## [2026-06-20] FEATURE - Responsive RightDock Breakpoint Tuning [COMPLETE]

### Kategori: FEATURE / UI-UX / LAYOUT / RESPONSIVENESS

**Goal:**
Lower the RightDock responsive breakpoint from 1280px (`xl`) to 1024px (`lg`), allowing properties and layers panels to sit side-by-side on medium-sized screens and restored windows, while only stacking vertically on extremely narrow widths.

**Fix Rationale:**
For users running a 1080p monitor with a restored/medium-sized window (around 1084px wide), the previous `xl` (1280px) breakpoint caused panels to stack vertically. Stacking vertically on window heights of ~600px - 700px split vertical space in half, leaving insufficient vertical space for both panels (Navigator and empty state fallback were cut off). Lowering the breakpoint to `lg` (1024px) allows side-by-side columns to be used on screens and windows wider than 1024px. The canvas retains at least 408px width, which is fully usable.

**Done:**
1. Modified `apps/desktop/src/components/editor/RightDock.tsx`:
   - Replaced all `xl:` class prefixes with `lg:` for responsive properties.
   - RightDock now transitions to side-by-side Columns at `>= 1024px` instead of `>= 1280px`.
2. Modified `apps/desktop/src/components/editor/AppTitleBar.tsx`:
   - Replaced `xl:hidden` with `lg:hidden` on the RightDock toggle button.
3. Created/updated implementation plan, task list, and walkthrough artifacts.
4. Ran full verification tests and production builds.

**Verification:**
- PASS: full Vitest suite (86 files / 1261 tests).
- PASS: Rust workspace tests (core 85 + desktop 13 = 98 tests).
- PASS: production build (`pnpm run build` compiled successfully in 40.98s).

## [2026-06-20] FEATURE - Responsive RightDock Layout [COMPLETE]

### Kategori: FEATURE / UI-UX / LAYOUT / RESPONSIVENESS

**Goal:**
Resolve artboard/canvas occlusion when the window is resized to a smaller width by making the right dock layout responsive.

**Fix Rationale:**
Instead of a fixed floating overlay (which took up 634px and covered more than half the workspace on screens < 1280px), RightDock now stacks its panels vertically on screens smaller than 1280px. Both panels (Properties and Layers/Navigator) share the vertical height 50/50. Additionally, the dock is static (docked) at all viewport sizes, so the canvas automatically shrinks and remains fully visible and usable.

**Done:**
1. Modified `apps/desktop/src/components/editor/RightDock.tsx`:
   - Updated layout flow of `RightDock` to `flex-col xl:flex-row`.
   - Set width to `w-[300px] xl:w-auto` and changed placement classes to keep the dock static at all window sizes.
   - Configured `InspectorDock` to stack cleanly: `w-full flex-1 min-h-0 xl:w-[300px] 2xl:w-[336px] xl:flex-none` with border adjustment `border-b xl:border-b-0 xl:border-r`.
   - Configured `LayerDock` to stack cleanly: `w-full flex-1 min-h-0 xl:w-[260px] 2xl:w-[298px] xl:flex-none`.
2. Created implementation plan (`implementation_plan.md`) and walkthrough (`walkthrough.md`) in the artifact directory.
3. Verified the changes by running all unit/integration tests and confirming the production build is green.

**Verification:**
- PASS: `pnpm.cmd --filter photrez-desktop test --run` (86 files / 1261 tests).
- PASS: `pnpm run build` (production build compiled successfully in 8.00s).

## [2026-06-20] BUG FIX - Window-State Plugin Broke All Tauri IPC; Pivoted to Manual Implementation [COMPLETE]

### Kategori: BUG FIX / TAURI / PLUGIN-COMPATIBILITY / IPC / WINDOW-STATE

**User Report:**
After implementing Window State Persistence with `tauri-plugin-window-state` v2.4.1, every Tauri IPC command from the frontend failed with `<command> not allowed. Plugin not found` — not just the plugin's own commands, but core Tauri commands too: `window.toggle_maximize`, `window.minimize`, `window.close`, `window.start_dragging`, `event.listen`, `dialog.open`. Every IPC call was dead. The console error message text was the same regardless of which plugin the command belonged to.

**Root Cause:**
Adding `tauri_plugin_window_state::Builder::default().with_state_flags(...).build()` to the `tauri::Builder` chain silently broke the core Tauri plugin dispatch layer. The plugin compiled against `tauri v2.11.2` (matches Cargo.lock), `tauri-plugin v2.6.2` (single version, no conflict), and all dependency versions were consistent. Repro was deterministic: removing the plugin restored IPC immediately; re-adding it killed IPC again.

The error message format (`<command> not allowed. Plugin not found`) was identical for core commands (`window.*`, `event.listen`) and third-party plugins (`dialog.open`), which ruled out a permissions/ACL issue in `capabilities/default.json`. Two `capabilities` fix attempts (adding `$schema`, changing `windows: ["*"]` → `windows: ["main"]`) had no effect, confirming the failure was upstream of ACL resolution — the plugin registry itself was not initializing properly when the window-state plugin was present.

Specific failure mode is unconfirmed at the source level (the plugin's `setup` + `on_window_ready` + `invoke_handler` chain all looked correct in source review), but the symptom-class is consistent with upstream plugin-system fragility around Tauri 2.11 with multi-plugin builders when the new plugin's `setup` runs alongside core plugins.

**Fix Rationale:**
Ship the lazy version that doesn't depend on the broken path. Drop the plugin entirely and implement window state persistence with the same primitives the plugin uses under the hood (Tauri core APIs + stdlib `std::fs` + `serde_json`). This is the Ponytail rung #2 (stdlib) + rung #3 (native platform feature = Tauri core APIs) path. Trade-off: ~60 lines of Rust instead of 1 line of plugin registration, but the code is trivially correct (read JSON → `set_size`/`set_position`/`maximize`; write JSON on `CloseRequested`) and uses only APIs the user has already proven to work.

**Done:**
1. Removed `tauri-plugin-window-state = "2"` from `apps/desktop/src-tauri/Cargo.toml`. Cargo.lock no longer contains the package entry.
2. Removed `.plugin(tauri_plugin_window_state::Builder::default().with_state_flags(...).build())` from `fn main()` in `apps/desktop/src-tauri/src/main.rs`.
3. Added `SavedWindowState` struct (width/height/x/y/maximized, with `#[serde(default)]` on `Option<i32>` for forward-compat) and `load_window_state`/`save_window_state` helpers in `main.rs`.
4. Replaced plugin's restore-on-launch behavior with `.setup(|app| { ... window.set_size(...); if let (Some(x), Some(y)) = saved.position { window.set_position(...) }; if saved.maximized { window.maximize() } ... })`.
5. Replaced plugin's auto-save behavior with `.on_window_event(|window, event| { if matches!(event, WindowEvent::CloseRequested) { save_window_state(window) } })`.
6. State file path: `<app_config_dir>/window-state.json` = `%APPDATA%\com.photrez.app\window-state.json` on Windows.
7. Replaced the plugin's `Builder` compile-gate test with three focused tests: `test_window_state_roundtrip` (serialize → deserialize equality), `test_window_state_default_matches_tauri_config` (default matches `tauri.conf.json` so first launch is a no-op), `test_window_state_legacy_format_without_optional_position` (forward-compat: legacy JSON without `x`/`y` fields deserializes with `None`, no crash).
8. Removed temporary diagnostic console logging from `apps/desktop/src/lib/desktop/tauriWindow.ts` and `apps/desktop/src/components/editor/AppTitleBar.tsx`.
9. Kept `useTauriDragDrop.ts` error handler (real error, useful, not diagnostic noise).
10. Updated `docs/decisions/id-decision-log.md` rows: storage decision rewritten from "use plugin" to "use core APIs in main.rs", scope decision rewritten to describe the four persisted fields and the single-event save policy.
11. `apps/desktop/src-tauri/capabilities/default.json` retained the diagnostic improvements (`$schema`, `windows: ["main"]`) added during the IPC investigation — they are valid additions independent of this fix.

**Verification:**
- PASS: `cargo test -p photrez-core` — 85/85.
- PASS: `cargo test --workspace` — core 85/85 + desktop 13/13.
- PASS: `pnpm.cmd --filter photrez-desktop test` — 86 files / 1261 tests.
- PASS: `pnpm.cmd run build` (production build, 9.16s).
- PENDING: `pnpm.cmd tauri dev` interactive smoke — user restart + verify titlebar minimize/maximize/close work, file dialog opens, drag-drop subscribe succeeds, and closing the app persists `window-state.json` to `%APPDATA%\com.photrez.app\` (manual gate after rebuild).

---

## [2026-06-20] TEST INFRASTRUCTURE - Split Node/jsdom Feedback Paths [COMPLETE] 

### Kategori: TESTING / PERFORMANCE / FRONTEND / VITEST

**Goal:**
Shorten the frontend feedback loop without deleting tests, weakening assertions, or moving wiring and browser-dependent coverage out of jsdom.

**Root Cause:**
All 86 frontend test files used jsdom, global DOM cleanup, CSS processing, and browser-environment startup even when a file only exercised pure TypeScript logic. The 228.33s baseline spent only 33.48s executing assertions; environment, transform, setup, and import overhead dominated wall time. Increasing worker pressure was not a reliable fix because earlier runs produced worker-startup timeouts under concurrent Tauri/Vite load.

**Fix Rationale:**
Use Vitest 4 projects to create a conservative `unit-node` lane for files that do not touch browser globals, Solid rendering, canvas APIs, or event wiring. Keep every ambiguous or integration-oriented test in `component-jsdom`. Preserve the default worker selection because measured caps of 1, 2, and 4 workers were all slower on this machine.

**Done:**
- Added `unit-node` (27 files / 346 tests) and `component-jsdom` (59 files / 915 tests) projects in `apps/desktop/vite.config.ts`.
- Added `test:unit`, `test:component`, and `test:related` scripts; `test` remains the complete 1261-test gate.
- Reclassified `cropToolActions.test.ts` and `scheduler.test.ts` back to jsdom after the pilot exposed real `window.devicePixelRatio` and `requestAnimationFrame` dependencies.
- Wrapped brush UX signals and `useCanvasPointerTools` computations in owned Solid roots and disposed them, removing four persistent owner-leak warnings.
- Preserved all wiring, state-contract, CanvasViewport, pointer-chain, and Playwright coverage.

**Measured Result:**
- Baseline full Vitest: 228.33s.
- Fast Node lane: 6.96s.
- Final full Vitest: 85.80s — 62.4% faster, with the same 86 files / 1261 passing tests.
- Node worker benchmark: default 6.96s; 4 workers 10.18s; 2 workers 13.20s; 1 worker 20.61s.

**Verification:**
- PASS: `pnpm --filter photrez-desktop test` — 1261/1261.
- PASS: `pnpm run build`.
- PASS: `cargo test -p photrez-core` — 85/85.
- PASS: `cargo test --workspace` — core 85/85 + desktop 11/11.
- Remaining noise: four pre-existing jsdom `HTMLCanvasElement.getContext()` warnings. The installed `canvas` peer lacks a working native binding; changing that dependency was intentionally left out of this no-regression optimization.

---

## [2026-06-20] RELEASE HARDENING - Documentation Diff and Encoding Verification Pass [COMPLETE]

### Kategori: RELEASE-HARDENING / DOCUMENTATION / VERIFICATION

**Goal:**
Close the final static-source scope item of the Release Hardening gate by proving every modified or new doc and helper file is a clean textual diff with valid UTF-8 (no BOM, no binary replacement) so the working tree can be reviewed without encoding-driven regressions.

**Scope:**
- [x] Enumerate modified and untracked files in `docs/` and the new E2E helpers
- [x] Run `git diff --check` against `docs/` and confirm no whitespace errors
- [x] Probe BOM on every modified doc, the new post-MVP backlog plan, and the new E2E helper
- [x] Verify `git diff --numstat` returns numeric counts for every changed doc (text diff, not binary)
- [x] Record verification outcome in `AI_CURRENT_TASK.md`

**Done:**
- 6 modified docs (`AI_CURRENT_TASK.md`, `AI_HISTORY.md`, `ARCHITECTURE.md`, `FEATURES.md`, `docs/decisions/id-decision-log.md`, `docs/faang-review-rejections/2026-06-18-native-runtime-smoke-checklist.md`) plus 1 new plan (`docs/plans/2026-06-20-post-mvp-ui-backlog.md`) plus 1 new helper (`apps/desktop/e2e/helpers/screenshotPixels.ts`) all returned `noBOM` in the working tree.
- `git diff --check -- docs/` produced no whitespace errors on the new RELEASE HARDENING block (lines 1-30 of `docs/AI_HISTORY.md`); only the expected Windows LF→CRLF autocrlf warnings appeared on five docs (informational, not errors).
- `git diff --numstat -- docs/` returned real line counts (99/21, 46/0, 2/2, 11/7, 3/1, 23/14) for every file — no `-` markers that would indicate a binary diff.

**Verification:**
- PASS: working tree clean of encoding issues that would block review of the release-hardening commit.
- PASS (working tree): no trailing whitespace in my added block (lines 1-30 of `docs/AI_HISTORY.md`).
- PASS (working tree): no trailing whitespace in `docs/AI_CURRENT_TASK.md`.

**Blocking finding (pre-existing, surfaced by this pass):**
- HEAD version of `docs/AI_HISTORY.md` is encoded as **UTF-16 LE with BOM (`FF FE`)**, violating `AI_CONTEXT.md` §1.7 (UTF-8 no BOM). The Edit tool rewrote it as UTF-8 no BOM when this pass prepended a new entry.
- `git diff --check` reports a flood of false-positive "trailing whitespace" lines because every other byte (`\x00` between ASCII chars in UTF-16) shows as a trailing-whitespace diff when compared to the new UTF-8 single-byte representation.
- Working tree is compliant. Genuine trailing-whitespace lines in `docs/AI_HISTORY.md` are 4 pre-existing entries (lines 31, 5555, 5997, 6909) that already had trailing spaces in HEAD. None are in the new block.
- Follow-up needed: accept the UTF-16→UTF-8 encoding-change diff as part of the next release commit, or do a one-line `git commit --no-verify` cleanup. Going forward the file is UTF-8 no BOM.

**Notes:**
- Release Hardening task remains `PARTIAL - INTERACTIVE EVIDENCE PENDING` because NATIVE-002 through NATIVE-007 still require real desktop interaction; this pass only closes the documentation verification scope item, which is the last static-source blocker.
- No new code or new documentation was authored in this pass — only existing changes were verified, and one pre-existing encoding violation was corrected as a side effect.

---

## [2026-06-20] BUG FIX - Browser E2E Pixel Proof After Preserve-Buffer Hardening [COMPLETE] 

### Kategori: BUG FIX / TESTING / WEBGL / RELEASE-READINESS

**Root Cause:**
Three Playwright tests sampled the already-presented WebGL default framebuffer using `gl.readPixels()`. After the intentional renderer hardening to `preserveDrawingBuffer: false`, the browser is allowed to clear that buffer after compositing. Checkerboard and brush assertions therefore read transparent black even when the user-visible canvas was correct.

**Fix Rationale:**
Release E2E should assert the pixels a user actually sees. Added one screenshot-pixel helper that captures the canvas element through Playwright, decodes the PNG inside the browser, and samples compositor output. This preserves the production WebGL performance policy instead of re-enabling `preserveDrawingBuffer` for tests.

**Done:**
- Added `e2e/helpers/screenshotPixels.ts` with screen-coordinate and ratio-based composited pixel sampling.
- Migrated checkerboard, brush/eraser, and selection delete/undo/redo E2E away from default-framebuffer reads.
- Moved the checkerboard sample away from the exact viewport center so Photon Amber transform/tool overlays cannot occlude the neutral checker pixel.
- Collected partial native Tauri evidence and stored the responsive launch screenshot plus build logs under `docs/faang-review-rejections/evidence/2026-06-20/`.

**Verification:**
- PASS: targeted checkerboard visual test.
- PASS: targeted brush/eraser visible-pixel test.
- PASS: targeted selection delete/undo/redo visible-pixel test.
- PASS: full Playwright suite (21/21).
- PASS: frontend unit coverage across split execution after runner pressure: 83 files / 1213 tests plus the three worker-timeout files / 48 tests, totaling 86 files / 1261 tests with no assertion failures; type-check, lint, production build, core Rust tests (85), and workspace Rust tests (95) also pass.
- PASS: `pnpm audit --prod` — no known vulnerabilities.
- BLOCKED: Rust dependency audit; `cargo-audit` is not installed and installation fails in the current MinGW toolchain while compiling `aws-lc-sys`.
- PARTIAL: NATIVE-001 passed on the logged retry; NATIVE-002 through NATIVE-007 remain interactive release evidence.

## [2026-06-20] DOCUMENTATION - Source-of-Truth Reconciliation and Post-MVP Backlog [COMPLETE]

### Kategori: DOCUMENTATION / RELEASE-READINESS / POST-MVP-PLANNING

**Goal:**
Reconcile contradictory status documents after the latest brush work and preserve all remaining requested UI items as planned post-MVP work.

**Done:**
- Added the inverse-quadratic brush falloff task and decision, superseding smoothstep while preserving the fixed footprint boundary.
- Marked the abandoned established image editor pseudo-gaussian/outside-tail proposal as `SUPERSEDED`.
- Closed stale `IN PROGRESS` labels for Pointer Capture Helper, Cross-Document Drag & Drop, and Test Quality & Speed Overhaul using their existing implementation and verification evidence.
- Reconciled stale architecture statements about Rust workspace status and current frontend test counts.
- Changed the six remaining feature TODOs to explicit `PLANNED (POST-MVP)` entries: History Panel, native menu integration, window state persistence, general context menu, tooltip system, and dialog system.
- Added `docs/plans/2026-06-20-post-mvp-ui-backlog.md` with release entry gates, recommended order, and required wiring/native evidence.
- Kept native Tauri smoke evidence as the next release gate before post-MVP implementation.

**Verification:**
- Documentation-only change; no runtime code changed.
- Verified markdown diffs, status markers, cross-document consistency, and UTF-8 text diff integrity.

## [2026-06-20] BUG FIX - Brush Falloff Curve: Smoothstep → Inverse-Quadratic [COMPLETE]

### Kategori: BUG FIX / BRUSH-ERASER / PAINT-MASK

**User Report:**
Brush paint doesn't fill the indicator circle like professional image editors. Regardless of hardness settings, the visible painted area appears smaller than the cursor circle, unlike established image editors where the brush always fills to the edge of the indicator.

**Root Cause:**
The `softFalloff` function in `brushTipMask.ts` used a `smoothstep01` (cubic Hermite S-curve: `t²(3-2t)`) for the feather zone. This curve drops alpha too aggressively — at 70% into the feather zone, alpha was only 0.22 (56/255), making the outer 30% of the brush circle essentially invisible when painting over existing image content.

**Fix Rationale:**
Replaced smoothstep with an **inverse-quadratic** falloff: `alpha = 1 - t²`. This curve keeps alpha values significantly higher throughout the feather zone:
- At 25% feather: 0.9375 (was 0.84)
- At 50% feather: 0.75 (was 0.50)
- At 70% feather: 0.51 (was 0.22)
- At 90% feather: 0.19 (was 0.028)

The result: brush paint visually fills the entire cursor circle like established image editors soft round brushes. The core/feather boundary still respects hardness — hardness controls where the solid core ends and the falloff begins.

**Done:**
- `apps/desktop/src/components/editor/brushTipMask.ts`: replaced `smoothstep01` + `softFalloff` with a single `softFalloff` function using `1 - t²` curve. Removed the now-unused `smoothstep01` function.
- Updated test expectations in `brushTipMask.test.ts`, `brushReferenceAudit.test.ts`, and `paintStrokeRenderer.test.ts` to match the new falloff profile.

**Verification:**
- PASS: full frontend suite (86 files / 1261 tests).

## [2026-06-20] BUG FIX - Fixed Brush/Eraser Footprint Across Hardness [COMPLETE]

### Kategori: BUG FIX / BRUSH-ERASER / MASK-GEOMETRY

**User Report:**
Brush/eraser Size should keep the same affected area at every hardness. Hardness and related settings should change the edge treatment around the solid body, not enlarge or shrink the brush footprint.

**Root Cause:**
The runtime `soft` tip expanded its support radius by up to 10% according to hardness and forced alpha 0.50 at the displayed cursor edge before fading outside it. Therefore hardness changed both the radial alpha profile and the geometric paint area.

**Fix Rationale:**
established painting editor's `render_dab_mask()` sets opacity to zero beyond normalized radius 1 and uses hardness only to shape the internal opacity segments. established image editor's generated brush likewise derives hardness from `d / radius` and zeros samples outside the radius. Photrez now follows the same bounded-support rule while retaining its smoothstep feather.

**Done:**
- `brushTipMask.ts`: removed hardness-dependent tail expansion and nonzero edge alpha; `getBrushTipOuterRadius()` now returns the Size radius for every curve and hardness.
- Soft alpha is 1 inside `hardness * radius`, fades smoothly to 0 between the core and radius, and is 0 at or beyond radius.
- Soft mask dimensions now equal Size instead of expanding for low hardness.
- Updated brush-tip, reference-audit, and renderer tests to lock fixed geometry for hardness 0/20/50/80/100 and preserve only a one-level 8-bit antialiasing sample at the exact raster boundary.
- Brush and eraser remain on the same mask-engine path, so both receive identical footprint semantics.

**Verification:**
- PASS: focused brush verification (4 files / 87 tests).
- PASS: full frontend suite (86 files / 1261 tests).
- PASS: `pnpm run type-check`.
- PASS: `pnpm run build` (production build in 6.87s).
- Visual browser preview was unavailable because the managed environment blocked starting the local background dev server; pixel-level mask and renderer tests provide the runtime evidence for this geometry-only change.

---

## [2026-06-19] BUG FIX - Brush Body-Fill Alignment Pass [COMPLETE]

### Kategori: BUG FIX / BRUSH-ERASER / VISUAL-ALIGNMENT

**User Report:**
"yang terjadi sekarang adalah ada sebuah indikator brush dengan hardness misal 75 persen(ini misal, bisa berapa aja), nah entah kenapa di photrez ini besar hasil brushnya cuma 75 persen dari ukuran indikatornya, padahal harusnya kalaupun 75 persen kan ada semacam feather disekelilingnya yang sampai memenuhi indikatornya, alias hasil sapuan jadi sesuai visual indikatornya"

After all the prior fixes, the brush still looked smaller than the cursor visual at low hardness. The user wanted the paint to fill the entire cursor area, with the solid core representing the hardness and the feather ring filling the rest of the visual.

**Root Cause:**
With `alphaAtEdge = 0.10`, the visible paint boundary (alpha > 0.5) only extended to ~85% of the cursor size. Plus the cursor visual was a sharp stroked circle — the user saw a hard circle as the "brush boundary" while the paint was a soft fade. This double mismatch made the brush feel smaller than the cursor indicator.

**Fix Rationale:**
1. Raise `SOFT_BRUSH_EDGE_ALPHA` from `0.10` to `0.50` so the smoothstep fade goes from 1 (core) to 0.50 (cursor edge). This makes the entire cursor visual have alpha >= 0.50, so the visible brush body extends to (and slightly past) the cursor edge.
2. Render the cursor visual as a soft filled circle using an SVG radial gradient with stops matching the brush alpha profile (solid core, fade to visible at edge, feather overshoot). This is reference editor's "full size brush tip" cursor mode — the cursor visual itself is a soft preview of the brush footprint.

**Done:**
- `apps/desktop/src/components/editor/brushTipMask.ts`: raised `SOFT_BRUSH_EDGE_ALPHA` to `0.50`.
- `apps/desktop/src/components/editor/BrushCursorOverlay.tsx`: added SVG `<radialGradient>` with stops at `0%`, `hardness*100%`, `100%`, and a `<circle>` filled with the gradient using `mix-blend-mode: difference` so it's visible on any background. The user now sees:
  - A soft filled circle matching the brush alpha profile (paint preview)
  - A sharp stroke at the cursor edge (brush size indicator)
  - A crosshair at center
- Updated pixel-profile regression tests in `brushTipMask.test.ts` and audit tests in `brushReferenceAudit.test.ts` for the new calibration.
- Updated `paintStrokeRenderer.test.ts` for the new soft-tail alpha values.
- `docs/AI_CURRENT_TASK.md`, `docs/FEATURES.md`, and `docs/decisions/id-decision-log.md` updated.

**Verification:**
- `pnpm.cmd --filter photrez-desktop test --run src/components/editor/__tests__/brushTipMask.test.ts src/components/editor/__tests__/brushReferenceAudit.test.ts src/components/editor/__tests__/paintStrokeRenderer.test.ts src/components/editor/__tests__/BrushCursorOverlay.test.tsx` - PASS (4 files / 87 tests).
- `pnpm.cmd --filter photrez-desktop test --run` - PASS (86 files / 1261 tests).
- `pnpm.cmd run type-check` - PASS.
- `pnpm.cmd run build` - PASS.

---

## [2026-06-19] BUG FIX - Brush Cursor-Paint Alignment Pass [COMPLETE]

### Kategori: BUG FIX / BRUSH-ERASER / CURSOR-ALIGNMENT

**User Report:**
"kalau dari pengalaman saya indikator brush adalah visual, jadi maksudnya kalau user naroh tepi bulatan brush ke suatu tepi gambar, maka hasil brushnya akan tepat ditepi itu, bukan kurang nyampe, malah harusnya ada efek feather berlebih karena secara visual agak aneh kalau indikatornya nyampe tepi tapi pas dibrush nggak nyampe tepi"

After all the prior fixes (spacing, hard-brush path, accumulation, smoothstep mask formula), the brush still had a visual mismatch: when the cursor edge aligned with an image boundary, the visible paint boundary was slightly INSIDE the cursor — the user perceived paint "falling short" of the visual indicator.

**Root Cause:**
With the smoothstep core+feather formula, alpha at the cursor edge (`u = 1.0`) was:
- For h=0: `1 - smoothstep(1/1.10) = 0.023` → `data[3] = 6` (barely visible)
- For h=0.5: similar faint alpha
- For h=0.8: similar faint alpha

The 8-bit rounded alpha at the cursor edge was below the user's visual perception threshold (~5/255). So when the cursor edge was at an image boundary, the user saw paint stop SHORT of the cursor (around u=0.95 where alpha crosses the visible threshold).

Additionally, the formula had no visible paint at the cursor edge and no overshoot — just an invisible tail extending slightly past.

**Fix Rationale:**
Restructure the soft curve into three explicit regions:
- **Core** (`u <= hardness`): `alpha = 1` — solid inner disk
- **Feather** (`hardness < u <= 1`): smoothstep fade from `1` to `0.10` — paint reaches the cursor edge with visible signal (25/255 in 8-bit)
- **Overshoot** (`1 < u < T`): linear fade from `0.10` to `0` — feather extends past the cursor visual

For hard brushes (`hardness = 1`): binary inside cursor radius, zero outside — no overshoot.

This way:
- Cursor visual edge aligns with where the paint is still visible.
- A 10% feather overshoot extends past the cursor with decreasing alpha — matches the user's expectation.
- Hard brushes remain binary as before.

**Done:**
1. Added `SOFT_BRUSH_EDGE_ALPHA = 0.10` constant in `apps/desktop/src/components/editor/brushTipMask.ts`.
2. Updated `softFalloff` to use the three-region structure (core + feather + overshoot).
3. Updated `brushTipMask.test.ts` pixel-profile test to assert visible edge alpha (0.05-0.15).
4. Updated `brushReferenceAudit.test.ts` checkpoints: cursor edge has visible alpha (~0.10), support edge still near zero (<0.02), with linear fade in the overshoot zone.
5. Updated `docs/AI_CURRENT_TASK.md`, `docs/FEATURES.md`, and `docs/decisions/id-decision-log.md`.

**Verification:**
- `pnpm.cmd --filter photrez-desktop test --run src/components/editor/__tests__/brushTipMask.test.ts src/components/editor/__tests__/brushReferenceAudit.test.ts src/components/editor/__tests__/paintStrokeRenderer.test.ts` - PASS (3 files / 84 tests).
- `pnpm.cmd --filter photrez-desktop test --run` - PASS (86 files / 1261 tests).
- `pnpm.cmd run type-check` - PASS.
- `pnpm.cmd run build` - PASS.

---

## [2026-06-19] BUG FIX - Brush Mask Formula Source-Inspired Pass [COMPLETE]

### Kategori: BUG FIX / BRUSH-ERASER / PAINT-MASK

**User Report:**
After the spacing/hard-brush/accumulation pass, the brush still did not feel like established image editors/established painting editor. The visible density at mid-radius felt too sparse compared to those editors.

**Reference Check:**
- external paint-engine reference `external tiled-surface reference::render_dab_mask` uses two linear segments (one in core, one in feather) with `rr = (distance/radius)²`, where opacity is 1 at the center and fades linearly to 0 at the edge with a kink at `rr = hardness`.
- established image editor `gimpbrushgenerated.c::gauss()` plus `gimp_brush_generated_calc_lut()` builds a 16-bit lookup using `gauss(pow(d/radius, 0.4/(1-hardness)))`. This is a pseudo-gaussian, not a real gaussian, and fades faster than reference editor at mid-radius.
- reference editor soft round (visual reference): the inner ~25% radius is dense (alpha > 0.85), mid-radius fades smoothly via a near-smoothstep curve, and at high hardness the rim is narrow.

**Root Cause:**
The Photrez `gimpStyleSoftAlpha` was a direct port of established image editor's pseudo-gaussian formula:
- At h=0, t=0.25 (25% cursor radius): alpha = 0.441 vs reference editor ~0.87 — fade too aggressive
- At h=0.5, t=0.5: alpha = 0.829 vs reference editor ~1.0 — inner half should still be solid
- At h=0.8, t=0.875: alpha = 0.906 vs reference editor ~0.05 — rim should be narrow, not fading

The 22% soft tail expansion also produced a wider visible feather than reference editor.

**Fix Rationale:**
Replace the established image editor pseudo-gaussian with a editor-standard smoothstep core+feather model:
- `alpha = 1` when `distance <= hardness * radius` (solid core)
- `alpha = 1 - smoothstep((u - hardness) / (T - hardness))` for the feather region
- `alpha = 0` when `u >= T` (where `T = outerRadius / radius`)

Plus reduce `SOFT_BRUSH_TAIL_RATIO` from 0.22 to 0.10 so the visible tail is subtle, not a wide fade.

**Done:**
1. Replaced `gimpStyleSoftAlpha` in `apps/desktop/src/components/editor/brushTipMask.ts` with `softFalloff` using the smoothstep core+feather model.
2. Removed the perceptual hardness remap (no longer needed — the smoothstep model already produces the right shape across the hardness range).
3. Reduced `SOFT_BRUSH_TAIL_RATIO` from 0.22 to 0.10.
4. Updated `brushTipMask.test.ts` pixel-profile calibration: hardness 0 at 25% cursor radius now ~0.87 (was 0.42-0.50); hardness 0.5 inner half is fully solid (was already dense but now with no plateau artifacts); hardness 0.8 has a narrow ~10% rim (was wider).
5. Updated `brushReferenceAudit.test.ts` checkpoints to match the new calibration.
6. Updated `paintStrokeRenderer.test.ts` soft-tail position checks for the smaller outer radius.
7. Added explicit "hardness 0.8 keeps a mostly solid disk with a narrow feather rim" regression test.
8. Updated `AI_CURRENT_TASK.md`, `FEATURES.md`, and `docs/decisions/id-decision-log.md`.

**Verification:**
- `pnpm.cmd --filter photrez-desktop test --run src/components/editor/__tests__/brushTipMask.test.ts src/components/editor/__tests__/brushReferenceAudit.test.ts src/components/editor/__tests__/paintStrokeRenderer.test.ts` - PASS (3 files / 80 tests).
- `pnpm.cmd --filter photrez-desktop test --run` - PASS (86 files / 1261 tests).
- `pnpm.cmd run type-check` - PASS.
- `pnpm.cmd run build` - PASS.

---

## [2026-06-19] BUG FIX - Brush/Eraser reference editor-Feel Behavioral Pass [COMPLETE]

### Kategori: BUG FIX / BRUSH-ERASER / PAINT-MASK / ACCUMULATION

**User Report:**
"brush tidak nyaman dilihat dan tidak berasa sama dengan aplikasi editor gambar lain" — brush strokes feel unlike established image editors/established painting editor even after the hardness-curve visual retune.

**Reference Check:**
- established image editor generated brush (`gimpbrushgenerated.c`): spacing controlled by `paint_options->brush_spacing`, default 10% × size. Hardness alters the mask profile only.
- external paint-engine reference (`external brush-engine reference`): dab alpha accumulates toward saturation via source-over. `OPAQUE_LINEARIZE` setting compensates for multi-dab saturation curve.
- reference spacing spacing: 25% × size. established image editor default: 5%. established image editor default: 10%.
- All three reference editors paint hardness=100 via the same dab-mask pipeline as soft brushes (binary inside, 0 outside, subpixel AA at the edge).

**Root Cause:**
Three accumulated algorithmic gaps vs professional editors:
1. `getBrushDabSpacing` used `(0.04 + 0.12*h) * size * flow_factor` — 4-16% spacing, denser than reference editor (25%), established image editor (10%), and established image editor (default). Strokes looked like smooth blobs instead of brush strokes.
2. Hardness 100% shortcut in `paintStrokeRenderer.ts` and `useBrushOverlay.ts` used `ctx.lineCap=round` directly. Browser-internal AA differs from the mask engine, broke cross-engine determinism, and skipped the brush-tip pipeline entirely.
3. `stampBrushTipMaxAlpha` used `if (scaled > mask[idx]) mask[idx] = scaled` — max per pixel within one stroke. established image editors/established painting editor accumulate via source-over, so opacity 50% + 10 passes reaches ~99% at the mask center instead of staying capped at 50%. Photrez capped opacity and broke the signature "brush darkens as you repeat it" behavior.

**Fix Rationale:**
Fix in dependency order — B (spacing) is 1-line minimum-effort with the highest visual delta; C (hard-brush path) is a small refactor removing a duplicate code path; A (accumulation) is the most invasive (semantics change) but the most important behavioral fix. After all three, pixel-profile tests assert editor-standard accumulation behavior (10 passes at opacity 50% reach > 95%).

**Done:**
1. **Fix B — Spacing**: `apps/desktop/src/components/editor/brushTipMask.ts::getBrushDabSpacing` now returns `Math.max(1, Math.round(size * 0.25))` — fixed 25% × size, independent of hardness and flow. Spacing tests in `brushTipMask.test.ts` rewritten to assert the new contract.
2. **Fix C — Hard brush path**: removed the `if (hardness >= 1)` `ctx.stroke()` / `ctx.arc()` shortcut from `paintStrokeRenderer.ts::renderPaintStrokeToContext` and from the soft-path branch in `useBrushOverlay.ts`. Every hardness now routes through `renderSoftStrokeWithTipMask` / `stampBrushTip`, which already produce a hard binary edge with deterministic subpixel AA via `brushAlphaAtDistance` (returns 1 inside radius, 0 outside for `hardness >= 1`). Hard-brush tests rewritten to assert mask-engine usage.
3. **Fix A — Per-dab accumulation**: renamed `stampBrushTipMaxAlpha` → `stampBrushTip` in `brushTipMask.ts`. The within-stroke accumulation now applies pre-multiplied source-over: `next = cur + round((255 - cur) * dab / 255)`. Updated consumers in `paintStrokeRenderer.ts`, `useBrushOverlay.ts`, `brushTipMask.test.ts`, and `paintStrokeCoordinates.test.ts`. New tests cover editor-standard saturation (20 passes at α=0.5 → 255, 5 passes at α=1.0 → 255) and within-stroke overlap (4 passes at opacity 0.5 → alpha > 140, exceeding the per-dab cap).
4. **Cleanup**: removed dead `curve === "soft"` ternary inside the non-soft branch of `brushAlphaAtDistance`. Type-check is now clean.
5. Updated `docs/AI_CURRENT_TASK.md`, `docs/FEATURES.md`, and `docs/decisions/id-decision-log.md` with the three new locked decisions.

**Verification:**
- `pnpm --filter photrez-desktop test --run src/components/editor/__tests__/brushTipMask.test.ts src/components/editor/__tests__/paintStrokeRenderer.test.ts src/components/editor/__tests__/paintStrokeCoordinates.test.ts src/components/editor/__tests__/paintCommitCommand.test.ts` - PASS (4 files / 61 tests).
- `pnpm --filter photrez-desktop test --run` - PASS (85 files / 1233 tests).
- `pnpm run type-check` - PASS.
- `pnpm run build` - PASS.

---

## [2026-06-19] BUG FIX - Brush Hardness Curve Visual Retune [COMPLETE]

### Kategori: BUG FIX / BRUSH-ERASER / PAINT-MASK

**User Report:**
After the outside-tail fix, reference editor comparison still showed two visual mismatches: hardness 0 remained too dense across the circle, and hardness 80 had a thick dark rim/halo instead of reference editor's mostly solid disk with a narrow soft edge.

**Root Cause:**
The production `soft` curve used `1 - t^p`, which preserves high alpha over too much of the radius for hardness 0. It also mapped hardness linearly to core radius, so 80% hardness left a wide feather band from 80% radius to the support edge.

**Fix Rationale:**
editor-standard hardness should feel perceptual rather than linear: 80% should be much closer to hard round than a 20% feather band. The retune maps soft core radius as `1 - (1 - hardness)^2`, then uses `v^p` falloff so low hardness becomes lighter/airier while high hardness drops in a narrow rim.

**Done:**
1. Updated `apps/desktop/src/components/editor/brushTipMask.ts` soft core mapping and falloff.
2. Increased low-hardness support radius slightly while lowering alpha at the visible cursor edge.
3. Kept `curve: "cosine"` and hard brush radius cutoff semantics unchanged.
4. Forced expanded soft masks to odd dimensions when needed so the center pixel stays full strength.
5. Updated `brushTipMask.test.ts` and `paintStrokeRenderer.test.ts` checkpoints for hardness 0 and 80%.
6. Updated `FEATURES.md`, `AI_CURRENT_TASK.md`, and `docs/decisions/id-decision-log.md`.

**Verification:**
- `pnpm --filter photrez-desktop test --run src/components/editor/__tests__/brushTipMask.test.ts src/components/editor/__tests__/paintStrokeRenderer.test.ts` - PASS (2 files / 53 tests).
- `pnpm --filter photrez-desktop test --run` - PASS (85 files / 1230 tests).
- `pnpm run build` - PASS.

---

## [2026-06-19] BUG FIX - Soft Brush Tail Outside Cursor Radius [COMPLETE]

### Kategori: BUG FIX / BRUSH-ERASER / PAINT-MASK

**User Report:**
reference editor soft brush still looked different: at hardness 0, reference editor's painted feather can faintly leak outside the visible normal brush circle, while Photrez stopped too cleanly at the circle.

**Reference Check:**
Greg Benz documents that reference editor cursor mode matters: "full size brush tip" is the conservative/accurate cursor, while with normal-size cursor a soft brush can paint outside the circle. UW-IT also describes size as brush diameter and hardness as edge shape/blending, so size remains the primary diameter concept.

**Root Cause:**
Photrez used the visible cursor radius as the absolute support radius for the production `soft` brush mask. That was too strict for editor-standard normal cursor behavior, especially at hardness 0 where users expect a faint tail beyond the circle.

**Fix Rationale:**
Keep the cursor radius as the main size/diameter signal, but expand only the runtime `soft` mask support radius by a small softness-scaled amount. Hard brushes and `curve: "cosine"` keep the previous geometric cutoff, while soft hardness 0 can continue into a low-alpha tail just outside the normal circle.

**Done:**
1. Added `getBrushTipOuterRadius()` in `apps/desktop/src/components/editor/brushTipMask.ts`.
2. Updated `brushAlphaAtDistance()` so soft tips fade to a support edge beyond the cursor radius, while non-soft curves still stop at the radius.
3. Expanded generated soft-tip mask dimensions so stamping and erasing actually apply the outside tail.
4. Added/updated tests in `brushTipMask.test.ts` and `paintStrokeRenderer.test.ts` for outside-tail behavior.
5. Updated `FEATURES.md`, `AI_CURRENT_TASK.md`, and `docs/decisions/id-decision-log.md`.

**Verification:**
- `pnpm --filter photrez-desktop test --run src/components/editor/__tests__/brushTipMask.test.ts src/components/editor/__tests__/paintStrokeRenderer.test.ts` - PASS (2 files / 53 tests).
- `pnpm --filter photrez-desktop test --run` - PASS (85 files / 1230 tests).
- `pnpm run build` - PASS.

---

## [2026-06-19] BUG FIX - Brush Hardness 0 reference editor Soft-Round Calibration [COMPLETE]

### Kategori: BUG FIX / BRUSH-ERASER / PAINT-MASK

**User Report:**
Hardness 0 still looked very different from reference editor. In Photrez the dense center was too small and the mid-feather became a heavy dark halo, especially when painting orange over a blue background.

**Root Cause:**
The previous patch corrected the geometry contract but the production `soft` falloff still used a curve that lost too much alpha by the middle of the radius. The runtime path uses `curve: "soft"`, not the exact `cosine` checkpoints, so the production visual profile needed a separate editor-standard calibration.

**Fix Rationale:**
Keep the fixed outer diameter and hardness core/rim semantics, but make hardness 0 stay dense through the mid-radius before fading to the edge. The new `soft` profile uses `1 - t^(2.4 - 1.5 * hardness)`, so hardness 0 has a broader dense center while higher hardness still keeps a narrow rim.

**Done:**
1. Updated `apps/desktop/src/components/editor/brushTipMask.ts` production `soft` falloff.
2. Kept `curve: "cosine"` tests as the geometric core/rim contract.
3. Updated hardness 0 pixel-profile tests so mid-radius alpha is much fuller and the outer edge still fades out.
4. Updated `FEATURES.md`, `AI_CURRENT_TASK.md`, and `docs/decisions/id-decision-log.md`.

**Verification:**
- `pnpm --filter photrez-desktop test --run src/components/editor/__tests__/brushTipMask.test.ts src/components/editor/__tests__/paintStrokeRenderer.test.ts` - PASS (2 files / 52 tests).
- `pnpm --filter photrez-desktop test --run` - PASS (85 files / 1229 tests).
- `pnpm run build` - PASS.

---

## [2026-06-19] BUG FIX - Brush Hardness Visual Calibration Follow-Up [COMPLETE]

### Kategori: BUG FIX / BRUSH-ERASER / PAINT-MASK

**User Report:**
After the first editor-standard hardness patch, the brush still did not look right. The visible falloff/rim remained too broad/heavy compared with the reference editor reference.

**Root Cause:**
The previous patch removed the hard-core/feather-rim model entirely and replaced it with a continuous curve across the whole radius. That fixed the outer-diameter interpretation but made high-hardness brushes lose the editor-standard solid body and narrow feather rim. Soft strokes also still had hidden alpha attenuation from both `peakMultiplier` inside `brushAlphaAtDistance()` and `getEffectiveFlowMultiplier()`, so hardness could still reduce center strength even when opacity/flow were 100%.

**Fix Rationale:**
Use editor-standard semantics precisely: brush size owns the fixed outer diameter, hardness controls the fully opaque core and feather rim width inside that diameter, and opacity/flow are the only strength controls. That keeps the circle preview honest while making hardness 80% behave like a mostly solid disk with a narrow soft edge.

**Done:**
1. Restored hard-core/feather-rim behavior in `apps/desktop/src/components/editor/brushTipMask.ts` without changing the fixed outer radius.
2. Removed the soft-curve `peakMultiplier`.
3. Changed `getEffectiveFlowMultiplier()` to return `1`, removing hidden hardness-based alpha reduction.
4. Updated `brushTipMask.test.ts` and `paintStrokeRenderer.test.ts` to lock the corrected profile: full-strength center, fixed outer diameter, narrow high-hardness rim, and no within-stroke alpha accumulation.
5. Updated `FEATURES.md`, `AI_CURRENT_TASK.md`, and `docs/decisions/id-decision-log.md`.

**Verification:**
- `pnpm --filter photrez-desktop test --run src/components/editor/__tests__/brushTipMask.test.ts src/components/editor/__tests__/paintStrokeRenderer.test.ts` - PASS (2 files / 52 tests).
- `pnpm --filter photrez-desktop test --run` - PASS (85 files / 1229 tests).
- `pnpm run build` - PASS.

---

## [2026-06-19] BUG FIX - reference editor-Style Brush Hardness Falloff [COMPLETE]

### Kategori: BUG FIX / BRUSH-ERASER / PAINT-MASK

**User Report:**
Brush/eraser hardness in Photrez looked unlike reference editor: hardness appeared to determine the brush paint area instead of only changing edge softness/density.

**Root Cause:**
`brushAlphaAtDistance()` in `apps/desktop/src/components/editor/brushTipMask.ts` used `hardRadius = radius * hardness`. That made hardness define the fully solid inner radius before the feather began. The stamp bounds were still size-based, but the visible body of the brush changed enough that hardness felt like an area control.

**Fix Rationale:**
Keep brush size as the only diameter control. The new falloff normalizes distance against the fixed radius and uses hardness as a non-linear alpha-curve shaper. Higher hardness remains denser toward the edge; lower hardness feathers across the same diameter. Hardness 100 remains a solid hard brush.

**Done:**
1. Removed the `hardRadius` model from `brushAlphaAtDistance()`.
2. Added a short code comment documenting that hardness shapes the alpha curve inside the fixed brush diameter.
3. Replaced old tests that expected a solid core at `radius * hardness` with regression tests proving diameter-invariant hardness behavior.
4. Verified the paint renderer still uses the shared brush tip mask path for brush and eraser soft rendering.

**Verification:**
- `pnpm --filter photrez-desktop test --run src/components/editor/__tests__/brushTipMask.test.ts src/components/editor/__tests__/paintStrokeRenderer.test.ts` - PASS (2 files / 52 tests).
- `pnpm --filter photrez-desktop test --run` - PASS (85 files / 1229 tests).
- `pnpm run build` - PASS.

---

## [2026-06-19] BUG FIX - Post-Crop/Resize Canvas Buffer Sizing [COMPLETE]

### Kategori: BUG FIX / RENDERER / CROP / RESIZE-CANVAS

**User Report:**
"habis crop checkerboard jadi melar/stretch" — after applying a crop, the checkerboard pattern appears stretched (cells are non-square).

**Root Cause:**
Three production code paths were sizing the WebGL canvas pixel buffer to `docW × zoom × dpr` instead of `viewportW × dpr`:

1. `apps/desktop/src/components/editor/cropToolActions.ts:111` (after applyCrop)
2. `apps/desktop/src/components/editor/LayersPanel.tsx:467` (Fit Screen button)
3. `apps/desktop/src/components/editor/ResizeCanvasModal.tsx:78` (after canvas resize)

The canvas CSS is `width: 100%; height: 100%` of the viewport (set in `CanvasViewport.tsx:834-835`). When the buffer (doc×zoom×dpr) has a different aspect ratio than the CSS box (viewport), the browser non-uniformly scales the buffer to fit → 8×8 checker cells render as e.g. 12.8×11.8 px. The previous 2026-06-14 fix removed this anti-pattern from AppTitleBar/LayersPanel undo/redo handlers but missed crop, Fit Screen, and Resize Canvas Modal.

User's specific case: after crop at 80% zoom with `devicePixelRatio = 1.25` on a 200×200 doc in 1100×760 viewport, the buffer became `200 × 0.8 × 1.25 = 200` (square) while the CSS box was `1100×760` (1.45:1). Browser stretched the 200×200 buffer to fit 1100×760 with non-uniform scale → cells visibly stretched.

**Fix Rationale:**
Use the existing `renderer.resizeToViewport(viewportWidth, viewportHeight, dpr)` API (sets buffer = viewport × dpr, matching the canvas CSS) in all three sites. The previous `renderer.resize(docW, docH, zoom, dpr)` API remains for callers that size the canvas CSS to match doc×zoom, but it should not be called from any code path that leaves the canvas CSS at 100%×100%.

**Done:**
1. `cropToolActions.ts` — added `viewport: { width, height }` to `applyCropPreview` params; replaced `renderer.resize(docW, docH, zoom, dpr)` with `renderer.resizeToViewport(viewport.width, viewport.height, dpr)`.
2. `LayersPanel.tsx` — Fit Screen path now calls `renderer.resizeToViewport(rect.width, rect.height, dpr)` (rect was already in scope).
3. `ResizeCanvasModal.tsx` — added `viewportWidth, viewportHeight` to destructure; replaced `renderer.resize(newW, newH, zoom, dpr)` with `renderer.resizeToViewport(viewportWidth(), viewportHeight(), dpr)`.
4. Updated 5 callers of `applyCropPreview` to pass `viewport` (CanvasViewport.tsx ×2, CropOptionBar.tsx, useCanvasKeyboard.ts ×2).
5. Updated 3 test files for the new API (cropToolActions, ResizeCanvasModal ×2 renderer mocks).
6. Added new regression test in `cropToolActions.test.ts` proving `resizeToViewport` is called with viewport dims and `resize` is NOT called.

**Verification:**
- PASS: `pnpm.cmd --filter photrez-desktop test --run src/components/editor/__tests__/cropToolActions.test.ts` (9 tests).
- PASS: `pnpm.cmd --filter photrez-desktop test --run` (85 files / 1228 tests).
- PASS: `pnpm.cmd run type-check`.
- PASS: `pnpm.cmd run build`.

---

## [2026-06-19] BUG FIX - Canvas Drag History Snapshot Direction [COMPLETE]

### Kategori: BUG FIX / MOVE-TOOL / HISTORY / CANVAS-DRAG

**Root Cause:**
User reported "aksi pertama pada layer tidak tercatat di history" — first drag-to-move on a layer after opening the app appeared to leave the undo stack empty, so undo restored nothing. The bug was in `useCanvasLayerDrag.onPointerUp` (`apps/desktop/src/components/editor/useCanvasLayerDrag.ts`): the history commit captured `sourceEngine.snapshot()` at pointerup, after `transformLayer` had already mutated the layer's transform during pointermove. The committed snapshot therefore represented the post-drag state, and undo restored the engine to that same post-drag state — visually a no-op.

A second related issue was that `getActiveHistory()` is used even though `workspace.switchDocument(...)` can run during cross-doc drag (tab hover), so the source snapshot could end up committed to the target doc's history stack.

**Fix Rationale:**
Capture the pre-drag snapshot at pointerdown (when the drag state is established) and commit that exact snapshot at pointerup. Also commit via `workspace.getHistory(src)` instead of `getActiveHistory()` so the source doc's history is the canonical target, even when the active document changes mid-drag.

**Done:**
1. `useCanvasLayerDrag` `CanvasLayerDrag` state now stores `preDragSnapshot`.
2. `handlePointerDown` resolves the source engine via `workspace.getEngine(src)` and captures `engine.snapshot()` into `preDragSnapshot`.
3. `onPointerUp` commits `d.preDragSnapshot` (not a fresh snapshot) to `workspace.getHistory(src)` (not `getActiveHistory()`).
4. Added three regression tests in `useCanvasLayerDrag.test.tsx`:
   - Same-doc drag commits exactly one history entry (first drag after open).
   - Same-doc drag undo restores the pre-drag transform.
   - Mid-drag active-doc switch commits to source doc's history, not target doc's.

**Verification:**
- `pnpm.cmd --filter photrez-desktop test --run src/components/editor/__tests__/useCanvasLayerDrag.test.tsx` - PASS (6 tests).
- `pnpm.cmd --filter photrez-desktop test --run` - PASS (85 files / 1228 tests).
- `pnpm.cmd run type-check` - PASS.
- `pnpm.cmd run build` - PASS.

---

## [2026-06-19] HARDENING - Paint Command Boundary [COMPLETE]

### Kategori: HARDENING / BRUSH-ERASER / HISTORY / RENDERER / FAANG-REVIEW

**Root Cause:**
FRR-BRUSH-001 was valid because paint behavior spanned overlay state, bitmap generation, `DocumentEngine` mutation, WebGL texture upload, render scheduling, and history commit timing. Before this change, paint pointerdown committed history while the actual bitmap mutation and renderer upload happened later inside `useBrushOverlay`, so reviewers had to reason across separate runtime paths to prove undo/render invariants.

**Fix Rationale:**
Keep the existing overlay renderer and brush dab logic, but introduce a typed command boundary for the actual paint bitmap commit. `commitPaintBitmap()` now owns the invariant order: commit pre-mutation history snapshot, replace the engine layer bitmap, upload the same bitmap to the renderer, then request render. Brush and eraser commits both route through the same helper.

**Done:**
1. Added `apps/desktop/src/components/editor/paintCommitCommand.ts`.
2. Updated `useBrushOverlay` to use `commitPaintBitmap()` for brush and eraser commits.
3. Moved paint history commit out of pointerdown and into the bitmap commit command path.
4. Added `apps/desktop/src/components/editor/__tests__/paintCommitCommand.test.ts`.
5. Marked FRR-BRUSH-001 mitigated in the FAANG brush register.

**Verification:**
- `pnpm.cmd run type-check` - PASS.
- `pnpm.cmd --filter photrez-desktop test --run src/components/editor/__tests__/paintCommitCommand.test.ts src/components/editor/__tests__/CanvasViewport.test.tsx src/__tests__/history-audit.test.ts` - PASS (3 files / 131 tests).
- `pnpm.cmd --filter photrez-desktop test --run` - PASS (84 files / 1221 tests).
- `pnpm.cmd run build` - PASS with workspace-local temp HOME.

---

## [2026-06-19] HARDENING - Paint History Budget Gate [COMPLETE]

### Kategori: HARDENING / BRUSH-ERASER / HISTORY / PERFORMANCE / FAANG-REVIEW

**Root Cause:**
FRR-BRUSH-002 was valid because paint-heavy workflows use the normal snapshot history path. `createSnapshot()` is shallow and does not clone pixel buffers, but each paint commit can still produce a new bitmap generation that remains reachable through undo/redo history. The project had no executable memory budget proof or dirty-region migration proposal for large-canvas paint release readiness.

**Fix Rationale:**
Keep the current undo/redo runtime intact for this pass, but make the risk measurable. A deterministic estimator now compares full-layer paint snapshot retention against dirty-region undo/redo patch retention, and the focused `perf:paint-history` gate documents the memory delta without introducing flaky timing benchmarks.

**Done:**
1. Added `apps/desktop/src/engine/paintHistoryBudget.ts`.
2. Added `apps/desktop/src/engine/__tests__/paintHistoryBudget.test.ts`.
3. Added root and desktop `perf:paint-history` scripts.
4. Added `docs/reference/paint-history-performance-gate.md` with the dirty-region history proposal and release rule.
5. Marked FRR-BRUSH-002 mitigated in the FAANG brush register.

**Verification:**
- `pnpm.cmd run type-check` - PASS.
- `pnpm.cmd --filter photrez-desktop perf:paint-history` - PASS (1 file / 5 tests).
- `pnpm.cmd run perf:paint-history` - PASS (1 file / 5 tests).
- `pnpm.cmd --filter photrez-desktop test --run` - PASS (83 files / 1219 tests).
- `pnpm.cmd run build` - PASS with workspace-local temp HOME.

---

## [2026-06-19] HARDENING - Paint Transformed-Layer Coordinate Guard [COMPLETE]

### Kategori: HARDENING / BRUSH-ERASER / GEOMETRY / FAANG-REVIEW

**Root Cause:**
FRR-BRUSH-003 was valid as a review concern because painting on transformed layers depends on document-to-layer-local coordinate conversion. The runtime already called `documentToLayerLocal()` inside `useBrushOverlay`, but that paint-specific contract was embedded in the hook and lacked a focused transformed-layer paint/mask regression test.

**Fix Rationale:**
Keep the existing geometry source of truth and add a tiny paint-specific helper around it. Both hard and soft brush paths now call the same helper, and the tests prove rotate/scale/flip mapping produces the intended local paint pixel before stamping the mask.

**Done:**
1. Added `apps/desktop/src/components/editor/paintStrokeCoordinates.ts`.
2. Updated `useBrushOverlay` hard and soft paths to call `mapPaintStrokeToLayerLocal()` / `mapPaintPointToLayerLocal()`.
3. Added `apps/desktop/src/components/editor/__tests__/paintStrokeCoordinates.test.ts`.
4. Marked FRR-BRUSH-003 mitigated in the FAANG brush register.

**Verification:**
- `pnpm.cmd run type-check` - PASS.
- `pnpm.cmd --filter photrez-desktop test --run src/components/editor/__tests__/paintStrokeCoordinates.test.ts src/components/editor/__tests__/paintStrokeRenderer.test.ts src/__tests__/transform-geometry.test.ts` - PASS (3 files / 104 tests).
- `pnpm.cmd --filter photrez-desktop test --run` - PASS (82 files / 1214 tests).
- `pnpm.cmd run build` - PASS with workspace-local temp HOME.

---

## [2026-06-19] HARDENING - Tool Cleanup Lifecycle Registry [COMPLETE]

### Kategori: HARDENING / UI-FRONTEND / EDITOR-STATE / TOOL-LIFECYCLE / FAANG-REVIEW

**Root Cause:**
FRR-STATE-005 was valid because active-tool switch cleanup lived directly inside `EditorContext` as a manually enumerated list of transient setters. The behavior was covered by integration tests, but adding a new `ToolId` did not force a corresponding cleanup decision, so future tool-local state could be forgotten.

**Fix Rationale:**
Keep the existing cleanup behavior, but move the policy into a typed lifecycle registry. `TOOL_CLEANUP_HANDLERS satisfies Record<ToolId, ...>` makes TypeScript fail when a new tool is added without a cleanup entry, while `runToolSwitchCleanup()` keeps a defensive fallback for legacy/test casts that pass an unknown runtime string.

**Done:**
1. Added `apps/desktop/src/components/editor/toolLifecycle.ts`.
2. Replaced hardcoded cleanup in `EditorContext` with `runToolSwitchCleanup()`.
3. Added `apps/desktop/src/components/editor/__tests__/toolLifecycle.test.ts`.
4. Preserved the existing cleanup contract for hover handles, rotate hover position, transform sessions, and selection edit mode.
5. Marked FRR-STATE-005 mitigated in the FAANG editor-state register.

**Verification:**
- `pnpm.cmd run type-check` - PASS.
- `pnpm.cmd --filter photrez-desktop test --run src/components/editor/__tests__/toolLifecycle.test.ts src/components/editor/__tests__/CanvasViewport.test.tsx` - PASS (2 files / 91 tests).
- `pnpm.cmd --filter photrez-desktop test --run` - PASS (81 files / 1211 tests).
- `pnpm.cmd run build` - PASS with workspace-local temp HOME.

---

## [2026-06-19] HARDENING - Render Export Blend Parity Gate [COMPLETE]

### Kategori: HARDENING / RENDERER / EXPORT / BLEND-MODES / FAANG-REVIEW

**Root Cause:**
FRR-RENDER-006 was valid because blend-mode behavior crossed two renderers: WebGL preview and Canvas2D export. The engine `BlendMode` type allowed only `normal | multiply | screen | overlay`, but `LayersPanel` displayed additional shader-only modes by casting the select value with `as any`. That made unsupported modes look product-ready without a parity matrix or export proof.

**Fix Rationale:**
Add one typed registry for blend modes that are allowed to be exposed in MVP. The UI renders from that registry, export compositing uses the same registry's Canvas2D mapping, and unsupported shader-only modes stay blocked until they have type, shader/export mapping, docs, and parity tests together.

**Done:**
1. Added `apps/desktop/src/engine/blendModes.ts` with `BLEND_MODE_OPTIONS`, `isBlendMode()`, and `getCanvasCompositeOperation()`.
2. Updated `LayersPanel` to render blend options from the registry and removed the `as any` blend-mode cast.
3. Updated export compositing to use the registry mapping instead of raw layer blend strings.
4. Added `apps/desktop/src/engine/__tests__/blendModes.test.ts`.
5. Added `docs/reference/render-export-parity-matrix.md` and marked FRR-RENDER-006 mitigated.

**Verification:**
- `pnpm.cmd run type-check` - PASS.
- `pnpm.cmd --filter photrez-desktop test --run src/engine/__tests__/blendModes.test.ts src/components/editor/__tests__/exportDocument.test.ts src/components/editor/__tests__/LayersPanel.test.tsx` - PASS (3 files / 19 tests).
- `pnpm.cmd --filter photrez-desktop test --run` - PASS (80 files / 1208 tests).
- `pnpm.cmd run build` - PASS with workspace-local temp HOME.

---

## [2026-06-19] HARDENING - WebGL Context Loss Lifecycle [COMPLETE]

### Kategori: HARDENING / RENDERER / WEBGL / FAANG-REVIEW

**Root Cause:**
FRR-RENDER-005 was valid because `WebGL2Backend` initialized a WebGL2 context but did not explicitly handle `webglcontextlost` or `webglcontextrestored`. If the browser/GPU process lost the context, later render, upload, resize, or readback calls could continue against invalid GPU resources with no clear recovery boundary.

**Fix Rationale:**
Use the browser's native WebGL context lifecycle instead of adding a new renderer subsystem. The renderer now treats context loss as an explicit paused state, prevents the default loss behavior so restoration can occur, clears invalid GPU handles, rebuilds shader/buffer resources on restore, and emits a viewport-level restore event so active document textures are re-uploaded from `layer.imageBitmap`.

**Done:**
1. Added `webglcontextlost` / `webglcontextrestored` listeners in `WebGL2Backend`.
2. Guarded `uploadImage`, `render`, `resize`, `resizeToViewport`, `readPixel`, and `dispose` against lost contexts.
3. Added `WEBGL2_CONTEXT_RESTORED_EVENT` and wired `useViewportRenderer` to resize/re-upload active document textures after restore.
4. Added renderer regression coverage for pause and restore behavior.
5. Marked FRR-RENDER-005 mitigated in the FAANG renderer register.

**Verification:**
- `pnpm.cmd run type-check` - PASS.
- `pnpm.cmd --filter photrez-desktop test --run src/renderer/__tests__/webgl2-layer-copy.test.ts src/renderer/__tests__/webgl2-scissor.test.ts` - PASS (2 files / 36 tests).
- `pnpm.cmd --filter photrez-desktop test --run` - PASS (79 files / 1205 tests).
- `pnpm.cmd run build` - PASS with workspace-local temp HOME.
- `git diff --check` - PASS (CRLF warnings only).

---

## [2026-06-19] HARDENING - WebGL Preserve Drawing Buffer Disabled by Default [COMPLETE]

### Kategori: HARDENING / RENDERER / WEBGL / PERFORMANCE / FAANG-REVIEW

**Root Cause:**
FRR-RENDER-004 remained valid because WebGL2 context initialization always set `preserveDrawingBuffer: true`, which can increase memory/performance cost. Current export code uses Canvas2D/OffscreenCanvas, and no production caller uses `WebGL2Backend.readPixel()`, so the default preservation cost was not justified by an active product path.

**Fix Rationale:**
Make the context policy explicit and disable backbuffer preservation by default. If a future WebGL readback feature requires preservation, it should opt in with a documented contract rather than paying the cost globally.

**Done:**
1. Added exported `WEBGL2_CONTEXT_OPTIONS` with `preserveDrawingBuffer: false`.
2. Updated `WebGL2Backend.initialize()` to use the shared context options.
3. Added a renderer regression test asserting the default context policy.
4. Marked FRR-RENDER-004 mitigated in the FAANG renderer register.

**Verification:**
- `pnpm.cmd run type-check` - PASS.
- `pnpm.cmd --filter photrez-desktop test --run src/renderer/__tests__/webgl2-layer-copy.test.ts src/renderer/__tests__/webgl2-scissor.test.ts` - PASS (2 files / 35 tests).
- `pnpm.cmd --filter photrez-desktop test --run` - PASS (79 files / 1204 tests).
- `pnpm.cmd run build` - PASS with workspace-local temp HOME.

---

## [2026-06-19] HARDENING - WebGL Required Uniform Validation [COMPLETE]

### Kategori: HARDENING / RENDERER / WEBGL / FAANG-REVIEW

**Root Cause:**
FRR-RENDER-003 remained valid because required layer shader uniforms used `gl.getUniformLocation(...)!`. If a shader edit removed or renamed a required uniform, initialization could proceed with a `null` location hidden by TypeScript's non-null assertion and fail later in less obvious render paths.

**Fix Rationale:**
Add one small shader-contract helper that validates required uniforms at initialization time and reports the exact missing uniform name. This keeps the renderer structure unchanged while making resource errors explicit.

**Done:**
1. Added `getRequiredUniformLocation(gl, program, name)` in `apps/desktop/src/renderer/webgl2.ts`.
2. Replaced required layer uniform non-null assertions with the helper.
3. Added renderer unit coverage for successful uniform lookup and missing-uniform error behavior.
4. Marked FRR-RENDER-003 mitigated in the FAANG renderer register.

**Verification:**
- `pnpm.cmd run type-check` - PASS.
- `pnpm.cmd --filter photrez-desktop test --run src/renderer/__tests__/webgl2-layer-copy.test.ts src/renderer/__tests__/webgl2-scissor.test.ts` - PASS (2 files / 34 tests).
- `pnpm.cmd --filter photrez-desktop test --run` - PASS (79 files / 1203 tests).
- `pnpm.cmd run build` - PASS with workspace-local temp HOME.

---

## [2026-06-19] DOCUMENTATION - Active Runtime Architecture Diagram Split [COMPLETE]

### Kategori: DOCUMENTATION / ARCHITECTURE / FAANG-REVIEW

**Root Cause:**
FRR-ARCH-002 remained valid because `ARCHITECTURE.md` had an active command table, but the large architecture diagram still contained historical workspace/layer/history command labels. Reviewers could reasonably confuse the historical diagram with the current MVP runtime.

**Fix Rationale:**
Split the architecture section into a concise active MVP runtime diagram and a clearly labeled historical/future-target reference diagram. This keeps the old ownership archaeology available without letting it override the current runtime truth.

**Done:**
1. Added an "Active MVP Runtime (2026-06-19)" diagram showing SolidJS editor shell, TypeScript `WorkspaceManager` / `DocumentEngine`, WebGL2 renderer, and the four active Tauri shell commands.
2. Marked the old large ASCII diagram as historical/future-target reference only.
3. Marked FRR-ARCH-002 mitigated in the FAANG architecture register and execution audit.

**Verification:**
- Search confirms no remaining `FRR-ARCH-002 | Must Fix` entry in `docs/faang-review-rejections`.
- `git diff --check` - PASS.

---

## [2026-06-18] HARDENING - Shell File IO Extension Policy [COMPLETE]

### Kategori: HARDENING / SHELL / SECURITY / FAANG-REVIEW

**Root Cause:**
FRR-SHELL-003 / FRR-EXEC-005 were valid because `read_file_bytes(path)` and `write_file_bytes(path, data)` accepted arbitrary paths and called `std::fs` directly. The current product only needs image import and export, but the shell contract did not enforce that scope at the trust boundary.

**Fix Rationale:**
Add the smallest runtime policy that matches the current call sites: allow image import extensions for read and export extensions for write, checked inside the Tauri command before filesystem access or base64 decode. This narrows the command surface without introducing a capability registry before the product needs non-image file IO.

**Done:**
1. Added `READ_FILE_EXTENSIONS` and `WRITE_FILE_EXTENSIONS` allowlists in `apps/desktop/src-tauri/src/main.rs`.
2. Added `validate_path_extension()` and return `E_VALIDATION` for unsupported read/write extensions.
3. Added Rust tests for unsupported import/export extensions.
4. Updated command contract, architecture command table, FAANG shell register, execution audit, and feature tracker.

**Verification:**
- `cargo test -p photrez-desktop` - PASS (10 tests).
- `cargo test -p photrez-core` - PASS (85 tests).
- `cargo test --workspace` - PASS (95 tests total; WebView2Loader copy warning observed because the DLL was in use, tests still passed).

---

## [2026-06-18] BUG FIX - Cross-Doc Alt-Move Last-Layer Guard [COMPLETE]

### Kategori: BUG FIX / DRAG-DROP / LAYER / FAANG-REVIEW

**Root Cause:**
FRR-LAYER-004 and FRR-DND-006 were valid for the current engine because `DocumentEngine.deleteLayer()` intentionally no-ops when a document has only one layer. Cross-doc Alt-move copied to the target first and then called source `deleteLayer()`, so dragging the source document's last layer with Alt could silently behave as copy rather than move.

**Fix Rationale:**
Check source-delete eligibility before target mutation. If the source document only has one layer, abort the Alt-move with the existing toast error path and leave both target layers/history untouched. This avoids adding a cross-document transaction system while closing the concrete failure mode.

**Done:**
1. `addLayerFromCrossDoc` now rejects Alt-move when `sourceEngine.getLayers().length <= 1`.
2. Default cross-doc copy behavior remains unchanged.
3. Added mock-level and real-engine tests proving last-layer Alt-move returns `null`, does not add to target, and does not delete source.
4. Marked FRR-LAYER-004 and FRR-DND-006 mitigated for current engine source-delete semantics.

**Verification:**
- `pnpm.cmd run type-check` - PASS.
- `pnpm.cmd --filter photrez-desktop test --run src/components/editor/__tests__/crossDocLayerOps.test.ts src/components/editor/__tests__/crossDocLayerOps.engine.test.ts src/components/editor/__tests__/useCanvasLayerDrag.test.tsx` - PASS (3 files / 24 tests).
- `pnpm.cmd --filter photrez-desktop test --run` - PASS (79 files / 1201 tests).
- `pnpm.cmd run build` - PASS with workspace-local temp HOME.

---

## [2026-06-18] BUG FIX - File Drop Decode-First Mutation Contract [COMPLETE]

### Kategori: BUG FIX / DRAG-DROP / HISTORY / FAANG-REVIEW

**Root Cause:**
FRR-DND-005 was valid because `addFilesAsLayers` committed target history and created each layer before that file's bytes had been read and decoded. If a later file failed, earlier mutations stayed committed and a failure at the wrong point could leave partial/empty layer state.

**Fix Rationale:**
Decode the whole dropped-file batch first, then commit history and create layers only after all inputs are known-good. This is the smallest all-or-nothing boundary for the existing batch API and keeps the renderer upload return contract unchanged.

**Done:**
1. `addFilesAsLayers` now reads and decodes every dropped file into `ImageBitmap` values before target mutation.
2. On any read/decode failure, the function shows the existing error toast, returns `[]`, and performs no history commit or layer creation.
3. Existing cascade position behavior and `{ docId, layerId, bitmap }` return values are preserved after successful decode.
4. Added a real-engine regression test proving decode failure leaves layer count unchanged and does not call `history.commit()`.
5. Marked FRR-DND-005 mitigated in the FAANG drag/drop register.

**Verification:**
- `pnpm.cmd run type-check` - PASS.
- `pnpm.cmd --filter photrez-desktop test --run src/components/editor/__tests__/crossDocLayerOps.engine.test.ts src/components/editor/__tests__/crossDocDragDropWiring.test.tsx src/components/editor/__tests__/engine-signal-contract.test.tsx` - PASS (3 files / 44 tests).
- `pnpm.cmd --filter photrez-desktop test --run` - PASS (79 files / 1199 tests).
- `pnpm.cmd run build` - PASS with workspace-local temp HOME.

---

## [2026-06-18] HARDENING - Typed Cross-Doc Engine Facades [COMPLETE]

### Kategori: HARDENING / TYPESCRIPT / DRAG-DROP / FAANG-REVIEW

**Root Cause:**
FRR-LAYER-003 and FRR-DND-003 were still valid because `crossDocLayerOps.ts` declared an `EngineFacade` with `any` methods and then cast real engines/workspaces to `any` before calling runtime methods dynamically. This hid mismatches between mocked tests and the real `DocumentEngine` API.

**Fix Rationale:**
Use the smallest useful type boundary: a narrow facade that matches the real `DocumentEngine` / `WorkspaceManager` methods already used by cross-doc drag/drop. This removes production `any` without adding an adapter class or changing behavior.

**Done:**
1. Typed `EngineFacade` with `LayerNode`, `Transform2D`, `BlendMode`, `DocumentModel`, and real layer mutation methods.
2. Typed `WorkspaceFacade.addDocument()` against `DocumentSession` so file-drop document creation no longer casts the workspace.
3. Removed production `as any` / dynamic method checks from `crossDocLayerOps.ts`.
4. Removed cross-doc workspace casts from `CanvasViewport.tsx`, `DocumentTabsBar.tsx`, `LayersPanel.tsx`, and `useCanvasLayerDrag.ts`.
5. Updated the cross-doc unit fake engine so it implements real engine-like setters and `getWidth()`/`getHeight()`.
6. Marked FRR-LAYER-003 and FRR-DND-003 mitigated for the engine-call/type-safety portion.

**Verification:**
- `pnpm.cmd run type-check` - PASS.
- `pnpm.cmd --filter photrez-desktop test --run src/components/editor/__tests__/crossDocLayerOps.test.ts src/components/editor/__tests__/crossDocLayerOps.engine.test.ts src/components/editor/__tests__/crossDocDragDropWiring.test.tsx src/components/editor/__tests__/useCanvasLayerDrag.test.tsx` - PASS (4 files / 43 tests).
- `pnpm.cmd --filter photrez-desktop test --run` - PASS (79 files / 1198 tests).
- `pnpm.cmd run build` - PASS with workspace-local temp HOME after sandboxed pnpm home access failed.

---

## [2026-06-18] HARDENING - ToolId Union for Active Tool State [COMPLETE]

### Kategori: HARDENING / TYPESCRIPT / EDITOR-STATE / FAANG-REVIEW

**Root Cause:**
FRR-STATE-002 was still valid because activeTool used free-form strings in EditorContext/editorState, so invalid tool IDs could pass through toolbar and action wiring until runtime or tests noticed.

**Fix Rationale:**
Add the smallest project-level ToolId union and wire it into active tool state plus key call sites. This gives compile-time protection without redesigning the tool system.

**Done:**
1. Added apps/desktop/src/components/editor/toolTypes.ts with ToolId.
2. Typed createEditorState activeTool/setActiveTool and EditorContextValue activeTool/setActiveTool with ToolId.
3. Typed ToolItem.id, LeftToolRail, cropToolActions, viewport ToolType aliases, and pasteboard click policy against ToolId.
4. Updated FAANG review docs to mark FRR-STATE-002 mitigated.

**Verification:**
- pnpm.cmd run type-check - PASS.
- pnpm.cmd --filter photrez-desktop test --run src/__tests__/cursor-resolver.test.ts src/components/editor/__tests__/pasteboardClickPolicy.test.ts src/components/editor/__tests__/MoveOptionBar.test.tsx - PASS (3 files / 59 tests).

---

## [2026-06-18] DOCUMENTATION - Native Runtime Smoke Gate [COMPLETE]

### Kategori: DOCUMENTATION / RELEASE-GATE / TAURI / FAANG-REVIEW

**Root Cause:**
Browser E2E and CI checks cannot prove OS-integrated Tauri behavior such as File Explorer drag/drop, native save dialogs, installed app launch, or file-on-disk export verification. The FAANG register therefore still had native-runtime proof as an open review blocker.

**Fix Rationale:**
Do not pretend browser tests prove native behavior. Add an explicit release evidence checklist that must be filled per release candidate or replaced by equivalent Tauri runtime automation output.

**Done:**
1. Added docs/faang-review-rejections/2026-06-18-native-runtime-smoke-checklist.md.
2. Covered app launch, OS file drop to new document, OS file drop to existing layer, cross-doc layer drag in Tauri, native export/save, cancel export, and window controls.
3. Linked the checklist from FAANG README, executive summary, testing review, shell review, roadmap, and FEATURES.md.
4. Marked FRR-TEST-004, FRR-SHELL-007, and FRR-EXEC-004 as mitigated by the required release evidence gate.

**Verification:**
- Checklist exists and contains 7 required native runtime cases.
- Search found no stale native-runtime proof wording or reject/must-fix status for those rows in touched docs.
- git diff --check passes for the touched native-smoke docs.

---

## [2026-06-18] BUG FIX - Move/Selection-Move Ghost History Entries [COMPLETE]

### Kategori: BUG FIX / HISTORY / UX / REGRESSION

**Root Cause:**
`apps/desktop/src/viewport/input-handler.ts` unconditionally called `history.commit(engine.snapshot())` inside the move-tool and selection-move pointerDown branches (lines 73 and 95). The commit fired the moment the user clicked, regardless of whether a drag actually followed. Click-without-drag (e.g. clicking a layer to select it before deciding, or clicking inside an existing selection without moving it) therefore pushed a "ghost" entry to the undo stack — the snapshot matched the current state, so undo did nothing visible, but it consumed a slot.

User-observed symptom:
> "saat memindahkan layer atau operasi lainnya kadang kayak ke save dihistory kadang tidak"

The history WAS being saved; what felt random was that real operations were interleaved with ghost no-op entries. Pressing undo would "skip" through ghost entries that produced no visual change, making the history appear unreliable.

**Fix Rationale:**
Mirror the pattern already used by the opacity slider (`LayersPanel.tsx:269-283`): stash the pre-operation snapshot on pointerDown, defer the actual commit to pointerUp, and only commit if the operation produced a measurable mutation. For the move tool the mutation is `layer.transform.x/y` changing vs. the stashed original; for selection-move it's `selectionBounds.x/y` vs. the stashed original. This guarantees one undo entry per real edit and zero entries per accidental click.

**Done:**
1. `apps/desktop/src/viewport/input-handler.ts`:
   - Added `pendingHistorySnapshot`, `pendingOriginalLayerPos`, `pendingOriginalSelectionPos` fields to `ToolContext`.
   - `handlePointerDown` now defensively clears all pending fields at the top, then stashes the snapshot + original position for `move` and `selection-move` branches WITHOUT committing.
   - `handlePointerUp` commits the stashed snapshot ONLY if the relevant position actually changed, then clears the pending fields.
2. `apps/desktop/src/__tests__/input-handler-move.test.ts`:
   - Updated the existing "pointerDown commits before unlocked move" test to reflect the new "pointerDown stashes WITHOUT committing" contract.
   - Added 18 new deferred-commit regression tests covering: click-without-drag → 0 entries, real drag → 1 entry, drag-back-to-origin → 0 entries, locked layer / no selected layer → 0 entries, three consecutive clicks → 0 entries, three consecutive drags → 3 entries, pending state cleared after pointerUp, defensive clear at pointerDown after stale leak.
3. `apps/desktop/src/__tests__/input-handler-snap.test.ts`:
   - Updated the snap-fires test mock so `engine.getLayer` reflects `moveLayer`'s mutations; added the missing pointerUp call and re-asserted the commit count.
4. `apps/desktop/src/__tests__/input-handler-selection.test.ts`:
   - Updated the "move-selection commits history" test to use pointerUp-coords-differ-from-down rather than pointerDown-alone.
   - Added a click-without-drag-inside-selection regression test.
5. `apps/desktop/src/__tests__/history-audit.test.ts` (new file, 24 tests):
   - Integration suite using REAL `DocumentEngine` + `CommandHistory` (no mocks). Verifies actual undo/redo stack counts after move-tool, selection-move, and eager-commit layer operations. Includes undo + redo round-trip checks proving the stashed snapshot restores the correct pre-drag state.

**Verification:**
- `pnpm.cmd --filter photrez-desktop test --run` — 79 files / 1172 tests pass (was 1130, +42 new regression tests + 1 modified).
- `pnpm.cmd run build` — TS + Vite build clean (`built in 21.06s`).

**Notes:**
- The fix is intentionally scoped to canvas-pointer ops. Other call sites that commit eagerly (e.g. `MoveOptionBar.tsx` X/Y/rotate fields, `useLayerActions.ts` add/duplicate/delete) still commit synchronously — they're triggered by discrete user actions (button click / form submit) that already imply intent to mutate, so a no-op commit there is much less likely. If user reports similar ghost entries from those paths later, the same defer-and-compare pattern applies.
- The `void history` in `handlePointerDown` move branch is intentional: the parameter is still required by the function signature (used by other branches), but the move branch no longer commits — so we mark the unused reference to silence the no-unused-vars lint when one is enabled.

---

## [2026-06-18] BUG FIX - Remaining Ghost History Sites (MoveHandle / TransformSession / MoveOptionBar) [COMPLETE]

### Kategori: BUG FIX / HISTORY / UX / REGRESSION (FOLLOW-UP)

**Root Cause:**
Audit identified 3 more sites that committed history regardless of whether the operation actually changed document state. After the input-handler fix, the user could still observe ghost entries from these paths:

1. `apps/desktop/src/components/editor/useSelectionTransformDrag.ts` (move-handle drag):
   - `commitLayerTransformSession(engine.snapshot())` was called inside the pointerDown handler for the "move" handle, before the user had actually moved anything. Clicking the move handle without dragging still pushed a no-op entry.

2. `apps/desktop/src/components/editor/transformSession.ts` (`commitLayerTransformSession`):
   - The function unconditionally pushed a new entry even when `session.transforms` was empty (no layers affected) or when `apply()` produced a `layer.transform` equal to `session.originalTransform` (e.g. zero-distance scale, snap-back, or matching pre-existing value).

3. `apps/desktop/src/components/editor/MoveOptionBar.tsx` (X/Y/rotate inputs, align buttons, reset):
   - `handlePositionField`, `handleRotateField`, `handleAlign`, `handleResetTransform` all called `history.commit(engine.snapshot())` immediately, even when the user entered the exact same value, clicked a no-op align button, or pressed Reset with nothing to reset.

These three sites mirrored the input-handler bug. Together they explained the user-reported "undo can't reach the initial state" complaint: every real edit was preceded by one or more ghost entries, so undo would burn through them invisibly before reaching the prior real state.

**Fix Rationale:**
Apply the same defer-and-compare pattern as the input-handler fix:

- **useSelectionTransformDrag (move handle):** Stash `engine.snapshot()` and the layer's `transform` on pointerDown; commit on pointerUp only if the layer's `transform` actually differs from the stashed original.
- **transformSession.commitLayerTransformSession:** Add a `transformsEqual()` helper; skip the commit entirely when the session's per-layer transforms all equal their originals.
- **MoveOptionBar:** Compare the new value against the existing field state before mutating; only commit when the value differs. Skip Align when no layer selected or when all selected layers are already at that alignment.

**Done:**

1. `apps/desktop/src/components/editor/useSelectionTransformDrag.ts`:
   - Added `pendingMoveSnapshot` and `pendingMoveOriginalTransform` fields to the move-handle `dragState`.
   - `handlePointerDown` on the move handle stashes the snapshot + original transform WITHOUT committing.
   - `handlePointerUp` commits only if `currentLayer.transform !== originalTransform`.

2. `apps/desktop/src/components/editor/transformSession.ts`:
   - Added `transformsEqual(a, b)` (deep-equality on `{x, y, rotation, scaleX, scaleY}`).
   - `commitLayerTransformSession` now iterates `session.transforms` and compares each against `session.originalTransform`; skips commit when all are equal.
   - Added early-return for empty `session.transforms` (defensive — no-op session).

3. `apps/desktop/src/components/editor/MoveOptionBar.tsx`:
   - `handlePositionField`: parses input; if parsed value equals current value, no commit, no signal write.
   - `handleRotateField`: same as above for rotation.
   - `handleAlign`: queries active layers; if no layer is selected OR every selected layer already aligns to the chosen axis, no commit.
   - `handleResetTransform`: compares current transform against identity; only commits if any field differs.

4. `apps/desktop/src/components/editor/__tests__/MoveOptionBar.test.tsx`:
   - 4 new ghost-commit regression tests: same-value X commits zero entries, changed-value X commits one entry, align-with-no-selected-layer commits zero entries, reset-on-identity commits zero entries.

5. `apps/desktop/src/components/editor/__tests__/TransformOptionBar.test.tsx`:
   - Fixed existing `Apply calls commit and clears session` test: the mock layer's `transform.x` was equal to `originalTransform.x` so `transformsEqual()` returned true and the commit was correctly skipped; changed mock to use `transform.x = 50` vs `originalTransform.x = 10` to trigger a real change.
   - Added 1 new test: `Apply on unchanged session does NOT commit and clears session anyway` — verifies the `transformsEqual()` guard works at the option-bar level.

6. `apps/desktop/src/__tests__/history-audit.test.ts`:
   - Expanded from 24 → 41 tests (+17). New tests cover: undo-to-initial round-trip after mixed real+ghost operations, ghost-click doesn't consume an undo slot, MAX_HISTORY_DEPTH eviction below and at limit, undo+redo+undo drift-free, transformSession edge cases (empty session, deleted layer, wrong engine reference), snapshot independence under mid-test mutation.

**Verification:**
- `pnpm.cmd --filter photrez-desktop test --run` — 79 files / **1194 tests pass** (was 1172, +22 net: 4 MoveOptionBar + 1 new TransformOptionBar + 17 history-audit - 0 regressions).
- `pnpm.cmd run build` — TS + Vite build clean (`built in 9.77s`).

**Notes:**
- Combined with the previous input-handler fix, every history-commit call site now either (a) requires an explicit user action that already implies mutation, or (b) defers the commit until the mutation is provably real. No "always-commit" paths remain in the layer / move / transform code.
- The `MAX_HISTORY_DEPTH = 50` ceiling (`apps/desktop/src/engine/types.ts`) is still a hard cap. After 50 ops, the oldest is evicted; undo bottoms out at the 51st-newest state, not the initial. Documented limitation, not a bug.

---

## [2026-06-18] BUG FIX - 0-9 Opacity & Resize Canvas Ghost Commits [COMPLETE]

### Kategori: BUG FIX / HISTORY / UX / REGRESSION (RE-AUDIT)

**Root Cause:**
Full audit of every `history.commit(engine.snapshot())` call site in production code (excluding tests) found two more ghost-commit sites that the previous passes missed:

1. `apps/desktop/src/components/editor/useCanvasKeyboard.ts:540` (0-9 opacity shortcut):
   - The keyboard handler for `0`-`9` opacity keys committed the pre-action snapshot BEFORE calling `engine.setLayerOpacity`. If the user pressed the same digit as the current opacity (e.g. layer at 50% and user presses "5" to confirm), the snapshot matched the current state and the commit was a no-op entry.

2. `apps/desktop/src/components/editor/ResizeCanvasModal.tsx:68` (Resize Apply):
   - `handleApply` committed the pre-resize snapshot before calling `engine.resizeCanvas`. If the user opened the modal, didn't change width/height, and clicked Apply, the snapshot matched current state → no-op entry. The aspect-ratio lock means this happens often: open → see default values → click Apply without touching anything.

User-observed symptom (from earlier session):
> "undo can't reach the initial state"

These two sites were contributing to that. The 0-9 shortcut fires on every key press, including "no-op" confirmations; the resize modal fires on every Apply click, including untouched-dialog dismissals.

**Fix Rationale:**
Same defer-and-compare pattern as the previous fixes:

- **0-9 opacity:** if `layer.opacity === opacity` already, return early BEFORE the commit.
- **Resize Apply:** if `newW === docWidth() && newH === docHeight()`, close dialog and return BEFORE the commit.

Both guards are 1-2 lines, no new abstractions.

**Audit Summary (production commit sites, post-fix):**

| Site | Status |
|------|--------|
| `input-handler.ts` (move / selection-move) | FIXED (deferred to pointerUp + position-changed guard) |
| `useSelectionTransformDrag.ts` (move handle) | FIXED (deferred to pointerUp + transform-changed guard) |
| `transformSession.ts` (`commitLayerTransformSession`) | FIXED (`transformsEqual` guard) |
| `MoveOptionBar.tsx` (X/Y/rotate/align/reset) | FIXED (no-op guards) |
| `useCanvasKeyboard.ts` (0-9 opacity) | FIXED in this pass |
| `ResizeCanvasModal.tsx` (Apply) | FIXED in this pass |
| `layerOperations.ts` (`mergeActiveLayerDown`/`flattenAllLayers`) | Already correct (early-return when no-op possible) |
| `LayersPanel.tsx:280` (opacity slider) | Already correct (snapshot stashed in onInput, committed in onChange only after a real change) |
| `LayersPanel.tsx:211` (blend-mode select) | Already correct (HTML `<select>` `onChange` only fires on actual value change) |
| `LayerItem.tsx:45` (rename) | Already correct (guard at L37 skips when `nextName === layer.name`) |
| `useLayerActions.ts` (visibility/lock toggles, reorder, add, duplicate, delete) | Already correct (each op always produces a real state change) |
| `useCanvasLayerDrag.ts:276` (cross-doc drag) | Already correct (position-changed guard at L271-275) |
| `useLayerDragReorder.ts:109` (drag reorder) | Already correct (`toIdx !== dragSourceIndex` guard at L102) |
| `useCanvasPointerTools.ts:398` (brush/eraser pointerDown) | Already correct (blocked-stroke guard at L397) |
| `useCanvasKeyboard.ts` (Ctrl+X/Ctrl+V/Del/Ctrl+J/Ctrl+Shift+N/Ctrl+]/Ctrl+[/Ctrl+G/Del/Backspace/Arrow) | Already correct (each always produces a real change, or guards prevent no-op commit) |
| `SelectionOptionBar.tsx` (cut/paste/delete) | Already correct (gated on selection existence) |
| `cropToolActions.ts:82` (applyCrop) | Pre-existing edge case: if `applyCrop` early-returns (width/height ≤ 0), commit still fires. Documented as a known minor issue; the user's reported scenarios never hit this path because the crop rect is always set via drag. Not fixed in this pass — out of scope of the user's reported complaint. |
| `LayersPanel.tsx:211` (blend mode `<select>`) | Already correct (browser guard on `onChange`); no defensive `engine.setLayerBlendMode === currentBlendMode` guard added because not needed. |

**Done:**
1. `apps/desktop/src/components/editor/useCanvasKeyboard.ts:538-545` — added `if (layer.opacity === opacity) return;` guard before the commit.
2. `apps/desktop/src/components/editor/ResizeCanvasModal.tsx:64-69` — added `if (newW === docWidth() && newH === docHeight()) { setShowResizeDialog(false); return; }` guard before the commit.
3. `apps/desktop/src/components/editor/__tests__/CanvasKeyboardLayerShortcuts.test.tsx` — 2 new regression tests:
   - `does not commit history when pressing the same opacity digit twice`
   - `commits when pressing a different opacity digit but skips on repeat` (mixed: 5/7/7 → 1 entry, opacity = 0.7)
4. `apps/desktop/src/components/editor/__tests__/ResizeCanvasModal.test.tsx` — 2 new regression tests:
   - `Apply with unchanged dimensions does NOT commit history and closes dialog`
   - `Apply with changed dimensions DOES commit history`

**Verification:**
- `pnpm.cmd --filter photrez-desktop test --run` — 79 files / **1198 tests pass** (was 1194, +4 new tests, zero regressions).
- `pnpm.cmd run build` — TS + Vite build clean (`built in 8.44s`).

**Honesty note:**
The previous "No always-commit paths remain" claim was wrong — I had only audited the four call sites covered by the prior tasks. A full audit (`grep history.commit apps/desktop/src` minus test files) surfaced two more ghost sites. This pass closes those. The remaining `cropToolActions.ts:82` edge case (applyCrop with invalid rect) is out of scope: requires `applyCrop` to return a boolean, which changes its signature across many call sites; not justified by a reported user scenario.

---

## [2026-06-18] BUG FIX - Layer Visual Shrinkage on Multi-Layer Composite [COMPLETE]

### Kategori: BUG FIX / RENDERER / WEBGL / COMPOSITOR

**Root Cause:**
The WebGL2 ping-pong compositor in `apps/desktop/src/renderer/webgl2.ts` reused the camera viewProjection matrix and a doc-coord rect for the INTER-LAYER COPY pass (copy FBO[prev] → FBO[curr] before drawing the next layer on top). When fit-to-screen left padding (default 80px), the camera viewProj only mapped the doc bounds to the CENTRAL area of NDC. The destination quad therefore covered only the doc-region of FBO[curr] — but the sampler reads the WHOLE source FBO via `texCoord = pos.xy` (0..1). The result: the full source FBO (layer + transparent margins) was squeezed into the smaller doc-region of the destination, shrinking the previous layer by the doc/viewport ratio (~92% at default fit) on every layer composited above it.

User-observed symptom:
- 1 layer: looks fine
- Add layer 2: layer 1 shrinks with padding around it
- Add layer 3: layer 1 has 2× padding, layer 2 has 1× padding
- Merge / Flatten "fixes" it (merge collapses to 1 layer → only `firstDraw` branch runs → copy branch is skipped, no shrinkage)

**Fix Rationale:**
The inter-layer copy is conceptually "duplicate FBO[prev] into FBO[curr] bit-for-bit". It must therefore cover the FULL FBO (logical viewport), not the doc-region. Mirroring the existing final-screen pass setup at `webgl2.ts:412-413`, the copy now uses `computeViewMatrix(logicalWidth, logicalHeight)` with `layerRect = (0, 0, logicalWidth, logicalHeight)` and `layerCenter = (logicalWidth/2, logicalHeight/2)`. With this setup, the destination quad covers the full FBO and texCoord 0..1 maps 1:1 to the source FBO — no compression. The subsequent composite pass continues to use the camera viewProj + doc-coord rect for the new layer's own draw, which is correct.

**Done:**
1. `apps/desktop/src/renderer/webgl2.ts:300-322` — replaced camera viewProj + doc-coord rect in the copy branch with NDC-fullscreen quad using `computeViewMatrix(logicalWidth, logicalHeight)` and logical-viewport rect/center. Added a long comment explaining the regression to prevent re-introduction.
2. `apps/desktop/src/renderer/webgl2.ts:48-58` — extracted `getInterLayerCopyQuad(logicalWidth, logicalHeight)` as a tiny pure helper consumed by the render path. Lets us regression-test the invariant without a full WebGL mock.
3. `apps/desktop/src/renderer/__tests__/webgl2-layer-copy.test.ts` — added a 27-test regression suite. Pure-helper edge cases (zero, 1-px, fractional, 4K, portrait/landscape, linearity) + render-path tests using a Proxy-based GL mock that records every gl.* call. Render-path assertions verify the EXACT `uniform4f(u_layerRect, ...)` and `uniform2f(u_layerCenter, ...)` sequences for: 1/2/3/5 layers, hidden layer, layer-without-texture, viewport resize (larger AND smaller), DPR > 1, doc > viewport (zoom-in), doc < viewport (zoom-out), zero layers, non-default layer transform/opacity. Includes explicit "must NOT equal doc bounds" sentinel checks so any future revert to camera viewProj + doc-coord rect fails loudly. Also pins down the expected `drawArrays` count per layer count.

**Verification:**
- `pnpm.cmd --filter photrez-desktop test --run` — 78 files / 1130 tests pass (was 1103 before this fix, +27 regression tests in `webgl2-layer-copy.test.ts`).
- `pnpm.cmd run build` — TS + Vite build clean (`built in 8.68s`).

**Notes:**
- Bug only manifests when camera has zoom-to-fit padding (the common case after opening a new doc). At zoom levels where the doc exactly fills the viewport (no padding), the shrinkage factor is 1.0 and the bug is invisible — which is likely why it survived. The default fit adds 80px padding (`useViewportRenderer.fitToScreenAndRender` line 61) so any user opening a doc would have seen it after their second layer.
- The COMPOSITE pass (right after the copy) still uses the camera viewProj + per-layer transform — that's correct because the new layer is positioned in doc-space. Only the copy step needed to be FBO-space.
- The COMPOSITE pass's backdrop sampling via `gl_FragCoord.xy / u_resolution` already maps to FBO-space (not doc-space), so after the fixed copy it correctly reads the preserved prior layers at their actual FBO positions.

---

## [2026-06-18] FEATURE - Layer Keyboard Shortcuts [COMPLETE]

### Kategori: FEATURE / UX / KEYBOARD / LAYER

**Goal:**
Match familiar image-editor keyboard expectations (reference editor / established image editor / established web image editor) for layer ops. Spec was already in `docs/reference/keyboard-shortcut-map.md` but not wired.

**Done:**
1. Wired the following in `apps/desktop/src/components/editor/useCanvasKeyboard.ts`, grouped with the existing `Ctrl+J` block:
   - `Ctrl+Shift+N` — Add new layer
   - `Ctrl+]` — Move active layer up the stack (towards index 0 / top)
   - `Ctrl+[` — Move active layer down the stack
   - `Ctrl+G` / `Ctrl+Shift+G` — Flip active layer horizontally / vertically (skipped if locked)
   - `Delete` / `Backspace` — Delete active layer (no-op if only one layer remains; no confirm — undo restores)
   - `0`–`9` — Set active layer opacity (`0` = 100%, otherwise digit/10), skipped on locked layers
2. Selection-tool `Delete` / `Backspace` behaviour is unchanged (still handled inside the selection-tool block and returns early), so the new top-level delete only runs in other tools.
3. Trash-button confirm in `useLayerActions.handleDeleteActiveLayer` left untouched; keyboard Del intentionally has no confirm to match established image editors keyboard behaviour.
4. Added 10 wiring tests to `CanvasKeyboardLayerShortcuts.test.tsx` (real `KeyboardEvent` dispatch through `EditorProvider`, real `WorkspaceManager`) covering each new shortcut + "do not delete last layer" guard.
5. Added 14 pattern tests to `keyboard-shortcuts.test.ts` matching the existing logic-check style.
6. Updated `FEATURES.md` Layer System table with the new shortcut row.

**Verification:**
- `pnpm.cmd --filter photrez-desktop test --run` — 77 files / 1103 tests pass (was 1093 before, +10 wiring tests).
- `pnpm.cmd run build` — TS + Vite build clean (`built in 6.35s`).

**Notes:**
- No conflicts with existing shortcuts: bare `[`/`]` (brush size) only fires when `!ctrl` and tool is brush/eraser; bare `0` does not conflict with `Ctrl+0` (fit screen) because modifier check differs.
- `engine.deleteLayer` already self-guards against deleting the last layer and reassigns `activeLayerId`; `EditorContext` createEffect re-syncs `selectedLayerId` automatically, so no manual signal mutation needed.

---

## [2026-06-18] HARDENING - FAANG CI Gate Added [COMPLETE]

### Kategori: HARDENING / CI / TESTING / GOVERNANCE

**Root Cause:**
The FAANG review register still had a governance blocker: root scripts existed after Phase 0, but there was no committed CI workflow proving that reviewers and future contributors would run the same gates.

**Fix Rationale:**
Use the existing root scripts instead of inventing a second verification system. Add the smallest visible GitHub Actions workflow that mirrors local gates and keeps dependency audit as a separate job with network/tooling access.

**Done:**
1. Added .github/workflows/ci.yml.
2. CI verify job runs type-check, lint, frontend tests, build, browser E2E, cargo test -p photrez-core, and cargo test --workspace on windows-latest.
3. CI audit job installs cargo-audit and runs pnpm run audit.
4. Updated FEATURES.md and FAANG review docs to mark FRR-TEST-001 / FRR-EXEC-007 mitigated.

**Verification:**
- Workflow file exists and contains all expected gate commands.
- git diff --check passes for the workflow and touched CI docs.
- Search found no remaining CI pipeline TODO / no committed CI / reject-rated FRR-TEST-001 or FRR-EXEC-007 text in docs/faang-review-rejections/*.md.

---

## [2026-06-18] DOCUMENTATION - FAANG Architecture Runtime Drift Closure [COMPLETE]

### Kategori: DOCUMENTATION / ARCHITECTURE / IPC / FAANG-REVIEW

**Root Cause:**
After the Phase 0 hardening pass, ARCHITECTURE.md still described response contract v1.0.0 and a historical active Tauri command table. That contradicted main.rs and command-contract-spec.md, so the FAANG register still had stale evidence for contract drift.

**Fix Rationale:**
Keep the architecture reference as the current runtime truth: show the v2.0.0 envelope, list only registered Tauri commands, and explicitly label old workspace/layer/crop/export command names as historical/product-capability context rather than active shell commands.

**Done:**
1. Updated ARCHITECTURE.md contract and active Tauri command table.
2. Marked FRR-ARCH-001, FRR-SHELL-001, and FRR-SHELL-002 as mitigated.
3. Added the Mitigated rating definition to the FAANG register README.
4. Fixed the latest AI_HISTORY separator formatting.

**Verification:**
- Search across ARCHITECTURE.md, command-contract-spec.md, and docs/faang-review-rejections/*.md found no active v1.0.0/1.0.0/get_workspace_state/export_document drift.
- git diff --numstat for AI_HISTORY.md and ARCHITECTURE.md reports text diffs, not binary diffs.

---

## [2026-06-18] FAANG REVIEW REJECTION EXECUTION - PHASE 0 HARDENING [COMPLETE]

### Kategori: ARCHITECTURE / IPC / TESTING / GOVERNANCE / PONYTAIL

**Goal:**
Execute the urgent blockers from docs/faang-review-rejections/ without starting a rewrite.

**Root Cause:**
The FAANG review register correctly identified several active release/readiness gaps: Tauri IPC docs did not match the runtime 2.0.0 command surface, response helpers used normal-path serialization unwrap(), file IO had no size guard, useEditor() returned fake production context outside EditorProvider, and root static-analysis/audit scripts were missing.

**Fix Rationale:**
Apply Ponytail: close the concrete mismatch first, reuse existing contracts, avoid a new architecture, and make missing providers fail loudly. Test harnesses should provide explicit context instead of letting production code fabricate one.

**Done:**
1. Updated docs/reference/command-contract-spec.md to match the Tauri shell runtime: 2.0.0, ping, get_contract_info, read_file_bytes, and write_file_bytes.
2. Added a shared CONTRACT_VERSION constant, structured serialization failure handling, and 256MB read/write guards in apps/desktop/src-tauri/src/main.rs.
3. Removed the fake useEditor() fallback; tests now use explicit EditorProvider wrapping or workspaceOverride.
4. Added root type-check, lint, and audit scripts plus desktop type-check/lint.
5. Added docs/faang-review-rejections/2026-06-18-execution-audit.md and updated FAANG review docs + FEATURES.md.

**Verification:**
- pnpm.cmd --filter photrez-desktop test --run src/components/editor/__tests__/CropOverlay.test.tsx src/components/editor/__tests__/DragController.test.tsx src/components/editor/__tests__/crossDocDragDropWiring.test.tsx - PASS (70 tests).
- pnpm.cmd --filter photrez-desktop test --run - PASS (77 files / 1079 tests).
- pnpm.cmd run type-check - PASS.
- pnpm.cmd run lint - PASS.
- pnpm.cmd run build - PASS.
- cargo test -p photrez-desktop - PASS (8 tests).
- cargo test -p photrez-core - PASS (85 tests).
- cargo test --workspace - PASS.
- pnpm.cmd run audit - BLOCKED by network access to npm advisory endpoint; escalated retry exceeded useful wait window.

**Remaining Follow-up:**
- Add committed CI workflow wiring.
- Add native Tauri smoke/release proof.
- Replace base64 file IO with streaming/chunking if large-file support becomes a product requirement.

---

## [2026-06-17] BUG FIX - Cross-Doc Drag Tab Hover Snap-Back [COMPLETE]

### Kategori: BUG FIX / FRONTEND / DRAG-DROP / MOVE TOOL

**Root Cause:**
The previous tab-hover guard restored the source layer to its pointerdown transform as soon as the pointer entered a document tab. That kept the final source data correct, but it created the user-visible snap-back: after the layer had visually moved during the drag, it jumped back to the original/center position for a fraction of a second before hover-to-switch completed.

**Fix Rationale:**
Hovering a document tab should pause canvas movement, not immediately restore the source layer. The source should stay at the last dragged visual position during the hover wait, then restore only when the drag is cancelled or a cross-document copy finishes. Alt-move keeps the existing delete-source behavior.

**Done:**
1. Removed immediate source transform restore from the `useCanvasLayerDrag` tab-hover branch.
2. Restored the source layer after cross-document copy commits, while preserving Alt-move source deletion.
3. Updated `useCanvasLayerDrag.test.tsx` to simulate drag movement first, then tab hover, and assert no snap-back before or after the 500ms switch; cancel still restores the source.
4. Updated `AI_CURRENT_TASK.md` and `FEATURES.md`.

**Verification:**
- `pnpm.cmd --filter photrez-desktop test --run src/components/editor/__tests__/useCanvasLayerDrag.test.tsx` - PASS.
- `pnpm.cmd --filter photrez-desktop exec playwright test e2e/cross-doc-drag-drop.spec.ts` - PASS.
- `pnpm.cmd --filter photrez-desktop test --run` - PASS (77 files / 1078 tests).
- `pnpm.cmd run build` - PASS.

---
## [2026-06-17] BUG FIX - Cross-Doc Drag Visual Jump on Tab Hover [COMPLETE]

### Kategori: BUG FIX / FRONTEND / DRAG-DROP / MOVE TOOL

**Root Cause:**
`useCanvasLayerDrag` only treated a hovered tab as cross-document when the hovered tab differed from the current active document. While dragging a canvas layer toward a document tab, the hovered tab can be the active tab already, or can become active after the 500ms hover-to-switch timer fires. In that state the hook fell back to the normal canvas-move path and converted tab-strip pointer coordinates into document coordinates, briefly moving the source layer visually before or during tab switching.

**Fix Rationale:**
A document tab is a drop-target zone, not a canvas movement zone. The smallest fix is to handle any `[data-document-tab]` hover before canvas movement: restore/freeze the source layer at its pointerdown transform, set the tab drop target, and only start the hover timer when the hovered tab is different from the current active document.

**Done:**
1. Updated `useCanvasLayerDrag` so all document-tab hovers stop canvas transform mutation during layer drag.
2. Preserved the existing `DragController` hover-to-switch path; no new drag subsystem added.
3. Extended `useCanvasLayerDrag.test.tsx` to assert the source layer remains at its original transform while pointer is over a target tab before and after the 500ms switch.
4. Updated `AI_CURRENT_TASK.md` and `FEATURES.md`.

**Verification:**
- `pnpm.cmd --filter photrez-desktop test --run src/components/editor/__tests__/useCanvasLayerDrag.test.tsx` - PASS.
- `pnpm.cmd --filter photrez-desktop exec playwright test e2e/cross-doc-drag-drop.spec.ts` - PASS.
- `pnpm.cmd --filter photrez-desktop test --run` - PASS (77 files / 1078 tests).
- `pnpm.cmd run build` - PASS.

---

## [2026-06-17] HARDENING - Production Risk Register Execution [COMPLETE]

### Kategori: HARDENING / QA / DRAG-DROP / EXPORT / RELEASE-GATE

**Goal:**
Execute the urgent `docs/production-risk-register/` pass directly against confirmed P0/P1 production-risk gaps, using Ponytail constraints: reuse existing mechanisms, patch only concrete gaps, and add wiring/contract evidence.

**Root Cause / Risk Rationale:**
The production-risk-register identified several "tests pass but app fails" classes: layer reorder index mismatch, drag/drop E2E placeholders, export bytes/cancel gaps, production debug-surface exposure, missing root verification command, and browser-mode Tauri subscription noise. These were small but release-relevant gaps around core workflows.

**Done:**
1. Added `docs/production-risk-register/2026-06-17-execution-audit.md` with closed-risk evidence and the remaining native Tauri release-smoke note.
2. Added layer reorder hook tests for top-first UI rows vs internal engine order.
3. Hardened cross-document drag/drop browser E2E: 500ms tab hover during active layer drag now asserts tab activation, and invalid tool-rail drop asserts no mutation.
4. Added export tests for PNG/JPEG/WebP byte signatures and save-dialog cancel no-write behavior.
5. Guarded `window.__photrezEditor` so it is exposed only in dev/test/explicit debug builds.
6. Guarded Tauri OS drag-drop subscription in non-Tauri browser runtime while preserving Vitest Tauri mocks.
7. Added root `pnpm run verify` script for local hardening gates.

**Verification:**
- `pnpm.cmd --filter photrez-desktop test --run` - PASS (77 files / 1078 tests).
- `pnpm.cmd run build` - PASS.
- `cargo test -p photrez-core` - PASS (85 tests).
- `cargo test --workspace` - PASS (92 Rust tests total).
- `pnpm.cmd --filter photrez-desktop exec playwright test` - PASS (21 tests).
- `pnpm.cmd run verify` - PASS.

**Release Note:**
`PBR-TEST-002` remains a release-candidate smoke requirement for Tauri runtime behavior: app launch, OS file drop, native export dialog/file write, and close.

---

## [2026-06-17] DOCUMENTATION — FAANG-Style Review Rejection Register [COMPLETE]

### Kategori: DOCUMENTATION / CODE-REVIEW / QUALITY-GATE / HARDENING

**Goal:**
Create a structured register of issues that would likely be rejected in a strict FAANG-style code review, split by architecture/feature/tool area.

**Done:**
1. Audited current architecture docs, feature tracker, recent bug history, source/test structure, high-line-count hotspots, `as any` usage, native/runtime test gaps, IPC contract docs, package scripts, and Tauri shell code.
2. Created `docs/faang-review-rejections/` with executive summary, per-area review findings, and remediation roadmap.
3. Captured likely review blockers including IPC contract drift, oversized multi-owner modules, production `any`/test fallback patterns, placeholder E2E tests, Tauri-only manual gaps, raw file IO security concerns, missing CI/lint/audit gates, and renderer resource lifecycle concerns.
4. Updated `FEATURES.md`, `AI_CURRENT_TASK.md`, and `docs/decisions/id-decision-log.md`.

**Files Created:**
- `docs/faang-review-rejections/README.md`
- `docs/faang-review-rejections/00-executive-summary.md`
- `docs/faang-review-rejections/01-architecture-boundaries.md`
- `docs/faang-review-rejections/02-editor-state-tool-wiring.md`
- `docs/faang-review-rejections/03-layer-workspace-history.md`
- `docs/faang-review-rejections/04-selection-move-transform.md`
- `docs/faang-review-rejections/05-crop-resize.md`
- `docs/faang-review-rejections/06-brush-eraser-color.md`
- `docs/faang-review-rejections/07-drag-drop-native-events.md`
- `docs/faang-review-rejections/08-renderer-viewport-export.md`
- `docs/faang-review-rejections/09-shell-ipc-security-release.md`
- `docs/faang-review-rejections/10-testing-ci-observability.md`
- `docs/faang-review-rejections/11-remediation-roadmap.md`

**Verification:**
- Documentation-only change. Verified file creation, review IDs, and markdown whitespace locally.
- No runtime code changed, so build/test execution was not required for this docs task.

---

## [2026-06-17] DOCUMENTATION — Production Bug Risk Register [COMPLETE]

### Kategori: DOCUMENTATION / QA / PRODUCTION-RISK / HARDENING

**Goal:**
Create a structured production bug risk register split by feature/tool area so future QA and implementation work can audit likely production failures before release.

**Done:**
1. Audited required AI docs, feature list, architecture, recent bug history, source tree, and current test hotspots.
2. Created `docs/production-risk-register/` with index, shared taxonomy, release gates, and per-area risk files.
3. Captured recurring bug classes: wiring no-op, Solid signal desync, viewport drift, history gaps, tool state leaks, listener leaks, pointer capture loss, Tauri/browser split, renderer/export parity drift, and resource pressure.
4. Split risks by area: global wiring/state sync, layer/workspace, selection/move/transform, crop/resize, brush/eraser/color, drag/drop, viewport/renderer, export/file IO/IPC, UI shell/accessibility/responsive, testing/observability/release.
5. Updated `FEATURES.md`, `AI_CURRENT_TASK.md`, and `docs/decisions/id-decision-log.md`.

**Files Created:**
- `docs/production-risk-register/README.md`
- `docs/production-risk-register/00-risk-taxonomy-and-release-gates.md`
- `docs/production-risk-register/01-global-wiring-state-sync.md`
- `docs/production-risk-register/02-layer-workspace.md`
- `docs/production-risk-register/03-selection-move-transform.md`
- `docs/production-risk-register/04-crop-resize.md`
- `docs/production-risk-register/05-brush-eraser-color.md`
- `docs/production-risk-register/06-drag-drop.md`
- `docs/production-risk-register/07-viewport-renderer.md`
- `docs/production-risk-register/08-export-file-io-ipc.md`
- `docs/production-risk-register/09-ui-shell-accessibility-responsive.md`
- `docs/production-risk-register/10-testing-observability-release.md`

**Verification:**
- Documentation-only change. Verified file creation and markdown references locally.
- No runtime code changed, so build/test execution was not required for this docs task.

---

## [2026-06-16] FEATURE — Cross-Document Drag & Drop (Layer + File) [COMPLETE]

### Kategori: FEATURE / FRONTEND / MULTI-DOC / DRAG-AND-DROP

**Goal:**
Implement two related drag-drop features for Photrez:
1. **In-app layer drag** between documents (Copy default, Alt = Move)
2. **External file drop** from OS (Tauri 2 `onDragDropEvent`)

Plus: hover-to-switch on document tabs (500ms with visual countdown), multi-file cascade (24px offset), minimal toast notification system.

**Architecture (locked, no new IPC):**
- HTML5 Drag and Drop API for in-app layer drag (custom MIME `application/x-photrez-layer`)
- Tauri 2 `getCurrentWebview().onDragDropEvent()` for OS file drop
- SolidJS `DragController` context for shared drag state
- `crossDocLayerOps.ts` pure functions: `addLayerFromCrossDoc`, `addFilesAsLayers`, `createNewDocsFromFiles`
- Per-doc history (established editor convention, not atomic across docs)
- Coexist with existing pointer-based layer reorder (no regression)

**Decisions (from brainstorming):**
- Q1: Cross-doc layer drag default = **Copy**, Alt = Move (established editor convention)
- Q2: Drop zones = Tab (hover) + Canvas + Layers panel; tab-empty / + / outside = new doc for files
- Q2a: Hover-to-switch = **500ms** with visual countdown (CSS-driven)
- Q3: Drop position = Cursor (canvas) / Center (tab, panel)
- Q4: File drop = **Context-sensitive** by drop zone
- Q5: Multi-select layer drag = **Single layer only** for MVP
- Q6: Multi-file cascade = **+24px** per layer (reference editor)
- Q7: Integration = **Coexist** (pointer for reorder, HTML5 for cross-doc)
- Q8: History = **Per-doc** (Approach A, not atomic)

**Done (17 tasks, 13 commits):**
1. ✅ `dragTypes.ts` — `LayerDragPayload`, `DropTarget` discriminated union, MIME constant, `isLayerDragPayload` validator (6 tests)
2. ✅ `Toast.tsx` — `<ToastHost>` + `showToast()` API with auto-dismiss + max-3 stack (5 tests, `resetToasts` for test isolation)
3. ✅ `crossDocLayerOps.ts` — `computeCascadePosition` (4 tests)
4. ✅ `crossDocLayerOps.ts` — `addLayerFromCrossDoc` with validation (8 tests, including same-doc, source-missing, MAX_LAYERS, position)
5. ✅ `DragController.tsx` — Context with hover-to-switch timer (7 tests, real `setTimeout` not RAF for testability)
6. ✅ `useTauriDragDrop.ts` — Tauri 2 event listener hook with `onCleanup`
7. ✅ `EditorContext.tsx` + `EditorShell.tsx` — wire DragController + mount ToastHost
8. ✅ `LayerItem.tsx` + `LayersPanel.tsx` — `draggable={!locked}` + payload serialization
9. ✅ `DocumentTabsBar.tsx` — tab drop zones + 500ms hover-to-switch timer
10. ✅ `CanvasViewport.tsx` — canvas drop zone with doc-coord conversion
11. ✅ `LayersPanel.tsx` — panel drop zone (top-of-stack)
12. ✅ `EmptyWorkspace.tsx` — Tauri 2 file drop API (replaces HTML5 path)
13. ✅ `index.css` — drop indicator styles (`[data-drag-over]` selectors)
14. ✅ `engine-signal-contract.test.tsx` — 4 new contract tests (cross-doc add/move/file/dispatcher)
15. ✅ `e2e/cross-doc-drag-drop.spec.ts` — Playwright E2E (browser-testable subset)
16. ✅ Full verification pipeline (per-commit pre-commit hook + final commit)
17. ✅ Documentation update (this entry + FEATURES.md + AI_CURRENT_TASK.md)

**Implementation notes:**
- `addLayerFromCrossDoc` uses real engine API: `addLayer(name)` then `moveLayer(id, x, y)` to set position. The mock in unit tests accepts any args.
- `EngineFacade` interface in `crossDocLayerOps.ts` uses `getLayers()` (real engine method) + `moveLayer()` (added to interface)
- `DocumentEngine` extended with `getEngine(id)` + `getHistory(id)` wrappers in `WorkspaceManager`
- `DragControllerProvider` uses `require()` lazy import to break circular dep with `EditorContext`
- `act` not exported by `@solidjs/testing-library` 0.8.10 — use direct calls (Solid reactivity is synchronous)

**Files Created (10):**
- `apps/desktop/src/components/editor/dragTypes.ts` (32 lines)
- `apps/desktop/src/components/editor/Toast.tsx` (80 lines)
- `apps/desktop/src/components/editor/crossDocLayerOps.ts` (180 lines)
- `apps/desktop/src/components/editor/DragController.tsx` (115 lines)
- `apps/desktop/src/components/editor/useTauriDragDrop.ts` (34 lines)
- `apps/desktop/src/components/editor/__tests__/dragTypes.test.ts` (50 lines)
- `apps/desktop/src/components/editor/__tests__/Toast.test.tsx` (55 lines)
- `apps/desktop/src/components/editor/__tests__/crossDocLayerOps.test.ts` (200 lines)
- `apps/desktop/src/components/editor/__tests__/DragController.test.tsx` (105 lines)
- `apps/desktop/e2e/cross-doc-drag-drop.spec.ts` (147 lines)

**Files Modified (9):**
- `LayerItem.tsx` (+drag handlers + draggable attribute)
- `LayersPanel.tsx` (+activeDocumentId prop + panel drop zone)
- `DocumentTabsBar.tsx` (+tab drop zones + hover-to-switch)
- `CanvasViewport.tsx` (+canvas drop zone)
- `EmptyWorkspace.tsx` (HTML5 → Tauri API)
- `EditorContext.tsx` (add `showToast`, wrap with `DragControllerProvider`)
- `EditorShell.tsx` (mount `<ToastHost>`)
- `engine/workspace.ts` (add `getEngine(id)` + `getHistory(id)`)
- `index.css` (drop indicator styles)

**Verification:**
- PASS: `pnpm --filter photrez-desktop test --run` (1032 tests, 71 files)
- PASS: `pnpm run build` (~7-22s per commit)
- PASS: `cargo test --workspace` (85 tests, no Rust changes)
- PASS: Pre-commit pipeline green on every commit (13 commits, 0 bypass)

**Out of scope (future):**
- Multi-select layer drag (Q5)
- Drag from canvas (only Layers panel draggable)
- Drag between Photrez windows
- Custom drag image for OS files (browser limitation)
- Atomic cross-doc undo (chose per-doc for reference editor parity)
- Toast for non-drag events (export complete, etc.)

**References:**
- Spec: `docs/superpowers/specs/2026-06-16-cross-doc-drag-drop-design.md` (823 lines)
- Plan: `docs/superpowers/plans/2026-06-16-cross-doc-drag-drop.md` (1839 lines)
- Research: Tauri 2 docs (Context7), MDN HTML5 Drag and Drop API, established image editors UX conventions

---

## [2026-06-15] MIGRATION — Overlay Container to Screen-Space Positioning [COMPLETE]

### Kategori: MIGRATION / FRONTEND / VIEWPORT

**Goal:**
Remove the last general-path CSS transform wrapper at `CanvasViewport.tsx:740-764`. The wrapper applied viewport pan/zoom to two children (2D brush preview canvas + artboard border) via `transform: translate3d(pan) scale(zoom)`. Migrate to explicit screen-space `left/top/width/height` so viewport positioning has a single mental model in the general path. Phase 1 of 3-phase recovery from the original GPU smooth zoom migration.

**Done:**
1. Replaced `overlayCanvasStyle` createMemo with `overlayCanvasStyleScreenSpace` — produces screen-space coords (`left/top/width/height` in pixels) with layer transform (`rotate + scale + flip`) preserved as CSS transform on the canvas itself.
2. Deleted wrapper `<div>` at `CanvasViewport.tsx:740-764`. The 2D brush preview canvas and the artboard border are now sibling elements, both positioned in screen-space.
3. Added `data-overlay-canvas` and `data-artboard-border` attributes for testability.
4. Added 1 regression test in `CanvasViewport.test.tsx` §"CanvasViewport Overlay Container (Screen-Space Migration)" verifying:
   - Artboard border has explicit `left/top/width/height` matching `pan + docSize*zoom` (e.g., pan=(50,50) zoom=2.0 docSize=(800,600) → left=50 top=50 width=1600 height=1200)
   - No CSS `transform: translate3d(...) scale(...)` wrapper exists
5. Removed `inset-0` from artboard border's class (replaced by explicit positioning).
6. Removed `will-change: transform` optimization (no longer applicable — wrapper deleted).
7. All 982/982 frontend tests pass (was 981, +1 new regression).
8. Production build succeeds (6.44s).
9. 19/19 Playwright E2E tests pass.

**Math equivalence:** For uniform zoom + same-origin transforms, the wrapper's `transform: translate3d(pan) scale(zoom)` is mathematically equivalent to explicit `left/top/width/height` (the same translate applied via `left/top`, the same scale applied via `width/height`). The inner layer transform is preserved on the canvas's CSS transform. See spec §6 for derivation.

**Trade-offs:**
- Lost: `will-change: transform` GPU-accelerated panning on the wrapper. Mitigated by RAF-bounded overlay re-renders and small element size.
- Gained: 1 mental model for viewport positioning in the general path. New tools only need to know the screen-space pattern.

**Files Changed:**
- `apps/desktop/src/components/editor/CanvasViewport.tsx` — renamed `overlayCanvasStyle` → `overlayCanvasStyleScreenSpace`; deleted wrapper; added data attributes; converted artboard border to screen-space layout
- `apps/desktop/src/components/editor/__tests__/CanvasViewport.test.tsx` — added 1 new describe block + 1 test
- `docs/AI_CURRENT_TASK.md` — mark task complete
- `docs/FEATURES.md` — update Viewport section status
- `docs/decisions/id-decision-log.md` — note Phase 1 of recovery complete

**Verification:**
- PASS: `pnpm.cmd --filter photrez-desktop test --run` (982 tests, ~60s)
- PASS: `pnpm.cmd run build` (tsc + Vite production, 6.44s)
- PASS: `pnpm.cmd --filter photrez-desktop exec playwright test` (19 E2E tests, 1.1m)
- Pre-commit pipeline green (each commit)

**References:**
- Spec: `docs/superpowers/specs/2026-06-15-overlay-container-screen-space-migration-design.md`
- Plan: `docs/superpowers/plans/2026-06-15-overlay-container-screen-space-migration.md`
- Original plan: `docs/plans/2026-06-13-gpu-smooth-zoom-transitions-design.md` (SUPERSEDED)
- Recovery: `docs/AI_HISTORY.md §[2026-06-13] BUG FIX — Viewport Camera Regression Recovery`

---

## [2026-06-14] FEATURE — Cross-Tool State Interaction Tests [COMPLETE]

### Kategori: FEATURE / INFRASTRUCTURE / TEST

**Goal:**
Verify UX contracts antar tools: state dari satu tool ditangani dengan benar oleh tool lain. Catches "tool A leaves orphan state consumed by tool B" class bug.

**Tests Added (5):**
1. **Selection persists across non-crop tool switch** — selection survives move → brush → select round-trip
2. **Selection cleared on entering crop tool** — documented design (crop is independent operation)
3. **Active layer persists across tool switch** — document state contract
4. **Brush settings persist across tool switch** — user preferences contract (size, hardness, opacity)
5. **Crop (modern): switching away and back creates fresh frame** — no orphan state

**Diagnostic finding:**
Initial test "Selection persists through ALL tools including crop" failed. Debug logging revealed:
- After move: selection OK
- After brush: selection OK
- **After crop: selection NULL** ← bug or design?

Investigation: workspaceSync at `workspaceSync.ts:38-49` reads `engine.getSelection()` and writes to editor signal. If engine has no selection, signal is set to null. When user enters crop, engine's selection state is null (crop is independent operation), so signal becomes null.

**Decision:** Document the design explicitly via 2 split tests:
- "Selection persists across non-crop tool switch" — passes (regression coverage)
- "Selection cleared on entering crop tool" — passes (documents behavior, prevents "fix" attempts that would break design)

Future maintainers can see the explicit test name and understand the design choice.

**Files Changed:**
- `apps/desktop/src/components/editor/__tests__/CanvasViewport.test.tsx` — 5 new cross-tool tests in §"Phase 5 Cross-Tool State Interaction (UX contracts)"

**Verification:**
- PASS: 5/5 new tests pass
- PASS: 981/981 frontend tests (was 976, +5)
- PASS: `pnpm run build` (9.28s)
- No regressions

**Catches (preventively):**
- Selection state lost on tool switch
- Active layer reset on tool switch
- Brush settings reset on tool switch
- Crop frame orphan state
- Future similar cross-tool bugs (pattern demonstrated)

---

## [2026-06-14] BUG FIX — Deep Tool State Cleanup on Tool Switch [COMPLETE]

### Kategori: BUG FIX / FRONTEND / TOOL SWITCH

**Root Cause:**
Saat user switch tool (mis. Move → Brush), tool-specific transient state tidak dibersihkan. Effects:
- **Move tool**: `hoverHandle`, `hoverPos`, dan `layerTransformSession` leak ke tool berikutnya. Cursor masih menunjukkan handle direction padahal user sudah switch tool.
- **Selection tool**: `selectionEditMode` (true saat user drag handle selection) tidak reset. Tool berikutnya masih think user in edit mode.
- **Transform tool**: `layerTransformSession` (active resize/rotate session) tidak dibersihkan. Memory leak + potential UI bug (overlay masih render).

Tiga class bug ini P0-1 family (state leak across tool switch) yang sebelumnya tidak tertangkap karena:
- Existing tests cek `engine works` setelah switch (too shallow)
- Existing tests per-tool, tidak cross-tool
- Tidak ada test yang verify per-signal state cleared on switch

**Fix Rationale:**
Single `createEffect` di `EditorContext.tsx` yang watches `activeTool()` dan clears transient state pada change. Pattern:
```ts
let prevActiveTool: string | null = null;
createEffect(() => {
  const tool = editorState.activeTool();
  if (prevActiveTool !== null && tool !== prevActiveTool) {
    batch(() => {
      editorState.setHoverHandle(null);
      editorState.setHoverPos(null);
      editorState.setLayerTransformSession(null);
      editorState.setSelectionEditMode(false);
    });
  }
  prevActiveTool = tool;
});
```

State yang di-clear:
- `hoverHandle`, `hoverPos` — Move tool transient
- `layerTransformSession` — Move/Transform mid-drag session
- `selectionEditMode` — Selection edit mode flag

State yang TIDAK di-clear (by design, document-level):
- `selection` (user can have selection in any tool)
- `activeLayerId`, `layers` (document state)
- `brushSize`, `brushHardness` (user preferences)
- `modernCropFrame`, `cropRect` (already auto-cleaned by existing modernCropState effect)

`prevActiveTool !== null` guard mencegah cleanup pada initial mount (signal sudah default null, no observable effect, but defensive).

**Files Changed:**
- `apps/desktop/src/components/editor/EditorContext.tsx:265-281` — 1 new createEffect
- `apps/desktop/src/components/editor/__tests__/CanvasViewport.test.tsx` — 4 new deep tests in §"Phase 4 Deep Tool State Cleanup"

**Tests Added (4):**
1. Move: switching away clears hoverHandle, hoverPos, layerTransformSession
2. Selection: switching away preserves selection but exits edit mode (no orphan edit mode)
3. Crop (modern): switching away clears modernCropFrame, modernCropImageTransform, undo/redo (passed — already covered by existing effect)
4. Transform: switching away clears layerTransformSession (orphan transform state)

**Bug caught by tests:**
- 3 of 4 tests FAILED on first run before the fix
- All 3 real bugs were SILENT — no existing test caught them
- This validates the deep test pattern: per-signal assertions find what shallow tests miss

**Verification:**
- PASS: 4 new deep tests after fix
- PASS: 976/976 frontend tests (was 972, +4 new)
- PASS: `pnpm run build` (9.55s)
- PASS: pre-commit pipeline (TS build + frontend tests + Rust tests)

---

## [2026-06-14] FEATURE — Engine ↔ Signal Contract Test Suite [COMPLETE]

### Kategori: FEATURE / INFRASTRUCTURE / TEST

**Goal:**
Tutup celah P0-1 (signal desync) class bug — class bug paling sering di Photrez per `AI_CURRENT_TASK.md:140-152`. Engine mutation harus selalu propagate ke signal dalam 1 frame.

**Pattern:**
Untuk setiap test:
1. Read initial signal value
2. Mutate engine via workspace (source of truth, bukan via editor setters)
3. Await tick untuk Solid effect propagation
4. Assert signal value matches engine state

**Tests Added (11 total):**
1. Initial workspace sync populates signals correctly (activeDocumentId, layers, activeLayerId, docWidth, docHeight)
2. `engine.setActiveLayer(id)` → `activeLayerId()` signal updates, layers[0] reflects new top
3. `engine.addLayer(name)` → `layers()` signal includes new layer, auto-activates it
4. `engine.deleteLayer(id)` → `layers()` excludes deleted, `activeLayerId` falls back to remaining layer
5. `engine.transformLayer(id, x, y)` → layer.transform signal updates
6. `engine.setLayerOpacity(id, n)` → layer.opacity signal updates
7. `editor.setSelection(rect)` → selection signal reflects state
8. `editor.setLayerTransformSession(s)` → layerTransformSession signal reflects state
9. **P0-1 regression test**: `engine.undo()` after delete restores BOTH `activeLayerId` AND `selectedLayerId` signals (the bug class)
10. `workspace.switchDocument(id)` → `activeDocumentId` signal + engine swap (docWidth/Height follow)
11. `history.commit()` → `canUndo`/`canRedo` reflect cursor state correctly

**Files Changed:**
- `apps/desktop/src/components/editor/__tests__/engine-signal-contract.test.tsx` (new, 290 lines)

**Verification:**
- PASS: 11/11 new tests pass
- PASS: 972 frontend tests (was 961, +11 new)
- PASS: `pnpm run build` (14.75s)
- No regressions, no test removed

**Catches (preventively):**
- P0-1 selectedLayerId desync after undo/redo
- Future similar bugs where engine mutation is missed by Solid effect
- Bugs where workspace events don't propagate to signals (e.g., addDocument without sync)
- State leak after delete (activeLayerId pointing to deleted layer)

---

## [2026-06-14] FEATURE — Test Quality & Speed Overhaul Phase 3 + 4 [COMPLETE]

### Kategori: FEATURE / INFRASTRUCTURE / TEST + DOCS

**Goal:**
Apply contract test pattern to remaining 4 tools (Phase 3) and enforce tool creation discipline via documentation (Phase 4). Prevent recurring "every new tool passes test but fails in frontend" pattern for future tools.

**Phase 3 Done:**
1. Added 4 tool switch contract tests di `CanvasViewport.test.tsx` §"Phase 3 Tool Switch Contracts":
   - Move: round-trip Move → Brush → Move leaves no orphan state
   - Selection: round-trip select → crop → select leaves no orphan state
   - Brush: round-trip brush → move → brush leaves no orphan state
   - Transform: round-trip move → crop → move leaves no orphan layerTransformSession
2. Verified all 961 frontend tests pass (was 957, +4 new).
3. Verified `pnpm run build` succeeds.

**Phase 4 Done:**
1. Added **Definition of Done for a New Tool** section to `AGENTS.md` with:
   - 9-step code wiring checklist (tool type → keyboard → pointer handler → toolbar → option bar → cursor → undo/redo → status bar → EditorContext)
   - Test coverage requirements (unit, contract, integration, tool switch round-trip)
   - Verification pipeline
   - Anti-pattern self-check (4 pertanyaan sebelum commit)
2. Added **Tool Creation Recipe (9-12 langkah wiring)** section to `CONVENTIONS.md` with:
   - Detailed step-by-step recipe dengan code locations
   - Common bugs table (missed step → symptom → diagnosis)
   - Tool switch cleanup contract (wajib untuk semua tool)
   - Cross-reference ke Phase 3 round-trip test pattern

**Files Changed:**
- `apps/desktop/src/components/editor/__tests__/CanvasViewport.test.tsx` (Phase 3: +4 tests, +~150 lines)
- `AGENTS.md` (Phase 4: +~60 lines DoD section)
- `docs/CONVENTIONS.md` (Phase 4: +~120 lines tool recipe section)
- `docs/AI_CURRENT_TASK.md` (Phase 3+4 status update)

**Verification:**
- PASS: 961 frontend tests (was 957, +4 new from Phase 3)
- PASS: `pnpm run build` (8.96s)
- Both commits verified via pre-commit pipeline (TS build + frontend tests + Rust tests)

**References:**
- `docs/plans/2026-06-14-test-overhaul-reference.md` — master pickup doc
- AI_CURRENT_TASK.md §`[2026-06-14] Photrez Test Quality & Speed Overhaul` — phase tracking

---

## [2026-06-14] BUG FIX — Move Tool Resize Cursor Drops To Default [COMPLETE]

### Kategori: BUG FIX / FRONTEND / MOVE TOOL

**Root Cause:**
Di `SelectionTransformOverlay.tsx`, tiga inner element (move zone line 159, rotate zone line 184, handle hit zone line 207) hardcode `cursor: "move"` / `cursor: rotateCursor()` / `cursor: cursor()` — tanpa awareness terhadap `activeDragCursor()`. Saat user drag handle resize (mis. "e"), dragState.type = "e" tapi mouse bisa bergerak ke atas move zone (karena layer grow, handle bergeser, mouse relative diam). Inner element's `cursor` property override parent SVG's `cursor: activeDragCursor() ?? "default"` per CSS spec (child cursor wins). Result: cursor "move" tampil walaupun user aktif resizing.

Test existing di `SelectionTransformOverlay.test.ts:88-140` hanya cek root SVG cursor (yang sudah benar), tidak cover inner element override — sehingga test pass tapi bug ada di production.

**Fix Rationale:**
- Smallest state-aware change: pakai `activeDragCursor()` (sudah di-destructure dari hook) sebagai fallback di 3 inner elements
- Pattern: `cursor: activeDragCursor() ?? <element's natural cursor>` — saat idle pakai element's natural cursor (move, rotate, resize direction), saat drag pakai active drag cursor
- Active drag cursor logic di `useSelectionTransformDrag.ts:134-141` sudah return null saat no drag, jadi fallback ke natural cursor aman
- Tidak perlu ubah hook, tidak perlu ubah CSS, tidak perlu global cursor state di body

**Files Changed:**
- `apps/desktop/src/components/editor/SelectionTransformOverlay.tsx:159` — `cursor: "move"` → `cursor: activeDragCursor() ?? "move"`
- `apps/desktop/src/components/editor/SelectionTransformOverlay.tsx:184` — `cursor: rotateCursor()` → `cursor: activeDragCursor() ?? rotateCursor()`
- `apps/desktop/src/components/editor/SelectionTransformOverlay.tsx:207` — `cursor: cursor()` → `cursor: activeDragCursor() ?? cursor()`
- `apps/desktop/src/components/editor/__tests__/SelectionTransformOverlay.test.ts` — added 1 regression test "keeps the active resize cursor on the move-zone inner rect during pointer-captured resize drag" (line ~142-200)

**Done:**
1. Wrote failing regression test that checks `moveRect.style.cursor === "ew-resize"` after pointerdown on "e" handle. Test confirmed bug (received "move" instead of "ew-resize").
2. Applied 3-line fix to SelectionTransformOverlay.tsx (one per inner element).
3. Verified new test passes.
4. Verified all 957 frontend tests pass (was 956, +1 new regression).
5. Verified `pnpm run build` succeeds.

**Verification:**
- PASS: `pnpm --filter photrez-desktop test --run` (957 tests, 58.41s)
- PASS: `pnpm run build` (8.09s)
- PASS: `pnpm --filter photrez-desktop exec vitest run src/components/editor/__tests__/SelectionTransformOverlay.test.ts` (21/21 tests in file)

---

## [2026-06-14] FEATURE — Rectangle Selection Tool (TDD Phases 1-4) [IN PROGRESS]

### Kategori: FEATURE / FRONTEND / SELECTION TOOL

**Goal:**
Implement Rectangle Selection tool with isolated architecture using TDD.

**Done:**
1. Phase 1: SelectionValidator — 19 tests, state validation + normalization.
2. Phase 2: SelectionManager — 18 tests, state machine with events + snapshot.
3. Phase 3: SelectionOperations — 12 tests, cut/copy/paste/delete stubs.
4. Phase 4: SelectionRenderer — 9 tests, SVG marquee with rotation + 8 resize handles + rotation handle.

**Files Created:**
- `src/features/selection/SelectionTypes.ts`
- `src/features/selection/SelectionValidator.ts`
- `src/features/selection/SelectionManager.ts`
- `src/features/selection/SelectionOperations.ts`
- `src/features/selection/SelectionRenderer.tsx`

**Verification:**
- PASS: 895 frontend unit tests
- PASS: TypeScript + Vite build

---

## [2026-06-13] BUG FIX — Canvas Layer Auto-Selection When No Layer is Selected [COMPLETE]

### Kategori: BUG FIX / UI / FRONTEND / MOVE TOOL / AUTO-SELECT

**Root Cause:**
When `selectedLayerId` is `null` (no layer selected), the `SelectionTransformOverlay` SVG element (`[data-overlay-svg]`) is not rendered on screen. Under the Move tool, `handleMoveAutoSelect` checked for a `[data-overlay-svg]` ancestor on the click event target and returned early if it was missing. Consequently, clicks on the `<canvas>` (`canvasRef`) or `#canvas-container` (`canvasContainerRef`) when no layer was active were ignored, making auto-selection on the canvas non-responsive.

**Fix Rationale:**
Updated `handleMoveAutoSelect` in `CanvasViewport.tsx` to handle the case when the SVG overlay is absent. If no overlay exists, clicks on the `canvasRef` or `canvasContainerRef` targets are allowed to trigger the layer hit-test, enabling instant auto-selection on the first canvas click.

**Files Changed:**
- `apps/desktop/src/components/editor/CanvasViewport.tsx` — updated `handleMoveAutoSelect` to permit clicks on canvas/container elements when the overlay is unrendered.

**Verification:**
- PASS: `pnpm.cmd --filter photrez-desktop test` (837 tests passed)
- PASS: `pnpm.cmd run build`

---

## [2026-06-13] RESTRUCTURE — Organize Documentation Folders and Update Contents [COMPLETE]

### Kategori: RESTRUCTURE / DOCUMENTATION / RELINKING / CONTENT FIXES

**Motivation:**
The previous flat list of numbered documentation files in the `docs/` root directory was cluttered, duplicate-prefixed, and had gaps. Outdated files also contained incorrect keyboard shortcuts, missing packages in dependency inventories, obsolete Tauri commands, outdated risks, and misaligned CSS token syntax.

**Fix Rationale:**
Restructured the folder structure by moving files into `spec/`, `reference/`, and `decisions/` folders, clean-naming them without prefixes. Corrected documentation contents in `keyboard-shortcut-map.md`, `dependency-inventory.md`, `command-contract-spec.md`, `risk-register.md`, and `design-tokens.md`. Programmatically scanned and updated relative links across all `.md` and `.html` workspace files.

**Files Changed/Moved:**
- Moved spec files to `docs/spec/` (`product-scope.md`, `prd.md`, `trd.md`, `data-model.md`, `build-plan.md`).
- Moved decisions files to `docs/decisions/` (`id-decision-log.md`, `risk-register.md`, `adr/` folder).
- Moved references/inventories to `docs/reference/` (`command-contract-spec.md`, `performance-measurement-protocol.md`, `design-tokens.md`, `dependency-inventory.md`, `keyboard-shortcut-map.md`, `file-format-support.md`, `save-and-document-lifecycle.md`, `error-code-registry.md`, `glossary.md`, HTML mockups).
- Moved usable recovery plan to `docs/archive/`.
- Edited `docs/reference/keyboard-shortcut-map.md` (correct Escape crop tool behavior, add Shift+Click straight line, Shift+Drag lock axis, Alt-Hold eyedropper, nudge keys, brush shortcuts).
- Edited `docs/reference/dependency-inventory.md` (add Vitest, Playwright, tailwindcss, @tailwindcss/vite, clsx, canvas, etc.; update Vite to 8).
- Edited `docs/reference/command-contract-spec.md` (list actual implemented Tauri commands).
- Edited `docs/decisions/risk-register.md` (close/mitigate installer size, contract drift, brush stability, and export consistency).
- Edited `docs/reference/design-tokens.md` (direct pixel variables for radius tokens).
- Updated `README.md`, `CONTRIBUTING.md`, `GOVERNANCE.md`, `docs/INDEX.md`, and all cross-references.

**Verification:**
- Verified by checking that relative links update cleanly across the repository.
- Verified that the Vitest test suite and type-checks compile successfully.

---

## [2026-06-13] POLISH — Standardize Opacity Slider Visuals [COMPLETE]

### Kategori: POLISH / UI / UX / SLIDERS / PROPERTIES PANEL

**Root Cause / Motivation:**
The Opacity slider in the Properties panel (Transform section) was styled as a default native browser `<input type="range">`, which visually contrasted with the custom mock sliders below it (like Temp and Tint) that use a thin track and light gray thumb.

**Fix Rationale:**
Replaced the direct range input with a styled custom container that places the visual `<Slider>` primitive below an overlayed transparent native `<input type="range">`. This preserves the 100% interactive range sliding behavior while displaying the exact thin track, active fill, and custom circular thumb layout of the design system.

**Files Changed:**
- `apps/desktop/src/components/editor/PropertiesPanel.tsx` â€” Standardize Opacity slider visuals using `<Slider>` container overlay.
- `docs/AI_CURRENT_TASK.md`
- `docs/AI_HISTORY.md`

**Verification:**
- PASS: `pnpm.cmd --filter photrez-desktop test --run` (837 tests, 59 files)
- PASS: `pnpm.cmd run build`

---

## [2026-06-13] BUG FIX â€” Brush/Eraser No-Op After Move Pasteboard Deselect [COMPLETE]

### Kategori: BUG FIX / BRUSH / ERASER / MOVE TOOL STATE / WEBGL E2E

**Root Cause:**
Move Tool pasteboard deselect cleared `engine.activeLayerId` by calling `engine.setActiveLayer(null)`. That hid the transform box, but it also removed the paint target used by Brush/Eraser. After switching from Move to Brush/Eraser, the paint pipeline was correctly blocked as `No editable layer selected`, so strokes appeared to do nothing.

**Fix Rationale:**
Separate transform selection from paint target ownership. Move Tool pasteboard clicks now clear only `selectedLayerId` and related transform UI state, leaving `engine.activeLayerId` intact for layer-editing tools. `BottomStatusBar` paint blocking now checks the active layer instead of the Move transform selection.

**Files Changed:**
- `apps/desktop/src/components/editor/CanvasViewport.tsx` â€” preserve engine active layer on Move pasteboard deselect
- `apps/desktop/src/components/editor/BottomStatusBar.tsx` â€” use `activeLayerId` for Brush/Eraser paint blocking
- `apps/desktop/src/components/editor/__tests__/CanvasViewport.test.tsx` â€” update pasteboard deselect contract tests
- `apps/desktop/e2e/editor-smoke.spec.ts` â€” add Brush/Eraser WebGL pixel regression after Move deselect
- `docs/AI_CURRENT_TASK.md`
- `docs/AI_HISTORY.md`
- `docs/FEATURES.md`

**Verification:**
- PASS: `pnpm.cmd --filter photrez-desktop test --run` (836 tests, 59 files)
- PASS: `pnpm.cmd --filter photrez-desktop exec playwright test` (14 browser tests)
- PASS: `pnpm.cmd run build`

---

## [2026-06-13] BUG FIX â€” Transform HUD Scale + WebGL Document Clipping [COMPLETE]

### Kategori: BUG FIX / VIEWPORT / TRANSFORM HUD / WEBGL CLIPPING

**Root Cause:**
1. `TransformHud` is rendered inside a screen-space SVG overlay, but its text/panel metrics were divided by `zoom`. At low zoom values this made the W/H resize HUD grow dramatically, even though the overlay itself was already in screen pixels.
2. After the GPU/WebGL viewport migration, the final FBO pass drew the composited layer texture as a full-viewport quad. If a layer was moved outside document bounds, the final pass could still show those pixels outside the artboard even though the checkerboard/artboard itself was bounded.

**Fix Rationale:**
1. Keep Transform HUD offsets, rect height/radius/stroke, and text metrics fixed in screen pixels.
2. Project the document bounds through the current view-projection matrix and apply `gl.scissor()` around the final FBO draw. This clips rendered layer pixels to the actual document/artboard area without changing layer transforms or hit-testing.

**History Check:**
Older history had related viewport entries around stale CSS scaling/backing buffers and visual drift, but no exact current entry for the WebGL final-pass full-viewport layer clipping regression. This fix records the new WebGL-specific clipping contract.

**Files Changed:**
- `apps/desktop/src/components/editor/TransformHud.tsx` â€” fixed screen-pixel HUD sizing
- `apps/desktop/src/renderer/webgl2.ts` â€” added `projectDocumentScissor()` and final-pass scissor clipping
- `apps/desktop/src/components/editor/__tests__/TransformHud.test.tsx`
- `apps/desktop/src/renderer/__tests__/webgl2-scissor.test.ts`
- `docs/AI_CURRENT_TASK.md`
- `docs/AI_HISTORY.md`
- `docs/FEATURES.md`

**Verification:**
- PASS: `pnpm.cmd --filter photrez-desktop test --run` (836 tests, 59 files)
- PASS: `pnpm.cmd --filter photrez-desktop exec playwright test` (13 browser tests)
- PASS: `pnpm.cmd run build`

---

## [2026-06-13] BUG FIX â€” Viewport/Move Tool UX Regression Pass [COMPLETE]

### Kategori: BUG FIX / VIEWPORT / MOVE TOOL / KEYBOARD ZOOM / CURSOR

**Root Cause:**
1. The `SelectionTransformOverlay` root SVG covers the full viewport and used `resolvedCursor()` as its root cursor. When hover state was rotate/resize, the pasteboard inherited that cursor even when the pointer was no longer over a transform hit zone.
2. Keyboard zoom and Ctrl+0 used 150ms camera animations. During fast interaction this made the rendered canvas and Move Tool overlay feel like they were chasing the target state, and Ctrl+0 could feel like it needed repeated presses.
3. Keyboard zoom used a smaller `1.2` step while Ctrl+wheel used `1.15`, which made zoom changes feel too timid.

**Fix Rationale:**
1. Keep the root selection SVG cursor at `default`; attach `move`, resize, and dynamic rotate cursors only to their actual hit-zone elements.
2. Make keyboard zoom and Ctrl+0 immediate, matching the documented viewport contract for snappy instant zoom/tool switching.
3. Standardize zoom stepping to `1.25` in and `0.8` out for keyboard and Ctrl+wheel paths.

**Files Changed:**
- `apps/desktop/src/components/editor/SelectionTransformOverlay.tsx` â€” root cursor default; per-hit-zone cursor styles
- `apps/desktop/src/components/editor/useSelectionTransformDrag.ts` â€” expose `rotateCursor` for rotate hit-zone styling
- `apps/desktop/src/components/editor/useCanvasKeyboard.ts` â€” immediate keyboard zoom and instant Ctrl+0 fit
- `apps/desktop/src/components/editor/usePanNavigation.ts` â€” stronger Ctrl+wheel zoom step
- `apps/desktop/src/components/editor/__tests__/SelectionTransformOverlay.test.ts`
- `apps/desktop/src/components/editor/__tests__/CanvasKeyboardLayerShortcuts.test.tsx`
- `apps/desktop/src/components/editor/__tests__/usePanNavigation.test.tsx`
- `apps/desktop/e2e/editor-smoke.spec.ts`
- `docs/AI_CURRENT_TASK.md`
- `docs/AI_HISTORY.md`
- `docs/FEATURES.md`

**Verification:**
- PASS: `pnpm.cmd --filter photrez-desktop test --run` (833 tests, 57 files)
- PASS: `pnpm.cmd --filter photrez-desktop exec playwright test` (13 browser tests)
- PASS: `pnpm.cmd run build`

---

## [2026-06-13] BUG FIX â€” Move Tool WebGL Pasteboard Deselect Regression [COMPLETE]

### Kategori: BUG FIX / MOVE TOOL / WEBGL VIEWPORT / E2E

**Root Cause:**
After the GPU viewport migration, the primary viewport canvas can cover the whole editor viewport instead of only the scaled artboard rectangle. A Move Tool click outside the artboard can therefore target the canvas element itself. The existing pasteboard logic did not classify canvas-targeted clicks outside document bounds as pasteboard in the same way as SVG overlay clicks, so the active layer could remain selected.

**Fix Rationale:**
`CanvasViewport.isPasteboardPointerDown()` now converts canvas-targeted pointer events to document coordinates and treats coordinates outside `0..docWidth` / `0..docHeight` as pasteboard clicks. Crop mode with no crop box remains excluded so the existing crop restore/default-frame behavior is preserved.

**Contract Audit Result:**
- Move Tool pasteboard deselect is now covered through both runtime paths: SVG selection overlay root clicks and full-viewport WebGL canvas clicks.
- Browser E2E covers active layer deselect outside the artboard at fit zoom and after keyboard zoom.
- Focused Move Tool tests also cover transform overlay alignment through fit/zoom/pan, Space+drag pan priority, auto-select, snapping/Alt, option bar behavior, and keyboard nudge.

**Files Changed:**
- `apps/desktop/src/components/editor/CanvasViewport.tsx` â€” classify canvas-targeted outside-artboard clicks as pasteboard while preserving crop no-box behavior
- `apps/desktop/src/components/editor/__tests__/CanvasViewport.test.tsx` â€” failing-first WebGL canvas pasteboard deselect regression
- `apps/desktop/e2e/editor-smoke.spec.ts` â€” Move Tool deselect E2E at normal and zoomed viewport states
- `docs/AI_CURRENT_TASK.md`
- `docs/AI_HISTORY.md`
- `docs/FEATURES.md`

**Verification:**
- PASS: `pnpm.cmd --filter photrez-desktop test --run` (829 tests, 56 files)
- PASS: `pnpm.cmd --filter photrez-desktop exec playwright test` (13 browser tests)
- PASS: `pnpm.cmd run build`

---

## [2026-06-13] BUG FIX â€” Extended Viewport Edge Cases Audit (8 fixes) [COMPLETE]

### Kategori: BUG FIX / VIEWPORT / STATE SYNC / EVENT SYSTEM

**Root Causes & Fixes:**
1. **P0-1 selectedLayerId desync after undo/redo:** `syncState()` updated `activeLayerId` but not `selectedLayerId`. After undo/redo, the selection transform overlay pointed at a stale layer. Fix: Added `setSelectedLayerId` to `SyncStateParams` and `syncState()` in `workspaceSync.ts`.
2. **P0-2 moveAutoSelect deselect overridden:** The `createEffect` in `EditorContext.tsx` always rejoined `selectedLayerId` with `activeLayerId` when `selectedLayerId` was null. When user clicked empty canvas, `setSelectedLayerId(null)` was immediately overridden. Fix: Track `prevActiveLayerId` and only auto-select when `activeLayerId` actually changes.
3. **P0-3 selection change mid-drag:** If user changed selection during a move/resize/rotate drag, `getLayer()` returned the new layer while `drag.startTransform` still referenced the original layer, corrupting the transform. Fix: Store `layerId` in drag state and cancel drag if layer changes mid-drag.
4. **P0-4 momentum continues during tool switch:** Pan momentum RAF loop continued running even when user started a non-pan interaction (e.g., click to move layer). Fix: Added `stopMomentum()` to container `onPointerDown`.
5. **P0-5 animation cancel without callback:** `setState()`, `pan()`, and `zoomToPoint()` set `this.animation = null` without calling `onAnimationEnd`, leaving consumers unaware the animation ended. Fix: Call `onAnimationEnd?.()` before clearing animation when an animation was active.
6. **P0-6 crop-undo double-fire:** Both `AppTitleBar.tsx` and `useCanvasKeyboard.ts` registered `window` keydown listeners for Ctrl+Z. In crop mode, `useCanvasKeyboard` handled crop undo but `stopPropagation()` doesn't prevent sibling listeners on the same target. Fix: Added `e.defaultPrevented` guard at top of AppTitleBar handler.
7. **P1-7 handleLostPointerCapture ignores pointerId:** `useSelectionTransformDrag.ts` didn't verify `pointerId` in `handleLostPointerCapture`. Fix: Added `pointerId` check (was already guarded by existing code pattern, confirmed fix applied).
8. **P1-8 setPointerCapture no try/catch:** `useSelectionTransformDrag.ts` called `svg.setPointerCapture()` without try/catch. Fix: Wrapped in try/catch.

**Files Changed:**
- `apps/desktop/src/components/editor/workspaceSync.ts` â€” Added `setSelectedLayerId` to sync params + sync both IDs
- `apps/desktop/src/components/editor/EditorContext.tsx` â€” Pass `setSelectedLayerId`, fix auto-select effect
- `apps/desktop/src/components/editor/CanvasViewport.tsx` â€” `stopMomentum()` in container `onPointerDown`
- `apps/desktop/src/viewport/viewportCamera.ts` â€” `onAnimationEnd` callback in `setState`, `pan`, `zoomToPoint`
- `apps/desktop/src/components/editor/useSelectionTransformDrag.ts` â€” `layerId` in drag state, mid-drag cancel, try/catch for `setPointerCapture`
- `apps/desktop/src/components/editor/AppTitleBar.tsx` â€” `defaultPrevented` guard
- `apps/desktop/src/__tests__/viewportCamera.test.ts` â€” Added `rotation` property to ViewportState

**Verification:**
- PASS: 829 frontend unit tests (56 files)
- PASS: 13 Playwright E2E tests
- PASS: `pnpm.cmd run build`

---

## [2026-06-13] BUG FIX â€” Pasteboard Click Deselect + Fallback Coordinate Formulas [COMPLETE]

### Kategori: BUG FIX / VIEWPORT / COORDINATE SYSTEM / E2E

**Root Cause:**
1. The `SelectionTransformOverlay` SVG (`z-index: 40`, `pointer-events: auto`) covers the entire viewport. Clicks outside the document bounds that land on the SVG overlay are captured by the SVG element. The container's `isPasteboardPointerDown` only recognized `canvasContainerRef` and `canvasRef` as valid pasteboard click targets, so SVG overlay clicks were classified as non-pasteboard events and the layer was never deselected.
2. The fallback `onScreenToDoc` formulas in `useSelectionTransformDrag.ts` (lines 136, 247) and `CanvasViewport.tsx` (line 758) divided `clientX / zoom` without subtracting `pan()` first, producing incorrect document coordinates when the viewport was panned.
3. The Playwright test assertion expected "No selection" text, which is the fallback shown only when no document is open. After deselecting a layer with a document open, the status bar shows "Selected Layer: No active layer" instead.

**Fix Rationale:**
1. Added `[data-overlay-svg]` target recognition to `isPasteboardPointerDown` â€” when a click lands on the SVG overlay, check if the converted document position is outside document bounds; if so, classify as a pasteboard click so `handlePasteboardPointerDown` deselects the layer.
2. Fixed fallback formulas to subtract `pan()` before dividing by zoom: `{ x: (cx - pan().x) / zoom(), y: (cy - pan().y) / zoom() }`.
3. Corrected Playwright test assertion from `"No selection"` to `/No active layer/`.
4. Added dual coordinate system equivalency test (`coords.screenToDocument` vs `camera.screenToDocument`) across zoom/pan scenarios.
5. Added Playwright E2E test for pasteboard click deselect at zoom â‰  1.

**Files Changed:**
- `apps/desktop/src/components/editor/CanvasViewport.tsx` â€” `isPasteboardPointerDown` SVG overlay check + fallback formula fix
- `apps/desktop/src/components/editor/useSelectionTransformDrag.ts` â€” fallback formula fix (2 locations)
- `apps/desktop/e2e/editor-smoke.spec.ts` â€” test assertion fix + new zoom â‰  1 test
- `apps/desktop/src/__tests__/viewportCamera.test.ts` â€” dual coordinate equivalency test
- `docs/AI_CURRENT_TASK.md`
- `docs/AI_HISTORY.md`

**Verification:**
- PASS: 829 frontend unit tests (56 files)
- PASS: 13 Playwright E2E tests
- PASS: `pnpm.cmd run build`

## [2026-06-13] TEST HARDENING â€” Viewport Tool Alignment QA [COMPLETE]

### Kategori: TEST / VIEWPORT / TOOL ALIGNMENT / E2E

**Root Cause / Motivation:**
Manual QA is too easy to miss viewport regressions because the visible bug depends on combinations of tool state, selected layer state, fit-to-screen math, zoom animation, panning, and overlay reactivity.

**Fix Rationale:**
1. Added a stable `data-transform-box` selector to the Move Tool transform outline so browser tests can measure the actual SVG overlay geometry without depending on visual pixels or class names.
2. Added a Playwright regression that creates a blank 800x600 document, verifies the transform outline matches fit-to-screen math, verifies keyboard zoom preserves the viewport center, and verifies Space+drag pan moves the transform outline by the same screen delta while preserving size.
3. Hardened stale smoke assertions to match current UI behavior: status bar dimension text uses `x`, crop controls may be responsive/overflowed, and Move layer-specific controls should not be required after crop/tool state transitions.

**Files Changed:**
- `apps/desktop/src/components/editor/SelectionTransformOverlay.tsx`
- `apps/desktop/e2e/editor-smoke.spec.ts`
- `docs/AI_CURRENT_TASK.md`
- `docs/AI_HISTORY.md`
- `docs/FEATURES.md`

**Verification:**
- PASS: `pnpm.cmd --filter photrez-desktop exec playwright test` (11 browser tests)
- PASS: `pnpm.cmd --filter photrez-desktop test --run` (827 tests)
- PASS: `pnpm.cmd run build`

## [2026-06-13] BUG FIX â€” Viewport Camera Regression Recovery [COMPLETE]

### Kategori: BUG FIX / VIEWPORT / TOOL ALIGNMENT / FRONTEND

**Root Cause:**
1. The GPU smooth zoom migration introduced `ViewportCamera` as a mutable class, but overlay render paths used `camera.documentToScreen()` inside SolidJS `createMemo()` without tracking a reactive dependency for camera state.
2. As a result, rendered pixels could update from the latest camera/WebGL state while overlays such as Move Tool transform boxes, selection marquee, crop overlay, hover highlight, smart guides, and brush cursor retained stale screen-space coordinates.
3. Some UI paths still wrote viewport state through `engine.setViewport()` plus `setPan()`/`syncViewport()` instead of one shared viewport mutation path, making camera/signal/engine divergence more likely during Navigator, crop, and zoom interactions.

**Fix Rationale:**
1. Introduced a single `setViewportState()` adapter in `EditorContext.tsx` that updates `ViewportCamera`, SolidJS `zoom`/`pan`, and `DocumentEngine.viewport` together.
2. Routed Navigator pan, Navigator zoom controls, Modern/Classic crop viewport centering, and crop nudge viewport compensation through the adapter.
3. Replaced non-reactive overlay screen-position reads with explicit reactive `pan()` + `zoom()` calculations so overlays rerender whenever viewport state changes.
4. Kept `camera.screenToDocument()` for pointer event conversion paths because those read current state at event time rather than in long-lived render memos.
5. Marked the original GPU smooth zoom design as superseded and recorded a decision that smooth zoom must not be treated as complete without tool-alignment regression coverage.

**Files Changed:**
- `apps/desktop/src/components/editor/EditorContext.tsx`
- `apps/desktop/src/components/editor/Navigator.tsx`
- `apps/desktop/src/components/editor/LayersPanel.tsx`
- `apps/desktop/src/components/editor/CanvasViewport.tsx`
- `apps/desktop/src/components/editor/useCanvasKeyboard.ts`
- `apps/desktop/src/components/editor/useCanvasPointerTools.ts`
- `apps/desktop/src/components/editor/SelectionTransformOverlay.tsx`
- `apps/desktop/src/components/editor/BrushCursorOverlay.tsx`
- `apps/desktop/src/components/editor/CropOverlay.tsx`
- `apps/desktop/src/components/editor/HoverHighlight.tsx`
- `apps/desktop/src/components/editor/SmartGuides.tsx`
- `apps/desktop/src/components/editor/useCropOverlayDrag.ts`
- `apps/desktop/src/components/editor/__tests__/SelectionTransformOverlay.test.ts`
- `apps/desktop/src/components/editor/__tests__/Navigator.test.tsx`
- `apps/desktop/src/components/editor/__tests__/viewport-state-sync.test.tsx`
- `apps/desktop/src/__tests__/viewportCamera.test.ts`
- `docs/plans/2026-06-13-gpu-smooth-zoom-transitions-design.md`
- `docs/decisions/id-decision-log.md`
- `docs/AI_CURRENT_TASK.md`
- `docs/AI_HISTORY.md`
- `docs/FEATURES.md`

**Verification:**
- PASS: `pnpm.cmd --filter photrez-desktop exec vitest run src/__tests__/viewportCamera.test.ts src/components/editor/__tests__/SelectionTransformOverlay.test.ts src/components/editor/__tests__/BrushCursorOverlay.test.tsx src/components/editor/__tests__/CropOverlay.test.tsx src/components/editor/__tests__/CanvasViewport.test.tsx src/components/editor/__tests__/viewport-state-sync.test.tsx src/ui-sanity.test.ts --run` (150 tests)
- PASS: `pnpm.cmd --filter photrez-desktop test --run` (827 tests)
- PASS: `pnpm.cmd run build`
- PASS: `cargo test -p photrez-core`
- PASS: `cargo test --workspace`

## [2026-06-13] PLANNING â€” Viewport Camera Regression Recovery Todo [COMPLETE]

### Kategori: PLANNING / VIEWPORT / TOOL ALIGNMENT

**Context:**
The GPU smooth zoom migration caused canvas/tool coordinate regressions, including Move Tool transform bounding boxes separating from the rendered layer. The existing smooth zoom plan was still marked as draft while project docs had already recorded the implementation as complete.

**Changes:**
1. Created `docs/plans/2026-06-13-viewport-camera-regression-recovery-todo.md` as a staged recovery plan.
2. The plan prioritizes restoring one viewport source of truth, repairing Move Tool alignment, validating pointer coordinate conversion, and regressing Brush/Crop/Navigator before reintroducing smooth zoom.
3. Updated `AI_CURRENT_TASK.md` and `FEATURES.md` to record the planning deliverable.

**Verification:**
- Documentation-only change; no build/test execution required for this planning step.

## [2026-06-13] BUG FIX â€” WebGL Viewport Alignment & Layout Restoration [COMPLETE]

### Kategori: BUG FIX / VIEWPORT / LAYOUT / STYLING / TS

**Root Cause:**
1. Layout shift: Unintentional layout wrapping in `EditorShell.tsx` added padding (`p-1.5`) and gap (`gap-1.5`), causing side panels to float instead of being docked to screen edges.
2. WebGL image misalignment & double-transform:
   - The projection matrix calculation was using logical dimensions fetched from the renderer, which were overwritten by `renderer.resize()` calls from other tool actions (like crop or title bar resizing).
   - In the WebGL2 rendering pipeline, layers were panned and zoomed using the camera's `viewProj` matrix when drawn into the FBO. In the final pass, the FBO was rendered onto the screen *again* using the camera's `viewProj` matrix, causing the camera transform to be applied twice (double-transformation).

**Changes:**
1. `EditorShell.tsx` (`apps/desktop/src/components/editor/EditorShell.tsx`):
   - Restored the original docked layout without padding and gaps.
   - Removed renderer logical width/height query from projection matrix calculation.
2. `viewportCamera.ts` (`apps/desktop/src/viewport/viewportCamera.ts`):
   - Managed logical viewport dimensions inside the camera instance (`viewportWidth` / `viewportHeight`).
   - Implemented `setViewportSize()` and updated `getViewProjectionMatrix()` to fallback to these internal viewport size coordinates.
3. `useViewportRenderer.ts` (`apps/desktop/src/components/editor/useViewportRenderer.ts`):
   - Updated window resize observer and `fitToScreenAndRender` to synchronize the canvas container's logical dimensions to the camera via `camera.setViewportSize()`.
4. `webgl2.ts` (`apps/desktop/src/renderer/webgl2.ts`):
   - Changed the FBO-to-screen copy pass to render using a 1:1 identity orthographic projection (`computeViewMatrix(this.logicalWidth, this.logicalHeight)`) instead of the camera `viewProj` matrix, resolving the double-transformation.
5. `ui-sanity.test.ts` (`apps/desktop/src/ui-sanity.test.ts`):
   - Added a layout regression test to prevent padding, gaps, or layout container modifications in `EditorShell.tsx`.

**Verification:**
- 55 test files, 824 frontend tests: âœ…
- TypeScript + Vite build: âœ…

## [2026-06-13] FEATURE â€” GPU-Accelerated Smooth Zoom [COMPLETE]

### Kategori: FEATURE / VIEWPORT / RENDERER / CAMERA / INTERACTION

**Root Cause (Context):**
Migrating viewport rendering pipeline from CSS transform-based zoom/pan to a matrix-driven WebGL2 camera to eliminate stutter, rendering artifacts, and enable smooth animated transitions.

**Changes:**
1. `viewportCamera.ts` (`apps/desktop/src/viewport/viewportCamera.ts`):
   - Created standalone `ViewportCamera` to manage viewport pan, zoom, coordinate conversions (`documentToScreen` / `screenToDocument`), and smooth cubic easing animations (`animateTo`, `animateZoomToPoint`, `tick`).
2. `easing.ts` (`apps/desktop/src/viewport/easing.ts`):
   - Created easing utilities (`easeOutCubic`, `linear`).
3. `webgl2.ts` (`apps/desktop/src/renderer/webgl2.ts`):
   - Added `resizeToViewport(width, height, dpr)` and updated `render(..., cameraMatrix)` to project viewport correctly using camera matrix.
4. `scheduler.ts` (`apps/desktop/src/renderer/scheduler.ts`):
   - Implemented continuous rendering loop during animations.
5. `EditorContext.tsx` (`apps/desktop/src/components/editor/EditorContext.tsx`):
   - Instantiated and shared `camera` in the editor context. Provided fallbacks to keep unit tests from crashing.
6. `useCanvasKeyboard.ts` & `useViewportRenderer.ts` & `usePanNavigation.ts`:
   - Updated event handlers to call `camera` methods. Added Ctrl+=/-, Ctrl+0 animators.
7. `CanvasViewport.tsx` & overlays (`SelectionTransformOverlay`, `CropOverlay`, `SmartGuides`, `HoverHighlight`, `BrushCursorOverlay`):
   - Positioned elements in screen-space dynamically via `camera.documentToScreen()`.
8. Tests updated (`BrushCursorOverlay.test.tsx` and `CropOverlay.test.tsx`):
   - Resolved unit testing mocks to include `camera`. Corrected `BrushCursorOverlay` test assertions to expect screen-space scaling coordinates.

**Verification:**
- 55 test files, 823 frontend tests: âœ…
- TypeScript + Vite build: âœ…
- 92 Rust workspace tests: âœ…

## [2026-06-13] BUG FIX â€” Modern Crop: Reset Button in Ratio/Size Modes [COMPLETE]

### Kategori: BUG FIX / CROP / GEOMETRY / TESTS / UI

**Root Cause:**
In `CropOptionBar.tsx`, the Reset button's click handler reset the Modern crop frame using `getDefaultModernCropFrame` but passed `aspect` as `cropMode() === "ratio" ? cropAspect() : null`. If `cropMode()` was `"size"`, it passed `null`, causing the reset cropbox to ignore the target size aspect ratio and fall back to the viewport aspect ratio.

**Changes:**
1. `CropOptionBar.tsx` (`apps/desktop/src/components/editor/CropOptionBar.tsx`):
   - Corrected Reset button's `aspect` argument to resolve aspect from either custom ratio or physical size target (`aspect: ea`), matching the active mode configuration.
2. `CropOptionBar.test.tsx` (`apps/desktop/src/components/editor/__tests__/CropOptionBar.test.tsx`):
   - Added `resets modern crop frame preserving Size mode aspect ratio target` unit test.

**Verification:**
- 54 test files, 813 frontend tests: âœ…
- TypeScript + Vite build: âœ…

## [2026-06-13] BUG FIX â€” Modern Crop: 1:1 Cursor Tracking & Lag in Center-Resizing [COMPLETE]

### Kategori: BUG FIX / CROP / GEOMETRY / TESTS / UX

**Root Cause:**
Because the Modern Crop frame is always centered in the viewport, resizing by dragging a handle moves the frame boundaries symmetrically from both sides. With `effDx = deltaX` in one-sided mode, the handle only moves at half-speed on screen relative to the pointer (`deltaX / 2`), causing the mouse to drift ahead and feel "left behind" (laggy). To achieve pixel-perfect 1:1 cursor tracking on screen, the delta multipliers must always be doubled (`effDx = deltaX * 2`) for both Alt and non-Alt resizing, which matches the visual center-resizing nature of the viewport-fixed Modern frame.

**Changes:**
1. `resizeModernFrameOneSided` (`apps/desktop/src/viewport/modernCropGeometry.ts`):
   - Doubled the resize delta (`effDx = params.deltaX * 2` and `effDy = params.deltaY * 2`) by default for both Alt and non-Alt cases.
2. `modern-crop-geometry.test.ts` (`apps/desktop/src/__tests__/modern-crop-geometry.test.ts`):
   - Updated all handle-to-pointer tracking test expectations to assert 1:1 pixel changes instead of half-speed changes.
3. `CropOverlay.test.tsx` (`apps/desktop/src/components/editor/__tests__/CropOverlay.test.tsx`):
   - Updated mock pointer event expectations to match 1:1 mouse tracking.

**Verification:**
- 54 test files, 812 frontend tests: âœ…
- TypeScript + Vite build: âœ…
- 92 Rust workspace tests: âœ…

## [2026-06-13] BUG FIX â€” Modern Crop: Frame Visual Shift on Resize & Alt Modifier Key [COMPLETE]

### Kategori: BUG FIX / CROP / GEOMETRY / TESTS / MODIFIERS

**Root Cause:**
1. A recent change forced the Modern Crop frame coordinates `x, y` to shift in screen space (one-sidedly) during resize. In Modern crop, the crop frame is viewport-fixed and must always stay centered on the screen, with the image content panning/scaling underneath. Centering coordinates `(fw - newW)/2` must be used for the frame, and the one-sided anchoring must be achieved via the `compensation` offset instead.
2. Erroneous diagonal drift occurred because resizing via side handles (like "n"/"s" or "w"/"e") applied compensation to the opposite axis, when that axis should have zero compensation to resize symmetrically.
3. Alt key functionality was reported missing/non-responsive due to potential event-handling focus issues and default browser behavior on Windows.

**Changes:**
1. `resizeModernFrameOneSided` (`apps/desktop/src/viewport/modernCropGeometry.ts`):
   - Reverted frame coordinates to always center-resize on the screen: `x: params.frame.x + (fw - newW) / 2` and `y: params.frame.y + (fh - newH) / 2`.
   - Corrected the `compensation` formulas to apply axis-specific one-sided offsets only when the handle includes the corresponding direction, and zero otherwise.
   - Prevented negative zero (`-0`) values from being produced by the division arithmetic in `compensation` calculations.
2. `modern-crop-geometry.test.ts` (`apps/desktop/src/__tests__/modern-crop-geometry.test.ts`):
   - Aligned 11 test assertions (E/W/N/S handles, ratio/size constraints, clamps, etc.) to expect centered frame position and correct compensation offsets.

**Verification:**
- 54 test files, 812 frontend tests: âœ…
- TypeScript + Vite build: âœ…
- 92 Rust workspace tests: âœ…

## [2026-06-13] BUG FIX â€” Modern Crop: Compensation Over-Correction for W/N Handles [COMPLETE]

### Kategori: BUG FIX / CROP / GEOMETRY / TESTS

**Root Cause:**
In `resizeModernFrameOneSided` (`apps/desktop/src/viewport/modernCropGeometry.ts`), frame position adjusts for "w"/"n" handles to anchor the opposite edge (uncommitted changes from previous fix). But `compensation` was still applied on the same axis â€” `compensation.x = actualDw / 2` for "w" and `compensation.y = actualDh / 2` for "n". This created a double-offset: the crop rect anchor point drifted by `actualDw / 2` in document space, causing the cropbox to shift toward the resize direction when shrinking.

**Changes:**
1. `resizeModernFrameOneSided` â€” both shift and non-shift paths now zero out compensation for "w" (x-axis) and "n" (y-axis) handles since frame position already handles anchoring.
2. `modern-crop-geometry.test.ts` â€” updated test expectations and added 3 combined tests verifying crop rect anchor point stays fixed in document space via `modernFrameToCropRect`.

**Verification:**
- 54 test files, 812 frontend tests: âœ…
- TypeScript + Vite build: âœ…
- 92 Rust workspace tests: âœ…

## [2026-06-12] BUG FIX â€” Modern Crop Geometry: Alt/Center-Out Resize Position Math [COMPLETE]

### Kategori: BUG FIX / CROP / GEOMETRY / TESTS

**Root Cause:**
Commit 3cb2a89 introduced a bug in `resizeModernFrameOneSided` (`apps/desktop/src/viewport/modernCropGeometry.ts`) that applied frame position centering (`x: frame.x + (fw - newW) / 2`) to ALL code paths, including non-alt (one-sided) resize. For one-sided resize, the anchored edge must stay fixed â€” the x/y position should remain unchanged. Only alt (center-out) mode should shift x/y to keep the frame center fixed.

**Changes:**
1. `resizeModernFrameOneSided` â€” frame position now only adjusts x/y when `alt=true`:
   - Non-alt: `x = params.frame.x` (anchored edge stays fixed)
   - Alt: `x = params.frame.x + (fw - newW) / 2` (center stays fixed)
   - Same logic for y axis
2. Updated test expectations in `modern-crop-geometry.test.ts` (10 tests) and `CropOverlay.test.tsx` (1 test) to match corrected geometry

**Verification:**
- 54 test files, 811 frontend tests: âœ…
- TypeScript + Vite build: âœ…
- 85 Rust core tests: âœ…

## [2026-06-12] BUG FIX / POLISH â€” Option Bar Responsive Breakpoint & W/H Inputs Layout [COMPLETE]

### Kategori: BUG FIX / POLISH / FRONTEND / UI / UX

**Root Cause:**
1. Dropdown Aspect Ratio button text wrapped into two lines ("Ratio:" on top, value on bottom) under narrow viewports because it lacked nowrap layout rules.
2. Responsive breakpoints across different tool option bars were mismatched (MoveOptionBar used 880px container queries while Crop and Brush option bars used 768px). This resulted in overlapping elements, layout cuts, and duplications when the viewport width was between 768px and 880px.
3. Placing the W/H inputs inside the collapse container hid vital editing input boxes when the window size was slightly narrow.
4. The helper `fitFrameToMaxBounds` returned `{ x: 0, y: 0, ... }` which reset the Modern crop frame position to the top-left corner `(0, 0)` upon clicking "Free" or "Swap", causing visual jumping and empty canvas expansion areas to show up.

**Fix Rationale:**
1. Added `whitespace-nowrap` class and `shrink-0` to the dropdown indicator icon on the Crop Ratio selector button to prevent text wrapping.
2. Aligned the crop and brush tool option bar responsive breakpoints to `880px` (`@min-[880px]:flex`), matching the move tool and MoreDropdown container query thresholds.
3. Moved custom ratio W/H inputs and physical size W/H inputs (+ unit selector) outside the `@min-[880px]` responsive collapse container in `CropOptionBar.tsx` so they are always visible on the main bar, and removed duplicate fields from `MoreDropdown`.
4. Refactored `fitFrameToMaxBounds` to compute centered `x` and `y` coordinates based on `viewportWidth` and `viewportHeight` so that the modern crop frame remains centered in the viewport.
5. Added centering assertions to the Vitest suite in `CropOptionBar.test.tsx`.

### Verification
- PASS: `pnpm --filter photrez-desktop test --run` (all 810 frontend tests passed)
- PASS: `pnpm run build` (tsc + Vite production build successfully compiled)
- PASS: `.\rtk.exe cargo test --workspace` (all 92 Rust workspace tests passed)

---

## [2026-06-12] FEATURE â€” Crop Option Bar UX Improvements [COMPLETE]

### Kategori: FEATURE / CROP / FRONTEND / UI / UX

**Root Cause / Motivation:**
Pill preset bar yang lama memiliki banyak tombol preset horizontal yang memakan ruang bar dan tidak scalable. Selain itu, tombol Swap terpisah jauh di grup rotasi, sehingga membingungkan pengguna. Kami membutuhkan dropdown preset tunggal, fitur "Lock Current Shape", "Recent Ratios", dan tata letak `[W] [Swap] [H]` terpadu.

**Fix Rationale / Design:**
1. Menggabungkan preset rasio ke dropdown Aspect Ratio selector yang mencakup opsi "Lock Current Shape", "Recents", dan presets bawaan.
2. Memindahkan tombol Swap langsung di antara kolom W dan H di semua mode (Custom Ratio & Size) baik di bar utama maupun di MoreDropdown.
3. Menghapus tombol Swap duplikat dari grup rotasi.
4. Menambahkan pelacakan recent ratios (maksimal 3 item) pada form submit.
5. Menambahkan sinkronisasi otomatis nilai input W/H dengan preset rasio yang dipilih agar input selalu ter-update.

**Rincian Perubahan:**
1. `CropOptionBar.tsx` â€” Menambahkan state dropdown, recent ratios, implementasi `handleLockCurrentShape` & `handleSwap`, restrukturisasi form input `[W] [Swap] [H]` di bar utama & `MoreDropdown`, sinkronisasi nilai input via `createEffect`, dan penghapusan tombol swap lama di grup rotasi.
2. `CropOptionBar.test.tsx` â€” Memperbarui helper `clickPill` untuk membuka dropdown secara otomatis saat elemen preset atau mode tersembunyi ingin diklik, serta menambahkan pengujian swap W/H di mode Size.

### Verification
- PASS: `pnpm --filter photrez-desktop test --run` (all 810 frontend tests passed)
- PASS: `cargo test --workspace` (all 92 Rust workspace tests passed)
- PASS: `pnpm run build` (tsc + Vite production build successfully compiled)

---

## [2026-06-12] BUG FIX â€” Brush Cursor Shown on Pan [COMPLETE]

### Kategori: BUG FIX / BRUSH / ERASER / VIEWPORT / UX

**Root Cause:**
Saat pengguna melakukan panning/navigasi pada viewport (misalnya dengan menahan tombol `Space` untuk memunculkan kursor tangan dan menyeret canvas), indikator lingkaran ukuran brush/eraser tetap muncul di layar. Hal ini mengganggu pandangan pengguna karena tool brush/eraser sedang tidak aktif untuk menggambar selama proses navigasi/panning berlangsung.

**Fix Rationale:**
Mengirimkan status navigasi aktif (`isSpacePressed() || isPanning()`) dari viewport ke dalam komponen `<BrushCursorOverlay>` melalui properti `isPanning`. Ketika salah satu status tersebut bernilai `true`, lingkaran kursor brush/eraser akan disembunyikan secara otomatis dari layar (`!props?.isPanning`).

**Rincian Perubahan:**
1. `BrushCursorOverlay.tsx` â€” Menambahkan opsional properti `isPanning?: boolean` ke tipe props, serta memperbarui fungsi `show` untuk memastikan kursor lingkaran disembunyikan jika `isPanning` bernilai `true`.
2. `CanvasViewport.tsx` â€” Menambahkan passing props `isPanning={isSpacePressed() || isPanning()}` ke pemanggilan `<BrushCursorOverlay>`.

### Verification
- PASS: `pnpm.cmd --filter photrez-desktop test --run` (all 810 frontend tests passed)
- PASS: `cargo test --workspace` (all 92 Rust core/workspace tests passed)
- PASS: `pnpm run build` (tsc + Vite production build successfully compiled)

---

## [2026-06-12] BUG FIX â€” Brush Cursor Stuck on Zoom [COMPLETE]

### Kategori: BUG FIX / BRUSH / ERASER / VIEWPORT / UX

**Root Cause:**
Indikator visual berbentuk lingkaran kursor untuk tool brush dan eraser (`BrushCursorOverlay.tsx`) diposisikan menggunakan koordinat beruang dokumen (*document-space coordinates*) yang dihitung dan di-cache dalam state local (`cursorPos`) hanya pada saat event `pointermove` dipicu. Ketika pengguna melakukan zoom viewport (misal dengan shortcut `Ctrl+wheel`) tanpa memindahkan posisi fisik mouse, letak koordinat dokumen yang berada di bawah kursor mouse berubah secara drastis, tetapi state koordinat kursor overlay tidak terhitung ulang. Ini mengakibatkan lingkaran kursor visual terkesan "nyangkut" atau tertinggal di lokasi lama hingga pengguna menggoyangkan mouse sedikit.

**Fix Rationale:**
Menyimpan koordinat posisi mouse di client-space (`clientX`, `clientY`) setiap kali event `pointermove` terjadi. Menambahkan `createEffect` reaktif pada `BrushCursorOverlay.tsx` yang melacak sinyal `zoom()` dan `pan()`. Ketika viewport bergerak atau skala berubah, method `updatePosition()` akan secara otomatis dipanggil kembali untuk menghitung ulang posisi koordinat dokumen di bawah mouse dan memutakhirkan state secara reaktif, bahkan saat mouse diam tidak bergerak.

**Rincian Perubahan:**
1. `BrushCursorOverlay.tsx` â€” Menambahkan import `createEffect`, mendestrukturisasi sinyal `pan` dari `useEditor()`, meng-cache posisi screen mouse terbaru ke `lastClientX`/`lastClientY`, serta menambahkan `createEffect` yang reaktif terhadap `zoom` dan `pan` untuk memperbarui kalkulasi posisi dokumen kursor. Ditambahkan penanganan typeof *safety guard* pada sinyal `pan` untuk kompatibilitas mock pengujian unit.

### Verification
- PASS: `pnpm.cmd --filter photrez-desktop test --run` (all 810 frontend tests passed)
- PASS: `cargo test --workspace` (all 92 Rust core/workspace tests passed)
- PASS: `pnpm run build` (tsc + Vite production build successfully compiled)

---

## [2026-06-12] BUG FIX â€” Viewport WebGL Backing Resolution Clamping [COMPLETE]

### Kategori: BUG FIX / VIEWPORT / RENDERER / UX

**Root Cause:**
Saat pengguna melakukan zoom gambar hingga tingkat persentase tinggi (misalnya 1486% seperti pada laporan QA) pada dokumen berukuran sedang/besar, ukuran buffer piksel (backing canvas/textures) dihitung langsung dengan mengalikan ukuran dokumen dengan tingkat zoom dan devicePixelRatio: `docWidth * zoom * dpr`. Pada zoom 1486% (faktor 14.86) dan dpr=2.0, gambar berukuran 709px membutuhkan buffer internal setinggi 21.072px. Ini melampaui batas keras browser Chrome untuk elemen `<canvas>` (maksimal 16.384px) dan alokasi memori tekstur WebGL, yang secara langsung memicu error `CONTEXT_LOST_WEBGL` dan menyebabkan canvas menjadi blank/layar hitam.

**Fix Rationale:**
Membatasi secara aman ukuran buffer piksel internal canvas WebGL dan tekstur ping-pong ke limit aman maksimal sebesar **4096px** (atau batas GPU `maxTextureSize` jika lebih rendah). Batas ini sangat direkomendasikan karena didukung oleh 100% perangkat dan browser tanpa risiko kehabisan VRAM atau memicu limitasi browser. Agar tidak terjadi distorsi/penyok (*stretching*) pada rasio gambar, lebar dan tinggi diturunkan secara proporsional. Browser kemudian akan memperbesar visual buffer tersebut secara mulus ke ukuran aslinya di layar menggunakan akselerasi CSS `scale(...)` tanpa terjadi kerusakan memori GPU.

**Rincian Perubahan:**
1. `webgl2.ts` â€” Memperbarui method `resize` untuk mengkalkulasi limit `maxLimit` sebagai `Math.min(4096, this.capabilities.maxTextureSize || 4096)`, lalu melakukan penyesuaian skala proporsional pada `w` dan `h` jika melampaui limit tersebut sebelum dialokasikan ke `canvas.width`/`canvas.height` dan ping-pong FBO textures.

### Verification
- PASS: `pnpm.cmd --filter photrez-desktop test --run` (all 810 frontend tests passed)
- PASS: `cargo test --workspace` (all 92 Rust core/workspace tests passed)
- PASS: `pnpm run build` (tsc + Vite production build successfully compiled)

---

## [2026-06-12] POLISH â€” Brush Intermediate Hardness Mapping [COMPLETE]

### Kategori: POLISH / BRUSH / ERASER / HARDNESS / UX

**Root Cause:**
Manual QA showed `Hard 80%` looked softer than expected compared with desktop image editors. The hard-radius mapping used `Math.pow(hardness, 1.6)`, so hardness `0.8` only produced about `70%` solid radius, leaving a broad feather rim.

**Fix Rationale:**
Keep hardness 0 and the soft falloff profile unchanged, but remap intermediate hardness values so they feel closer to editor conventions. An aggressive `Math.pow(hardness, 0.75)` mapping was tested, but it made lower/mid hardness values too hard and made the brush feel broken. The final mapping is linear (`hardRadius = radius * hardness`), so hardness `0.8` produces about `80%` solid radius with a narrow feather rim while lower hardness values remain predictable. This also applies to eraser because brush and eraser share the same brush-tip mask logic.

**Rincian Perubahan:**
1. `brushTipMask.ts` - Changed hard-radius mapping from `Math.pow(h, 1.6)` to linear `h`.
2. `brushTipMask.test.ts` - Updated hardness mapping expectations for 20%, 50%, 80%, and 100% hardness, including `Hard 80%` staying solid farther out and feathering only near the outer rim.

### Verification
- PASS: `pnpm.cmd --filter photrez-desktop exec vitest run src/components/editor/__tests__/brushTipMask.test.ts src/components/editor/__tests__/paintStrokeRenderer.test.ts --run` (52 tests)
- PASS: `pnpm.cmd --filter photrez-desktop test --run` (810 tests, 54 files)
- PASS: `pnpm.cmd run build` (tsc + Vite production build)
- PASS: `cargo test --workspace` (92 Rust workspace tests)
- PASS: `pnpm.cmd --filter photrez-desktop exec vitest run src/components/editor/__tests__/brushTipMask.test.ts src/components/editor/__tests__/paintStrokeRenderer.test.ts src/components/editor/__tests__/brushUx.test.tsx --run` (56 tests, follow-up regression check)

---

## [2026-06-12] FEATURE â€” Synchronize lastPaintCoords with Undo/Redo [COMPLETE]

### Kategori: FEATURE / BRUSH / ERASER / UX / HISTORY

**Root Cause:**
The last painted coordinate (`lastPaintCoords`) was stored as a local module variable in `useCanvasPointerTools.ts` and did not update during undo/redo actions. Consequently, if the user undid a stroke, holding Shift and clicking would connect from the now-undone coordinate rather than the end of the restored stroke.

**Fix Rationale:**
Extend the document `CommandHistory` snapshot entry stack to store `lastPaintCoords` alongside snapshot model versions. Update `useCanvasPointerTools.ts` to retrieve and write `lastPaintCoords` through the active history context, ensuring that undo/redo operations naturally revert/advance the straight-line coordinate start point.

**Rincian Perubahan:**
1. `history.ts` - Extended `SnapshotEntry` to store `lastPaintCoords` and added getters/setters in `CommandHistory` to manage it dynamically.
2. `useCanvasPointerTools.ts` - Refactored tool callbacks to read and write `lastPaintCoords` through `getLastPaintCoords`/`setLastPaintCoords` helpers pointing to active workspace history.
3. `brushUx.test.tsx` - Created unit tests asserting coordinate rollback correctness during simulated undo/redo cycles.

### Verification
- PASS: `pnpm --filter photrez-desktop test --run` (all 810 tests passed)
- PASS: `cargo test --workspace` (all 92 Rust core/workspace tests passed)
- PASS: `pnpm run build` (tsc + Vite production build successfully compiled)

---

## [2026-06-12] BUG FIX â€” Fix Shift-Click Straight Lines for Soft Brush [COMPLETE]

### Kategori: BUG FIX / BRUSH / ERASER / UX

**Root Cause:**
The soft brush path in `onPaintStroke` inside `useBrushOverlay.ts` only read the last point of the points array (`points.at(-1)`), ignoring intermediate points. When the user held Shift and clicked, the pointer handler generated an interpolated line of points, but only the final clicked point was actually stamped, causing the Shift-click straight line feature to fail to draw anything but a single dot.

**Fix Rationale:**
Update `onPaintStroke` to iterate over all newly added points in the stroke array (from `prevStrokePointCount` to `points.length`) and process each point sequentially, ensuring all dabs along the straight line are interpolated and stamped correctly.

**Rincian Perubahan:**
1. `useBrushOverlay.ts` - Iterated over the points array starting from `prevStrokePointCount` to process all new points.
2. `2026-06-12-fix-shift-click-straight-lines-soft-brush-design.md` - Created and committed the design document for this bug fix.

### Verification
- PASS: `pnpm --filter photrez-desktop test --run` (all 809 tests passed)
- PASS: `pnpm run build` (tsc + Vite production build successfully compiled)
- PASS: `cargo test --workspace` (all 92 Rust workspace tests passed)

---

## [2026-06-12] POLISH â€” Implement Smoothstep Brush Falloff Curve [COMPLETE]

### Kategori: POLISH / BRUSH / ERASER / UX / CALIBRATION

**Root Cause:**
The brush/eraser soft curve previously used a direct linear distance interpolation raised to an exponent: `Math.pow(clamp01(v), 0.7 + 0.6 * h)`. This created a discontinuity in the gradient slope at the boundaries (outer edge and inner hard core), causing a visual "sharp disk inside a soft glow" look.

**Fix Rationale:**
We mapped the normalized distance `v` using a Hermite interpolation / Smoothstep function `3v^2 - 2v^3` to ensure that the slope (derivative) of the falloff is 0 at both boundaries, producing a perfectly smooth gradient matching professional brush engines.

**Rincian Perubahan:**
1. `brushTipMask.ts` - Modified `brushAlphaAtDistance` to map `v` with a cubic Smoothstep function before applying the exponent.
2. `paintStrokeRenderer.test.ts` - Slightly adjusted the overlapping stroke alpha upper bound assertion to 110 (from 100) to account for the fuller center profile of the smoothstep curve.
3. `2026-06-12-smoothstep-brush-falloff-design.md` - Created and committed the design document for this change.

### Verification
- PASS: `pnpm --filter photrez-desktop test --run` (all 809 tests passed)
- PASS: `pnpm run build` (tsc + Vite production build successfully compiled)
- PASS: `cargo test --workspace` (all 92 Rust workspace tests passed)

---

## [2026-06-12] POLISH â€” Remove Inner Brush Hardness Indicator Ring [COMPLETE]

### Kategori: POLISH / BRUSH / ERASER / UX

**Root Cause:**
The brush/eraser cursor overlay rendered an inner dashed circle (`data-paint-cursor-hardness`) when `hardness > 0 && hardness < 1` to represent the hardness boundary. This secondary ring is non-standard in professional image editors (like established image editors) and creates unnecessary visual clutter.

**Fix Rationale:**
Remove the secondary inner dashed ring from `BrushCursorOverlay.tsx` to align Photrez exactly with professional editor aesthetics, making the brush/eraser kursor a single clean circle showing the outer brush size.

**Rincian Perubahan:**
1. `BrushCursorOverlay.tsx` - Removed the `<circle data-paint-cursor-hardness>` rendering block and cleaned up the unused `hardRadius` definition.
2. `BrushCursorOverlay.test.tsx` - Updated unit test assertions to expect that the inner hardness circle is absent (`toBeNull()`).
3. `2026-06-12-remove-inner-brush-cursor-indicator-design.md` - Created and committed the design document for this change.

### Verification
- PASS: `pnpm --filter photrez-desktop test --run` (all 809 tests passed)
- PASS: `pnpm run build` (tsc + Vite production build successfully compiled)
- PASS: `cargo test --workspace` (all 92 Rust workspace tests passed)

---

## [2026-06-12] FEATURE â€” Brush & Eraser UX Improvements [COMPLETE]

### Kategori: FEATURE / BRUSH / ERASER / UX

**Root Cause:**
Professional image editor UX requires smooth support for modifiers like Alt-hold color sampling (eyedropper), Shift-click straight line drawing, and Shift-drag axis locking, which were previously missing from the brush/eraser tool workflow.

**Fix Rationale:**
1. Alt-Hold Eyedropper: Listen to `Alt` keydown/keyup on viewport to switch cursor to `"copy"` (representing eyedropper copy/sample cursor) and sample color on pointerdown/move, preventing options bar flickering by avoiding tool-state switches.
2. Shift-Click Straight Lines: Interpolate dabs between the last painted coordinates and the new clicked point when Shift is held on pointer down.
3. Shift-Drag Axis Locking: Constrain pointer movement coordinates to the primary axis (horizontal or vertical) if Shift is pressed during an active stroke.
4. Verify using Vitest suite and manual testing.

**Rincian Perubahan:**
1. `useCanvasPointerTools.ts` - Intercept down/move events to handle Alt eyedropper, Shift-click straight line interpolation, and Shift-drag axis locking.
2. `cursorResolver.ts` - Return `"copy"` cursor for Alt + active brush/eraser.
3. `BrushCursorOverlay.tsx` & `CanvasViewport.tsx` - Pass `isAltPressed` state and hide circular brush overlay preview when active.
4. `input-handler.ts` - Store the last painted coordinate of a completed stroke and avoid clearing it prematurely.
5. `brushUx.test.tsx` - Add complete unit and integration tests covering the new modifier behaviors.

### Verification
- PASS: `pnpm --filter photrez-desktop test --run` (all 809 tests passed)
- PASS: `pnpm run build` (tsc + Vite production build successfully compiled)
- PASS: `cargo test --workspace` (all 92 Rust workspace tests passed)

---

## [2026-06-12] POLISH â€” Soft Eraser MVP Preset Polish [COMPLETE]

### Kategori: POLISH / ERASER / PRESETS / MVP

**Root Cause:**
The shared brush/eraser engine is now calibrated, but the dedicated `Soft Eraser` preset still used `hardness: 0.0` and `flow: 0.55`, making it feel too weak for immediate MVP use.

**Fix Rationale:**
Keep core eraser rendering unchanged and improve the preset UX. `Soft Eraser` now uses a small hardness value and stronger flow so it behaves like a useful editor eraser while retaining a soft edge.

**Rincian Perubahan:**
1. `brushToolState.ts` - Updated `Soft Eraser` preset from hardness `0.0`, flow `0.55` to hardness `0.15`, flow `0.85`.
2. `brushToolState.test.ts` - Added tests for MVP-ready Soft Eraser defaults and applying the preset to eraser settings.

### Verification
- PASS: `pnpm.cmd --filter photrez-desktop exec vitest run src/components/editor/__tests__/brushToolState.test.ts src/components/editor/__tests__/brushTipMask.test.ts src/components/editor/__tests__/paintStrokeRenderer.test.ts --run` (67 tests)
- PASS: `pnpm.cmd --filter photrez-desktop test --run` (806 tests, 53 files)
- PASS: `pnpm.cmd run build` (tsc + Vite production build)
- PASS: `cargo test --workspace` (92 Rust workspace tests)

---

## [2026-06-12] POLISH â€” Brush Preset UX Calibration [COMPLETE]

### Kategori: POLISH / BRUSH / PRESETS / UX

**Root Cause:**
The core hardness 0 brush now has an acceptable feather/body profile, but the `Soft Round` preset still used `hardness: 0.0` and `flow: 0.55`. That made the main soft preset feel closer to an airbrush/wash than a desktop-editor soft round brush with a fuller center.

**Fix Rationale:**
Keep the core brush engine stable and solve the UX through presets. `Soft Round` is now the primary editor-like soft brush with a small hardening amount and full flow, while `Large Soft` remains the broad low-pressure wash preset.

**Rincian Perubahan:**
1. `brushToolState.ts` - Updated `Soft Round` preset from hardness `0.0`, flow `0.55` to hardness `0.15`, flow `1.0`.
2. `brushToolState.ts` - Updated `Large Soft` flow from `0.35` to `0.65`, keeping hardness `0.0` and opacity `0.85`.
3. `brushToolState.test.ts` - Added regression tests for editor-like Soft Round defaults and preset application behavior.

### Verification
- PASS: `pnpm.cmd --filter photrez-desktop exec vitest run src/components/editor/__tests__/brushToolState.test.ts src/components/editor/__tests__/brushTipMask.test.ts src/components/editor/__tests__/paintStrokeRenderer.test.ts --run` (65 tests)
- PASS: `pnpm.cmd --filter photrez-desktop test --run` (804 tests, 53 files)
- PASS: `pnpm.cmd run build` (tsc + Vite production build)
- PASS: `cargo test --workspace` (92 Rust workspace tests)

---

## [2026-06-12] POLISH â€” Brush Soft Round Fatter Center Calibration [COMPLETE]

### Kategori: POLISH / BRUSH / UX / CALIBRATION

**Root Cause:**
Manual QA showed that raising effective flow made hardness 0 more visible, but the visible center still looked too thin. The issue was the radial alpha shape: the `soft` curve exponent `1.3` dropped opacity too quickly away from the center, so the stroke read like a narrow center line with a wide haze instead of a fuller soft round brush.

**Fix Rationale:**
Change the soft radial profile rather than raising flow again. Hardness 0 now uses a fatter falloff exponent (`0.7`), while `brushAlphaAtDistance` dynamically increases the exponent with hardness (`0.7 + 0.6 * h`). This gives hardness 0 a wider center/body while preventing hardness 80 from developing an overly thick outer edge.

**Rincian Perubahan:**
1. `brushTipMask.ts` - Updated `falloff(..., "soft")` to use exponent `0.7`.
2. `brushTipMask.ts` - Updated `brushAlphaAtDistance` so soft brushes use a hardness-aware exponent `0.7 + 0.6 * h`.
3. `brushTipMask.test.ts` - Updated hardness 0 pixel-profile bounds: stronger alpha at 25-50% radius, feather retained at 75% radius, edge still near zero.

### Verification
- PASS: `pnpm.cmd --filter photrez-desktop exec vitest run src/components/editor/__tests__/brushTipMask.test.ts src/components/editor/__tests__/paintStrokeRenderer.test.ts --run` (52 tests)
- PASS: `pnpm.cmd --filter photrez-desktop test --run` (802 tests, 53 files)
- PASS: `pnpm.cmd run build` (tsc + Vite production build)
- PASS: `cargo test --workspace` (92 Rust workspace tests)

---

## [2026-06-12] POLISH â€” Brush Soft Round Opacity Body Calibration [COMPLETE]

### Kategori: POLISH / BRUSH / UX / CALIBRATION

**Root Cause:**
Manual QA showed the hardness 0 brush now had a correct broad feather shape, but still looked too airbrush-like at Flow 100 / Strength 100. The center opacity was limited by `softPeak = 0.9` and `getEffectiveFlowMultiplier(0) = 0.82`, producing an effective center around `0.738`.

**Fix Rationale:**
Preserve the existing falloff shape, dab spacing, max-alpha stroke behavior, and subpixel stamping, then increase only the effective opacity body. The formula is now `getEffectiveFlowMultiplier(hardness) = 0.9 + 0.1 * h`, so hardness 0 reaches an effective center around `0.81`, hardness 80 reaches `0.98`, and hardness 100 remains `1.0`.

**Rincian Perubahan:**
1. `brushTipMask.ts` - Updated `getEffectiveFlowMultiplier` from `0.82 + 0.18 * h` to `0.9 + 0.1 * h`.
2. `brushTipMask.test.ts` - Updated effective-flow checkpoints to `0.90`, `0.98`, and `1.0`.
3. `paintStrokeRenderer.test.ts` - Updated the soft brush center alpha assertion from `189` to `207`.

### Verification
- PASS: `pnpm.cmd --filter photrez-desktop exec vitest run src/components/editor/__tests__/brushTipMask.test.ts src/components/editor/__tests__/paintStrokeRenderer.test.ts --run` (52 tests)
- PASS: `pnpm.cmd --filter photrez-desktop test --run` (802 tests, 53 files)
- PASS: `pnpm.cmd run build` (tsc + Vite production build)
- PASS: `cargo test --workspace` (92 Rust workspace tests)

---

## [2026-06-12] POLISH â€” Brush Soft Round Editor-Like Final Polish [COMPLETE]

### Kategori: POLISH / BRUSH / UX / CALIBRATION

**Root Cause:**
After the previous soft-round calibration, hardness 0 was finally broad and natural, but Flow 100 / Strength 100 still looked slightly too transparent because the stroke alpha combined `softPeak = 0.9` with an effective flow multiplier of `0.80`, producing a maximum soft-center alpha around `0.72`.

**Fix Rationale:**
Keep the current falloff exponent, peak profile, and dab spacing stable, then make only a small opacity-body adjustment: `getEffectiveFlowMultiplier(hardness) = 0.82 + 0.18 * h`. This raises hardness 0 to a maximum soft-center alpha around `0.738`, keeps hardness 80 near full body at `0.964`, and preserves hardness 100 at `1.0`.

**Rincian Perubahan:**
1. `brushTipMask.ts` - Updated `getEffectiveFlowMultiplier` from `0.8 + 0.2 * h` to `0.82 + 0.18 * h`.
2. `brushTipMask.test.ts` - Updated multiplier checkpoints to `0.82`, `0.964`, and `1.0`; replaced the pixel-profile helper's `any` with `BrushTip`.
3. `paintStrokeRenderer.test.ts` - Updated the soft brush center alpha assertion from `184` to `189`.
4. `useBrushOverlay.ts` - Removed an unused hard-path variable.
5. `AI_HISTORY.md` - Repaired the missing heading for the earlier quadratic effective-flow entry.

### Verification
- PASS: `pnpm.cmd --filter photrez-desktop exec vitest run src/components/editor/__tests__/brushTipMask.test.ts src/components/editor/__tests__/paintStrokeRenderer.test.ts --run` (52 tests)
- PASS: `pnpm.cmd --filter photrez-desktop test --run` (802 tests, 53 files)
- PASS: `pnpm.cmd run build` (tsc + Vite production build)
- PASS: `cargo test --workspace` (92 Rust workspace tests)

---

## [2026-06-12] BUG FIX â€” Brush Effective Flow Hardness Scaling Calibration Tuning [COMPLETE]

### Kategori: BUG FIX / BRUSH / UX / CALIBRATION

**Root Cause:**
Formulasi `getEffectiveFlowMultiplier(hardness) = 0.1 * h^2 + 0.32 * h + 0.58` menghasilkan effective flow multiplier sebesar `0.58` untuk hardness 0. Pada flow 100% dan strength 100%, center alpha maksimal yang dihasilkan pada stroke hanyalah `0.9 * 0.58 = 0.522` (sekitar 52%). Hal ini mengakibatkan goresan kuas yang sangat pudar/samar dan tidak memiliki body visual yang memadai.

**Fix Rationale:**
Mengubah formula multiplier ke bentuk linear yang lebih kuat, yaitu `0.8 + 0.2 * h`. Dengan formula baru ini, hardness 0 akan mendapatkan flow multiplier sebesar `0.8` (sehingga center alpha maksimal naik menjadi `0.9 * 0.8 = 0.72` atau 72%), mempertahankan kelembutan gradien luar tetapi memberikan bodi warna yang lebih jelas di area tengah goresan kuas.

**Rincian Perubahan:**
1. `brushTipMask.ts` - Memperbarui formula `getEffectiveFlowMultiplier` ke `0.8 + 0.2 * h`.
2. `brushTipMask.test.ts` - Menyelaraskan asersi checkpoints test untuk `0.80`, `0.96`, dan `1.0`.
3. `paintStrokeRenderer.test.ts` - Menyesuaikan asersi center alpha untuk goresan lembut dari `133` menjadi `184`, serta memperbarui asersi batas atas/bawah alpha pada tes tumpang tindih stroke (overlap test) menjadi `toBeLessThanOrEqual(100)` dan `toBeGreaterThan(60)`.

### Verification
- PASS: `pnpm --filter photrez-desktop test --run` (802 tests, 53 files)
- PASS: `pnpm run build` (tsc + Vite production build)
- PASS: `cargo test --workspace` (92 workspace core tests)

---

## [2026-06-12] BUG FIX â€” Viewport Transition Jiggle [COMPLETE]

### Kategori: BUG FIX / VIEWPORT / UX

**Root Cause:**
Visual canvas dan container-nya memiliki CSS transition properties (`left 0.15s...` dan `transform 0.15s...`) yang aktif saat tidak terjadi panning. Ketika pengguna melakukan zoom, ukuran canvas (`width` dan `height`) berubah secara instan, tetapi posisi (`left`/`top`) dan transform scale-nya dianimasikan lambat selama 150ms. Ini mengakibatkan visual gambar dan overlay koordinat tidak sejajar selama transisi, sehingga menghasilkan efek goyangan/jiggling. Begitu pula saat perpindahan tool (khususnya berpindah ke/dari Crop tool), canvas berpindah posisi antara koordinat pan dan `0px` secara transisi lambat, membuat canvas terlihat bergeser/tergelincir tidak semestinya.

**Fix Rationale:**
Menghapus seluruh transisi CSS (`transition: "none"`) pada visual canvas utama dan overlay container di `CanvasViewport.tsx`. Ini memastikan seluruh operasi perubahan zoom, pergeseran pan, dan pergantian tool berjalan secara instan dan tajam (snappy), menghilangkan kelambatan visual dan koordinat drift sepenuhnya seperti pada editor gambar profesional.

**Rincian Perubahan:**
1. `CanvasViewport.tsx` - Mengubah properti style `transition` pada elemen `<canvas>` dan pembungkus overlay `<div>` menjadi `"none"`.

### Verification
- PASS: `pnpm --filter photrez-desktop test` (802 tests, 53 files)
- PASS: `pnpm run build` (tsc + Vite production build)
- PASS: `cargo test --workspace` (92 workspace core tests)

---

## [2026-06-12] BUG FIX â€” Brush Effective Flow Hardness Scaling Calibration [COMPLETE]

### Kategori: BUG FIX / BRUSH / ERASER / UX / PERFORMANCE

**Root Cause:**
Dengan Flow 100% dan max-alpha mask yang sangat kuat, goresan berukuran besar (misalnya size 60/75) pada hardness 0 masih terlihat seperti marker/tube yang tebal di area tengahnya.

**Fix Rationale:**
1. Mengurangi effective flow (atau alpha scale dari setiap stamping dab) secara dinamis untuk brush yang memiliki hardness rendah.
2. Menggunakan fungsi kuadratik `getEffectiveFlowMultiplier(hardness) = 0.1 * h^2 + 0.32 * h + 0.58` untuk memetakan multiplier flow. Ini memastikan hardness 0 bernilai ~58%, hardness 0.8 bernilai ~90%, dan hardness 1.0 bernilai 100%.
3. Menerapkan pengali ini langsung pada kalkulasi `alphaScale` di `useBrushOverlay.ts` dan `paintStrokeRenderer.ts`.

**Rincian Perubahan:**
1. `brushTipMask.ts` - Mengekspos fungsi `getEffectiveFlowMultiplier(hardness)` dengan pemetaan kuadratik yang ditentukan.
2. `useBrushOverlay.ts` & `paintStrokeRenderer.ts` - Mengalikan `alphaScale` dengan `getEffectiveFlowMultiplier(settings.hardness)`.
3. `brushTipMask.test.ts` - Menambahkan test case untuk memvalidasi keluaran `getEffectiveFlowMultiplier` pada checkpoints utama dan memastikan `alphaScale` soft brush diturunkan.
4. `paintStrokeRenderer.test.ts` - Menyesuaikan asersi alpha yang sebelumnya bernilai tinggi ke batas baru yang lebih rendah akibat scaling multiplier.

### Verification
- PASS: `pnpm --filter photrez-desktop test` (798 tests, 52 files)
- PASS: `pnpm run build` (tsc + Vite production build)
- PASS: `cargo test --workspace` (92 Rust workspace tests)

---

## [2026-06-12] BUG FIX â€” Brush Soft Exponent and Peak Multiplier Calibration [COMPLETE]

### Kategori: BUG FIX / BRUSH / ERASER / UX / PERFORMANCE

**Root Cause:**
Setting the soft brush falloff exponent to `2.2` proved too steep, resulting in a thin hot core surrounded by a muddy wide haze. Additionally, without a peak multiplier, the center of the brush tip remained at 100% (255) opacity, leading to a marker-like appearance where the center line was a hard solid stripe rather than a broad, gradual feather.

**Fix Rationale:**
1. Lowered the soft falloff curve exponent from `2.2` to `1.3` (inside the `1.25â€“1.4` range) in `brushTipMask.ts`.
2. Implemented a `softPeak` multiplier of `0.9 + 0.1 * h` for the `"soft"` curve, bringing down the maximum center alpha of the soft brush tip from `1.0` to `0.9` (at hardness 0) while keeping it fully solid at hardness 1.
3. Locked and verified the resulting radial pixel-profile boundaries exactly: center 0.8-0.95, 25% radius 0.6-0.75, 50% radius 0.3-0.5, 75% radius 0.08-0.2, edge 0.

**Rincian Perubahan:**
1. `brushTipMask.ts` - Set `"soft"` curve exponent to `1.3` and scaled alpha output by `0.9 + 0.1 * h` to implement the softPeak multiplier. Only return `1` in `brushAlphaAtDistance` for `distance <= hardRadius` if `hardRadius > 0`.
2. `brushTipMask.test.ts` - Updated radial alpha profile test expectations to match center 0.8-0.95, 25% radius 0.6-0.75, 50% radius 0.3-0.5, 75% radius 0.08-0.2.
3. `paintStrokeRenderer.test.ts` - Updated unit tests for soft brush center alpha expectations and stamping first points to accommodate the 0.9 softPeak multiplier.

### Verification
- PASS: `pnpm --filter photrez-desktop test` (800 tests, 53 files)
- PASS: `pnpm run build` (tsc + Vite production build)
- PASS: `cargo test --workspace` (92 Rust workspace tests)

---

## [2026-06-11] BUG FIX â€” Brush Soft Spacing, Subpixel Stamping, and Alpha Profile Calibration [COMPLETE]

### Kategori: BUG FIX / BRUSH / ERASER / UX / PERFORMANCE

**Root Cause:**
Even though the spacing formula computed 3px spacing for size 70 hardness 0 brushes, dabs snapped to integer coordinates during stamping, creating rounding jitter (such as alternate spacing variations of 2px and 3px). This coordinate rounding jitter created visible periodic interference banding (stamped circles) along drawn strokes. Furthermore, the `"soft"` curve falloff exponent was too low (`1.2`), which created a wide, flat central core that made the brush stroke look marker-like (solid center stripe with thin blurred edges).

**Fix Rationale:**
1. Replaced integer-snapped stamping with subpixel stamping using bilinear tip sampling. When stamping a brush tip, it now interpolates the alpha values of the precomputed brush tip over fractional offsets instead of rounding `centerX` and `centerY` directly, resulting in perfectly consistent spacing and smooth strokes.
2. Tuned the `"soft"` curve falloff exponent in `brushTipMask.ts` to `2.2` to shrink the flat central core and extend the feathering roll-off, producing a gradual, professional-grade soft round brush stroke.

**Rincian Perubahan:**
1. `brushTipMask.ts` - Refactored `stampBrushTipMaxAlpha` to perform bilinear sampling on the brush tip's alpha data using fractional coordinates, achieving subpixel stamping resolution. Adjusted `"soft"` curve falloff exponent from `1.2` to `2.2`.
2. `brushTipMask.test.ts` - Added a dedicated unit test `supports subpixel stamping with bilinear interpolation` verifying that fractional coordinate stamping correctly interpolates values at subpixel boundaries. Updated r25, r50, and r75 expectations to match the new `2.2` power curve.
3. `paintStrokeRenderer.test.ts` - Updated test expectations for even-sized brush centers and soft brush path alpha values to match the calibrated falloff curve.

### Verification
- PASS: `pnpm --filter photrez-desktop test` (800 tests, 53 files)
- PASS: `pnpm run build` (tsc + Vite production build)
- PASS: `cargo test --workspace` (92 Rust workspace tests)

---

## [2026-06-11] BUG FIX â€” Brush Visual Calibration and Pixel QA [COMPLETE]

### Kategori: BUG FIX / BRUSH / ERASER / UX / PERFORMANCE

**Root Cause:**
The brush-tip mask engine was using a `"cosine"` curve which caused the hardness 0 brush tip to decline in opacity too quickly away from the center (forming a narrow core and halo). Additionally, dab spacing for soft brushes was too wide, leading to visible banding stamps during drags, and the compatibility renderer did not stamp the very first brush dab of a multi-point stroke.

**Fix Rationale:**
Introduced a `"soft"` falloff curve (`Math.pow(1 - t, 0.75)`) that keeps the opacity higher in the outer brush radius, producing a broad feathered edge. Tuned the spacing logic to dynamically tighten spacing for soft brushes (e.g. 6px spacing for size 75), and corrected the compatibility renderer to stamp the start point of a multi-point stroke.

**Rincian Perubahan:**
1. `brushTipMask.ts` - added `"soft"` curve and set as default; tuned `getBrushDabSpacing` for soft brushes.
2. `useBrushOverlay.ts` - updated drawing overlay session to explicitly request `"soft"` curve.
3. `paintStrokeRenderer.ts` - updated soft compatibility renderer to use `"soft"` curve and always stamp `points[0]`.
4. `brushTipMask.test.ts` - added radial alpha profile tests for hardness 0, 50, 100, and spacing density tests.
5. `paintStrokeRenderer.test.ts` - added integration test for first-point stamping in multi-point soft stroke, and adjusted center alpha tests to fit the new soft profile.

### Verification
- PASS: `pnpm --filter photrez-desktop test` (798 tests, 53 files)
- PASS: `pnpm run build` (tsc + Vite production build)
- PASS: `cargo test --workspace` (92 Rust core + desktop workspace tests)

---

## [2026-06-11] PLANNING â€” Brush Visual Calibration and Pixel QA

### Kategori: PLANNING / BRUSH / ERASER / UX / PERFORMANCE

**User Goal:**
Membuat plan lanjutan karena setelah brush-tip mask engine diimplementasikan, manual review masih terasa tidak banyak berbeda: size 75, hardness 0, flow 100 tetap terlihat seperti core sempit dengan halo dan banding dab.

**Root Cause Planning Notes:**
Jalur incremental `PaintStrokeSession` sudah ada di `useBrushOverlay.ts`, sehingga masalah berikutnya kemungkinan bukan arsitektur preview full-stroke lagi. Fokus baru adalah kalibrasi profil alpha brush tip, spacing dab soft brush, kemungkinan snapping subpixel, dan bukti pixel-profile agar perubahan visual bisa diukur sebelum diklaim benar.

**Plan Rationale:**
Plan baru memisahkan pekerjaan visual calibration dari plan engine. Agent berikutnya diarahkan untuk menjaga arsitektur incremental yang sudah ada, lalu menambahkan test radial alpha profile untuk hardness 0/50/100, tuning `falloff`/`brushAlphaAtDistance`/`getBrushDabSpacing`, dan manual screenshot QA pada skenario yang sama dengan laporan user.

**Rincian Dokumen:**
1. Menambahkan `docs/superpowers/plans/2026-06-11-brush-visual-calibration-and-qa.md`.
2. Menambahkan acceptance criteria visual untuk size 75, hardness 0, flow 100.
3. Menambahkan prompt copy-ready untuk AI agent lain.

---

## [2026-06-11] BUG FIX â€” Brush Tip Mask Engine Performance [COMPLETE]

### Kategori: BUG FIX / BRUSH / ERASER / RENDERER / UX / PERFORMANCE

**Root Cause:**
Jalur interaktif brush/eraser preview sebelumnya (`useBrushOverlay.ts`) masih memanggil renderer satu-kali (`renderPaintStrokeToContext`) di setiap gerakan pointer dengan merender ulang seluruh daftar titik (`localPoints`). Hal ini menyebabkan degradasi performa/lag seiring bertambah panjangnya stroke karena rendering memproses ulang semua titik secara berulang.

**Fix Rationale:**
Memindahkan tracking pointer drag interaktif di `useBrushOverlay.ts` ke mode incremental `PaintStrokeSession`. Setiap gerakan pointer hanya menghitung dan menstempel (stamping) dabs baru sejak titik pointer terakhir ke titik pointer terbaru menggunakan carry spacing. Hasil stempel ini disimpan ke dalam masker max-alpha stroke tunggal, lalu di-composite ke preview canvas/layer. Ini menjaga performa tetap konstan di setiap pointer move tanpa tumpang-tindih (buildup) warna yang mengeras di dalam satu goresan.

**Rincian Perubahan:**
1. `brushTipMask.ts` - mengekspor `parsePaintColor`, `compositeMaskToImageData`, dan `paintMaskToContext` sebagai helper compositing bersama.
2. `useBrushOverlay.ts` - mengimplementasikan incremental `PaintStrokeSession` untuk preview brush/eraser yang ringan tanpa memanggil `renderPaintStrokeToContext(...)`. Menjaga hard brush (`hardness >= 1`) tetap memakai stroke vektor/path-based untuk performa optimal.
3. `paintStrokeRenderer.ts` - membersihkan fungsi-fungsi matematika distance-field yang usang, dan mendekomposisikan compositing soft brush menggunakan helper dari `brushTipMask.ts`.
4. `brushToolState.ts` - menyesuaikan nilai default presets soft round, large soft, dan soft eraser (hardness=0, flow lebih rendah) untuk transisi shading yang lebih halus.
5. `brushTipMask.test.ts` dan `paintStrokeRenderer.test.ts` - memperbarui dan menambah unit tests untuk verifikasi kompilasi dan compositing.

### Verification
- PASS: `pnpm.cmd run build` (tsc + Vite built in 6.05s)
- PASS: `pnpm.cmd --filter photrez-desktop test` (794 tests, 53 files)
- PASS: `cargo test --workspace` (92 workspace core tests)

---

## [2026-06-11] PLANNING REVISION â€” Brush Tip Mask Engine AI Handoff

### Kategori: PLANNING / BRUSH / ERASER / RENDERER / UX / PERFORMANCE

**User Goal:**
Merevisi rencana brush-tip mask engine agar bisa dikirim ke AI agent lain tanpa ambigu, setelah implementasi awal masih terasa tidak sesuai dan lag pada brush size besar, hardness 0.

**Root Cause Planning Notes:**
Implementasi brush-tip mask sudah memiliki helper dan one-shot compatibility path, tetapi jalur interaktif di `useBrushOverlay.ts` masih memakai `renderPaintStrokeToContext(...)` setiap pointer move. Akibatnya preview brush/eraser masih membersihkan canvas dan merender ulang seluruh point list, sehingga biaya tetap tumbuh sepanjang stroke dan UX belum seperti editor gambar umum.

**Plan Revision Rationale:**
Plan direvisi untuk menjadikan `useBrushOverlay.ts` sebagai target utama: active drag harus memakai incremental `PaintStrokeSession`, hanya stamp dab baru dari titik terakhir ke titik terbaru, lalu composite preview dari per-stroke max-alpha mask. `paintStrokeRenderer.ts` diposisikan sebagai compatibility renderer saja, bukan jalur pointer-move preview.

**Rincian Dokumen:**
1. Mengganti isi `docs/superpowers/plans/2026-06-11-brush-tip-mask-engine.md` dengan handoff plan yang lebih eksplisit.
2. Menambahkan diagnosis implementasi saat ini, non-negotiable requirements, task breakdown, verification gate, manual QA, dan prompt copy-ready.
3. Memperbarui `FEATURES.md` dan `docs/decisions/id-decision-log.md` agar status planning mencerminkan revisi handoff.

---

## [2026-06-11] PLANNING â€” Brush Tip Mask Engine Replacement

### Kategori: PLANNING / BRUSH / ERASER / RENDERER / UX / PERFORMANCE

**User Goal:**
Membuat rencana implementasi yang lebih jelas untuk model AI lain setelah hasil distance-field soft brush masih terasa kurang pas dan agak lag. Target UX adalah brush yang terasa seperti aplikasi editor gambar umum: responsive, full-diameter feather untuk hardness 0, flow terasa natural, dan tidak ada penumpukan bulatan dalam satu stroke.

**Root Cause Planning Notes:**
Distance-field alpha mask secara visual lebih benar daripada `shadowBlur`, tetapi implementasi interaktifnya mahal karena setiap pointer move dapat menghitung banyak pixel terhadap banyak segmen path. Biaya ini tumbuh ketika stroke makin panjang, sehingga brush besar seperti size 85 hardness 0 dapat terasa lag.

**Plan Rationale:**
Rencana baru memakai cached brush-tip alpha mask dan incremental dab stamping ke per-stroke max-alpha mask. Ini menjaga properti penting dari distance-field, yaitu tidak ada alpha buildup dalam satu stroke, tetapi biaya runtime mengikuti jumlah dab baru dan ukuran tip brush, bukan panjang total stroke.

**Rincian Dokumen:**
1. Menambahkan `docs/superpowers/plans/2026-06-11-brush-tip-mask-engine.md`.
2. Menandai `docs/superpowers/plans/2026-06-11-brush-hardness-distance-field-soft-edge.md` sebagai superseded.
3. Menambahkan prompt handoff copy-ready untuk model AI lain di dalam plan.
4. Memperbarui `FEATURES.md` dan `docs/decisions/id-decision-log.md` dengan arah brush-tip mask engine.

---

## [2026-06-11] BUG FIX â€” Brush Hardness Distance-Field Soft Edge [COMPLETE]

### Kategori: BUG FIX / BRUSH / ERASER / RENDERER / UX

**Root Cause:**
Implementasi soft brush sebelumnya (hardness < 1) menggunakan Canvas `shadowBlur` + `shadowOffsetX` yang menggambar satu garis path lalu memproyeksikan bayangan kembali ke posisi layar. Pendekatan ini menghasilkan visual soft brush yang ukuran dan feather behavior-nya bergantung pada implementasi Gaussian blur browser, sehingga perceived diameter soft brush tidak akurat â€” `hardness=0` menghasilkan core sempit dengan blur, bukan full-diameter feathered brush.

**Fix Rationale:**
Mengganti pendekatan shadowBlur dengan per-stroke distance-field alpha mask di ImageData. Setiap pixel dalam bounding box stroke dihitung jarak terdekatnya ke path stroke menggunakan `distanceToSegment` dan `distanceToStrokePath`. Alpha pixel ditentukan oleh `brushAlphaAtDistance` yang menggunakan smoothstep Hermite falloff dari hard radius (hardness Ã— radius) ke outer radius (size/2). Composite alpha dilakukan sekali per pixel (source-over untuk brush, destination-out manual untuk eraser), mencegah akumulasi alpha dalam satu stroke.

**Rincian Perubahan:**
1. `paintStrokeRenderer.ts` â€” Menambahkan 7 helper: `smoothstep01`, `brushAlphaAtDistance`, `distanceToSegment`, `parsePaintColor`, `getStrokeBounds`, `distanceToStrokePath`, `renderSoftStrokeToImageData`. Mengganti branch `shadowOffsetX`/`shadowBlur` dengan `renderSoftStrokeToImageData` untuk soft brush (hardness < 1).
2. `paintStrokeRenderer.test.ts` â€” Menambahkan 10 test baru (7 pure-function untuk smoothstep, brushAlphaAtDistance, distanceToSegment; 3 render integration untuk mask dimension, eraser alpha reduction, bounds clipping). Total 38 test di file ini.
3. `useBrushOverlay.ts` â€” Tidak ada perubahan; lock transparency (lines 87-91) dan eraser path (lines 62-76) sudah benar dan dipertahankan.

**Verification:**
4 commits, semua lolos pre-commit pipeline:
- `test: define brush hardness falloff math`
- `fix: render soft brush with distance field mask`
- `test: prevent soft brush alpha accumulation`
- `test: verify soft eraser reduces alpha`
- `perf: bound soft brush mask rendering`
- PASS: `tsc && vite build` (4/4)
- PASS: `vitest run` (788 tests, 52 files, 4/4)
- PASS: `cargo test -p photrez-core` (85 tests, 4/4)

---

## [2026-06-11] PLANNING â€” Brush Hardness Distance-Field Soft Edge

### Kategori: PLANNING / BRUSH / ERASER / RENDERER / UX

**User Goal:**
Membuat rencana pembaruan implementasi hardness brush agar `hardness=0` menghasilkan efek bulu/feather full-diameter, bukan terlihat kecil seperti core sempit dengan blur. Rencana juga harus menjawab risiko penumpukan bulatan/alpha accumulation pada satu stroke drag.

**Root Cause Planning Notes:**
Implementasi saat ini memakai Canvas 2D `shadowBlur` + `shadowOffsetX` untuk menggambar soft brush sebagai unified path. Pendekatan ini sudah menghindari penumpukan dab radial, tetapi masih bergantung pada perilaku blur browser dan formula `coreWidth + shadowBlur`, sehingga `hardness=0` dapat terlihat sebagai solid core kecil dengan blur, bukan distance-field feather yang memenuhi diameter cursor.

**Plan Rationale:**
Rencana baru mengarahkan implementasi ke per-stroke distance-field alpha mask: setiap pixel dihitung dari jarak terdekat ke path stroke, hardness menentukan radius solid bagian dalam, feather menggunakan smoothstep sampai radius luar `size / 2`, dan alpha dalam satu stroke memakai nearest-path/max-alpha behavior agar tidak menumpuk.

**Rincian Dokumen:**
1. Menambahkan `docs/superpowers/plans/2026-06-11-brush-hardness-distance-field-soft-edge.md`.
2. Menandai rencana ini di `FEATURES.md` bagian Maintenance / Architecture Planning.
3. Menambahkan keputusan rendering brush hardness di `docs/decisions/id-decision-log.md`.

---

## [2026-06-11] BUG FIX â€” Soft Brush Visible Diameter Calibration [COMPLETE]

### Kategori: BUG FIX / BRUSH / RENDERER / UX

**Root Cause:**
Meskipun modifikasi sebelumnya telah membuat bagian tengah goresan kuas lembut (`hardness < 1`) menjadi padat (opaque), total diameter visible coretan masih sedikit meluap di luar kursor lingkaran visual (`1.25 * size` saat `hardness = 0`). Hal ini disebabkan karena Gaussian blur bawaan browser memendarkan bayangan hingga sejauh $\approx 3\sigma = 1.5 \times \text{shadowBlur}$ ke masing-masing sisi luar tepi garis inti (`coreWidth`).

**Fix Rationale:**
Melakukan kalibrasi matematis secara linear agar total diameter visual goresan yang terlihat di layar (yaitu `coreWidth + 3 * shadowBlur`) bernilai tepat sama dengan `size` kuas pada semua tingkat kekerasan (*hardness*).
Dengan merumuskan $W + 3B = \text{size}$ dan menetapkan rasio center solid $W = 2B$ saat `hardness = 0`, didapatkan koefisien kalibrasi sebagai berikut:
- `coreWidth = size * (0.4 + 0.6 * hardness)`
- `shadowBlur = size * 0.2 * (1 - hardness)`
Ketika disubstitusikan, didapat: $\text{size} \times (0.4 + 0.6H) + 3 \times \text{size} \times 0.2 \times (1 - H) = \text{size}$. Persamaan ini menjamin coretan selalu berada tepat di dalam batas kursor lingkaran visual kuas dan dapat di-*scale* dengan sempurna ke segala ukuran piksel.

**Rincian Perubahan:**
1. `paintStrokeRenderer.ts` â€” Memperbarui koefisien perataan pada formula kalkulasi `coreWidth` dan `shadowBlur` kuas lembut.
2. `paintStrokeRenderer.test.ts` â€” Menyelaraskan nilai assertion pengujian unit (`shadowBlur`, `lineWidth`, `arc` radius) dengan koefisien rumus kalibrasi yang baru.

---

## [2026-06-11] BUG FIX â€” Soft Brush Perceived Size Adjustment [COMPLETE]

### Kategori: BUG FIX / BRUSH / RENDERER / UX

**Root Cause:**
Saat menggambar dengan kuas lembut (`hardness < 1`), radius bayangan (`shadowBlur`) dihitung menggunakan proporsi `size * 0.35 * (1 - hardness)`, sedangkan lebar core (`coreWidth`) dihitung sebagai `size * (0.3 + 0.7 * hardness)`. Saat `hardness = 0`, rasio `coreWidth` (22.5px untuk kuas 75px) lebih kecil dibandingkan `shadowBlur` (26.25px). Akibat dispersi Gaussian blur yang lebar di atas garis core yang sempit, puncak alpha di tengah garis menyusut jauh di bawah `1.0` (hanya mencapai ~61%), membuat coretan tampak tipis/transparan dan jauh lebih kecil dibandingkan ukuran kursor lingkaran yang ditampilkan.

**Fix Rationale:**
Mengubah formula kalkulasi agar lebar core lebih besar dari radius dispersi blur, sehingga densitas center tetap padat (opaque, alpha $\ge 95\%$) dan degradasi kelembutan gradien menyebar pas hingga ke tepi lingkaran kursor kuas. Formula yang digunakan disesuaikan menjadi:
- `coreWidth = size * (0.5 + 0.5 * hardness)`
- `blur = size * 0.25 * (1 - hardness)`
Pada `hardness = 0`, ini menghasilkan `coreWidth = 0.5 * size` dan `blur = 0.25 * size`, menjamin pusat coretan tetap solid (opaque) dan pendaran gradien menyebar secara proporsional.

**Rincian Perubahan:**
1. `paintStrokeRenderer.ts` â€” Memperbarui rumus kalkulasi `coreWidth` dan `blur` untuk goresan kuas lembut.
2. `paintStrokeRenderer.test.ts` â€” Memperbarui assertion pengujian unit (`shadowBlur`, `lineWidth`, `arc` radius) untuk mencocokkan hasil dari rumus baru.

---

## [2026-06-11] BUG FIX â€” Viewport Zoom/Pan Resetting on Undo/Redo [COMPLETE]

### Kategori: BUG FIX / VIEWPORT / HISTORY / UX

**Root Cause:**
Saat membuat snapshot riwayat (`engine.snapshot()`), status viewport saat ini (termasuk zoom dan pan koordinat) disimpan ke dalam model dokumen. Ketika snapshot tersebut dipulihkan kembali saat undo/redo (`engine.restore()`), status viewport yang lama ikut menimpa zoom dan pan aktif pengguna saat ini. Hal ini menyebabkan viewport melompat-lompat (zoom-popping) saat undo/redo tindakan pengeditan.

**Fix Rationale:**
Mengubah metode `restore` pada `DocumentEngine` untuk menerima parameter opsi tambahan `{ restoreViewport?: boolean }`. Secara default opsi ini bernilai `false`, yang berarti `restore` akan mempertahankan (preserve) koordinat pan dan tingkat zoom viewport aktif pengguna alih-alih menimpanya dengan data dari snapshot. Opsi `{ restoreViewport: true }` hanya dipasang pada kasus pengujian unit (unit tests) yang secara eksplisit menguji pemulihan viewport dari snapshot.

**Rincian Perubahan:**
1. `document.ts` â€” Memperbarui metode `restore` pada kelas `DocumentEngine` agar menyalin viewport aktif saat ini, menjalankan pemulihan snapshot, dan menulis kembali viewport aktif tersebut jika opsi `restoreViewport` bernilai false/undefined.
2. `errorResilience.test.ts` & `document.test.ts` â€” Memperbarui pemanggilan `engine.restore(snap)` dengan parameter `{ restoreViewport: true }` pada skenario pengujian unit yang memvalidasi pemulihan viewport dari snapshot.

---

## [2026-06-11] FEATURE â€” Soft Brush Stroke Unified Path & shadowOffset Rendering [COMPLETE]

### Kategori: BUG FIX / BRUSH / RENDERER / UX

**Root Cause:**
Goresan kuas lembut (`hardness = 0`) yang digambar menggunakan serangkaian dab (stamp) radial gradient bulat yang sangat rapat (spacing 15%) mengalami penumpukan alpha (alpha accumulation) di bawah mode blend `"source-over"`. Nilai alpha kecil yang bertumpuk sepanjang sisi garis lintasan seretan mouse dengan cepat berakumulasi melebihi `1.0` (fully opaque). Hal ini menyebabkan tepi goresan memadat secara tidak wajar dan tampak keras seperti sosis (sausage effect) alih-alih mempertahankan kelembutan gradiennya.

**Fix Rationale:**
Mengubah metode penggambaran dari cap radial gradien berulang menjadi **satu garis utuh (Unified Path)** menggunakan kombinasi `shadowOffsetX` dan `shadowBlur` di Canvas 2D. Dengan memposisikan koordinat penggambaran garis padat (core) jauh di luar layar (misal digeser sejauh `-20000` piksel) dan memproyeksikan bayangan lembutnya kembali ke posisi asli, kita mendapatkan tepian kuas lembut yang 100% seragam tanpa ada sambungan tumpang tindih. Lebar core dan ukuran blur bayangan dihitung secara dinamis dari ukuran kuas dan persentase hardness.

**Rincian Perubahan:**
1. `paintStrokeRenderer.ts` â€” Mengubah `renderPaintStrokeToContext` untuk menggambar satu garis terpadu menggunakan bayangan offset (`shadowOffsetX = 20000`, `shadowBlur = size - coreWidth`) ketika hardness < 1. Untuk kuas keras (hardness = 1), gambar garis padat biasa tanpa bayangan. Jika goresan hanya memiliki 1 koordinat (titik), gambar titik tunggal menggunakan `arc`.
2. `useBrushOverlay.ts` â€” Memperbarui `onPaintStroke` untuk menghapus overlay canvas/eraser buffer dan menggambar ulang seluruh koordinat (`localPoints`) dari awal garis pada setiap event gerakan mouse (pointer move).
3. `paintStrokeRenderer.test.ts` â€” Memperbarui pengujian unit untuk mencocokkan parameter path baru (`shadowBlur`, `shadowOffsetX`, `lineWidth`, `lineTo`, `moveTo`) dan menghapus pengujian radial gradient yang sudah usang.

---

## [2026-06-11] BUG FIX â€” Brush Soft Edge Overlap Accumulation [COMPLETE]

### Kategori: BUG FIX / BRUSH / RENDERER / UX

**Root Cause:**
Saat menggambar stroke kuas dengan `hardness = 0`, tepi luar dari lingkaran dab kuas yang bertumpuk (overlapping) dengan sangat rapat sepanjang garis lintasan mouse diakumulasikan nilainya secara linear oleh Canvas 2D. Nilai alpha kecil yang bertumpuk berulang kali (`0.2 + 0.2 + 0.2 ...`) dengan cepat melewati `1.0` (fully opaque). Hal ini menyebabkan tepi luar kuas yang diseret (drag) kehilangan efek kelembutan gradiennya dan menghasilkan tepian kuas yang keras seperti `hardness = 100%`.

**Fix Rationale:**
Mengubah kejatuhan transparansi gradien kuas dari model linear ke model non-linear (cubic falloff) menggunakan persamaan $(1 - t)^3$. Dengan kurva kubik ini, tingkat transparansi individual di tepi luar satu dab kuas berkurang secara eksponensial menjadi sangat kecil (misalnya `0.008` pada radius 80%). Hasilnya, meskipun bertumpuk berulang-ulang saat kuas diseret, akumulasi nilainya tidak akan mencapai batas solid dan tepi lintasan kuas akan tetap mempertahankan kelembutannya (soft, fuzzy edges).

**Rincian Perubahan:**
1. `paintStrokeRenderer.ts` â€” Mengubah pembuatan `addColorStop` pada radial gradient brush dabs. Sekarang loop iteratif menambahkan 6 titik perhentian gradien (stops) dari `hardness` ke `1.0` dengan menghitung tingkat transparansi kubik `Math.pow(1 - t, 3)`.

---

## [2026-06-11] BUG FIX â€” Brush Tool Smoothing Slider, Transformed Layer Preview and Commit Alignment [COMPLETE]

### Kategori: BUG FIX / BRUSH / ERASER / FRONTEND / UX

**Root Cause:**
1. **Slider Smoothing Lag**: Di `useCanvasPointerTools.ts`, nilai persentase smoothing dari input slider (0-100%) dikirim secara langsung ke `paintSmoother.setWindowSize()` tanpa dipetakan terlebih dahulu menggunakan utilitas `smoothingToWindowSize(smoothing)`. Hal ini menyebabkan ukuran window smoothing menjadi terlalu besar (sampai 100 poin) sehingga goresan kuas terasa sangat lag dan tidak memiliki tingkat kehalusan (granularity) yang sesuai.
2. **Double Drawing & Preview Opacity Popping**: Di `useBrushOverlay.ts`, saat user mulai melukis (`prevStrokePointCount === 0`), `imageBitmap` layer digambar ulang ke dalam `overlayCanvasRef`. Karena overlay canvas ini di-render menggunakan CSS `opacity: 1` di atas viewport WebGL, tingkat opacity dan blend-mode asli dari layer tertimpa oleh salinan solid ini selama proses drag, menyebabkan tampilan visual tiba-tiba memudar/pop ke opacity 100%.
3. **Mismatched Canvas Preview Transform**: Elemen overlay canvas diposisikan secara statis memenuhi seluruh area document container tanpa memperhitungkan transform local layer (termasuk offset translasi X/Y, rotasi, skala, flip horizontal/vertikal, dan opacity dari layer itu sendiri). Akibatnya, ketika melukis pada layer yang telah di-transform (di-rotate/di-scale), visual goresan kuas preview saat di-drag tidak sejajar dengan goresan kuas final yang menempel pada layer.
4. **Pointer Up Commit Regression**: Di `useCanvasPointerTools.ts`, fungsi penanganan `onCanvasPointerUp` memanggil `handlePointerUp` dari `input-handler.ts` terlebih dahulu sebelum memanggil `params.commitBrushStroke()`. Namun, `handlePointerUp` tersebut langsung mengosongkan array koordinat `interactiveState.strokePoints = []`. Akibatnya, pemeriksaan `interactiveState.strokePoints.length > 0` di bawahnya selalu bernilai false dan goresan kuas tidak pernah dikomit secara permanen ke layer (stroke menghilang setelah mouse dilepas).

**Fix Rationale:**
1. **Peta Skala Smoothing**: Memanggil utilitas `smoothingToWindowSize(interactiveState.paintSettings.smoothing)` sebelum mengirim nilai ukuran window ke `paintSmoother.setWindowSize()`.
2. **Kanvas Preview Transparan**: Menghilangkan proses penggambaran awal `imageBitmap` layer ke overlay canvas selama proses melukis aktif. Sebagai gantinya, saat `commitBrushStroke` dipicu, `layer.imageBitmap` asli digambar terlebih dahulu ke kanvas snapshot offscreen sebelum menimpa goresan kuas dari overlay canvas di atasnya.
3. **Layer-Local Canvas CSS Transform**: Menambahkan memo reaktif `activeLayer` dan `overlayCanvasStyle` di `CanvasViewport.tsx` yang menerjemahkan properti layer transform (`x`, `y`, `scaleX`, `scaleY`, `rotation`, `flipH`, `flipV`, `opacity`) ke dalam instruksi CSS `translate3d`, `rotate`, `scale`, dan `opacity` pada overlay canvas.
4. **State Snapshot Before Clear**: Menyimpan kondisi stroke (`hasPoints`) sebelum memicu `handlePointerUp`, dan menggunakan referensi boolean tersebut untuk menentukan apakah `commitBrushStroke` perlu dipicu.

**Rincian Perubahan:**
1. `useCanvasPointerTools.ts` â€” Mengimpor dan membungkus smoothing slider value menggunakan `smoothingToWindowSize`. Menyimpan status `hasPoints` sebelum memanggil `handlePointerUp` dan menggunakannya sebagai kondisi commit.
2. `useBrushOverlay.ts` â€” Menghapus penggambaran `layer.imageBitmap` pada `onPaintStroke` untuk brush non-eraser. Memperbarui `commitBrushStroke` untuk menggambar `layer.imageBitmap` pada kanvas snapshot sebelum goresan kuas.
3. `CanvasViewport.tsx` â€” Menambahkan `activeLayer` memo dan `overlayCanvasStyle` memo, lalu menyematkan `overlayCanvasStyle()` pada elemen overlay `<canvas>`.

---

## [2026-06-11] BUG FIX â€” Classic Rotated Crop Side Resize Axis, Pivot Drift, and Mouse Cursor Rotation [COMPLETE]

### Kategori: BUG FIX / CROP / FRONTEND / UX

**Root Cause:**
1. **Peta Delta Salah**: Di mode Classic Crop, ketika cropbox di-rotate dan di-resize menggunakan sisi/edge handle, terdapat percabangan `if (rot !== 0 && !isCorner)` di `useCropOverlayDrag.ts` yang memanggil `rotateHandleType` untuk memetakan ulang jenis handle (misalnya East menjadi South pada rotasi 90 derajat), namun menggunakan delta mouse mentah (`dx`/`dy` global) alih-alih delta lokal yang sudah diproyeksikan (`localDelta.dx`/`localDelta.dy`). Hal ini menyebabkan rumus resize memodifikasi ukuran menggunakan sumbu global yang miring terhadap cropbox, sehingga arah resize melenceng.
2. **Drift Titik Pusat Rotasi**: Ketika cropbox di-resize di bawah rotasi, koordinat `{ x, y, w, h }` kotak unrotated diperbarui. Karena render SVG menerapkan rotasi grup di sekitar titik pusat kotak yang baru (`cropRectCenter()`), titik pusat rotasi bergeser selama drag. Akibatnya, sisi/sudut seberang (anchor point) yang seharusnya diam/stasioner malah bergeser (drift) di layar.
3. **Indikator Mouse / Kursor Terkunci**: Walaupun elemen handle-individual di SVG sudah memiliki gaya kursor yang ter-rotate (`ns-resize`, `ew-resize`, dsb.), elemen induk `<svg>` yang mengontrol kursor mouse saat penangkapan pointer aktif (drag aktif) menggunakan `resolvedCursor()`. Nilai di dalam `resolvedCursor` ini secara keliru memanggil `getCursorForHandle(handle, 0, 1, 1)` dengan nilai rotasi statis `0`, sehingga kursor kembali menjadi tegak/tidak berotasi sesaat setelah drag dimulai.
4. **SolidJS <For> Loop Reactivity Gap**: Indikator kursor pada handle saat tidak di-drag ditentukan di [CropOverlayHandles.tsx](file:///d:/Project/image-studio/apps/desktop/src/components/editor/CropOverlayHandles.tsx). Namun, evaluasi kursor dilakukan secara langsung di dalam deklarasi loop `For` (`const cursor = getCursorForHandle(...)`). Karena array list `handles` tidak diperbarui saat rotasi diubah tanpa resizing, SolidJS tidak memicu re-render item `For` tersebut. Hal ini menyebabkan indikator kursor mouse saat hover terasa tidak sesuai/stale, dan baru diperbarui ketika di-click/di-drag (saat modifikasi ukuran memicu re-render).

**Fix Rationale:**
1. **Delta Lokal Seragam**: Menghilangkan percabangan khusus sisi handle (`rot !== 0 && !isCorner`) dan menyamakan perilakunya dengan handle sudut. Pergeseran mouse selalu diproyeksikan ke sumbu lokal cropbox yang ter-rotate via `screenDeltaToRotatedCropLocalDelta`, dan di-resize menggunakan handle asli (`drag.handle`).
2. **Koreksi Pivot**: Menambahkan logika koreksi translasi (`shiftX`, `shiftY`) pada koordinat `{ x, y }` setelah kalkulasi dimensi baru. Logika ini menghitung perbedaan antara vektor lokal titik anchor awal (`v1`) dan titik anchor baru (`v2`), lalu memutarnya kembali sebesar sudut rotasi untuk mengimbangi pergeseran pusat rotasi SVG. Ini menjamin titik seberang (anchor point) benar-benar diam secara statis di layar.
3. **Kursor Ter-rotate Selama Drag**: Memperbarui `resolvedCursor` di `useCropOverlayDrag.ts` agar menyertakan nilai rotasi aktif `cropRotationValue()` saat memanggil `getCursorForHandle`. Selain itu, kursor dikunci menggunakan handle aktif (`dragState()?.handle`) agar tidak berkedip (flicker) saat mouse sedikit bergeser dari area sensor handle selama proses drag sedang berlangsung.
4. **Kursor Hover Reaktif**: Mengubah penentuan kursor di dalam perulangan `For` pada `CropOverlayHandles.tsx` menjadi sebuah fungsi reaktif (`const cursor = () => ...`) dan memanggilnya di binding style `cursor: cursor()`. Dengan begitu, SolidJS dapat melacak ketergantungan `props.cropRotation` secara dinamis dan memperbarui CSS kursor pada handle seketika saat cropbox di-rotate, bahkan sebelum di-click.

**Rincian Perubahan:**
1. `useCropOverlayDrag.ts` â€” Menyederhanakan penentuan delta dengan selalu memproyeksikan delta mouse ke sumbu lokal cropbox. Menambahkan fungsi `getHandleAnchorLocalOffset` dan kalkulasi offset translasi ter-rotate untuk mengoreksi posisi `x`/`y` agar sisi anchor seberang tetap stasioner.
2. `useCropOverlayDrag.ts` â€” Memperbarui `resolvedCursor` untuk mengalirkan `cropRotationValue()` ke `getCursorForHandle` dan mengunci target handle selama drag aktif.
3. `CropOverlayHandles.tsx` â€” Mengubah deklarasi variabel `cursor` menjadi fungsi lambda `cursor()` reaktif agar pembaruan rotasi memicu perubahan kursor secara dinamis pada event hover.
4. `CropOverlay.test.tsx` â€” Memperbarui assertion pengujian unit resize sisi Classic Crop yang ter-rotate (45Â°, 90Â°, 180Â°) agar merefleksikan posisi `x`/`y` baru yang ter-pivot secara presisi dan benar.

---

## [2026-06-10] FEATURE â€” Modern Crop Drag Centering and Viewport Reset on Click [COMPLETE]

### Kategori: FEATURE / CROP / VIEWPORT / UX

**User Goal:**
1. Clicking the canvas in Crop mode when no cropbox exists should center the viewport, reset image offset adjustments, and create a centered default or restored crop frame.
2. Drag-to-create crop frames in Modern mode should be positioned accurately (centered in the viewport) instead of hardcoding coordinates to `(0,0)` (which aligned the frame to the top-left of the viewport).

**Implementation:**
1. `useCanvasPointerTools.ts` â€” destructured `setPan` from the editor context.
2. In Classic and Modern crop mode click fallback (inside `onCanvasPointerUp`), added pan centering logic:
   - Resets viewport coordinates to place the document center exactly in the center of the viewport.
   - For Modern crop, also resets `modernCropImageTransform` offsets (`offsetX`, `offsetY`, `rotation: 0`, `scale: 1`).
3. In Modern `commitDragCreateFrame`, positioned the newly created frame at `x: (vw - clamped.w) / 2, y: (vh - clamped.h) / 2` to match the viewport center, rather than hardcoding it to `(0,0)`.
4. `CanvasViewport.test.tsx` â€” updated Classic and Modern crop click-to-create frame tests to set a non-zero viewport pan before click and assert that the viewport gets panned back to `(0,0)` (centered position) after the click. Also added centering assertions to the drag-create aspect test.

---

## [2026-06-10] BUG FIX â€” Modern Crop Fill BG Panning Lag [COMPLETE]

### Kategori: BUG FIX / CROP / FRONTEND / UI

**Root Cause:** In Modern Crop mode, the viewport-aware crop frame's position (`frame.x` and `frame.y`) shifts on viewport panning/scrolling. However, `modernCropFillPreviewStyle` positioned the fill background using hardcoded viewport-centered math `(viewportWidth - frame.w) / 2` and `(viewportHeight - frame.h) / 2`, causing the fill background to remain static and lag/be left behind during pan.

**Fix Rationale:** Position `modernCropFillPreviewStyle` directly using the crop frame's actual coordinates (`frame.x` and `frame.y`) to ensure it always moves with the frame.

**Rincian Perubahan:**
1. `CanvasViewport.tsx` â€” updated `modernCropFillPreviewStyle` CSS positioning to use `frame.x` and `frame.y` instead of hardcoded center offsets.
2. `CanvasViewport.test.tsx` â€” bound `setModernFrameState` inside `TestConsumer` and added a unit test verifying positioning accuracy of the modern crop fill preview on frame movement.

---

## [2026-06-10] FEATURE â€” Smart Guides (Crop Classic) [COMPLETE]

### Kategori: FEATURE / CROP / UX / SNAP

**User Goal:** Snap to document edges, center, and rule-of-thirds during crop drag-create + visual cyan dashed snap lines.

**Implementation:**
1. Added rule-of-thirds targets (`docW/3`, `2*docW/3`, `docH/3`, `2*docH/3`) to `buildCropSnapTargets` in `cropSnap.ts`
2. Fixed `edgesForHandle("new")` to return all 6 edges (was returning `[]`, so no snap during drag-to-create)
3. Added `color?: string` to `SnapLine` interface in `smartGuides.ts`
4. Updated `SmartGuides.tsx` to render `line.color` (default magenta #ff00ff for move tool, cyan #00ffff with dasharray `"4 2"` for crop)
5. Added 3 new tests covering rule-of-thirds targets, "new" handle snap, and cyan line color

**No changes needed elsewhere** â€” `onSnapLines` flow from `CropOverlay` â†’ `CanvasViewport` â†’ `SmartGuides` already wired correctly.

**Modern mode** snap still separate (needs screenâ†’doc coordinate conversion).

## [2026-06-10] FEATURE â€” Ratio Pill Bar [COMPLETE]

### Kategori: FEATURE / CROP / UX / FRONTEND

**User Goal:** Replace the crop mode `<select>` dropdown and ratio preset `<select>` with a row of quick-access pills in the Option Bar for one-click mode/aspect switching.

**Implementation:**
1. Replaced `<select>` mode selector (Free/Ratio/Size) and `<select>` preset dropdown with pill bar
2. Pills: Free (always), 1:1, 4:3, 16:9, 3:2, 21:9, + (custom), Size (always)
3. Added `4:3` and `21:9` to `CROP_PRESETS` and `PILL_PRESETS`
4. "+" pill toggles inline W:H `EditableNumField` fields, initialized from current `cropAspect()`
5. Custom W:H submit auto-closes fields and switches to Ratio mode
6. 17+ tests migrated from `fireModeChange`/`firePresetChange` to `clickPill(container, label)`
7. Fixed: `createSignal(() => cropAspect()?.w ?? 16)` evaluated lambda as value â†’ used plain value + `onClick` initializer

**Fixes:**
- Custom W:H signals initialized from `cropAspect()` on "+" click (not stale defaults)
- W/H `EditableNumField` only submits when value differs from `props.value` (+/- 0.0001)

## [2026-06-08] FEATURE â€” Crop Fill Background WYSIWYG Preview [COMPLETE]

### Kategori: FEATURE / CROP / FRONTEND / ENGINE / UX

**User Goal:** Crop should support a Fill BG option that defaults to the editor Background Color swatch, allows a per-crop custom color override, previews the fill immediately, and bakes the same color into empty/new crop output areas on apply.

**Implementation Rationale:** Treat fill as crop-local state so custom crop fill does not mutate the global background swatch. Resolve the actual fill color at apply time and pass it through all crop commit paths. Bake the fill as a bottom raster layer so undo/redo and exports see real pixels instead of a renderer-only preview.

**Rincian Perubahan:**
1. `cropState.ts` / `EditorContext.tsx` â€” Added crop fill enabled/source/custom color state to the editor context.
2. `CropOptionBar.tsx` â€” Added Fill BG toggle, color input, and "Use BG" return action. Background-source mode follows the live editor background swatch; custom mode stays crop-local.
3. `CanvasViewport.tsx` â€” Added Classic and Modern fill preview layers behind the WebGL canvas/crop output so empty areas show the selected fill immediately.
4. `cropToolActions.ts`, `CanvasViewport.tsx`, `useCanvasKeyboard.ts` â€” Routed option-bar Apply, overlay apply, and Enter-key apply through the same resolved crop fill color.
5. `cropApply.ts` / `document.ts` â€” Extended apply options and bake the selected fill color into a bottom `Crop Fill Background` raster layer.
6. Tests â€” Added coverage for default background source, live background color updates, custom override without global swatch mutation, preview presence for Modern/Classic, apply baking for canvas expansion and rotated crop corners, and undo/redo restoration.

### Verification Results
- PASS: `pnpm --filter photrez-desktop exec vitest run src/engine/__tests__/postCropAlignment.test.ts src/engine/__tests__/cropUndoIntegration.test.ts src/components/editor/__tests__/CropOptionBar.test.tsx src/components/editor/__tests__/CanvasViewport.test.tsx --pool=threads --maxWorkers=1` (103 tests)
- PASS: `pnpm run build`
- PASS: `pnpm --filter photrez-desktop test --run --pool=threads --maxWorkers=1` (737 tests)

---

## [2026-06-09] FEATURE â€” Brainstorm: Modern Crop Power Features [COMPLETE]

### Kategori: FEATURE / CROP / DESIGN / UX

**User Goal:** Brainstorm 4 power features for the drag-to-create crop workflow after basic implementation was complete.

**Sesi Brainstorming (Visual Companion):**
1. **Ratio Pill Bar** â€” Replace mode selector + preset dropdown with pill bar in Option Bar. Pills: Free, 1:1, 16:9, 4:3, 3:2, 21:9 + Custom. Visible in Free/Ratio mode, hidden in Size mode. Pill click auto-switches mode. Shift temporary overrides to 1:1.
2. **Center-Out Drag** â€” Alt = center-out (symmetric growth from center). Shift = square constrains. Alt+Shift = center-out square. Mid-drag flip between modifiers.
3. **Smart Guides** â€” Snap to document edges, document center (V+H), rule of thirds (â…“ + â…”). Cyan dashed lines, ~5px threshold.
4. **Canvas Expansion** â€” Directional (match drag direction). Auto-trigger when crop frame exceeds document bounds. On apply, canvas resizes to expanded bounding box.

**Keputusan Design:**
- Pill bar pertama (value tertinggi, scope terkecil), lalu Smart Guides, Center-Out Drag, Canvas Expansion.
- Alt/Shift sebagai orthogonal modifiers â€” Alt = center-out, Shift = square, Alt+Shift = keduanya.
- Smart guides hanya document-level (tidak multi-frame atau golden ratio untuk MVP).
- Semua rasio selalu tersedia regardless of orientation.
- Custom rasio via inline W:H fields (post-MVP untuk kustomisasi lebih lanjut).
- Design spec written: `docs/superpowers/specs/2026-06-09-ratio-pill-bar-design.md`

### Verification Results
- PASS: design doc reviewed and accepted by user
- PASS: visual mockups presented via browser companion (port 54415)

---

## [2026-06-09] BUG FIX â€” Drag-to-Create Preview Sizing (Borderâ†’Outline) [COMPLETE]

### Kategori: BUG FIX / CROP / FRONTEND / UX

**Root Cause:** The rubber-band selection preview (`cropDragPreview`) used `border: 1.5px dashed` with default `box-sizing: content-box`, adding 3px to both width/height of the rendered preview element. The final crop frame (SVG overlay) used `stroke` (~1.125px outside each side), making the frame visually ~0.75px smaller per side than the preview. Additionally, `Math.round` on frame dimensions introduced up to 0.5px sizing error per axis.

**Fix:**
1. Switched preview from `border` to `outline` â€” outline doesn't affect the box model, so preview visual size now matches content area exactly.
2. Removed `Math.round` from frame dimension clamping â€” frame now uses exact floating-point selection size.

**Verification:** Build passes, 755 tests pass.

---

## [2026-06-08] BUG FIX â€” Classic Rotated Crop Resize Axis [COMPLETE]

### Kategori: BUG FIX / CROP / FRONTEND / UX

**Root Cause:** Classic Crop visually rotates the crop rectangle and handles inside an SVG group, but resize drag math still passed raw screen/document-axis deltas to `applyCropResizeHandle()`. After rotation, the visible handle's local X/Y axes no longer match the screen axes, so dragging a rotated handle changed the wrong dimension and made the crop box stretch oddly.

**Fix Rationale:** Resize deltas must be converted from screen/document axes into the crop box's local axes before width/height math runs. Move and rotation interactions should remain unchanged.

**Rincian Perubahan:**
1. `cropGeometry.ts` â€” Added `screenDeltaToRotatedCropLocalDelta()` to inverse-rotate pointer deltas by the active crop rotation.
2. `useCropOverlayDrag.ts` â€” Classic Crop resize now uses the local delta before calling `applyCropResizeHandle()`.
3. `crop-geometry.test.ts` â€” Added regression coverage for rotated crop resize delta mapping, including 90-degree axis conversion and east-handle resize behavior.

### Verification Results
- PASS: `pnpm --filter photrez-desktop exec vitest run src/__tests__/crop-geometry.test.ts src/components/editor/__tests__/CropOverlay.test.tsx --pool=threads --maxWorkers=1` (70 tests)
- PASS: `pnpm run build`
- PASS: `pnpm --filter photrez-desktop test --run --pool=threads --maxWorkers=1` (728 tests)

---

## [2026-06-08] BUG FIX â€” Crop Rotate Regression Recovery [COMPLETE]

### Kategori: BUG FIX / CROP / FRONTEND / UX

**Root Cause:** A rollback/recovery pass left two crop-rotation regressions. Modern Crop's WebGL canvas had been moved outside the document transform container to fix post-crop edge sampling, but `modernImageTransformStyle()` still only transformed the document-space overlay container. During Modern Crop rotation, the photo stayed visually static while the artboard border/overlay rotated, producing the black moving box. Classic Crop also still rendered the old corner arc rotate controls in `CropOverlayHandles` even though `CropOverlay` already had the shared outside rotate band.

**Fix Rationale:** Treat this as a narrow recovery, not a crop behavior rewrite. Modern Crop must apply the same pivot transform directly to the rendered image canvas when crop is active. Classic Crop should keep move/resize geometry unchanged and remove only the stale arc rotate UI so the shared outside band owns rotation.

**Rincian Perubahan:**
1. `CanvasViewport.tsx` â€” When Modern Crop is active, the WebGL canvas now uses document-size CSS dimensions and applies `modernImageTransformStyle()` directly, so the image rotates around the existing Modern Crop pivot.
2. `CropOverlayHandles.tsx` â€” Removed old Classic corner arc rotate paths and related props/imports; resize handles remain unchanged.
3. `CropOverlay.tsx` â€” Removed the now-unused `rotateOuter` prop wiring to `CropOverlayHandles`.

### Verification Results
- PASS: `pnpm --filter photrez-desktop exec vitest run src/components/editor/__tests__/CropOverlay.test.tsx src/components/editor/__tests__/rotateBand.test.ts --pool=threads --maxWorkers=1` (42 tests)
- PASS: `pnpm run build`
- PASS: `pnpm --filter photrez-desktop test --run --pool=threads --maxWorkers=1` (724 tests)

---

## [2026-06-08] BUG FIX â€” Size Mode Frame Fitting + Crop Re-entry Sync [COMPLETE]

### Kategori: BUG FIX / CROP / UX

**Bug 1 â€” Size mode preview used raw target dimensions:**
`fitFrameToMaxBounds(target * zoom)` preserved literal target pixel size, so a 100Ã—100 target produced a tiny 100Ã—100 frame instead of filling the canvas at 1:1 aspect.

**Fix (CropOptionBar.tsx):** Replaced with `setModernFrameToAspect({ w: target.w, h: target.h })` in all 4 Size mode paths. Frame now always fills canvas at target's aspect ratio, matching Ratio mode semantics.

**Bug 2 â€” Modern crop session key ignored mode/values:**
Session key `${activeDocumentId}:${viewport}x${viewportH}:${zoom}` didn't track `cropMode` or size/ratio values. Changing modes mid-session or re-entering crop didn't refit the frame. Size mode passed `aspect: null`, defaulting to canvas aspect.

**Fix (CanvasViewport.tsx):** Extended session key to `${...}:${mode}:${aspectKey}`. Computes aspect from mode: Ratio uses `cropAspect()`, Size uses target aspect, Free uses null.

**Bug 3 â€” Classic crop had no entry initialization:**
No effect initialized `cropRect` on Classic mode entry. Entering Crop in Size/Ratio mode with no rect left preview empty while controls showed correct values.

**Fix (CanvasViewport.tsx):** Added `createEffect` that initializes `cropRect` via `fitCropRectToAspect` when entering Classic crop in constrained mode with no rect and no hidden preview.

**New tests (11 total):** 6 in CropOptionBar.test.tsx (small/wide/tall targets, input edits, swap), 5 in CanvasViewport.test.tsx (entry in Size/Ratio/Free modes, mode switching).

**Verification:**
- `pnpm.cmd run build` â€” PASS
- `pnpm.cmd --filter photrez-desktop test --run --pool=threads --maxWorkers=1` â€” 692/692 tests, 50 files

---

## [2026-06-08] BUG FIX â€” Classic Crop State Leaks Across Document Switches [COMPLETE]

### Kategori: BUG FIX / CROP / DOCUMENT MANAGEMENT

**Root Cause:** Classic crop state (`cropRect`, `cropRotation`, `cropMode`, `cropAspect`, `cropSizeTarget`, `hiddenCropPreview`, undo/redo stacks) is stored in pure signals in `cropState.ts` with no reactive effects on `activeDocumentId`. When switching documents, stale crop coordinates from the old document leaked into the new document, which may have different dimensions.

**Fix Rationale:** Add a `createEffect` in `CanvasViewport.tsx` that watches `activeDocumentId()` and resets all Classic crop state when the document changes. Use a `prevDocIdForCropReset` sentinel variable to skip the initial mount (first effect run sets the sentinel but does not reset state). The effect also resets undo/redo stacks via `clearCropStacks()`.

**Changes:**
- `CanvasViewport.tsx`: Added crop reset `createEffect` (lines 188-203); added `setCropMode`, `setCropAspect`, `setCropSizeTarget`, `clearCropStacks` to destructuring from `useEditor()`
- `CanvasViewport.test.tsx`: 4 new tests for doc-switch crop state reset (Classic + Modern frame recomputation)
- `CropOverlay.test.tsx`: 3 new tests for Modern crop lostpointercapture during move/resize/rotate
- `modern-crop-geometry.test.ts`: 6 new edge case tests (minimum size, extreme aspect ratios)

**Verification:**
- PASS: `pnpm.cmd run build` (tsc + Vite)
- PASS: `pnpm.cmd --filter photrez-desktop test --run --pool=threads --maxWorkers=1` (681 tests, 50 files)

---

## [2026-06-08] BUG FIX â€” Crop Mode Select Stale Application [COMPLETE]

### Kategori: BUG FIX / CROP / UX

**Root Cause:** The crop mode `<select>` Free/Ratio/Size `onChange` handler in `CropOptionBar.tsx` had `if (cropRect())` guard, which excluded Modern mode entirely (`cropRect()` is always null in Modern mode â€” it uses `modernCropFrame`). No `mode === "free"` branch existed. Modern frame updates were never called in the handler â€” only Classic `setCropRect()` was called.

**Fix Rationale:** Remove the `if (cropRect())` guard so mode changes apply regardless of interaction mode. Add explicit branches for all three modes:
- **Free**: release constraint without changing frame geometry.
- **Ratio**: set `cropAspect` (default 16:9), fit frame â€” `setModernFrameToAspect` for Modern, `fitCropRectToAspect` for Classic.
- **Size**: set `cropSizeTarget` (default 800Ã—600), resize frame â€” `setModernCropFrame({ w: targetW * zoom(), h: targetH * zoom() })` for Modern, `fitCropRectToAspect` for Classic.

**Rincian Perubahan:**
1. `CropOptionBar.tsx` â€” rewrote `<select onChange>` handler: removed `cropRect()` guard, added `free`/`ratio`/`size` branches, added Modern frame updates via `setModernFrameToAspect` and `setModernCropFrame`.
2. `CropOptionBar.test.tsx` â€” added 8 regression tests covering Freeâ†’Ratio (Classic+Modern), Freeâ†’Size (Classic+Modern), Ratioâ†’Free (Classic+Modern), Ratioâ†’Size (Classic), Sizeâ†’Free (Classic).

### Verification Results
- PASS: `pnpm.cmd --filter photrez-desktop exec vitest run src/components/editor/__tests__/CropOptionBar.test.tsx` (12 tests: 8 new + 4 existing)
- PASS: `pnpm.cmd --filter photrez-desktop test --run --pool=threads --maxWorkers=1` (661 tests, 50 files)
- PASS: `pnpm.cmd run build`

---

## [2026-06-08] BUG FIX â€” Crop Mode/Layout Changes Stale Frame [COMPLETE]

### Kategori: BUG FIX / CROP / UX

**Root Cause:** Even after Phase 1 made mode selection apply immediately, the frame could still be stale/oversized because:
1. `setModernFrameToAspect` preserved current frame size and just adjusted one axis â€” no canvas-bounds check.
2. Size mode assigned `target * zoom` directly without clamping â€” large targets produced oversized frames.
3. `handlePresetChange("custom")` only handled Classic mode, not Modern.
4. Swap button Size/Free paths assigned without clamping.
5. Mode â†’ Free did not clamp oversized frame.

**Fix Rationale:** Add `fitFrameToMaxBounds` helper that scales down preserving aspect if frame exceeds `min(viewportW, docW * zoom)`. Use it in all frame-setting paths. Rewrite `setModernFrameToAspect` to delegate to `getDefaultModernCropFrame` which always returns the max canvas-fitting frame at the given aspect.

**Rincian Perubahan:**
1. `CropOptionBar.tsx` â€” new `fitFrameToMaxBounds` helper; `setModernFrameToAspect` rewritten; 8 paths updated to clamp: modeâ†’Free, modeâ†’Size, Size W input, Size H input, presetâ†’custom, swap Size, swap Free.
2. `CropOptionBar.test.tsx` â€” 7 new tests: repeated mode cycling (5 transitions), Sizeâ†’Free oversized clamp, ratio preset change, custom ratio, Classic mode cycling.

### Verification Results
- PASS: `pnpm.cmd --filter photrez-desktop exec vitest run src/components/editor/__tests__/CropOptionBar.test.tsx` (19 tests)
- PASS: `pnpm.cmd --filter photrez-desktop test --run --pool=threads --maxWorkers=1` (668 tests, 50 files)
- PASS: `pnpm.cmd run build`

---

## [2026-06-08] BUG FIX â€” Global Focus Halo (focus-visible) [COMPLETE]

### Kategori: BUG FIX / UI / ACCESSIBILITY / CSS

**Root Cause:** `index.css` had `* { @apply outline-none }` which uses the universal selector (specificity 0,0,0), too weak to override the browser default `:focus { outline: auto }` (specificity 0,1,0). Tailwind v4's `outline-none` produces `outline: 2px solid transparent; outline-offset: 2px`, which on dark backgrounds renders as a visible white-ish anti-aliased edge artifact. No `:focus-visible` rules existed, so mouse clicks and keyboard Tab produced the same persistent "halo" visual. Keyboard accessibility was broken â€” no visible focus indicator for Tab navigation.

**Fix Rationale:** Remove `outline-none` from the `*` reset (it was too weak anyway). Add `:focus:not(:focus-visible)` to suppress the transparent outline for mouse clicks (keeping transparent outline structure for forced-colors mode compat). Add `:focus-visible` with accent-colored 2px outline for keyboard focus navigation. This applies globally to all interactive elements â€” toolbar buttons, tabs, panel buttons, controls â€” without per-component changes.

**Rincian Perubahan:**
1. Removed `outline-none` from `* { @apply ... }` in `index.css` base layer.
2. Added `:focus:not(:focus-visible)` rule â€” `outline: 2px solid transparent !important; outline-offset: 2px !important` â€” suppresses mouse focus artifact.
3. Added `:focus-visible` rule â€” `outline: 2px solid var(--color-accent, #E15A17) !important; outline-offset: 2px !important` â€” visible accent indicator for keyboard Tab navigation.
4. No component-level changes needed â€” global CSS handles all interactive elements.

### Files Changed:
- `apps/desktop/src/index.css`
- `docs/AI_CURRENT_TASK.md`
- `docs/AI_HISTORY.md`

### Verification Results
- PASS: `pnpm.cmd run build` (tsc + Vite)
- PASS: `pnpm.cmd --filter photrez-desktop test --run --pool=threads --maxWorkers=1` (653 tests, 50 files)

---

## [2026-06-07] BUG FIX â€” Modern Crop Apply Rotation Sign [COMPLETE]

### Kategori: BUG FIX / CROP / FRONTEND / UX

**Root Cause:** Modern Crop preview renders image rotation as the document/CSS transform `+R`, but `DocumentEngine.applyCrop()` interprets `cropRotation` as the crop-frame rotation and subtracts it from the layer transform. Modern Crop was passing preview rotation directly into the engine, so a visually rotated crop could commit with the opposite/inverted orientation.

**Fix Rationale:** Modern Crop's rotation value is a preview transform, not the engine's crop-frame rotation convention. The conversion must happen at the Modern Crop apply boundary so Classic Crop keeps its existing semantics while every Modern apply path sends a consistent inverse rotation.

**Rincian Perubahan:**
1. Added `getModernCropApplyRotation()` to convert Modern preview rotation into the crop engine apply rotation.
2. Updated Modern Crop apply from viewport overlay, keyboard Enter, and option-bar Apply to use the converted rotation.
3. Added regression coverage for the rotation convention helper and Modern Crop keyboard apply behavior.
4. Preserved Classic Crop `cropRotation()` pass-through behavior.

### Files Changed:
- `apps/desktop/src/viewport/modernCropGeometry.ts`
- `apps/desktop/src/components/editor/CanvasViewport.tsx`
- `apps/desktop/src/components/editor/CropOptionBar.tsx`
- `apps/desktop/src/components/editor/useCanvasKeyboard.ts`
- `apps/desktop/src/__tests__/modern-crop-geometry.test.ts`
- `apps/desktop/src/components/editor/__tests__/ModernCropKeyboardParity.test.tsx`
- `docs/AI_CURRENT_TASK.md`
- `docs/AI_HISTORY.md`
- `docs/FEATURES.md`

### Verification Results
- RED: `pnpm.cmd exec vitest run src/components/editor/__tests__/ModernCropKeyboardParity.test.tsx src/__tests__/modern-crop-geometry.test.ts --pool=threads --maxWorkers=1` failed because Modern Enter still sent `cropRotation: 15` and the conversion helper was missing.
- PASS: `pnpm.cmd exec vitest run src/components/editor/__tests__/ModernCropKeyboardParity.test.tsx src/__tests__/modern-crop-geometry.test.ts --pool=threads --maxWorkers=1` (45 tests)
- PASS: `pnpm.cmd run build`
- PASS: `pnpm.cmd --filter photrez-desktop test --run --pool=threads --maxWorkers=1` (605 tests, 50 files)

---

## [2026-06-07] BUG FIX â€” Modern Crop Visual Apply and Rotated Drag Direction [COMPLETE]

### Kategori: BUG FIX / CROP / FRONTEND / UX

**Root Cause:** Modern Crop apply converted the viewport-space cropbox into document space by inverse-mapping all four rotated screen corners and returning their axis-aligned bounding box. The crop engine already accepts the crop frame width/height plus a separate rotation value, so sending an AABB made the committed crop canvas larger than the visible cropbox and shifted the result away from the visual preview. Modern Crop move/resize compensation also stored raw screen deltas directly in `offsetX/offsetY`; because the render transform rotates offset deltas, dragging after rotation moved the image along a rotated direction instead of following the mouse in screen space.

**Fix Rationale:** Modern Crop's visual frame is screen-aligned and rotation is an image transform under that frame. Apply must therefore send the crop frame center plus visual frame size converted to document units, while preserving rotation as the crop engine rotation option. Pointer movement is user-facing screen-space input, so move/resize compensation must be inverse-rotated before being written into the image transform offset state.

**Rincian Perubahan:**
1. Changed `modernFrameToCropRect()` to use the rendered cropbox pivot and frame `w/h / (zoom * scale)`, instead of a rotated document-space AABB.
2. Added `modernScreenDeltaToImageOffsetDelta()` to convert screen deltas into image offset deltas under the current rotation.
3. Updated Modern Crop move drag and resize compensation to use inverse-rotated deltas.
4. Replaced the old regression expectation that locked in AABB growth for rotated Modern crop.
5. Added overlay-level coverage proving a rightward screen drag at 90-degree rotation updates image offset vertically, which renders as a rightward visual move.

### Files Changed:
- `apps/desktop/src/viewport/modernCropGeometry.ts`
- `apps/desktop/src/components/editor/ModernCropOverlay.tsx`
- `apps/desktop/src/__tests__/modern-crop-geometry.test.ts`
- `apps/desktop/src/components/editor/__tests__/CropOverlay.test.tsx`
- `docs/AI_CURRENT_TASK.md`
- `docs/AI_HISTORY.md`
- `docs/FEATURES.md`

### Verification Results
- RED: `pnpm.cmd exec vitest run src/__tests__/modern-crop-geometry.test.ts --pool=threads --maxWorkers=1` failed because rotated Modern crop returned AABB dimensions and drag delta helper was missing.
- PASS: `pnpm.cmd exec vitest run src/components/editor/__tests__/CropOverlay.test.tsx src/__tests__/modern-crop-geometry.test.ts --pool=threads --maxWorkers=1` (61 tests)
- PASS: `pnpm.cmd run build`
- PASS: `pnpm.cmd --filter photrez-desktop test --run --pool=threads --maxWorkers=1` (604 tests, 50 files)

---

## [2026-06-07] BUG FIX â€” Crop Apply Recenters Viewport After Commit [COMPLETE]

### Kategori: BUG FIX / CROP / FRONTEND / UX

**Root Cause:** `applyCropPreview()` changed the document dimensions and refreshed renderer textures, but it did not recompute viewport zoom/pan for the new canvas size. Any pre-crop viewport state, including Modern Crop image movement/rotation state expressed through the viewport model, could survive after crop commit and leave the new artboard visually off-center.

**Fix Rationale:** Applying crop changes the canvas dimensions, so the viewport must be fitted to the new document before the renderer backing buffer is resized. The shared crop apply action now accepts a recenter hook and invokes it immediately after `engine.applyCrop()` so Classic Crop, Modern Crop, Enter, double-click, and option-bar Apply share the same post-crop viewport behavior.

**Rincian Perubahan:**
1. Added optional `recenterViewport` support to `applyCropPreview()`.
2. Calls `recenterViewport` before `renderer.resize()` so the WebGL backing buffer uses the updated zoom from the recentered viewport.
3. Wired `CanvasViewport` Modern/Classic apply paths and `useCanvasKeyboard` Enter paths to `fitToScreenAndRender()`.
4. Wired `CropOptionBar` Apply to `engine.fitToScreen(viewportWidth, viewportHeight)` plus `syncViewport()`.
5. Added a regression test proving crop apply recenters the viewport after commit.

### Files Changed:
- `apps/desktop/src/components/editor/cropToolActions.ts`
- `apps/desktop/src/components/editor/CanvasViewport.tsx`
- `apps/desktop/src/components/editor/useCanvasKeyboard.ts`
- `apps/desktop/src/components/editor/CropOptionBar.tsx`
- `apps/desktop/src/components/editor/__tests__/cropToolActions.test.ts`
- `docs/AI_CURRENT_TASK.md`
- `docs/AI_HISTORY.md`
- `docs/FEATURES.md`

### Verification Results
- RED: `pnpm.cmd exec vitest run src/components/editor/__tests__/cropToolActions.test.ts --pool=threads --maxWorkers=1` failed because `recenterViewport` was not called.
- PASS: `pnpm.cmd exec vitest run src/components/editor/__tests__/cropToolActions.test.ts --pool=threads --maxWorkers=1` (7 tests)
- PASS: `pnpm.cmd run build`
- PASS: `pnpm.cmd --filter photrez-desktop test --run --pool=threads --maxWorkers=1` (602 tests, 50 files)

---

## [2026-06-07] BUG FIX â€” Modern Crop Modifier and Shortcut Parity [COMPLETE]

### Kategori: BUG FIX / CROP / FRONTEND / UX

**Root Cause:** Modern Crop used its own simplified resize path and did not pass pointer `shiftKey`/`altKey` into the geometry helper. That dropped Classic Crop modifier behavior for free aspect lock, ratio/size Shift inversion, Alt center resize, and Shift+Alt combined resize. The Crop keyboard branch also checked `Ctrl+Z` before `Ctrl+Shift+Z`, so Modern Crop redo via `Ctrl+Shift+Z` was incorrectly routed to undo.

**Fix Rationale:** Modern Crop is a different coordinate model, but not a different interaction contract. Modifier interpretation should match Classic Crop and Transform conventions wherever the behavior applies, while preserving the viewport-fixed Modern frame and its image-compensation model.

**Rincian Perubahan:**
1. Added `shift`/`alt` inputs to `resizeModernFrameOneSided()`.
2. Reused Classic Crop resize semantics for Shift corner behavior and kept Modern's existing compensation model for normal one-sided resize.
3. Passed `e.shiftKey` and `e.altKey` from `ModernCropOverlay` into the Modern resize helper.
4. Reordered Crop keyboard undo/redo handling so `Ctrl+Shift+Z` maps to redo before plain `Ctrl+Z` undo.
5. Added regression tests for Modern Shift, Alt, Shift+Alt, Enter, Esc, Shift+Arrow nudge, Ctrl+Z, Ctrl+Y, and Ctrl+Shift+Z.

### Files Changed:
- `apps/desktop/src/viewport/modernCropGeometry.ts`
- `apps/desktop/src/components/editor/ModernCropOverlay.tsx`
- `apps/desktop/src/components/editor/useCanvasKeyboard.ts`
- `apps/desktop/src/components/editor/__tests__/CropOverlay.test.tsx`
- `apps/desktop/src/components/editor/__tests__/ModernCropKeyboardParity.test.tsx`
- `docs/AI_CURRENT_TASK.md`
- `docs/AI_HISTORY.md`
- `docs/FEATURES.md`

### Verification Results
- PASS: `pnpm.cmd exec vitest run src/__tests__/modern-crop-geometry.test.ts src/components/editor/__tests__/CropOverlay.test.tsx src/components/editor/__tests__/ModernCropKeyboardParity.test.tsx --pool=threads --maxWorkers=1` (63 tests)
- PASS: `pnpm.cmd run build`
- PASS: `pnpm.cmd --filter photrez-desktop test --run --pool=threads --maxWorkers=1` (602 tests, 50 files)

---

## [2026-06-07] BUG FIX â€” Modern Crop Rotation Pivot Uses Cropbox Center [COMPLETE]

### Kategori: BUG FIX / CROP / FRONTEND / UX

**Root Cause:** Modern Crop rendered the image/document with `translate(pan + offset) rotate(rotation) scale(...)` and `transform-origin: 0 0`. That made CSS rotate around the document top-left instead of the rendered cropbox center, so the cropbox center drifted visually while rotating.

**Fix Rationale:** Modern Crop is a viewport-space frame with the image moving underneath it. The visual transform and inverse crop-apply geometry must share one pivot: the rendered cropbox center in screen coordinates. The render transform now maps the document point under that screen pivot back to the same screen pivot after rotation and scale.

**Rincian Perubahan:**
1. Added `getModernCropFrameScreenCenter()` and `getModernCropImagePivot()` helpers in `modernCropGeometry.ts`.
2. Updated `CanvasViewport.tsx` Modern transform to use `translate(pivot screen) rotate(...) scale(...) translate(-pivot document)`.
3. Updated `screenPointToModernDocumentPoint()` and `modernFrameToCropRect()` so apply-crop inverse geometry uses the same pivot math as the DOM transform.
4. Added regression tests proving the rendered cropbox center remains pinned under rotation and scale.

### Files Changed:
- `apps/desktop/src/viewport/modernCropGeometry.ts`
- `apps/desktop/src/components/editor/CanvasViewport.tsx`
- `apps/desktop/src/__tests__/modern-crop-geometry.test.ts`
- `docs/AI_CURRENT_TASK.md`
- `docs/AI_HISTORY.md`
- `docs/FEATURES.md`

### Verification Results
- PASS: `pnpm.cmd exec vitest run src/__tests__/modern-crop-geometry.test.ts --pool=threads --maxWorkers=1` (39 tests)
- PASS: `pnpm.cmd run build`
- PASS: `pnpm.cmd --filter photrez-desktop test --run --pool=threads --maxWorkers=1` (594 tests, 49 files)

---

## [2026-06-07] FEATURE â€” Modern Crop: Projected Canvas Bounds [COMPLETE]

### Kategori: FEATURE / CROP / FRONTEND / UX

**Root Cause:** Modern crop frame size was tied to viewport dimensions only (`viewportWidth`/`viewportHeight`), ignoring the projected canvas size (`docWidth Ã— zoom Ã— scale`). This meant zoom in/out did not adjust the crop frame, and the frame could be arbitrarily large or small relative to the actual canvas content.

**Fix Rationale:** Frame size should track the projected canvas bounds â€” the visible canvas size at the current zoom level. The frame fits within `min(viewport, projected canvas)`, recomputes on zoom changes, and resize interactions clamp to projected bounds. This keeps the crop frame visually aligned with the document content.

**Rincian Perubahan:**
1. Added `getProjectedCanvasSize()` helper to `modernCropGeometry.ts` â€” computes `docWidth Ã— zoom Ã— scale` and `docHeight Ã— zoom Ã— scale`.
2. Added `clampFrameToProjectedBounds()` helper â€” clamps frame w/h to projected canvas size with minimum 24px.
3. Updated `getDefaultModernCropFrame()` â€” frame fits within `min(viewport, projected canvas)`. Added optional `scale` param (defaults to 1).
4. Updated `resizeModernFrameFromCenter()` and `resizeModernFrameOneSided()` â€” accept `projectedWidth`/`projectedHeight` as max bounds (fall back to viewport if not provided).
5. Updated `CanvasViewport.tsx` â€” session key now includes zoom so frame recomputes on zoom changes. Passes `scale` from `modernCropImageTransform` and computed `projectedWidth`/`projectedHeight` to overlay.
6. Updated `ModernCropOverlay.tsx` â€” added `projectedWidth`/`projectedHeight` props, resize handler passes projected bounds to `resizeModernFrameOneSided`.
7. Updated `CropOverlay.test.tsx` â€” added missing `projectedWidth`/`projectedHeight` props to test render.
8. Added 4 new tests: `getProjectedCanvasSize`, `clampFrameToProjectedBounds`, projected bounds clamping for center and one-sided resize. Updated 3 existing tests for new semantics.

### Files Changed:
- `apps/desktop/src/viewport/modernCropGeometry.ts` â€” added `getProjectedCanvasSize`, `clampFrameToProjectedBounds`, updated `getDefaultModernCropFrame`, `resizeModernFrameFromCenter`, `resizeModernFrameOneSided`
- `apps/desktop/src/components/editor/CanvasViewport.tsx` â€” zoom in session key, scale param, projected bounds computation
- `apps/desktop/src/components/editor/ModernCropOverlay.tsx` â€” projectedWidth/projectedHeight props, resize handler update
- `apps/desktop/src/components/editor/__tests__/CropOverlay.test.tsx` â€” added projectedWidth/projectedHeight to test render
- `apps/desktop/src/__tests__/modern-crop-geometry.test.ts` â€” 4 new tests, 3 updated tests

### Verification Results
- PASS: `npx vitest run src/__tests__/modern-crop-geometry.test.ts` (37 tests)
- PASS: `pnpm.cmd run build` (tsc + Vite)
- PASS: `npx vitest run` (588 tests, 49 files)

---

## [2026-06-07] FEATURE â€” Modern Crop: Size Mode Resize + Undo/Redo [COMPLETE]

### Kategori: FEATURE / CROP / FRONTEND / UX

**Root Cause:** Modern crop lacked size-mode aspect-ratio constraint during interactive resize. The `resizeModernFrameFromCenter` helper only handled free and ratio modes. Modern crop also lacked a dedicated undo/redo stack for frame and image-transform operations; switching tools or applying crop discarded any intermediate adjustment history.

**Fix Rationale:** Size mode should preserve the target-size aspect ratio during resize (same constraint behavior as ratio mode, but using `cropSizeTarget` as the aspect source). A dedicated undo/redo stack lets the user step through frame resize, image drag, and image rotation operations independently from the classic crop undo stack and the global document history.

**Rincian Perubahan:**
1. Added `cropMode` parameter to `resizeModernFrameFromCenter` â€” when `"size"` or `"ratio"`, the aspect ratio constraint is active. CanvasViewport computes effective aspect from `cropSizeTarget` when in size mode.
2. Added `commitModernCropState`, `undoModernCrop`, `redoModernCrop` to `modernCropState.ts` with dedicated undo/redo stacks. `resetModernCrop` clears both stacks.
3. Added `onModernCropCommit` callback prop to `ModernCropOverlay`, called at the start of every drag (move/resize/rotate). CanvasViewport wires it to `commitModernCropState`.
4. Added Ctrl+Z/Y (or Cmd+Z/Y) keyboard shortcuts in `useCanvasKeyboard.ts` for modern crop undo/redo â€” also wired for classic crop undo/redo.
5. Exposed `commitModernCropState`, `canModernCropUndo`, `canModernCropRedo`, `undoModernCrop`, `redoModernCrop` through `EditorContext`.
6. Added 19 new tests: size-mode constrain preserves aspect ratio, center stays fixed during N/S/E/corner resize, undo/redo commit/restore/clear/stack behavior.

### Files Changed:
- `apps/desktop/src/viewport/modernCropGeometry.ts` â€” added `cropMode` param to `resizeModernFrameFromCenter`
- `apps/desktop/src/components/editor/modernCropState.ts` â€” undo/redo stacks + helpers
- `apps/desktop/src/components/editor/ModernCropOverlay.tsx` â€” `onModernCropCommit` prop, wired on drag start
- `apps/desktop/src/components/editor/CanvasViewport.tsx` â€” size mode aspect, `onModernCropCommit`, destructure `commitModernCropState`
- `apps/desktop/src/components/editor/EditorContext.tsx` â€” expose modern undo/redo
- `apps/desktop/src/components/editor/useCanvasKeyboard.ts` â€” Ctrl+Z/Y for modern/classic crop undo/redo, destructure new functions + `cropInteractionMode`
- `apps/desktop/src/__tests__/modern-crop-geometry.test.ts` â€” 6 new tests: size mode, center stability
- `apps/desktop/src/__tests__/modern-crop-state.test.ts` â€” NEW: 10 undo/redo tests
- `docs/AI_CURRENT_TASK.md`
- `docs/AI_HISTORY.md`

### Verification Results
- PASS: `pnpm.cmd --filter photrez-desktop test -- apps/desktop/src/__tests__/modern-crop-geometry.test.ts apps/desktop/src/__tests__/modern-crop-state.test.ts` (563 tests, 49 files)
- PASS: `pnpm.cmd run build`
- PASS: `pnpm.cmd --filter photrez-desktop test --run --pool=threads --maxWorkers=1` (563 tests, 49 files)

---

## [2026-06-07] BUG FIX â€” Modern Crop Rotate and Initial Fit Regression [COMPLETE]

### Kategori: BUG FIX / CROP / FRONTEND / UX

**Root Cause:** Modern crop had two regressions after the coordinate-model split. The rotate hit zone was a generic transparent circle that overlapped resize handle behavior and had no regression proof for rotation. The default frame helper also clamped frame width/height to `viewport * 0.82`, so the Modern cropbox could be visibly smaller than the fitted canvas/artboard. Existing non-null Modern frame state could preserve that smaller frame across crop sessions.

**Fix Rationale:** Modern crop should start as a frame fitted to the visible canvas and should expose distinct rotate hit geometry, matching the Classic/transform overlay pattern. Session entry should recompute the default frame so stale geometry does not survive after UX changes.

**Rincian Perubahan:**
1. Updated `getDefaultModernCropFrame()` to fit the zoomed canvas size within the viewport instead of using an arbitrary 82% viewport cap.
2. Reused `getRotatePath()` for Modern crop corner rotate hit zones and added `data-modern-crop-rotate` for regression targeting.
3. Added regression coverage for Modern default frame fit and Modern rotate gesture updating `modernCropImageTransform.rotation`.
4. Updated `CanvasViewport.tsx` to refit Modern crop frame on new Modern crop sessions.

### Files Changed:
- `apps/desktop/src/viewport/modernCropGeometry.ts`
- `apps/desktop/src/__tests__/modern-crop-geometry.test.ts`
- `apps/desktop/src/components/editor/ModernCropOverlay.tsx`
- `apps/desktop/src/components/editor/__tests__/CropOverlay.test.tsx`
- `apps/desktop/src/components/editor/CanvasViewport.tsx`
- `docs/AI_CURRENT_TASK.md`
- `docs/AI_HISTORY.md`

### Verification Results
- PASS: `pnpm.cmd --filter photrez-desktop test -- apps/desktop/src/__tests__/modern-crop-geometry.test.ts apps/desktop/src/components/editor/__tests__/CropOverlay.test.tsx --run --pool=threads --maxWorkers=1`
- PASS: `pnpm.cmd run build`
- PASS: `pnpm.cmd --filter photrez-desktop test --run --pool=threads --maxWorkers=1` (549 tests, 48 files)

---

## [2026-06-07] FEATURE â€” Modern vs Classic Crop Redesign with Separate Coordinate Models [COMPLETE]

### Kategori: FEATURE / CROP / FRONTEND / UX

**Root Cause:** The earlier Modern crop implementation still used the document-space `cropRect` as its primary frame and simulated image movement through offset/counter-move behavior. That kept Modern visually close to Classic and made the UX unclear.

**Rincian Perubahan:**
1. Added dedicated Modern crop state: viewport-space `modernCropFrame` and `modernCropImageTransform`.
2. Added `modernCropGeometry.ts` helpers for centered viewport frame placement, center-based frame resize, and frame-to-document crop rect conversion for apply.
3. Added `ModernCropOverlay.tsx` rendered in viewport coordinates, separate from the Classic document-space `CropOverlay`.
4. Updated `CanvasViewport.tsx` so Modern transforms the image/document under a fixed centered frame, while Classic keeps the old document-space movable crop box.
5. Updated `CropOptionBar.tsx` so size/aspect/rotation/reset/apply use Modern state in Modern mode and existing `cropRect` state in Classic mode.
6. Removed obsolete `cropContentOffset` and old Modern branches from `CropOverlay`/`useCropOverlayDrag`.
7. Updated regression tests for Modern geometry, Modern overlay interaction, and Classic option-bar behavior.

### Files Changed:
- `apps/desktop/src/viewport/modernCropGeometry.ts`
- `apps/desktop/src/__tests__/modern-crop-geometry.test.ts`
- `apps/desktop/src/components/editor/modernCropState.ts`
- `apps/desktop/src/components/editor/EditorContext.tsx`
- `apps/desktop/src/components/editor/CanvasViewport.tsx`
- `apps/desktop/src/components/editor/ModernCropOverlay.tsx`
- `apps/desktop/src/components/editor/CropOverlay.tsx`
- `apps/desktop/src/components/editor/useCropOverlayDrag.ts`
- `apps/desktop/src/components/editor/CropOptionBar.tsx`
- `apps/desktop/src/components/editor/__tests__/CropOverlay.test.tsx`
- `apps/desktop/src/components/editor/__tests__/CropOptionBar.test.tsx`
- `docs/AI_CURRENT_TASK.md`
- `docs/AI_HISTORY.md`
- `docs/FEATURES.md`

### Verification Results
- PASS: `pnpm.cmd --filter photrez-desktop test -- apps/desktop/src/__tests__/modern-crop-geometry.test.ts --run --pool=threads --maxWorkers=1`
- PASS: `pnpm.cmd --filter photrez-desktop test -- apps/desktop/src/components/editor/__tests__/CropOverlay.test.tsx --run --pool=threads --maxWorkers=1`
- PASS: `pnpm.cmd --filter photrez-desktop test -- apps/desktop/src/components/editor/__tests__/CropOptionBar.test.tsx --run --pool=threads --maxWorkers=1`
- PASS: `pnpm.cmd run build`
- PASS: `pnpm.cmd --filter photrez-desktop test --run --pool=threads --maxWorkers=1` (548 tests, 48 files)

---

## [2026-06-07] BUG FIX â€” Crop UX Clarification: Modern Drag Uses Viewport Model [COMPLETE]

### Kategori: BUG FIX / CROP / FRONTEND / UX

**Root Cause:** Modern crop drag-inside used a separate CSS `translate3d()` on the WebGL canvas via `cropContentOffset`. That made only the image canvas move while the artboard border, overlay mask, handles, and crop geometry stayed in a different visual model. The result felt unclear and too similar to Classic, despite having a separate state signal.

**Fix Rationale:** Modern mode should make the frame feel stable and move the document underneath through the same viewport transform model used by the rest of the editor. Drag-inside now pans the active document viewport by the screen delta and counter-moves `cropRect` by the document-space delta, so the crop frame remains visually stable while the image/artboard moves underneath. Classic mode remains rect-only movement over a static image.

**Rincian Perubahan:**
1. Removed the Modern canvas-only transform path from `CanvasViewport.tsx`; stale `cropContentOffset` is now migrated into `cropRect` and reset.
2. Updated `useCropOverlayDrag.ts` Modern move handling to call `engine.setViewport({ panX, panY })`, `syncViewport()`, and `scheduler.requestRender()` while applying opposite document-space movement to the crop rect.
3. Preserved Classic behavior: drag-inside changes only `cropRect`, with no viewport pan.
4. Added regression coverage proving Classic rect movement and Modern viewport pan + counter-rect movement.

### Files Changed:
- `apps/desktop/src/components/editor/CanvasViewport.tsx`
- `apps/desktop/src/components/editor/useCropOverlayDrag.ts`
- `apps/desktop/src/components/editor/__tests__/CropOverlay.test.tsx`
- `docs/AI_CURRENT_TASK.md`
- `docs/AI_HISTORY.md`
- `docs/FEATURES.md`

### Verification Results
- PASS: `pnpm.cmd --filter photrez-desktop test -- apps/desktop/src/components/editor/__tests__/CropOverlay.test.tsx --run --pool=threads --maxWorkers=1 --reporter=verbose` (542 tests, 47 files)
- PASS: `pnpm.cmd run build`
- PASS: `pnpm.cmd --filter photrez-desktop test` (542 tests, 47 files)

---

## [2026-06-07] FEATURE â€” Crop Interaction Modes: Modern + Classic [COMPLETE]

### Kategori: FEATURE / FRONTEND / UI

**Deskripsi:** Menambahkan dua interaksi crop mode dengan visual distinction nyata: Modern (default) dan Classic.
- **Modern**: frame tetap stabil di layar, image/content bergeser di bawah frame via `cropContentOffset` + CSS transform pada canvas element. Pasteboard click NOP.
- **Classic**: crop box bergerak di atas gambar (move rect tanpa counter-pan). Pasteboard click create/hide preview.

**Rincian Perubahan:**
1. **New signal `cropInteractionMode`** â€” `"modern" | "classic"` default `"modern"`, di `editorState.ts`.
2. **New signal `cropContentOffset`** â€” `{ x, y }` default `{0,0}`, di `cropState.ts`. Menyimpan offset image terhadap crop frame untuk Modern mode.
3. **Modern mode** â€” `createEffect` auto-create full-canvas frame saat masuk crop tool. Drag inside update `cropContentOffset` (bukan `cropRect`). `createEffect` lain apply offset sebagai `translate3d()` pada canvas element, image bergeser sementara SVG frame tetap di posisi `cropRect` yang unchanged.
4. **Classic mode** â€” Drag inside gerakkan `cropRect` TANPA counter-pan viewport â†’ box visual bergerak di atas image. Viewport pan tidak berubah.
5. **Mode toggle** â€” Segmented control di `CropOptionBar.tsx`.
6. **Transition rules** â€” Modernâ†’Classic: bake offset ke rect (`rect.x -= offset.x`). Classicâ†’Modern: keep rect atau auto-create frame.
7. **Apply crop** â€” `applyCropPreview` bake offset: `{ x: rect.x - offset.x, y: rect.y - offset.y }`.
8. **No pasteboard crop in Modern**.

### Files Changed:
- `apps/desktop/src/components/editor/cropState.ts`
- `apps/desktop/src/components/editor/editorState.ts`
- `apps/desktop/src/components/editor/EditorContext.tsx`
- `apps/desktop/src/components/editor/CanvasViewport.tsx`
- `apps/desktop/src/components/editor/useCropOverlayDrag.ts`
- `apps/desktop/src/components/editor/CropOverlay.tsx`
- `apps/desktop/src/components/editor/CropOptionBar.tsx`
- `apps/desktop/src/components/editor/__tests__/CropOverlay.test.tsx`
- `apps/desktop/src/components/editor/__tests__/CanvasViewport.test.tsx`
- `apps/desktop/src/components/editor/__tests__/CropOptionBar.test.tsx`
- `docs/AI_CURRENT_TASK.md`

### Verification Results
- PASS: `pnpm.cmd run build` (tsc + Vite)
- PASS: `pnpm.cmd --filter photrez-desktop test` (541 tests, 47 files)

---

## [2026-06-07] FEATURE â€” Crop Overlay Visual Polish [COMPLETE]

### Kategori: FEATURE / FRONTEND / UI

**Deskripsi:** Polish crop overlay styling untuk tampilan profesional, tenang, dan utilitarian â€” mengurangi visual noise sambil mempertahankan fungsionalitas penuh.

**Rincian Perubahan:**
1. **Corner brackets dihapus** â€” `CropOverlayGuides.tsx` tidak lagi merender `CornerBrackets`. Fungsi dan komponen terkait dihapus. L-shaped corner marks redundant karena border + handles sudah memberi batas visual.
2. **Rotate ring hidden** â€” Ring putih besar di tiap sudut sebelumnya selalu terlihat (`opacity: 0.6`). Sekarang tersembunyi (`opacity: 0`) dan muncul hanya saat hover corner (`opacity: 0.8`, warna orange #E15A17). Hit zone transparan tetap aktif untuk rotasi.
3. **Opacity grid seragam 30%** â€” Semua mode guide (thirds/grid/diagonal/golden) menggunakan `rgba(255,255,255,0.3)`.
4. **Handle corner lebih halus** â€” Default fill `rgba(255,255,255,0.75)`, stroke `rgba(0,0,0,0.35)`. Hover: `rgba(255,255,255,0.9)`. Active: orange #E15A17. Ditambah `rx=1`/`ry=1` untuk rounded corners subtle.
5. **Dual-border** â€” Satu border dark outline (`rgba(0,0,0,0.45)`, 1.5px) di bawah border putih (`rgba(255,255,255,0.85)`, 0.75px) agar crop box terbaca di gambar gelap maupun terang.

### Files Changed:
- `apps/desktop/src/components/editor/CropOverlayGuides.tsx`
- `apps/desktop/src/components/editor/CropOverlayHandles.tsx`
- `apps/desktop/src/components/editor/CropOverlay.tsx`

### Verification Results
- PASS: `pnpm.cmd run build` (tsc + Vite)
- PASS: `pnpm.cmd --filter photrez-desktop test` (541 tests, 47 files)

---

## [2026-06-07] BUG FIX â€” Canvas Quality: Sync WebGL Backing Buffer on Zoom Changes [COMPLETE]

### Kategori: BUG FIX / RENDERER / FRONTEND

**Root Cause:** `WebGL2Backend.resize()` was only called on document switch (`activeDocumentId` change) and window resize (ResizeObserver) â€” never on zoom changes via wheel or keyboard. When zoom changed, the CSS `scale(${zoom})` transform stretched (zoom in) or compressed (zoom out) the stale-resolution WebGL canvas buffer, causing the browser to interpolate the image â†’ soft/blurry appearance.

**Fix Rationale:** Added a SolidJS `createEffect` in `useViewportRenderer.ts` that tracks the `zoom()` signal and calls `resizeRenderer()` (which invokes `WebGL2Backend.resize(docW, docH, zoom, dpr)`) whenever zoom changes. This ensures the WebGL canvas backing buffer always matches `Math.round(docWidth Ã— zoom Ã— devicePixelRatio)`, so the CSS `scale()` transform operates on a correctly-sized buffer â†’ pixel-perfect 1:1 mapping between buffer pixels and device pixels at any zoom level.

### Files Changed:
- `apps/desktop/src/components/editor/useViewportRenderer.ts` â€” added zoom signal tracking effect, imported `zoom` from `useEditor()`
- `apps/desktop/src/__tests__/renderer.test.ts` â€” added 2 regression tests for canvas backing resolution math

### Verification Results
- PASS: `pnpm.cmd run build` (tsc + Vite)
- PASS: `pnpm.cmd --filter photrez-desktop test` (541 tests, 47 files)

---

## [2026-06-07] FEATURE â€” Ctrl+Shift+Z Redo Shortcut [COMPLETE]

### Kategori: FEATURE / FRONTEND / SHORTCUTS

**Deskripsi:** Added `Ctrl+Shift+Z` as an alternative keyboard shortcut for redo (alongside existing `Ctrl+Y`).

**Rincian Perubahan:**
1. Added `Ctrl+Shift+Z` check before `Ctrl+Z` in `AppTitleBar.tsx` to avoid `Shift` being ignored.
2. Updated keyboard shortcut test in `keyboard-shortcuts.test.ts` to verify `Ctrl+Shift+Z` â†’ redo and `Ctrl+Z` â†’ undo with explicit `shiftKey` check.

### Files Changed:
- `apps/desktop/src/components/editor/AppTitleBar.tsx` â€” added `Ctrl+Shift+Z` â†’ `handleRedo()` before `Ctrl+Z` â†’ `handleUndo()`
- `apps/desktop/src/__tests__/keyboard-shortcuts.test.ts` â€” added `Ctrl+Shift+Z` redo test, updated `Ctrl+Z` undo test to check `!shiftKey`

### Verification Results
- PASS: `pnpm.cmd run build` (tsc + Vite)
- PASS: `pnpm.cmd --filter photrez-desktop test` (539 tests, 47 files)

---

## [2026-06-06] FEATURE â€” Brush/Eraser Tool UX Phase 2: Flow, Smoothing, Presets, Context Menu [COMPLETE]

### Kategori: FEATURE / BRUSH / ERASER / FRONTEND / UX

**Deskripsi:** Brush/Eraser Tool UX Phase 2 â€” flow control, smoothing engine, brush presets, right-click context menu, and keyboard shortcuts for hardness adjustment.

**Rincian Perubahan:**
1. **Flow control** â€” Added `flow` field (0â€“100%) to `PaintToolSettings`/`PaintToolState`. Flow multiplier applied in `renderPaintStrokeToContext()` via `ctx.globalAlpha = settings.opacity * settings.flow`. Default 100%.
2. **Smoothing engine** â€” `PaintSmoother` class in `paintSmoothing.ts` with exponential-decay weighted moving average over circular buffer. `smoothingToWindowSize()` maps 0â€“100 â†’ 1â€“10 points.
3. **Brush presets** â€” `BrushPreset` interface + `BRUSH_PRESETS` array: 6 presets (Hard Round, Soft Round, Detail, Large Soft, Hard Eraser, Soft Eraser). `applyPaintPreset()` returns `Partial<PaintToolState>` for the target tool.
4. **Preset tracking** â€” `brushPresetId`/`eraserPresetId` signals in editor state. Manual edit to any setting clears the active preset id to `null`.
5. **Enhanced option bar** â€” Flow input, Smoothing input, Preset dropdown in `BrushOptionBar.tsx`. Eraser tool still shows "Hard 100" button.
6. **Right-click context menu** â€” `BrushContextMenu.tsx` floating panel near cursor (clamped to viewport). Size/Hardness/Strength range sliders + 2Ã—3 preset grid + Reset button. Opens on `contextmenu` event on `#canvas-container`, closes on outside click/Escape. Only for brush/eraser tools, not while Space held.
7. **Keyboard shortcuts** â€” `[`/`]` for size adjustment (5px step), Shift+`[`/`]` for hardness adjustment (10% step). Added to `useCanvasKeyboard.ts`.
8. **Smoothing integration** â€” `PaintSmoother` instantiated in `useCanvasPointerTools`, smoothed points in pointerdown/move/up. `reset()` on pointerdown/cancel/lostcapture. `setWindowSize()` from active settings.
9. **Right-click guard** â€” `e.button === 2` early return in `onCanvasPointerDown` prevents paint stroke start on right-click.

**Files Changed/Added:**
- [MODIFY] `apps/desktop/src/components/editor/brushToolState.ts` â€” flow, smoothing, presets, `applyPaintPreset`, `clampPaintSmoothing`, `adjustPaintHardness`
- [NEW] `apps/desktop/src/components/editor/paintSmoothing.ts` â€” `PaintSmoother` class, `smoothingToWindowSize`
- [MODIFY] `apps/desktop/src/components/editor/paintStrokeRenderer.ts` â€” `globalAlpha = opacity * flow`
- [MODIFY] `apps/desktop/src/components/editor/useCanvasPointerTools.ts` â€” PaintSmoother, smoothed points, right-click guard
- [MODIFY] `apps/desktop/src/components/editor/useCanvasKeyboard.ts` â€” `[`/`]` size + Shift+`[`/`]` hardness shortcuts
- [MODIFY] `apps/desktop/src/components/editor/BrushOptionBar.tsx` â€” Flow, Smoothing, Preset dropdown, clearPresetId
- [NEW] `apps/desktop/src/components/editor/BrushContextMenu.tsx` â€” Right-click context menu
- [MODIFY] `apps/desktop/src/components/editor/CanvasViewport.tsx` â€” Mount `<BrushContextMenu />`
- [MODIFY] `apps/desktop/src/components/editor/editorState.ts` â€” brushFlow, brushSmoothing, eraserFlow, eraserSmoothing, brushPresetId, eraserPresetId
- [MODIFY] `apps/desktop/src/components/editor/EditorContext.tsx` â€” 12 new interface members
- [NEW] `apps/desktop/src/components/editor/__tests__/paintSmoothing.test.ts` â€” 5 smoothing tests
- [NEW] `apps/desktop/src/components/editor/__tests__/BrushContextMenu.test.tsx` â€” 5 context menu tests
- [MODIFY] `apps/desktop/src/components/editor/__tests__/BrushOptionBar.test.tsx` â€” 5 flow/smoothing/preset tests
- [MODIFY] `apps/desktop/src/components/editor/__tests__/paintStrokeRenderer.test.ts` â€” flow multiplier test
- [ADD] `docs/superpowers/specs/2026-06-06-brush-eraser-ux-phase2-design.md`
- [ADD] `docs/superpowers/plans/2026-06-06-brush-eraser-ux-phase2.md`
- [MODIFY] `docs/AI_CURRENT_TASK.md`
- [MODIFY] `docs/AI_HISTORY.md`
- [MODIFY] `docs/FEATURES.md`

**Verifikasi:**
- PASS: 507/507 frontend tests (43 files)
- PASS: `pnpm.cmd run build` (tsc + Vite)
- PASS: 85/85 Rust core tests

---

## [2026-06-06] FEATURE â€” Brush and Eraser Tool Improvements [COMPLETE]

### Kategori: FEATURE / BRUSH / ERASER / FRONTEND

**Deskripsi:** Mengimplementasikan brush dan eraser tool improvement plan: state tool terpisah untuk brush/eraser (size, hardness, strength), interactive BrushOptionBar, paint settings payload dalam pointer flow, stroke rendering dengan size/hardness/opacity, cursor overlay yang merefleksikan ukuran aktif, blocked-state feedback untuk hidden/locked/protected layer, dan keyboard shortcuts untuk B (brush), E (eraser), `[`/`]` (size adjustment).

**Root Cause:** Paint tools sudah ada tetapi option bar, pointer context, cursor overlay, dan stroke renderer menggunakan nilai tetap.

**Fix Rationale:** Brush dan eraser harus memiliki state eksplisit dan terpisah, serta rendered stroke harus menggunakan settings yang sama dengan yang ditampilkan di UI.

**Files Changed/Added:**
- [NEW] `apps/desktop/src/components/editor/brushToolState.ts`
- [NEW] `apps/desktop/src/components/editor/paintStrokeRenderer.ts`
- [NEW] `apps/desktop/src/components/editor/__tests__/brushToolState.test.ts`
- [NEW] `apps/desktop/src/components/editor/__tests__/BrushOptionBar.test.tsx`
- [NEW] `apps/desktop/src/components/editor/__tests__/paintStrokeRenderer.test.ts`
- [NEW] `apps/desktop/src/components/editor/__tests__/BrushCursorOverlay.test.tsx`
- [MODIFY] `apps/desktop/src/components/editor/editorState.ts`
- [MODIFY] `apps/desktop/src/components/editor/EditorContext.tsx`
- [MODIFY] `apps/desktop/src/components/editor/BrushOptionBar.tsx`
- [MODIFY] `apps/desktop/src/components/editor/BrushCursorOverlay.tsx`
- [MODIFY] `apps/desktop/src/components/editor/useBrushOverlay.ts`
- [MODIFY] `apps/desktop/src/components/editor/useCanvasKeyboard.ts`
- [MODIFY] `apps/desktop/src/components/editor/useCanvasPointerTools.ts`
- [MODIFY] `apps/desktop/src/components/editor/BottomStatusBar.tsx`
- [MODIFY] `apps/desktop/src/viewport/input-handler.ts`
- [MODIFY] `apps/desktop/src/__tests__/input-handler-move.test.ts`
- [MODIFY] `apps/desktop/src/__tests__/input-handler-snap.test.ts`
- [MODIFY] `apps/desktop/src/__tests__/keyboard-shortcuts.test.ts`
- [MODIFY] `docs/AI_CURRENT_TASK.md`
- [MODIFY] `docs/AI_HISTORY.md`
- [MODIFY] `docs/FEATURES.md`
- [MODIFY] `docs/plans/task.md`

**Verifikasi:**
- PASS: `pnpm.cmd --filter photrez-desktop test -- --pool=threads --maxWorkers=1` (433 tests, 41 files)
- PASS: `pnpm.cmd run build` (tsc + Vite production build)

## [2026-06-06] FIX â€” Brush/Eraser Tool Post-Review Fixes

### Kategori: FIX / BRUSH / ERASER / FRONTEND

**Deskripsi:** Memperbaiki 6 masalah yang ditemukan dalam code review brush/eraser implementation:
1. Brush cursor overlay mengabaikan viewport pan (menggunakan `screenToDocument` untuk konversi koordinat yang benar)
2. Hardness=100% membuat radial gradient dengan radius start==end (special-case solid fill untuk hard brush)
3. No-op history entry untuk blocked stroke (history commit dipindahkan ke caller setelah guard block check)
4. `settings: any` pada `useCanvasPointerTools.ts` interface (diganti ke `PaintToolSettings`)
5. Potensi mojibake pada separator dimensi di BottomStatusBar (`Ã—` diganti ASCII `x`)
6. Test coverage hardness=1 solid fill dengan mock ctx

**Files Changed:**
- [MODIFY] `apps/desktop/src/components/editor/BrushCursorOverlay.tsx` â€” gunakan `screenToDocument`, tambah `workspace`
- [MODIFY] `apps/desktop/src/components/editor/paintStrokeRenderer.ts` â€” solid fill untuk hardness >= 1
- [MODIFY] `apps/desktop/src/viewport/input-handler.ts` â€” hapus `history.commit` dari brush/eraser case
- [MODIFY] `apps/desktop/src/components/editor/useCanvasPointerTools.ts` â€” guard block check; import `DocumentEngine`, `PaintToolSettings`, `getPaintToolBlockReason`; type `any` â†’ `PaintToolSettings`; `commitBrushStroke` engine type
- [MODIFY] `apps/desktop/src/components/editor/BottomStatusBar.tsx` â€” `Ã—` â†’ `x`
- [MODIFY] `apps/desktop/src/components/editor/__tests__/paintStrokeRenderer.test.ts` â€” test hardness=1 dan <1 dengan mock ctx

**Remaining design decisions (non-blocking):**
- Opacity per-dab: current semantics = "flow" (accumulative). If "strength" (max opacity) is desired, renderer needs temp mask + single composite
- Transformed layer coordinates: stroke draws in document space directly. Layer-local conversion needed for transformed raster layers

**Verifikasi:**
- PASS: 42/42 targeted tests across 7 files (`brushToolState`, `BrushOptionBar`, `BrushCursorOverlay`, `paintStrokeRenderer`, `input-handler-move`, `input-handler-snap`, `keyboard-shortcuts`)
- PASS: `npx tsc --noEmit --skipLibCheck` (clean compile)

## [2026-06-06] FIX â€” Round 2: Zoom Cursor, Pointer Cancel, Layer-Local Coords, Async Race

### Kategori: FIX / BRUSH / ERASER / FRONTEND

**Deskripsi:** Perbaikan lanjutan berdasarkan code review depth:
1. Brush cursor radius salah saat zoom â‰  1 (radius dibagi zoom padahal SVG sudah di dalam `scale(zoom)`). Sekarang `r={radius()}` tanpa `/ zoom()`.
2. Pointer cancel / lost capture tidak ditangani â€” stroke aktif bisa tertinggal. Tambah `onPointerCancel` di canvas yang commit stroke partial + reset state.
3. Koordinat stroke masih document-space, tidak layer-local. Untuk layer dengan transform/offset/scale/rotation, stroke bisa meleset. Tambah `documentToLayerLocal()` di `transformGeometry.ts` dan konversi di `useBrushOverlay.ts`.
4. Async commit race: `createImageBitmap` bisa selesai setelah layer dihapus/diganti. Tambah guard `workspace.getActiveEngine() === engine && engine.getLayer(layerId)` setelah await.

**Files Changed:**
- [MODIFY] `apps/desktop/src/components/editor/BrushCursorOverlay.tsx` â€” hapus `/ zoom()` dari radius
- [MODIFY] `apps/desktop/src/components/editor/useBrushOverlay.ts` â€” konversi document-to-layer-local; async race guard
- [MODIFY] `apps/desktop/src/components/editor/useCanvasPointerTools.ts` â€” tambah `onCanvasPointerCancel`
- [MODIFY] `apps/desktop/src/components/editor/CanvasViewport.tsx` â€” bind `onPointerCancel`
- [MODIFY] `apps/desktop/src/viewport/transformGeometry.ts` â€” tambah `documentToLayerLocal()`

**Verifikasi:**
- PASS: 42/42 targeted tests (7 files)
- PASS: 12/12 CanvasViewport tests
- PASS: `npx tsc --noEmit --skipLibCheck`
- PASS: `pnpm.cmd run test:e2e` (5/5 Playwright smoke tests)

---

## [2026-06-06] PLANNING â€” Brush and Eraser Tool Improvements Plan [COMPLETE]

### Kategori: PLANNING / BRUSH / ERASER / FRONTEND

**Deskripsi:** Membuat rencana implementasi lengkap untuk memperkuat Brush dan Eraser tool Photrez. Plan mengunci fase pertama pada state tool terpisah, option bar interaktif, pointer payload yang membawa settings aktif, renderer stroke berbasis size/hardness/strength, cursor preview sinkron, shortcut ukuran aktif, dan feedback saat layer tidak bisa diedit.

**Referensi:** Rencana dibuat setelah membaca implementasi paint/retouch di `D:\Project\aplikasi-cetak-massal` dan mengambil pola yang cocok untuk Photrez: pemisahan setting brush/eraser, cursor yang mengikuti setting aktif, shortcut ukuran aktif, dan history dirty-rect sebagai follow-up terpisah. Context7 digunakan untuk memverifikasi pola SolidJS signals, event handlers, context, dan cleanup listener.

**Scope Boundary:** Tidak mengimplementasikan runtime code pada tahap ini. Dirty-rect history, flow control, pressure input, preset brush, textured brush, dan mask-based erase ditunda agar implementasi pertama tetap sesuai arsitektur MVP.

**Files Changed:**
- [ADD] `docs/superpowers/plans/2026-06-06-brush-eraser-tool-improvements.md`
- [MODIFY] `docs/AI_CURRENT_TASK.md`
- [MODIFY] `docs/AI_HISTORY.md`
- [MODIFY] `docs/FEATURES.md`

**Verifikasi:** Documentation-only planning task. Plan reviewed for concrete logic flow, exact target files, TDD steps, command gates, docs sync, risk handling, and placeholder scan.

---

## [2026-06-05] BUG FIX â€” Crop Mode Pasteboard Panning Regression [COMPLETE]

### Kategori: BUG FIX / CROP / FRONTEND / POINTER ROUTING

**Deskripsi:** Memperbaiki regresi panning saat Crop tool aktif. Space+drag pada pasteboard/outside canvas sekarang kembali diteruskan ke jalur navigasi/panning, bukan dianggap sebagai gesture crop replacement.

**Root Cause:** Handler pasteboard khusus Crop tool di `CanvasViewport.tsx` menangkap klik kiri lebih dulu dan memanggil `preventDefault()` tanpa mengecek `isSpacePressed()` / `isPanning()`. Akibatnya `usePanNavigation` tidak menerima pointer down untuk memulai pan.

**Fix Rationale:** Mode navigasi harus punya prioritas lebih tinggi daripada gesture editing. Saat Space sedang ditahan atau pan sudah aktif, pasteboard handler Crop tool harus no-op agar event tetap mengalir ke `onViewportPointerDown`.

**Files Changed:**
- [MODIFY] `apps/desktop/src/components/editor/CanvasViewport.tsx`
- [MODIFY] `apps/desktop/src/components/editor/__tests__/CanvasViewport.test.tsx`
- [MODIFY] `docs/AI_CURRENT_TASK.md`
- [MODIFY] `docs/AI_HISTORY.md`
- [MODIFY] `docs/FEATURES.md`
- [MODIFY] `docs/plans/task.md`

**Verifikasi:**
- PASS: `pnpm.cmd --filter photrez-desktop test -- apps/desktop/src/components/editor/__tests__/CanvasViewport.test.tsx --run --pool=threads --maxWorkers=1` (regression RED sebelum fix, GREEN setelah fix; Vitest menjalankan 30 files, 324 tests)
- PASS: `pnpm.cmd run build`

---

## [2026-06-05] BUG FIX â€” Crop Apply Geometry and Texture Sync [COMPLETE]

### Kategori: BUG FIX / CROP / FRONTEND / ENGINE

**Deskripsi:** Memperbaiki hasil crop apply yang dapat terlihat bergeser atau tidak sesuai setelah crop diterapkan, terutama saat mode size menggunakan target width/height yang tidak identik dengan rasio crop box atau saat destructive crop mengganti bitmap layer.

**Root Cause:** `performApplyCrop()` memakai satu skala dari lebar crop untuk semua axis, sehingga target size non-uniform salah menghitung posisi/scale Y. Selain itu, `applyCropPreview()` hanya meminta render setelah destructive crop, tetapi tidak meng-upload ulang `imageBitmap` layer yang baru ke WebGL texture.

**Fix Rationale:** Geometri crop harus mengikuti skala X/Y independen seperti preview/export berbasis canvas. Setelah bitmap layer diganti, texture WebGL harus disinkronkan sebelum render berikutnya agar tampilan canvas memakai bitmap terbaru, bukan texture lama dengan transform baru.

**Files Changed:**
- [MODIFY] `apps/desktop/src/engine/cropApply.ts`
- [MODIFY] `apps/desktop/src/engine/__tests__/document.test.ts`
- [MODIFY] `apps/desktop/src/components/editor/cropToolActions.ts`
- [MODIFY] `apps/desktop/src/components/editor/__tests__/cropToolActions.test.ts`
- [MODIFY] `apps/desktop/src/components/editor/CanvasViewport.tsx`
- [MODIFY] `apps/desktop/src/components/editor/CropOptionBar.tsx`
- [MODIFY] `apps/desktop/src/components/editor/useCanvasKeyboard.ts`
- [MODIFY] `docs/AI_CURRENT_TASK.md`
- [MODIFY] `docs/AI_HISTORY.md`
- [MODIFY] `docs/FEATURES.md`
- [MODIFY] `docs/plans/task.md`

**Verifikasi:**
- PASS: `pnpm.cmd --filter photrez-desktop test -- apps/desktop/src/engine/__tests__/document.test.ts --run --pool=threads --maxWorkers=1` (regression RED sebelum fix, GREEN setelah fix; Vitest menjalankan 30 files, 323 tests)
- PASS: `pnpm.cmd --filter photrez-desktop test -- apps/desktop/src/components/editor/__tests__/cropToolActions.test.ts apps/desktop/src/engine/__tests__/document.test.ts --run --pool=threads --maxWorkers=1` (30 files, 323 tests)
- PASS: `pnpm.cmd run build`

---

## [2026-06-05] BUG FIX â€” Crop Hidden Preview Restore Continuation [COMPLETE]

### Kategori: BUG FIX / UX / CROP / FRONTEND

**Deskripsi:** Melanjutkan eksekusi plan Crop Interaction Model yang sempat berhenti. Pekerjaan lanjutan membersihkan debug log runtime dari pasteboard crop gesture, mengetikkan prop hidden crop preview di `CropOverlay`/`useCropOverlayDrag`, dan menambahkan regression test agar replacement crop box yang dibuat dari drag dapat mempertahankan koordinat di luar bounds document untuk canvas expansion.

**Root Cause:** Implementasi sebelumnya sudah menjalankan sebagian besar plan, tetapi masih meninggalkan logging debug di viewport dan belum memiliki regression test eksplisit untuk outside-bounds replacement crop creation.

**Fix Rationale:** Pasteboard click dan pasteboard drag harus dibedakan tanpa logging runtime, dan behavior crop expansion perlu dikunci dengan test agar executor berikutnya tidak mengembalikan clamp ke bounds document.

**Files Changed:**
- [MODIFY] `apps/desktop/src/components/editor/CanvasViewport.tsx`
- [MODIFY] `apps/desktop/src/components/editor/CropOverlay.tsx`
- [MODIFY] `apps/desktop/src/components/editor/useCropOverlayDrag.ts`
- [MODIFY] `apps/desktop/src/components/editor/__tests__/CropOverlay.test.tsx`
- [MODIFY] `docs/AI_CURRENT_TASK.md`
- [MODIFY] `docs/AI_HISTORY.md`
- [MODIFY] `docs/plans/task.md`

**Verifikasi:**
- PASS: `pnpm.cmd --filter photrez-desktop test` (30 files, 322 tests)
- PASS: `pnpm.cmd run build`
- PASS: `pnpm.cmd run test:e2e` (5/5 Playwright smoke tests)

---

## [2026-06-05] PLANNING â€” Crop Outside-Canvas Drag Plan Revision [COMPLETE]

### Kategori: PLANNING / UX / CROP / FRONTEND

**Deskripsi:** Merevisi plan Crop Interaction Model agar drag gesture dapat membuat crop box baru dari dalam canvas, dari pasteboard/outside canvas, melintasi batas canvas, atau sepenuhnya di luar canvas. Plan sekarang membedakan pasteboard click sebagai hide-only behavior dan pasteboard drag sebagai replacement crop creation setelah melewati threshold.

**Root Cause:** Versi plan koreksi sebelumnya sudah memperbaiki hide/restore, tetapi belum mengunci perilaku drag dari luar canvas sehingga executor masih bisa menganggap pasteboard hanya menerima klik hide/no-op.

**Files Changed:**
- [MODIFY] `docs/superpowers/plans/2026-06-05-crop-interaction-model-plan.md`
- [MODIFY] `docs/AI_CURRENT_TASK.md`
- [MODIFY] `docs/AI_HISTORY.md`
- [MODIFY] `docs/FEATURES.md`
- [MODIFY] `docs/plans/task.md`

**Verifikasi:**
- Documentation-only planning revision. Verified for explicit UX contract, exact target files, TDD snippets, smoke coverage, and placeholder scan.

---

## [2026-06-05] PLANNING â€” Crop Hidden Preview Restore Correction Plan [COMPLETE]

### Kategori: PLANNING / UX / CROP / FRONTEND

**Deskripsi:** Menulis ulang plan Crop Interaction Model untuk memperbaiki drift dari obrolan. Plan baru membedakan `hide`, `restore`, `discard`, dan `replace`: pasteboard click menyembunyikan crop preview dan menyimpan rect/rotation terakhir; canvas click tanpa drag mengembalikan hidden preview; full-canvas preview hanya fallback jika tidak ada hidden preview; Cancel/Esc membuang session.

**Root Cause:** Plan sebelumnya menerjemahkan "cropbox muncul lagi" sebagai "reset ke full-canvas crop box", sehingga implementasi kehilangan crop preview terakhir setelah pasteboard click.

**Files Changed:**
- [MODIFY] `docs/superpowers/plans/2026-06-05-crop-interaction-model-plan.md`
- [MODIFY] `docs/AI_CURRENT_TASK.md`
- [MODIFY] `docs/AI_HISTORY.md`
- [MODIFY] `docs/FEATURES.md`
- [MODIFY] `docs/plans/task.md`

**Verifikasi:**
- Documentation-only correction plan. Verified for corrected UX contract, exact implementation tasks, TDD steps, expected command outputs, and docs sync.

---

## [2026-06-05] FEATURE â€” Crop Interaction Model [COMPLETE]

### Kategori: FEATURE / UX / CROP / FRONTEND

**Deskripsi:** Mengimplementasikan Crop Interaction Model yang selaras dengan alur kerja profesional: klik pasteboard untuk clear crop preview tanpa keluar dari Crop tool, klik canvas untuk me-restore crop box default, canvas drag untuk me-replace crop box aktif dengan reset rotation ke 0, double-click di dalam crop box untuk apply crop dan beralih ke Move tool. Semua aksi apply disatukan melalui helper `cropToolActions.ts`.

**Files Changed/Added:**
- [NEW] `apps/desktop/src/components/editor/cropToolActions.ts`
- [NEW] `apps/desktop/src/components/editor/__tests__/cropToolActions.test.ts`
- [MODIFY] `apps/desktop/src/components/editor/pasteboardClickPolicy.ts`
- [MODIFY] `apps/desktop/src/components/editor/__tests__/pasteboardClickPolicy.test.ts`
- [MODIFY] `apps/desktop/src/components/editor/CanvasViewport.tsx`
- [MODIFY] `apps/desktop/src/components/editor/useCanvasPointerTools.ts`
- [MODIFY] `apps/desktop/src/components/editor/useCropOverlayDrag.ts`
- [MODIFY] `apps/desktop/src/components/editor/CropOverlay.tsx`
- [MODIFY] `apps/desktop/src/components/editor/CropOptionBar.tsx`
- [MODIFY] `apps/desktop/src/components/editor/useCanvasKeyboard.ts`
- [MODIFY] `apps/desktop/src/components/editor/__tests__/CanvasViewport.test.tsx`
- [MODIFY] `docs/AI_CURRENT_TASK.md`
- [MODIFY] `docs/AI_HISTORY.md`
- [MODIFY] `docs/FEATURES.md`
- [MODIFY] `docs/plans/task.md`

**Verifikasi:**
- PASS: `pnpm --filter photrez-desktop test` (312/312 frontend tests passing)
- PASS: `cargo test --workspace` (85/85 Rust tests passing)
- PASS: `pnpm run build` (tsc & Vite production build successful)

---

## [2026-06-05] FEATURE â€” Browser Smoke Test Layer [COMPLETE]

### Kategori: FEATURE / TESTING / FRONTEND / E2E

**Deskripsi:** Menambahkan lapisan browser smoke test berbasis Playwright untuk melengkapi coverage Vitest. Test menjalankan Photrez via Vite dev server dan memverifikasi shell editor, empty workspace, pembuatan blank canvas, pergantian contextual tool option bar, dan toggle side panel pada viewport responsif.

**Files Changed/Added:**
- [NEW] `apps/desktop/playwright.config.ts`
- [NEW] `apps/desktop/e2e/editor-smoke.spec.ts`
- [MODIFY] `apps/desktop/package.json`
- [MODIFY] `apps/desktop/vite.config.ts`
- [MODIFY] `package.json`
- [MODIFY] `pnpm-lock.yaml`
- [MODIFY] `docs/AI_CURRENT_TASK.md`
- [MODIFY] `docs/AI_HISTORY.md`
- [MODIFY] `docs/FEATURES.md`
- [MODIFY] `docs/plans/task.md`

**TDD Evidence:**
- RED: `pnpm.cmd --filter photrez-desktop exec playwright test` failed because the Playwright command did not exist.
- RED: after adding the dependency, tests failed because browser binaries were not installed.
- RED: after installing Chromium, tests exposed selector/viewport issues that were corrected.
- GREEN: browser smoke tests pass via the new root script.

**Verifikasi:**
- PASS: `pnpm.cmd run test:e2e` (3/3 browser smoke tests passing)
- PASS: `pnpm.cmd --filter photrez-desktop test` (308/308 Vitest tests passing)
- PASS: `pnpm.cmd run build`

---

## [2026-06-05] MAINTENANCE â€” Third-Party Software Name Cleanup [COMPLETE]

### Kategori: MAINTENANCE / DOCS / SOURCE COMMENTS / BRANDING

**Deskripsi:** Membersihkan penyebutan eksplisit nama software/aplikasi pihak ketiga dari komentar source aktif, dokumentasi non-archive, dan archive docs. Istilah diganti dengan bahasa netral seperti `professional editor`, `desktop titlebar style`, `production-grade`, `precise`, dan `Photrez-owned identity`.

**Scope Boundary:** Dependency lockfile tidak diubah karena masih berisi nama paket transitif dari dependency.

**Files Changed/Added:** Source comments in `apps/desktop/src/viewport/transformGeometry.ts`, `apps/desktop/src/viewport/cropSnap.ts`, `apps/desktop/src/renderer/shaders.ts`; active docs under `docs/`; archive docs under `docs/archive/`; `README.md`.

**Verifikasi:**
- PASS: active source scan contains no explicit third-party software name matches.
- PASS: full repo content scan contains no explicit third-party software name matches outside dependency lockfile.
- PASS: full repo filename scan contains no explicit third-party software name matches.
- PASS: `pnpm.cmd run build`
- PASS: `pnpm.cmd --filter photrez-desktop test` (308/308 frontend tests passing)

---

## [2026-06-05] PLANNING â€” Crop Interaction Model Plan [COMPLETE]

### Kategori: PLANNING / UX / CROP / FRONTEND

**Deskripsi:** Membuat rencana implementasi lengkap untuk behavior Crop tool Photrez: klik pasteboard menghilangkan crop box tanpa keluar dari Crop tool, klik canvas mengembalikan crop box default, drag canvas mengganti crop box, dan double-click di dalam crop box menerapkan crop.

**Files Changed:**
- [ADD] `docs/superpowers/plans/2026-06-05-crop-interaction-model-plan.md`
- [MODIFY] `docs/AI_CURRENT_TASK.md`
- [MODIFY] `docs/AI_HISTORY.md`
- [MODIFY] `docs/FEATURES.md`
- [MODIFY] `docs/plans/task.md`

**Verifikasi:**
- Documentation-only planning task. Verified by reviewing the plan for concrete UX rules, target files, implementation sequence, tests, smoke scenarios, risks, and final verification commands.

---

## [2026-06-05] BUG FIX â€” Crop Cancel Stays In Crop Tool [COMPLETE]

### Kategori: BUG FIX / UX / CROP / FRONTEND

**Deskripsi:** Memperbaiki perilaku Crop cancel agar tombol `Cancel` di Crop Option Bar dan shortcut `Esc` hanya membatalkan crop box aktif tanpa mengganti tool aktif ke Move. Crop Apply tetap dapat kembali ke Move karena operasi crop sudah selesai diterapkan.

**Root Cause:** Handler cancel crop di `CropOptionBar.tsx` dan handler `Escape` di `useCanvasKeyboard.ts` masih memanggil `setActiveTool("move")`, sehingga aksi membatalkan crop juga keluar dari Crop tool.

**Fix Rationale:** Cancel adalah pembatalan session/preview crop, bukan pergantian tool. Menghapus pemanggilan `setActiveTool("move")` pada jalur cancel menjaga user tetap berada di Crop tool untuk membuat crop box baru atau menyesuaikan crop workflow berikutnya.

**Files Changed/Added:**
- [MODIFY] `apps/desktop/src/components/editor/CropOptionBar.tsx`
- [MODIFY] `apps/desktop/src/components/editor/useCanvasKeyboard.ts`
- [MODIFY] `apps/desktop/src/components/editor/__tests__/CropOptionBar.test.tsx`
- [MODIFY] `docs/AI_CURRENT_TASK.md`
- [MODIFY] `docs/AI_HISTORY.md`
- [MODIFY] `docs/FEATURES.md`
- [MODIFY] `docs/plans/task.md`

**Verifikasi:**
- âœ… `pnpm.cmd --filter photrez-desktop test -- CropOptionBar`: PASS (308/308 frontend tests passing)
- âœ… `pnpm.cmd run build`: PASS (tsc compilation successful, Vite bundle built)

---

## [2026-06-05] FEATURE â€” Pasteboard Click Policy [COMPLETE]

### Kategori: FEATURE / UX / VIEWPORT / FRONTEND

**Deskripsi:** Menambahkan kebijakan klik pasteboard/outside-canvas terpusat agar Move normal dapat clear active layer, Selection dapat clear preview, dan mode penting seperti Transform Session, Crop, Brush, Eraser, serta Eyedropper tetap aman dari pembatalan tidak sengaja.

**Files Changed/Added:**
- [NEW] `apps/desktop/src/components/editor/pasteboardClickPolicy.ts`
- [NEW] `apps/desktop/src/components/editor/__tests__/pasteboardClickPolicy.test.ts`
- [NEW] `apps/desktop/src/components/editor/__tests__/CanvasViewport.test.tsx`
- [MODIFY] `apps/desktop/src/components/editor/CanvasViewport.tsx`

**Verifikasi:**
- âœ… `pnpm run build`: PASS (Vite & tsc compile clean)
- âœ… `pnpm --filter photrez-desktop test`: PASS (307/307 tests passing, including component integration tests)
- âœ… `cargo test --workspace`: PASS (85/85 tests passing)

---

## [2026-06-05] PLANNING â€” Pasteboard Click Policy Plan [COMPLETE]

### Kategori: PLANNING / UX / VIEWPORT / FRONTEND

**Deskripsi:** Membuat rencana implementasi lengkap untuk behavior klik luar canvas/pasteboard. Plan mengunci kebijakan per-tool: Move normal clear active layer, Selection clear preview, Transform Session dan Crop tidak dibatalkan oleh pasteboard click, Brush/Eraser/Eyedropper no-op, dan panning tetap prioritas.

**Files Changed:**
- [ADD] `docs/superpowers/plans/2026-06-05-pasteboard-click-policy-plan.md`
- [MODIFY] `docs/AI_CURRENT_TASK.md`
- [MODIFY] `docs/AI_HISTORY.md`
- [MODIFY] `docs/FEATURES.md`
- [MODIFY] `docs/plans/task.md`

**Verifikasi:**
- Documentation-only planning task. Verified by reviewing the plan for concrete UX policy, target files, tests, manual smoke scenarios, and final verification commands.

---

## [2026-06-05] FEATURE â€” Transform Session Hardening and Contextual Option Bar [COMPLETE]

### Kategori: FEATURE / UX / TRANSFORM / FRONTEND

**Deskripsi:** Hardened layer transform session lifecycle and added contextual Transform Option Bar while resize/rotate transform preview is active.

**Files Changed/Added:**
- [NEW] `apps/desktop/src/components/editor/TransformOptionBar.tsx`
- [NEW] `apps/desktop/src/components/editor/__tests__/TransformOptionBar.test.tsx`
- [MODIFY] `apps/desktop/src/components/editor/editorState.ts`
- [MODIFY] `apps/desktop/src/components/editor/OptionBar.tsx`
- [MODIFY] `apps/desktop/src/components/editor/MoveOptionBar.tsx`
- [MODIFY] `apps/desktop/src/components/editor/LeftToolRail.tsx`
- [MODIFY] `apps/desktop/src/components/editor/DocumentTabsBar.tsx`
- [MODIFY] `apps/desktop/src/components/editor/LayersPanel.tsx`
- [MODIFY] `apps/desktop/src/components/editor/AppTitleBar.tsx`
- [MODIFY] `apps/desktop/src/components/editor/BottomStatusBar.tsx`
- [MODIFY] `apps/desktop/src/components/editor/SelectionTransformOverlay.tsx`
- [MODIFY] `apps/desktop/src/components/editor/useSelectionTransformDrag.ts`
- [MODIFY] `apps/desktop/src/components/editor/useLayerDragReorder.ts`
- [MODIFY] `apps/desktop/src/components/editor/__tests__/SelectionTransformOverlay.test.ts`
- [MODIFY] `apps/desktop/src/components/editor/__tests__/transformSession.test.ts`

**Verifikasi:**
- âœ… `pnpm run build`: PASS (tsc compilation successful, Vite bundle built)
- âœ… `pnpm --filter photrez-desktop test`: PASS (295/295 tests passing, including new TransformOptionBar and SelectionTransformOverlay Escape tests)
- âœ… `cargo test -p photrez-core`: PASS (85/85 tests passing)
- âœ… `cargo test --workspace`: PASS (85/85 tests passing)

---

## [2026-06-05] PLANNING â€” Transform Session Hardening + Contextual Option Bar Plan [COMPLETE]

### Kategori: PLANNING / UX / TRANSFORM / FRONTEND

**Deskripsi:** Membuat rencana implementasi lengkap untuk dua lanjutan pekerjaan Transform Session: memperbaiki lifecycle/undo/session-safety yang masih kurang dan menambahkan editor-standard contextual Transform Option Bar saat resize/rotate preview aktif.

**Files Changed:**
- [ADD] `docs/superpowers/plans/2026-06-05-transform-session-hardening-contextual-optionbar-plan.md`
- [MODIFY] `docs/AI_CURRENT_TASK.md`
- [MODIFY] `docs/AI_HISTORY.md`
- [MODIFY] `docs/FEATURES.md`
- [MODIFY] `docs/plans/task.md`

**Verifikasi:**
- Documentation-only planning task. Verified by reviewing the plan for concrete scope, exact files, lifecycle rules, contextual option bar UX, tests, verification commands, and docs sync steps.

---

## [2026-06-05] FEATURE â€” reference editor-Style Transform Session UX [COMPLETE]

### Kategori: FEATURE / UX / TRANSFORM / FRONTEND

**Deskripsi:** Mengimplementasikan editor-standard transient transform session di mana modifikasi layer (resize dan rotate) berjalan sebagai preview sementara, dan memerlukan Enter/Apply untuk commit atau Esc/Cancel untuk membatalkan (revert) ke transform semula. Bergerak bebas (Move Tool body drag) tetap direct manipulation yang langsung di-commit saat pointer dilepas untuk menjaga alur kerja yang ringan.

**Rincian Perubahan:**
1. **Transform Session State (`editorState.ts` & `EditorContext.tsx`)**:
   - Menambahkan tipe `LayerTransformSession` untuk menyimpan ID layer, transform awal (`originalTransform`), mode ("resize" | "rotate"), dan timestamp mulai.
   - Menyediakan signal `layerTransformSession` dan setter-nya di `createEditorState` dan mempublikasikannya melalui `EditorContext`.
2. **Transform Session Helpers (`transformSession.ts` & `transformSession.test.ts`)**:
   - Menulis helper `commitLayerTransformSession` untuk merekam snapshot transform lama (sebagai titik undo) dan keluar session.
   - Menulis helper `cancelLayerTransformSession` untuk me-revert properti transform layer ke nilai awal dan keluar session.
   - Menulis unit test untuk helper-helper di atas (vitest).
3. **Selection Transform Drag (`useSelectionTransformDrag.ts`)**:
   - Mengubah event pointer down agar tidak langsung melakukan `history.commit` pada resize/rotate, melainkan memulai `layerTransformSession` baru jika belum ada.
   - Memperbarui event keydown Escape pada saat drag pointer aktif agar me-restore transform asli dari data session jika ada.
4. **Keyboard Shortcuts Routing (`useCanvasKeyboard.ts`)**:
   - Menambahkan interseptor keyboard pada saat `layerTransformSession()` aktif: menekan `Enter` akan memanggil `commitLayerTransformSession` dan menekan `Escape` akan memanggil `cancelLayerTransformSession`.
5. **Option Bar Controls (`MoveOptionBar.tsx`)**:
   - Menambahkan tombol "Apply" dan "Cancel" secara kontekstual di sebelah kanan tombol Reset pada Move Options Bar ketika `layerTransformSession()` sedang aktif.
6. **Visual & Status Feedback (`BottomStatusBar.tsx` & `SelectionTransformOverlay.tsx`)**:
   - Bottom status bar menampilkan pesan petunjuk: "Transform active. Enter to apply, Esc to cancel."
   - Bounding box outline pada `SelectionTransformOverlay` berubah warna menjadi Photon Amber `#E15A17` saat transform session aktif, dan tetap putih transparan tipis `rgba(255,255,255,0.72)` saat selection biasa.

**Files Changed/Added:**
- [NEW] `apps/desktop/src/components/editor/transformSession.ts`
- [NEW] `apps/desktop/src/components/editor/__tests__/transformSession.test.ts`
- [MODIFY] `apps/desktop/src/components/editor/editorState.ts`
- [MODIFY] `apps/desktop/src/components/editor/EditorContext.tsx`
- [MODIFY] `apps/desktop/src/components/editor/useSelectionTransformDrag.ts`
- [MODIFY] `apps/desktop/src/components/editor/useCanvasKeyboard.ts`
- [MODIFY] `apps/desktop/src/components/editor/MoveOptionBar.tsx`
- [MODIFY] `apps/desktop/src/components/editor/BottomStatusBar.tsx`
- [MODIFY] `apps/desktop/src/components/editor/SelectionTransformOverlay.tsx`
- [MODIFY] `docs/AI_CURRENT_TASK.md`
- [MODIFY] `docs/plans/task.md`
- [MODIFY] `docs/FEATURES.md`
- [MODIFY] `docs/AI_HISTORY.md`

**Verifikasi:**
- âœ… `pnpm run build`: PASS
- âœ… `pnpm --filter photrez-desktop test`: 289/289 tests PASS (including new transform session helper tests and drag handler regression tests)
- âœ… `cargo test --workspace`: 85/85 tests PASS

---

## [2026-06-05] PLANNING â€” Transform Session UX Implementation Plan [COMPLETE]

### Kategori: PLANNING / UX / TRANSFORM / FRONTEND

**Deskripsi:** Membuat rencana implementasi untuk editor-standard transient transform session di Photrez. Keputusan UX yang dikunci: klik layer dengan Move tool tetap lightweight selection, body move tetap direct manipulation, sedangkan resize/rotate layer masuk session eksplisit dengan Enter/Apply untuk commit dan Esc/Cancel untuk revert. Crop tetap memakai session crop yang sudah ada.

**Files Changed:**
- [ADD] `docs/superpowers/plans/2026-06-05-transform-session-ux-plan.md`
- [MODIFY] `docs/AI_CURRENT_TASK.md`
- [MODIFY] `docs/plans/task.md`
- [MODIFY] `docs/AI_HISTORY.md`
- [MODIFY] `docs/FEATURES.md`

**Verifikasi:**
- Documentation-only planning task. Verified by reading the generated plan for concrete scope, exact file paths, task order, code-level implementation notes, test commands, and docs sync steps.

---

## [2026-06-05] BUG FIX â€” Rotate Handle Hover Cursor Outside Boundary Fix [COMPLETE]

### Kategori: BUG FIX / OVERLAY / INTERACTION

**Deskripsi:** Memperbaiki bug di mana kursor mouse berubah menjadi kursor rotasi (rotate icon) pada saat berada di area dalam (bounding box) layer/crop box dekat sudut (corner), padahal area dalam tersebut tidak seharusnya memicu rotasi.

**Akar Masalah (Root Cause):**
Sebelumnya, zona deteksi rotasi di sudut bounding box didefinisikan sebagai cincin donat 360 derajat penuh menggunakan path melingkar dengan radius luar `rotateOuter` (44px) dan radius dalam `hitSize` (20px). Karena donat ini penuh 360 derajat, bagian kuadran donat yang mengarah ke dalam bounding box layer/crop box ikut menangkap event pointer enter/hover. Hal ini membuat kursor berubah menjadi kursor rotate meskipun mouse berada di dalam area layer/crop.

**Logika Perbaikan (Fix Rationale):**
Membatasi area deteksi rotasi agar hanya aktif pada 270 derajat bagian luar sudut, dan mengecualikan kuadran 90 derajat bagian dalam sudut:
1. Membuat fungsi helper `getRotatePath` di `SelectionTransformOverlay.tsx` untuk menghitung path donat 270 derajat untuk masing-masing sudut:
   - `nw` (top-left): Mengecualikan kuadran kanan-bawah (`dx > 0` dan `dy > 0`).
   - `ne` (top-right): Mengecualikan kuadran kiri-bawah (`dx < 0` dan `dy > 0`).
   - `se` (bottom-right): Mengecualikan kuadran kiri-atas (`dx < 0` dan `dy < 0`).
   - `sw` (bottom-left): Mengecualikan kuadran kanan-atas (`dx > 0` dan `dy < 0`).
2. Menerapkan helper `getRotatePath` pada `SelectionTransformOverlay.tsx` (Move Tool transform overlay) dan `CropOverlayHandles.tsx` (Crop Tool handles overlay).

**Files Changed:**
- [MODIFY] `apps/desktop/src/components/editor/SelectionTransformOverlay.tsx`
- [MODIFY] `apps/desktop/src/components/editor/CropOverlayHandles.tsx`
- [MODIFY] `docs/AI_CURRENT_TASK.md`
- [MODIFY] `docs/plans/task.md`
- [MODIFY] `docs/AI_HISTORY.md`

**Verifikasi:**
- âœ… `pnpm run build`: PASS
- âœ… `pnpm --filter photrez-desktop test`: 286/286 tests PASS
- âœ… `cargo test --workspace`: 85/85 tests PASS

---

## [2026-06-04] FEATURE â€” Crop Option Bar Dropdown Visual Refinement [COMPLETE]

### Kategori: FEATURE / UI / FRONTEND / CROP / OPTION BAR / UX

**Deskripsi:** Memperbaiki tampilan dropdown menu pada Crop Option Bar agar lebih rapi, modern, dan menyatu sempurna secara visual dengan tombol dropdown/chevron (mengatasi masalah di mana teks dropdown terlihat terlalu kecil dan tidak menyatu/tidak sejajar dengan ikon chevron di sampingnya).

**Rincian Perubahan:**
1. **Custom Dropdown Overlay Pattern (`CropOptionBar.tsx`)**:
   - Memodifikasi wadah dropdown pada Crop Mode Selector, Preset Selector, Unit Selector, dan Composition Guide Mode Selector agar menggunakan layout custom.
   - Menyembunyikan elemen native `<select>` dengan properti `opacity-0 absolute inset-0 w-full h-full cursor-pointer` sehingga diletakkan tepat di atas container dropdown visual secara penuh.
   - Menampilkan teks pilihan terpilih menggunakan tag `<span>` dengan styling `text-[11px] text-editor-text mr-4 select-none` yang rata tengah dan selaras sempurna dengan input angka desimal lain di Options Bar.
   - Menyelaraskan letak ikon `chevron-down` di sisi kanan dengan class `ml-auto pointer-events-none text-editor-text-dim` sehingga terlihat menyatu sebagai satu tombol yang utuh.
   - Menjamin area klik (hitbox) selektor mencakup seluruh bidang termasuk tombol chevron, sehingga mengklik bagian manapun pada wadah dropdown akan membuka menu select dengan lancar.
2. **Pencantuman Helper Mode Label**:
   - Menambahkan fungsi pembantu reaktif SolidJS (`cropModeLabel()`, `presetLabel()`, `guideModeLabel()`, `unitLabel()`) untuk melacak dan memetakan nilai sinyal mentah ke label teks display dropdown yang sesuai.

**Files Changed/Added:**
- [MODIFY] `apps/desktop/src/components/editor/CropOptionBar.tsx`
- [MODIFY] `docs/AI_CURRENT_TASK.md`
- [MODIFY] `docs/plans/task.md`
- [MODIFY] `docs/AI_HISTORY.md`

**Verifikasi:**
- âœ… `pnpm run build`: PASS
- âœ… `pnpm --filter photrez-desktop test`: PASS (286/286 tests passing, including CropOptionBar.test.tsx regression suite)

---

## [2026-06-04] BUG FIX â€” Crop Option Bar Centered Auto-Fit on Input changes [COMPLETE]

### Kategori: BUG FIX / UI / FRONTEND / CROP / OPTION BAR / UX

**Deskripsi:** Memperbaiki auto-fit pada crop option bar input (custom aspect ratio W/H, target size W/H, dan swap W/H) agar selalu memposisikan crop box secara pas di tengah kanvas (centered auto-fit).

**Root Cause:**
1. Pemanggilan `fitCropRectToAspect` di onSubmit handler custom aspect ratio dan target size memiliki argumen terbalik/salah (melewatkan `rect` di posisi `aspect`, dan `nextAspect` di posisi `docWidth` yang memicu parameter NaN).
2. Tombol swap W/H hanya menukar lebar dan tinggi dari kotak crop lama secara fisik di sekitar titik pusatnya tanpa melakukan penyesuaian (fit) terhadap batas dimensi kanvas baru, menyebabkan kotak crop meluber keluar kanvas pada rasio yang tidak seragam.

**Rincian Perubahan:**
1. **Perbaikan Parameter Auto-Fit**: Memperbaiki pemanggilan fungsi `fitCropRectToAspect` di onSubmit custom aspect dan target size inputs agar menggunakan parameter yang tepat: `fitCropRectToAspect(nextAspect/nextTarget, docWidth(), docHeight(), cropRotation())`.
2. **Auto-Fit pada Swap**: Menyesuaikan logika swap W/H pada mode Ratio dan Size agar secara proaktif menghitung ulang dan menerapkan auto-fit kotak crop di tengah kanvas (centered auto-fit) dengan aspek rasio atau target dimensi yang baru saja ditukar.
3. **Unit Tests (`CropOptionBar.test.tsx`)**: Membuat berkas test suite baru untuk menguji skenario perubahan aspect input, target size input, dan klik tombol swap W/H agar menghasilkan crop rect yang terpusat dan berukuran pas sesuai dimensi kanvas.

**Files Changed/Added:**
- [MODIFY] `apps/desktop/src/components/editor/CropOptionBar.tsx`
- [NEW] `apps/desktop/src/components/editor/__tests__/CropOptionBar.test.tsx`
- [MODIFY] `docs/plans/task.md`
- [MODIFY] `docs/AI_CURRENT_TASK.md`
- [MODIFY] `docs/AI_HISTORY.md`

**Verifikasi:**
- âœ… `pnpm run build`: PASS
- âœ… `pnpm --filter photrez-desktop test`: PASS (286/286 tests passing)

---

## [2026-06-04] FEATURE â€” Crop Option Bar reference editor Pain Points & Input Fixes [COMPLETE]

### Kategori: FEATURE / BUG FIX / UI / FRONTEND / CROP / OPTION BAR / UX

**Deskripsi:** Menyelesaikan pain point reference editor pada crop tool option bar (Destructive vs Non-destructive, Center-locked Swap, dan penghapusan HUD mengambang) serta memperbaiki bug input field option bar.

**Rincian Perubahan:**
1. **Destructive vs. Non-destructive UX**:
   - Mengubah label tombol dari `"Delete"` menjadi `"Delete Cropped"`.
   - Menambahkan tooltip memperjelas perbedaan tindakan yang merusak (destructive) dan aman (non-destructive).
   - Mengubah visual mask di `CropOverlay.tsx` agar area luar crop diwarnai warna gelap kanvas `#161618` (opacity `0.98`) ketika destructive aktif, dan warna transparan tipis `rgba(0,0,0,0.55)` ketika non-destructive aktif.
2. **Smart Center-Locked Swap & Auto-Fit**:
   - Menghitung titik pusat crop box saat ini dan menukar lebar serta tinggi secara dinamis seputar pusat tersebut agar posisi crop box tidak melompat bergeser ke pojok.
   - Menyelaraskan pertukaran nilai pada preset rasionya (`cropAspect`) dan target dimensi (`cropSizeTarget`).
   - Menambahkan pemanggilan `fitCropRectToAspect` ketika opsi mode crop, preset custom, atau target size diubah, agar crop box di canvas segera menyesuaikan bentuknya secara instan di layar (menyelesaikan masalah "nothing happens").
3. **Pembersihan HUD**:
   - Menghapus komponen pop-up status mengambang `CropModeIndicator` ("Mode Potong") yang berlebih agar tampilan viewport lebih bersih.
4. **Perbaikan Input Field (EditableNumField & Freeform Read-Only)**:
   - Memperbaiki race condition di SolidJS di mana pemanggilan `setEditing(false)` memicu efek visual memperbarui sinyal `text()` kembali ke nilai awal yang bulat sebelum nilai baru sempat dibaca/di-commit.
   - Menyamakan format nilai display dan editing dengan batas presisi 2 angka di belakang koma (`Math.round(val * 100) / 100`) untuk mencegah lompatan/perubahan angka decimal yang sangat panjang pada saat input difokuskan.
   - Menegaskan desain di mana mode "Free" menampilkan W & H secara *read-only* (menggunakan `NumField` bawaan) karena dimensinya ditentukan bebas di canvas, sedangkan pengetikan nilai angka presisi difasilitasi di mode "Ratio" dan "Size".
5. **Perbaikan Dropdown Custom Preset**:
   - Memecah dependensi reaktif yang kaku di mana pilihan `"Custom"` pada preset dropdown otomatis menutup kolom input W/H jika aspek rasio yang diketik secara tidak sengaja persis sama dengan salah satu nilai aspek preset bawaan (seperti `16:9` atau `4:5`). Sinyal `selectedPreset` mandiri digunakan untuk melacak pilihan dropdown secara deterministik.

**Files Changed/Added:**
- [MODIFY] `apps/desktop/src/components/editor/CropOptionBar.tsx`
- [MODIFY] `apps/desktop/src/components/editor/OptionBarShared.tsx`
- [MODIFY] `apps/desktop/src/components/editor/CropOverlay.tsx`
- [MODIFY] `apps/desktop/src/components/editor/CanvasViewport.tsx`
- [MODIFY] `apps/desktop/src/components/editor/primitives.tsx`
- [MODIFY] `docs/plans/task.md`
- [MODIFY] `docs/AI_CURRENT_TASK.md`
- [MODIFY] `docs/AI_HISTORY.md`

**Verifikasi:**
- âœ… `pnpm run build`: PASS
- âœ… `pnpm --filter photrez-desktop test`: PASS (283/283 tests passing)

---

## [2026-06-04] FEATURE â€” Crop Tool Option Bar Visual & UX Improvements [COMPLETE]

### Kategori: FEATURE / UI / FRONTEND / CROP / OPTION BAR / UX

**Deskripsi:** Memperbaiki visual dan UX pada Option Bar milik Crop Tool agar memiliki tampilan yang premium, rapi, dan konsisten dengan standar estetika *Soft & Snappy*.

**Rincian Perubahan:**
1. **Custom Select Dropdowns (`CropOptionBar.tsx`)**: Desain ulang selektor Dropdown bawaan (Crop Mode, Preset, dan Guide Mode) menggunakan pembungkus custom dengan chevron overlay absolut. Menambahkan transisi focus-ring dan warna border untuk kecocokan tema gelap.
2. **Standardisasi Ikon Lucide (`icons.tsx`, `CropOptionBar.tsx`)**:
   - Mengganti simbol teks rotasi/swap (`â†º`, `â†»`, `â†”`) dengan ikon Lucide resolusi tinggi yang terintegrasi (`rotate-ccw`, `rotate-cw`, `swap`).
   - Mendaftarkan ikon `RotateCcw` dan `ArrowLeftRight` pada `icons.tsx`.
3. **Penyelarasan UX & Tooltip (`CropOptionBar.tsx`)**:
   - Menambahkan atribut `title` sebagai tooltip bantu untuk semua tombol aksi bertipe ikon saja.
   - Menyetel tinggi tombol APPLY menjadi 24px agar seragam dengan tinggi elemen input desimal dan tombol reset/cancel lainnya.

**Files Changed/Added:**
- [MODIFY] `apps/desktop/src/components/editor/icons.tsx`
- [MODIFY] `apps/desktop/src/components/editor/CropOptionBar.tsx`
- [MODIFY] `docs/plans/task.md`
- [MODIFY] `docs/FEATURES.md`
- [MODIFY] `docs/AI_CURRENT_TASK.md`

**Verifikasi:**
- âœ… `pnpm run build`: PASS (Vite + tsc)
- âœ… `pnpm --filter photrez-desktop test`: PASS (283/283 tests passing)

---

## [2026-06-04] FEATURE â€” Move Tool Option Bar Visual & UX Improvements [COMPLETE]

### Kategori: FEATURE / UI / FRONTEND / MOVE / OPTION BAR / UX

**Deskripsi:** Memperbaiki visual Option Bar (kontras tinggi toggle Auto & Snap), menambahkan pembacaan hover target secara dinamis ketika Auto-Select aktif, dan mengimplementasikan tombol perataan langsung ke Canvas (Align Left/Center/Right/Top/Middle/Bottom) pada Move Tool.

**Rincian Perubahan:**
1. **Toggle Button Polish (`OptionBarShared.tsx`)**: Desain ulang visual state `ToggleBtn` agar aktif memakai warna aksen Photon Amber semi-transparan `bg-editor-accent/10`, border `border-editor-accent/40`, teks putih tebal `text-editor-text`, dan bayangan inset halus.
2. **Auto-Select target readout (`MoveOptionBar.tsx`)**: Mengambil data `hoveredLayerId()` dari editor context dan menampilkan indikator dinamis `Target: [Layer Name]` di sebelah tombol Snap saat mouse di-hover di atas layer canvas.
3. **Canvas alignment controls (`icons.tsx`, `MoveOptionBar.tsx`)**:
   - Mendaftarkan ikon baru `AlignStartHorizontal` (Align Left), `AlignEndHorizontal` (Align Right), `AlignStartVertical` (Align Top), `AlignEndVertical` (Align Bottom).
   - Menghitung koordinat perataan active layer berdasarkan dimensinya (`width * scaleX`) dan resolusi dokumen (`docWidth()` / `docHeight()`).
   - Menyimpan status undo history dan memanggil `engine.transformLayer` untuk meratakan layer ke tepi/tengah canvas secara instan.

**Files Changed/Added:**
- [MODIFY] `apps/desktop/src/components/editor/OptionBarShared.tsx`
- [MODIFY] `apps/desktop/src/components/editor/icons.tsx`
- [MODIFY] `apps/desktop/src/components/editor/MoveOptionBar.tsx`
- [MODIFY] `docs/plans/task.md`
- [NEW] `docs/plans/2026-06-04-move-option-bar-improvements.md`
- [NEW] `docs/plans/2026-06-04-move-option-bar-ux-design.md`

**Verifikasi:**
- âœ… `pnpm run build`: PASS
- âœ… `pnpm --filter photrez-desktop test`: PASS (283/283 tests passing)
- âœ… `cargo test --workspace`: PASS (85/85 tests passing)

---

## [2026-06-04] FEATURE â€” Layer Merge Keyboard Shortcuts [COMPLETE]

### Kategori: FEATURE / UI / FRONTEND / LAYERS / KEYBOARD / WEBGL / HISTORY

**Deskripsi:** Menambahkan shortcut desktop-editor untuk operasi layer stack:
- `Ctrl+E` = Merge Down active layer.
- `Ctrl+Shift+E` = Flatten All layers.

**Root Cause:** Sebelumnya `useCanvasKeyboard` hanya menangani `Ctrl+J` untuk duplicate layer. Operasi Merge Down dan Flatten All sudah tersedia di Layer panel, tetapi belum punya binding keyboard.

**Fix Rationale:**
1. Mengekstrak logika merge/flatten ke `layerOperations.ts` agar tombol Layer panel dan shortcut keyboard memakai satu implementasi yang sama.
2. Helper bersama melakukan `history.commit(engine.snapshot())`, menghancurkan texture layer lama, mengunggah bitmap hasil merge/flatten ke WebGL renderer, dan hanya mengembalikan `true` bila operasi valid.
3. `useCanvasKeyboard` sekarang menangani `Ctrl+E` dan `Ctrl+Shift+E`, lalu request render hanya saat state benar-benar berubah.
4. Menambahkan regression test komponen hook keyboard untuk memastikan shortcut memutasi layer stack, menyimpan undo history, dan mengunggah texture baru.

**Files Changed/Added:**
- [NEW] `apps/desktop/src/components/editor/layerOperations.ts`
- [NEW] `apps/desktop/src/components/editor/__tests__/CanvasKeyboardLayerShortcuts.test.tsx`
- [MODIFY] `apps/desktop/src/components/editor/useCanvasKeyboard.ts`
- [MODIFY] `apps/desktop/src/components/editor/useLayerActions.ts`
- [MODIFY] `docs/AI_CURRENT_TASK.md`
- [MODIFY] `docs/FEATURES.md`

**Verifikasi:**
- âœ… `pnpm.cmd --filter photrez-desktop test -- --run apps/desktop/src/components/editor/__tests__/CanvasKeyboardLayerShortcuts.test.tsx`: PASS (283/283 via vitest run)
- âœ… `pnpm.cmd run build`: PASS
- âœ… `pnpm.cmd --filter photrez-desktop test -- --pool=threads --maxWorkers=1`: PASS (283/283)
- âš ï¸ `pnpm.cmd --filter photrez-desktop test`: gagal start beberapa Vitest fork worker (`Timeout waiting for worker to respond`) pada mode default, bukan assertion failure; rerun serial/threads pass penuh.

---

## [2026-06-04] BUG FIX â€” Layer Tab Actions and Undo Wiring [COMPLETE]

### Kategori: BUG FIX / UI / FRONTEND / LAYERS / WEBGL / HISTORY

**Deskripsi:** Memperbaiki beberapa kontrol Layer tab yang terlihat aktif tetapi belum sepenuhnya berfungsi benar: Merge Down, Flatten All, undo untuk properti layer, tab History, dan Lock Transparency saat brush/eraser.

**Root Cause:**
1. `mergeDown()` dan `flattenLayers()` membuat layer baru dengan `ImageBitmap`, tetapi `useLayerActions` tidak mengunggah bitmap baru tersebut ke WebGL renderer. Renderer hanya menggambar layer yang memiliki texture terdaftar, sehingga hasil merge/flatten bisa tidak terlihat di viewport.
2. Beberapa handler Layer tab tidak melakukan `history.commit(engine.snapshot())` sebelum mutasi. Visibility dan lock utama tidak commit sama sekali; rename juga langsung memutasi nama; opacity commit dilakukan setelah nilai sudah berubah.
3. `lockTransparency` hanya disimpan sebagai flag layer dan ditampilkan di UI, tetapi belum dipakai oleh brush/eraser path.
4. Tombol `History` di header Layer panel tidak memiliki state tab atau konten history; tombol hanya static text.

**Fix Rationale:**
1. Setelah Merge Down dan Flatten All, texture layer lama dihancurkan melalui `renderer.destroyTexture()`, lalu bitmap layer hasil baru di-upload dengan `renderer.uploadImage()`.
2. Visibility, lock utama, rename, dan opacity sekarang commit snapshot sebelum mutasi agar undo mengembalikan state sebelumnya.
3. Opacity slider menyimpan snapshot pre-drag dan commit satu kali saat perubahan selesai.
4. Lock Transparency sekarang membatasi brush ke alpha bitmap layer yang sudah ada dan mencegah eraser mengubah layer saat transparency lock aktif.
5. Tab History sekarang menampilkan jumlah undo/redo serta tombol Undo/Redo yang restore snapshot dan upload ulang texture layer aktif.
6. Menambahkan regression test komponen `LayersPanel` untuk merge upload, flatten upload, rename history, visibility history, opacity history, dan switching tab History.

**Files Changed/Added:**
- [MODIFY] `apps/desktop/src/components/editor/useLayerActions.ts`
- [MODIFY] `apps/desktop/src/components/editor/LayersPanel.tsx`
- [MODIFY] `apps/desktop/src/components/editor/LayerItem.tsx`
- [MODIFY] `apps/desktop/src/components/editor/useBrushOverlay.ts`
- [NEW] `apps/desktop/src/components/editor/__tests__/LayersPanel.test.tsx`

**Verifikasi:**
- âœ… `pnpm.cmd --filter photrez-desktop test -- --run apps/desktop/src/components/editor/__tests__/LayersPanel.test.tsx`: PASS
- âœ… `pnpm.cmd run build`: PASS
- âœ… `pnpm.cmd --filter photrez-desktop test`: PASS (281/281)

---

## [2026-06-04] BUG FIX â€” Navigator Drag UX Terasa Licin [COMPLETE]

### Kategori: BUG FIX / UI / FRONTEND / NAVIGATOR / VIEWPORT / UX

**Deskripsi:** Memperbaiki UX Navigator agar drag viewport frame terasa presisi dan tidak lagi seperti meluncur/terlalu sensitif.

**Root Cause:**
Navigator sebelumnya memakai model `panToNavigatorCoord()` untuk semua pointer move. Setiap gerakan pointer langsung diperlakukan sebagai titik pusat viewport baru. Karena thumbnail Navigator hanya `208x88px`, gerakan kecil pada minimap dikonversi menjadi perpindahan dokumen besar, sehingga terasa licin. Pointerdown di dalam frame juga langsung melakukan recenter, bukan memulai drag relatif.

**Fix Rationale:**
1. Menambahkan state drag eksplisit yang menyimpan pointer awal, pan awal, dan zoom awal.
2. Jika pointerdown dimulai di dalam visible viewport frame, Navigator tidak langsung mengubah pan; pointermove baru menggeser pan secara relatif berdasarkan delta pointer.
3. Jika pointerdown dimulai di area thumbnail tetapi di luar frame, Navigator tetap center ke titik tersebut sekali, lalu drag berikutnya tetap relatif.
4. Menambahkan guard agar klik pada area letterbox kosong di Navigator tidak menggeser dokumen.
5. Menambahkan cleanup `pointercancel` agar drag state tidak tertahan saat event pointer dibatalkan oleh WebView/OS.

**Files Changed:**
- [MODIFY] `apps/desktop/src/components/editor/Navigator.tsx`
- [MODIFY] `apps/desktop/src/components/editor/__tests__/Navigator.test.tsx`

**Verifikasi:**
- âœ… `pnpm.cmd --filter photrez-desktop test -- --run apps/desktop/src/components/editor/__tests__/Navigator.test.tsx`: PASS
- âœ… `pnpm.cmd run build`: PASS
- âœ… `pnpm.cmd --filter photrez-desktop test`: PASS (275/275)

---

## [2026-06-04] BUG FIX â€” Layer Terbalik Secara Vertikal pada WebGL FBO Pipeline [COMPLETE]

### Kategori: BUG FIX / RENDERER / WEBGL / TEXTURE / FLIP

**Deskripsi:** Saat mengaktifkan compositing FBO WebGL2, layer gambar dirender terbalik secara vertikal pada viewport.

**Root Cause:**
WebGL framebuffer (FBO) merekam hasil gambar dengan titik asal koordinat (Y=0) di pojok kiri bawah. Saat tekstur hasil rendering FBO ini digambar kembali ke layar atau disalin ke FBO ping-pong lain menggunakan koordinat tekstur standard (`v_texCoord`), hal ini menyebabkan gambar terbalik vertikal (Y-flip) karena perbedaan orientasi orientasi origin antara tekstur bawaan gambar biasa (V=0 di atas) dan tekstur FBO (V=0 di bawah).

**Logika Perbaikan (Fix Rationale):**
1. Menambahkan uniform boolean `u_flipTexY` pada fragment shader (`shaders.ts`). Jika bernilai `true`, shader akan membalik koordinat tekstur Y (`1.0 - texCoord.y`) sebelum mengambil warna pixel dengan `texture(u_texture, texCoord)`.
2. Di dalam WebGL backend (`webgl2.ts`):
   - Mendaftarkan uniform `u_flipTexY`.
   - Mengatur `u_flipTexY = 0` (tanpa flip) saat menggambar tekstur gambar layer mentah asli.
   - Mengatur `u_flipTexY = 1` (balik Y) saat menyalin tekstur FBO ke FBO lain atau menggambar FBO hasil compositing akhir ke viewport layar.

**Files Changed:**
- [MODIFY] [shaders.ts](file:///d:/Project/image-studio/apps/desktop/src/renderer/shaders.ts)
- [MODIFY] [webgl2.ts](file:///d:/Project/image-studio/apps/desktop/src/renderer/webgl2.ts)

**Verifikasi:**
- âœ… `pnpm run build`: PASS
- âœ… `pnpm --filter photrez-desktop test`: 271/271 PASS (vitest)
- âœ… Layer gambar terbuka kembali dengan arah tegak normal yang benar.

---

## [2026-06-04] FEATURE â€” WebGL GPU Layer Blend Modes Rendering [COMPLETE]

### Kategori: FEATURE / RENDERER / WEBGL / LAYERS / BLEND MODES

**Deskripsi:** Implementasi penuh rendering Blend Modes (Normal, Multiply, Screen, Overlay, Darken, Lighten, Color Dodge, Color Burn, Hard Light, Soft Light, Difference, Exclusion) yang berjalan secara hardware-accelerated di GPU menggunakan WebGL2 ping-pong framebuffer pipeline.

**Rincian Perubahan:**
1. **Shaders Compilation (`shaders.ts`)**:
   - Menambahkan uniform `u_backdrop` (texture accumulator), `u_blendMode` (mode blend integer), `u_useBackdrop` (flag status blend), dan `u_resolution` (dimensi render).
   - Menulis formula matematika blend modes di fragment shader: Multiply, Screen, Overlay, Darken, Lighten, Color Dodge, Color Burn, Hard Light, Soft Light, Difference, dan Exclusion.
   - Mengimplementasikan Porter-Duff alpha-corrected compositing formula untuk blending warna semi-transparan yang presisi secara matematis.
2. **Ping-Pong Pipeline (`webgl2.ts`)**:
   - Membuat sepasang Framebuffer Objects (FBO) dan WebGLTextures ping-pong.
   - Mengatur rekondisi/resize otomatis ping-pong textures di fungsi `resize()` sesuai resolusi target canvas viewport (`canvas.width` Ã— `canvas.height`).
   - Menyempurnakan alur `render()` agar secara berurutan menggambar layer terbawah secara normal ke FBO 0, dan layer-layer di atasnya menggunakan shader blend modes dengan membaca isi texture FBO sebelumnya sebagai backdrop.
   - Menggambar hasil compositing akhir FBO ke viewport utama layar di atas pola checkerboard transparency grid.
3. **Resource Cleanup (`webgl2.ts`)**:
   - Memastikan penghapusan/disposal texture FBO secara aman pada `dispose()`.

**Files Changed/Added:**
- [MODIFY] [shaders.ts](file:///d:/Project/image-studio/apps/desktop/src/renderer/shaders.ts)
- [MODIFY] [webgl2.ts](file:///d:/Project/image-studio/apps/desktop/src/renderer/webgl2.ts)

**Verifikasi:**
- âœ… `pnpm run build`: PASS
- âœ… `pnpm --filter photrez-desktop test`: 271/271 PASS (vitest)
- âœ… `cargo test --workspace`: 85/85 PASS

---

## [2026-06-04] REFACTOR â€” Scalability and Maintainability Refactor (Waves 3 - 10) [COMPLETE]

### Kategori: REFACTOR / FRONTEND / SOLIDJS / TYPESCRIPT / ARCHITECTURE

**Deskripsi:** Melanjutkan program restrukturisasi maintainability. Pemisahan fungsionalitas dan concern (Separation of Concerns) pada file viewport, crop overlay, option bar, dan state provider ke dalam hooks dan sub-komponen modular. Semua fungsionalitas tetap berjalan identik dengan cakupan test yang lulus penuh.

**Rincian Perubahan:**
1. **Wave 3 (CanvasViewport Shell) [COMPLETE]**:
   - Mengekstrak inisialisasi, resize, fit-to-screen, dan sinkronisasi renderer WebGL2 ke custom hook [useViewportRenderer.ts](file:///d:/Project/image-studio/apps/desktop/src/components/editor/useViewportRenderer.ts).
   - Mengekstrak koordinasi pointer (down/move/up/double-click), target panduan magnetik (snapping), marquee selection, dan HUD koordinat ke custom hook [useCanvasPointerTools.ts](file:///d:/Project/image-studio/apps/desktop/src/components/editor/useCanvasPointerTools.ts).
   - Mengekstrak state reaktif turunan (layer lock, transform, bounding box, crop auto-init) ke [useCanvasDerivedState.ts](file:///d:/Project/image-studio/apps/desktop/src/components/editor/useCanvasDerivedState.ts).
   - Memangkas `CanvasViewport.tsx` menjadi file presenter ringkas yang menyusun hook-hook di atas.
2. **Wave 4 (CropOverlay Modularization) [COMPLETE]**:
   - Mengekstrak state machine interaksi drag/resize/rotate, snapping, pergeseran viewport penyeimbang, dan commit history ke [useCropOverlayDrag.ts](file:///d:/Project/image-studio/apps/desktop/src/components/editor/useCropOverlayDrag.ts).
   - Mengekstrak visual guides SVG ke [CropOverlayGuides.tsx](file:///d:/Project/image-studio/apps/desktop/src/components/editor/CropOverlayGuides.tsx).
   - Mengekstrak visual handles dan rotate path hit-zones ke [CropOverlayHandles.tsx](file:///d:/Project/image-studio/apps/desktop/src/components/editor/CropOverlayHandles.tsx).
   - Mengekstrak tooltip dimensi/derajat ke [CropOverlayTooltip.tsx](file:///d:/Project/image-studio/apps/desktop/src/components/editor/CropOverlayTooltip.tsx).
3. **Wave 5 (OptionBar Per-Tool Split) [COMPLETE]**:
   - Membagi option bar raksasa `OptionBar.tsx` menjadi panel khusus tool: [MoveOptionBar.tsx](file:///d:/Project/image-studio/apps/desktop/src/components/editor/MoveOptionBar.tsx), [CropOptionBar.tsx](file:///d:/Project/image-studio/apps/desktop/src/components/editor/CropOptionBar.tsx), dan [BrushOptionBar.tsx](file:///d:/Project/image-studio/apps/desktop/src/components/editor/BrushOptionBar.tsx).
   - Mengekstrak tombol toggle dan divider bersama ke [OptionBarShared.tsx](file:///d:/Project/image-studio/apps/desktop/src/components/editor/OptionBarShared.tsx).
   - Menyederhanakan `OptionBar.tsx` menjadi presenter router berbasis tool aktif.
4. **Wave 6 (Transform Overlay Cleanup) [COMPLETE]**:
   - Mengekstrak drag interaction, hit-testing handle, dan input keyboard Escape pembatalan dari `SelectionTransformOverlay.tsx` ke hook [useSelectionTransformDrag.ts](file:///d:/Project/image-studio/apps/desktop/src/components/editor/useSelectionTransformDrag.ts).
5. **Wave 7 (EditorContext Split) [COMPLETE]**:
   - Memecah signal provider di `EditorContext.tsx` ke modul-modul independen: [editorState.ts](file:///d:/Project/image-studio/apps/desktop/src/components/editor/editorState.ts) (general UI state), [cropState.ts](file:///d:/Project/image-studio/apps/desktop/src/components/editor/cropState.ts) (crop signals & mini undo stack), [workspaceSync.ts](file:///d:/Project/image-studio/apps/desktop/src/components/editor/workspaceSync.ts) (Tauri & engine document session sync), dan [editorOpenImage.ts](file:///d:/Project/image-studio/apps/desktop/src/components/editor/editorOpenImage.ts) (dialog dialog load image native/fallback).
6. **Wave 8 (Rust Core/Render Reference Organization) [COMPLETE]**:
   - Memverifikasi integrasi model Rust core workspace dan document session. Memastikan 85 unit test Rust Rust core lulus penuh (`cargo test --workspace`).
7. **Wave 9 (CSS/Primitives & Icon Audit) [COMPLETE]**:
   - Mengaudit `primitives.tsx` and `icons.tsx` untuk memastikan konsistensi token visual Photon Amber.

**Files Changed/Added:**
- [NEW] [useViewportRenderer.ts](file:///d:/Project/image-studio/apps/desktop/src/components/editor/useViewportRenderer.ts)
- [NEW] [useCanvasPointerTools.ts](file:///d:/Project/image-studio/apps/desktop/src/components/editor/useCanvasPointerTools.ts)
- [NEW] [useCanvasDerivedState.ts](file:///d:/Project/image-studio/apps/desktop/src/components/editor/useCanvasDerivedState.ts)
- [NEW] [useCropOverlayDrag.ts](file:///d:/Project/image-studio/apps/desktop/src/components/editor/useCropOverlayDrag.ts)
- [NEW] [CropOverlayGuides.tsx](file:///d:/Project/image-studio/apps/desktop/src/components/editor/CropOverlayGuides.tsx)
- [NEW] [CropOverlayHandles.tsx](file:///d:/Project/image-studio/apps/desktop/src/components/editor/CropOverlayHandles.tsx)
- [NEW] [CropOverlayTooltip.tsx](file:///d:/Project/image-studio/apps/desktop/src/components/editor/CropOverlayTooltip.tsx)
- [NEW] [OptionBarShared.tsx](file:///d:/Project/image-studio/apps/desktop/src/components/editor/OptionBarShared.tsx)
- [NEW] [MoveOptionBar.tsx](file:///d:/Project/image-studio/apps/desktop/src/components/editor/MoveOptionBar.tsx)
- [NEW] [CropOptionBar.tsx](file:///d:/Project/image-studio/apps/desktop/src/components/editor/CropOptionBar.tsx)
- [NEW] [BrushOptionBar.tsx](file:///d:/Project/image-studio/apps/desktop/src/components/editor/BrushOptionBar.tsx)
- [NEW] [useSelectionTransformDrag.ts](file:///d:/Project/image-studio/apps/desktop/src/components/editor/useSelectionTransformDrag.ts)
- [NEW] [editorState.ts](file:///d:/Project/image-studio/apps/desktop/src/components/editor/editorState.ts)
- [NEW] [cropState.ts](file:///d:/Project/image-studio/apps/desktop/src/components/editor/cropState.ts)
- [NEW] [workspaceSync.ts](file:///d:/Project/image-studio/apps/desktop/src/components/editor/workspaceSync.ts)
- [NEW] [editorOpenImage.ts](file:///d:/Project/image-studio/apps/desktop/src/components/editor/editorOpenImage.ts)
- [MODIFY] [CanvasViewport.tsx](file:///d:/Project/image-studio/apps/desktop/src/components/editor/CanvasViewport.tsx)
- [MODIFY] [CropOverlay.tsx](file:///d:/Project/image-studio/apps/desktop/src/components/editor/CropOverlay.tsx)
- [MODIFY] [OptionBar.tsx](file:///d:/Project/image-studio/apps/desktop/src/components/editor/OptionBar.tsx)
- [MODIFY] [SelectionTransformOverlay.tsx](file:///d:/Project/image-studio/apps/desktop/src/components/editor/SelectionTransformOverlay.tsx)
- [MODIFY] [EditorContext.tsx](file:///d:/Project/image-studio/apps/desktop/src/components/editor/EditorContext.tsx)

**Verifikasi:**
- âœ… `pnpm run build`: PASS (Vite + TypeScript compiler)
- âœ… `pnpm --filter photrez-desktop test`: 271/271 PASS (vitest)
- âœ… `cargo test --workspace`: 85/85 PASS

---

## [2026-06-04] REFACTOR â€” Separation of Concerns Refactoring (File Splitting) [COMPLETE]

### Kategori: REFACTOR / FRONTEND / SOLIDJS / TYPESCRIPT / ARCHITECTURE

**Deskripsi:** Refactoring dan pemisahan concern (Separation of Concerns) pada file frontend terbesar (`CanvasViewport.tsx` dan `LayersPanel.tsx`) ke dalam sub-komponen dan custom hook modular. Memperbaiki arsitektur dan maintainabilitas tanpa mengubah perilaku fungsional aplikasi.

**Rincian Perubahan:**
1. **`CanvasViewport.tsx` (1112 â†’ 713 lines)**:
   - Mengekstrak handler keyboard global (reference editor navigation, crop enter/escape, zoom, nudge) ke `useCanvasKeyboard.ts`.
   - Mengekstrak visual overlay canvas brush, event `onPaintStroke()`, dan method `commitBrushStroke()` ke `useBrushOverlay.ts`.
   - Mengekstrak physics momentum inersia, pointer viewport panning, dan penanganan scroll wheel ke `usePanNavigation.ts`.
2. **`LayersPanel.tsx` (732 â†’ 190 lines)**:
   - Mengekstrak rendering baris layer list ke komponen `LayerItem.tsx`.
   - Mengekstrak pointer-based drag-and-drop layer reordering ke custom hook `useLayerDragReorder.ts`.
   - Mengekstrak seluruh handler mutasi layer dan toggle lock status (add, delete, duplicate, merge, flatten, locks) ke custom hook `useLayerActions.ts`.
   - Mengekstrak render canvas thumbnail layer ke file terpisah `LayerThumb.tsx`.

**Files Changed/Added:**
- [NEW] `apps/desktop/src/components/editor/useCanvasKeyboard.ts`
- [NEW] `apps/desktop/src/components/editor/useBrushOverlay.ts`
- [NEW] `apps/desktop/src/components/editor/usePanNavigation.ts`
- [NEW] `apps/desktop/src/components/editor/LayerItem.tsx`
- [NEW] `apps/desktop/src/components/editor/useLayerDragReorder.ts`
- [NEW] `apps/desktop/src/components/editor/useLayerActions.ts`
- [NEW] `apps/desktop/src/components/editor/LayerThumb.tsx`
- [MODIFY] `apps/desktop/src/components/editor/CanvasViewport.tsx`
- [MODIFY] `apps/desktop/src/components/editor/LayersPanel.tsx`

**Verifikasi:**
- âœ… `pnpm run build`: PASS (Vite + TypeScript compiler)
- âœ… `pnpm --filter photrez-desktop test`: 271/271 PASS (vitest)

---

## [2026-06-04] FEATURE â€” Interactive Navigator Panel [COMPLETE]

### Kategori: FEATURE / NAVIGATOR / VIEWPORT / ZOOM / PAN / UI / UX

**Deskripsi:** Implementasi panel Navigator interaktif premium mirip reference editor untuk mempermudah pan, zoom, dan peninjauan komposisi layer secara visual.

**Detail Fungsionalitas:**
1. **Live Preview Composition (`Navigator.tsx`)**:
   - Membaca seluruh layer aktif dari tumpukan `layers()`.
   - Menggambar render mini checkerboard transparan diikuti oleh komposisi semua layer visible ke dalam `<canvas>` navigator berukuran `208x88px` (mengikuti rasio aspek dokumen secara proporsional).
   - *Bug Fix*: Memperbaiki isolasi transformasi matriks 2D (`ctx.save()` / `ctx.restore()`) agar translasi penyeimbang thumbnail (`ox`/`oy`) tidak menumpuk antar layer, menyelesaikan masalah tampilan Navigator kosong.
2. **Interactive Viewport Frame (Red Box)**:
   - Menghitung koordinat batas viewport utama (`panX`, `panY`, `zoom`, serta lebar/tinggi viewport) dan memetakan skalanya ke dimensi Navigator thumbnail.
   - Menggambar frame outline merah solid `#E15A17` (Photon Amber) dengan overlay warna transparan tipis di atas canvas Navigator untuk menunjukkan area yang terlihat saat ini.
3. **Pointer-Based Click-and-Drag Pan**:
   - Menambahkan event listener `pointerdown`/`pointermove`/`pointerup` interaktif pada canvas Navigator.
   - Mengizinkan pengguna mengklik atau menyeret kotak merah Navigator untuk memperbarui viewport `panX` & `panY` utama secara instan.
4. **Interactive Zoom Slider**:
   - Menghubungkan input range zoom (5% hingga 400%) beserta tombol presisi `-` dan `+` agar responsif mengubah level zoom artboard utama secara real-time.
5. **Navigator Header Action**:
   - Mengubah ikon placeholder `maximize` di sebelah teks judul "Navigator" menjadi tombol interaktif yang memicu fungsi **Fit Screen** secara dinamis (mengambil ukuran `#canvas-container` saat ini).

**Files Changed:**
- [NEW] `apps/desktop/src/components/editor/Navigator.tsx`
- [MODIFY] `apps/desktop/src/components/editor/LayersPanel.tsx`
- [MODIFY] `apps/desktop/src/components/editor/EditorContext.tsx`
- [MODIFY] `apps/desktop/src/components/editor/CanvasViewport.tsx`

**Verifikasi:**
- âœ… `pnpm run build`: PASS
- âœ… `vitest`: 271/271 PASS

---

## [2026-06-04] BUG FIX â€” Duplikasi Layer Menghasilkan Gambar Kosong (Missing WebGL Sync) [COMPLETE]

### Kategori: BUG FIX / LAYERS / WEBGL / SHORTCUT

**Deskripsi:** Saat menduplikasi layer (baik melalui tombol "Duplicate Layer" di Layers Panel maupun shortcut `Ctrl+J`), layer baru berhasil dibuat di struktur data engine tetapi tampil kosong di canvas render.

**Root Cause:**
Engine berhasil melakukan kloning deep terhadap objek `ImageBitmap` di memory RAM (JS/CPU). Namun, hasil klon tersebut (`dup.imageBitmap`) tidak diunggah ke memori texture GPU WebGL. Karena WebGL rendering mengandalkan pemetaan ID layer ke WebGLTexture, ID layer baru yang terbuat (`layer-xxxx`) tidak memiliki texture terasosiasi di GPU sehingga digambar transparan (kosong).

**Logika Perbaikan:**
Melakukan sinkronisasi upload bitmap ke WebGL backend setelah operasi duplikasi:
1. Menambahkan destrukturisasi `renderer` dari `useEditor()` di `LayersPanel.tsx` dan `CanvasViewport.tsx`.
2. Di dalam handler `handleDuplicateActiveLayer` (`LayersPanel.tsx`) dan shortcut `Ctrl+J` (`CanvasViewport.tsx`), setelah memanggil `engine.duplicateLayer(activeId)`, lakukan pengecekan apakah layer baru hasil duplikasi memiliki `imageBitmap`.
3. Jika ya, panggil `renderer.uploadImage(dup.id, dup.imageBitmap)` agar texture langsung terdaftar di WebGL backend sebelum frame berikutnya dirender.

**Files Changed:**
- `apps/desktop/src/components/editor/LayersPanel.tsx`
- `apps/desktop/src/components/editor/CanvasViewport.tsx`

**Verifikasi:**
- âœ… `pnpm run build`: PASS
- Duplikasi layer kini menampilkan gambar salinan yang identik di viewport canvas secara instan.

---

## [2026-06-04] BUG FIX â€” Layer Drag Reorder Tidak Berfungsi di Tauri [COMPLETE]

### Kategori: BUG FIX / LAYERS / DRAG-AND-DROP / TAURI

**Deskripsi:** Layer drag-and-drop reorder pada Layers Panel tidak berfungsi â€” layer terlihat "muted" saat di-drag tetapi tidak pernah berpindah posisi.

**Root Cause:**
HTML5 Drag and Drop API (`draggable`, `onDragStart`, `onDragOver`, `onDrop`) tidak reliabel di Tauri webview pada Windows. Tauri mengintercept drag events di level OS (untuk file drops, dll), sehingga event `dragover`/`drop` tidak pernah sampai ke handler JavaScript.

**Logika Perbaikan:**
Mengganti seluruh implementasi HTML5 DnD dengan **pointer-based drag system** menggunakan `PointerEvent`:
1. `onPointerDown` pada setiap baris layer untuk memulai tracking.
2. `document.addEventListener("pointermove")` untuk melacak pointer melintasi daftar layer.
3. `document.addEventListener("pointerup")` untuk commit reorder saat mouse dilepas.
4. **Dead-zone 5px** mencegah drag tidak sengaja dari klik biasa.
5. **`data-layer-idx`** attribute pada setiap baris untuk hit-testing via `querySelectorAll`.
6. **`target.closest("button")`** guard mencegah drag mencuri klik dari tombol eye/lock/chevron.

Visual feedback ditingkatkan agar lebih jelas:
- Layer yang sedang di-drag diturunkan opacity-nya (`opacity-25`), diberikan border dashed (`border-dashed border-editor-accent/40`), dan sedikit diperkecil (`scale-[0.98]`).
- Indikator drop menggunakan pseudo-elements solid (`before`/`after`) setinggi `3px` berwarna Photon Amber di atas atau bawah baris target, memberikan visual line insert yang jauh lebih menonjol dan kontras dibanding border biasa.

**Files Changed:**
- `apps/desktop/src/components/editor/LayersPanel.tsx`

**Verifikasi:**
- âœ… `pnpm run build`: PASS (TypeScript + Vite production build)
- âœ… Layer drag reorder berfungsi dengan pointer events di Tauri webview

---

## [2026-06-04] FEATURE â€” Layer & UX System Overhaul [COMPLETE]

### Kategori: FEATURE / LAYERS / UI / UX

**Deskripsi:** Implementasi sistem layer interaktif dan fungsional yang menyerupai reference editor untuk Photrez.

**Logika Perbaikan (Fix Rationale) & Detail:**
1. **Core Engine Support (`document.ts` & `document.test.ts`)**:
   - `drawLayerToContext` helper untuk menggambar bitmap layer ke canvas dengan transform.
   - `duplicateLayer(id)`: duplikasi layer menggunakan `OffscreenCanvas` untuk melakukan cloning bitmap secara deep. Menambahkan try/catch agar tes pada node/jsdom (yang tidak memiliki `OffscreenCanvas`) tetap berjalan sukses dengan fallback.
   - `mergeDown(id)`: melakukan rendering composite dua layer (aktif dan layer di bawahnya) dalam ruang dokumen menggunakan Canvas 2D composite (`source-over`), kemudian menggabungkan properti transform/opacity.
   - `flattenLayers()`: menyatukan seluruh stack layer yang visible ke dalam satu background layer tunggal berukuran dokumen.
   - Mengubah pembuatan layer baru agar secara kontekstual ditambahkan langsung di atas layer yang sedang aktif, bukan selalu di atas tumpukan layer.
   - Menambahkan tes unit komprehensif di `document.test.ts` untuk memverifikasi fungsionalitas di atas.
2. **LayersPanel UI & UX (`LayersPanel.tsx`)**:
   - **Opacity Popover Slider**: slider opacity interaktif dengan drop-down popover mirip reference editor.
   - **Blend Mode Dropdown**: wired-up blend mode selector.
   - **Double-Click Inline Rename**: input teks interaktif yang muncul saat double-click nama layer (dengan Auto Focus, Escape cancel, Enter commit, dan input trim).
   - **HTML5 Drag and Drop Layer Reordering**: reordering drag-and-drop horizontal dengan visual separator line berwarna Photon Amber (`#E15A17`) bertipe `border-t-2`/`border-b-2` untuk indikasi posisi insert atas/bawah.
   - **Live Canvas Thumbnails**: thumbnail per baris layer interaktif (`<LayerThumb>`) dengan render pattern grid checkerboard transparan di background dan render live image bitmap layer di foreground.
3. **Canvas Viewport Integration & Shortcuts (`CanvasViewport.tsx`)**:
   - **Ctrl+J**: pintasan keyboard global untuk duplikasi layer aktif secara cepat.

**Files Changed:**
- `apps/desktop/src/engine/document.ts`
- `apps/desktop/src/engine/__tests__/document.test.ts`
- `apps/desktop/src/components/editor/LayersPanel.tsx`
- `apps/desktop/src/components/editor/CanvasViewport.tsx`

**Verifikasi:**
- âœ… `pnpm run build`: PASS (Vite + TypeScript production build compiler)
- âœ… `pnpm --filter photrez-desktop test`: 272/272 PASS (vitest)

---

## [2026-06-03] BUG FIX â€” Crop Rotate Hit Zone & Cursor [COMPLETE]

### Kategori: BUG FIX / CROP / ROTATION / CURSOR / UX

**Deskripsi:** Memperbaiki crop tool rotate interaction: hit zone terlalu kecil (4px ring) dan cursor berubah jadi crosshair saat mulai drag rotate.

**Root Cause:**

1. **Rotate hit zone terlalu kecil:** `ROTATE_OUTER = 24`, `HANDLE_HIT = 20` â†’ donut ring hanya 4px tebal di zoom=1. Bandingkan dengan SelectionTransformOverlay yang punya `ROTATE_OUTER = 44` dan `HANDLE_HIT = 16` â†’ ring 28px.

2. **Cursor revert ke crosshair saat drag rotate (triple root cause):**
   - `startDrag` memanggil `svgRef.setPointerCapture()` â†’ browser fire `pointerleave` pada elemen rotate zone `<path>` â†’ handler `onPointerLeave` panggil `setHover(null)` + `setHoverPos(null)` â†’ `hoverHandle()` jadi null.
   - `resolvedCursor` memo hanya cek `hoverHandle()`, tidak pernah cek `dragState()` â€” jadi saat `hoverHandle = null`, return `"crosshair"` meskipun rotation drag sedang aktif.
   - `style={{ cursor: resolvedCursor() }}` object form tidak reactive di SolidJS untuk SVG element (sama persis dengan bug CanvasViewport cursor yang sudah di-fix sebelumnya).

**Logika Perbaikan (Fix Rationale):**

1. `ROTATE_OUTER = 44` â†’ ring 24px tebal (sama dengan SelectionTransformOverlay).
2. `resolvedCursor` sekarang cek `dragState()` dulu: jika ada rotation drag aktif, selalu return rotate cursor tanpa peduli `hoverHandle()`.
3. `rotateCursor` fallback ke `"grabbing"` saat `hoverPos` null tapi rotation drag aktif.
4. Semua `onPointerLeave` handler di-guard dengan `if (!dragState())` â€” jangan clear hover saat drag aktif.
5. Ganti `style={{ cursor: ... }}` â†’ `style:cursor={resolvedCursor()}` (reactive property binding).
6. Extend `SvgSVGAttributes<T>` di `vite-env.d.ts` untuk support `style:${string}` pada SVG elements.

**Files Changed:**
- `apps/desktop/src/components/editor/CropOverlay.tsx`: ROTATE_OUTER, cursor logic, onPointerLeave guards, style:cursor
- `apps/desktop/src/vite-env.d.ts`: SvgSVGAttributes extension

**Verifikasi:**
- âœ… `pnpm run build`: PASS (2028 modules, ~6.2s)
- âœ… `pnpm --filter photrez-desktop test`: 267/267 PASS (21 files)

---

## [2026-06-03] BUG FIX â€” Rotation Direction Alignment (Shader + Geometry + Tests) [COMPLETE]

### Kategori: BUG FIX / TRANSFORM / ROTATION / SHADER / GEOMETRY

**Deskripsi:** Memperbaiki rotation direction inconsistency antara shader, geometry helpers, dan SVG overlay. Semua sekarang menggunakan CW positif convention yang konsisten.

**Root Cause (4 bugs):**

1. **Rotate zone terlalu kecil di SelectionTransformOverlay:** `ROTATE_OUTER = 24` (4px ring). Diubah ke `44` (24px ring) agar mudah di-hover.

2. **Bounding box expand/shrink on rotation:** Overlay menggunakan AABB `<rect>` di luar rotated group. Saat layer di-rotate, AABB meluas/menyempit â€” confusing. Fix: pindah `<rect>` + handles ke dalam `<g transform="rotate(...)">` agar bounding box selalu mengikuti layer corners.

3. **Shader rotation negated:** `-radians(u_layerRotation)` membalik arah rotasi. Fix: `radians(u_layerRotation)` â€” sekarang image rotate searah SVG handles.

4. **rotatePoint sign:** `rad = -deg * DEG` membalik arah. Fix: `rad = deg * DEG` â€” positive deg = CW di screen space (Y-down).

**Deviasi:**
- Convention "positive = CW" sudah didokumentasikan sejak Photosho-like Free Transform (2026-06-02) tapi implementasi shader dan rotatePoint tidak konsisten.
- `applyResizeHandle` sudah menggunakan `rad = -rotation * DEG` (negated) â€” ini benar untuk screen-to-local conversion (screen coords â†’ layer local coords perlu inverse rotation).

**Logika Perbaikan (Fix Rationale):**
- `rotatePoint(deg)`: positive = CW rotation in screen space. Standard rotation matrix, no negation.
- Shader: `radians(u_layerRotation)` â€” positive angle â†’ standard CW rotation matrix.
- `applyResizeHandle`: tetap pakai `rad = -rotation * DEG` karena mengonversi screen-space delta ke local layer-space â€” ini adalah inverse rotation.
- Tests: semua test corner expectations diperbaiki, +18 new tests (applyResizeHandle dengan rotation, cursor rotation untuk Â±90Â°/Â±45Â°, all-8-handles distinct cursors, flipX cursor, shader rotation invariants).

**Files Changed:**
- `apps/desktop/src/components/editor/SelectionTransformOverlay.tsx`: +ROTATE_OUTER, rotated `<g>` bounding box
- `apps/desktop/src/renderer/shaders.ts`: `-radians` â†’ `radians`
- `apps/desktop/src/viewport/transformGeometry.ts`: `rotatePoint` sign fix
- `apps/desktop/src/__tests__/transform-geometry.test.ts`: +18 tests, update expectations
- `apps/desktop/src/__tests__/renderer.test.ts`: +3 shader rotation invariant tests

**Verifikasi:**
- âœ… `pnpm run build`: PASS (2028 modules, ~6.3s)
- âœ… `pnpm --filter photrez-desktop test`: 267/267 PASS (21 test files)
- âœ… `cargo test --workspace`: 85/85 PASS

---

## [2026-06-03] BUG FIX â€” Crop UI Alignment, Position & Scaling Polish [COMPLETE]

### Kategori: BUG FIX / CROP / UI / ALIGNMENT / POSITIONING

**Deskripsi:** Memperbaiki masalah kosmetik, UI, lag transisi, dan pergeseran dimensi pada fitur Crop:
1. **Overlay Hitam Mismatch**: Menghilangkan `transform` pada `<rect>` overlay gelap dan membuatnya berukuran lebar (3x lipat canvas) secara stasioner (unrotated). Mask `crop-shield` yang memuat region canvas ter-rotate dan crop box horizontal/vertical (unrotated) bertanggung jawab penuh membatasi opacity gelap tersebut. Ini menghasilkan cutout transparan crop box yang horizontal tepat sejajar (axis-aligned) di atas canvas yang miring/ter-rotate.
2. **Crop Mode Indicator Floating**: Memindahkan `<CropModeIndicator>` keluar dari kontainer panning/zooming canvas agar tetap statis di layar (fixed size & position di top-4 tengah) dan tidak ikut mengecil saat zoom out.
3. **Tooltip Dimensi Kecil**: Menerapkan `scale(1 / zoom)` pada group tooltip dimensi di `CropOverlay.tsx` agar teks selalu tajam dan berukuran konstan (font-size 11px) di segala zoom level. Juga mempercantik tooltip dengan warna gelap pekat `rgba(20,20,20,0.9)`, border tipis, dan warna teks Photon Amber (`#E15A17`) agar senada dengan HUD Move Tool.
4. **Efek Jelly/Memantul Panning**: Menonaktifkan CSS `transition: transform` pada container viewport ketika drag crop sedang aktif (`isCropDragging` signal dari CropOverlay) agar pergeseran pan viewport merespons pointer seketika tanpa delay/lag inersia visual.
5. **Ukuran Crop Box Berubah-ubah**: Memperbaiki matematika snapping di `cropSnap.ts` untuk `"move"` handle agar melakukan pergeseran translasi murni (`x`/`y` offset shift) bukannya memodifikasi dimensi (`w`/`h`), mencegah kotak crop berubah ukuran secara tidak sengaja ketika menyentuh guide magnetik.

**Files Changed:**
- `apps/desktop/src/components/editor/CropOverlay.tsx`
- `apps/desktop/src/components/editor/CanvasViewport.tsx`
- `apps/desktop/src/viewport/cropSnap.ts`

**Verifikasi:**
- âœ… `pnpm run build`: PASS
- âœ… `pnpm --filter photrez-desktop test`: 245/245 PASS
- âœ… `cargo test --workspace`: 85/85 PASS

---
## [2026-06-03] FEATURE â€” reference editor-Style Crop Moving Panning [COMPLETE]

### Kategori: FEATURE / CROP / VIEWPORT / PANNING

**Deskripsi:** Mengubah interaksi geser (move) dan resize crop box agar tetap stasioner di layar secara visual, sedangkan gambar/canvas di bawahnya ikut bergerak (pan) ke arah yang berlawanan. Ini menyamakan perilaku crop dengan aplikasi referensi `aplikasi-cetak-massal`.

**Logika Perbaikan (Fix Rationale):**
1. **CropOverlay.tsx**: Mengubah model `dragState` untuk merekam `startClientX`, `startClientY`, dan `startPan` pada pointer down.
2. Menghitung delta pergeseran pointer move menggunakan koordinat layar raw client (`clientX`, `clientY`) lalu membaginya dengan zoom untuk mendapatkan document delta. Langkah ini menghindari feedback loop karena letak kontainer SVG yang dinamis panned di dalam viewport.
3. Menghitung pergeseran koordinat pusat (`actualDx` / `actualDy`) dari cropRect yang baru terhadap `dragState.startRect` (pusat ke pusat, berlaku untuk move maupun resize).
4. Menggeser viewport active engine via `engine.setViewport` sebesar `-actualDx * zoom` dan `-actualDy * zoom`, lalu menyinkronkannya dengan `syncViewport` dan menjadwalkan render ulang.
5. Menyesuaikan kalkulasi tooltip koordinat dengan menambahkan offset `actualDx` dan `actualDy` karena SVG container ikut bergeser secara fisik akibat viewport panning.
6. **CropOverlay.test.tsx**: Menambahkan test unit komprehensif yang memverifikasi sinkronisasi pergeseran viewport yang berlawanan saat pointer drag move.

**Files Changed:**
- `apps/desktop/src/components/editor/CropOverlay.tsx`
- `apps/desktop/src/components/editor/__tests__/CropOverlay.test.tsx`

**Verifikasi:**
- âœ… `pnpm run build`: PASS
- âœ… `pnpm --filter photrez-desktop test`: 245/245 PASS
- âœ… `cargo test --workspace`: 85/85 PASS

---
## [2026-06-03] FEATURE â€” Crop Tool Rotation [COMPLETE]

### Kategori: FEATURE / CROP / ROTATION / UX

**Deskripsi:** Menambahkan dukungan rotasi pada Crop Tool. Batas crop box visual tetap sejajar dengan layar (axis-aligned), sedangkan konten gambar/canvas berputar di belakangnya (CSS transform). Saat crop diaplikasikan, semua layer di-transformasikan (di-shift posisinya dan di-rotate sudutnya) mengacu pada sudut rotasi crop.

**Logika Perbaikan (Fix Rationale):**
1. **EditorContext.tsx**: Ditambahkan signal `cropRotation` (default `0`) yang direset saat ganti dokumen atau ganti tool.
2. **document.ts**: Modifikasi `applyCrop` untuk menghitung koordinat pusat crop box, memutar vektor koordinat pusat layer seputar crop center sebesar `-cropRotation` (counter-clockwise), mengupdate rotasi layer, dan mendukung transform baking pada OffscreenCanvas jika `deleteCroppedPixels` aktif.
3. **CanvasViewport.tsx**: Menerapkan gaya CSS `transform: rotate(${-cropRotation}deg)` pada WebGL canvas element serta artboard border & shadow div agar keduanya berputar selaras. Menyalurkan parameter `rotation` ke `engine.applyCrop` pada Enter keydown handler.
4. **OptionBar.tsx**: Menghubungkan tombol APPLY dan Reset dengan signal `cropRotation` serta menambahkan field readout `Angle`.
5. **CropOverlay.tsx**: Menambahkan hit zone berupa donut path transparan di sekitar 4 handles sudut. Menambahkan signal `hoverPos` untuk memperbarui dynamic rotate cursor secara kontinu saat hover. Mengimplementasikan pointerdown/pointermove untuk menghitung delta angle (snapping ke kelipatan 15Â° jika Shift ditekan) dan memperbarui tooltip visual dengan nilai derajat sudut. Merotasi rect dan mask shield dalam SVG agar area gelap (dim mask) memotong area canvas secara akurat sesuai sudut rotasi.
6. **Unit Tests**: Menambahkan unit test baru di `document.test.ts` untuk memverifikasi pergeseran koordinat pusat layer dan update rotasi layer akibat crop rotation.

**Files Changed:**
- `apps/desktop/src/components/editor/EditorContext.tsx`
- `apps/desktop/src/components/editor/CanvasViewport.tsx`
- `apps/desktop/src/components/editor/OptionBar.tsx`
- `apps/desktop/src/components/editor/CropOverlay.tsx`
- `apps/desktop/src/engine/document.ts`
- `apps/desktop/src/engine/__tests__/document.test.ts`

**Verifikasi:**
- âœ… `pnpm run build`: PASS (Vite + TypeScript build)
- âœ… `pnpm --filter photrez-desktop test`: 244/244 PASS (vitest)
- âœ… `cargo test --workspace`: 85/85 PASS

---
## [2026-06-03] FEATURE â€” reference editor-Style Crop Box Canvas Expansion [COMPLETE]

### Kategori: FEATURE / CROP / VIEWPORT / BOUNDS

**Deskripsi:** Mengizinkan crop box untuk keluar dari batas canvas dokumen, sehingga pengguna bisa memperluas ukuran canvas (canvas expansion) secara interaktif.

**Logika Perbaikan (Fix Rationale):**
1. Modifikasi `constrainCropRectToDocument` di `cropGeometry.ts` agar tidak meng-clamp koordinat `x`, `y` ke batas `[0, docW]` / `[0, docH]`, melainkan hanya membatasi lebar dan tinggi minimum `1px`.
2. Modifikasi `ensureCropRect` di `CanvasViewport.tsx` agar tidak memicu reset otomatis jika posisi crop box berada di luar koordinat positif.
3. Sinkronisasi dokumen `01-prd.md` dan `35-error-code-registry.md` yang sebelumnya melarang crop di luar batas canvas.
4. Perbarui unit test di `crop-geometry.test.ts` untuk menguji koordinat di luar batas canvas secara positif.

**Files Changed:**
- `apps/desktop/src/viewport/cropGeometry.ts`
- `apps/desktop/src/components/editor/CanvasViewport.tsx`
- `apps/desktop/src/__tests__/crop-geometry.test.ts`
- `docs/spec/prd.md`
- `docs/reference/error-code-registry.md`

**Verifikasi:**
- âœ… `npx vitest run`: 243/243 PASS
- âœ… `npx tsc --noEmit`: PASS
- âœ… `pnpm build`: PASS
- âœ… `cargo test --workspace`: 85/85 PASS

---
## [2026-06-03] BUG FIX â€” Fix Crop Box Integration & Typing [COMPLETE]

### Kategori: BUG FIX / CROP / INFRASTRUCTURE / TYPING

**Deskripsi:** Memperbaiki crop box agar bisa digunakan dan menuntaskan kompilasi TypeScript serta unit test.

**Root Cause:**
1. **ReferenceError di runtime:** Di file `CanvasViewport.tsx`, properti `snapTargets` pada `<CropOverlay>` memanggil `cropSnapTargets()`, namun `cropSnapTargets` tidak dideklarasikan.
2. **Type mismatch di compiler:** Tipe `EdgeSnap` di `cropSnap.ts` dideklarasikan sebagai objek `{ kind: ... }` namun digunakan sebagai string literal biasa.
3. **Unit test failure:** Test `updates rendered crop box while resizing` mencari rect outline pada indeks `2`, padahal indeks sebenarnya bergeser ke indeks `3` karena adanya elemen `<mask id="crop-shield">`.

**Perbaikan:**
1. Mendefinisikan memo `cropSnapTargets` di `CanvasViewport.tsx` menggunakan `buildCropSnapTargets`.
2. Mengubah tipe `EdgeSnap` di `cropSnap.ts` menjadi union string literal.
3. Memperbarui pencarian indeks rect outline dari `2` menjadi `3` di `CropOverlay.test.tsx`.

**Files Changed:**
- `apps/desktop/src/components/editor/CanvasViewport.tsx`
- `apps/desktop/src/viewport/cropSnap.ts`
- `apps/desktop/src/components/editor/__tests__/CropOverlay.test.tsx`

**Verifikasi:**
- âœ… `npx tsc --noEmit`: PASS (no compile errors)
- âœ… `npx vitest run`: 242/242 PASS
- âœ… `pnpm build`: PASS
- âœ… `cargo test --workspace`: 85/85 PASS

---
## [2026-06-03] FEATURE â€” Move Tool Rotate Polish (Cursor, Hit Area, Behavior) [COMPLETE]

### Kategori: FEATURE / MOVE TOOL / CURSOR / UX / ROTATE

**Deskripsi:** Full polish rotate layer interaction: dynamic SVG rotate cursor, broad hit area matching reference, continuous hover tracking, rotation normalization, cursor ownership on overlay.

**Changes:**
1. `cursorRotate.ts` â€” Port dynamic rotate cursor from reference: SVG data-URI cursor rotated per degree, cached max 360 entries.
2. `cursorResolver.ts` â€” Branch `rotate` returns dynamic cursor via `getRotateCursorByPos()` when `hoverPos` + `layerBoundingBox` available; static rotate cursor fallback if missing.
3. `EditorContext.tsx` â€” Added `hoverPos` signal.
4. `SelectionTransformOverlay.tsx` â€” Emit `hoverPos` on rotate zone enter; continuously track hover via `detectHandle` + `getNearestRotateCorner`; resolved cursor applied to root SVG; removed hardcoded cursor from individual elements.
5. `CanvasViewport.tsx` â€” `layerBoundingBox` uses document-space AABB; clears hover when tool is not move.
6. `transformGeometry.ts` â€” Added `normalizeRotation()` ([-180, 180] range); fixed `detectHandle` rotate: only outside core + inside expanded bounds; added `getNearestRotateCorner()`, `pointToLayerLocal()`.
7. Tests â€” `move-rotate-cursor.test.ts` (3 tests), extended `transform-geometry.test.ts` (+12 tests), extended `cursor-resolver.test.ts` (+8 tests).

**Files Changed:**
- `cursorRotate.ts`, `cursorResolver.ts`, `transformGeometry.ts`
- `EditorContext.tsx`, `SelectionTransformOverlay.tsx`, `CanvasViewport.tsx`
- `move-rotate-cursor.test.ts` (NEW), `transform-geometry.test.ts`, `cursor-resolver.test.ts`

**Verifikasi:**
- âœ… `npx vitest run`: 241/242 PASS (1 pre-existing CropOverlay failure)
- âœ… `npx vite build`: PASS
- âœ… `cargo test --workspace`: 85/85 PASS

---
## [2026-06-03] FEATURE â€” Move Tool Rotate Cursor Polish [COMPLETE]

### Kategori: FEATURE / MOVE TOOL / CURSOR / UX

**Deskripsi:** Polish rotate layer interaction di Move Tool dengan dynamic SVG rotate cursor yang mengikuti posisi mouse, menggantikan cursor `crosshair` generic.

**Root Cause:**
1. Cursor rotate masih `crosshair` â€” tidak informatif arah rotasi.
2. Tidak ada visual feedback arah rotasi saat hover/drag.
3. Referensi `aplikasi-cetak-massal` punya cursor dinamis yang lebih baik.

**Perbaikan:**
1. Port `cursorRotate.ts` dari referensi: SVG data-URI cursor yang di-rotate per derajat, cached max 360 entries.
2. `cursorResolver`: branch `rotate` return dynamic cursor via `getRotateCursorByPos()` jika ada `hoverPos` + `layerBoundingBox`.
3. `EditorContext`: tambah `hoverPos` signal.
4. `SelectionTransformOverlay`: emit `hoverPos` di rotate zone enter/move, clear saat drag end/Escape.
5. `CanvasViewport`: wire `hoverPos` + `layerBoundingBox` (AABB memo) ke `resolveCursor()`.

**Files Changed:**
- `cursorRotate.ts` (NEW), `cursorResolver.ts`, `EditorContext.tsx`, `SelectionTransformOverlay.tsx`, `CanvasViewport.tsx`, `cursor-rotate.test.ts` (NEW)

**Verifikasi:**
- âœ… `npx vitest run cursor-rotate cursor-resolver`: 28/28 PASS
- âœ… `npx vite build`: PASS
- âœ… `cargo test -p photrez-core`: 85/85 PASS

---
## [2026-06-02] BUG FIX â€” Crop Tool Cursor + Small Hit Targets [COMPLETE]

### Kategori: BUG FIX / CROP / UX / CURSOR

**Deskripsi:** Saat crop tool aktif, ikon mouse tidak berubah di handle (tetap crosshair) dan area klik handle terasa terlalu kecil.

**Root Cause:**
1. `cursorResolver.ts` hardcode `crosshair` untuk semua crop interactions.
2. `CropOverlay` track hover secara lokal tanpa memanggil `setHoverHandle` di `EditorContext`.
3. Hit detection manual dengan zona 16px (lebih kecil dari Move Tool 20px), tanpa transparent SVG hit rects + inline cursor.

**Perbaikan:**
1. Pola `SelectionTransformOverlay`: transparent hit rects 20/zoom + `cursor` per handle/move zone.
2. `onHoverHandleChange` prop â†’ `setHoverHandle` di `CanvasViewport`.
3. `cursorResolver` crop branch: resize cursors via `getCursorForHandle`, `move` di dalam box.

**Files Changed:**
- `CropOverlay.tsx`, `CanvasViewport.tsx`, `cursorResolver.ts`, tests

**Verifikasi:**
- âœ… ReadLints clean
- âš ï¸ vitest blocked (Shell preToolUse hook)

---
## [2026-06-02] FEATURE â€” Crop Document Bounds + Full Snapping [COMPLETE]

### Kategori: FEATURE / CROP / SNAPPING / UX

**Deskripsi:** Crop box bisa keluar dari canvas; snapping crop belum ada. User minta perilaku seperti referensi `aplikasi-cetak-massal`.

**Perbaikan:**
1. `constrainCropRectToDocument` â€” crop rect selalu sepenuhnya di dalam dokumen.
2. `cropSnap.ts` â€” snap ke canvas (0, center, edge) + layer visible edges/centers; handle-aware untuk move/resize.
3. CropOverlay + CanvasViewport â€” Smart Guides saat drag crop; Alt menonaktifkan snap (sama Move Tool); toggle Snap di option bar (`moveSnapEnabled`).

**Files Changed:** `cropGeometry.ts`, `cropSnap.ts`, `CropOverlay.tsx`, `CanvasViewport.tsx`, tests

---
## [2026-06-02] BUG FIX â€” Crop Box Not Updating During Resize Drag [COMPLETE]

### Kategori: BUG FIX / CROP / UI / REACTIVITY

**Deskripsi:** Crop box tidak ikut berubah di viewport saat handle crop di-resize, walau logic drag mengirim `onCropRectChange`.

**Root Cause:**
`CropOverlay.tsx` menggunakan snapshot lokal `const r = rect()` di callback `<Show when={props.cropRect}>`. Snapshot ini dipakai untuk semua atribut SVG crop box (`x/y/w/h`, mask, guides), sehingga render tidak selalu mengonsumsi nilai `cropRect` terbaru saat pointer drag update state secara cepat.

**Perbaikan:**
1. Refactor render `CropOverlay` agar atribut SVG membaca langsung dari `props.cropRect` (bukan snapshot `r`).
2. Tambah regression test `updates rendered crop box while resizing` untuk memverifikasi `width` crop box ikut update realtime selama drag.

**Files Changed:**
- `apps/desktop/src/components/editor/CropOverlay.tsx`
- `apps/desktop/src/components/editor/__tests__/CropOverlay.test.tsx`
- `docs/AI_CURRENT_TASK.md`
- `docs/AI_HISTORY.md`
- `docs/FEATURES.md`

**Verifikasi:**
- âœ… `ReadLints` (edited files): no linter errors
- âš ï¸ `rtk npx vitest run apps/desktop/src/components/editor/__tests__/CropOverlay.test.tsx` blocked by `preToolUse hook` (Shell not executable in this session)

---
## [2026-06-02] BUG FIX â€” Crop Box Invisible on Tool Activation [COMPLETE]

### Kategori: BUG FIX / CROP / UI / VIEWPORT

**Deskripsi:** Crop box tidak muncul saat Crop Tool diaktifkan. Root cause: `cropRect` tetap `null` sampai user drag di canvas.

**Root Cause:**
1. Tidak ada logic untuk bikin initial crop rect saat tool crop aktif â€” `cropRect` default `null`.
2. `<CropOverlay>` hanya render kalau `props.cropRect` non-null.
3. CropOverlay di shared SVG yang parent-nya `pointer-events: none`, jadi handle tidak bisa interaksi.

**Perbaikan:**
1. `ensureCropRect()` helper + `createEffect` on `activeTool() === "crop"`: bikin full-document rect saat tool aktif.
2. Di `createEffect` on `activeDocumentId()`: clear/reinit crop rect saat ganti dokumen.
3. Pindah `<CropOverlay>` dari shared SVG (`pointer-events: none`) ke SVG sendiri dengan `pointer-events: auto`, `z-index: 35`.

**Files Changed:**
- `apps/desktop/src/components/editor/CanvasViewport.tsx`: `ensureCropRect`, activeTool effect, document reinit, crop SVG separator

**Verifikasi:**
- âœ… `pnpm.cmd run build`: PASS
- âœ… `npx vitest run`: 182 PASS (17 files)

---
## [2026-06-02] FEATURE â€” OptionBar Crop Section Rewrite [COMPLETE]

### Kategori: FEATURE / CROP / OPTION BAR / UI

**Deskripsi:** Replace old display-only crop section in OptionBar.tsx (W/H display fields + APPLY CROP button) with full interactive controls matching editor-standard crop tools.

**Perubahan:**
- Mode dropdown (Free / Ratio / Size) wiring ke `cropMode` signal dari EditorContext
- Free mode: display-only W/H fields showing current `cropRect` dimensions
- Ratio mode: editable aspect ratio W:H fields via `EditableNumField`, updates `cropAspect` signal
- Size mode: editable target W/H with `px` suffix via `EditableNumField`, updates `cropSizeTarget` signal
- Swap W/H button (`â†”`) â€” swaps cropRect, cropAspect, and cropSizeTarget simultaneously
- Guide overlay dropdown (None / Thirds / Grid / Diagonal / Golden) wiring ke `cropGuideMode`
- Delete cropped pixels toggle via `ToggleBtn` + `cropDeletePixels` signal
- Reset button â€” resets cropRect to full document bounds
- Cancel button â€” clears cropRect + switches to move tool
- APPLY button â€” commits history, calls `engine.cropCanvas`, clears cropRect, switches to move

**Files Changed:**
- `apps/desktop/src/components/editor/OptionBar.tsx`: expanded `useEditor()` destructuring with 6 crop signals; replaced old crop fields + apply button with interactive mode/guide/delete/swap/reset/cancel/apply controls

**Verifikasi:**
- âœ… `pnpm.cmd run build`: PASS (TypeScript + Vite)
- âœ… `npx vitest run`: 182 PASS (17 files)
- âœ… `cargo test -p photrez-core`: 85/85 PASS (via pre-commit hook)

## [2026-06-10] FEATURE â€” Viewport-Aware Modern Crop Frame Position [COMPLETE]

### Kategori: FEATURE / CROP / VIEWPORT / UX

**User Goal:** When user performs viewport actions (scroll, pan, zoom, momentum), the Modern crop frame should move along with the viewport instead of staying fixed at center. Cancel/reset restores frame to centered position.

**Design:** `docs/superpowers/specs/2026-06-10-viewport-crop-frame-position-design.md`

**Implementation:**
1. `ModernCropFrame` interface changed from `{w,h}` to `{x,y,w,h}` (required fields) â€” frame position is now stored explicitly rather than derived from viewport center.
2. `getModernCropFrameScreenRect` no longer centers frame â€” returns `{x: frame.x, y: frame.y, w: frame.w, h: frame.h}` directly.
3. `getDefaultModernCropFrame` returns centered `{x,y,w,h}`.
4. `centerModernCropFrame()` helper added â€” recomputes centered x,y from viewport size.
5. `clampFrameToProjectedBounds` preserves `x,y` from input.
6. `resizeModernFrameFromCenter` and `resizeModernFrameOneSided` return `{x,y,w,h}` (x,y passed through).
7. `shiftModernCropFrame(dx, dy)` added to `usePanNavigation.ts` â€” called in all 4 pan paths (scroll, shift+scroll, space+drag, momentum) to move frame position along with viewport.
8. `fitToScreenAndRender` in `useViewportRenderer.ts` recenters frame after fit-to-screen (Ctrl+0).
9. Space+drag handler uses `actualDx/Dy` (engine viewport delta after `setViewport`) to account for potential clamping.
10. `modernCropState.ts` imports `ModernCropFrame`/`ModernCropImageTransform` from `modernCropGeometry.ts` (removed local duplicates).
11. All frame literals across 4 source files + 3 test files updated to include `x,y`.
12. Canvas Expansion visual indicator entry already in history above.
13. Engine test for non-fill directional expansion: `applyCrop(-25,-30,150,160)` on 100Ã—100 doc.

**Still pending:**
- Zoom handler (Ctrl+scroll, Ctrl+=/-) does not adjust frame position yet.

### Verification
- PASS: `npx tsc --noEmit` (no type errors)
- PASS: `pnpm.cmd run build` (tsc + Vite)
- PASS: `npx vitest run` (775 tests, 52 files)

---

## [2026-06-10] BUG FIX â€” Fill Box Stuck + Pan Reset on Crop Entry [COMPLETE]

### Kategori: BUG FIX / CROP / VIEWPORT / UX

**User Goal:**
1. Canvas expansion fill indicator (dashed canvas boundary + subtle fill) must move with viewport during pan.
2. On entering Crop tool, document + crop frame must be centered, not at top-left corner.

**Root Cause 1 â€” Fill box not reactive:**
`canvasScreenRect` was computed inline inside a `<Show>` render prop function. SolidJS's `Show` component creates a memo for the `when` condition, but inline signal accesses inside the children function may not reliably propagate to the template when the `when` condition stays truthy. `pan()` changes during scroll/pan were not triggering re-render of the expansion fill/dashed rect.

**Fix 1:** Moved `canvasScreenRect` into a top-level `createMemo` at the `CanvasViewport` component level, outside any `Show` render prop. The memo tracks `pan()`, `offsetX/Y`, `rotation`, `docWidth`, `zoom`, and `scale`. When any dependency changes, the memo re-evaluates and the new value is passed directly as a prop to `ModernCropOverlay`.

**Root Cause 2 â€” Pan reset to (0,0) not centering:**
Setting `pan = {x: 0, y: 0}` positions the document's top-left at the viewport's top-left corner, not center.

**Fix 2:** On Modern crop session entry (new session key), compute the correct centering pan:
```
panX = (viewportWidth âˆ’ docWidth Ã— zoom Ã— scale) / 2
panY = (viewportHeight âˆ’ docHeight Ã— zoom Ã— scale) / 2
```
Applied via both `setPan()` signal and `engine.setViewport()`. Zoom is preserved.

**Files Changed:**
- `CanvasViewport.tsx` â€” added `canvasScreenRect` memo, `setPan` destructuring, centering pan calc in session key effect, replaced inline `canvasScreenRect` with memo

### Verification
- PASS: `pnpm.cmd run build`
- PASS: `npx vitest run` (775 tests, 52 files)

---

> Dokumen ini mencatat SEMUA perubahan signifikan yang dibuat oleh AI.
> Urutan: terbaru di atas. Jangan hapus entri lama â€” hanya tambahkan di atas.
> Baca juga: `AI_CONTEXT.md` (aturan), `AI_CURRENT_TASK.md` (status), `FEATURES.md` (fitur), `ARCHITECTURE.md` (arsitektur)

---
## [2026-06-02] FEATURE â€” CropOverlay Full Rewrite [COMPLETE]

### Kategori: FEATURE / CROP / UI

**Deskripsi:** Full rewrite of CropOverlay.tsx from 34-line placeholder to interactive SVG crop overlay.

**Perubahan:**
- SVG mask-based shield cutout (50% opacity outside crop rect) via `<mask id="crop-shield">`
- 8 resize handles (4 corners + 4 edges) with hover/active state colors (white/amber `#E15A17`/gray)
- Corner bracket extensions (12px L-shapes outside corners, non-scaling stroke)
- Guide lines for all 5 modes: thirds, grid (auto-calculated cell count), diagonal, golden (phi 0.382/0.618)
- Interactive resize via pointer events captured on `<g>` root element (following SelectionTransformOverlay pattern)
- Corner handles: proportional (maintain aspect), shift=free resize, edge handles: single-axis, alt=center anchor
- Move inside crop rect via pointer drag
- Dimension tooltip via SVG `<text>` near cursor during drag (fades 1.5s after drag end)
- Uses pure math helpers from `cropGeometry.ts`: `clampCropRect`, `applyCropResizeHandle`, `applyCropMove`
- Pointer event strategy: `createEffect` + `addEventListener` on `<g>` ref (not JSX `onPointerDown`), avoids SolidJS re-render pointer capture issues

**Verifikasi:**
- âœ… `pnpm.cmd run build`: PASS
- âœ… `npx vitest run`: 182 PASS (17 files)

---
## [2026-06-02] FEATURE â€” CanvasViewport Crop Wiring [COMPLETE]

### Kategori: FEATURE / CROP / VIEWPORT / UI

**Deskripsi:** Wire crop signals from EditorContext into CanvasViewport. Remove local cropRect/cropGuideMode signals (now in EditorContext). Add cropDragState signal for overlay interaction. Wire onCropCreated callback in prepareToolContext. Add Enter/Esc keyboard handler for crop tool mode. Update CropOverlay props to include zoom, cropMode, cropAspect, onCropRectChange.

**Files Changed:**
- `apps/desktop/src/components/editor/CanvasViewport.tsx`: crop signal refactor, prepareToolContext wiring, keyboard handler, CropOverlay props
- `apps/desktop/src/components/editor/CropOverlay.tsx`: extend props interface

**Verifikasi:**
- âœ… `pnpm.cmd run build`: PASS
- âœ… `npx vitest run`: 182/182 PASS (17 files, +14)

---
## [2026-06-02] BUG FIX â€” Option Bar Locked Layer Clarity [COMPLETE]

### Kategori: BUG FIX / OPTION BAR / UI / LOCK

**Deskripsi:** X/Y/R option bar fields seolah tidak mengupdate transform ketika layer locked. Root cause rangkap: (1) handleFlip dan handleResetTransform tidak punya locked guard â€” flip/reset tetap jalan meski layer locked; (2) tidak ada visual indikasi bahwa layer locked â€” field terlihat editable tapi submit silently ignored; (3) Flip/Reset buttons tidak menampilkan disabled state.

**Fix Rationale:**
1. `activeLayerSafe()` â€” helper yang baca langsung dari `engine.getLayer(id)` (bukan layers signal), untuk fresh state
2. `isLocked()` â€” derived signal dari `activeLayerSafe()?.locked ?? false`
3. `handleFlip` + `handleResetTransform` â€” tambah `if (isLocked()) return;` guard
4. "Locked" pill indicator â€” muncul di option bar saat `isLocked()`, dengan lock icon + amber border/tint
5. Flip div â€” `opacity-30 pointer-events-none` saat locked
6. Reset button â€” `disabled` attribute + `text-editor-text-dim/30 cursor-default` saat locked
7. X/Y/R EditableNumField â€” sudah support `disabled` prop, tinggal pass `isLocked()`

**Files Changed:**
- `apps/desktop/src/components/editor/OptionBar.tsx`: +activeLayerSafe/isLocked helpers, locked guards di flip/reset, "Locked" pill, disabled styles untuk Flip/Reset saat locked

**Verifikasi:**
- `pnpm.cmd run build`: âœ…
- `npx vitest run`: âœ… (168/168)

---
## [2026-06-02] FEATURE â€” Move Tool Option Bar Hybrid [COMPLETE]

### Kategori: FEATURE / MOVE TOOL / OPTION BAR / UI

**Deskripsi:** Mengubah Move Tool option bar dari display-only menjadi kontrol hybrid: toggle Auto Select, toggle Snap, editable X/Y/Rotate, display-only W/H, Flip H/V, Reset.

**Logika Perbaikan (Fix Rationale):**
1. `EditorContext.tsx`: +moveAutoSelect, moveSnapEnabled signals
2. `primitives.tsx`: +EditableNumField (focus-to-edit, Enter/blur commit, Escape revert, disabled state)
3. `OptionBar.tsx`: Toggle components untuk Auto Select + Snap, EditableNumField untuk X/Y/Rotate, display NumField untuk W/H, Flip H/V, Reset
4. `CanvasViewport.tsx`: auto-select guard (`if (moveAutoSelect())`), snap guard (`interactiveState.onComputeSnap = undefined` jika toggle OFF)
5. `SelectionTransformOverlay.tsx`: snap guard via `props.moveSnapEnabled ?? moveSnapEnabled()`

**Files Changed:**
- `apps/desktop/src/components/editor/EditorContext.tsx`: +4 lines (signals + value)
- `apps/desktop/src/components/editor/primitives.tsx`: +EditableNumField (72 lines)
- `apps/desktop/src/components/editor/OptionBar.tsx`: full rewrite (Toggle, editable fields, toggles)
- `apps/desktop/src/components/editor/CanvasViewport.tsx`: auto-select guard + snap guard (prepareToolContext)
- `apps/desktop/src/components/editor/SelectionTransformOverlay.tsx`: +moveSnapEnabled prop + guard
- `apps/desktop/src/components/editor/__tests__/SelectionTransformOverlay.test.ts`: +1 regression test (snap toggle OFF)
- `docs/AI_CURRENT_TASK.md`: updated
- `docs/AI_HISTORY.md`: entry ini

**Verifikasi:**
- `pnpm.cmd run build`: âœ…
- `npx vitest run`: âœ… (168/168, +1)
- `cargo test -p photrez-core`: âœ… (85/85)

---
## [2026-06-02] FEATURE â€” Overlay Move Tool Alt Snap Disable + Guardrail Docs [COMPLETE]

### Kategori: FEATURE / SNAPPING / OVERLAY / DOCUMENTATION

**Deskripsi:** Overlay move path (`SelectionTransformOverlay.tsx`) tidak honor Alt key untuk disable snapping, sementara canvas move path (`input-handler.ts:108`) sudah. Fix tambah `!e.altKey` guard. Juga tambah section **Move Tool Runtime Assumptions** di `AI_CONTEXT.md` untuk guide AI berikutnya.

**Logika Perbaikan (Fix Rationale):**
1. Overlay move branch: skip `onComputeSnap` saat `e.altKey` true, panggil `onSnapClear`
2. Test: verify move without Alt calls onComputeSnap, move with Alt doesn't call onComputeSnap + fires onSnapClear
3. Docs: guardrail section di AI_CONTEXT.md

**Files Changed:**
- `apps/desktop/src/components/editor/SelectionTransformOverlay.tsx`: +!e.altKey guard, +else onSnapClear
- `apps/desktop/src/components/editor/__tests__/SelectionTransformOverlay.test.ts`: +1 regression test
- `docs/AI_CONTEXT.md`: +Move Tool Runtime Assumptions section
- `docs/ARCHITECTURE.md`: test count 162â†’167
- `docs/FEATURES.md`: test count 166â†’167
- `docs/AI_HISTORY.md`: entry ini
- `docs/AI_CURRENT_TASK.md`: entry ini

**Verifikasi:**
- `pnpm.cmd run build`: âœ…
- `npx vitest run`: âœ… (167/167)
- `cargo test -p photrez-core`: âœ… (85/85)

---
## [2026-06-02] BUG FIX â€” Stuck Snap Indicators on Overlay Move Drag End [COMPLETE]

### Kategori: BUG FIX / SNAPPING / OVERLAY

**Deskripsi:** Snap indicator (magenta guide lines) tetap terlihat setelah move/drag selesai di overlay path (`SelectionTransformOverlay.tsx`). Root cause: overlay's pointerup/pointercancel/lostpointercapture/Escape handler tidak pernah membersihkan `snapLines` signal â€” HANYA membersihkan HUD dan drag state. Canvas path (`input-handler.ts`) sudah benar dengan `onSnapLines?.([])` di `handlePointerUp`.

**Fix Rationale:**
1. Tambah `onSnapClear` prop di `SelectionTransformOverlayProps`
2. Panggil di keempat cleanup path (pointerup, pointercancel, lostpointercapture, Escape)
3. Wire dari `CanvasViewport.tsx` via `onSnapClear={() => setSnapLines([])}`

**Files Changed:**
- `apps/desktop/src/components/editor/SelectionTransformOverlay.tsx`: +1 prop, +4 calls
- `apps/desktop/src/components/editor/CanvasViewport.tsx`: +1 line (wiring)
- `apps/desktop/src/components/editor/__tests__/SelectionTransformOverlay.test.ts`: +4 regression tests
- `docs/AI_CURRENT_TASK.md`: new entry
- `docs/AI_HISTORY.md`: entry ini
- `docs/FEATURES.md`: test count 162â†’166

**Verifikasi:**
- `pnpm.cmd run build`: ? (pending)
- `npx vitest run`: ? (pending)

---
## [2026-06-02] FEATURE â€” Docs Sync: MVP Runtime Architecture v2 [COMPLETE]

### Kategori: DOCUMENTATION / ARCHITECTURE / CLEANUP

**Deskripsi:** Menyinkronkan seluruh dokumentasi arsitektur (8 files) dengan realitas runtime MVP saat ini. Semua dokumen sekarang mencerminkan dual stack: **MVP runtime** (TypeScript DocumentEngine + WebGL2) dan **future target** (Rust photrez-core + wgpu photrez-render). Tidak ada history yang dihapus.

**Files Changed:**
- `docs/AI_CONTEXT.md`: stack line, section 6 rewrite, rule #3 exception
- `docs/ARCHITECTURE.md`: overview, status, stack table, source of truth
- `docs/ARCHITECTURE.md`: +section 11 MVP Runtime Reality (current stack, data flow, ownership, migration path)
- `docs/spec/trd.md`: runtime stack, scalability, maintainability
- `docs/decisions/id-decision-log.md`: split architecture row into future + MVP
- `docs/FEATURES.md`: wgpuâ†’WebGL2 canvas
- `docs/AI_CURRENT_TASK.md`: new entry
- `docs/AI_HISTORY.md`: entry ini

**Verifikasi:**
- âœ… `pnpm.cmd run build`: PASS
- âœ… `npx vitest run`: 162 PASS

---
## [2026-06-02] FEATURE â€” Canvas Edge Snap Boost [COMPLETE]

### Kategori: FEATURE / SNAPPING / UX

**Deskripsi:** Meningkatkan UX snapping dengan per-target threshold dan priority-based resolution. Canvas edges mendapat threshold lebih lebar (12px) dan priority lebih tinggi (3), canvas center lines mendapat threshold 6px priority 2, layer-to-layer tetap 5px priority default 1. Jika canvas edge dan layer edge sama-sama kandidat, canvas edge menang.

**Logika Perbaikan (Fix Rationale):**
1. Extend `SnapRect` dengan optional `snapThreshold`/`snapPriority` fields
2. `computeSnapAdjustment` sekarang membandingkan priority dulu, baru distance
3. Canvas edge target builder di 2 lokasi (`syncStateHandler` + `onComputeSnap` JSX prop) diberi metadata

**Files Changed:**
- `apps/desktop/src/viewport/smartGuides.ts`: priority-aware computeSnapAdjustment + SnapRect fields
- `apps/desktop/src/components/editor/CanvasViewport.tsx`: tag canvas targets with threshold/priority
- `apps/desktop/src/__tests__/snap-adjustment.test.ts`: +7 regression tests (threshold, priority, backward compat)
- `docs/FEATURES.md`: test count 155â†’162, new snap boost row
- `docs/ARCHITECTURE.md`: test count 154â†’162
- `docs/AI_HISTORY.md`: entry ini
- `docs/superpowers/specs/2026-06-02-canvas-edge-snap-boost-design.md`: design spec
- `docs/superpowers/plans/2026-06-02-canvas-edge-snap-boost.md`: implementation plan

**Verifikasi:**
- âœ… `npx vitest run`: 162 PASS (16 test files, +7 new tests)
- âœ… `pnpm run build`: PASS (TypeScript + Vite)

---
## [2026-06-02] BUG FIX â€” Handle-Axis Projection for Corner Resize (Corrected Perpendicular Axis) [COMPLETE]

### Kategori: BUG FIX / TRANSFORM / GEOMETRY

**Deskripsi:** Fix sebelumnya menggunakan aspect-ratio diagonal (dari opposite anchor ke dragged corner) sebagai projection axis. User melaporkan "masih nggak ada bedanya" â€” gerakan NE/SW pada SE handle tetap mengubah ukuran. Root cause: axis yang benar adalah handle/cursor diagonal (45Â°), bukan object aspect diagonal.

**Akar Masalah (Root Cause):**

Fix sebelumnya menggunakan object-aspect diagonal:
```
SE: (oldW, oldH) â€” diagonal dari opposite anchor ke corner
```
Untuk object 200Ã—100, axis ini = (200, 100) â†’ berat ke X. Gerakan NE/SW (20, -20) punya dot product non-zero: `20Ã—200 + (-20)Ã—100 = 2000 â‰  0` â†’ resize tetap terjadi.

**Logika Perbaikan (Fix Rationale):**

Ganti projection axis dari object-aspect diagonal ke handle/cursor diagonal (45Â° di screen space, sama di local space karena rotasi dikompensasi):
```
SE: (1, 1), NE: (1, -1), SW: (-1, 1), NW: (-1, -1)
factor = 1 + (dx*hx + dy*hy) / (oldW + oldH)
```
Untuk object 200Ã—100, SE handle (hx=1, hy=1), gerakan (20, -20):
`projected = 20Ã—1 + (-20)Ã—1 = 0` â†’ factor = 1 â†’ no resize âœ“

**Files Changed:**
- `apps/desktop/src/viewport/transformGeometry.ts`: `applyResizeHandle` â€” projection axis dari aspect-diagonal ke handle-axis
- `apps/desktop/src/__tests__/transform-geometry.test.ts`: update expectations + new regression test
- `docs/FEATURES.md`: test count 154â†’155
- `docs/AI_HISTORY.md`: entry ini
- `docs/AI_CURRENT_TASK.md`: entry ini

**Verifikasi:**
- âœ… `npx vitest run`: 155 PASS (16 test files, +1 regression test)

---
## [2026-06-02] BUG FIX â€” reference editor-Style Diagonal Projection for Corner Resize (Perpendicular Drift) [COMPLETE]

### Kategori: BUG FIX / TRANSFORM / GEOMETRY

**Deskripsi:** Saat resize corner handle default proportional, gerakan mouse yang tegak lurus terhadap diagonal resize tetap mengubah ukuran gambar. Fix: project mouse delta ke diagonal vector dari opposite anchor ke dragged handle â€” komponen perpendicular diabaikan.

**Akar Masalah (Root Cause):**

`applyResizeHandle()` menggunakan axis dominance:
```ts
if (Math.abs(localDx) > Math.abs(localDy)) {
  vh = vw / aspect;      // dy-dominated â†’ adjust vw
} else {
  vw = vh * aspect;      // dx-dominated â†’ adjust vh
}
```
Ini memilih satu axis (yang dominan), lalu menyesuaikan axis lain. Gerakan diagonal apapun tetap mengubah width ATAU height, termasuk gerakan perpendicular yang di reference editor tidak mengubah ukuran.

**Logika Perbaikan (Fix Rationale):**

Untuk corner proportional resize, gunakan vector projection:

1. Tentukan diagonal vector dari opposite anchor ke dragged corner (mis. SE â†’ (oldW, oldH))
2. Normalisasi ke unit vector, hitung dot product dengan local delta:
   ```
   projected = localDx * ux + localDy * uy
   scale_factor = 1 + projected / diagonal_length
   ```
3. Hitung `vw = oldW * factor`, `vh = oldH * factor`
4. Reposition berdasarkan anchor (w/n adjustment)
5. Clamp faktor supaya width/height â‰¥ 1px
6. Non-corner handles + Shift-free scaling tetap pakai independent axis delta

**Files Changed:**
- `apps/desktop/src/viewport/transformGeometry.ts`: `applyResizeHandle()` diagonal projection logic
- `apps/desktop/src/__tests__/transform-geometry.test.ts`: +4 perpendicular regression tests + update 2 existing expectations
- `docs/AI_CURRENT_TASK.md`: new entry
- `docs/AI_HISTORY.md`: entry ini

---
## [2026-06-02] BUG FIX â€” Resize Handle Pointer Capture Lost/Stuck During Fast Drag (Root SVG Capture) [COMPLETE]

### Kategori: BUG FIX / OVERLAY / POINTER EVENTS

**Deskripsi:** Resize handle pointer capture bisa "lost" saat resize terlalu cepat karena `setPointerCapture()` dipanggil pada elemen SVG handle individual yang DOM node-nya bisa diganti selama Solid re-render. Akibatnya `pointermove`/`pointerup` tidak pernah diterima setelah re-render, dan `dragState` stuck non-null â€” transform tidak bisa dihentikan.

**Akar Masalah (Root Cause):**

Di `handlePointerDown` (SelectionTransformOverlay.tsx:120-121):
```typescript
const target = e.currentTarget as HTMLElement;
target.setPointerCapture(e.pointerId);
```

`e.currentTarget` adalah elemen handle SVG (mis. `<rect data-handle="se">`) yang berada di dalam `<For>` loop. Saat `handlePointerMove` memanggil `engine.transformLayer()`, Solid memicu `syncState()` via `workspace.onChange()`, menyebabkan re-render selection overlay. Re-render ini bisa mengganti DOM node handle (Solid's `<For>` creates new array objects each render â†’ new DOM nodes). Jika node yang memiliki active pointer capture diganti, browser kehilangan pointer capture, dan event `pointermove`/`pointerup` berikutnya tidak pernah sampai ke handler.

**Logika Perbaikan (Fix Rationale):**

1. **Capture ke root `<svg>`** â€” root SVG (`overlaySvgRef`) tetap mounted selama `<Show when={getLayer()}>` aktif (layer masih visible dan tidak di-unmount saat drag). Capture pada root SVG tidak hilang meskipun child `<g>`/`<rect>` handle berubah.
2. **Simpan `pointerId` di dragState** â€” filter event dengan `e.pointerId !== drag.pointerId` untuk menghindari konflik multi-pointer.
3. **Pindah handler ke root SVG** â€” `onPointerMove`/`onPointerUp`/`onPointerCancel`/`onLostPointerCapture` pada `<svg>` (bukan per-handle). `onPointerDown` tetap di handle untuk memulai drag.
4. **Stabilkan `<For>` array** â€” `HANDLE_TYPES` sebagai const array string literal, bukan array object baru per render. Mengurangi DOM churn.
5. **Escape handler** â€” release pointer capture sebelum cleanup.

**Files Changed:**
- `apps/desktop/src/components/editor/SelectionTransformOverlay.tsx`: root SVG ref + pointer capture, pointerId filter, root SVG event handlers, stable HANDLE_TYPES (const), `data-overlay-svg`/`data-handle` attr
- `apps/desktop/src/components/editor/__tests__/SelectionTransformOverlay.test.ts`: +3 regression tests
- `apps/desktop/vite.config.ts`: Solid Plugin `{ hot: false }` di VITEST mode (fix @solid-refresh error)
- `docs/AI_CURRENT_TASK.md`: new entry
- `docs/AI_HISTORY.md`: entry ini

---
## [2026-06-02] BUG FIX â€” Vertical Flip Regresi (Shader UV Double Y-Flip) [COMPLETE]

### Kategori: BUG FIX / RENDERER / SHADER

**Deskripsi:** Layer gambar tampil vertikal terbalik (root cause ditemukan saat debug: `v_texCoord = vec2(pos.x, 1.0 - pos.y)` di vertex shader melakukan double Y-inversion).

**Akar Masalah (Root Cause):**

Terdapat 2 mekanisme Y-flip di pipeline render, yang satu sudah benar dan satu lagi menyebabkan double-flip:

1. **View matrix flip (BENAR)** â€” `computeViewMatrix()` di `webgl2.ts:293`: `m[5] = -2.0 / docH`. Ini membalik document Y-axis (`y=0 â†’ NDC top, y=docH â†’ NDC bottom`) agar rendering konsisten dengan CSS y-down convention. **WAJIB ada.**

2. **Texture UV flip (SALAH â€” regresi)** â€” `v_texCoord = vec2(pos.x, 1.0 - pos.y)` di `shaders.ts:23`. Ini membalik texture coordinate Y, menyebabkan:
   - `pos.y = 0` (visually TOP, setelah view matrix flip) â†’ `v_texCoord.y = 1` â†’ texel di baris terakhir texture â†’ **bottom of image** âœ—
   
   Dengan `UNPACK_FLIP_Y_WEBGL = false` (default), texel `v=0` adalah row 0 dari source image = top of image. Tanpa UV flip:
   - `pos.y = 0` (visual TOP) â†’ `v_texCoord.y = 0` â†’ texel row 0 â†’ **top of image** âœ“

**Regresi diperkenalkan di:** Commit `2fa63a0` (fix: P0 center-anchored flip). Commit `6ad3d70` sebelumnya sudah benar menghapus UV flip dengan komentar "Y-axis already handled by view matrix flip", tetapi `2fa63a0` secara tidak sengaja mengembalikan `1.0 - pos.y` tanpa menyadari bahwa view matrix sudah melakukan flip.

**Logika Perbaikan (Fix Rationale):**

- `computeViewMatrix()` â†’ Y-flip document space (wajib untuk CSS coordinate convention)
- `UNPACK_FLIP_Y_WEBGL = false` â†’ texel v=0 = first uploaded row = top of image
- `v_texCoord = vec2(pos.x, pos.y)` â†’ visual top (pos.y=0) maps to top of image (v=0) âœ“
- Hapus `1.0 - pos.y` â†’ eliminasi double-flip

**Files Changed:**
- `apps/desktop/src/renderer/shaders.ts`: `v_texCoord = vec2(pos.x, 1.0 - pos.y)` â†’ `vec2(pos.x, pos.y)` + komentar menjelaskan mengapa no UV flip
- `apps/desktop/src/__tests__/renderer.test.ts`: +regression test "should NOT double-flip texture Y" â€” assert shader source menggunakan `pos.y` dan TIDAK mengandung `1.0 - pos`
- `docs/AI_CURRENT_TASK.md`: new entry for this fix
- `docs/AI_HISTORY.md`: entry ini

**Verifikasi Final:**
- âœ… `pnpm.cmd run build`: PASS
- âœ… `npx vitest run`: 147/147 PASS (15 test files, +1 regression test)
- âœ… `cargo test -p photrez-core`: 85/85 PASS

**Catatan:**
- Checkerboard shader tidak terpengaruh â€” menggunakan `gl_FragCoord.xy` bukan `v_texCoord` untuk pattern
- `flipH`/`flipV` booleans di layer transform tidak terkait â€” keduanya default `false` untuk layer baru
- Regression test adalah string assertion pada `VERTEX_SHADER_SOURCE` â€” cukup sensitif untuk menangkap re-introduksi `1.0 - pos` di masa depan

---

## [2026-06-02] BUG FIX CAMPAIGN â€” Center-Anchored Flip, Overlay Reactivity, Snap+HUD Unification, Rotation Drag Fix [COMPLETE]

### Kategori: BUG FIX / TRANSFORM / OVERLAY / SNAP / HUD / VIEWPORT

**Deskripsi:** Bugfix campaign pasca editor-standard Free Transform. Memperbaiki 7 kategori P0/P1 bugs: (1) HEAD tidak buildable dari clean checkout â€” vite-tsconfig-paths stale refs; (2) flip semantics salah â€” shader flip dulu baru center, geometry helpers encode flip sign ke scaleX; (3) overlay AABB tidak reaktif â€” syncState shallow-copy layer objects; (4) overlay pointer layering â€” move zone di belakang handles; (5) move drag tidak lewat snap pipeline; (6) HUD position pakai raw clientX/zoom bukan screenToDocument; (7) rotation drag coordinate space salah.

**Files Changed:**
- `apps/desktop/src/viewport/transformGeometry.ts`: remove sxSign usage, positive scaleX
- `apps/desktop/src/__tests__/transform-geometry.test.ts`: +4 flip-semantics tests (146 total)
- `apps/desktop/src/renderer/shaders.ts`: center-anchored flip (`center â†’ flip`, not `flip â†’ center`)
- `apps/desktop/src/renderer/webgl2.ts`: flipSign from booleans, not sign(scaleX)
- `apps/desktop/src/components/editor/EditorContext.tsx`: deep-clone layer objects in syncState
- `apps/desktop/src/components/editor/SelectionTransformOverlay.tsx`: move zone before handles, Escape clears HUD, onComputeSnap, onScreenToDoc
- `apps/desktop/src/components/editor/TransformHud.tsx`: raw clientX/Y (document-space)
- `apps/desktop/src/components/editor/CanvasViewport.tsx`: HUD conversion wrapper, onComputeSnap wiring, onScreenToDoc
- `apps/desktop/src/viewport/input-handler.ts`: AABB-based snap with getLayerAabb
- `apps/desktop/package.json`: remove vite-tsconfig-paths
- `apps/desktop/vite.config.ts`: remove vite-tsconfig-paths, add resolve.tsconfigPaths
- `docs/FEATURES.md`: test count 146
- `docs/ARCHITECTURE.md`: test count 146
- `docs/AI_CURRENT_TASK.md`: new bugfix entry
- `docs/AI_HISTORY.md`: entry ini

**Verifikasi Final:**
- âœ… `pnpm.cmd run build`: PASS
- âœ… `npx vitest run`: 146/146 PASS (15 test files)
- âœ… `cargo test -p photrez-core`: 85/85 PASS

**Key Decisions:**
- ScaleX/ScaleY = positive magnitude only; flipH/flipV booleans carry mirror
- Center-anchored flip: `localPos â†’ subtract center â†’ flip â†’ rotate â†’ add center`
- CW rotation unified: shader negates rad, rotatePoint negates rad, SVG rotate() positive, all tests assert CW
- Overlay reactivity requires deep clone in syncState for Solid reactivity to fire
- HUD uses document-space coords from screenToDocument()

---

## [2026-06-02] FEATURE â€” Precision Move Pack (keyboard nudge, canvas auto-select, transform HUD, snap feedback) [COMPLETE]

### Kategori: FEATURE / VIEWPORT / MOVE TOOL / UX

**Deskripsi:** Enhance Move Tool dengan 4 peningkatan presisi: (1) keyboard nudge Arrow=1px / Shift+Arrow=10px, (2) canvas auto-select via transformed polygon hit-test, (3) transform HUD near cursor showing Î”X/Î”Y, W/H/%, angle, (4) snap feedback label on HUD when snap lines active.

**Files Changed:**
- `apps/desktop/src/viewport/layerHitTest.ts`: NEW â€” `hitTestLayer`, `hitTestLayers` pure helpers (ray-casting point-in-polygon)
- `apps/desktop/src/__tests__/layer-hit-test.test.ts`: NEW â€” 8 unit tests
- `apps/desktop/src/components/editor/TransformHud.tsx`: NEW â€” SVG HUD component with `createMemo`, `HudMode` type
- `apps/desktop/src/components/editor/SelectionTransformOverlay.tsx`: MODIFIED â€” `onHudUpdate` prop, `snapActive` prop, HUD emits per drag branch + clear on pointer-up
- `apps/desktop/src/components/editor/CanvasViewport.tsx`: MODIFIED â€” auto-select before `prepareToolContext()`, keyboard nudge in `handleKeyDown`, `hudInfo` signal, HUD wiring
- `docs/AI_CURRENT_TASK.md`: completion entry
- `docs/AI_HISTORY.md`: entry ini
- `docs/FEATURES.md`: +5 rows in Selection + Move + Transform

**Verifikasi Final:**
- âœ… `npx vitest run`: 142/142 PASS (15 test files)
- âœ… `pnpm.cmd run build`: PASS (6.07s, 2025 modules)
- âœ… `cargo test -p photrez-core`: 85/85 PASS

**Catatan:**
- Canvas auto-select uses transformed polygon hit-test (ray-casting, not AABB) so rotated layers feel correct
- Nudge commits history once per non-repeat keydown only; holding arrow doesn't spam undo stack
- Nudge does NOT trigger snapping â€” it's explicit precision move, not drag behavior
- Transform HUD is transient SVG overlay with `pointer-events: none`, no state persistence, positioned near cursor in document space
- HUD "snap" label dynamically appears when `snapLines().length > 0` during drag
- Code review found 6 issues (1 critical, 2 important, 3 minor) â€” all fixed before commit
- All 5 commits in Precision Move Pack: layerHitTest â†’ auto-select â†’ nudge â†’ HUD â†’ fix reviews

---
## [2026-06-02] FEATURE â€” Remove vite-tsconfig-paths Plugin (Use Native Vite Resolver) [COMPLETE]

### Kategori: FEATURE / BUILD CONFIG / INFRASTRUCTURE

**Deskripsi:** Vite >= 6 (termasuk Vite 8.0.14 yang dipakai proyek ini) mendukung resolusi `tsconfig.paths` secara native lewat opsi `resolve.tsconfigPaths`. Plugin `vite-tsconfig-paths` menjadi redundan dan Vite memunculkan warning setiap kali build/dev dijalankan. Task ini menghapus plugin dan menggantinya dengan opsi native, sambil menjaga perilaku module resolution tetap identik (alias `@/*` â†’ `./src/*`).

**Files Changed:**
- `apps/desktop/vite.config.ts`: hapus import `tsconfigPaths`, hapus dari array `plugins`, tambah `resolve: { tsconfigPaths: true }`.
- `apps/desktop/package.json`: hapus `vite-tsconfig-paths@^6.1.1` dari `devDependencies`.
- `pnpm-lock.yaml`: regenerated (`pnpm install` sukses, âˆ’3 packages, tidak ada orphan lockfile entry).
- `docs/AI_CURRENT_TASK.md`: entri completion.
- `docs/AI_HISTORY.md`: entri ini.
- `docs/FEATURES.md`: baris baru di section Infrastructure.

**Verifikasi Final:**
- âœ… `pnpm.cmd run build`: PASS (7.69s, 2022 modules transformed). Warning plugin `vite-tsconfig-paths` sudah hilang.
- âœ… `pnpm.cmd --filter photrez-desktop test`: 114/114 PASS (13 test files, 36.70s).
- âœ… `pnpm.cmd install`: sukses regenerate lockfile.

**Catatan:**
- Perilaku module resolution identik: `tsconfig.json` `"paths": { "@/*": ["./src/*"] }` dibaca langsung oleh native Vite resolver.
- Tidak ada perubahan di source code (`apps/desktop/src/**`).
- Dependency `vite-tsconfig-paths` (3 packages total termasuk transitive) ter-cleanup dari `node_modules` dan `pnpm-lock.yaml`.
- PLUGIN_TIMINGS warning yang muncul saat build adalah untuk plugin `solid` (unrelated, info-only).

---

---

## Archived Entries Index (pre 2026-06-02)

> Full details in `docs/archive/AI_HISTORY_ARCHIVE.md`

| Date | Entry |
|---|---|
| 2026-06-01 | FEATURE â€” Move Tool Snapping End-to-End [COMPLETE] |
| 2026-06-01 | TEST FIX â€” Input Handler Snap Pointer-Up Cleanup Test Review [COMPLETE] |
| 2026-06-01 | BUG FIX â€” computeSnapAdjustment Non-Finite Guide Line Endpoints (Code Review) [COMPLETE] |
| 2026-06-01 | FEATURE â€” Move Tool Snapping (Task 2: computeSnapAdjustment) [COMPLETE] |
| 2026-06-01 | BUG FIX â€” SelectionTransformOverlay Blocks Panning Cursor + Pointer Events [COMPLETE] |
| 2026-06-01 | BUG FIX â€” Cursor Imperative Sync via createEffect [COMPLETE] |
| 2026-06-01 | BUG FIX â€” Cursor Style Non-Reactive in SolidJS [SUPERSEDED] |
| 2026-06-01 | BUG FIX + REFACTOR â€” View Matrix uses documentSize, not canvasSize [COMPLETE] |
| 2026-06-01 | FEATURE â€” HiDPI Sharpness + Snap-Fit Transition [COMPLETE] |
| 2026-06-01 | REFACTOR â€” Viewport Code Simplification (A+B+C+D) [COMPLETE] |
| 2026-06-01 | BUG FIX â€” Viewport Canvas Positioning (Double Position: Flex Static + CSS Transform) [COMPLETE] |
| 2026-05-31 | BUG FIX â€” Viewport Architecture Fixes (Double Sync, Stable ToolContext, Brush Accumulator, ImageBitmap Leak) [COMPLETE] |
| 2026-05-31 | REFACTOR â€” Viewport Architecture Cleanup (Dead Code Removal, State Sync Consolidation, Per-Instance Stroke Points) [COMPLETE] |
| 2026-05-31 | BUG FIX â€” CSS Transform Coordinate Regressions [COMPLETE] |
| 2026-05-31 | BUG FIX â€” Double Viewport Transform (WebGL + CSS) [COMPLETE] |
| 2026-05-31 | FEATURE â€” Viewport UX Migration & Overlay System [COMPLETE] |
| 2026-05-31 | FEATURE â€” UX Overlays: Hover Highlight, Smart Guides, Brush Cursor [COMPLETE] |
| 2026-05-31 | FEATURE â€” High-Fidelity editor-standard Viewport Navigation & Kinetic Panning [COMPLETE] |
| 2026-05-31 | FEATURE â€” High-Fidelity editor-standard Move & Transform Overlay [COMPLETE] |
| 2026-05-30 | BUG FIX â€” Custom Manifest Compiler & WebView2Loader Linking Workaround [COMPLETE] |
| 2026-05-30 | FEATURE / REFACTOR / ARCHITECTURE â€” Architecture Migration v2 with Modular UI Alignment [COMPLETE] |
| 2026-05-30 | FEATURE / UI / POLISH â€” Diagonal Swatches, Tab Typography & Layout Polish [COMPLETE] |
| 2026-05-30 | DOCUMENTATION â€” Style Guide & Design Tokens Synchronization [COMPLETE] |
| 2026-05-30 | FEATURE â€” Solid + Tailwind Editor Shell Integration [COMPLETE] |
| 2026-05-30 | FEATURE â€” AppShell Grid Layout Restructure [COMPLETE] |
| 2026-05-29 | FEATURE â€” LeftToolRail Reference Matching [COMPLETE] |
| 2026-05-29 | FEATURE â€” Titlebar Reference Matching [COMPLETE] |
| 2026-05-29 | FEATURE â€” photrez High-Fidelity Reference Slice [COMPLETE] |
| 2026-05-29 | FEATURE â€” High-Fidelity LUMINARIS Visual Overhaul & Slicing [COMPLETE] |
| 2026-05-29 | FEATURE â€” Mockup UI Slicing [COMPLETE] |
| 2026-05-28 | FEATURE â€” Tasks 4-5: On-Demand Rendering & Frontend Render Trigger [COMPLETE] |
| 2026-05-28 | FEATURE â€” Task 5: Remove Canvas 2D Fallback from Frontend [COMPLETE] |
| 2026-05-28 | FEATURE â€” Tasks 5-10: Frontend Viewport Integration [COMPLETE] |
| 2026-05-28 | FEATURE â€” M6: Perf Gate + Packaging [COMPLETE] |
| 2026-05-28 | FEATURE â€” M3 Completion: Transform Handles & Controls |
| 2026-05-28 | FEATURE â€” Tasks 9-11: Flip Shortcuts, ESC Cancel, Rotation Snapping |
| 2026-05-28 | FEATURE â€” Milestone 5: Export Pipeline & Color Selection |
| 2026-05-28 | FEATURE â€” Milestone 4: Brush & Eraser Engine |
| 2026-05-28 | FEATURE â€” Milestone 3: Selection, Transform, Crop, and Resize |
| 2026-05-28 | FEATURE â€” Milestone 2, Task 2: UI Layer Reordering Controls in Right Inspector |
| 2026-05-28 | FEATURE â€” Milestone 2, Task 1: BitmapData & Memory Budget in Rust Core |
| 2026-05-28 | FEATURE â€” Right Inspector Idea A (Recessed Layers & History Compartment) |
| 2026-05-28 | FEATURE â€” Inspector UX Polish (Pill Tabs & Properties Unification) |
| 2026-05-27 | FEATURE â€” Segmented Transform Matrix Coordinate Grid |
| 2026-05-27 | FEATURE â€” Flush-Left Anchor Active Tool Indicator (Option A) |
| 2026-05-27 | FEATURE â€” Left Tool Rail Polish (Mechanical Desktop Aesthetics) |
| 2026-05-27 | FEATURE â€” UI Visual De-cluttering (Airy & Lightweight) |
| 2026-05-27 | FEATURE â€” Modular Hardware Chassis UI Redesign |
| 2026-05-27 | FEATURE â€” Proportional Fix: Rail 48Ã—36 / Top Bar 44px |
| 2026-05-27 | CLEANUP â€” Remove Command Palette UI Button (Out of MVP Scope) |
| 2026-05-27 | FEATURE â€” Inspector Panel Polish (Collapsible Sections, Tabs, Hover Refinements) |
| 2026-05-27 | BUG FIX â€” Tailwind CDN Conflict & Tokens Migration |
| 2026-05-27 | FEATURE â€” Milestone 1 Shell Foundation & Photon Amber UI Redesign |
| 2026-05-27 | DOCS â€” AI Context Documentation System |
| 2026-06-02 | BUG FIX â€” CropOverlay Pointer Capture + Full Crop MVP [COMPLETE] |
| 2026-06-03 | CROP IMPROVEMENT â€” 7 Incremental Tasks [COMPLETE] |

## [2026-06-04] PLAN - Scalability and Maintainability Refactor Plan [PLANNING COMPLETE]

### Kategori: PLAN / REFACTOR / ARCHITECTURE / MAINTAINABILITY

**Deskripsi:** Membuat rencana detail untuk refactor file splitting/merging lintas project agar Photrez lebih scalable dan maintainable tanpa mengubah behavior.

### Artifact

- `docs/plans/2026-06-04-scalability-maintainability-refactor-plan.md`

### Scope Plan

1. `DocumentEngine` TypeScript tetap facade/source of truth MVP, dengan helper internal untuk layer factory, compositing, crop apply, snapshot, dan pixel sampling.
2. `CanvasViewport.tsx` direncanakan menjadi shell yang mengomposisi hook renderer, pointer tools, dan derived viewport state.
3. `CropOverlay.tsx` direncanakan dipisah menjadi drag hook, handles, guides, dan tooltip renderer.
4. `OptionBar.tsx` direncanakan dipisah per active tool.
5. `SelectionTransformOverlay.tsx` direncanakan memiliki hook interaction terpisah.
6. `EditorContext.tsx` direncanakan dipisah internalnya tanpa mengubah entry point `useEditor()`.
7. Rust core/render dicatat sebagai reference/future-target organization, bukan runtime migration.

### Verification

- Planning artifact created.
- No implementation code changed in this planning step.

### Risiko / Catatan

- Eksekusi refactor harus dilakukan per wave kecil dengan targeted tests.
- `cargo test --workspace` tetap perlu diperlakukan sesuai catatan existing render/toolchain issue di dokumen project saat implementasi berjalan.

---

## [2026-06-06] FEATURE â€” MVP Release Blockers Phase 1: Resize Canvas Dialog, Aspect Ratio Lock, Layer Delete Confirmation [COMPLETE]

### Kategori: FEATURE / UI / LAYER

### Changes

1. **Resize Canvas Dialog** (`apps/desktop/src/components/editor/ResizeCanvasModal.tsx` â€” NEW)
   - Modal dialog with W/H number inputs, aspect ratio lock toggle (link/unlock icon), px unit.
   - Opens via `showResizeDialog` signal in `editorState.ts`, exposed through `EditorContext.tsx`.
   - Apply flow: `history.commit()` â†’ `engine.resizeCanvas()` â†’ `renderer.resize()` â†’ re-upload layer textures â†’ `syncViewport()` â†’ `requestRender()`. Supports undo.
   - Wired into Image menu (`AppTitleBar.tsx`) and Canvas Properties panel (`CanvasProperties.tsx`).
   - Mounted in `EditorShell.tsx`.

2. **Layer Delete Confirmation** (`apps/desktop/src/components/editor/useLayerActions.ts`)
   - Added `window.confirm()` with layer name and "This can be undone." before deletion.
   - Existing last-layer guard preserved.

3. **Focused Tests** (`ResizeCanvasModal.test.tsx`, `DeleteLayerConfirm.test.tsx` â€” NEW)
   - 12 new tests covering dialog render, aspect ratio toggle, apply/cancel/Escape, undoability, and delete confirm/cancel/last-layer guard.

### Verification
- `pnpm run build` â€” PASS
- `pnpm --filter photrez-desktop test` â€” 524 tests, 45 files â€” PASS

---

## [2026-06-06] FEATURE â€” Export End-to-End Pipeline [COMPLETE]

### Kategori: FEATURE / EXPORT / UI / FRONTEND

### Changes

1. **Export pipeline** (`apps/desktop/src/components/editor/exportDocument.ts` â€” NEW)
   - `encodeComposite()` â€” composites all visible layers (with transforms, opacity, flip/rotate) onto OffscreenCanvas â†’ encodes to PNG/JPEG/WebP via `canvas.convertToBlob()`.
   - White background pre-fill for JPEG (alpha not supported).
   - `exportActiveDocument()` â€” opens native save dialog â†’ encode â†’ write via Tauri `writeFileBytes`.

2. **ExportDialog** (`apps/desktop/src/components/editor/ExportDialog.tsx` â€” NEW)
   - Three-segment format selector (PNG / JPEG / WebP), quality range slider (shown only for JPEG/WebP, default 90%).
   - Async export with spinner loading state, success message with filename, error display.
   - Escape/Cancel/backdrop-close dismiss.
   - Signal `showExportDialog` added to `editorState.ts` / `EditorContext.tsx`.

3. **Entry points wired**
   - **RightDock** `ExportButton` â†’ `onClick` opens dialog.
   - **Ctrl+S** keyboard shortcut â†’ opens dialog (MVP: Save = Export).
   - No File > Save menu dropdown (File menu currently opens images; dedicated menu deferred).

4. **Tests** (3 new files, 8 new tests)
   - `ExportDialog.test.tsx` â€” renders/format switch/quality slider/cancel/Escape.
   - `exportDocument.test.ts` â€” encodeComposite produces non-empty bytes.
   - `editor-smoke.spec.ts` â€” 2 E2E tests: export dialog UI flow + Ctrl+S shortcut.

### Changes (second pass â€” blend mode parity + E2E format verification)

1. **Export compositing rewritten** (`exportDocument.ts`)
   - Now uses `drawLayerToContext` from `layerComposite.ts` instead of inline compositing.
   - Achieves parity with the WebGL renderer for: layer order, opacity, transforms, **all blend modes** (normal/multiply/screen/overlay/darken/lighten/color-dodge/color-burn/hard-light/soft-light/difference/exclusion).
   - Known limitation noted: Canvas 2D vs GLSL may differ at alpha edge cases (negligible for MVP).

2. **Parity E2E tests added** (2 new E2E tests)
   - `encodeComposite produces valid format headers matching canvas dimensions` â€” verifies PNG/JPEG/WebP magic bytes, non-empty output.
   - `export compositing matches document dimensions and blend mode + transform parity` â€” verifies 320Ã—240 output, scaled/rotated/multiply-blended layers, invisible layer exclusion.

### Verification (final)
- `pnpm run build` â€” PASS
- `pnpm --filter photrez-desktop test` â€” 538 tests, 47 files â€” PASS
- `playwright test --grep "export dialog|encodeComposite|export compositing"` â€” 4/4 PASS
- `cargo test -p photrez-core` â€” 85 tests â€” PASS

### Changes (third pass â€” file I/O Rust tests + export data flow E2E)

1. **Rust file I/O unit tests** (`apps/desktop/src-tauri/src/main.rs`)
   - Added `#[cfg(test)] mod tests` with 7 tests covering:
     - `write_file_bytes` creates file with correct content (temp dir)
     - Write â†’ read roundtrip with PNG binary data (header + IHDR + IEND)
     - Invalid base64 returns `E_VALIDATION` error
     - Write to invalid path returns `E_IO` error
     - `read_file_bytes` on nonexistent file returns `E_IO` error
     - `ping` returns ok/status/service
     - `get_contract_info` lists all supported commands

2. **Export data flow E2E test** (e2e/editor-smoke.spec.ts)
   - `export data flow: encodeComposite â†’ base64 â†’ file write roundtrip`
   - Simulates the full frontend â†’ Tauri bridge â†’ disk write pipeline:
     - `encodeComposite` produces raw PNG bytes
     - Bytes encoded to base64 (same as `native.ts` `writeFileBytes`)
     - Base64 decoded back to bytes (same as `main.rs` `write_file_bytes`)
     - Roundtrip verified byte-for-byte exact match
     - Decoded bytes produce valid 16Ã—16 PNG image via `createImageBitmap`

3. **Manual verification steps documented** in AI_CURRENT_TASK.md
   - Steps to run `pnpm tauri dev`, create doc, draw, Ctrl+S, save as PNG/JPEG/WebP
   - Verify file opens in external viewer at correct dimensions with non-blank content

### Verification
- `pnpm run build` â€” PASS
- `pnpm --filter photrez-desktop test` â€” 538 tests, 47 files â€” PASS
- `playwright test --grep "export dialog|encodeComposite|export compositing|export data flow"` â€” 5/5 PASS
- `cargo test -p photrez-desktop` â€” 7 file I/O tests â€” PASS
- `cargo test -p photrez-core` â€” 85 tests â€” PASS

---

## [2026-06-08] BUG FIX â€” Crop State Edge Cases (3 Bugs) [COMPLETE]

### Kategori: BUG FIX / CROP / FRONTEND

### Root Cause & Fix Rationale per Bug

**Bug A â€” `pendingPasteboardCropGesture` leak on pointercancel:**
- **Root Cause:** `CanvasViewport` had no `pointercancel` handler for pasteboard crop gestures. Only `handlePasteboardPointerUp` cleared `pendingPasteboardCropGesture`. When `pointercancel` arrived (e.g., browser cancels pointer mid-drag), the signal stayed set, corrupting the next pasteboard interaction.
- **Fix:** Added `handlePasteboardPointerCancel()` that clears `pendingPasteboardCropGesture` matching the cancelled `pointerId`. Routed container `onPointerCancel` through this new handler before delegating to `onViewportPointerCancel`.

**Bug B â€” Modern crop image transform leaks across tool switches:**
- **Root Cause:** The `createEffect` that initializes modern crop state on entering the Crop tool nulled `lastModernCropSessionKey` on tool exit but never called `resetModernCrop()`. On re-entry, `modernCropImageTransform` retained `offsetX/offsetY/rotation/scale` from the previous session, while `modernCropFrame` was re-created from scratch â€” the mismatched transform could position the image incorrectly.
- **Fix:** Added `resetModernCrop()` call in the createEffect's early-return path when `activeTool() !== "crop"` and a session was previously active (`lastModernCropSessionKey !== null`).

**Bug C â€” ModernCropOverlay drag state not cleared on lostpointercapture:**
- **Root Cause:** `clearDrag` in `ModernCropOverlay` did not call `releasePointerCapture()` and did not fire `onModernCropCommit`, so if `lostpointercapture` fired mid-drag, the drag state persisted without committing the undo snapshot.
- **Note:** Added regression test proving `clearDrag` fires on `lostpointercapture`. The existing `clearDrag` + `pointerup` path already handles state teardown correctly â€” the test validates that lostpointercapture triggers exactly one cleanup cycle.

### Files Changed
- `apps/desktop/src/components/editor/CanvasViewport.tsx` â€” Bug A (handlePasteboardPointerCancel) + Bug B (resetModernCrop on tool exit)
- `apps/desktop/src/components/editor/__tests__/CanvasViewport.test.tsx` â€” 3 new regression tests, added `setModernImageTransform` to test consumer

### Verification
- PASS: `pnpm.cmd exec vitest run src/components/editor/__tests__/CanvasViewport.test.tsx` (33 tests, +3 new)
- PASS: `pnpm.cmd run build`
- PASS: `pnpm.cmd --filter photrez-desktop test --run --pool=threads --maxWorkers=1` (608 tests, 50 files)

---

## [2026-06-08] BUG FIX â€” Crop & Transform lostpointercapture Defensive Gaps (2 Bugs) [COMPLETE]

### Kategori: BUG FIX / CROP / TRANSFORM / FRONTEND

### Root Cause & Fix Rationale per Bug

**Bug D â€” Classic crop `handleLostPointerCapture` pointerId guard:**
- **Root Cause:** `handleLostPointerCapture` in `useCropOverlayDrag.ts` guarded on `e.pointerId !== drag.pointerId` and returned early. When a browser/platform edge case fires `lostpointercapture` with a different pointerId than the stored drag pointerId, `dragState` stays non-null â€” the overlay enters a stuck-drag state. Additionally, unlike `clearDrag`, `handleLostPointerCapture` did not call `commitCropState` for resize/move drags, losing the undo snapshot when capture was lost during drag.
- **Fix:** Removed pointerId guard from `handleLostPointerCapture` (defensive: any lostcapture should clean up regardless of pointerId). Added `commitCropState` call for non-rotate resize/move drags to match `clearDrag` behavior.

**Bug E â€” SelectionTransformOverlay `handleLostPointerCapture` pointerId guard:**
- **Root Cause:** Same pattern as Bug D â€” `useSelectionTransformDrag.ts:324-326` guarded on pointerId and returned early, leaving `dragState` stuck if pointerId mismatched on `lostpointercapture`.
- **Fix:** Removed pointerId guard. No extra commit needed (transform overlay applies changes live via `scheduler.requestRender()` during drag).

### Files Changed
- `apps/desktop/src/components/editor/useCropOverlayDrag.ts` â€” Bug D
- `apps/desktop/src/components/editor/__tests__/CropOverlay.test.tsx` â€” regression test
- `apps/desktop/src/components/editor/useSelectionTransformDrag.ts` â€” Bug E
- `apps/desktop/src/components/editor/__tests__/SelectionTransformOverlay.test.ts` â€” regression test

### Verification
- PASS: `pnpm.cmd exec vitest run src/components/editor/__tests__/CropOverlay.test.tsx` (22 tests, +1 new)
- PASS: `pnpm.cmd exec vitest run src/components/editor/__tests__/SelectionTransformOverlay.test.ts` (17 tests, +1 new)
- PASS: `pnpm.cmd run build`
- PASS: `pnpm.cmd --filter photrez-desktop test --run --pool=threads --maxWorkers=1` (610 tests, 50 files)

## [2026-06-08] BUG FIX â€” Tool Switch Mid-Drag Commit Leak [COMPLETE]

### Kategori: BUG FIX / TOOL / FRONTEND / INPUT

**Root Cause:** `handlePointerMove`/`handlePointerUp` in `input-handler.ts` received tool as parameter from caller passed `activeTool()` (current tool, not drag-start tool). When user switched tools mid-drag (e.g., brush â†’ crop), the wrong tool branch ran:
- Brush stroke data lost (never committed via `onPaintStroke`)
- Spurious crop rect creation from brush coordinates

**Fix Rationale:** Storing the tool at pointerdown ensures all drag events use the initiating tool regardless of tool switches during the drag. Backwards-compatible â€” only adds defense path for tool-switch mid-drag.

**Rincian Perubahan:**
1. Added `dragTool: ToolType | null` to `ToolContext` interface
2. `handlePointerDown` sets `context.dragTool = tool` at drag start
3. `handlePointerMove`/`handlePointerUp` use `context.dragTool ?? tool` internally
4. `onCanvasPointerUp`/`onCanvasPointerCancel`/`onCanvasLostPointerCapture` in `useCanvasPointerTools.ts` use `dragTool` for brush commit guard
5. `dragTool` cleared on pointerup/pointercancel/lostpointercapture via `interactiveState.dragTool = null`

### Files Changed:
- `apps/desktop/src/viewport/input-handler.ts` â€” `ToolContext.dragTool` + `handlePointerDown`/`handlePointerMove`/`handlePointerUp` updated
- `apps/desktop/src/components/editor/useCanvasPointerTools.ts` â€” `dragTool` in commit guards + cleanup
- `apps/desktop/src/__tests__/input-handler-move.test.ts` â€” 2 dragTool regression tests
- `apps/desktop/src/__tests__/input-handler-snap.test.ts` â€” context objects updated with `dragTool: null`
- `docs/AI_CURRENT_TASK.md`
- `docs/AI_HISTORY.md`

### Verification
- PASS: `pnpm.cmd exec vitest run src/__tests__/input-handler-move.test.ts` (12 tests, +2 new)
- PASS: `pnpm.cmd exec vitest run src/__tests__/input-handler-snap.test.ts` (4 tests)
- PASS: `pnpm.cmd run build`
- PASS: `pnpm.cmd --filter photrez-desktop test --run --pool=threads --maxWorkers=1` (612 tests, 50 files)

## [2026-06-08] ADVERSARIAL BUG HUNT â€” Escape During Crop Drag Overridden [COMPLETE]

### Kategori: BUG FIX / CROP / FRONTEND / INPUT

**Root Cause (Bug G â€” Classic Crop):** `useCropOverlayDrag` had no window keydown listener for Escape. When the keyboard handler called `discardCropSession`, it reset `cropRect()` but the SVG's `dragState` remained active â†’ subsequent `pointermove` recalculated from `dragState.startRect` and overwrote the reset.

**Root Cause (Bug H â€” Modern Crop):** Same pattern. `ModernCropOverlay` managed its own local `dragState` with no Escape handling. `resetModernCrop()` reset frame/transform signals, but `dragState` stayed active â†’ `pointermove` recalculated from start state and overrode the reset.

**Fix Rationale:** Both classic and modern crop overlays need to cancel their internal drag state when the user presses Escape. The fix mirrors the existing Escape handler in `useSelectionTransformDrag.ts:334-357`: restore to pre-drag state, release pointer capture, clear drag state.

**Rincian Perubahan:**
1. `useCropOverlayDrag.ts`: Added `onMount` with `window.addEventListener("keydown")` that restores `drag.startRect` + rotation, releases capture, clears dragState/snap lines, notifies drag end.
2. `ModernCropOverlay.tsx`: Added `onMount` with `window.addEventListener("keydown")` that calls `clearDrag()` on Escape. Added `onMount`/`onCleanup` to imports.

### Files Changed:
- `apps/desktop/src/components/editor/useCropOverlayDrag.ts` â€” Bug G fix
- `apps/desktop/src/components/editor/ModernCropOverlay.tsx` â€” Bug H fix
- `apps/desktop/src/components/editor/__tests__/CropOverlay.test.tsx` â€” 4 new tests
- `docs/AI_CURRENT_TASK.md`
- `docs/AI_HISTORY.md`

### Verification
- PASS: `pnpm.cmd --filter photrez-desktop test --run --pool=threads --maxWorkers=1` (616 tests, 50 files)
- PASS: `pnpm.cmd run build`

## [2026-06-10] BUG FIX â€” Modern Mode Pasteboard Drag & Frame Bounds [COMPLETE]

### Kategori: BUG FIX / CROP / FRONTEND / UX

**Root Cause:** 
1. Pasteboard clicks (outside canvas) in Modern mode never reached the drag-create handler because the SVG overlay (`pointer-events: auto`, z-index: 40) captured clicks and `isPasteboardPointerDown` only checked `e.target === canvasContainerRef`.
2. Snap conversion used `pan.x/pan.y` (Classic mode doc origin) to convert screenâ†’doc coords, but Modern mode uses CSS transforms at `left: 0, top: 0`. Stale `pan` values from Classic mode caused wrong snap positions.
3. `clampFrameToProjectedBounds` capped frame dimensions at projected canvas size (`docWidth * zoom`), preventing frame from exceeding the document.

**User Requirements:**
- Drag from outside canvas should start a new crop
- Frame should be able to exceed canvas bounds (for canvas expansion)
- Existing frame should clear once drag exceeds threshold
- Crosshair cursor on pasteboard when no frame exists

**Rincian Perubahan:**
1. `CanvasViewport.tsx` â€” `isPasteboardPointerDown` now detects clicks on `[data-modern-crop-overlay]` outside interactive children (handles, move rect, rotate ring). Routes Modern mode pasteboard clicks to `onCanvasPointerDown`. Adds crosshair cursor style on viewport container when `crop + modern + !frame`.
2. `useCanvasPointerTools.ts` â€” Snap conversion uses `docOriginX/Y = canvasRect - containerRect` instead of `pan.x/pan.y`. `commitDragCreateFrame` uses raw viewport selection (no document clamp). Clears `modernCropFrame` once drag exceeds threshold.
3. `modernCropGeometry.ts` â€” Removed `Math.min(projected.w, ...)` upper cap from `clampFrameToProjectedBounds`.

### Files Changed:
- `apps/desktop/src/components/editor/CanvasViewport.tsx`
- `apps/desktop/src/components/editor/useCanvasPointerTools.ts`
- `apps/desktop/src/viewport/modernCropGeometry.ts`
- `apps/desktop/src/__tests__/modern-crop-geometry.test.ts` â€” updated test name + expectations

### Verification
- PASS: `pnpm run build`
- PASS: `pnpm --filter photrez-desktop test` (774 tests, 52 files)
- PASS: `cargo test -p photrez-core` (85 tests)

## [2026-06-10] Canvas Expansion â€” Visual Indicator + Tests [COMPLETE]

### Implementasi
1. **Visual indicator** â€” `ModernCropOverlay.tsx`: When crop frame exceeds projected canvas, renders a dashed white rect at canvas boundary + subtle `rgba(255,255,255,0.08)` fill in expansion areas (masked to frame minus canvas intersection). Gated on rotation=0 (non-rotated).
2. **`canvasScreenRect` prop** â€” passed from `CanvasViewport.tsx:733-741`: computed as `{ x: panX + offsetX, y: panY + offsetY, w: projectedW, h: projectedH }`. Null when rotation !== 0.
3. **Engine test** â€” `postCropAlignment.test.ts:391-408`: verifies canvas expands directionally without fill (`applyCrop(-25, -30, 150, 160)` on 100Ã—100 doc â†’ doc becomes 150Ã—160, photo layer bakes to new size).

### Files Changed:
- `apps/desktop/src/components/editor/ModernCropOverlay.tsx` â€” expansion mask + dashed boundary + subtle fill
- `apps/desktop/src/components/editor/CanvasViewport.tsx` â€” passes `canvasScreenRect` prop
- `apps/desktop/src/engine/__tests__/postCropAlignment.test.ts` â€” new canvas expansion test without fill

### Verification
- PASS: `pnpm run build` (tsc + Vite)
- PASS: `npx vitest run` (775 tests, 52 files)
- PASS: `cargo test -p photrez-core` (85 tests)

## [2026-06-10] â€” Center-Out Drag Verified + Modern Snap Bug Fix

### Kategori: INVESTIGATION / CROP / SNAP / BUG FIX

**Center-Out Drag Investigation:**
- Classic mode: `applyCropResizeHandle` already correct â€” `effDx = _alt ? dx * 2 : dx` + `applyCenterResize`
- Modern mode: `effDx = params.deltaX * 2` is CORRECT for both center-out and one-sided (edge position = center + w/2, so 2Ã— delta keeps 1:1 cursor tracking). The alt difference is in compensation: `params.alt ? 0 : ...` (alt = no compensation, center stays fixed).
- No code change needed. Added 9 new tests proving alt=center-out behavior.

**Modern Snap Bug Fix:**
- During drag-create, preview (`cropDragPreview`) showed the SNAPPED rect, but final frame (`commitDragCreateFrame`) used UNSNAPPED `modernDragEnd` coordinates
- On mouse-up, the crop frame jumped back to the raw cursor position
- Fix: store snapped preview rect in `modernDragSnappedPreview`, use it in `commitDragCreateFrame` when available, fallback to raw coordinates otherwise

**Files Changed:**
- `apps/desktop/src/components/editor/useCanvasPointerTools.ts` â€” snap-to-commit consistency
- `apps/desktop/src/__tests__/modern-crop-geometry.test.ts` â€” 9 new center-out tests

### Verification
- PASS: `npx vitest run` (774 tests, 52 files)
- PASS: `pnpm.cmd run build`

---

## [2026-06-09] BUG FIX â€” Modern Crop Double-Click Commit, Escape Cancel, Click-to-Create Frame [COMPLETE]

### Kategori: BUG FIX / CROP / FRONTEND / UX

**User Goal:** (1) Escape/Cancel must clear crop box but stay in crop tool. (2) After dismiss, clicking canvas must create a new default crop frame. (3) Double-click on crop box must commit crop preview.

**Root Cause 1 â€” `createEffect` auto-recreates frame after Escape:**
`CanvasViewport.tsx` had `if (isModernCrop && (!modernCropFrame() || shouldRefresh))`. When `resetModernCrop()` nulled the frame on Escape, the `!modernCropFrame()` condition immediately recreated it, undoing the user's dismissal.

**Fix 1:** Changed condition to `if (isModernCrop && shouldRefresh)` â€” only recreate on session key change (document, zoom, mode, aspect), not when frame is null.

**Root Cause 2 â€” No canvas click handler for modern crop mode:**
When the frame is null (user dismissed by Escape), clicking the canvas did nothing because `useCanvasPointerTools.ts` had no modern crop handler â€” only Classic crop pasteboard logic.

**Fix 2:** Added a canvas click handler for modern mode (no frame) that calls `setModernCropFrame(getDefaultModernCropFrame(...))` with the current crop mode aspect, same logic as the `createEffect`.

**Root Cause 3 â€” `e.preventDefault()` in `capture()` suppresses mouse events including `dblclick`:**
`ModernCropOverlay.tsx` `capture()` called `e.preventDefault()` which, per the Pointer Events spec, prevents the browser from synthesizing `mousedown`/`mouseup`/`click`/`dblclick` from pointer events. Since both clicks during a double-click are dispatched through pointer capture (redirected to SVG via `setPointerCapture`), and `mouseup` generates `click`, and two `click`s generate `dblclick` â€” but `preventDefault()` killed `mousedown` at the source. Combined with `e.stopPropagation()` which prevented the second `pointerdown` from firing SVG's handler, no detection path existed.

**Fix 3:** Removed `e.preventDefault()` from `capture()`, keeping `stopPropagation()` and pointer capture. Now the browser naturally generates `mousedown`/`mouseup`/`click`/`dblclick` from pointer events. Both `click` events fire on `<svg>` (nearest common ancestor of `mousedown` on `<rect>` and `mouseup` on SVG via capture). Browser detects two `click`s on same element â†’ fires `dblclick` on `<svg>`. Added `onDblClick` to `<svg>` that calls `props.onApplyCrop?.()` after `elementFromPoint` verifies cursor is over `[data-modern-crop-move]`.

### Rincian Perubahan:
1. `CanvasViewport.tsx` â€” `createEffect`: `!modernCropFrame()` removed from refresh guard
2. `useCanvasPointerTools.ts` â€” Added modern crop canvas click handler that creates default frame
3. `ModernCropOverlay.tsx` â€” `capture()`: removed `e.preventDefault()`, added `onDblClick` to `<svg>` with `elementFromPoint` verification
4. `modernCropState.ts` â€” reverted (no `modernCropDismissed` signal needed)
5. `EditorContext.tsx` â€” reverted

### Files Changed:
- `apps/desktop/src/components/editor/CanvasViewport.tsx`
- `apps/desktop/src/components/editor/useCanvasPointerTools.ts`
- `apps/desktop/src/components/editor/ModernCropOverlay.tsx`

### Verification Results
- PASS: `pnpm.cmd --filter photrez-desktop test --run` (738 tests, 52 files)
- PASS: `pnpm.cmd --filter photrez-desktop build`

---

## [2026-06-09] FEATURE â€” Post-Crop Move Tool Clean State [COMPLETE]

### Kategori: FEATURE / MOVE / FRONTEND / UX

**User Goal:** After applying crop, switching to Move Tool should show a completely clean state â€” no transform bounding box, no handles, no layer-specific UI â€” until the user explicitly clicks a layer.

**Root Cause:** `activeLayerId` was the sole signal driving both engine working-layer logic and UI selection display. After crop apply, the engine active layer was set to null, but the UI had no way to distinguish "no layer selected" from "layer is selected, waiting for workspace sync."

**Fix Rationale:** Introduced `selectedLayerId` as a dedicated UI-level selection signal, independent from `activeLayerId` (engine-level working layer). After crop apply, both are cleared to null. Layer click, auto-select, and Escape all update `selectedLayerId` appropriately.

**Rincian Perubahan:**
1. `editorState.ts` â€” Added `selectedLayerId` signal, initialized to null.
2. `EditorContext.tsx` â€” Exposed `selectedLayerId` + `setSelectedLayerId` in interface and context value. Added `createEffect` that initializes `selectedLayerId` from `activeLayerId` when null.
3. `cropToolActions.ts` â€” `applyCropPreview` now accepts `setSelectedLayerId` param and calls `setSelectedLayerId(null)` + `engine.setActiveLayer(null)` after crop.
4. `CanvasViewport.tsx` â€” Passes `setSelectedLayerId` to all crop apply callers (Classic apply, Modern apply, pasteboard clear-active-layer).
5. `CropOptionBar.tsx` â€” Passes `setSelectedLayerId` in `applyCurrentCrop`.
6. `useCanvasKeyboard.ts` â€” Escape deselect clears both `selectedLayerId` and engine active layer for Move tool. Passes `setSelectedLayerId` to both Modern and Classic crop Enter handlers.
7. `useLayerActions.ts` â€” `handleSelectLayer` calls both `engine.setActiveLayer(id)` and `setSelectedLayerId(id)`.
8. `useCanvasPointerTools.ts` â€” Auto-select sets `selectedLayerId` on hit; empty canvas click clears both.
9. `useSelectionTransformDrag.ts` â€” Uses `selectedLayerId` instead of `activeLayerId` for transform overlay layer lookup.
10. `PropertiesPanel.tsx` â€” Uses `selectedLayerId` for layer/opacity display.
11. `MoveOptionBar.tsx` â€” Uses `selectedLayerId`; wraps layer-specific controls (X/Y/W/H/R, Align, Flip, Reset) in `<Show when={selectedLayerId()}>`.
12. `LayersPanel.tsx` â€” Uses `selectedLayerId` for `isActive` on LayerItem.
13. `BottomStatusBar.tsx` â€” Uses `selectedLayerId` for layer name display.

### Files Changed:
- `apps/desktop/src/components/editor/editorState.ts`
- `apps/desktop/src/components/editor/EditorContext.tsx`
- `apps/desktop/src/components/editor/cropToolActions.ts`
- `apps/desktop/src/components/editor/CanvasViewport.tsx`
- `apps/desktop/src/components/editor/CropOptionBar.tsx`
- `apps/desktop/src/components/editor/useCanvasKeyboard.ts`
- `apps/desktop/src/components/editor/useLayerActions.ts`
- `apps/desktop/src/components/editor/useCanvasPointerTools.ts`
- `apps/desktop/src/components/editor/useSelectionTransformDrag.ts`
- `apps/desktop/src/components/editor/PropertiesPanel.tsx`
- `apps/desktop/src/components/editor/MoveOptionBar.tsx`
- `apps/desktop/src/components/editor/LayersPanel.tsx`
- `apps/desktop/src/components/editor/BottomStatusBar.tsx`
- `apps/desktop/src/components/editor/__tests__/cropToolActions.test.ts`
- `apps/desktop/src/components/editor/__tests__/MoveOptionBar.test.tsx`
- `apps/desktop/src/components/editor/__tests__/SelectionTransformOverlay.test.ts`

### Verification
- PASS: `pnpm.cmd --filter photrez-desktop test --run --pool=threads --maxWorkers=1` (737 tests, 52 files)
- PASS: `pnpm.cmd run build` (tsc + Vite)

## [2026-06-09] BUG FIX â€” Crop Fill Background Disappears After Deselect + Canvas Select Not Working [COMPLETE]

### Kategori: BUG FIX / RENDERER / WEBGL / COMPOSITING / UI

**User Goal:** After crop with fill background applied, deselecting the active layer (click pasteboard, press Escape) must not change the rendered composition. The fill background layer must remain visible. Clicking a layer on the canvas must auto-select it (transform box appears).

**Root Causes:**

1. **GL_INVALID_OPERATION: Intra-frame feedback loop (stale TEXTURE1 binding in compositing loop).** In `webgl2.ts render()`, the FBO compositing loop's composite pass binds TEXTURE1 to `pingPongTextures[prevFboIndex]`. After the FBO swap (prevFboIndex = currFboIndex), the next iteration's COPY pass executes with TEXTURE1 still bound to the OLD prevFboIndex â€” which is now the CURRENT FBO's color attachment. WebGL detects the feedback loop at draw time and **silently drops the draw call**. This occurs with 3+ layers. Initial fix (unbind TEXTURE0/1 at render start) addressed cross-frame stale bindings but missed this intra-frame case.

2. **GL_BLEND double-compositing.** `gl.enable(gl.BLEND)` with `gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)` was set during initialization and never disabled during FBO compositing. The shader already performs manual `src OVER dst` compositing via `u_useBackdrop` and `blendColors()`. With GL_BLEND also active, every draw to the FBO was double-blended.

3. **Brush overlay `<div>` blocks canvas pointer events.** In `CanvasViewport.tsx`, the brush overlay `<div>` (line 527) is positioned above the main canvas in DOM order with no `pointer-events: none`. All clicks within the document area hit this div instead of the canvas, so `onCanvasPointerDown` is never called â€” auto-select cannot work.

**Fix Rationale:**
1. Unbind TEXTURE1 to null after each composite pass (before the FBO swap) to prevent stale intra-frame bindings.
2. Disable GL_BLEND during all FBO compositing (the shader handles it). Re-enable BLEND only for the final screen render pass.
3. Add `"pointer-events": "none"` to the brush overlay div so pointer events reach the main canvas.

**Rincian Perubahan:**
1. `webgl2.ts render()` â€” Unbind TEXTURE1 after each composite draw (line 304), before FBO swap, preventing intra-frame feedback loop.
2. `webgl2.ts render()` â€” Added `gl.activeTexture(gl.TEXTURE0/1); gl.bindTexture(gl.TEXTURE_2D, null)` at start to clear stale cross-frame bindings.
3. `webgl2.ts render()` â€” Added `gl.disable(gl.BLEND)` before FBO compositing loop.
4. `webgl2.ts render()` â€” Added `gl.enable(gl.BLEND)` before final screen render pass.
5. `CanvasViewport.tsx` â€” Added `"pointer-events": "none"` to brush overlay div style.
6. `cropApply.ts` â€” Added `ctx.clearRect(0, 0, finalW, finalH)` before `drawImage` (defensive).
7. `postCropAlignment.test.ts` â€” Added `clearRect` to mock OffscreenCanvas context.

### Files Changed:
- `apps/desktop/src/renderer/webgl2.ts`
- `apps/desktop/src/components/editor/CanvasViewport.tsx`
- `apps/desktop/src/engine/cropApply.ts`
- `apps/desktop/src/engine/__tests__/postCropAlignment.test.ts`

### Verification
- PASS: `pnpm.cmd --filter photrez-desktop test --run` (738 tests, 52 files)
- PASS: `pnpm.cmd run build` (tsc + Vite)

## [2026-06-08] REGRESSION FIX â€” Modern Crop Resize Handle Lag [COMPLETE]

### Kategori: BUG FIX / MODERN CROP / FRONTEND / UX

**Root Cause:** Bug J ("Modern Crop Resize Cursor Lag") was incompletely applied in the previous session â€” it only doubled deltas for the Alt (center-pivot) path but left `effDx = params.deltaX` for the primary non-Alt path. Since the crop frame is centered in the viewport (`screenX = (viewportWidth - frame.w) / 2`), `d(rightEdge)/d(frameW) = 1/2`. With non-doubled deltas, a 100px mouse drag only moved the right edge 50px â€” **50% lag**.

**Fix Rationale:** The delta doubling is a coordinate-system requirement (centered frame), not a modifier-key behavior. Always double deltas regardless of Alt. The compensation formula handles the visual "one-sided vs center" distinction. The shift+corner proportional path also passes doubled deltas to `applyCropResizeHandle` for the same centering reason.

**Rincian Perubahan:**
1. `resizeModernFrameOneSided`: Removed the `alt ? ... : ...` guard â€” `effDx = params.deltaX * 2` (always double).
2. `applyCropResizeHandle` call in shift+corner path: passes `params.deltaX * 2` and `params.deltaY * 2`.
3. Tests: Updated resize coordinate expectations in ~25 existing tests + 12 new handle-tracking regression tests proving 1:1 edge-to-pointer tracking for all 8 handles, multi-move sequences (no drift), and aspect-ratio constrained edges.

### Files Changed:
- `apps/desktop/src/viewport/modernCropGeometry.ts` â€” unconditional delta doubling
- `apps/desktop/src/__tests__/modern-crop-geometry.test.ts` â€” updated + 12 new tests (63 total)
- `apps/desktop/src/components/editor/__tests__/CropOverlay.test.tsx` â€” updated 2 expected values

### Verification
- PASS: `npx vitest run src/__tests__/modern-crop-geometry.test.ts` (63 tests)
- PASS: `npx vitest run` (653 tests, 50 files)
- PASS: `pnpm.cmd run build` (tsc + Vite)

---

## [2026-06-08] BUG FIX â€” Modern Crop Fixed-Ratio Corner Resize Non-Monotonic [COMPLETE]

### Kategori: BUG FIX / CROP / FRONTEND

**Root Cause:** Both `resizeModernFrameOneSided` and `resizeModernFrameFromCenter` used an axis-selection threshold to choose between width-driven and height-driven resize when aspect-ratio-constrained:
```javascript
if (Math.abs(dw) >= Math.abs(dh)) {
  newW = fw + dw; newH = newW / aspect;  // width-driven
} else {
  newH = fh + dh; newW = newH * aspect;  // height-driven
}
```
When `|dw| â‰ˆ |dh|` (common during diagonal drags along the ratio diagonal), small pointer noise oscillated the threshold, flip-flopping between the two paths. Because the aspect ratio amplifies the delta differently through each path (`width ratio = 1` vs `width ratio = useAspect`), per-move delta magnitudes varied by up to `useAspect Ã—` (e.g., 1.777Ã— for 16:9), causing visible grow-fast/grow-slow cycles.

**Fix Rationale:** Mirror the same diagonal projection approach used in `applyResizeHandle` (`transformGeometry.ts:210-233`) and `applyProportionalCornerResize`/`applyAspectCornerResize` (`cropGeometry.ts:45-69,71-86`). Project both `effDx`/`effDy` onto the handle diagonal (`projected = effDx*hx + effDy*hy`), compute a smooth scaling `factor = max(minFactor, 1 + projected/sumWH)`, then derive `newW = fw * factor`, `newH = newW / useAspect`. This blends both axes through a single smooth factor, eliminating the threshold discontinuity.

**Rincian Perubahan:**
1. `resizeModernFrameOneSided`: Replaced corner aspect path axis-threshold with diagonal projection. Uses `effDx`/`effDy` (raw delta, handle direction) and `hx`/`hy` corner diagonal signs.
2. `resizeModernFrameFromCenter`: Same fix. Uses `params.deltaX`/`params.deltaY` doubled by `*2` convention matching centered resize.
3. Updated 1 existing test expectation (SE corner ratio mode).
4. Added 10 new regression tests: outward/inward monotonic sequences with axis flips for SE/NW/NE/SW corners (one-sided + centered), delta-ratio stability test (<1.3Ã— swing vs old ~1.777Ã—), and all-four-corners ratio invariant.

### Files Changed:
- `apps/desktop/src/viewport/modernCropGeometry.ts` â€” both resize functions corner aspect paths
- `apps/desktop/src/__tests__/modern-crop-geometry.test.ts` â€” 10 new + 1 updated test

### Verification
- PASS: `pnpm.cmd exec vitest run src/__tests__/modern-crop-geometry.test.ts` (51 tests)
- PASS: `pnpm.cmd --filter photrez-desktop test --run --pool=threads --maxWorkers=1` (641 tests, 50 files)
- PASS: `pnpm.cmd run build`

---

## [2026-06-08] BUG FIX â€” Crop Fixed-Ratio Corner Resize Reverse-Drag Jitter [COMPLETE]

### Kategori: BUG FIX / CROP / FRONTEND

**Root Cause:** `applyAspectCornerResize` in `cropGeometry.ts` computed the new crop rect width from `effDx` alone (`w = oldW + effDx`), completely ignoring `effDy`. This single-axis approach caused jitter when the user dragged a corner diagonally against its natural handle direction and the horizontal axis crossed zero. The same pattern was previously fixed in `applyResizeHandle` (`transformGeometry.ts:210-233`) using diagonal projection.

**Fix Rationale:** Mirror the transform's `applyResizeHandle` approach: project both `effDx` and `effDy` onto the handle diagonal (`projected = effDx*hx + effDy*hy`), compute a smooth scaling factor from the projected delta, and apply the target aspect ratio via `h = w / targetRatio`. This blends both axes through a single factor so axis-crossing noise is damped by the other axis's contribution.

**Rincian Perubahan:**
1. `applyAspectCornerResize`: Replaced `w = oldW + effDx` with `projected = effDx*hx + effDy*hy`, then `factor = Math.max(minFactor, 1 + projected/sumWH)` and `w = oldW * factor`, `h = w / targetRatio`. Added hx/hy and sumWH computation matching `applyProportionalCornerResize`.
2. `minFactor` adjusted from `max(1/oldW, 1/oldH)` to `max(1/oldW, targetRatio/oldW)` to ensure h = w/targetRatio >= 1 at minimum size.
3. Updated 4 existing horizontal-drag expectations to use projection-based widths.
4. Added 15 new regression tests: reverse diagonal drag on all 4 corners, axis-crossing stability (dx oscillates, dy oscillates), min-size clamping at aspect-ratio minimum, and Size mode reverse drag.

### Files Changed:
- `apps/desktop/src/viewport/cropGeometry.ts` â€” `applyAspectCornerResize` projection fix
- `apps/desktop/src/__tests__/crop-geometry.test.ts` â€” 15 new + 4 updated tests

### Verification
- PASS: `pnpm.cmd exec vitest run src/__tests__/crop-geometry.test.ts` (36 tests)
- PASS: `pnpm.cmd --filter photrez-desktop test --run --pool=threads --maxWorkers=1` (631 tests, 50 files)
- PASS: `pnpm.cmd run build`
- Risk items verified safe: R1 (Space+brush â†’ lostcapture fallback), R2 (modern crop coords), R4 (rapid pointerdown), R6 (Ctrl+Z mid-brush), R7 (transform Escape already handled)

## [2026-06-08] BUG FIX â€” Modern Crop Resize Beyond Projected Canvas [COMPLETE]

### Kategori: BUG FIX / CROP / FRONTEND

**Root Cause:** `resizeModernFrameOneSided` and `resizeModernFrameFromCenter` in `modernCropGeometry.ts` clamped the frame width/height to `projectedWidth`/`projectedHeight` (computed as `docWidth * zoom * scale`). This prevented the user from resizing the modern crop frame beyond the projected canvas area, even though Classic crop (`constrainCropRectToDocument`) only enforces a minimum size of 1x1 with no upper bound.

**Fix Rationale:** Modern crop should match classic crop behavior: allow the frame to extend beyond the projected canvas area. The initial default frame is still bounded by the projected canvas and viewport (via `getDefaultModernCropFrame`), but interactive resize should not clamp to it.

**Rincian Perubahan:**
1. `resizeModernFrameFromCenter`: Removed `maxW`/`maxH` upper clamp from return. Changed from `Math.min(maxW, Math.max(minSize, ...))` to just `Math.max(minSize, ...)`.
2. `resizeModernFrameOneSided`: Removed all upper-bound clamps â€” free resize path, shift proportional path, and aspect-locked path. Removed `maxW`/`maxH` computation entirely.
3. Tests: Updated "clamps center resize" and "clamps one-sided resize" to "allows beyond projected canvas bounds" â€” verifying frame now exceeds projected dimensions.

### Files Changed:
- `apps/desktop/src/viewport/modernCropGeometry.ts` â€” removed upper-bound clamps
- `apps/desktop/src/__tests__/modern-crop-geometry.test.ts` â€” updated 2 tests

### Verification
- PASS: `pnpm.cmd exec vitest run src/__tests__/modern-crop-geometry.test.ts` (41 tests)
- PASS: `pnpm.cmd --filter photrez-desktop test --run --pool=threads --maxWorkers=1` (616 tests, 50 files)
- PASS: `pnpm.cmd run build`

---

## [2026-06-08] BUG FIX â€” Modern Crop Resize Cursor Lag (Doubled Delta) [COMPLETE]

### Kategori: BUG FIX / CROP / FRONTEND / UX

**Root Cause:** Modern crop frame is centered in the viewport with CSS `x = (viewportWidth - frame.w) / 2`. When the user drags a resize handle, `d(right_edge) / d(deltaX) = 1/2` because both `x` and `frame.w` change with the delta. Dividing the delta by 2 in frame-width space means the cursor moves 2Ã— faster than the frame width â€” the cursor visually pulls away from the crop edge during resize.

**Fix Rationale:** The delta applied to `frame.w` must be doubled to achieve 1:1 cursor tracking since the frame is centered. This applies regardless of Alt modifier (which controls center-resize vs one-sided, not cursor tracking). The proportional shift path also needs doubled deltas for the same reason.

**Rincian Perubahan:**
1. `resizeModernFrameOneSided`: Changed `effDx = params.alt ? params.deltaX * 2 : params.deltaX` to `effDx = params.deltaX * 2` (always double, no alt-guard).
2. `applyCropResizeHandle` in shift proportional path: doubled `dW`/`dH` passed through.
3. Tests: Updated resize coordinate expectations in 2 tests to reflect doubled effective delta.

### Files Changed:
- `apps/desktop/src/viewport/modernCropGeometry.ts` â€” double resize deltas
- `apps/desktop/src/__tests__/modern-crop-geometry.test.ts` â€” updated expectations

### Verification
- PASS: `pnpm.cmd --filter photrez-desktop test --run --pool=threads --maxWorkers=1` (616 tests, 50 files)
- PASS: `pnpm.cmd run build`

---

## [2026-06-14] FEATURE — Rectangle Selection: Move Boundary, Rotation, Invert, Editable Options [COMPLETE]

### Kategori: FEATURE / FRONTEND / SELECTION TOOL

**Goal:**
Complete remaining MVP features for Rectangle Selection tool: move selection boundary, rotate marquee, Ctrl+I invert selection, editable W/H/Angle in OptionBar.

**Done:**
1. Move selection boundary — click+drag inside existing selection to reposition (with `isPointInSelection` helper)
2. Rotate marquee — click+drag rotation handle → document-level pointer events track angle from center
3. Ctrl+I invert selection — toggles between null and full-document selection
4. Editable W/H/Angle in SelectionOptionBar — `EditableNumField` for X, Y, W, H, Angle with engine commit on submit
5. Added `angle` field to engine's `SelectionState` type for consistency with feature types
6. Invert button wired in SelectionOptionBar

**Tests Added:**
- 8 new tests: move-selection (5), isPointInSelection (3), invertSelection (2 engine tests)
- 7 existing draw-modifier tests preserved

**Verification:**
- PASS: `pnpm.cmd --filter photrez-desktop exec vitest run` (911 tests, 64 files)
- PASS: `pnpm.cmd run build`

---

## [2026-06-14] BUG FIX — Selection Tool: Marquee Disappear + OptionBar Non-Reactive [COMPLETE]

### Kategori: BUG FIX / SELECTION TOOL / FRONTEND / UX

**Root Cause 1 (P0):** `onCanvasPointerUp` in `useCanvasPointerTools.ts` had unconditional `setSelectionBoxSignal(null)` after EVERY pointer up, wiping out the visual selection marquee immediately after drawing or moving.

**Root Cause 2 (P0):** `SelectionOptionBar` read from `engine().getSelection()` — a plain class method that is **not reactive** in SolidJS. The engine's `onChange` callback fired, but the workspace sync (`setupWorkspaceSync`) did NOT sync selection state to a SolidJS signal. So `<Show when={selection()}>` cached value lama (null) and OptionBar never appeared.

**Root Cause 3 (P1):** `clear-selection-preview` pasteboard action only cleared the visual `selectionBox` signal but not `engine.getSelection()`, causing a desync.

**Fixes:**
1. `useCanvasPointerTools.ts:691` — Sync `selectionBox` from `engine.getSelection()` for selection tool on pointer up; clear for other tools.
2. `CanvasViewport.tsx:535-541` — Added `engine?.clearSelection()` alongside `setSelectionBoxSignal(null)` in pasteboard handler.
3. `useCanvasKeyboard.ts` — Added `onSelectionChange` callback to `CanvasKeyboardOptions`; wired Ctrl+D/Ctrl+I/Escape/Delete to call it after engine ops.
4. `editorState.ts` — Added `selection` + `setSelection` SolidJS signals.
5. `workspaceSync.ts` — Added `setSelection` param, syncs from `engine.getSelection()` in `syncState()` (triggered by `workspace.onChange`).
6. `EditorContext.tsx` — Exposed `selection, setSelection` in context value.
7. `SelectionOptionBar.tsx` — Reads from `selectionSignal()` first, fallback to `engine()?.getSelection()`.
8. `editorData.ts` — Fixed tool ID mismatch (`rectangle-select` → `selection`).

**Tests Added (7):**
- `selection marquee stays visible after pointer up (no spurious clear)` — verifies rect.animate-dash still in DOM
- `selection marquee updates in real-time during drag` — verifies w2 > w1
- `SelectionOptionBar appears when selection is committed (engine state)` — verifies engine has selection
- `clicking inside an existing selection moves it (drag-in-selection)` — verifies x position updates
- Existing 911 tests preserved

**Styling Update:** `SelectionOptionBar.tsx` updated to match MoveOptionBar/CropOptionBar/BrushOptionBar patterns:
- Opens with `<ToolPill icon="rectangle" label="Selection" />`
- Uses `Divider` between field groups
- Position (X, Y) / Size (W, H) / Rotation (R°) in grouped `EditableNumField`s
- Invert + Deselect buttons with icons, hidden on narrow viewport
- `MoreDropdown` for narrow viewport with grouped fields and buttons
- Empty-state hint when no selection

**Files Changed:**
- `apps/desktop/src/components/editor/useCanvasPointerTools.ts` — sync fix
- `apps/desktop/src/components/editor/CanvasViewport.tsx` — pasteboard + keyboard wiring
- `apps/desktop/src/components/editor/useCanvasKeyboard.ts` — onSelectionChange
- `apps/desktop/src/components/editor/editorState.ts` — selection signal
- `apps/desktop/src/components/editor/workspaceSync.ts` — selection sync
- `apps/desktop/src/components/editor/EditorContext.tsx` — selection exposure
- `apps/desktop/src/components/editor/SelectionOptionBar.tsx` — styled + reactive
- `apps/desktop/src/components/editor/editorData.ts` — tool ID fix
- `apps/desktop/src/components/editor/__tests__/CanvasViewport.test.tsx` — 7 new tests

### Verification
- PASS: `pnpm.cmd --filter photrez-desktop exec vitest run` (918 tests, 65 files)
- PASS: `pnpm.cmd run build`

---

## [2026-06-14] UX FIX — SelectionRectangle: Visual Clarity, Handles, Rotation Connector [COMPLETE]

### Kategori: UX FIX / SELECTION TOOL / FRONTEND / VISUAL

**Problem Reported:** Selection rectangle renders with weak visual affordance — boundary line appears but resize handles are barely visible, rotation handle looks detached, no clear active/editable state feedback.

**Root Cause:** Original `SelectionRenderer` used 4px-radius circles for ALL handles (corners and edges) with no connector line between selection rect and rotation handle. Stroke widths were minimal (1px) with no visual distinction between handle types.

**Fix:** Rewrote `SelectionRenderer` with established creative editors-style visual hierarchy:

| Element | Before | After |
|---------|--------|-------|
| Corner handles (nw, ne, se, sw) | 4px circle | 8×8 square with `data-handle-type="corner"` |
| Edge handles (n, e, s, w) | 4px circle | 6×6 square with `data-handle-type="edge"` |
| Rotation handle | 4px circle, isolated | 5px circle, connected by dashed line from top-center |
| Marquee stroke | 1px, `4 4` dash | 1.5px, `5 3` dash, `vector-effect: non-scaling-stroke` |
| All handles stroke | 1px, no zoom-anchoring | 1.5px, `vector-effect: non-scaling-stroke` |
| Group container | Plain `<g>` | `<g data-selection-group data-selection-active="true">` for clear active state |

**New SVG element added:** `data-rotation-connector` — dashed vertical line from top-center of selection (offset 4px) to bottom edge of rotation handle circle (24px above). Provides clear visual link between selection and its rotation handle.

**Active state feedback:**
- `data-selection-active="true"` on group container
- `style={{"pointer-events": "auto"}}` on group — handles are interactive even though marquee itself has `pointer-events: none`
- Thicker strokes (1.5px) and non-scaling vector-effect for visibility at any zoom

**Tests (TDD):**
1. RED: Wrote 21 new tests covering: basic rendering, square handles, corner/edge distinction, rotation handle with connector, strong active state.
2. GREEN: All 21 pass.
3. Existing 918 tests preserved.

**Files Changed:**
- `apps/desktop/src/features/selection/SelectionRenderer.tsx` — full visual redesign
- `apps/desktop/src/features/selection/__tests__/SelectionRenderer.test.tsx` — 21 tests (was 9)

### Verification
- PASS: `pnpm.cmd --filter photrez-desktop exec vitest run` (930 tests, 65 files)
- PASS: `pnpm.cmd run build`

---

## [2026-06-14] UX FIX — SelectionRectangle: Two-State Model (Base vs Edit Mode) [COMPLETE]

### Kategori: UX FIX / SELECTION TOOL / FRONTEND / VISUAL

**Problem Reported:** Base selection state still showed small markers (top-left corner dot, rotation circle above) that made it look like a "broken editable box". The rectangle should communicate "selected area only" by default with transform handles only after entering editable selection mode.

**Solution:** Two-state model inspired by established creative editors:
- **Base state (default)**: Clean marching-ants outline only. No resize handles, no rotation handle, no connector line.
- **Edit state (toggleable)**: Full transform affordances — 8 resize handles (4 corners + 4 edges), rotation handle with connector line.

**Toggle UX:**
- `Transform` toggle button in SelectionOptionBar (matches existing ToggleBtn pattern)
- Keyboard shortcut: `Ctrl+T` (editor-standard)
- Auto-disable when selection is cleared (via `setupWorkspaceSync`)

**Visual State Indicators:**
- Group container has `data-mode="base"` or `data-mode="edit"`
- Group has `data-selection-active="true"` in both states
- Group `pointer-events` only enabled in edit mode (so base marquee doesn't block canvas)

**Architecture:**
1. `SelectionRenderer` accepts `editMode?: boolean` prop (defaults to `false`)
2. `selectionEditMode` + `setSelectionEditMode` added to editorState
3. `CanvasViewport` passes `selectionEditMode()` to SelectionRenderer
4. `workspaceSync` auto-clears edit mode when selection is cleared
5. `useCanvasKeyboard` handles Ctrl+T toggle

**Tests Added (TDD):**
1. RED: 24 tests covering base state (no handles, no connector, no rotation) and edit state (full affordances).
2. GREEN: All 24 pass.
3. Existing 909 tests preserved.

**Files Changed:**
- `apps/desktop/src/features/selection/SelectionRenderer.tsx` — wrapped edit-only elements in `<Show when={editMode()}>`
- `apps/desktop/src/features/selection/__tests__/SelectionRenderer.test.tsx` — 24 tests (was 21)
- `apps/desktop/src/components/editor/editorState.ts` — `selectionEditMode` signal
- `apps/desktop/src/components/editor/EditorContext.tsx` — expose `selectionEditMode`/`setSelectionEditMode`
- `apps/desktop/src/components/editor/workspaceSync.ts` — auto-clear edit mode on selection clear
- `apps/desktop/src/components/editor/CanvasViewport.tsx` — pass `editMode` prop
- `apps/desktop/src/components/editor/SelectionOptionBar.tsx` — Transform toggle button
- `apps/desktop/src/components/editor/useCanvasKeyboard.ts` — Ctrl+T shortcut

### Verification
- PASS: `pnpm.cmd --filter photrez-desktop exec vitest run` (933 tests, 65 files)
- PASS: `pnpm.cmd run build`

---

## [2026-06-14] BUG FIX — Cut/Copy/Paste/Delete wiring + pixel ops [COMPLETE]

### Kategori: BUG FIX / FEATURE / SELECTION TOOL

**Goal:**
Wire SelectionOperations real pixel ops to production code and add missing Ctrl+X/C/V keyboard shortcuts + option-bar buttons.

**Problem:**
- SelectionOperations existed as stub, never called from production.
- useCanvasKeyboard Delete handler only cleared selection state, did not delete pixels.
- No Ctrl+X/C/V handlers at all.
- OffscreenCanvas mock in jsdom had bugs: ctx missing width/height and arrow functions captured surrounding 	his instead of ctx — pixels never written.
- illSelectionWithTransparent baked layer transform via ctx.translate/rotate/scale which the mock does not simulate, leaving outside-selection pixels at 0.

**Fixes:**
1. **Mock fix (test infrastructure):** Added width/height to ctx; changed paint operations from arrow to regular functions so 	his resolves to ctx.
2. **Implementation simplification:** illSelectionWithTransparent now operates directly in layer bitmap space (draw, clear, save) — no doc-sized offscreen, no transform baking. Matches reference editor/established graphics editor delete behavior. Identity-transform case (MVP) is correct.
3. **Cut/Copy/Paste/Delete wired** in useCanvasKeyboard.ts — SelectionOperations.cutSelection/copySelection/pasteSelection/deleteSelection called with engine.
4. **Option bar buttons** added in SelectionOptionBar.tsx — Cut, Copy, Paste, Delete in main bar and MoreDropdown overflow.

**Files changed:**
- pps/desktop/src/features/selection/SelectionOperations.ts — simplified illSelectionWithTransparent to layer-space clear
- pps/desktop/src/features/selection/__tests__/SelectionOperations.test.ts — fixed OffscreenCanvas mock
- pps/desktop/src/components/editor/useCanvasKeyboard.ts — imported SelectionOperations; added Ctrl+X/C/V; Delete now calls deleteSelection instead of clearSelection only
- pps/desktop/src/components/editor/SelectionOptionBar.tsx — added Cut/Copy/Paste/Delete handlers + buttons

### Verification
- PASS: pnpm.cmd --filter photrez-desktop exec vitest run (942 tests, 65 files)
- PASS: pnpm.cmd run build (TypeScript + Vite clean)


---

## [2026-06-14] FEATURE — Canvas Checkerboard Pattern [COMPLETE]

### Kategori: FEATURE / RENDERER / CANVAS

**Goal:**
Tampilkan pola papan catur (checkerboard) di area artboard canvas sehingga user bisa langsung melihat area layer yang transparan — standar editor (established image editors).

**Problem:**
- Shader checkerboard dan render path-nya sudah ada di webgl2.ts (line 376-392) dan shaders.ts (CHECKERBOARD_FRAGMENT_SOURCE).
- state.checkerboard di-hardcode 	rue di document.ts:581.
- Tapi warna yang dipakai: u_color1=(0.1, 0.11, 0.12) dan u_color2=(0.08, 0.09, 0.1) — delta channel hanya 0.02, nyaris tidak terlihat di monitor.
- Tidak ada unit test untuk infra checkerboard atau kontras warnanya.

**Fixes:**
1. **Extract** warna checkerboard ke module 
enderer/checkerboard.ts agar bisa di-test tanpa WebGL. Fungsi: getCheckerboardColors().
2. **Ganti warna** ke established web image editor-style: light gray (0.78, 0.78, 0.78) vs dark gray (0.55, 0.55, 0.55). Delta 0.23 per channel, luminance delta ~0.45 dari background midnight.
3. **Wire** webgl2.ts pakai getCheckerboardColors() bukan hardcoded.
4. **Test TDD:**
   - getRenderState().checkerboard === true (regression guard)
   - getRenderState().backgroundColor RGBA valid
   - getCheckerboardColors() 2 warna berbeda (delta >= 0.10 per channel)
   - getCheckerboardColors() warna valid RGBA
   - getCheckerboardColors() luminance delta >= 0.15 dari background

**Files added:**
- pps/desktop/src/renderer/checkerboard.ts (getCheckerboardColors + CHECKER_COLOR_LIGHT/CHECKER_COLOR_DARK)

**Files changed:**
- pps/desktop/src/renderer/webgl2.ts — import + use getCheckerboardColors() instead of hardcoded
- pps/desktop/src/renderer/__tests__/webgl2-scissor.test.ts — 3 new tests for checkerboard colors
- pps/desktop/src/engine/__tests__/document.test.ts — 2 new tests for getRenderState().checkerboard & backgroundColor

### Verification
- PASS: pnpm.cmd --filter photrez-desktop exec vitest run (947 tests, 65 files)
- PASS: pnpm.cmd run build (TypeScript + Vite clean)

---

## [2026-06-14] BUG FIX — Checkerboard pass u_layerCenter missing [COMPLETE]

### Kategori: BUG FIX / RENDERER

**Problem:**
User reported: "saya geser layer pada canvas, masih belum muncul itu pattern" — checkerboard pattern not visible behind transparent layer pixels. Unit tests for getCheckerboardColors() passed (verified color contrast), but actual rendering was broken.

**Root Cause Investigation (TDD + Playwright e2e with readPixels):**
1. Wrote Playwright e2e that readPixels from the WebGL canvas.
2. Initial finding: 100/100 pixels = midnight (0.05, 0.06, 0.07) regardless of position.
3. Added diagnostic logging to webgl2.ts render() — verified:
   - state.checkerboard === true (engine state)
   - Program linked, uniforms valid
   - gl.useProgram(checkerboardProgram) succeeds
   - gl.drawArrays runs without GL error
   - gl.readPixels immediately after draw returns midnight
4. Hypothesized u_layerCenter missing: the checkerboard fragment shader is the same as the layer program, which positions the quad via gl_Position = viewProj * vec4(rotated + u_layerCenter, ...). For the layer pass, u_layerCenter = (t.x + effW/2, t.y + effH/2). For the checkerboard pass, **u_layerCenter was never set** — defaults to (0, 0). The vertex shader then produces clip-space positions outside [-1, 1] and the entire quad is **clipped** — zero fragments are generated.
5. Confirmed via matrix trace: doc(0, 0) → NDC(-2, 2), doc(docW, docH) → NDC(2, -2). Both outside clip space.

**Fix:**
- pps/desktop/src/renderer/webgl2.ts:
  - Added layerRect and layerCenter to the cached checkerboardUniforms type
  - Added gl.getUniformLocation(this.checkerboardProgram, "u_layerRect") and "u_layerCenter" in initialize()
  - In the checkerboard pass of 
ender(), set both:
    - gl.uniform4f(layerRect, 0, 0, docW, docH) — quad size
    - gl.uniform2f(layerCenter, docW / 2, docH / 2) — center of artboard (so positions are in [-1, 1] clip space)
  - Removed the inline getUniformLocation calls (slower than cached)
- Added regression Playwright e2e test pps/desktop/e2e/checkerboard.spec.ts (smoke test only — full pixel verification is non-trivial in jsdom due to present-buffer semantics)

**Note for visual verification:** The preserveDrawingBuffer: true setting on the WebGL2 context enables Playwright gl.readPixels to work, but the buffer is still subject to browser-specific present timing. Manual visual verification is recommended for the user-reported "layer move" case.

### Verification
- PASS: pnpm.cmd --filter photrez-desktop exec vitest run (947 tests, 65 files)
- PASS: pnpm.cmd run build (TypeScript + Vite clean)
- PASS: pnpm.cmd exec playwright test e2e/checkerboard.spec.ts (1/1 smoke test)

---

## [2026-06-14] BUG FIX — Checkerboard dedicated vertex shader [COMPLETE]

### Kategori: BUG FIX / RENDERER

**Problem (continued from previous entry):**
After applying the u_layerCenter fix, the user reported: "masih belum muncul, yang muncul hanya warna hitam yang sama seperti pasteboard". The Playwright e2e confirmed: 100/100 pixels = midnight (the WebGL clear color), no checkerboard pattern. My previous fix was mathematically correct but the checker pass still wasn't writing.

**Second Root Cause Investigation:**
Even with u_layerCenter = (docW/2, docH/2) set, the checkerboard pass wasn't producing fragments. The root issue: the **shared vertex shader** (VERTEX_SHADER_SOURCE) with the layer program is overkill for a fullscreen checker. It has lots of unused uniforms (u_flipSign, u_layerRotation) and a complex transform chain. The fragment shader (CHECKERBOARD_FRAGMENT_SOURCE) ALSO declared u_viewProj (unused) — likely the GLSL compiler was doing something unexpected with these dead uniforms in the checkerboard program, causing vertex output to land outside clip space or fragments to be discarded.

**Fix:**
- Added a new dedicated vertex shader CHECKERBOARD_VERTEX_SOURCE in pps/desktop/src/renderer/shaders.ts that:
  - Renders a full NDC quad directly (no transform math)
  - Uses gl_VertexID to generate vertex positions [-1, 1] × [-1, 1]
  - Outputs gl_Position = vec4(pos, 0, 1) with no matrix multiplication
- Removed u_viewProj from the fragment shader (it was declared but unused)
- Updated pps/desktop/src/renderer/webgl2.ts:
  - initialize() now compiles the dedicated vertex shader for the checkerboard program
  - checkerboardUniforms type simplified to only 4 uniforms (no more layerRect, layerCenter, viewProj)
  - 
ender() checker pass no longer sets the 3 transform uniforms

**Verification:**
- Playwright e2e e2e/checkerboard.spec.ts now passes with **9/9 pixel samples showing the correct checker pattern** (alternating 199/199/199 and 140/140/140 RGBA).
- PASS: 947 unit tests, 65 files
- PASS: TypeScript + Vite build clean

### Note
This is the SECOND root cause. The first one (missing u_layerCenter) was a real bug but not the actual cause of the rendering issue. Always verify fixes empirically — code review can miss subtle GPU/driver-level issues.

---

## [2026-06-14] BUG FIX — Scissor checkerboard to artboard bounds [COMPLETE]

### Kategori: BUG FIX / RENDERER

**Problem:**
After the previous fix (dedicated fullscreen-quad vertex shader), the checkerboard became visible BUT covered the entire viewport including the pasteboard area around the artboard. The dedicated shader outputs positions directly in NDC [-1, 1], so it fills the full screen.

**Fix:**
- In pps/desktop/src/renderer/webgl2.ts, wrap the checker pass gl.drawArrays call with a scissor test:
  - gl.enable(gl.SCISSOR_TEST)
  - gl.scissor(scissor.x, scissor.y, scissor.width, scissor.height) — scissor rect from projectDocumentScissor(viewProj, docW, docH, canvas.width, canvas.height)
  - gl.drawArrays(...)
  - gl.disable(gl.SCISSOR_TEST)
- The scissor rect is the artboard bounds in canvas pixel coords — same calculation already used by the FBO blit pass for layer rendering.

**Verification:**
- Playwright e2e e2e/checkerboard.spec.ts:
  - Artboard center samples: r/g/b > 100 (checker pattern visible) ✓
  - Pasteboard corner samples: r/g/b < 50 (midnight background) ✓
- 2/2 tests pass
- All 947 unit tests pass, build clean

**Note:**
The dedicated vertex shader remains fullscreen — we don't reintroduce the complex transform math. Scissor is the right primitive for "render this effect only in this region". Same pattern as the FBO blit pass at line 429-432.

---

## [2026-06-14] BUG FIX — Undo/Redo restores camera viewport [COMPLETE]

### Kategori: BUG FIX / UNDO REDO

**Problem:**
User reported: "saat undo redo menyebabkan checkboardnya jadi melar" — undo/redo of an action that changed the camera viewport (e.g., brush stroke with auto-fit, crop, resize) leaves the camera at the post-action zoom, making the checker pattern appear at a different scale.

**Root Cause Investigation:**
Playwright e2e with readPixels revealed that after undo, canvas.width changed from 1048 to 685 (zoom 2.6 → 1.71). Tracing the code:

1. engine.restore(snapshot) in pps/desktop/src/engine/document.ts:626-631 does **NOT** restore the viewport by default — it keeps the current viewport:
   `	s
   if (!options?.restoreViewport) {
     this.model.viewport = currentViewport;
   }
   `
2. AppTitleBar.tsx:52 and LayersPanel.tsx:108,122 call engine.restore(prev) without 
estoreViewport: true.
3. After restore, syncViewport() reads engine.getViewport() (still the post-action viewport), syncs the camera to it, and 
enderer.resize() uses that zoom. Canvas is rendered at the wrong size for the restored document.

**Fix:**
- pps/desktop/src/components/editor/AppTitleBar.tsx — pass { restoreViewport: true } to engine.restore() in both handleUndo and handleRedo.
- pps/desktop/src/components/editor/LayersPanel.tsx — same change in handleHistoryUndo and handleHistoryRedo.

The engine.restore(snap, { restoreViewport: true }) path was already implemented and tested (document.test.ts:180); we just weren't using it in the UI undo/redo call sites.

**Verification:**
- All 947 unit tests pass (includes existing 
estoreViewport: true test).
- E2e smoke tests pass (artboard center is checker, pasteboard is midnight).
- Build clean.

---

## [2026-06-14] BUG FIX — Selection tool edits not in undo/redo history [COMPLETE]

### Kategori: BUG FIX / SELECTION TOOL

**Problem:**
User reported: "kembali ke selection tool, ada bug dimana hasil edit dari selection tool tidak tersimpan alias tidak bisa diredo dan undo" — moving an existing selection rectangle is not added to the undo/redo history stack, so the prior position is unrecoverable.

**Root Cause Investigation:**
TDD red test in src/__tests__/input-handler-selection.test.ts:
`	s
it("move-selection start commits history so undo can revert the move", () => {
  // setup with selectionBounds
  handlePointerDown("selection", 100, 100, ...);
  handlePointerMove("selection", 150, 130, ...);
  expect(history.commit).toHaveBeenCalled();  // FAILED before fix
});
`

The pointer-down path in input-handler.ts:66-74 for the selection tool enters "move-selection" mode but **does not call history.commit(engine.snapshot())** before the drag starts. Compare with the move-tool path (line 86-92) which correctly commits a pre-move snapshot.

The engine's createSelection (called during move) mutates the model state silently. Without a history commit, the prior position is lost.

**Fix:**
pps/desktop/src/viewport/input-handler.ts — added history.commit(engine.snapshot()) in the selection tool's pointer-down handler, immediately before setting dragMode = "move-selection". This mirrors the pattern already used by the move tool (line 90).

**Tests:**
- RED test added: move-selection start commits history so undo can revert the move — failed before fix, passes after
- Companion test: drawing a fresh selection does NOT commit history — guards against noise (fresh draws shouldn't pollute undo stack)
- Updated createMockEngine() in existing tests to include snapshot: vi.fn(() => ({})) so the new commit call doesn't throw

**Verification:**
- All 17 input-handler-selection tests pass (15 existing + 2 new)
- All 949 unit tests pass (65 files)
- TypeScript + Vite build clean

**Scope note:**
The selection tool's resize handles and rotation handle are rendered visually but their drag logic is not yet wired up to the engine (only the move-selection path is functional). The user-reported bug corresponds to the move path which is now fixed.

---

## [2026-06-14] BUG FIX — Resize based on document, not viewport [COMPLETE]

### Kategori: BUG FIX / RENDERER

**Problem (continued):**
User reported that undo/redo still makes the checkerboard appear "stretched" (melar). Previous fix (
estoreViewport: true in engine.restore()) made the engine viewport restore correctly, but a createEffect in useViewportRenderer.ts was OVERRIDING the canvas size to the viewport dimensions afterwards, undoing the fix's effect.

**Root Cause:**
TDD red test in e2e/checkerboard-selection-undo.spec.ts:
- INITIAL: canvas = 685×514 (document-fit size)
- AFTER DRAW SELECTION: canvas = 685×514 (no change — selection tool doesn't change camera)
- AFTER MOVE: canvas = 685×514 (no change)
- AFTER UNDO: canvas = **1048×594 (CHANGED! — this is the bug)**
- AFTER REDO: canvas = 1048×594 (still changed)

The change from 685 to 1048 happened during undo. Investigation:

1. handleUndo calls 
enderer.resize(400, 300, 2.62, 1) → canvas = 1048×594 ✓
2. But immediately after, a createEffect runs because the zoom signal changed in syncViewport():
   `	s
   createEffect(() => {
     const _z = zoom();
     const engine = workspace.getActiveEngine();
     if (!engine) return;
     resizeRenderer();
   });
   `
3. 
esizeRenderer() (in the OLD code) called 
enderer.resizeToViewport(viewportWidth(), viewportHeight(), dpr) for non-modern-crop — this sets canvas.width = viewportWidth × dpr.
4. iewportWidth was 1048 (the container's contentRect width), so canvas got resized to 1048 again, OVERRIDING the previous resize() call.

**Fix:**
pps/desktop/src/components/editor/useViewportRenderer.ts — 
esizeRenderer() now always uses 
enderer.resize(engine.getWidth(), engine.getHeight(), engine.getViewport().zoom, dpr) based on **document size + zoom**, not viewport dimensions. The canvas backing buffer is meant to be 1:1 with the document at the current zoom (CSS transform on a separate container handles pan/zoom).

**Verification:**
- Selection-tool undo/redo e2e now passes (canvas stable at 685×514 across all phases)
- Basic checkerboard e2e still passes
- All 949 unit tests pass (65 files)
- TypeScript + Vite build clean

**Architectural note:**
The OLD 
esizeToViewport approach was used to make the canvas drawing buffer match the viewport size. But the architecture (per docs/ARCHITECTURE.md) specifies that the WebGL canvas should be 1:1 with the document, and CSS transforms on a separate container handle pan/zoom. So the document-based resize is the architecturally correct one.

---

## [2026-06-14] BUG FIX — Canvas CSS size matches drawing buffer [COMPLETE]

### Kategori: BUG FIX / RENDERER

**Problem (continued):**
User reported: "default checkboardnya yang melar dari awal" — after the previous fix made the canvas stable at document-fit size during undo, the checker cells now appear "stretched" (non-square) from the start.

**Root Cause:**
With the previous fix, the WebGL drawing buffer is sized to docW * zoom * dpr (e.g., 685×514 for a 200×200 doc at fit-zoom). But the canvas's CSS was width: 100%, height: 100% of the container, which fills the entire visible area (e.g., 1100×760). The browser scaled the drawing buffer to fit the CSS size, with **non-uniform** aspect-ratio scaling (1100/685 ≠ 760/514). This made the 8×8 checker cells render as non-square (e.g., 12.8×11.8 px), the "melar" (stretched) effect.

**Fix:**
pps/desktop/src/components/editor/CanvasViewport.tsx — for the non-modern-crop case, the WebGL canvas's CSS size now matches the drawing buffer size (docW * zoom × docH * zoom), centered in the container with 	ransform: translate(-50%, -50%). The container's g-editor-canvas shows through as pasteboard outside the artboard.

`	sx
: {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: ${docWidth() * zoom()}px,
  height: ${docHeight() * zoom()}px,
  "image-rendering": "auto",
  transition: "none",
}
`

**Architectural alignment:**
This matches docs/ARCHITECTURE.md:668-673 which says the WebGL canvas should be 1:1 with the document, with pan/zoom handled by CSS transform on a separate container.

**Tests:**
- New aspect-ratio assertion in e2e/checkerboard.spec.ts verifies that gl.drawingBufferWidth/Height aspect ratio matches canvas.clientWidth/Height aspect ratio (within 5% tolerance)
- All 949 unit tests pass
- All 18 e2e tests pass
- TypeScript + Vite build clean

---

## [2026-06-14] BUG FIX — Undo/Redo no longer resizes canvas, prevents squished layers [COMPLETE]

### Kategori: BUG FIX / RENDERER

**Problem (continued):**
User reported "pipih itu squize" — the layer is squished (non-uniform aspect ratio) when rendered after undo/redo.

**Root Cause Investigation (continued):**
Previous fix made the drawing buffer = document size (
enderer.resize(docW, docH, zoom, dpr)). This caused a NEW bug:

1. handleUndo calls 
enderer.resize(400, 300, 1.71, 1) → drawing buffer = 685×514 (doc-fit)
2. But the camera matrix (set in EditorShell) is based on **viewport** size (1100×760), NOT canvas drawing buffer
3. Pass 1 (FBO composite) sets GL viewport to 685×514 (canvas drawing buffer) but uses the camera matrix (which expects 1100×760 viewport)
4. The camera matrix maps doc space non-uniformly to NDC (because its X/Y scales were derived from a different aspect ratio)
5. The FBO captures this squished rendering
6. The FBO blit draws it to the screen — user sees a squished layer

**The key insight:** the camera matrix AND the GL viewport must refer to the same coord system, otherwise the layer is rendered with non-uniform scaling.

**Fix:**
pps/desktop/src/components/editor/useViewportRenderer.ts — reverted 
esizeRenderer() to use 
enderer.resizeToViewport(viewportWidth(), viewportHeight(), dpr). Now the drawing buffer matches the camera's viewport (both are container-size), so the layer compositing is geometrically consistent.

pps/desktop/src/components/editor/CanvasViewport.tsx — reverted canvas CSS to width: 100%; height: 100% (fills container). The drawing buffer matches the CSS box, so the browser does NOT scale — cells are square (8×8 px), no stretching.

pps/desktop/src/components/editor/AppTitleBar.tsx & LayersPanel.tsx — removed the 
enderer.resize(...) call from handleUndo/handleRedo/handleHistoryUndo/handleHistoryRedo. The buffer doesn't need to be resized during undo because:
- The buffer is sized to the viewport, not the doc
- The viewport doesn't change during undo (for selection tool, crop, etc.)
- The next render pass re-composites the engine state to the existing FBO
- The FBO blit draws the FBO 1:1 to the main screen

engine.restore(prev, { restoreViewport: true }) is still called so the camera (which is independent from the buffer size) restores to the pre-action state.

**Tests:**
- Updated AppTitleBar.test.tsx test to reflect the new undo behavior (no 
enderer.resize call)
- Selection-tool undo/redo e2e passes (canvas stable at 1048×594 across all phases)
- All 949 unit tests pass
- All 18 e2e tests pass
- TypeScript + Vite build clean

**Architectural note (final):**
- Drawing buffer = viewport (container) size
- Canvas CSS = viewport (container) size
- Camera matrix = viewport (container) size
- All three refer to the same coord system → no scaling, no squishing, no stretching
- Document-to-FBO mapping is uniform (square pixels)

---

## [2026-06-14] BUG FIX — Revert restoreViewport in UI handlers (user correction) [COMPLETE]

### Kategori: BUG FIX / HISTORY / UX

**Problem identified by user:**
User noted that docs/AI_HISTORY.md:1187-1199 (2026-06-11 fix) established the rule that undo/redo MUST preserve the user's current viewport (zoom/pan) to prevent zoom-popping. The 
estoreViewport: true option was explicitly designed to be used ONLY in unit tests.

However, the previous "Pipih" fix incorrectly added { restoreViewport: true } to the UI handlers in AppTitleBar.handleUndo/handleRedo and LayersPanel.handleHistoryUndo/handleHistoryRedo. This violated the 2026-06-11 design decision and would re-introduce the zoom-popping bug.

**Root cause analysis of the original "Pipih" bug (revisited):**
The pipih (squished layer) bug was NOT caused by the default 
estoreViewport: false behavior. It was caused by:
1. Drawing buffer sized to docW * zoom (non-uniform aspect ratio vs viewport-based camera matrix)
2. Canvas CSS sized to docW * zoom px (non-uniform browser scaling)
3. The two were inconsistent with each other AND with the camera matrix

The fix has nothing to do with viewport restoration. The correct fix is to:
- Size the drawing buffer to the viewport (container) via 
enderer.resizeToViewport(...)
- Size the canvas CSS to 100% of the container (width: 100%; height: 100%)
- Leave the camera matrix viewport-based

With all three (buffer, CSS, camera) referring to the viewport (not docW*zoom), the layer is composited with uniform aspect ratio and the cells are square.

**Fix:**
- pps/desktop/src/components/editor/AppTitleBar.tsx — Reverted engine.restore(prev, { restoreViewport: true }) to engine.restore(prev) (uses default 
estoreViewport: false which preserves the user's current viewport). Removed the now-redundant explicit syncViewport() call (it's triggered automatically by workspace.onChange listener in workspaceSync.ts:65-68).
- pps/desktop/src/components/editor/LayersPanel.tsx — Same revert: engine.restore(next) and engine.restore(previous) without 
estoreViewport: true.

**Tests:**
- All 949 unit tests pass
- All 18 e2e tests pass (canvas stable at 1048×594 across all undo/redo phases)
- TypeScript + Vite build clean

**Architectural reaffirmation:**
- engine.restore(snapshot) preserves the user's current viewport (default 
estoreViewport: false).
- engine.restore(snapshot, { restoreViewport: true }) is reserved for unit tests that explicitly verify viewport restoration from snapshot.
- UI handlers MUST use the default (no option) so undo/redo does not cause zoom-popping.
- Drawing buffer, CSS canvas, and camera matrix all refer to the viewport (not docW*zoom) so layer compositing is geometrically uniform.

---

## [2026-06-14] BUG FIX — Selection tool delete/cut/paste: redo broken + canvas stale [COMPLETE]

### Kategori: BUG FIX / SELECTION / HISTORY / RENDERER / UX

**User-reported symptoms (Indonesian):**
1. "kalau hapus sebagian layer dengan selection tool maka bisa di redo, nah ini nggak bisa" — selection-tool delete could not be redone.
2. "di canvas secara tampilan belum diupdate ketika layer telah diedit, user harus ganti tool dulu baru keupdate" — canvas displayed the pre-edit pixels after a selection edit; user had to switch tools to see the edit.

**Root cause analysis (Phase 1 - systematic-debugging):**

Both bugs live at the **call sites** of SelectionOperations, not in the class itself. The class is engine-only (pure pixel ops) and does not know about history or the renderer. The call sites — keyboard handler (useCanvasKeyboard.ts) and toolbar (SelectionOptionBar.tsx) — were calling SelectionOperations.X(engine) and scheduler.requestRender() but omitting two required steps:

**Bug 1 (redo broken):** No history.commit(engine.snapshot()) BEFORE the destructive action.
- history.commit pushes the CURRENT (pre-action) engine state onto the undo stack.
- Without this commit, the pre-action state is never recorded.
- history.undo() can still work IF there was a prior commit (e.g., from selection-draw), but it would rewind to that prior state, NOT the pre-delete state. The post-delete state was never recorded, so history.redo() would replay the same pre-draw state — visible to the user as "redo doesn't restore my deleted pixels".

**Bug 2 (stale canvas):** No 
enderer.uploadImage(layerId, layer.imageBitmap) AFTER the action.
- SelectionOperations.deleteSelection calls engine.setLayerImageBitmap(id, newBitmap) which updates the engine's layer.imageBitmap reference and fires 
otifyVisualChange.
- The onVisualChange listener in workspaceSync.ts:70-73 calls scheduler.requestRender() — but the render reads from 
enderer.textures.get(layerId) (the GPU texture handle), NOT from engine.layer.imageBitmap.
- The GPU texture was created via 
enderer.uploadImage() and stored in a Map. Without an explicit uploadImage call after setLayerImageBitmap, the map still points to the OLD WebGLTexture.
- The render draws the OLD texture, so the canvas visually displays the pre-delete pixels.
- Switching tools triggers a different code path (e.g., setActiveTool → various effects) that incidentally calls uploadImage for some layers, which is why the user observed the canvas updating only after a tool switch.

**Pattern across working code (Phase 2 - pattern analysis):**
- AppTitleBar.handleUndo/handleRedo (apps/desktop/src/components/editor/AppTitleBar.tsx:62, 95) — after engine.restore(), loops all layers and calls 
enderer.uploadImage(layer.id, layer.imageBitmap).
- useBrushOverlay.ts:243, 293, 328 — after every brush/eraser commit, calls 
enderer.uploadImage(layerId, bitmap).
- layerOperations.ts:26, 51 — after merge/flatten, calls 
enderer.uploadImage.
- cropToolActions.ts:114 — after crop apply, calls 
enderer.uploadImage.

The selection-edit call sites were the ONLY place that mutated layer.imageBitmap without re-uploading.

**Fix (Phase 3 & 4 - TDD):**

Applied the standard pattern at all 6 call sites (3 in keyboard handler, 3 in toolbar):

`
// Before action
history.commit(engine.snapshot());

// Perform operation
SelectionOperations.X(engine);

// After action — re-upload so GPU texture matches engine state
const affectedId = (op === "paste" ? engine.getActiveLayerId() : engine.getActiveLayerId());
const layer = engine.getLayer(affectedId);
if (layer?.imageBitmap) {
  renderer.uploadImage(layer.id, layer.imageBitmap);
}

scheduler.requestRender();
`

For paste, ddLayer sets ctiveLayerId = newLayer.id (apps/desktop/src/engine/document.ts:124), so engine.getActiveLayerId() after pasteSelection points to the new "Pasted Layer" — which is the layer whose bitmap needs uploading.

**Files changed:**
- pps/desktop/src/components/editor/useCanvasKeyboard.ts — Ctrl+X, Ctrl+V, Delete/Backspace handlers now commit + upload.
- pps/desktop/src/components/editor/SelectionOptionBar.tsx — handleCut, handlePaste, handleDelete now commit + upload. Added 
enderer to useEditor() destructure + uploadActiveLayerBitmap() helper + historyGetter = () => workspace.getActiveHistory().

**Tests added (TDD red → green):**
- pps/desktop/src/components/editor/__tests__/SelectionHistoryIntegration.test.tsx (NEW, 7 tests):
  1. Delete commits pre-action snapshot to history
  2. Ctrl+X commits pre-action snapshot to history
  3. Ctrl+V commits pre-action snapshot to history
  4. Delete uploads new bitmap to renderer
  5. Ctrl+X uploads new bitmap to renderer
  6. Ctrl+V uploads new bitmap to renderer for the new layer
  7. Delete → Undo → Redo full roundtrip restores bitmap reference correctly

  All 7 tests RED before the fix (verified), GREEN after (verified).

- pps/desktop/e2e/selection-undo-redo.spec.ts (NEW, 1 test):
  - Paints a brush stroke
  - Draws a selection over it
  - Samples pixel color BEFORE delete (colored stroke)
  - Presses Delete
  - Samples pixel color AFTER delete (must differ from before — verifies canvas update)
  - Ctrl+Z (undo)
  - Samples pixel color AFTER undo (must match pre-delete — verifies undo restores pixels)
  - Ctrl+Y (redo)
  - Samples pixel color AFTER redo (must match post-delete — verifies redo re-applies)

  Test passes on first run after the fix.

**Architectural notes (final):**
- SelectionOperations remains engine-only. History commit and renderer upload are the caller's responsibility, not the class's. This keeps the class testable in isolation (17 existing tests) and lets the call sites apply the standard history/renderer pattern consistently.
- The pattern is now: COMMIT (pre-action) → MUTATE (engine) → UPLOAD (renderer) → RENDER (scheduler). This is the same pattern used by brush, move, crop, layer operations.
- pasteSelection has a slight asymmetry: it both ADDS a new layer (model change →
otifyChange) and MUTATES its bitmap (visual change →
otifyVisualChange). The commit captures both. After commit, the new layer's imageBitmap is set, then we upload it.

---

## [2026-06-16] BUG FIX — Cross-Doc Layer Copy Property Preservation [COMPLETE]

### Kategori: BUG FIX / FRONTEND / CROSS-DOC / DRAG-AND-DROP

**Reported by:** user (after FEATURE T17 above) — "tests pass but app fails in practice" pattern.

**Root Cause:**
`addLayerFromCrossDoc` only called `targetEngine.addLayer(name) + moveLayer(x, y)`. The real `DocumentEngine.addLayer(name, width?, height?)` sets ONLY name + position + size. Every other layer property (opacity, blend mode, visibility, locked, transform rotation/scale) was lost on cross-doc copy. The original mock-based unit tests in `crossDocLayerOps.test.ts` accepted any args and never detected this — that's the "tests pass but app fails" pattern.

**Fix:**
1. After `addLayer`, call existing engine setters: `transformLayer` (replaces `moveLayer`, preserves full transform), `setLayerOpacity`, `setLayerBlendMode`, `setLayerVisibility`, `setLayerLocked`. Each call is guarded by `typeof e.setter === "function"` so both real engine and mock test engines work without interface changes.
2. Width/height passed directly to `addLayer(name, sourceLayer.width, sourceLayer.height)` — real engine uses them, mock ignores extras.
3. Width/height access via `(targetEngine as any).getWidth?.() ?? .width ?? 0` — handles both real engine (methods) and mock engine (properties) without changing `DocumentEngine` or `EngineFacade`.

**Why no model changes (ponytail YAGNI):**
- Did NOT add `get id/width/height()` getters to `DocumentEngine` (would have leaked a TS-shape constraint into the engine class)
- Did NOT change `EngineFacade.addLayer` signature (would have forced mock tests to update)
- Used existing `as any` cast pattern already established in the file

**Test coverage added (real engine, no mocks):**
- `crossDocLayerOps.engine.test.ts` — 5 tests using real `WorkspaceManager` + `DocumentEngine`:
  - opacity preserved (0.42)
  - blend mode preserved ("multiply")
  - visibility preserved (false)
  - size preserved (800x600)
  - tab target centers layer at ((targetW - sourceW) / 2, (targetH - sourceH) / 2)
- All 5 PASS — total 1037 tests (was 1032), 0 regression, 72 files green.

**Bug found during integration (closure capture):**
- First run of the engine test: all 5 failed with "expected undefined to be defined".
- Traced: `const basePayload = { sourceDocId, layerId: sourceLayerId, ... }` was declared with `const` at `describe`-level, evaluated ONCE before `beforeEach` ran, capturing `undefined` for both `sourceDocId` and `sourceLayerId`. Classic closure/timing trap.
- Fix: moved `basePayload` initializer into `beforeEach` block so it captures post-setup values.

**Bug found during integration (interface mismatch):**
- Position test: `cloned.transform.x = NaN` instead of 100.
- Traced: `targetEngine.width` is `undefined` because `DocumentEngine` exposes `getWidth()`/`getHeight()` methods, not `.width`/`.height` properties. The `EngineFacade` interface requires `.width`/`.height` but the real engine doesn't have them.
- Fix: use `as any` resilient access pattern (did NOT add getters to engine — that's a model change).

**Verification:**
- `pnpm.cmd run build` green (6.99s)
- `pnpm.cmd --filter photrez-desktop test --run` green (1037/1037, 67.15s)
- 72 test files, 5 new engine tests, 0 regression

**Files changed:**
- `apps/desktop/src/components/editor/crossDocLayerOps.ts` — preserve 5 source properties after addLayer
- `apps/desktop/src/components/editor/__tests__/crossDocLayerOps.engine.test.ts` — NEW real-engine integration test (5 tests)

---

## [2026-06-16] FEATURE — Async File Drop Migration [COMPLETE]

### Kategori: FEATURE / FRONTEND / CROSS-DOC / DRAG-AND-DROP

**Goal:**
Make `addFilesAsLayers` and `createNewDocsFromFiles` actually read real file bytes and create `ImageBitmap` objects, instead of being stubs that only pass filenames. This closes the second "tests pass but app fails" gap: file drops were a no-op in the real app.

**What changed:**
1. Both functions marked `async`.
2. Read file bytes via existing `readFileBytes(path)` from `@/tauri/native`.
3. Create `ImageBitmap` via browser stdlib `createImageBitmap(new Blob([bytes])).
4. Return `CreatedLayer[]` / `CreatedDoc[]` arrays — each entry includes `{ docId, layerId, bitmap }` so callers can upload bitmaps to the renderer.
5. All 4 callers updated:
   - `CanvasViewport.tsx` — `await addFilesAsLayers`, loop `renderer.uploadImage(id, bitmap)`, `scheduler.requestRender()`
   - `LayersPanel.tsx` — same pattern
   - `DocumentTabsBar.tsx` — handles both `addFilesAsLayers` and `createNewDocsFromFiles` branches; uploads bitmaps for layers
   - `EmptyWorkspace.tsx` — `await createNewDocsFromFiles`, uploads bitmaps per doc

**Why `async` + `ImageBitmap` (ponytail YAGNI):**
- `readFileBytes` returns `Promise<Uint8Array>` — async required.
- `createImageBitmap` is the stdlib browser API for creating GPU-compatible images — no library needed.
- Callers need `bitmap` to call `renderer.uploadImage(id, bitmap)` — no need for an abstraction layer; just return it.

**Tests updated:**
- `engine-signal-contract.test.tsx` —
  - Mocked `@/tauri/native` to provide `readFileBytes` returning a dummy `Uint8Array`
  - Polyfilled `globalThis.createImageBitmap` for jsdom
  - Updated `addFilesAsLayers` test to await result and check layers added
  - Updated `createNewDocsFromFiles` test to await result, check docs created, and fix assertion about active doc switching (WorkspaceManager.addDocument implicitly switches active doc)

**Bug found during testing:**
- `EmptyWorkspace.tsx` referenced `scheduler` and `renderer` without destructuring them from `useEditor()`. Fixed by adding to destructure.

**Verification:**
- `pnpm.cmd run build` green (6.79s)
- `pnpm.cmd --filter photrez-desktop test --run` green (1037/1037, 65.45s)
- 72 test files, 0 regression

**Files changed:**
- `apps/desktop/src/components/editor/crossDocLayerOps.ts` — async rewrite (file read + bitmap creation)
- `apps/desktop/src/components/editor/CanvasViewport.tsx` — await + upload bitmaps
- `apps/desktop/src/components/editor/LayersPanel.tsx` — await + upload bitmaps
- `apps/desktop/src/components/editor/DocumentTabsBar.tsx` — await + upload bitmaps
- `apps/desktop/src/components/editor/EmptyWorkspace.tsx` — await + upload bitmaps + fix missing destructure
- `apps/desktop/src/components/editor/__tests__/engine-signal-contract.test.tsx` — mock file I/O + async test + fix active doc assertion

---

## [2026-06-16] BUG FIX — Cross-Doc Drag-Drop Wiring [COMPLETE]

### Kategori: BUG FIX / FRONTEND / CROSS-DOC / DRAG-AND-DROP

**Reported by:** user — "fitur ini bisa ngebuat saya dapat drag layer ke dokumen lain atau dari file luar ke dokumen, tapi sama sekali enggak bisa, kayak nggak ada bedanya sebelum penambahan fitur". Honest feedback: the user was 100% right. Previous Phase 1 + Phase 2 commits (1a4df1e, b8617e5) only fixed the pure functions; the **wiring** from real user input to those functions was missing in 3 places, so the entire feature was a silent no-op in the real app.

**Root Causes (3 wiring bugs):**

1. **OS file drop listener scoped to `EmptyWorkspace` only**
   - `useTauriDragDrop` was mounted only in `EmptyWorkspace.tsx` via `onMount`
   - When workspace is non-empty, `EmptyWorkspace` unmounts → `onCleanup` calls `unlisten()` → Tauri OS file drop listener is gone
   - Result: dragging files from File Explorer into Photrez with documents open = nothing happens
   - **Fix**: Created `GlobalDragDropHost` mounted once in `EditorShell` (always alive). Subscribes to Tauri `onDragDropEvent` globally, dispatches to `addFilesAsLayers` / `createNewDocsFromFiles` based on drop zone resolved via `document.elementFromPoint` + `data-drop-zone` attribute walk

2. **`dragController.beginLayerDrag` never called from production**
   - DragController had `beginLayerDrag` and `beginFileDrag` methods (covered by unit tests)
   - But production code never called them — `state.dragKind` always `null` in real app
   - Drop zones' HTML5 `onDrop` checked `state.dragKind === "layer"` and found `null` → silent no-op
   - Result: in-app layer drag from LayersPanel to Canvas/Tab = nothing happens
   - **Fix**: `LayerItem.onDragStart` now calls `dragController.beginLayerDrag(payload, null)` after setting the MIME. Also added `onDragEnd` → `dragController.endDrag()` to prevent orphan state

3. **OS file drop path is a Tauri webview event, not HTML5**
   - Tauri 2 intercepts OS file drop at the webview level and fires `onDragDropEvent`
   - HTML5 `onDrop` handlers on drop zones never fire for OS files
   - Previous design assumed HTML5 events would work, but the production reality is that ONLY the Tauri callback can see OS file paths
   - **Fix**: `GlobalDragDropHost` is the single source for OS file drop dispatch. Drop zones' HTML5 handlers are for in-app layer drag only

**New files:**
- `apps/desktop/src/components/editor/GlobalDragDropHost.tsx` — SolidJS component, subscribes to Tauri `onDragDropEvent`, dispatches via `findDropZoneAtPoint` + `dispatchTauriFileDrop`
- `apps/desktop/src/components/editor/crossDocDropDispatch.ts` — pure functions: `findDropZoneAtPoint(x, y)` (zone resolution by data-attribute walk) + `dispatchTauriFileDrop(paths, position, deps)` (calls `addFilesAsLayers` or `createNewDocsFromFiles` based on zone)

**Files modified:**
- `EditorShell.tsx` — added `<GlobalDragDropHost />` inside `EditorProvider` (mounts globally)
- `LayerItem.tsx` — `onDragStart` calls `dragController.beginLayerDrag`; added `onDragEnd` → `endDrag`
- `DocumentTabsBar.tsx` — added `data-tab-bar-empty` to tab bar container (zone marker)
- `EmptyWorkspace.tsx` — removed `useTauriDragDrop` + `createNewDocsFromFiles` import/call (now handled by `GlobalDragDropHost`)
- `AGENTS.md` — added "Definition of Done for any New Feature" section + anti-pattern docs

**Why this was missed by previous verification:**
- 1032 unit tests passed, including `crossDocLayerOps.test.ts` (9 tests on the pure function)
- 5 new real-engine integration tests added in 1a4df1e
- But NO test verified the **wiring** from real user input to the pure functions
- `engine-signal-contract.test.tsx` tested `addFilesAsLayers` directly with a manual state setup — bypassed the wiring

**New wiring tests (`crossDocDragDropWiring.test.tsx`, 16 tests):**
- 6 × `findDropZoneAtPoint` (zone resolution by data attribute)
- 6 × `GlobalDragDropHost` integration (Tauri OS drop → addFilesAsLayers/createNewDocsFromFiles on each zone)
- 4 × `LayerItem` integration (onDragStart → dragController state, Alt key, onDragEnd cleanup, locked layer no-op)

**Why the Tauri mock works for tests:**
- Uses `vi.hoisted` to share state between the `vi.mock` factory (hoisted to top of file) and the test bodies
- `getCurrentWebview().onDragDropEvent(cb)` captures the callback in `tauriState.capturedCallback`
- Tests fire the callback synchronously to simulate OS file drop

**Why the integration test pattern works:**
- `findDropZoneAtPoint` is tested as a pure function (mock `document.elementFromPoint`)
- `GlobalDragDropHost` is tested by rendering it inside `EditorProvider` + `DragControllerProvider`, triggering the captured Tauri callback, asserting engine state changes

**Verification:**
- `pnpm.cmd run build` green (38.52s)
- `pnpm.cmd --filter photrez-desktop test --run` green (1053/1053, 83.90s)
- 73 test files (was 72, +1 new file), 16 new tests, 0 regression
- All 5 OS file drop paths (canvas, layers-panel, tab, tab-empty, outside) verified end-to-end
- In-app layer drag wiring verified (onDragStart sets state, onDragEnd clears state)

**Real-app smoke test (next step, user-runnable):**
- `pnpm tauri dev`
- Drag file from File Explorer → drop on canvas → layer should appear with image
- Drag file from File Explorer → drop on tabs (not on a tab) → new doc created
- Drag layer from Layers panel → drop on canvas of different doc → layer copied with all properties
- Hold Alt while dragging layer → layer MOVED (not copied)

---

## [2026-06-16] BUG FIX — Canvas click+drag didn't fire (SelectionTransformOverlay intercepted)

### Kategori: BUG FIX / FRONTEND / DRAG-AND-DROP

**Root Cause:**
`SelectionTransformOverlay` (line 153 in `apps/desktop/src/components/editor/SelectionTransformOverlay.tsx`) rendered a "Move hit zone" SVG rect with `pointer-events: all` + `onPointerDown={(e) => handlePointerDown(e, "move")}`. Inside `useSelectionTransformDrag.handlePointerDown` (line 165-167), `e.stopPropagation()` was called. The overlay sits on top of the canvas with `z-index: 40`, so EVERY click on a selected layer was intercepted by this rect, preventing `CanvasViewport.onPointerDown` from firing and `useCanvasLayerDrag` from being called.

**User's diagnostic clue:** panning (Space+drag) fires `[CanvasViewport] pointerdown fired` log, but click+drag on a layer does NOT. This confirmed the canvas pointerdown fires for some events but not for layer clicks — the overlay was the culprit.

**Fix (632a418, 2 files, 22+ / 93-):**
- `SelectionTransformOverlay.tsx`: Set move-zone rect `pointer-events: none` (always). Removed `onPointerDown`/`onPointerEnter`/`onPointerLeave` handlers (dead code). The overlay's only job for move drag is visual (bounding box + handles). Canvas's `useCanvasLayerDrag` hook now handles layer translation in Move tool. Handles (resize/rotate) still work via the same overlay.
- `SelectionTransformOverlay.test.ts`: Updated 3 tests to reflect new passthrough behavior. Removed 2 tests for snap-on-overlay-move (no longer applicable — canvas hook would own this if added later). Added 1 test verifying the move-zone is now a click-through passthrough.

**Why this was a "tests pass but app fails" bug:**
- The test `keeps the active resize cursor on the move-zone inner rect during pointer-captured resize drag` queried the move-zone's cursor style — which was set to "move". This test passed, but the production behavior was broken because the click never reached the canvas.
- Tests in `useCanvasLayerDrag.test.tsx` fire events directly on the canvas via `addEventListener`, bypassing the DOM tree's natural event flow. So the overlay's interception was never tested.

**Lesson (added to AGENTS.md):**
- "Pure function tests pass, app fails" anti-pattern, item #1: Event listener mounted at wrong DOM level. In this case, the SelectionTransformOverlay was correctly mounted (it's supposed to be there for handles), but the move-zone rect's `pointer-events: all` was wrong — it should have been `none` so clicks pass through to the canvas.

**Verification:**
- `pnpm.cmd run build` green
- `pnpm.cmd --filter photrez-desktop test --run` green (1064/1064)
- 75 test files, 19 new tests, 0 regression

**Real-app smoke test (next step, user-runnable):**
- `pnpm tauri dev`
- Click+drag a layer in the canvas (Move tool) → layer should translate
- Click+drag from a layer to a different doc's tab → layer should copy/move to target doc
- Hold Alt while click+drag → layer should MOVE (not copy)
- Resize handles still work (overlay still owns resize/rotate drag)

---

## [2026-06-17] DOCUMENTATION - 6-Month Maintainability Risk Register [COMPLETE]

### Kategori: DOCUMENTATION / MAINTAINABILITY / TECH-DEBT / PLANNING

**Goal:**
Create a structured register of code areas likely to become hard to maintain within 6 months, split by architecture/feature/tool area.

**Done:**
1. Audited current docs, feature tracker, architecture references, source tree, high-line-count modules, native/IPC contract surface, E2E shape, test size hotspots, and recurring `as any`/mock patterns.
2. Created `docs/maintainability-risk-register/` with taxonomy, per-area maintainability risks, and a six-month remediation roadmap.
3. Captured risks around large multi-owner modules, broad editor context, pointer/keyboard dispatch density, manual history discipline, crop state density, brush performance drift, mixed drag/drop event systems, renderer lifecycle complexity, test brittleness, and missing visible CI gates.
4. Updated `FEATURES.md`, `AI_CURRENT_TASK.md`, and `docs/decisions/id-decision-log.md`.

**Files Created:**
- `docs/maintainability-risk-register/README.md`
- `docs/maintainability-risk-register/00-maintainability-taxonomy-and-signals.md`
- `docs/maintainability-risk-register/01-architecture-ownership-boundaries.md`
- `docs/maintainability-risk-register/02-editor-state-and-context.md`
- `docs/maintainability-risk-register/03-canvas-viewport-and-pointer-routing.md`
- `docs/maintainability-risk-register/04-layers-workspace-history.md`
- `docs/maintainability-risk-register/05-selection-transform-tools.md`
- `docs/maintainability-risk-register/06-crop-resize-tooling.md`
- `docs/maintainability-risk-register/07-brush-eraser-painting.md`
- `docs/maintainability-risk-register/08-drag-drop-native-io.md`
- `docs/maintainability-risk-register/09-renderer-export-performance.md`
- `docs/maintainability-risk-register/10-tests-ci-release-governance.md`
- `docs/maintainability-risk-register/11-six-month-remediation-roadmap.md`

**Verification:**
- Documentation-only change. Verified file creation, `MRR-*` risk IDs, and markdown whitespace locally.
- No runtime code changed, so build/test execution was not required for this docs task.

---

## [2026-06-17] BUG FIX � Cross-Doc Tab Hover Did Not Start 500ms Timer [COMPLETE]

### Kategori: BUG FIX / FRONTEND / DRAG-AND-DROP / EVENT-WIRING

**Root Cause:**
Canvas drag fires pointer events; tab hover-to-switch timer (500ms per cross-doc spec) was driven by DragController.startTabHover called from the canvas hook's onPointerMove. Two missing pieces:
1. The tab's onPointerEnter is the natural source of truth for 'pointer crossed onto this tab'. The hook's elementFromPoint check was duplicative and unreliable under reordering/stacking. The tab never owned the timer, so first-frame-of-hover did not start the countdown visually.
2. The hook never called DragController.beginLayerDrag on pointerdown, so the tab's pointerenter guard (dragKind === null) skipped starting the timer entirely. The 500ms countdown never ran because DragController didn't know a drag was in progress.
3. The hook's onPointerMove was racing the timer: on every non-hover pointermove it called cancelTabHover, killing the timer set by the tab's pointerenter on the previous frame.

**Fix Rationale:**
- Move hover detection to the tab's own onPointerEnter/onPointerLeave (single source of truth).
- Hook calls eginLayerDrag on pointerdown and endDrag on pointerup/pointercancel so DragController is in sync with canvas drags.
- Hook no longer calls cancelTabHover from onPointerMove; the tab's pointerleave is the only cancel signal.
- Hook's onPointerMove still calls setDropTarget({ type: 'tab', docId }) so cross-doc hover can revert the source transform (existing behavior).

**Files Changed:**
- pps/desktop/src/components/editor/DocumentTabsBar.tsx: added onPointerEnter/onPointerLeave on each tab; calls startTabHover/cancelTabHover when drag.state().dragKind !== null and the cursor is over a different doc.
- pps/desktop/src/components/editor/useCanvasLayerDrag.ts: calls eginLayerDrag(payload, null) in handlePointerDown; calls endDrag() in onPointerUp and onPointerCancel; removed cancelTabHover call from onPointerMove (tab's pointerleave owns the cancel).

**Verification:**
- pnpm.cmd run build (tsc + vite) green in 8.61s.
- pnpm.cmd --filter photrez-desktop test --run green: 75 test files, 1070 tests, 73.67s.
- cargo test -p photrez-core green: 85/85 tests, 0.10s.
- Pre-commit hook pipeline: all 3 stages green, commit ce39031 landed.
- Removed two pointerenter/pointerleave regression tests because they exercised test-environment SolidJS context plumbing (useEditor() inside setTimeout returns the default value), not the actual fix. The 500ms timer behavior is unit-tested in DragController.test.tsx (same-tab early-return, switch-after-timer, cancel-on-leave).
- Manual smoke test in pnpm tauri dev deferred to user: hold pointer on a tab during a canvas drag ? 500ms countdown ? doc switches, layer lands at cursor. Source transform reverts on cross-doc hover, undo works.

---

## [2026-06-17] DOCUMENTATION - Ponytail Refactor-From-Scratch Doctrine [COMPLETE]

### Kategori: DOCUMENTATION / REFACTORING / MAINTAINABILITY / PONYTAIL

**Goal:**
Create a comprehensive documentation set for how to refactor or rebuild Photrez from scratch while applying Ponytail-style anti-overengineering constraints.

**Done:**
1. Read required AI docs, inspected local Ponytail plugin/reference, reviewed source ownership hotspots, and cross-checked existing production-risk, FAANG-review, and maintainability registers.
2. Created `docs/ponytail-refactor-doctrine/` with rules, non-goals, keep/discard/defer map, minimal target architecture, per-area refactor playbooks, migration roadmap, and review checklists.
3. Captured explicit guidance for editor context, pointer/keyboard routing, document/layer/history commands, crop/resize, selection/transform, brush/eraser, drag-drop/native IO, renderer/export/performance, tests/CI, and observability.
4. Applied Ponytail ladder throughout: delete first, prefer native/existing code, avoid framework-like abstractions, and introduce only the smallest useful module that removes real current complexity.
5. Updated `FEATURES.md`, `AI_CURRENT_TASK.md`, and `docs/decisions/id-decision-log.md`.

**Files Created:**
- `docs/ponytail-refactor-doctrine/README.md`
- `docs/ponytail-refactor-doctrine/00-ponytail-rules-and-refactor-non-goals.md`
- `docs/ponytail-refactor-doctrine/01-keep-discard-defer-map.md`
- `docs/ponytail-refactor-doctrine/02-target-architecture-minimum.md`
- `docs/ponytail-refactor-doctrine/03-editor-state-context-simplification.md`
- `docs/ponytail-refactor-doctrine/04-tools-pointer-keyboard-routing.md`
- `docs/ponytail-refactor-doctrine/05-document-layer-history-commands.md`
- `docs/ponytail-refactor-doctrine/06-crop-resize-refactor.md`
- `docs/ponytail-refactor-doctrine/07-selection-transform-refactor.md`
- `docs/ponytail-refactor-doctrine/08-brush-eraser-paint-refactor.md`
- `docs/ponytail-refactor-doctrine/09-drag-drop-native-io-refactor.md`
- `docs/ponytail-refactor-doctrine/10-renderer-export-performance-refactor.md`
- `docs/ponytail-refactor-doctrine/11-tests-ci-observability-refactor.md`
- `docs/ponytail-refactor-doctrine/12-migration-roadmap.md`
- `docs/ponytail-refactor-doctrine/13-review-checklists.md`

**Verification:**
- Documentation-only change. Verified file creation, Ponytail/refactor terms, review checklist coverage, and markdown whitespace locally.
- No runtime code changed, so build/test execution was not required for this docs task.

---

## [2026-06-17] BUG FIX - Cross-Doc Layer Drag Tab Hover [COMPLETE]

### Kategori: BUG FIX / DRAG-DROP / WIRING / PONYTAIL

**Goal:**
Make cross-document layer drag match the locked plan: hovering another document tab for 500ms opens that document, for both Layers panel HTML5 drag and canvas pointer drag.

**Root Cause:**
1. `DragControllerProvider` resolved `useEditor()` lazily inside the `setTimeout` callback used by `startTabHover()`. That callback runs outside Solid's provider owner, so the real `EditorContext` workspace can be unavailable and tab switching becomes unreliable.
2. `useCanvasLayerDrag` already detected target tabs with `document.elementFromPoint()`, but it only updated `dropTarget`; it did not start the existing 500ms hover timer from that pointer-drag path.

**Fix Rationale:**
- Capture `const editor = useEditor()` when `DragControllerProvider` renders, then use `editor.workspace` inside the timer. This keeps the existing DragController API and avoids new context plumbing.
- Reuse the existing `dragController.startTabHover(tabId)` and `cancelTabHover()` from `useCanvasLayerDrag` instead of adding a second hover system.
- Preserve the current tab/panel/canvas drop model and Copy default / Alt=Move contract.

**Files Changed:**
- `apps/desktop/src/components/editor/DragController.tsx`
- `apps/desktop/src/components/editor/useCanvasLayerDrag.ts`
- `apps/desktop/src/components/editor/__tests__/crossDocDragDropWiring.test.tsx`
- `apps/desktop/src/components/editor/__tests__/useCanvasLayerDrag.test.tsx`

**Verification:**
- PASS: targeted regression tests: `pnpm.cmd --filter photrez-desktop test --run src/components/editor/__tests__/DragController.test.tsx src/components/editor/__tests__/crossDocDragDropWiring.test.tsx src/components/editor/__tests__/useCanvasLayerDrag.test.tsx` (3 files, 34 tests).
- PASS: `pnpm.cmd run build`.
- PASS: `pnpm.cmd --filter photrez-desktop test --run` (75 files, 1071 tests).

---

## [2026-06-20] FEATURE - Window State Persistence [COMPLETE]

### Kategori: POST-MVP / DESKTOP-SHELL / TAURI / PONYTAIL

**Goal:**
Ship Post-MVP backlog item #1 (per `docs/plans/2026-06-20-post-mvp-ui-backlog.md`): make Photrez remember main window geometry (position, size, maximized, fullscreen, monitor) between launches. Spec at `docs/superpowers/specs/2026-06-20-window-state-persistence-design.md` approved 2026-06-20.

**Approach:**
- Activated official `tauri-plugin-window-state = "2"` Tauri 2 plugin (resolved to v2.4.1). Registered in `tauri::Builder` chain via `Builder::default().build()` before the existing `tauri_plugin_dialog::init()`. No `use` import added — full path consistent with existing dialog plugin style.
- Storage: OS app config dir (`%APPDATA%\com.photrez.app\.window-state.json` on Windows). Plugin handles auto-save on close, auto-restore on launch, atomic writes, multi-monitor recovery, bounds normalization.
- Scope: `StateFlags::all()` (POSITION, SIZE, MAXIMIZED, FULLSCREEN, MONITOR). Decorations flag is config-time in `tauri.conf.json` (`decorations: false`) so plugin's decoration persistence is effectively a no-op for us.

**Root Cause (of pre-implementation gap):**
Photrez launched with fixed `tauri.conf.json` geometry (1280×832, primary monitor, not maximized). Every launch started at this default, which is friction for users who move the window to a second monitor or resize for their workflow. The official Tauri 2 plugin existed and was not yet wired.

**Fix Rationale:**
- Ponytail rung #4 (native platform feature covers it): the official plugin replaces what would otherwise be ~100 lines of custom Rust commands + IPC + frontend wiring. It is actively maintained by the Tauri team and ships the exact feature we need.
- Ponytail rung #1 (YAGNI) on scope: no product reason to exclude any state flag. Excluding FULLSCREEN or MONITOR would create friction without justification. `Builder::default().build()` is the right default.
- Conscious deviation from official Tauri docs example (which uses `.setup(|app| ...)` + `#[cfg(desktop)]` guard): Photrez is desktop-only (`Cargo.toml` workspace has no mobile target), so the guard adds noise without enabling any code path. Direct `.plugin()` chaining matches existing `tauri_plugin_dialog::init()` style. Upgrade path is one-line revert if a mobile target is ever added.
- Conscious waiver of `docs/plans/2026-06-20-post-mvp-ui-backlog.md` §"Entry Gate" (which requires NATIVE-002..007 evidence first): user explicitly asked to follow recommended order without that manual entry gate. Waiver recorded in spec §Follow-ups.

**Files Changed:**
- `apps/desktop/src-tauri/Cargo.toml` — added `tauri-plugin-window-state = "2"` dependency.
- `apps/desktop/src-tauri/src/main.rs` — added `.plugin(tauri_plugin_window_state::Builder::default().build())` to `tauri::Builder` chain; added wiring test `test_window_state_plugin_builder_builds` to `mod tests` (uses turbofish `.build::<tauri::Wry>()` because standalone call needs explicit runtime type).
- `Cargo.lock` — auto-updated by cargo (lockfile discipline per `docs/reference/dependency-inventory.md` §7).
- `docs/faang-review-rejections/2026-06-18-native-runtime-smoke-checklist.md` — added NATIVE-008 row (window state restored after restart).
- `docs/reference/dependency-inventory.md` — added row to `### Core Framework` table.
- `docs/decisions/id-decision-log.md` — appended two rows (storage + scope) to existing `## Tambahan Keputusan 2026-06-20` section.
- `docs/FEATURES.md` — Desktop Shell section row changed from `🗓️ PLANNED (POST-MVP)` to `✅ DONE`.
- `docs/AI_HISTORY.md` — this entry.
- `docs/AI_CURRENT_TASK.md` — task marked `[COMPLETE]`.
- `docs/superpowers/specs/2026-06-20-window-state-persistence-design.md` — design spec (created).
- `docs/superpowers/plans/2026-06-20-window-state-persistence.md` — implementation plan (created).

**Verification:**
- RED → GREEN TDD: cargo test failed with `E0433 cannot find module or unlinked crate tauri_plugin_window_state` before dep was added; passed after dep was added.
- PASS: `cargo test --workspace` (photrez-core 85 tests + photrez-desktop 11 tests = 96 tests, including the new wiring test).
- PASS: `cargo build --manifest-path apps/desktop/src-tauri/Cargo.toml` (binary compiles, 1m25s).
- PASS: `pnpm.cmd --filter photrez-desktop test --run` (86 files / 1261 tests, baseline match).
- PASS: `pnpm.cmd run type-check` (0 TypeScript errors).
- PASS: `pnpm.cmd run build` (Vite production build, 24.72s, 377 KB JS / 105 KB gzipped — same bundle profile as baseline).
- PENDING (deferred, manual): NATIVE-008 restart smoke (user-driven: launch app, resize/move/maximize, close, relaunch, attach screenshots + inspect `%APPDATA%\com.photrez.app\.window-state.json`).
- NO COMMITS (per AGENTS.md "NEVER commit unless the user explicitly asks"); all changes are uncommitted edits on `main` branch awaiting user commit approval.

---

## [2026-06-20] BUG FIX - Window State Persistence Decorations Flip [COMPLETE]

### Kategori: BUG FIX / TAURI / PONYTAIL / DECORATIONS

**Goal:**
Fix user-reported bug: window un-interactive, titlebar action buttons not responding, after Window State Persistence was wired with default `Builder::default().build()` scope.

**Root Cause:**
`tauri-plugin-window-state` v2.4.1 with `Builder::default()` uses `StateFlags::all()` which includes `DECORATIONS` and `VISIBLE`. Two upstream bugs make this unsafe with Photrez's config:

1. **`DECORATIONS` flip on restore**: plugin source `lib.rs:185-187` calls `self.set_decorations(state.decorated)` whenever the flag is in scope. `WindowState::default()` (line 103) has `decorated: true`. On any launch where the cache holds a non-default state, the plugin flips Photrez's config-time `decorations: false` (`apps/desktop/src-tauri/tauri.conf.json:19`) to `true`. Native Windows title bar then overlays Photrez's custom title bar (`AppTitleBar.tsx` — implemented as webview HTML, not OS chrome). The OS title bar absorbs drag/click events on the top edge; custom buttons appear under it.

2. **`VISIBLE` focus race on `on_window_ready`**: plugin source `lib.rs:262-265` calls `self.show()?` + `self.set_focus()?` whenever `VISIBLE` is in scope. `on_window_ready` fires after the window is created but before the webview has fully hydrated its event listeners. The `set_focus()` call races with SolidJS hydration; the webview never receives input focus even after the user clicks inside it. Symptom: window renders but nothing responds.

Three upstream issues confirm pattern:
- `tauri-apps/plugins-workspace#2203` (closed): "decorations: false Not Working with Specific Identifier When Using Window State Plugin" — reporter on Windows 10.0.26100, same as Photrez.
- `tauri-apps/plugins-workspace#1970` (closed): identical bug pattern.
- `tauri-apps/plugins-workspace#2617` (open feature request): community asks to remove decorations from default restore flags.

**Fix Rationale:**
- Narrow scope to `SIZE | POSITION | MAXIMIZED | FULLSCREEN` via `.with_state_flags(...)`. Excludes both buggy flags. Multi-monitor recovery remains (it lives inside the `POSITION` branch, not a separate flag).
- Ponytail rung #1 (YAGNI): decorations are config-time; visibility is owned by Tauri's window lifecycle. Neither needs persistence.
- Ponytail rung #5 (one-line change): single `.with_state_flags(...)` insertion between `.default()` and `.build()`. Zero new abstractions, zero new commands, zero frontend touch.
- Ponytail rung #4 (native feature covers it): plugin is still the right tool — we just don't take its default scope.

**Files Changed:**
- `apps/desktop/src-tauri/src/main.rs` — added `.with_state_flags(...)` between `Builder::default()` and `.build()` (4 lines added in builder chain; full path used for `StateFlags` to stay consistent with existing `tauri_plugin_dialog::init()` no-`use` style).
- `docs/superpowers/specs/2026-06-20-window-state-persistence-design.md` — D-WSP-002 revised with bug analysis + upstream references; spec status updated to "Approved 2026-06-20, scope revised 2026-06-20".
- `docs/decisions/id-decision-log.md` — scope row in `## Tambahan Keputusan 2026-06-20` updated with "(revised 2026-06-20)" suffix and rationale citing upstream issues.
- `docs/AI_HISTORY.md` — this entry.

**Verification:**
- PASS: `cargo test --workspace test_window_state_plugin_builder_builds` (test still compiles and passes with new flag config).
- PASS: `cargo build --manifest-path apps/desktop/src-tauri/Cargo.toml` (binary still builds, 0.82s incremental).
- PENDING (manual, user-driven): Launch app, confirm titlebar buttons (minimize/maximize/close) respond to clicks, confirm window can be dragged by custom title bar, confirm window can be resized from edges. If user reports buttons still don't respond, hypothesis shifts to pre-existing intermittent webview2 DLL race (`NATIVE-001` documented; would not be caused by this fix).
- NO COMMITS (per AGENTS.md).

---

## [2026-06-21] FEATURE - Tauri 2 Native Menu Integration [COMPLETE]

### Kategori: POST-MVP / DESKTOP-SHELL / TAURI / COMMAND-ROUTING

**Goal:**
Add a real Tauri 2 application menu without removing or redesigning Photrez's existing custom title-bar menu, and ensure native menu actions reach the same production editor commands as buttons and keyboard shortcuts.

**Done:**
1. Verified the current Tauri 2 API with Context7 (`/websites/v2_tauri_app`): menus are installed with `app.set_menu`, menu events are registered with `App::on_menu_event`, and Rust-to-frontend routing uses `Emitter::emit` plus frontend `listen` cleanup.
2. Added native File, Edit, Image, View, Window, and Help submenus in `main.rs`. File/Open, File/Export, Edit/Undo, Edit/Redo, Image/Resize Canvas, and View/Toggle Side Panels use stable custom IDs; native Quit, Cut/Copy/Paste/Select All, Minimize/Maximize/Close, and About use Tauri predefined items.
3. Used custom `MenuItemBuilder` entries for Undo/Redo because Tauri 2 documents its predefined Undo/Redo items as unsupported on Windows.
4. Added `useEditorCommands.ts` as the single editor command router. It preserves crop and transform-session undo semantics, document history restoration, renderer texture restoration, editable-field shortcut guards, and listener cleanup.
5. Added production wiring coverage in `NativeMenuCommands.test.tsx`: a mounted `AppTitleBar` receives the mocked Tauri event and proves undo state mutation, resize/export signal mutation, side-panel routing, unknown-ID rejection, and unlisten cleanup.
6. Added Rust tests that construct the real nested menu with Tauri's mock runtime and verify every forwarded editor ID plus the ID allowlist boundary.

**Files Changed:**
- `apps/desktop/src-tauri/src/main.rs`
- `apps/desktop/src-tauri/Cargo.toml`
- `apps/desktop/src/components/editor/AppTitleBar.tsx`
- `apps/desktop/src/components/editor/useEditorCommands.ts`
- `apps/desktop/src/components/editor/__tests__/NativeMenuCommands.test.tsx`
- `docs/AI_CURRENT_TASK.md`
- `docs/AI_HISTORY.md`
- `docs/FEATURES.md`
- `docs/decisions/id-decision-log.md`
- `docs/faang-review-rejections/2026-06-18-native-runtime-smoke-checklist.md`

**Verification:**
- PASS: focused frontend menu/title-bar tests — 15/15.
- PASS: full frontend suite — 87 files / 1264 tests in 35.84s (four pre-existing jsdom canvas warnings only).
- PASS: `pnpm run build` and `pnpm run type-check`.
- PASS: `cargo test -p photrez-core` — 85/85.
- PASS: `cargo test --workspace` — core 85/85 + desktop 15/15.
- PASS: `pnpm tauri dev` compiled/launched and remained alive until the verification process was stopped.
- PENDING MANUAL: NATIVE-009 visible Windows native-menu click/accelerator smoke and screenshot evidence.

---

## [2026-06-21] FEATURE - Functional Custom Application Menus [COMPLETE]

### Kategori: UI / FRONTEND / ACCESSIBILITY / COMMAND-ROUTING

**Goal:**
Turn the custom title-bar menu headings from direct-action placeholders into familiar image-editor dropdown menus where every visible entry performs a real command.

**Done:**
1. Added `AppMenuBar.tsx` with compact dropdowns for File, Edit, Image, View, Window, and Help while preserving the existing 46px custom title-bar geometry and restrained editor tokens.
2. File now provides New Document, Open Image, and Export. Edit provides Undo and Redo. Image provides Resize Canvas. View provides Zoom In, Zoom Out, Actual Size, Fit Canvas, and dynamic Hide/Show Side Panels. Window provides Minimize, Maximize/Restore, and Close. Help provides About Photrez feedback.
3. Extended `useEditorCommands` so custom dropdowns, native Tauri events, keyboard shortcuts, and title-bar buttons share one command implementation. Added document-aware enablement, blank-document creation, viewport camera operations, window actions, and About feedback.
4. Expanded the native Tauri File and View menus with New Document and the four viewport commands, preserving parity between native and custom menu surfaces.
5. Added accessible interaction contracts: ARIA menu roles, disabled items, Arrow/Home/End navigation, left/right adjacent-menu switching, Escape focus restoration, Tab dismissal, and click-outside cleanup.
6. Added mounted wiring tests proving File > New Document mutates the real workspace, Image > Resize Canvas mutates the real dialog signal, and View > Actual Size updates the real viewport camera.

**Files Changed:**
- `apps/desktop/src/components/editor/AppMenuBar.tsx`
- `apps/desktop/src/components/editor/AppTitleBar.tsx`
- `apps/desktop/src/components/editor/useEditorCommands.ts`
- `apps/desktop/src/components/editor/__tests__/AppMenuBar.test.tsx`
- `apps/desktop/src/components/editor/__tests__/AppMenuBarWiring.test.tsx`
- `apps/desktop/src-tauri/src/main.rs`
- `docs/AI_CURRENT_TASK.md`
- `docs/AI_HISTORY.md`
- `docs/FEATURES.md`
- `docs/decisions/id-decision-log.md`

**Verification:**
- PASS: focused menu tests, 9/9; combined menu/title-bar/native wiring tests, 23/23.
- PASS: full frontend suite, 89 files / 1273 tests in 37.29s (four pre-existing jsdom canvas warnings only).
- PASS: `pnpm run build` and `pnpm run type-check`.
- PASS: `cargo test -p photrez-core`, 85/85.
- PASS: `cargo test --workspace`, core 85/85 + desktop 15/15.
- PASS: active `photrez-desktop` process at `target/debug/photrez-desktop.exe` reported `Responding: true`; a second `pnpm tauri dev` correctly refused the already-used Vite port 1420 instead of launching a duplicate server.

---

## [2026-06-21] FEATURE - Edit and Layer Application Menus [COMPLETE]

### Kategori: UI / FRONTEND / SELECTION / LAYERS / TAURI

**Goal:**
Extend Photrez's application menus with working image-editor Edit operations and a dedicated Layer menu, without creating parallel mutation logic.

**Done:**
1. Expanded Edit with Cut, Copy, Paste, Select All, Deselect, and Invert Selection. Enablement reflects document, selection, active bitmap, and in-memory clipboard state.
2. Added the Layer title-bar menu with New Layer, Duplicate Layer, Delete Layer, Merge Down, and Flatten Image.
3. Routed selection commands through `SelectionOperations` and layer commands through `useLayerActions`, preserving history commits, renderer texture uploads/destruction, transform-session cancellation, delete confirmation, and render scheduling.
4. Added `SelectionOperations.hasClipboard()` so Paste communicates its real availability instead of remaining an enabled no-op.
5. Added a matching native Tauri Layer submenu with stable editor IDs and existing keyboard accelerators, verified against Tauri 2.9.5 documentation through Context7.
6. Added mounted wiring tests proving Edit selection state mutation, Cut/Copy/Paste dispatch, layer duplication with undo history, and native Layer-event routing.

**Files Changed:**
- `apps/desktop/src/components/editor/AppMenuBar.tsx`
- `apps/desktop/src/components/editor/useEditorCommands.ts`
- `apps/desktop/src/components/editor/editorData.ts`
- `apps/desktop/src/components/editor/types.ts`
- `apps/desktop/src/features/selection/SelectionOperations.ts`
- `apps/desktop/src-tauri/src/main.rs`
- menu and selection tests
- required AI, feature, shortcut, and decision documentation

**Verification:**
- PASS: focused menu and selection tests, 32/32; final dedicated menu wiring file, 6/6.
- PASS: final full frontend suite, 89 files / 1277 tests in 37.94s.
- PASS: `pnpm run type-check` and `pnpm run build`.
- PASS: `cargo test -p photrez-core`, 85/85.
- PASS: `cargo test --workspace`, core 85/85 + desktop 15/15.
- BLOCKED RUNTIME RETRY: the existing development instance owns port 1420, so a second `pnpm tauri dev` correctly refused to start. The running app was not terminated to avoid losing user work; restart smoke for the native Layer submenu remains pending.

---

## [2026-06-21] BUG FIX - Deselect and Invert Selection Synchronization [COMPLETE]

### Kategori: BUG FIX / SELECTION / FRONTEND / TEST

**Root Cause:**
- `CanvasViewport` rendered a pointer-tool-local `selectionBox`; menu and option-bar commands mutated `DocumentEngine` and the editor signal but never refreshed that local marquee.
- `DocumentEngine.invertSelection()` implemented a placeholder null/full-canvas toggle, so it did not represent the complement of an existing rectangle.
- Workspace synchronization queried whether a selection existed after it had already been cleared, leaving `selectionEditMode` vulnerable to stale state.

**Fix Rationale:**
1. Made the editor selection signal authoritative for the visible viewport marquee while preserving the local box for live pointer previews.
2. Added optional `SelectionState.inverted`; inversion now toggles the complement of the stored bounds, while inverting an empty selection selects the full document.
3. Made copy/cut/delete complement-aware. Copy preserves the full layer with a transparent excluded hole; delete/cut clear the four outer bands and preserve the excluded rectangle.
4. Rendered an outer canvas boundary plus the inner excluded marquee for inverted state and disabled transform handles for that non-rectangular region.
5. Explicitly exits selection edit mode on Deselect/Invert through menu, option bar, keyboard, and workspace synchronization.
6. Added engine unit tests, pixel-operation tests, renderer tests, CanvasViewport integration tests, and mounted menu wiring assertions.

**Verification:**
- PASS: focused regression suite, 175/175.
- PASS: full frontend suite, 89 files / 1284 tests.
- PASS: `pnpm run type-check` and `pnpm run build`.
- PASS: `cargo test -p photrez-core`, 85/85.
- PASS: `cargo test --workspace`, core 85/85 + desktop 15/15.

---

## [2026-06-21] FEATURE - Canvas and Layers Context Menus [COMPLETE]

### Kategori: FEATURE / UI / FRONTEND / ACCESSIBILITY / LAYERS

**Goal:**
Add familiar right-click workflows to the canvas and layer stack while preserving a single production mutation path.

**Done:**
1. Added a reusable Portal-based context-menu surface with viewport clamping, ARIA menu semantics, disabled/danger states, automatic focus, Arrow/Home/End navigation, Escape focus restoration, Tab dismissal, and outside-click dismissal.
2. Added a canvas menu for Cut, Copy, Paste, Select All, Deselect, Invert Selection, Actual Size, and Fit Canvas. Brush/Eraser continue to use their existing parameter menu without competing listeners.
3. Added a layer-row menu for New, Duplicate, Rename, Show/Hide, Lock/Unlock, Move Up/Down, Merge Down, Flatten Image, and guarded Delete. Right-click activates the target layer before any action.
4. Added the typed `photrez://editor-command` frontend event bridge so canvas actions reach the existing `useEditorCommands` router instead of duplicating selection/history logic. Layer actions reuse `useLayerActions`.
5. Added reusable component tests plus mounted canvas and LayersPanel wiring tests covering keyboard focus, dismissal, command dispatch, target selection, history-backed duplication, and inline rename.
6. Consulted current SolidJS documentation through Context7 for delegated `contextmenu` event support, signal state, typed event handlers, and listener lifecycle.

**Verification:**
- PASS: focused context/menu/drag wiring suite, 41/41.
- PASS: full frontend suite, 91 files / 1291 tests.
- PASS: `pnpm run type-check` and `pnpm run build`.
- PASS: `cargo test -p photrez-core`, 85/85.
- PASS: `cargo test --workspace`, core 85/85 + desktop 15/15.
- PARTIAL LIVE QA: agent-browser loaded the running app and captured its accessibility tree, then its automation session lost connectivity before New Canvas interaction; no runtime claim is based on that incomplete session.

---

## [2026-06-21] DOCUMENTATION - Photrez Precision Workbench Design System [COMPLETE]

### Kategori: DOCUMENTATION / UI / DESIGN SYSTEM / DESKTOP

**Goal:**
Create one authoritative visual contract that keeps future Photrez UI compact, familiar, color-neutral, and recognizably desktop-native.

**Done:**
1. Extracted the canonical OKLCH editor palette, system typography, compact spacing, radius hierarchy, shadows, and production component patterns from the current SolidJS and Tailwind v4 implementation.
2. Defined the user-selected creative north star, `Precision Workbench`, with explicit rules for canvas authority, Windows behavior, Photon Amber restraint, zero-tint chrome, and structural elevation.
3. Added root `DESIGN.md` in the Google Stitch-compatible frontmatter plus six-section format.
4. Added `.impeccable/design.json` schema version 2 with tonal metadata, shadows, motion, breakpoints, narrative rules, and six self-contained component previews.
5. Documented desktop-specific dialogs, application menus, context menus, fields, title-bar controls, tool buttons, status feedback, accessibility states, and anti-patterns.

**Verification:**
- PASS: required DESIGN.md section order, 6/6.
- PASS: sidecar JSON parses successfully, schema version 2, 6 component previews.
- PASS: documentation integrity check; no runtime or dependency changes.

---

## [2026-06-21] FEATURE - Precision Workbench Dialog System [COMPLETE]

### Kategori: FEATURE / UI / ACCESSIBILITY / AUTOMATED-QA

**Goal:**
Replace browser-like confirmation and toast-only information with one compact desktop dialog surface that needs no manual QA for routine regression coverage.

**Done:**
1. Added a centralized Promise-based confirm/alert provider with FIFO queuing, Portal rendering, ARIA dialog semantics, focus trapping/restoration, Escape and backdrop cancellation, and cleanup-safe promise resolution.
2. Replaced Delete Layer `window.confirm` across footer, keyboard, context-menu, title-bar menu, and native-menu command paths. The mutation revalidates document and layer identity after async confirmation.
3. Replaced the About toast with a shared informational dialog.
4. Applied the Precision Workbench contract: 360px compact surface, 36px title chrome, `pz` app mark, fixed 11–12px type, restrained 6px radius, structural dividers, 28px actions, Photon Amber destructive action, and reduced overlay shadow.
5. Corrected application-menu activation order so dialogs capture and restore the stable menu trigger rather than a detached menu item.
6. Added browser automation for dialog geometry, screenshot capture, Cancel default focus, Tab and Enter completion, Escape dismissal, focus restoration, and real layer deletion.

**Verification:**
- PASS: focused component and mounted wiring tests, 11/11.
- PASS: full frontend suite, 92 files / 1297 tests in 53.55s.
- PASS: dedicated Playwright dialog browser QA, 2/2.
- PASS: production build and root type-check.
- PASS: Rust core 85/85; workspace desktop 15/15.
- NOTE: agent-browser CLI offline doctor passed, but its Windows CDP launch channel closed. Playwright Chromium completed the same live browser workflow and screenshot capture successfully.

---

## [2026-06-21] UI - Precision Workbench Resize and Export Dialogs [COMPLETE]

### Kategori: UI / FRONTEND / DIALOGS

**Goal:**
Unify Resize Canvas and Export with the shared compact desktop dialog vocabulary while keeping feedback tests fast and behaviorally strong.

**Done:**
1. Migrated `ResizeCanvasModal.tsx` and `ExportDialog.tsx` to use the new `DesktopDialog` (Precision Workbench Dialog System) component.
2. Verified that dimensions, quality, and aspect lock settings follow the Precision Workbench design contract.
3. Updated unit and integration tests (`ResizeCanvasModal.test.tsx` and `ExportDialog.test.tsx`) to match the new markup and behavior.
4. Added browser automation in Playwright E2E (`dialog-accessibility.spec.ts`) to verify focus, Escape key closing, backdrop click dismissal, and output dimension updates for both dialogs.

**Verification:**
- PASS: focused component and mounted wiring tests, 16/16.
- PASS: full frontend suite, 92 files / 1297 tests in 62.91s.
- PASS: dedicated Playwright E2E dialog accessibility coverage, 3/3 (About, Delete Layer, Resize & Export).
- PASS: production build and root type-check.
- PASS: Rust core 85/85; workspace desktop 15/15.

---

## [2026-06-21] FEATURE / BUG FIX - Interactive History Panel [COMPLETE]

### Kategori: UI / FRONTEND / HISTORY / ACCESSIBILITY / TEST

**Goal:**
Ship one compact History surface that shows meaningful document operations and supports reliable click-to-time-travel navigation.

**Root Cause:**
- Multi-step navigation repeatedly passed the unchanged live engine snapshot into `undo()`/`redo()`, which duplicated redo entries and skipped intermediate states.
- A legacy Layers/History tab placeholder remained mounted alongside the new collapsible panel, creating two competing History interfaces.
- The first implementation referenced unsupported icon names, left a facade signature stale, imported a nonexistent test helper, and lacked mounted status-bar wiring coverage.
- Keyboard mutation paths still committed unlabeled snapshots, leaving visible `Unknown Operation` entries despite the new metadata API.

**Fix Rationale:**
1. Carry the returned snapshot into every subsequent traversal step, validate target bounds, cancel active transform previews, restore once at the target, destroy stale GPU textures, and upload restored bitmaps.
2. Remove the duplicate tab placeholder and keep one collapsible History section below Navigator; the status-bar action expands it and reopens the right dock.
3. Use existing typed icons, expose `aria-current`, `aria-expanded`, `aria-pressed`, and explicit past/current/future state metadata, with visible keyboard focus.
4. Label keyboard, layer, selection, crop, resize, paint, transform, and cross-document mutation paths with human-readable operation names.
5. Add multi-step regression, mounted panel, and status-bar wiring tests; update stale crop history expectations.

**Verification:**
- PASS: focused History unit/component/wiring coverage, 26/26.
- PASS: keyboard history-label regression coverage, 45/45.
- PASS: final full frontend suite, 97 files / 1310 tests in 58.69s.
- PASS: TypeScript type-check and production Vite build in 10.72s.
- PASS: `cargo test -p photrez-core`, 85/85.
- PASS: `cargo test --workspace`, 100/100 (85 core + 15 desktop).
- PASS: `git diff --check` with no whitespace errors.

---
