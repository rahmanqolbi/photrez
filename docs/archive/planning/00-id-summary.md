# Ringkasan Dokumen (Bahasa Indonesia)

Dokumen ini merangkum isi file utama agar cepat dipahami tanpa harus membaca versi Inggris penuh.

## 00 - Vision and Strategy
File: `docs/00-vision-and-strategy.md`

- Nama kerja produk: `Photrez`.
- Arah produk: editor gambar desktop yang ringan, cepat, dan praktis untuk kebutuhan desain harian.
- Posisi produk: workflow familiar, identitas visual tetap berbeda dari Photoshop.
- Arah teknologi: `Tauri 2 + SolidJS + TypeScript + Rust + wgpu`.
- Aturan komunikasi: pesan utama produk adalah performa dan workflow; status open source tetap didokumentasikan, tapi bukan headline utama.
- Scope dibagi 3 lapisan:
  - Layer A: MVP v1 sekarang.
  - Layer B: ekspansi dekat (misalnya PSD basic, command palette, print checker).
  - Layer C: platform jangka panjang (plugin, template ecosystem, cloud optional).

## 00 - Product Scope (MVP v1 Lock)
File: `docs/00-product-scope.md`

- Ini dokumen batasan tegas untuk v1.
- Fitur v1 yang dikunci:
  - Layer basic (add/delete/reorder/opacity).
  - Selection + move + transform dasar.
  - Crop + resize.
  - Brush + eraser.
  - Export JPG/PNG/WebP.
- Non-goal v1 (belum masuk):
  - Retouch advanced.
  - AI/cloud.
  - PSD workflow.
  - Print checker.
  - Plugin API.
  - Native project format rollout.
- Target performa:
  - Installer `< 80 MB`
  - Idle RAM `< 250 MB`
  - Startup `< 2 detik` (baseline device 4GB RAM + SSD)

## 01 - PRD
File: `docs/01-prd.md`

- Menjelaskan masalah, target user, tujuan produk, dan kebutuhan MVP.
- Sudah punya acceptance criteria per fitur, sehingga nanti pengujian lebih objektif.
- Menetapkan metrik sukses:
  - Installer size, idle RAM, startup time, dan export success rate.
- Ada release gate checklist untuk memastikan rilis tidak melenceng dari scope.
- Semua open questions sudah diputus dan dikunci:
  - Scope transform: `scale + rotate + flip` (locked).
  - Batas undo/redo: `50 langkah` (locked).
  - Default color profile: `sRGB` (locked).

## 02 - Architecture
File: `docs/02-architecture.md`

- Arsitektur 3 lapis:
  - Shell (`Tauri`): lifecycle app, dialog file, integrasi OS, command bridge.
  - Core (`Rust`): sumber kebenaran dokumen + operasi editing.
  - Renderer (`wgpu`): render viewport/layer/compositing.
- Data flow utama:
  - UI action -> shell command -> core update -> renderer redraw -> UI refresh state.
- Strategi scalability:
  - Modul berbasis kapabilitas.
  - Region/tile redraw (bukan full redraw terus-menerus).
  - Fitur ekspansi besar diisolasi per modul/crate.
- Strategi maintainability:
  - Command-first.
  - Single source of truth di Rust core.
  - ADR untuk keputusan lintas modul.
- Strategi security MVP:
  - Anggap semua file import sebagai untrusted input.
  - Validasi path/extension.
  - Resource guardrail.
  - Fail-closed saat parsing gagal.

## 03 - TRD
File: `docs/03-trd.md`

- Menerjemahkan PRD ke requirement teknis yang implementable.
- Menjelaskan requirement fungsional per area:
  - Layer, selection/transform, crop/resize, brush/eraser, export.
- Menetapkan non-functional requirements:
  - Batas ukuran installer, RAM idle, startup.
- Menetapkan kontrak command:
  - Nama command, payload schema, validation, error output, versioning.
- Menetapkan baseline testing:
  - Unit tests, contract tests, render smoke tests, performance checks.
- Menetapkan baseline security:
  - Input untrusted, guardrail resource, state tetap aman saat parse/decode gagal.

## Alur Kerja Praktis

Urutan kerja yang dipakai saat ini:

1. Kunci arah produk di `00-vision-and-strategy.md`.
2. Kunci batas MVP di `00-product-scope.md`.
3. Definisikan requirement produk di `01-prd.md`.
4. Definisikan bentuk sistem di `02-architecture.md`.
5. Definisikan requirement teknis dan keamanan di `03-trd.md`.

Dengan urutan ini, implementasi tetap fokus dan tidak cepat melebar.
