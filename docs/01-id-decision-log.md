# Decision Log (Bahasa Indonesia)

Dokumen ini dipakai untuk melacak keputusan inti proyek secara ringkas.

## Status Keputusan

| Area | Keputusan | Status |
| --- | --- | --- |
| Nama kerja produk | `Photrez` | Locked (working name) |
| Positioning utama | Lightweight desktop image editor, workflow familiar, identitas berbeda dari Photoshop | Locked |
| Messaging | Product-first (performa + workflow), open-source bukan headline utama | Locked |
| Target user utama | Content creator / UMKM | Locked |
| Platform v1 | Desktop Windows | Locked |
| Arsitektur | Hybrid modular: `Tauri shell + Rust core + wgpu renderer` | Locked |
| Frontend | `SolidJS + TypeScript + Vite` | Locked |
| Scope MVP v1 | Layer basic, selection/move/transform dasar, crop/resize, brush/eraser, export JPG/PNG/WebP | Locked |
| Scope transform v1 | `Scale + rotate + flip` | Locked |
| Batas undo/redo v1 | `50 langkah` | Locked |
| Default color profile v1 | `sRGB` | Locked |
| Aturan lock nama final | Final brand name harus di-lock sebelum publikasi repo publik pertama (`README + logo + domain check`) | Locked |
| Budget performa | Installer `<80 MB`, idle RAM `<250 MB`, startup `<2 detik` | Locked |
| Lisensi arah | `AGPL-3.0-or-later` | Locked (policy level) |
| Standar handoff AI | Wajib pakai `docs/11-implementation-handoff.md` + `docs/12-agent-context-pack.md` untuk instruksi kerja | Locked |
| Gate eksekusi task | Wajib lolos DoR di `docs/14-definition-of-ready.md`; risiko aktif dilacak di `docs/13-risk-register.md` | Locked |
| Baseline kontrak IPC | Spesifikasi kontrak acuan ada di `docs/15-command-contract-spec.md` dengan versi awal `1.0.0` | Locked |
| Protokol ukur performa | Bukti startup/RAM/installer wajib mengikuti `docs/16-performance-measurement-protocol.md` | Locked |
| Matrix test milestone | Gate test per milestone wajib refer ke `docs/17-test-matrix-by-milestone.md` | Locked |
| CI verification gate | Gate verifikasi merge/release wajib mengacu `docs/18-ci-verification-plan.md` | Locked |
| CI template starter | Implementasi CI awal wajib mulai dari `docs/19-ci-job-template.md` agar konsisten | Locked |
| Template CI GitHub M1 | Untuk milestone M1, baseline workflow mengacu `docs/20-github-actions-m1-template.md` | Locked |
| Mapping command CI M1 | Penggantian placeholder command M1 wajib mengikuti `docs/21-m1-command-mapping-checklist.md` | Locked |
| UI style baseline | Implementasi UI wajib mengacu `docs/22-ui-style-guide.md`, `docs/23-design-tokens.md`, dan `docs/24-ui-component-rules.md` | Locked |
| UX flow and UI copy baseline | Flow MVP dan wording UI wajib mengacu `docs/26-wireframe-layout-spec.md`, `docs/27-key-user-flows.md`, `docs/28-ui-copy-guidelines.md` | Locked |
| UI pre-implementation review gate | Implementasi UI baru boleh dimulai setelah lolos checklist di `docs/29-ui-review-checklist.md` | Locked |
| Full UI shell mockup baseline | Referensi visual lengkap desktop shell mengacu `docs/30-ui-full-editor-mockup.html` | Locked |
| Dependency inventory baseline | Dependency audit dan policy wajib mengacu `docs/31-dependency-inventory.md`; dependency baru wajib update file ini dulu | Locked |
| Keyboard shortcut baseline | Shortcut MVP wajib mengacu `docs/32-keyboard-shortcut-map.md`; shortcut baru/ubah wajib update file ini dulu | Locked |
| File format support baseline | Format import/export wajib mengacu `docs/33-file-format-support.md` | Locked |
| Document lifecycle baseline | Alur new/open/save/export/close wajib mengacu `docs/34-save-and-document-lifecycle.md` | Locked |
| Error code registry baseline | Mapping error per skenario wajib mengacu `docs/35-error-code-registry.md` | Locked |
| Terminology baseline | Istilah teknis dan produk wajib konsisten mengacu `docs/36-glossary.md` | Locked |
| i18n strategy | MVP English-only; arsitektur harus mengikuti guardrails di `docs/37-i18n-strategy-note.md` | Locked |
| Ctrl+S behavior | Ctrl+S selalu memicu Export Dialog (bukan quick export langsung) untuk mencegah overwrite tanpa sengaja | Locked |
| UI direction lock (A/A/A/B/A/A) | Persona `Native desktop classic`, density `Compact`, menu `Full menu bar`, panel `Multi-tab`, icon `Outline monoline`, warna `Neutral blue-gray` | Locked |
| Accent color identity | **Photon Amber** (`#E15A17` / `#F97316` / `#C2410C`) — migrasi dari Studio Indigo (`#5C6AEA`). Alasan: identitas visual hangat yang berbeda dari Photoshop/Figma, cocok untuk hardware-tooling feel | Locked |
| Ergonomic layout scaling | Menubar `36px` (dari 32), Toolbar `42px` (dari 38), Status `28px` (dari 26), Tool Rail `56px` (dari 48), Tool buttons `36×36` (dari 32×32), Lucide icons `20×20` (dari 18×18). Alasan: click target terlalu kecil di 1080p, accessibility | Locked |
| Scrollbar style | Ultra-slim `4px` WebKit scrollbar dengan `var(--color-text-muted)` thumb. Alasan: mengurangi noise visual, feel lebih native | Locked |
| Range slider style | Custom WebKit slider dengan Photon Amber thumb `14px`, glow shadow `rgba(225,90,23,0.45)`, hover scale `1.15x` | Locked |
| Usable MVP release gate | Milestone DONE tidak sama dengan release usable. Release candidate hanya valid setelah open-edit-export smoke test lulus dan `docs/38-usable-mvp-recovery-plan.md` hijau. | Locked 2026-05-29 |
| Multi-document workspace MVP recovery | Photrez memakai document tab strip ala Photoshop/Affinity. Setiap opened image menjadi document session/tab terpisah. Backend Rust owns `WorkspaceState` dan per-document editor truth. | Locked 2026-05-29 |

## Keputusan yang Masih Pending

- Tidak ada pending keputusan untuk tahap perencanaan saat ini (semua sudah di-lock).

## Definition of Done untuk Tahap Perencanaan

Tahap perencanaan saat ini dinyatakan selesai secara penuh.

Jika nama final berubah nanti, seluruh dokumen `docs/` harus disinkronkan.
