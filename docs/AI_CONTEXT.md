# AI_CONTEXT.md — Photrez (STRICT AI RULES)

> **DOKUMEN INI BERISI ATURAN MUTLAK UNTUK AI.**
> Pelanggaran terhadap aturan di sini akan menyebabkan regresi, bug, dan penolakan PR.
>
> **Stack (MVP runtime):** **Tauri 2 (shell)**, **SolidJS + TypeScript (Frontend)**, **TypeScript DocumentEngine (Core)**, **WebGL2 (Renderer)**, **Tailwind CSS v4**
> **Future target:** **Rust Core (photrez-core)** + **wgpu (photrez-render)** — not active in MVP hot-path
> Always use Context7 when I need library API documentation, code generation, setup or configuration steps without me having to explicitly ask.

---

## 🔗 WAJIB BACA — Dokumen Terhubung (CROSS-REFERENCE MAP)

Sebelum mengerjakan tugas APAPUN, AI **WAJIB** membaca dokumen-dokumen berikut sesuai urutan prioritas. Saat satu dokumen di-mention oleh user, SELURUH rantai dokumen terkait wajib dibaca tanpa perlu disuruh satu per satu.

### Rantai Dokumen Utama (BACA SEMUA)

```
AI_CONTEXT.md (INI) ──┬──► AI_CURRENT_TASK.md    (Status tugas aktif)
                       ├──► AI_HISTORY.md          (Riwayat semua perubahan)
                       ├──► FEATURES.md            (Status fitur per modul)
                       └──► ARCHITECTURE.md        (Arsitektur teknis & diagram)
```

### Peta Referensi Lengkap

| Saat mengerjakan…            | WAJIB baca tambahan                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------ |
| Tugas apapun                 | `AI_CONTEXT.md` → `AI_CURRENT_TASK.md` → `FEATURES.md`                                                |
| Arsitektur / modul baru      | `ARCHITECTURE.md` → `docs/02-architecture.md` → `docs/03-trd.md`                                      |
| UI / komponen visual         | `docs/22-ui-style-guide.md` → `docs/23-design-tokens.md` → `docs/24-ui-component-rules.md` → `GEMINI.md` |
| Command / IPC baru           | `docs/15-command-contract-spec.md` → `docs/05-adr/0002-command-contract-versioning.md`                 |
| Fitur MVP / scope guard      | `docs/00-product-scope.md` → `docs/01-prd.md` → `docs/01-id-decision-log.md`                          |
| Data model / tipe baru       | `docs/04-erd-or-data-model.md`                                                                         |
| Keyboard shortcut            | `docs/32-keyboard-shortcut-map.md`                                                                     |
| Error handling                | `docs/35-error-code-registry.md`                                                                       |
| Export / format               | `docs/33-file-format-support.md`                                                                       |
| Lifecycle dokumen            | `docs/34-save-and-document-lifecycle.md`                                                               |
| Dependency baru              | `docs/31-dependency-inventory.md`                                                                      |
| Performance                  | `docs/16-performance-measurement-protocol.md`                                                          |
| Testing                      | `docs/17-test-matrix-by-milestone.md` → `docs/testing-policy.md`                                      |
| CI / Release                 | `docs/18-ci-verification-plan.md` → `docs/09-public-release-gate.md`                                  |
| Usable MVP / recovery         | `docs/38-usable-mvp-recovery-plan.md` -> `docs/27-key-user-flows.md` -> `docs/09-public-release-gate.md` |

### Otomatisasi Baca

Jika user menyebut salah satu dari dokumen AI (`AI_CONTEXT`, `AI_CURRENT_TASK`, `AI_HISTORY`, `FEATURES`, `ARCHITECTURE`), AI **WAJIB membaca SEMUA 5 dokumen** untuk memahami konteks penuh proyek. Tidak perlu menunggu instruksi tambahan.

---

## 1. PROTOKOL PRA-KODING & TRACKING (WAJIB)

Sebelum memodifikasi file apapun, AI WAJIB melakukan:

1. **Perbarui Status Tugas**: AI WAJIB membaca dan memperbarui file `docs/AI_CURRENT_TASK.md`. Jangan bekerja tanpa mendokumentasikan apa yang sedang dilakukan.
2. **Maintenance Log (History)**: AI WAJIB mencatat setiap perubahan ke dalam `docs/AI_HISTORY.md` dengan pengelompokan kategori (FEATURE/BUG BARU/BUG FIX) dan **sub-pengelompokan per modul** (misal: Shell, Core, Renderer, UI/Frontend):
   - **FEATURE**: Fungsionalitas atau UI baru.
   - **BUG BARU**: Bug yang baru ditemukan atau dilaporkan (tanpa/sebelum perbaikan).
   - **BUG FIX**: Perbaikan untuk bug yang sudah ada/ditemukan. **WAJIB** mencatat: **Akar Masalah (Root Cause)** dan **Logika Perbaikan (Fix Rationale)**.
3. **Perbarui Feature Status**: Setelah fitur selesai, update `docs/FEATURES.md` dengan status terbaru.
4. **Verifikasi Eksistensi & Penjelajahan Kode**: Gunakan CodeGraph via CLI (`npx @colbymchenry/codegraph` / `codegraph`) secara proaktif sebagai instrumen utama untuk penjelajahan kode, melacak simbol/import, dan memahami arsitektur. Gunakan pula tools pencarian pembantu (`grep` / `glob`) untuk memastikan path fisik benar-benar ada. **JANGAN MENEBAK.**
5. **Analisis Dampak (Blast Radius)**: Pahami apakah komponen atau tipe yang diubah digunakan di tempat lain menggunakan bantuan pelacakan dampak CodeGraph.
   - **CodeGraph Index Status**: ✅ Index siap — 103 files, 61 nodes, 224 edges (v0.9.7, 2026-06-02). Re-index via `codegraph index` setelah ada perubahan struktural besar.
6. **Riset API Eksternal & Library (Context7)**: Untuk setiap pencarian dokumentasi API library eksternal (seperti Tauri, SolidJS, WebGL2, Tailwind v4, wgpu), AI **WAJIB** menggunakan Context7 (MCP tool `resolve-library-id` dan `query-docs`). Jangan pernah menebak signature API atau bersandar pada training data bawaan.
   - **Status**: ✅ Context7 v0.4.4 terkonfigurasi via MCP remote (`https://mcp.context7.com/mcp`) + API key, 2026-06-02.
   - **Keep Updated**: Library docs berubah cepat. Selalu gunakan Context7 meskipun merasa tahu — training data bisa usang. Jika hasil Context7 tidak memuaskan, coba nama alternatif (e.g., "next.js" bukan "nextjs") atau tanyakan ulang dengan kata kunci berbeda.
7. **Integritas Dokumentasi (ANTI-TRUNCATE)**: JANGAN PERNAH menghapus riwayat lama di `AI_HISTORY.md` atau `AI_CURRENT_TASK.md`. Gunakan `replace_file_content` untuk menambahkan entri baru. Penggunaan `write_to_file` dengan `Overwrite: true` pada file dokumentasi besar sangat dilarang kecuali untuk inisialisasi awal.
   - **WAJIB UTF-8**: Semua file dokumentasi (`*.md`) harus disimpan sebagai **UTF-8** (disarankan tanpa BOM). DILARANG menulis dokumen dengan UTF-16/`Unicode` karena akan menyebabkan mojibake/karakter rusak.
   - **LARANGAN POWERSHELL ENCODING BERISIKO**: DILARANG menggunakan `Set-Content -Encoding Unicode` untuk file markdown. Jika perlu write via script, gunakan UTF-8 eksplisit (mis. `[System.IO.File]::WriteAllText(path, text, [System.Text.UTF8Encoding]::new($false))`).
   - **WAJIB VERIFIKASI PASCA-EDIT DOKUMEN**: Setelah mengubah file docs, cek `git diff -- docs/*.md`. Jika muncul `Binary files differ`, STOP dan perbaiki encoding sebelum lanjut.
8. **LARANGAN PENGHAPUSAN BERKAS FISIK SECARA DESTRUKTIF TANPA DISKUSI**: DILARANG keras menghapus file, folder, atau aset fisik apa pun dari workspace secara permanen (melalui `Remove-Item`, `rm`, atau utilitas penghapusan lainnya) sebelum mendiskusikannya secara terbuka dan mendapatkan persetujuan/konfirmasi eksplisit dari USER. Diskusi wajib dilakukan untuk menghindari hilangnya file referensi atau backup yang masih dibutuhkan oleh USER.

---

## 2. TAURI 2 — ARSITEKTUR COMMAND & IPC

Proyek ini menggunakan **Tauri 2** (bukan Electron). Semua interaksi frontend↔backend menggunakan Tauri Command system.

### Definisi Command di Rust (`#[tauri::command]`)

```rust
// ✅ BENAR — command di src-tauri/src/main.rs
#[tauri::command]
fn my_command(
    param: String,
    state: tauri::State<'_, EditorState>
) -> Result<Value, Value> {
    let mut doc = state.document.lock().unwrap();
    // ... logic
    ok_response(&*doc)
}

// ✅ Registrasi di Builder
tauri::Builder::default()
    .manage(EditorState::new())
    .invoke_handler(tauri::generate_handler![
        my_command,
        // ... commands lain
    ])
    .run(tauri::generate_context!())
```

### Invoke dari Frontend (SolidJS)

```tsx
// ✅ BENAR — invoke dari SolidJS
import { invoke } from "@tauri-apps/api/core";

const result = await invoke("my_command", { param: "value" });
// result sudah berupa response envelope { ok, contract_version, data }

// ❌ DILARANG — akses Node.js API langsung (Tauri BUKAN Electron)
import fs from "fs";         // TIDAK ADA di Tauri
import path from "path";     // TIDAK ADA di Tauri
require("electron");         // TIDAK ADA
```

### Response Envelope (Contract v1.0.0)

Semua command Tauri harus mengembalikan envelope standar:

```rust
// Success: { ok: true, contract_version: "1.0.0", data: {...} }
// Error:   { ok: false, contract_version: "1.0.0", error: { code, message, details } }
```

Spesifikasi detail ada di: **`docs/15-command-contract-spec.md`**

### Perbedaan Kunci Tauri vs Electron

| Aspek                  | Tauri 2                                     | Electron (JANGAN PAKAI POLA INI)              |
| ---------------------- | ------------------------------------------- | ---------------------------------------------- |
| Backend                | Rust native                                 | Node.js                                        |
| IPC                    | `invoke()` → `#[tauri::command]`            | `ipcRenderer.invoke` → `ipcMain.handle`        |
| File dialog            | `@tauri-apps/plugin-dialog`                 | `dialog.showOpenDialog`                         |
| State management       | `tauri::State<'_, T>` (Rust managed state)  | Zustand / Redux di renderer                    |
| Security               | Permission-based (`capabilities/`)          | `contextIsolation` / `sandbox`                  |
| Preload script         | Tidak ada (pakai `invoke` langsung)         | `contextBridge.exposeInMainWorld`               |
| Window API             | `@tauri-apps/api/window`                    | `BrowserWindow`                                 |

---

## 3. SOLIDJS — ATURAN REAKTIVITAS & PURITY

Proyek ini menggunakan **SolidJS** (BUKAN React). Perbedaan fundamental yang wajib dipahami:

### 🔴 Perbedaan Kritis SolidJS vs React

```tsx
// ❌ SALAH — Pola React di SolidJS (JANGAN!)
const [state, setState] = useState(0);     // React hook, TIDAK ADA di Solid
useEffect(() => { ... });                   // React hook, TIDAK ADA di Solid
const Component: React.FC = () => {};       // React type, TIDAK ADA di Solid
return <div key={id}></div>;                // React key prop, Solid pakai index/For

// ✅ BENAR — Pola SolidJS
import { createSignal, createEffect, onMount, onCleanup, For } from "solid-js";

const [count, setCount] = createSignal(0);   // Signal (getter function, bukan value)
console.log(count());                         // ← WAJIB panggil sebagai function!

// ✅ Effect di SolidJS
createEffect(() => {
    console.log(count());  // Otomatis track dependency
});

// ✅ Lifecycle
onMount(() => {
    // Dijalankan sekali setelah component mount
});

onCleanup(() => {
    // Cleanup saat component unmount
});
```

### 🔴 Akses Signal — WAJIB Panggil Sebagai Function

```tsx
// ❌ SALAH — signal bukan value!
const x = count;        // ini return accessor function, bukan value
if (count) { ... }      // selalu truthy karena function reference

// ✅ BENAR — panggil signal
const x = count();      // return current value
if (count()) { ... }    // evaluasi nilai sebenarnya
```

### 🟢 Store untuk State Kompleks

```tsx
import { createStore } from "solid-js/store";

// ✅ BENAR — nested reactive state
const [state, setState] = createStore({
    document: { width: 800, height: 600 },
    layers: [],
    activeLayerId: null
});

// Update nested property
setState("document", "width", 1920);
setState("layers", layers => [...layers, newLayer]);

// ❌ SALAH — mutasi langsung
state.document.width = 1920;  // Tidak akan trigger reactivity!
```

### 🟢 Control Flow Components (BUKAN .map())

```tsx
// ❌ SALAH — React pattern
{layers.map((layer) => <LayerItem key={layer.id} />)}

// ✅ BENAR — SolidJS <For> component
<For each={layers()}>
    {(layer) => <LayerItem layer={layer} />}
</For>

// ✅ BENAR — Conditional rendering
<Show when={isVisible()} fallback={<Fallback />}>
    <Content />
</Show>

// ✅ BENAR — Switch/Match
<Switch>
    <Match when={activeTab() === "layers"}><LayersPanel /></Match>
    <Match when={activeTab() === "history"}><HistoryPanel /></Match>
</Switch>
```

### 🟡 Untrack dan Batch

```tsx
import { untrack, batch } from "solid-js";

// ✅ Baca signal tanpa tracking (cegah re-run effect)
createEffect(() => {
    const id = props.id;  // tracked
    const label = untrack(() => props.label);  // NOT tracked
});

// ✅ Batch multiple updates (satu re-render)
batch(() => {
    setCount(1);
    setName("new");
    setActive(true);
});
```

---

## 4. STRICT TYPESCRIPT — ATURAN TIPE

- **`strict: true` wajib** — tidak ada pengecualian.
- **100% TypeScript**: **NO `.js` atau `.jsx` files** diizinkan di `src/`. Ini termasuk `.jsx`. Deteksi file `.js`/`.jsx` di `src/` dianggap kegagalan kritis.
- **DILARANG `any`** — gunakan `unknown` lalu lakukan type guard / type narrowing.
- **Gunakan `satisfies` operator** untuk validasi tipe:

```ts
// ✅ satisfies — lebih aman dari as
const config = {
    format: 'png',
    quality: 0.85
} satisfies ExportPreset;

// ✅ Type Guard yang benar
function isLayer(val: unknown): val is Layer {
    return typeof val === 'object' && val !== null && 'id' in val && 'name' in val;
}

// ✅ Import type — selalu gunakan import type untuk tipe-only
import type { Layer, Document } from '../types';
```

---

## 5. TAILWIND CSS v4 — ATURAN STYLING

Proyek ini menggunakan **Tailwind CSS v4** (bukan v3). Konfigurasi via CSS `@theme` di `src/index.css`.

### Konfigurasi Token (index.css)

```css
@import "tailwindcss";

@theme {
    --color-accent: #E15A17;
    --color-studio-bg: #1A1A1C;
    --color-studio-panel: #202022;
    /* ... token lain didefinisikan di @theme */
}

@layer components {
    .studio-input { /* ... */ }
    .tool-btn-raw { /* ... */ }
}
```

### Aturan Styling

- **Tailwind-first**: Gunakan utility classes, BUKAN inline style kecuali untuk dynamic values.
- **Design tokens**: WAJIB pakai variabel dari `@theme`, JANGAN hardcode warna.
- **Anti-Slop Safeguards** (dari `GEMINI.md`):
  - **NO** deep blurry shadows (`shadow-2xl` atau generic SaaS shadows).
  - **NO** glassmorphism / `backdrop-filter: blur`.
  - **YES** pixel-perfect 1px borders menggunakan `--color-border-subtle`.
  - **YES** inset depth untuk inputs.
- **Referensi visual**: `GEMINI.md` (aesthetic rules), `docs/22-ui-style-guide.md`, `docs/23-design-tokens.md`.

---

## 6. RENDERER — ATURAN RENDERING (MVP + Future)

### MVP Runtime (saat ini)

Frontend-owned **WebGL2 backend** (`apps/desktop/src/renderer/webgl2.ts`) untuk rendering canvas. Document state di TypeScript `DocumentEngine` (`apps/desktop/src/engine/document.ts`).

- Renderer **HANYA** owns: frame rendering, texture upload, compositing previews, viewport transforms.
- Renderer **TIDAK** owns: persistence logic, document state, product-level rules.
- Document state saat ini di **TypeScript DocumentEngine** — renderer consume state via `getRenderState()`.
- WebGL2 shaders di `apps/desktop/src/renderer/shaders.ts` (GLSL ES 3.0).

### Future Target (Rust wgpu)

`photrez-render` crate (crates/render/) — **belum aktif** di MVP hot-path. Akan diaktifkan saat migrasi runtime ke WASM/WebGPU/wgpu native.

- wgpu resource lifecycle (adapter → device → surface → texture → pipeline)
- Rust ownership boundary: renderer **HANYA** consume snapshot dari Rust core
- Renderer tests pre-existing `STATUS_ENTRYPOINT_NOT_FOUND` — tidak blocking MVP

### Pattern GPU Resources

```rust
// wgpu resource lifecycle:
// 1. Adapter → Device + Queue (sekali saat init)
// 2. Surface ← Device (untuk window rendering)
// 3. Texture/Buffer ← Device (per-resource, freed saat drop)
// 4. RenderPipeline ← Device (compiled shader + state)

// ❌ DILARANG — leak GPU resource
let texture = device.create_texture(&desc);
// lupa drop → GPU memory leak

// ✅ BENAR — resource di-drop saat tidak diperlukan
{
    let texture = device.create_texture(&desc);
    // ... gunakan texture
} // otomatis drop di sini
```

---

## 7. HISTORY / UNDO-REDO PATTERN

```rust
// ✅ BENAR — Pattern saat ini (snapshot-based)
// 1. history.commit(current_state) SEBELUM mutasi
// 2. Lakukan mutasi pada document
// 3. Return response

#[tauri::command]
fn add_layer(name: String, state: tauri::State<'_, EditorState>) -> Result<Value, Value> {
    let mut doc = state.document.lock().unwrap();
    let mut history = state.history.lock().unwrap();

    // Snapshot SEBELUM mutasi
    history.commit((*doc).clone());

    // Mutasi
    doc.add_layer(new_layer);

    ok_response(&*doc)
}
```

- **Max depth**: 50 entries (di-lock di decision log).
- **Eviction**: FIFO saat melebihi 50.
- **Redo branch**: Discarded saat ada mutasi baru setelah undo.

---

## 8. ATURAN PENGEMBANGAN (DOs & DON'Ts)

### 🔴 DILARANG KERAS (TIDAK ADA PENGECUALIAN)

1. **DILARANG** menggunakan pola React (useState, useEffect, React.FC, key prop) di SolidJS.
2. **DILARANG** mengubah response envelope contract tanpa update `docs/15-command-contract-spec.md` dan ADR.
3. **DILARANG** menaruh image business logic di shell/frontend layer — semua harus di Rust Core. **Pengecualian MVP:** editing hot-path (move, transform, brush, selection) boleh di TypeScript `DocumentEngine` selama didampingi test coverage. Migrasi ke Rust Core dilakukan saat task eksplisit runtime migration.
4. **DILARANG** akses Node.js API (fs, path, child_process) — ini Tauri, BUKAN Electron.
5. **DILARANG** blokir UI thread dengan komputasi berat — gunakan Web Worker atau async di Rust.
6. **DILARANG** berasumsi pekerjaan selesai tanpa menjalankan build verification.
7. **DILARANG** menggunakan `.js` atau `.jsx` file extension di `src/`.
8. **DILARANG** menggunakan `any` type — gunakan `unknown` + type guard.
9. **DILARANG** menambahkan dependency baru tanpa update `docs/31-dependency-inventory.md`.
10. **DILARANG** menambah fitur di luar MVP scope tanpa persetujuan eksplisit user.
11. **DILARANG** mengubah, memodifikasi, atau memoles desain UI/UX, tata letak visual, warna, border, atau estetika antarmuka apa pun tanpa instruksi atau persetujuan eksplisit dari USER.

### 🟢 WAJIB DILAKUKAN

1. **History commit**: Setiap command yang memutasi state WAJIB `history.commit()` SEBELUM mutasi.
2. **Response envelope**: Semua command Tauri return `ok_response()` atau `err_response()`.
3. **Validasi input**: Selalu validasi parameter command di Rust sebelum memproses.
4. **Cleanup**: Setiap `createEffect` yang setup listener WAJIB ada `onCleanup()`.
5. **Signal access**: Selalu panggil signal sebagai function: `count()`, BUKAN `count`.
6. **Type-safe IPC**: Definisikan TypeScript interface yang match dengan Rust struct.
7. **Update docs**: Setelah implementasi fitur, update `FEATURES.md` dan `AI_HISTORY.md`.

---

## 9. PELAJARAN DARI DEBUGGING (LESSONS LEARNED)

### Dari sesi sebelumnya — JANGAN ULANGI:

| #   | Kesalahan                                     | Akibat                                | Pencegahan                                                    |
| --- | --------------------------------------------- | ------------------------------------- | ------------------------------------------------------------- |
| 1   | Import asal tebak tanpa grep                  | Build error / runtime crash           | Selalu `grep` dulu sebelum import                             |
| 2   | Pakai pola React di SolidJS                   | Signal tidak reactive                 | Baca SolidJS docs, bukan React                                |
| 3   | Signal diakses tanpa `()`                     | Selalu truthy, logic salah            | `count()` bukan `count`                                       |
| 4   | Akses Node.js API (fs/path)                   | Module not found error                | Gunakan `invoke()` untuk semua OS operations                  |
| 5   | Hardcode warna tanpa design token             | Inkonsistensi visual, anti-pattern    | Pakai variabel dari `@theme` di `index.css`                   |
| 6   | Skip `history.commit()` sebelum mutasi        | Undo tidak bekerja                    | SELALU commit sebelum mutate                                  |
| 7   | Menambah fitur di luar scope MVP              | Scope creep, bloat                    | Cek `docs/00-product-scope.md` dulu                           |
| 8   | Lucide icons tidak muncul setelah DOM update  | Icon kosong setelah dynamic render    | Panggil `lucide.createIcons()` setelah DOM update             |
| 9   | Response bukan envelope format                | Frontend parsing error                | Selalu pakai `ok_response()` / `err_response()`               |
| 10  | `any` type untuk bypass TypeScript error      | Bug tersembunyi, type safety hilang   | Gunakan `unknown` + type guard, atau definisikan interface     |
| 11  | Skip resource compilation sepenuhnya pada windows-gnu | STATUS_ENTRYPOINT_NOT_FOUND (COMCTL32.dll v5) | Gunakan custom manifest compiler workaround dengan `windres --preprocessor=cat` di `build.rs` dan auto-copy `WebView2Loader.dll` |


---

## 10. RESEARCH PROTOCOL — Context7

Untuk mencegah runtime crashes dan build errors, **Context7 WAJIB digunakan** untuk semua dokumentasi API library:

- **Tauri 2**: `resolve-library-id` → `/websites/v2_tauri_app`
- **SolidJS**: `resolve-library-id` → `/websites/solidjs`
- **wgpu**: `resolve-library-id` → `/websites/rs_wgpu`
- **Tailwind CSS v4**: `resolve-library-id` → cari yang sesuai

### Protokol:

1. Jangan pernah mengandalkan training data untuk API signatures.
2. Selalu gunakan `resolve-library-id` sebelum `query-docs`.
3. Cross-check API yang digunakan dengan versi yang terinstall di proyek.

---

## 11. PERFORMANCE BUDGETS

| Metric           | Budget       | Diukur dengan                                |
| ---------------- | ------------ | -------------------------------------------- |
| Installer size   | `< 80 MB`    | File size `.msi` / `.exe`                    |
| Idle RAM         | `< 250 MB`   | Task Manager setelah 1 gambar + 30s idle     |
| Startup          | `< 2s`       | Process launch → first interactive canvas    |

Jika perubahan berpotensi melanggar budget, WAJIB tulis warning eksplisit.

Protokol pengukuran detail: **`docs/16-performance-measurement-protocol.md`**

---

## 12. DEFINISI SCOPE MVP (GUARDRAIL)

### ✅ In Scope (MVP v1)

- Layer basic (add/delete/reorder/opacity)
- Selection + move + basic transform (scale/rotate/flip)
- Crop + resize image/canvas
- Brush + eraser
- Export JPG/PNG/WebP

---
## Move Tool Runtime Assumptions

Aturan khusus untuk komponen Move Tool:

- **Dua drag path**: Move Tool memiliki dua path interaksi terpisah. Canvas path (`input-handler.ts`) melayani auto-select dan fallback move. Overlay path (`SelectionTransformOverlay.tsx`) melayani selected-layer move/resize/rotate handles. Setiap fix atau perubahan harus diverifikasi di kedua path.
- **Layer stack**: `engine.getLayers()` mengembalikan urutan top-first (`layers[0]` = visual paling atas). `hitTestLayers()` mengembalikan layer visible pertama yang match.
- **Transform geometry**: Move math menggunakan visual rect top-left (`transform.x/y`), positive `scaleX/scaleY` magnitude. Orientation (`flipH/flipV`) hanya memengaruhi texture di shader, bukan geometry.
- **Rotation convention**: Positive degrees = clockwise (Photoshop-like). Wajib konsisten di transform geometry, renderer shader, cursor resolver, dan SVG overlay.
- **Snapping**: Menggunakan transformed AABB (axis-aligned bounding box), bukan true rotated-edge snapping. Canvas edges/centers punya priority lebih tinggi (3 dan 2) daripada layer-to-layer (1).
- **Transient states** terpisah dan harus dibersihkan eksplisit: `snapLines` signal, HUD (`hudInfo`), `dragState`, `hoverHandle`. Membersihkan satu tidak membersihkan yang lain.
- **Alt behavior** context-dependent: canvas move path disable snapping, overlay resize scale from center, brush/eraser switch to eyedropper.
- **Overlay Alt snap**: Overlay move path sudah konsisten dengan canvas path — Alt disable snapping (`!e.altKey` guard).
- **Keyboard nudge** (`Arrow/Shift+Arrow`): bypass snapping dan HUD, commit history hanya sekali per non-repeat burst.
- **Viewport rotation** (`ViewportState.rotation`) eksis di type tapi belum didukung Move Tool math. Jika diaktifkan, screen-to-document, cursor, dan transform geometry perlu revisi.

---

### ❌ Out of Scope (MVP v1) — JANGAN IMPLEMENTASI

- PSD workflow
- Print checker
- Plugin runtime
- AI features
- Cloud collaboration
- Command palette (UI ada, belum fungsional)
- Native project format

Referensi lengkap: **`docs/00-product-scope.md`** dan **`docs/01-prd.md`**
