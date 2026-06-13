# 29 - UI Review Checklist (Pre-Implementation Gate)

Checklist ini dipakai untuk memvalidasi desain UI sebelum agent mulai implementasi kode UI.

## 1) Scope

Berlaku untuk seluruh perubahan UI pada MVP, terutama area:

1. Shell layout
2. Panel and controls
3. Interaction and states
4. UX flows
5. UI copy

## 2) Required References

Review wajib mengacu dokumen berikut:

1. `docs/archive/planning/22-ui-style-guide.md`
2. `docs/reference/design-tokens.md`
3. `docs/archive/planning/24-ui-component-rules.md`
4. `docs/archive/planning/26-wireframe-layout-spec.md`
5. `docs/archive/planning/27-key-user-flows.md`
6. `docs/archive/planning/28-ui-copy-guidelines.md`

## 3) Visual Consistency Checks

- [ ] Layout mengikuti shell region yang sudah dikunci (top/tool/canvas/inspector/status).
- [ ] Density konsisten dengan target desktop compact.
- [ ] Tidak ada penggunaan warna/spacing/radius hardcoded global.
- [ ] Icon size/style konsisten dengan baseline.
- [ ] State aktif/focus terlihat jelas.

## 4) Component Rule Checks

- [ ] Komponen utama pakai token dari dokumen token.
- [ ] Semua komponen interaktif punya state: default/hover/active/focus-visible/disabled.
- [ ] Naming komponen konsisten (tidak ambigu).
- [ ] Tidak ada varian liar tanpa dokumentasi.

## 5) UX Flow Checks

- [ ] Flow `Open -> Edit -> Export` bisa dijalankan tanpa langkah membingungkan.
- [ ] Action kritis terlihat jelas (tidak tersembunyi default).
- [ ] Error case pada flow utama sudah punya feedback yang bisa ditindaklanjuti.
- [ ] Shortcut membantu, tapi alur mouse-first tetap jelas.

## 6) UI Copy Checks

- [ ] Label action menggunakan kata kerja jelas (`Open`, `Export`, `Resize`, dll).
- [ ] Error message mengikuti format: masalah + tindakan + optional code.
- [ ] Terminologi konsisten antar panel/screen.
- [ ] Tidak ada campur bahasa pada komponen UI utama.

## 7) Accessibility and Input Checks

- [ ] Focus ring terlihat di keyboard navigation.
- [ ] Kontras teks utama cukup untuk dibaca.
- [ ] Empty/loading/error states tidak menyembunyikan next action.

## 8) Performance-Aware UI Checks

- [ ] Tidak ada animasi berat yang tidak perlu.
- [ ] Transisi UI ringan dan tidak mengganggu viewport canvas.
- [ ] Struktur panel tidak memicu rerender berlebihan secara desain.

## 9) Review Decision

Pilih salah satu:

- `APPROVED`: siap implementasi UI.
- `APPROVED WITH NOTES`: boleh implementasi, tapi ada catatan wajib follow-up.
- `REVISE`: harus revisi desain dulu, belum boleh implementasi.

## 10) Review Record Template

```md
## UI Review Result

Decision:
- APPROVED / APPROVED WITH NOTES / REVISE

Scope reviewed:
- <screen/flow/components>

Passed checks:
- <list>

Notes / Revisions required:
- <list>

Reviewer:
- <name/role>

Date:
- <YYYY-MM-DD>
```
