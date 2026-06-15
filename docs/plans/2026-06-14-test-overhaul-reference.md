# Photrez Test Quality & Speed Overhaul — Reference

> **Pickup doc.** Lanjut kerja di file ini + `docs/AI_CURRENT_TASK.md` entry `[2026-06-14]` saat ready.
> Source diskusi: conversation history dengan AI assistant, plan dirangkum di `AI_CURRENT_TASK.md` §`[2026-06-14] Photrez Test Quality & Speed Overhaul`.

---

## Context (1 paragraf)

Photrez: "setiap tool baru dibuat, test pass tapi frontend gagal total". Root cause = **wiring bug** di engine→signal→UI boundary, bukan logic. Unit test menguji class method dengan props ideal; integration test menguji pointer event chain end-to-end di `CanvasViewport`. Plus test suite lambat karena default config + tidak ada `setup.ts` mocks.

**Target akhir:**
- Test speed turun signifikan (target: <60s unit, <2m integration, <5m e2e)
- Tiap tool baru punya **1 contract test** (state transitions) + **1 CanvasViewport integration test** (real pointer chain)
- "Frontend gagal total" pattern berhenti

---

## Decisions Made (jangan辩论 ulang saat lanjut)

| Decision | Rationale |
|---|---|
| **Skip happy-dom** | Photrez pakai RAF berat (GPU smooth zoom + scheduler continuous mode). happy-dom punya timer/RAF caveat yang butuh workaround. Risiko > benefit. |
| **Stay jsdom** + controlled RAF mock di setup.ts | Stabil untuk codebase ini |
| **Add `@solidjs/testing-library`** | `testEffect` API tangkap P0-1 (signal desync) class. Custom `render` helper Photrez sekarang tidak punya ini. |
| **Add `@testing-library/user-event` v14** | `user.pointer([...])` untuk real pointer chain di jsdom (Photrez P0-7/P0-8 bug class) |
| **Pool: `'threads'`** | Default `'forks'` lebih lambat. **TAPI** `sequence.concurrent: false` untuk test yang mutate global signal — pakai `it.sequential` per test. |
| **Pilot: Move Tool** | Punya deferred bug (`AI_CURRENT_TASK.md:45-58`) + simpler state machine dari Selection. Validate pattern dulu. |
| **Q-Print reference** | `D:\Project\aplikasi-cetak-massal` punya setup.ts komprehensif (216 baris) — pakai sebagai template untuk mock patterns (Tauri, WebGL2, pointer capture, ResizeObserver, IndexedDB, window.api). |

---

## Phase 1: Infrastructure

### 1.1 Install dependencies (online)

```powershell
cd D:\Project\image-studio
pnpm.cmd --filter photrez-desktop add -D @solidjs/testing-library @testing-library/user-event
```

Verify install:
```powershell
pnpm.cmd --filter photrez-desktop list @solidjs/testing-library @testing-library/user-event
```

### 1.2 Create `apps/desktop/src/test/setup.ts`

Adapt Q-Print pattern. **Code:**

```ts
// apps/desktop/src/test/setup.ts
import { vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';

// ============================================================
// Tauri invoke mock — return envelope contract per
// docs/reference/command-contract-spec.md
// ============================================================
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue({
    ok: true,
    contract_version: '1.0.0',
    data: null,
  }),
}));

// ============================================================
// WebGL2 mock — minimal methods yang dipakai webgl2.ts
// Tambah method lain jika ada test yang fail karena mock kurang
// ============================================================
HTMLCanvasElement.prototype.getContext = vi.fn((type: string) => {
  if (type === 'webgl2' || type === 'webgl') {
    const noop = vi.fn();
    const mockObject = () => ({});
    return {
      createBuffer: mockObject,
      bindBuffer: noop,
      bufferData: noop,
      createTexture: mockObject,
      bindTexture: noop,
      texImage2D: noop,
      texParameteri: noop,
      createShader: mockObject,
      shaderSource: noop,
      compileShader: noop,
      getShaderParameter: () => true,
      getShaderInfoLog: () => '',
      createProgram: mockObject,
      attachShader: noop,
      linkProgram: noop,
      getProgramParameter: () => true,
      getProgramInfoLog: () => '',
      useProgram: noop,
      getUniformLocation: mockObject,
      getAttribLocation: () => 0,
      enableVertexAttribArray: noop,
      vertexAttribPointer: noop,
      drawArrays: noop,
      drawElements: noop,
      viewport: noop,
      clear: noop,
      clearColor: noop,
      enable: noop,
      disable: noop,
      blendFunc: noop,
      getExtension: () => ({}),
      getParameter: () => 16384, // MAX_TEXTURE_SIZE mock
      ARRAY_BUFFER: 34962,
      STATIC_DRAW: 35044,
      TEXTURE_2D: 3553,
      RGBA: 6408,
      UNSIGNED_BYTE: 5121,
      TEXTURE0: 33984,
      FRAMEBUFFER: 36160,
      COLOR_ATTACHMENT0: 36064,
      RENDERBUFFER: 36161,
      DEPTH_ATTACHMENT: 36096,
      DEPTH_COMPONENT16: 33189,
    };
  }
  return null;
});

// ============================================================
// Pointer capture — WAJIB untuk Photrez (P0-7/P0-8 class)
// ============================================================
if (typeof Element !== 'undefined') {
  if (!Element.prototype.setPointerCapture) {
    Object.defineProperty(Element.prototype, 'setPointerCapture', { value() {} });
    Object.defineProperty(Element.prototype, 'releasePointerCapture', { value() {} });
  }
  if (!Element.prototype.hasPointerCapture) {
    Object.defineProperty(Element.prototype, 'hasPointerCapture', { value: () => false });
  }
}

// ============================================================
// ResizeObserver, IntersectionObserver, getComputedStyle
// ============================================================
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
globalThis.IntersectionObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
};
globalThis.getComputedStyle = vi.fn().mockReturnValue({
  getPropertyValue: () => '',
}) as any;

// ============================================================
// requestAnimationFrame controlled — critical for viewport tests
// useViewportRenderer.ts uses RAF for continuous render mode
// ============================================================
const rafCallbacks = new Map<number, FrameRequestCallback>();
let rafIdCounter = 0;
globalThis.requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
  rafIdCounter++;
  rafCallbacks.set(rafIdCounter, cb);
  return rafIdCounter;
});
globalThis.cancelAnimationFrame = vi.fn((id: number) => {
  rafCallbacks.delete(id);
});

// Helper untuk test: jalankan semua pending RAF (sync)
export function flushRAF(): void {
  const cbs = Array.from(rafCallbacks.entries());
  rafCallbacks.clear();
  cbs.forEach(([_, cb]) => cb(performance.now()));
}

// ============================================================
// Solid signal isolation
// ============================================================
beforeEach(() => {
  document.body.innerHTML = '';
  rafCallbacks.clear();
  vi.clearAllMocks();
});
afterEach(() => {
  vi.clearAllMocks();
  rafCallbacks.clear();
});
```

### 1.3 Update `apps/desktop/vite.config.ts`

**FINAL working config** (after experimental iteration 2026-06-14):

```ts
/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import solidPlugin from "vite-plugin-solid";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [solidPlugin(process.env.VITEST ? { hot: false } : undefined), tailwindcss()],

  resolve: {
    tsconfigPaths: true,
  },

  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    exclude: ["node_modules/**", "dist/**", "e2e/**"],

    pool: 'threads',  // ~1.89× speedup, no regressions

    // ⚠️ DO NOT add sequence: { concurrent: true }
    // Breaks 67 tests due to state pollution with vite-plugin-solid
    // when test files run in parallel within a single worker thread.
  },

  server: {
    strictPort: true,
    port: 1420,
    host: "0.0.0.0"
  },

  envPrefix: ["VITE_", "TAURI_"],

  build: {
    target: "esnext",
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
});
```

**Speedup comparison (956 tests, 66 files):**

| Config | Duration | Tests | Delta |
|---|---|---|---|
| Baseline | 114.58s | 956 ✓ | reference |
| + setupFiles only | 84.27s | 956 ✓ | 1.36× |
| + pool: 'threads' | **60.56s** | **956 ✓** | **1.89×** |
| + sequence.concurrent: true | 53.46s | 889 ✗ | 2.14× tapi 67 broken |

**Why global mocks were not added to setup.ts:**

| Mock | Why removed |
|---|---|
| `setPointerCapture` | jsdom 29 has it as read-only — `Object.defineProperty` throws in strict mode. Production code has try/catch per P0-7/P0-8 fix. |
| WebGL2 `getContext` | Returning `{}` broke LayersPanel/exportDocument/SelectionManager pixel-dependent tests. Use per-test mock. |
| `getComputedStyle` | Returning `""` broke positioning/transform assertions. Use per-test mock. |
| `requestAnimationFrame` | Storing callbacks without running them broke CanvasViewport (29 tests) and scheduler. Use jsdom default. |
| `vi.clearAllMocks()` in beforeEach | Cleared spies set up in test file's own beforeEach (e.g. setViewportSpy in Navigator.test.tsx). |
| `sequence.concurrent: true` | 67 tests regress due to state pollution with vite-plugin-solid. |

### 1.4 Verify (online)

```powershell
# Full test suite — must still pass
pnpm.cmd --filter photrez-desktop test --run

# Measure speed
Measure-Command { pnpm.cmd --filter photrez-desktop test --run }

# Build verify
pnpm.cmd run build
```

**Expected:**
- All 911 tests pass (or 911+ with uncommitted Selection work)
- Speedup 2-3× vs baseline
- Build succeeds

**If test fails:** check error carefully. Common issues:
- WebGL2 mock missing method → tambah di setup.ts
- Solid test fail karena concurrent → wrap affected test di `describe.sequential` atau `it.sequential`
- Pointer event error → pastikan pointer capture mock aktif

---

## Phase 2: Move Tool Pilot

### 2.1 Resolve deferred bug

Reference: `AI_CURRENT_TASK.md:45-58` — "Move Tool Resize Cursor Drops To Default [DEFERRED]"

Steps (per AI_HISTORY.md pattern):
1. Read `SelectionTransformOverlay.tsx` + `useSelectionTransformDrag.ts`
2. Identify cursor flow (hover vs active drag state)
3. Add failing regression test FIRST (TDD)
4. Patch smallest state-aware change
5. Run focused Move Tool tests + full suite

### 2.2 Add 1 CanvasViewport integration test

File: `apps/desktop/src/components/editor/__tests__/CanvasViewport.move-tool.test.tsx`

Template (adapt dari `CanvasViewport.test.tsx` yang sudah ada):

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@solidjs/testing-library';
import userEvent from '@testing-library/user-event';
import { EditorContext } from '../EditorContext';
import { CanvasViewport } from '../CanvasViewport';

describe('Move Tool — CanvasViewport integration', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

  it('idle: cursor is default on pasteboard', async () => {
    const { container } = render(() => (
      <EditorContext>
        <CanvasViewport />
      </EditorContext>
    ));
    // assert initial cursor
  });

  it('hover resize handle: cursor becomes ew-resize/ns-resize', async () => {
    // create document, draw selection, hover handle
    // assert cursor style
  });

  it('drag resize: cursor stays ew-resize, not default', async () => {
    // pointerdown handle, move, assert cursor preserved
  });

  it('tool switch mid-drag: cleans up signal/effect', async () => {
    // drag → press V → press M → assert no orphan state
  });
});
```

### 2.3 Add contract test

File: `apps/desktop/src/features/move/__tests__/MoveTool.contract.test.tsx`

```tsx
import { describe, it, expect } from 'vitest';

describe('Move Tool — state machine contract', () => {
  it('idle: no transform box rendered', () => {});
  it('selecting: transform box renders, no handles yet', () => {});
  it('editable: transform box + 8 resize handles + 1 rotate', () => {});
  it('dragging: cursor updates to grab, layer position updates', () => {});
  it('resizing: cursor updates to ew/ns, layer scale updates', () => {});
  it('rotating: cursor updates, layer angle updates', () => {});
  it('undo: returns to previous state, all signals sync', () => {});
  it('tool switch to Brush: move tool state cleared, no orphan overlay', () => {});
});
```

### 2.4 Add Playwright smoke

File: `apps/desktop/e2e/move-tool-cursor.spec.ts`

```ts
import { test, expect } from '@playwright/test';

test('Move Tool cursor stays ew-resize during resize drag', async ({ page }) => {
  await page.goto('/');
  // create doc, switch to M tool, draw selection, hover handle, drag
  const cursor = await page.locator('[data-transform-handle="e"]').evaluate(
    (el) => getComputedStyle(el).cursor
  );
  expect(cursor).toBe('ew-resize');
});
```

---

## Phase 3: Replicate Pattern

Ulangi Phase 2.4 step (contract test + integration test) untuk:

| Tool | Contract test | Integration test | Notes |
|---|---|---|---|
| Selection | features/selection/__tests__/Selection.contract.test.tsx | components/editor/__tests__/CanvasViewport.selection.test.tsx | Sudah ada SelectionRenderer.test.tsx — extend, bukan duplikat |
| Brush | features/brush/__tests__/Brush.contract.test.tsx | components/editor/__tests__/CanvasViewport.brush.test.tsx | State: idle/eyedropper/painting/erasing |
| Crop | features/crop/__tests__/Crop.contract.test.tsx | components/editor/__tests__/CanvasViewport.crop.test.tsx | State: idle/draw/transform/apply |
| Transform | features/transform/__tests__/Transform.contract.test.tsx | components/editor/__tests__/CanvasViewport.transform.test.tsx | State: idle/scale/rotate |

**Per tool effort:** 1-2 jam (test-only, no production change).

---

## Phase 4: Enforce

### 4.1 Update `AGENTS.md` Definition of Done

Tambah section (sesuaikan dengan format existing):

```markdown
## Definition of Done untuk Tool Baru

- [ ] `pnpm run build` hijau
- [ ] `pnpm --filter photrez-desktop test` hijau (semua existing + baru)
- [ ] 1 **contract test** untuk state machine tool
- [ ] 1 **CanvasViewport integration test** dengan real pointer chain
- [ ] Tool terdaftar di: type union, keyboard shortcut, pointer handler dispatcher, toolbar UI, status bar (9-12 langkah wiring — lihat CONVENTIONS.md)
- [ ] `docs/AI_CURRENT_TASK.md` updated
- [ ] `docs/AI_HISTORY.md` updated
```

### 4.2 Add tool creation recipe ke `docs/CONVENTIONS.md`

Section baru:

```markdown
## Tool Creation Recipe (WAJIB urut)

1. Define tool type di `editorState.ts` (unions/import)
2. Add keyboard shortcut di `useCanvasKeyboard.ts`
3. Add cursor behavior di option bar / CSS
4. Add option bar (jika ada) di `components/editor/`
5. **Add pointer handler di `useCanvasPointerTools` dispatcher** ← paling sering lupa
6. Add toolbar button di `AppTitleBar.tsx` atau tool rail
7. Add undo/redo integration via `history.commit()` sebelum mutation
8. Add status bar integration
9. Register di `EditorContext` state
10. Add contract test
11. Add CanvasViewport integration test
12. Update docs (CURRENT_TASK + HISTORY)

Kalau step 5 lupa = tool tidak respond ke click (frontend "gagal total" symptom).
```

### 4.3 Update `AI_HISTORY.md` dengan fase completion

Per protocol, append entry untuk Phase 1-4 complete.

---

## Commands Reference (online-only)

### Measure speed
```powershell
Measure-Command { pnpm.cmd --filter photrez-desktop test --run }
```

### Run targeted test (dev mode, fast)
```powershell
# specific tool
pnpm.cmd --filter photrez-desktop exec vitest run src/features/selection

# specific file
pnpm.cmd --filter photrez-desktop exec vitest run src/components/editor/__tests__/CanvasViewport.test.tsx

# by name pattern
pnpm.cmd --filter photrez-desktop exec vitest run -t "selection"
```

### Coverage
```powershell
pnpm.cmd --filter photrez-desktop test --run --coverage
```

### UI mode (find slow tests)
```powershell
pnpm.cmd --filter photrez-desktop test:ui
```

### Verify (final gate)
```powershell
pnpm.cmd --filter photrez-desktop test --run
pnpm.cmd run build
pnpm.cmd tauri dev   # manual smoke
```

---

## Risk Register

| Risk | Mitigation |
|---|---|
| WebGL2 mock tidak lengkap | Tambah method satu-satu sesuai error message |
| Solid test fail karena concurrent | `describe.sequential` per file yang mutate global signal |
| happy-dom RAF issue tidak kena | Kita stay di jsdom — risk nihil |
| Pointer event mock terlalu sederhana | Pakai `user-event.pointer([...])` yang handle chain lengkap |
| Test coverage turun karena test refactor | Track via coverage report, target ≥80% untuk engine/viewport/feature paths |
| User-event pointer di jsdom = partial | Tambah Playwright smoke untuk visual-sensitive assertions |

---

## Time Budget (verify saat done)

| Suite | Target | Action if fail |
|---|---|---|
| Full Vitest | <60s | Profile slowest 20 file, apply targeted mock/parallel |
| CanvasViewport integration saja | <2m | Split file per tool jika >2m |
| Full Playwright e2e | <5m | Reduce scenario ke 1 happy + 1 worst case per tool |

---

## Done Checklist (semua phase)

- [ ] Phase 1: setup.ts created, vite.config.ts updated, build green, 911+ tests pass
- [ ] Phase 2: Move Tool contract + integration + Playwright smoke green
- [ ] Phase 3: 5 tools punya contract + integration test (Selection, Brush, Crop, Transform, Move)
- [ ] Phase 4: AGENTS.md DoD updated, CONVENTIONS.md recipe added, AI_HISTORY.md updated
- [ ] Time budget met: unit <60s, integration <2m, e2e <5m
- [ ] "Every new tool fails" pattern resolved (validate dengan 1 tool baru setelah ini)

---

## Future Work (Out of Scope — REMINDER)

> Plan Phase 1-4 hanya cover **5 tool utama** (Move, Selection, Brush, Crop, Transform). Sisanya belum disentuh — pakai **pattern yang sama** (contract test + integration test) saat siap.

**Non-tool UI yang belum di-cover:**

- [ ] Layers panel (reorder, opacity, visibility, lock, blend mode)
- [ ] Properties panel (transform, opacity sliders)
- [ ] Export dialog (JPG/PNG/WebP format, quality slider)
- [ ] File menu / open / save / new document
- [ ] Settings panel
- [ ] Document tabs bar
- [ ] Status bar

**Backend yang belum di-cover:**

- [ ] Tauri commands (Layer, Workspace, History, Transform, Selection, Brush, Export, Color, Import, Renderer)
- [ ] Rust core crate (Document, Layer, History, Workspace, Selection, Transform, Brush, Export)
- [ ] IPC contract integration tests (per `docs/reference/command-contract-spec.md`)
- [ ] Workspace multi-document tests

**Cara apply pattern sama saat siap:**

```powershell
# Untuk non-tool UI component
mkdir apps/desktop/src/components/editor/__tests__/integration
# tulis file: <ComponentName>.integration.test.tsx
# pattern: render real component, simulate user event chain, assert state + signal + DOM

# Untuk Tauri command
mkdir apps/desktop/src-tauri/src/__tests__/integration
# tulis file: <command>.integration.test.ts
# pattern: invoke command end-to-end, assert response envelope
```

**Estimasi effort saat extension:**
- Non-tool UI: ~1-2 jam per component (contract + integration)
- Backend: ~2-3 jam per command group (8 group di ARCHITECTURE.md:172-202)
- Total Phase 5 (jika jalan): ~2-3 hari

**Trigger untuk mulai Phase 5:**
- Setelah Phase 1-4 selesai + teruji dengan 1 tool baru
- ATAU saat mulai banyak bug di non-tool UI / backend
- ATAU sebelum release production

**PENTING:** Pattern yang dikembangkan di Phase 1-2 (contract test + integration test + setup.ts mocks) **sudah applicable** untuk semua item di atas. Tidak perlu design ulang.
