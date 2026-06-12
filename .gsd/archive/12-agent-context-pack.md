# 12 - Agent Context Pack (Single Brief)

Gunakan file ini sebagai briefing cepat sebelum AI agent mulai kerja.
Tujuannya: mengurangi ambiguitas, menjaga scope, dan memastikan output konsisten.

## 1) Project Snapshot

- Project name (working): `Photrez`
- Stage: `Planning and documentation phase`
- Current mode: `Docs-first, implementation by explicit approval only`
- Product type: `Lightweight desktop image editor`

## 2) Source of Truth Priority

Saat ada konflik, ikuti urutan ini:

1. `AGENTS.md`
2. `docs/00-product-scope.md`
3. `docs/03-trd.md`
4. `docs/02-architecture.md`
5. `docs/01-prd.md`
6. `docs/01-id-decision-log.md`

## 3) Locked MVP Constraints

In scope (MVP v1):

- Layer basic (add/delete/reorder/opacity)
- Selection + move + basic transform (scale/rotate/flip)
- Crop + resize image/canvas
- Brush + eraser
- Export JPG/PNG/WebP

Out of scope (MVP v1):

- PSD workflow
- Print checker
- Plugin runtime
- AI features
- Cloud collaboration

## 4) Non-Negotiable Architecture Rules

- `Tauri/Shell` hanya untuk lifecycle, file dialog, IPC bridge.
- `Rust Core` adalah source of truth dokumen dan editing logic.
- `wgpu Renderer` hanya untuk drawing/compositing.
- Jangan taruh image business logic di frontend/shell.

## 5) Performance Budgets (Guardrail)

- Installer `< 80 MB`
- Idle RAM `< 250 MB`
- Startup `< 2s`

Jika perubahan berpotensi melanggar budget, wajib tulis warning eksplisit.

## 6) Task-Type Contract

- `Docs-only`: ubah dokumen saja, tanpa runtime code.
- `Planning-only`: update keputusan/rencana, tanpa scaffolding app.
- `Implementation-approved`: boleh code dengan verifikasi wajib.
- `Review/audit`: findings dulu, urut severity, sertakan referensi file.

Template detail ada di `docs/11-implementation-handoff.md`.

## 7) Required Output Format (Minimal)

Setiap response kerja wajib berisi:

1. Scope yang dikerjakan
2. File yang diubah
3. Verifikasi yang dijalankan (atau alasan tidak bisa)
4. Risiko/blocker tersisa

## 8) Copy-Paste Starter Prompt (ID)

```md
Ikuti AGENTS.md dan seluruh batasan di docs.
Jenis tugas: <Docs-only | Planning-only | Implementation-approved | Review/audit>.
Kerjakan hanya scope yang diminta, jangan tambah fitur out-of-scope.
Sebelum selesai, laporkan:
1) ringkasan perubahan,
2) daftar file berubah,
3) bukti verifikasi,
4) risiko/blocker.
```

## 9) Stop Conditions (Minta Konfirmasi User)

Berhenti dan minta konfirmasi jika:

- Request bertentangan dengan `00-product-scope.md`
- Ada breaking change kontrak command (`docs/03-trd.md` / ADR-0002)
- Butuh keputusan arsitektur baru yang belum ada ADR
- Diminta implementasi saat mode masih docs-only
