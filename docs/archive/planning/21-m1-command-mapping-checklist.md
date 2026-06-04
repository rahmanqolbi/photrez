# 21 - M1 Command Mapping Checklist (CI Placeholder -> Real Command)

Dokumen ini membantu mengganti placeholder pada:

- `docs/20-github-actions-m1-template.md`

Tujuan:

- memastikan workflow CI M1 benar-benar executable,
- menghindari `echo-only CI`,
- menjaga konsistensi antar kontributor/AI agent.

## 1) Cara Pakai

1. Buka file CI yang akan dipakai (`.github/workflows/ci-m1.yml`).
2. Cari semua baris placeholder command.
3. Isi command nyata dari repo.
4. Tandai checklist di bawah saat selesai.
5. Jalankan CI lewat PR untuk validasi.

## 2) Mapping Table

| CI Job | Placeholder Saat Ini | Real Command (Isi Nanti) | Status |
| --- | --- | --- | --- |
| `build_and_static_checks` | `echo "cargo check --workspace"` | `<isi command rust check>` | `TODO` |
| `build_and_static_checks` | `echo "pnpm type-check"` | `<isi command type-check frontend>` | `TODO` |
| `build_and_static_checks` | `echo "pnpm lint"` | `<isi command lint>` | `TODO` |
| `test_contract` | `echo "cargo test --package <contract-test-crate>"` | `<isi command contract test>` | `TODO` |
| `test_render_smoke` | `echo "cargo test --package <render-crate> <smoke-test-filter>"` | `<isi command renderer smoke>` | `TODO` |

## 3) Readiness Checklist (M1 CI)

- [ ] Rust check command sudah valid di runner CI.
- [ ] Frontend type-check command sudah valid.
- [ ] Lint command sudah valid.
- [ ] Contract test command sudah valid.
- [ ] Renderer smoke command sudah valid.
- [ ] Tidak ada placeholder `echo "..."` tersisa untuk command wajib.

## 4) Suggested Validation Order

1. Jalankan `preflight` + `build_and_static_checks` dulu.
2. Jika lulus, aktifkan `test_contract`.
3. Terakhir, aktifkan `test_render_smoke`.

Ini mempercepat debugging awal dibanding menyalakan semua gate sekaligus.

## 5) Output Format for PR Note

```md
## CI M1 Command Mapping

- Rust check:
- Type-check:
- Lint:
- Contract test:
- Renderer smoke:

All placeholders replaced: YES/NO

Open blockers:
- <if any>
```

## 6) Gate Rule

PR tidak boleh dianggap siap sebagai baseline CI M1 jika checklist di section 3 belum penuh.
