# 24 - UI Component Rules (MVP)

Dokumen ini berisi aturan implementasi komponen agar hasil UI antar agent konsisten.

## 1) Scope

Komponen prioritas MVP:

1. Button
2. Icon Button (toolbar)
3. Input / Number Input
4. Select / Dropdown
5. Panel Container
6. Layer List Item
7. Status Badge
8. Tooltip
9. Dialog / Modal
10. Divider

## 2) Global Rules

1. Semua komponen wajib pakai token dari `docs/23-design-tokens.md`.
2. Semua komponen interaktif wajib punya state: default/hover/active/focus-visible/disabled.
3. Jangan buat varian baru tanpa dokumentasi varian.

## 3) Button Rules

- Height default: `32px`.
- Padding horizontal default: `12px`.
- Radius: `--radius-md`.
- Primary action pakai `--color-accent`.
- Destructive action pakai `--color-danger`.

## 4) Icon Button Rules

- Ukuran area klik minimum: `28px x 28px`.
- Icon default: `16px`.
- Toolbar dense mode: `24px x 24px` dengan icon `14px` (opsional area padat).

## 5) Input Rules

- Height default: `32px`.
- Background: `--color-bg-elevated`.
- Border default: `--border-thin solid --color-border-subtle`.
- Focus gunakan ring dari `--color-focus-ring`.

## 6) Panel Rules

- Panel header harus konsisten:
1. title kiri,
2. quick action kanan (opsional),
3. divider bawah.
- Panel body pakai padding token `--space-3`.
- Panel tidak boleh menyisipkan logic bisnis; hanya presentasi data.

## 7) Layer List Item Rules

- Height item default: `30px`.
- State aktif wajib jelas kontras.
- Aksi visibility/lock harus tetap terlihat di density default.
- Reorder affordance harus konsisten di semua item.

## 8) Tooltip Rules

- Tooltip hanya untuk bantuan singkat.
- Jangan simpan informasi kritis hanya di tooltip.
- Delay tampil harus singkat dan konsisten.

## 9) Dialog Rules

- Dialog wajib punya:
1. judul,
2. isi ringkas,
3. action utama,
4. action batal.
- Escape key menutup dialog non-destruktif.
- Destructive dialog wajib teks konfirmasi jelas.

## 10) Empty / Loading / Error States

- Empty state harus memberi next action.
- Loading state gunakan indikator ringan (hindari animasi berat).
- Error state harus menampilkan:
1. ringkasan masalah,
2. action retry atau close.

## 11) Component Naming Convention

- Gunakan prefix domain bila perlu, contoh:
`StudioButton`, `StudioPanel`, `LayerItemRow`.
- Hindari nama generik yang ambigu seperti `Card2` atau `WidgetNew`.

## 12) Review Checklist (Before Merge)

- [ ] Komponen pakai design token.
- [ ] Semua state interaktif lengkap.
- [ ] Akses keyboard dasar berfungsi.
- [ ] Tidak ada hardcoded color/spacing global.
- [ ] Nama komponen konsisten.
